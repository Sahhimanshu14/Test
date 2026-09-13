import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  registerUploadSchema,
  ALLOWED_UPLOAD_MIME_TYPES,
  DANGEROUS_EXTENSIONS,
  MIME_TO_EXTENSIONS,
  MAX_UPLOAD_SIZE_BYTES,
} from '@cdsprep/validation';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RoleType } from '@cdsprep/types';
import { StorageProvider, getStorageProvider } from '@cdsprep/storage';

/**
 * Validates binary file signatures (magic bytes) against declared MIME types
 */
export function validateFileBufferSignature(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (declaredMimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (declaredMimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (declaredMimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }
  // PDF: %PDF (25 50 44 46)
  if (declaredMimeType === 'application/pdf') {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }
  return false;
}

@Injectable()
export class FilesService {
  private readonly storageProvider: StorageProvider;

  constructor(private readonly prisma: PrismaService) {
    const isCloud = process.env.ENABLE_STORAGE === 'true' || process.env.ENABLE_S3 === 'true';
    const providerName = isCloud ? process.env.STORAGE_PROVIDER || 's3' : 'local';
    this.storageProvider = getStorageProvider({
      provider: providerName,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_KEY,
      bucket: process.env.S3_BUCKET || process.env.STORAGE_BUCKET || 'cdsprep-assets',
      region: process.env.S3_REGION || process.env.STORAGE_REGION || 'ap-south-1',
      endpoint: process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT,
      publicCdnUrl: process.env.S3_PUBLIC_CDN_URL,
    });
  }

  getStorageProvider(): StorageProvider {
    return this.storageProvider;
  }

  async registerUpload(
    userId: string,
    originalName: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    // 1. Validate payload against Zod schema (checks extension, MIME alignment, and size bounds)
    const validationResult = registerUploadSchema.safeParse({
      originalName,
      mimeType,
      sizeBytes,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0]?.message || 'Invalid upload parameters';
      throw new BadRequestException(firstIssue);
    }

    const validData = validationResult.data;

    // 2. Strict filename sanitization and path traversal prevention
    // Strip all directory path tokens (both unix and windows), null bytes, and parent references
    const strippedName = validData.originalName
      .replace(/[\0\x00-\x1f\x7f]/g, '')
      .replace(/\\/g, '/')
      .split('/')
      .pop() || 'unnamed';

    const extMatch = strippedName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1]!.toLowerCase()}` : '.bin';

    // Base slug sanitized to safe characters (no dots, no slashes, max 50 chars)
    const rawBase = strippedName.replace(/\.[^/.]+$/, '');
    const safeSlug = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'asset';

    // Generate non-enumerable, collision-free storage key safe from directory traversal
    const storageKey = `assets/${randomUUID()}_${safeSlug}${ext}`;

    const asset = await this.prisma.client.fileAsset.create({
      data: {
        originalName: strippedName,
        storageKey,
        mimeType: validData.mimeType,
        sizeBytes: BigInt(validData.sizeBytes),
        uploadedBy: userId,
      },
    });

    let uploadUrl = `/api/v1/files/upload/${asset.id}`;
    if (this.storageProvider.providerName !== 'mock' && this.storageProvider.providerName !== 'local') {
      try {
        uploadUrl = await this.storageProvider.getPresignedUrl(storageKey, {
          operation: 'put',
          contentType: validData.mimeType,
          expiresInSeconds: 900,
        });
      } catch {
        // Graceful fallback to API upload route
      }
    }

    return {
      id: asset.id,
      storageKey: asset.storageKey,
      uploadUrl,
    };
  }

  async getAssetMetadata(user: AuthenticatedUser, id: string) {
    const asset = await this.prisma.client.fileAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`File asset with ID ${id} not found`);
    }

    // IDOR / Object ownership enforcement:
    // Only the uploading user or privileged staff can inspect file metadata
    const isOwner = asset.uploadedBy === user.id;
    const isStaff =
      user.roles?.includes(RoleType.SUPER_ADMIN) ||
      user.roles?.includes(RoleType.ADMIN) ||
      user.roles?.includes(RoleType.CONTENT_MANAGER);

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('IDOR violation: unauthorized access to another user asset');
    }

    let downloadUrl = `/api/v1/files/download/${asset.id}`;
    if (this.storageProvider.providerName !== 'mock' && this.storageProvider.providerName !== 'local') {
      try {
        downloadUrl = await this.storageProvider.getPresignedUrl(asset.storageKey, {
          operation: 'get',
          expiresInSeconds: 3600,
        });
      } catch {
        // Fallback to local download URL
      }
    }

    return {
      ...asset,
      sizeBytes: Number(asset.sizeBytes),
      downloadUrl,
    };
  }
}
