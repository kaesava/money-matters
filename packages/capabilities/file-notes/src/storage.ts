import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@money-matters/core';

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
      },
      region: process.env.STORAGE_REGION || 'auto',
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

export const s3Client = new Proxy({} as S3Client, {
  get: (_target, prop) => {
    return Reflect.get(getS3Client(), prop);
  },
});

/**
 * Generates a pre-signed download URL for secure object access from Cloudflare R2.
 */
export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresIn = 3600
): Promise<string> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || '';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    logger.warn('[Storage Mock] Returning mock download URL for key: ' + fileKey);
    return `http://localhost:3001/api/mock-download?key=${encodeURIComponent(fileKey)}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  return getSignedUrl(
    getS3Client() as unknown as Parameters<typeof getSignedUrl>[0],
    command as unknown as Parameters<typeof getSignedUrl>[1],
    { expiresIn }
  );
}

/**
 * Generates a pre-signed upload URL for direct-to-bucket client uploads to Cloudflare R2.
 */
export async function getPresignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || '';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    logger.warn('[Storage Mock] Returning mock upload URL for key: ' + fileKey);
    return `http://localhost:3001/api/mock-upload?key=${encodeURIComponent(fileKey)}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: contentType,
  });

  return getSignedUrl(
    getS3Client() as unknown as Parameters<typeof getSignedUrl>[0],
    command as unknown as Parameters<typeof getSignedUrl>[1],
    { expiresIn }
  );
}

/**
 * Permanently deletes a file from the Cloudflare R2 bucket.
 */
export async function deleteFileFromBucket(fileKey: string): Promise<boolean> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || '';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    logger.info(`[Storage Mock] Deleted mock file with key: ${fileKey}`);
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    await getS3Client().send(command);
    return true;
  } catch (error) {
    logger.error(`[Storage] Failed to delete file with key: ${fileKey}`, { error });
    return false;
  }
}
