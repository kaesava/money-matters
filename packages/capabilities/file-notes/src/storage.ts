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
  }
});

export async function getPresignedDownloadUrl(
  fileKey: string,
  expiresIn = 3600
): Promise<string> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || '';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    return `http://localhost:3001/api/mock-download?key=${encodeURIComponent(fileKey)}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function getPresignedUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const bucketName = process.env.STORAGE_BUCKET_NAME || '';
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    logger.warn('[Storage] Missing credentials. Returning mock upload URL.');
    return `http://localhost:3001/api/mock-upload?key=${encodeURIComponent(fileKey)}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: contentType,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

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
    logger.error(`[Storage] Failed to delete file with key: ${fileKey}`, error as any);
    return false;
  }
}
