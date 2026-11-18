import { NextRequest, NextResponse } from 'next/server';
import { getWaOutboxHistory } from '@/lib/whatsapp';
import { checkRateLimit } from '@/lib/security';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`admin-wa-outbox:${ip}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });
  }

  const outbox = getWaOutboxHistory();
  return NextResponse.json({
    success: true,
    count: outbox.length,
    messages: outbox,
  });
}
