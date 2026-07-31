import { S3Client } from '@aws-sdk/client-s3';
export declare const s3Client: S3Client;
export declare function getPresignedDownloadUrl(fileKey: string, expiresIn?: number): Promise<string>;
export declare function getPresignedUploadUrl(fileKey: string, contentType: string, expiresIn?: number): Promise<string>;
export declare function deleteFileFromBucket(fileKey: string): Promise<boolean>;
//# sourceMappingURL=storage.d.ts.map