import { NextResponse } from 'next/server';
import { getMemberFromJWT, getAuthenticatedUser } from '@/lib/auth';
import { confirmDepositPayment } from '@/lib/deposit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, memberCode, proofUrl, bankName, accountNumber, notes } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId wajib diisi.' }, { status: 400 });
    }

    // Resolve member auth if available
    const memberSession = await getMemberFromJWT(req);
    const jwtSession = await getAuthenticatedUser(req);
    const resolvedMemberCode = memberSession?.memberCode || memberCode;

    const updated = await confirmDepositPayment({
      transactionId,
      memberCode: resolvedMemberCode,
      proofUrl,
      bankName,
      accountNumber,
      notes,
    });

    const hasProof = Boolean(updated.proofUrl);

    return NextResponse.json({
      success: true,
      message: hasProof
        ? 'Konfirmasi transfer beserta bukti foto berhasil dikirim. Menunggu verifikasi tim keuangan.'
        : 'Konfirmasi transfer (tanpa bukti foto) berhasil dikirim. Tim keuangan akan mencocokkan mutasi bank rekening Anda.',
      transaction: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengirim konfirmasi deposit.' },
      { status: 400 }
    );
  }
}
