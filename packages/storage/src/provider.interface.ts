export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface PresignedUrlOptions {
  operation: 'get' | 'put';
  expiresInSeconds?: number;
  contentType?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  sizeBytes: number;
}

export interface StorageProvider {
  readonly providerName: string;
  upload(key: string, data: Buffer | Uint8Array, options?: UploadOptions): Promise<UploadResult>;
  getPresignedUrl(key: string, options: PresignedUrlOptions): Promise<string>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
}
