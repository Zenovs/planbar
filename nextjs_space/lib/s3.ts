import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from './aws-config';

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

// Generate presigned URL for file upload (for files ≤100MB)
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string; publicUrl?: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Generate cloud_storage_path based on visibility
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

  // Generate public URL for public files
  const region = process.env.AWS_REGION || 'us-west-2';
  const publicUrl = isPublic 
    ? `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`
    : undefined;

  return { uploadUrl, cloud_storage_path, publicUrl };
}

// Get file URL (public or signed)
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
): Promise<string> {
  if (isPublic) {
    // Return public URL
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  } else {
    // Generate signed URL for private files
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
  }
}

// Delete file from S3
export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });
  await s3Client.send(command);
}
