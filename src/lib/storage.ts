import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export interface StorageUploadResult {
  url: string;
  fileName: string;
  storageProvider: 'VERCEL_BLOB' | 'LOCAL_FS';
}

/**
 * Universal Storage Uploader
 * - In Production with Vercel Blob: automatically saves to high-performance cloud storage
 * - In Local Development: falls back gracefully to public/uploads/
 */
export async function saveUploadedFile(
  folder: 'proof' | 'products',
  fileName: string,
  buffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<StorageUploadResult> {
  // 1. Cek apakah token Vercel Blob tersedia (Production on Vercel)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`${folder}/${fileName}`, buffer, {
        access: 'public',
        contentType: mimeType,
      });

      return {
        url: blob.url,
        fileName,
        storageProvider: 'VERCEL_BLOB',
      };
    } catch (err) {
      console.error('Vercel Blob upload failed, fallback to local storage:', err);
    }
  }

  // 2. Fallback Lokal (Development / Self-Hosted)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  return {
    url: `/uploads/${folder}/${fileName}`,
    fileName,
    storageProvider: 'LOCAL_FS',
  };
}
