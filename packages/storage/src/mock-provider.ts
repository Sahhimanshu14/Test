import {
  StorageProvider,
  UploadOptions,
  PresignedUrlOptions,
  UploadResult,
} from './provider.interface';

export interface StoredMockFile {
  data: Buffer;
  contentType: string;
  isPublic: boolean;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export class MockStorageProvider implements StorageProvider {
  readonly providerName = 'mock';
  public files = new Map<string, StoredMockFile>();
  private readonly baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = (options?.baseUrl || 'https://storage.cdsprep.local').replace(/\/+$/, '');
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.files.set(key, {
      data: buffer,
      contentType: options?.contentType || 'application/octet-stream',
      isPublic: Boolean(options?.isPublic),
      metadata: options?.metadata,
      createdAt: new Date(),
    });

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      sizeBytes: buffer.length,
    };
  }

  async getPresignedUrl(key: string, options: PresignedUrlOptions): Promise<string> {
    const expiry = options.expiresInSeconds || 900;
    const expiresAt = Date.now() + expiry * 1000;
    return `${this.baseUrl}/signed/${options.operation}/${key}?expires=${expiresAt}&sig=mock-sig`;
  }

  async delete(key: string): Promise<boolean> {
    return this.files.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/public/${key}`;
  }

  getFile(key: string): StoredMockFile | undefined {
    return this.files.get(key);
  }

  clear(): void {
    this.files.clear();
  }
}
