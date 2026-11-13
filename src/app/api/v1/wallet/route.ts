import { NextResponse } from 'next/server';
import { getMemberWallet } from '@/lib/ledger';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberCode = searchParams.get('memberCode');

    if (!memberCode) {
      return NextResponse.json({ error: 'Member code is required.' }, { status: 400 });
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

