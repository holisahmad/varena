import { NextResponse } from 'next/server';
import { resolveCorporateAdmin } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { verifyCorporateAdmin } from '@/lib/auth';

/**
 * GET /api/v1/admin/search?q=VRN-0001
 * High-speed omni-search across Members, Orders, Payouts, and Ledger
 */
export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }
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
            { memberCode: { contains: query, mode: 'insensitive' } },
            { displayName: { contains: query, mode: 'insensitive' } },
            { legalName: { contains: query, mode: 'insensitive' } },
            { bankAccountNumber: { contains: query, mode: 'insensitive' } },
            { user: { email: { contains: query, mode: 'insensitive' } } },
            { user: { phone: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { user: { select: { email: true, phone: true } } },
        take: 8,
      }),

      // 2. Orders search
      prisma.order.findMany({
        where: {
          OR: [
            { orderNumber: { contains: query, mode: 'insensitive' } },
            { buyerName: { contains: query, mode: 'insensitive' } },
            { buyerPhone: { contains: query, mode: 'insensitive' } },
            { courierName: { contains: query, mode: 'insensitive' } },
            { trackingNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Payouts search
      prisma.withdrawalRequest.findMany({
        where: {
          OR: [
            { accountHolder: { contains: query, mode: 'insensitive' } },
            { bankName: { contains: query, mode: 'insensitive' } },
            { accountNumberMasked: { contains: query, mode: 'insensitive' } },
            { providerReference: { contains: query, mode: 'insensitive' } },
            { member: { memberCode: { contains: query, mode: 'insensitive' } } },
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
            { memo: { contains: query, mode: 'insensitive' } },
            { idempotencyKey: { contains: query, mode: 'insensitive' } },
            { referenceId: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        orderBy: { postedAt: 'desc' },
      }),
    ]);

    const totalMatches = members.length + orders.length + payouts.length + ledger.length;

    const mappedMembers = members.map((m) => ({
      id: m.id,
      code: m.memberCode,
      memberCode: m.memberCode,
      name: m.displayName,
      displayName: m.displayName,
      legalName: m.legalName,
      email: m.user?.email,
      phone: m.user?.phone,
      user: { email: m.user?.email, phone: m.user?.phone },
      status: m.memberStatus,
      memberStatus: m.memberStatus,
      stockistType: m.stockistType,
      stockistCity: m.stockistCity,
      bank: m.bankName ? `${m.bankName} - ${m.bankAccountNumber}` : 'Belum diikat',
    }));

    const mappedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      buyerName: o.buyerName,
      buyerPhone: o.buyerPhone,
      total: o.total,
      status: o.orderStatus,
      orderStatus: o.orderStatus,
      courier: o.courierName,
      courierName: o.courierName,
      trackingNumber: o.trackingNumber,
      createdAt: o.createdAt,
    }));

    const mappedPayouts = payouts.map((p) => ({
      id: p.id,
      memberCode: p.member.memberCode,
      memberName: p.member.displayName,
      member: { memberCode: p.member.memberCode, displayName: p.member.displayName },
      amount: p.amount,
      netAmount: p.netAmount,
      bankName: p.bankName,
      accountHolder: p.accountHolder,
      accountNumberMasked: p.accountNumberMasked,
      status: p.status,
      refNumber: p.providerReference,
      date: p.requestedAt,
    }));

    const mappedLedger = ledger.map((l) => ({
      id: l.id,
      memo: l.memo,
      referenceType: l.referenceType,
      referenceId: l.referenceId,
      postedAt: l.postedAt,
      createdAt: l.postedAt,
    }));

    return NextResponse.json({
      success: true,
      query,
      totalMatches,
      // Root-level arrays for direct access
      members: mappedMembers,
      orders: mappedOrders,
      payouts: mappedPayouts,
      ledger: mappedLedger,
      // Nested results for structured access
      results: {
        members: mappedMembers,
        orders: mappedOrders,
        payouts: mappedPayouts,
        ledger: mappedLedger,
      },
    });
  } catch (err: any) {
    console.error('Omni-search error:', err);
    return NextResponse.json({ error: err.message || 'Gagal mencari data.' }, { status: 500 });
  }
}
