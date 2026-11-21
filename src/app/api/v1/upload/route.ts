import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { validateUploadedFile } from '@/lib/file-security';

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeCategory);
    await mkdir(uploadDir, { recursive: true });

    // Cryptographically secure random filename preventing path traversal and collision
    const safeExt = validation.sanitizedExt || 'webp';
    const cleanName = `${safeCategory}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;
    const filePath = path.join(uploadDir, cleanName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeCategory}/${cleanName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: cleanName,
      sizeKb: Math.round(buffer.length / 1024),
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mengunggah gambar.' }, { status: 500 });
  }
}
