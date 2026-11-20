import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'proof'; // 'proof' | 'products'

    if (!file) {
      return NextResponse.json({ error: 'File gambar wajib disertakan.' }, { status: 400 });
    }

    // Sanitize category (only allow proof or products)
    const safeCategory = category === 'products' ? 'products' : 'proof';

    // Verify MIME type is image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeCategory);
    await mkdir(uploadDir, { recursive: true });

    // Determine extension: prefer webp if image/webp or clean extension
    let ext = 'webp';
    if (file.type === 'image/jpeg' || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) ext = 'jpg';
    else if (file.type === 'image/png' || file.name.endsWith('.png')) ext = 'png';
    else if (file.type === 'image/webp' || file.name.endsWith('.webp')) ext = 'webp';

    const cleanName = `${safeCategory}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
