import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateUploadedFile } from '@/lib/file-security';
import { saveUploadedFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'proof'; // 'proof' | 'products'

    if (!file) {
      return NextResponse.json({ error: 'File gambar wajib disertakan.' }, { status: 400 });
    }

    // Sanitize category (strictly whitelist proof or products)
    const safeCategory = category === 'products' ? 'products' : 'proof';

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Deep security validation (Magic bytes signature, dangerous extension prevention, file size)
    const validation = validateUploadedFile(file, buffer, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Cryptographically secure random filename preventing path traversal and collision
    const safeExt = validation.sanitizedExt || 'webp';
    const cleanName = `${safeCategory}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;

    // Universal storage: Vercel Blob in Production, Local in Development
    const uploadResult = await saveUploadedFile(safeCategory, cleanName, buffer, validation.detectedMime);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      fileName: cleanName,
      storageProvider: uploadResult.storageProvider,
      sizeKb: Math.round(buffer.length / 1024),
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengunggah file.' }, { status: 500 });
  }
}
