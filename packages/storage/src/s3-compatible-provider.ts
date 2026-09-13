import { createHmac, createHash } from 'crypto';
import {
  StorageProvider,
  UploadOptions,
  PresignedUrlOptions,
  UploadResult,
} from './provider.interface';

export interface S3CompatibleConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  publicCdnUrl?: string;
  forcePathStyle?: boolean;
}

export class S3CompatibleStorageProvider implements StorageProvider {
  readonly providerName: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly publicCdnUrl?: string;
  private readonly forcePathStyle: boolean;

  constructor(config: S3CompatibleConfig, providerName = 's3') {
    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error(`Storage provider [${providerName}] requires accessKeyId and secretAccessKey`);
    }
    if (!config.bucket) {
      throw new Error(`Storage provider [${providerName}] requires a bucket name`);
    }

    this.providerName = providerName;
    this.accessKeyId = config.accessKeyId.trim();
    this.secretAccessKey = config.secretAccessKey.trim();
    this.bucket = config.bucket.trim();
    this.region = config.region || 'ap-south-1';
    this.publicCdnUrl = config.publicCdnUrl?.replace(/\/+$/, '');
    this.forcePathStyle = config.forcePathStyle ?? Boolean(config.endpoint);

    if (config.endpoint) {
      this.endpoint = config.endpoint.replace(/\/+$/, '');
    } else {
      this.endpoint = `https://s3.${this.region}.amazonaws.com`;
    }
  }

  private sha256(str: string | Buffer): string {
    return createHash('sha256').update(str).digest('hex');
  }

  private hmac(key: Buffer | string, data: string): Buffer {
    return createHmac('sha256', key).update(data).digest();
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = this.hmac(kDate, this.region);
    const kService = this.hmac(kRegion, 's3');
    return this.hmac(kService, 'aws4_request');
  }

  private getHostAndPath(key: string): { host: string; path: string; baseUrl: string } {
    const cleanKey = key.replace(/^\/+/, '');
    const url = new URL(this.endpoint);

    if (this.forcePathStyle) {
      const path = `/${this.bucket}/${cleanKey}`;
      return { host: url.host, path, baseUrl: `${this.endpoint}${path}` };
    } else {
      const host = `${this.bucket}.${url.host}`;
      const path = `/${cleanKey}`;
      return { host, path, baseUrl: `${url.protocol}//${host}${path}` };
    }
  }

  async getPresignedUrl(key: string, options: PresignedUrlOptions): Promise<string> {
    const { host, path, baseUrl } = this.getHostAndPath(key);
    const expiresIn = options.expiresInSeconds || 900;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQueryString = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k]!)}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const httpMethod = options.operation === 'put' ? 'PUT' : 'GET';
    const canonicalRequest = [
      httpMethod,
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${baseUrl}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const presignedPutUrl = await this.getPresignedUrl(key, {
      operation: 'put',
      contentType: options?.contentType,
      expiresInSeconds: 300,
    });

    const headers: Record<string, string> = {
      'Content-Type': options?.contentType || 'application/octet-stream',
    };

    const res = await fetch(presignedPutUrl, {
      method: 'PUT',
      headers,
      body: buffer,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`S3 upload failed with status ${res.status}: ${errText.slice(0, 200)}`);
    }

    return {
      key,
      url: this.getPublicUrl(key),
      sizeBytes: buffer.length,
    };
  }

  async delete(key: string): Promise<boolean> {
    const presignedDeleteUrl = await this.getPresignedUrl(key, {
      operation: 'put', // Using signed request
      expiresInSeconds: 60,
    });

    try {
      const res = await fetch(presignedDeleteUrl, { method: 'DELETE' });
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const presignedGetUrl = await this.getPresignedUrl(key, {
      operation: 'get',
      expiresInSeconds: 60,
    });

    try {
      const res = await fetch(presignedGetUrl, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.publicCdnUrl) {
      return `${this.publicCdnUrl}/${cleanKey}`;
    }
    const { baseUrl } = this.getHostAndPath(key);
    return baseUrl;
  }
}
