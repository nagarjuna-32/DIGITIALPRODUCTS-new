import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'digital-vault-assets';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''; // optional, for public CDN assets

// Setup S3 Client pointing to Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload buffer content to Cloudflare R2
 */
export const uploadToR2 = async (
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await s3Client.send(command);
    
    // Return key, or public URL if bucket is public
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${key}`;
    }
    return key;
  } catch (error) {
    console.error('Error uploading to Cloudflare R2:', error);
    throw new Error('Failed to upload file to storage');
  }
};

/**
 * Delete a file from Cloudflare R2
 */
export const deleteFromR2 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from Cloudflare R2:', error);
    throw new Error('Failed to delete file from storage');
  }
};

/**
 * Generate a secure, temporary presigned GET URL for downloads (expires in 15 minutes)
 */
export const getPresignedDownloadUrl = async (
  key: string,
  originalFilename: string
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${originalFilename}"`,
    });

    // Sign the URL with an expiry of 900 seconds (15 minutes)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL from Cloudflare R2:', error);
    throw new Error('Failed to generate secure download link');
  }
};
