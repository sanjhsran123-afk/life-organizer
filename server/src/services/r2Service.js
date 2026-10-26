import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 Private Storage Service
 *
 * Provides authenticated, private object storage for file attachments and PDFs.
 * Content is never stored in public folders or exposed with permanent public URLs.
 * Requires the following environment variables:
 * - R2_ACCOUNT_ID
 * - R2_ACCESS_KEY_ID
 * - R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME
 */

let s3ClientInstance = null;

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client() {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 storage is not configured. Missing R2 environment credentials.');
  }

  if (!s3ClientInstance) {
    const accountId = process.env.R2_ACCOUNT_ID.trim();
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
      },
    });
  }

  return s3ClientInstance;
}

/**
 * Uploads a file buffer directly to the private Cloudflare R2 bucket.
 *
 * @param {Buffer} buffer - File data buffer
 * @param {string} key - Unique R2 storage key
 * @param {string} mimeType - File MIME type
 * @param {Record<string, string>} metadata - Safe metadata
 * @returns {Promise<{ key: string }>}
 */
export async function uploadFileToR2(buffer, key, mimeType, metadata = {}) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME.trim();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: metadata,
  });

  await client.send(command);
  return { key };
}

/**
 * Generates an authenticated, short-lived presigned download URL for a private file.
 * The URL expires automatically after the specified seconds (default: 5 minutes).
 *
 * @param {string} key - R2 storage key
 * @param {string} originalName - Filename for attachment disposition
 * @param {number} expiresIn - Expiration in seconds (default: 300s = 5m)
 * @returns {Promise<string>} Short-lived presigned URL
 */
export async function generateDownloadUrl(key, originalName, expiresIn = 300) {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME.trim();

  // Clean filename to prevent header injection
  const safeFilename = originalName.replace(/["\r\n\\]/g, '_');

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
  });

  return await getSignedUrl(client, command, { expiresIn });
}
