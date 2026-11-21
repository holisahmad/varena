import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { validateUploadedFile } from '@/lib/file-security';
import { saveUploadedFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const transactionId = formData.get('transactionId') as string;
    const memberCode = formData.get('memberCode') as string;

    if (!file || !transactionId) {
      return NextResponse.json({ error: 'File dan transactionId diperlukan.' }, { status: 400 });
    }

    // Verify transaction belongs to this member
    const tx = await prisma.agentDepositTransaction.findFirst({
      where: {
        id: transactionId,
        ...(memberCode ? { member: { memberCode } } : {}),
      },
    });
    if (!tx) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Deep security validation (Magic bytes signature, dangerous extension prevention, file size)
    const validation = validateUploadedFile(file, buffer, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Cryptographically secure random filename preventing path traversal
    const safeExt = validation.sanitizedExt || 'jpg';
    const fileName = `proof-${transactionId}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;

    // Universal storage: Vercel Blob in Production, Local in Development
    const uploadResult = await saveUploadedFile('proof', fileName, buffer, validation.detectedMime);
    const proofUrl = uploadResult.url;

    // Update transaction with proofUrl
    await prisma.agentDepositTransaction.update({
      where: { id: transactionId },
      data: { proofUrl },
    });

    return NextResponse.json({
      success: true,
      proofUrl,
      storageProvider: uploadResult.storageProvider,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload gagal.' }, { status: 500 });
  }
}
