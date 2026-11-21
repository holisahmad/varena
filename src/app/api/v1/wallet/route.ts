import { NextResponse } from 'next/server';
import { getMemberWallet } from '@/lib/ledger';
import { getMemberFromJWT } from '@/lib/auth';
import { resolveCorporateAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');

    if (!memberCode) {
      return NextResponse.json({ error: 'Kode member diperlukan.' }, { status: 400 });
    }

    // Cek apakah admin korporasi (boleh lihat wallet siapa saja)
    const adminSession = await resolveCorporateAdmin(req);
    if (!adminSession) {
      // Bukan admin — cek apakah member yang bersangkutan sendiri
      const memberSession = await getMemberFromJWT(req);
      if (!memberSession) {
        return NextResponse.json({ error: 'Sesi tidak valid. Silakan login kembali.' }, { status: 401 });
      }
      if (memberSession.memberCode !== memberCode) {
        return NextResponse.json({ error: 'Akses ditolak. Anda hanya dapat melihat dompet milik Anda sendiri.' }, { status: 403 });
      }
    }

    const wallet = await getMemberWallet(memberCode);

    return NextResponse.json({
      success: true,
      wallet,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
