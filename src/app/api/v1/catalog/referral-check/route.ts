import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { memberCode: code.trim().toUpperCase() },
    select: {
      id: true,
      memberCode: true,
      displayName: true,
      memberStatus: true,
    },
  });

  if (!member || member.memberStatus !== 'ACTIVE') {
    return NextResponse.json({ valid: false, message: 'Kode referral tidak ditemukan atau tidak aktif.' });
  }

  return NextResponse.json({
    valid: true,
    sponsor: {
      code: member.memberCode,
      name: member.displayName,
    },
  });
}
