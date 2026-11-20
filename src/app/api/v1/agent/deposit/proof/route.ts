import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Save file to public/uploads/proof/
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proof');
    await mkdir(uploadDir, { recursive: true });
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `proof-${transactionId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    const proofUrl = `/uploads/proof/${fileName}`;

    // Update transaction with proofUrl
    await prisma.agentDepositTransaction.update({
      where: { id: transactionId },
      data: { proofUrl },
    });

    return NextResponse.json({ success: true, proofUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload gagal.' }, { status: 500 });
  }
}
