import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/search?q=VRN-0001
 * High-speed omni-search across Members, Orders, Payouts, and Ledger
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        query: query || '',
        totalMatches: 0,
        members: [],
        orders: [],
        payouts: [],
        ledger: [],
      });
    }

    // Parallel multi-table search (limited to 8 per group for instant latency < 30ms)
    const [members, orders, payouts, ledger] = await Promise.all([
      // 1. Members search
      prisma.member.findMany({
        where: {
          OR: [
            { memberCode: { contains: query } },
            { displayName: { contains: query } },
            { legalName: { contains: query } },
            { bankAccountNumber: { contains: query } },
            { user: { email: { contains: query } } },
            { user: { phone: { contains: query } } },
          ],
        },
        include: { user: { select: { email: true, phone: true } } },
        take: 8,
      }),

      // 2. Orders search
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: query } },
            { buyerName: { contains: query } },
            { buyerPhone: { contains: query } },
            { courierName: { contains: query } },
            { trackingNumber: { contains: query } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Payouts search
      prisma.withdrawalRequest.findMany({
        where: {
          OR: [
            { accountHolder: { contains: query } },
            { bankName: { contains: query } },
            { accountNumberMasked: { contains: query } },
            { providerReference: { contains: query } },
            { member: { memberCode: { contains: query } } },
          ],
        },
        include: { member: { select: { memberCode: true, displayName: true } } },
        take: 8,
        orderBy: { requestedAt: 'desc' },
      }),

      // 4. Ledger transactions
      prisma.ledgerTransaction.findMany({
        where: {
          OR: [
            { memo: { contains: query } },
            { idempotencyKey: { contains: query } },
            { referenceId: { contains: query } },
          ],
        },
        take: 8,
        orderBy: { postedAt: 'desc' },
      }),
    ]);

    const totalMatches = members.length + orders.length + payouts.length + ledger.length;

    return NextResponse.json({
      success: true,
      query,
      totalMatches,
      results: {
        members: members.map((m) => ({
          id: m.id,
          code: m.memberCode,
          name: m.displayName,
          legalName: m.legalName,
          email: m.user?.email,
          phone: m.user?.phone,
          status: m.memberStatus,
          stockistType: m.stockistType,
          stockistCity: m.stockistCity,
          bank: m.bankName ? `${m.bankName} - ${m.bankAccountNumber}` : 'Belum diikat',
        })),
        orders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          buyerName: o.buyerName,
          buyerPhone: o.buyerPhone,
          total: o.total,
          status: o.orderStatus,
          courier: o.courierName,
          trackingNumber: o.trackingNumber,
          createdAt: o.createdAt,
        })),
        payouts: payouts.map((p) => ({
          id: p.id,
          memberCode: p.member.memberCode,
          memberName: p.member.displayName,
          amount: p.amount,
          netAmount: p.netAmount,
          bankName: p.bankName,
          accountHolder: p.accountHolder,
          status: p.status,
          refNumber: p.providerReference,
          date: p.requestedAt,
        })),
        ledger: ledger.map((l) => ({
          id: l.id,
          memo: l.memo,
          referenceType: l.referenceType,
          referenceId: l.referenceId,
          postedAt: l.postedAt,
        })),
      },
    });
  } catch (err: any) {
    console.error('Omni-search error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mencari data.' }, { status: 500 });
  }
}
