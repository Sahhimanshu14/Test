import { describe, it, expect } from 'vitest';
import {
  MockStorageProvider,
  S3CompatibleStorageProvider,
  getStorageProvider,
} from '../src';

describe('Cloud Object Storage System (@cdsprep/storage)', () => {
  describe('MockStorageProvider', () => {
    it('uploads files to memory and supports retrieval and deletion', async () => {
      const provider = new MockStorageProvider();
      const content = Buffer.from('CDS Mock Test Paper PDF content');

      const res = await provider.upload('tests/math-2024.pdf', content, {
        contentType: 'application/pdf',
        isPublic: true,
      });

      expect(res.key).toBe('tests/math-2024.pdf');
      expect(res.sizeBytes).toBe(content.length);

      const exists = await provider.exists('tests/math-2024.pdf');
      expect(exists).toBe(true);

      const stored = provider.getFile('tests/math-2024.pdf');
      expect(stored?.contentType).toBe('application/pdf');
      expect(stored?.data.toString()).toBe('CDS Mock Test Paper PDF content');

      const signedUrl = await provider.getPresignedUrl('tests/math-2024.pdf', {
        operation: 'get',
        expiresInSeconds: 300,
      });
      expect(signedUrl).toContain('/signed/get/tests/math-2024.pdf');

      await provider.delete('tests/math-2024.pdf');
      const existsAfter = await provider.exists('tests/math-2024.pdf');
      expect(existsAfter).toBe(false);
    });
  });

  describe('S3CompatibleStorageProvider', () => {
    it('throws when initialized without credentials', () => {
      expect(
        () =>
          new S3CompatibleStorageProvider({
            accessKeyId: '',
            secretAccessKey: '',
            bucket: 'test-bucket',
          }),
      ).toThrowError(/requires accessKeyId/);
    });

    it('generates compliant AWS SigV4 presigned upload (PUT) URL', async () => {
      const provider = new S3CompatibleStorageProvider({
        accessKeyId: 'AKIA_TEST_KEY_123',
        secretAccessKey: 'test_secret_key_4567890abcdef',
        bucket: 'cdsprep-production-assets',
        region: 'ap-south-1',
      });

      const presignedPut = await provider.getPresignedUrl('diagrams/radar-chart.png', {
        operation: 'put',
        expiresInSeconds: 600,
      });

      expect(presignedPut).toContain('https://cdsprep-production-assets.s3.ap-south-1.amazonaws.com/diagrams/radar-chart.png');
      expect(presignedPut).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(presignedPut).toContain('X-Amz-Credential=AKIA_TEST_KEY_123');
      expect(presignedPut).toContain('X-Amz-Signature=');
      expect(presignedPut).toContain('X-Amz-Expires=600');
    });

    it('supports custom endpoints like Cloudflare R2 or MinIO with path-style addressing', async () => {
      const provider = new S3CompatibleStorageProvider(
        {
          accessKeyId: 'minio-admin',
          secretAccessKey: 'minio-secret-password',
          bucket: 'local-bucket',
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
        },
        'minio',
      );

      const presignedGet = await provider.getPresignedUrl('avatar.jpg', {
        operation: 'get',
      });

      expect(presignedGet).toContain('http://localhost:9000/local-bucket/avatar.jpg');
      expect(presignedGet).toContain('X-Amz-Signature=');
    });

    it('uses custom CDN domain when configured', () => {
      const provider = new S3CompatibleStorageProvider({
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        bucket: 'bucket',
        publicCdnUrl: 'https://cdn.cdsprep.com',
      });

      expect(provider.getPublicUrl('photos/cadet.png')).toBe(
        'https://cdn.cdsprep.com/photos/cadet.png',
      );
    });
  });

  describe('getStorageProvider Factory', () => {
    it('returns MockStorageProvider when provider is local or mock', () => {
      const p1 = getStorageProvider();
      expect(p1.providerName).toBe('mock');

      const p2 = getStorageProvider({ provider: 'local' });
      expect(p2.providerName).toBe('mock');
    });

    it('returns S3CompatibleStorageProvider when valid S3 credentials provided', () => {
      const p = getStorageProvider({
        provider: 's3',
        accessKeyId: 'AKIA_SAMPLE',
        secretAccessKey: 'SECRET_SAMPLE',
        bucket: 'cdsprep-bucket',
      });
      expect(p.providerName).toBe('s3');
    });

    it('fails fast when cloud provider requested without keys', () => {
      expect(() => getStorageProvider({ provider: 's3' })).toThrowError(
        /requires S3_ACCESS_KEY_ID/,
      );
      expect(() => getStorageProvider({ provider: 'r2' })).toThrowError(
        /requires S3_ACCESS_KEY_ID/,
      );
    });
  });
});
