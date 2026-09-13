import { StorageProvider } from './provider.interface';
import { MockStorageProvider } from './mock-provider';
import { S3CompatibleStorageProvider, S3CompatibleConfig } from './s3-compatible-provider';

export interface StorageFactoryConfig {
  provider?: 'local' | 's3' | 'r2' | 'minio' | 'supabase' | string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  publicCdnUrl?: string;
  forcePathStyle?: boolean;
}

export function getStorageProvider(config?: StorageFactoryConfig): StorageProvider {
  const providerType = (config?.provider || 'local').toLowerCase();

  switch (providerType) {
    case 's3':
    case 'r2':
    case 'minio':
    case 'supabase': {
      if (!config?.accessKeyId || !config?.secretAccessKey) {
        throw new Error(`Storage provider [${providerType}] requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY`);
      }
      return new S3CompatibleStorageProvider(
        {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          bucket: config.bucket || 'cdsprep-assets',
          region: config.region || 'ap-south-1',
          endpoint: config.endpoint,
          publicCdnUrl: config.publicCdnUrl,
          forcePathStyle: config.forcePathStyle,
        },
        providerType,
      );
    }

    case 'local':
    case 'mock':
    default:
      return new MockStorageProvider();
  }
}
