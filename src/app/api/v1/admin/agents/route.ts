import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCorporateUser } from '@/lib/auth';
import { withTransactionRetry } from '@/lib/security';
import { recordDepositTopupLedger } from '@/lib/ledger';
import { resolveCorporateAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengakses data keagenan.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lookupCode = searchParams.get('lookupMemberCode') || searchParams.get('lookup');

    // 0. Lookup Verifikasi Calon Agen untuk Penunjukan Langsung
    if (lookupCode) {
      const targetMember = await prisma.member.findUnique({
        where: { memberCode: lookupCode.trim().toUpperCase() },
        include: {
          user: { select: { phone: true, email: true } },
        },
      });

      if (!targetMember) {
        return NextResponse.json({ success: false, error: `Mitra dengan ID ${lookupCode.trim().toUpperCase()} tidak ditemukan.` }, { status: 404 });
      }

      let resolvedCity = targetMember.agentCity || targetMember.city || '';
      let resolvedProvince = targetMember.agentProvince || targetMember.province || '';
      let resolvedAddress = targetMember.agentAddress || targetMember.addressDetail || '';

      if (!resolvedCity || !resolvedAddress) {
        const lastOrder = await prisma.order.findFirst({
          where: { buyerUserId: targetMember.userId },
          orderBy: { createdAt: 'desc' },
          select: { shippingCity: true, shippingProvince: true, shippingAddress: true },
        });
        if (lastOrder) {
          if (!resolvedCity && lastOrder.shippingCity) resolvedCity = lastOrder.shippingCity;
          if (!resolvedProvince && lastOrder.shippingProvince) resolvedProvince = lastOrder.shippingProvince;
          if (!resolvedAddress && lastOrder.shippingAddress) resolvedAddress = lastOrder.shippingAddress;
        }
      }

      return NextResponse.json({
        success: true,
        member: {
          id: targetMember.id,
          memberCode: targetMember.memberCode,
          displayName: targetMember.displayName,
          legalName: targetMember.legalName,
          phone: targetMember.user?.phone,
          email: targetMember.user?.email,
          city: resolvedCity,
          province: resolvedProvince,
          addressDetail: resolvedAddress,
          isAgent: targetMember.isAgent || ['REGIONAL_AGENT', 'MASTER_AGENT'].includes(targetMember.agentType),
          agentType: targetMember.agentType,
          agentStatus: targetMember.agentStatus,
          agentInventory: targetMember.agentInventory || 0,
        },
      });
    }

    const [agents, applications, routableOrders, config, pendingTopups] = await Promise.all([
      // 1. Daftar Agen Resmi Aktif
      prisma.member.findMany({
        where: {
          OR: [
            { isAgent: true },
            { agentType: { in: ['REGIONAL_AGENT', 'MASTER_AGENT'] } },
            { stockistType: { in: ['MASTER', 'MOBILE'] } }, // legacy bridge
          ],
        },
        include: {
          user: { select: { phone: true, email: true } },
          agentRewards: { orderBy: { awardedAt: 'desc' } },
          agentStockMutations: { orderBy: { createdAt: 'desc' }, take: 30 },
          assignedAgentOrders: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 2. Daftar Pengajuan Masuk
      prisma.agentApplication.findMany({
        include: {
          member: {
            select: { memberCode: true, displayName: true, user: { select: { phone: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 3. Pesanan Konsumen/Mitra Baru yang Bisa Dialihkan ke Agen (Lunas, belum input resi)
      prisma.order.findMany({
        where: {
          orderStatus: 'PAID',
          assignedAgentMemberId: null,
          fulfillmentSource: { not: 'REGIONAL_AGENT' }, // Bukan pasokan internal agen
        },
        select: {
          id: true,
          orderNumber: true,
          buyerName: true,
          shippingCity: true,
          shippingAddress: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      // 4. Konfigurasi Keagenan (MOQ & Diskon)
      prisma.agentConfig.findUnique({ where: { id: 'default' } }).then((cfg) => {
        if (!cfg) {
          return prisma.agentConfig.create({
            data: {
              id: 'default',
              minimumRestockBox: 10,
              defaultDiscountType: 'PERCENTAGE',
              defaultDiscountValue: 15.0,
            },
          });
        }
        return cfg;
      }),
      // 5. Pengajuan Topup Deposit (Agen & Mitra) Menunggu Approval
      prisma.agentDepositTransaction.findMany({
        where: { status: 'PENDING', type: { in: ['TOPUP_DEPOSIT', 'SHOPPING_TOPUP'] } },
        include: {
          member: { select: { memberCode: true, displayName: true, isAgent: true, agentDepositBalance: true, shoppingDepositBalance: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      agents: agents.map((a: any) => {
        // 1. Pesanan terdistribusi/selesai
        const dispatchedOrders = (a.assignedAgentOrders || []).filter(
          (o: any) =>
            ['DISPATCHED', 'COMPLETED'].includes(o.agentDispatchStatus) ||
            ['SHIPPED', 'COMPLETED'].includes(o.orderStatus)
        );

        const soldFromOrders = dispatchedOrders.reduce((sum: number, o: any) => {
          const itemQty = (o.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);
          return sum + (itemQty > 0 ? itemQty : 1);
        }, 0);

        const soldFromMutations = (a.agentStockMutations || [])
          .filter((m: any) => ['DISPATCHED_TO_MEMBER', 'CENTRAL_DROPSHIP'].includes(m.type))
          .reduce((sum: number, m: any) => sum + Math.abs(m.quantity || 0), 0);

        const totalSoldBoxes = Math.max(soldFromOrders, soldFromMutations);

        // 2. Nominal Penjualan (Omset yang ditangani agen)
        const totalSalesNominal = dispatchedOrders.reduce(
          (sum: number, o: any) => sum + (o.total || o.subtotal || 0),
          0
        );

        // 3. Total Pasokan Masuk dari Pusat
        const totalRestockBoxes = (a.agentStockMutations || [])
          .filter((m: any) => m.type === 'RESTOCK_FROM_CENTRAL')
          .reduce((sum: number, m: any) => sum + Math.abs(m.quantity || 0), 0);

        // 4. Daftar & Total Reward yang Sudah Diberikan
        const rewardsList = (a.agentRewards || []).map((r: any) => ({
          id: r.id,
          rewardType: r.rewardType,
          title: r.title,
          cashAmount: r.cashAmount || 0,
          goodsDescription: r.goodsDescription,
          goodsValuation: r.goodsValuation || 0,
          totalValue: (r.cashAmount || 0) + (r.goodsValuation || 0),
          reasonNotes: r.reasonNotes,
          deliveryStatus: r.deliveryStatus || 'COMPLETED',
          awardedAt: r.awardedAt,
          awardedBy: r.awardedBy,
        }));

        const totalRewardValue = rewardsList.reduce((sum: number, r: any) => sum + r.totalValue, 0);

        // 5. Riwayat Mutasi Stok Terbaru
        const recentMutations = (a.agentStockMutations || []).slice(0, 15).map((m: any) => ({
          id: m.id,
          type: m.type,
          quantity: m.quantity,
          balanceBefore: m.balanceBefore,
          balanceAfter: m.balanceAfter,
          referenceId: m.referenceId,
          notes: m.notes,
          createdAt: m.createdAt,
        }));

        // 6. Riwayat Pesanan Didistribusikan Terbaru
        const recentOrders = (a.assignedAgentOrders || []).slice(0, 15).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          buyerName: o.buyerName,
          buyerPhone: o.buyerPhone,
          shippingCity: o.shippingCity,
          shippingAddress: o.shippingAddress,
          total: o.total,
          orderStatus: o.orderStatus,
          agentDispatchStatus: o.agentDispatchStatus,
          courierName: o.courierName,
          trackingNumber: o.trackingNumber,
          itemCount: (o.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 1,
          createdAt: o.createdAt,
        }));

        return {
          id: a.id,
          memberCode: a.memberCode,
          displayName: a.displayName,
          legalName: a.legalName,
          email: a.user?.email,
          phone: a.user?.phone,
          type: a.agentType !== 'NONE' ? a.agentType : a.stockistType || 'REGIONAL_AGENT',
          city: a.agentCity || a.stockistCity || a.city || 'Belum diatur',
          province: a.agentProvince || a.province || '-',
          address: a.agentAddress || a.addressDetail || '-',
          inventory: a.agentInventory || a.stockistInventory || 0,
          depositBalance: a.agentDepositBalance || 0,
          discountType: a.agentDiscountType || 'PERCENTAGE',
          discountValue: a.agentDiscountValue ?? 15.0,
          status: a.agentStatus || 'ACTIVE',
          // KPI Pencapaian & Progres
          totalSoldBoxes,
          totalSalesNominal,
          totalRestockBoxes,
          assignedOrdersCount: (a.assignedAgentOrders || []).length,
          completedOrdersCount: dispatchedOrders.length,
          // Rewards & Riwayat
          rewards: rewardsList,
          rewardsCount: rewardsList.length,
          totalRewardValue,
          recentMutations,
          recentOrders,
        };
      }),
      applications,
      routableOrders,
      config,
      pendingTopups,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat manajemen agen.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await resolveCorporateAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengatur keagenan.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. APPROVE_APPLICATION (Setujui Pengajuan Mitra Jadi Agen)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'APPROVE_APPLICATION') {
      const { applicationId, initialStockQuota, discountType, discountValue } = body;
      const app = await prisma.agentApplication.findUnique({
        where: { id: applicationId },
      });
      if (!app) return NextResponse.json({ error: 'Pengajuan tidak ditemukan.' }, { status: 404 });

      await withTransactionRetry(async (tx: any) => {
        await tx.agentApplication.update({
          where: { id: applicationId },
          data: {
            status: 'APPROVED',
            reviewedBy: authUser.userId,
            reviewedAt: new Date(),
          },
        });

        await tx.member.update({
          where: { id: app.memberId },
          data: {
            isAgent: true,
            agentType: 'REGIONAL_AGENT',
            agentStatus: 'ACTIVE',
            agentCity: app.city,
            agentProvince: app.province,
            agentAddress: app.warehouseAddress,
            agentInventory: parseInt(initialStockQuota, 10) || 0,
            agentDiscountType: discountType || 'PERCENTAGE',
            agentDiscountValue: parseFloat(discountValue) || 15.0,
            agentVerifiedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: authUser.userId,
            action: 'AGENT_APPLICATION_APPROVED',
            entityType: 'MEMBER',
            entityId: app.memberId,
            reason: `Persetujuan agen resmi wilayah ${app.city}`,
          },
        });
      });

      return NextResponse.json({ success: true, message: `Pengajuan keagenan ${app.city} berhasil disetujui.` });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. REJECT_APPLICATION (Tolak Pengajuan Keagenan)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'REJECT_APPLICATION') {
      const { applicationId, rejectionReason } = body;
      const app = await prisma.agentApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Belum memenuhi kriteria kapasitas operasional wilayah.',
          reviewedBy: authUser.userId,
          reviewedAt: new Date(),
        },
      });

      await prisma.member.update({
        where: { id: app.memberId },
        data: { agentStatus: 'REJECTED' },
      });

      return NextResponse.json({ success: true, message: 'Pengajuan keagenan ditolak.' });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. APPOINT_AGENT / DIRECT_APPOINTMENT (Penunjukan Langsung oleh Kantor Pusat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'APPOINT_AGENT' || action === 'DIRECT_APPOINTMENT') {
      const {
        memberCode,
        city,
        province,
        address,
        initialStock,
        initialStockQuota,
        discountType,
        discountValue,
        agentType,
      } = body;

      const member = await prisma.member.findUnique({
        where: { memberCode: memberCode?.trim().toUpperCase() },
        include: { user: true },
      });
      if (!member) return NextResponse.json({ error: 'Kode member tidak ditemukan.' }, { status: 404 });

      const stockNum = parseInt(initialStockQuota !== undefined ? initialStockQuota : initialStock, 10) || 0;
      const targetAgentType = agentType || 'REGIONAL_AGENT';
      const finalCity = city?.trim() || member.agentCity || member.city || 'Belum diatur';
      const finalProvince = province?.trim() || member.agentProvince || member.province || '-';
      const finalAddress = address?.trim() || member.agentAddress || member.addressDetail || '-';

      await prisma.member.update({
        where: { id: member.id },
        data: {
          isAgent: true,
          agentType: targetAgentType,
          agentStatus: 'ACTIVE',
          agentCity: finalCity,
          agentProvince: finalProvince,
          agentAddress: finalAddress,
          agentInventory: stockNum,
          agentDiscountType: discountType || 'PERCENTAGE',
          agentDiscountValue: parseFloat(discountValue) || 15.0,
          agentVerifiedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: authUser.userId,
          action: 'AGENT_DIRECT_APPOINTED',
          entityType: 'MEMBER',
          entityId: member.id,
          reason: `Penunjukan langsung agen resmi (${targetAgentType}) wilayah ${finalCity}, stok awal: ${stockNum} box`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Mitra ${member.displayName} (${member.memberCode}) berhasil ditetapkan sebagai ${
          targetAgentType === 'MASTER_AGENT' ? 'Master Agen Regional' : 'Agen Resmi Wilayah'
        } ${finalCity}.`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. ASSIGN_ORDER_TO_AGENT (Alihkan Pesanan Konsumen/Mitra ke Agen Terdekat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ASSIGN_ORDER_TO_AGENT') {
      const { orderId, agentMemberId, notes } = body;
      const [order, agent] = await Promise.all([
        prisma.order.findUnique({ where: { id: orderId } }),
        prisma.member.findUnique({ where: { id: agentMemberId } }),
      ]);

      if (!order || !agent) return NextResponse.json({ error: 'Order atau data agen tidak valid.' }, { status: 404 });

      await prisma.order.update({
        where: { id: orderId },
        data: {
          assignedAgentMemberId: agent.id,
          fulfillmentMode: 'ASSIGNED_AGENT',
          agentDispatchStatus: 'ASSIGNED',
          agentNote: notes || `Dialihkan kantor ke Agen ${agent.displayName} (${agent.agentCity}) agar pengiriman lebih cepat & hemat.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pesanan ${order.orderNumber} berhasil dialihkan ke Agen ${agent.displayName} (${agent.agentCity}).`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. UPDATE_CONFIG (Ubah MOQ & Diskon Default Agen)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'UPDATE_CONFIG') {
      const { minimumRestockBox, defaultDiscountType, defaultDiscountValue } = body;
      const updatedConfig = await prisma.agentConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          minimumRestockBox: parseInt(minimumRestockBox, 10) || 10,
          defaultDiscountType: defaultDiscountType || 'PERCENTAGE',
          defaultDiscountValue: parseFloat(defaultDiscountValue) || 15.0,
          updatedBy: authUser.userId,
        },
        update: {
          minimumRestockBox: parseInt(minimumRestockBox, 10) || 10,
          defaultDiscountType: defaultDiscountType || 'PERCENTAGE',
          defaultDiscountValue: parseFloat(defaultDiscountValue) || 15.0,
          updatedBy: authUser.userId,
        },
      });

      return NextResponse.json({ success: true, message: 'Pengaturan keagenan berhasil diperbarui.', config: updatedConfig });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. APPROVE_TOPUP / APPROVE_DEPOSIT_TOPUP (Konfirmasi Topup Saldo Deposit)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'APPROVE_TOPUP' || action === 'APPROVE_DEPOSIT_TOPUP') {
      const { transactionId } = body;
      const tx = await prisma.agentDepositTransaction.findUnique({
        where: { id: transactionId },
        include: { member: true },
      });
      if (!tx || tx.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Transaksi tidak valid atau sudah diproses sebelumnya.' },
          { status: 400 }
        );
      }

      const isShoppingDeposit = tx.type === 'SHOPPING_TOPUP';
      const currentBalance = isShoppingDeposit
        ? (tx.member.shoppingDepositBalance || 0)
        : (tx.member.agentDepositBalance || 0);

      await withTransactionRetry(async (prismaTx: any) => {
        // 1. Update saldo member (atomic increment to avoid race condition)
        await prismaTx.member.update({
          where: { id: tx.memberId },
          data: isShoppingDeposit
            ? { shoppingDepositBalance: { increment: tx.amount } }
            : { agentDepositBalance: { increment: tx.amount } },
        });

        // 1b. Read actual new balance after atomic update
        const updatedMember = await prismaTx.member.findUnique({
          where: { id: tx.memberId },
          select: { agentDepositBalance: true, shoppingDepositBalance: true },
        });
        const actualNewBalance = isShoppingDeposit
          ? (updatedMember?.shoppingDepositBalance || 0)
          : (updatedMember?.agentDepositBalance || 0);

        // 2. Update status transaksi deposit
        await prismaTx.agentDepositTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            approvedBy: authUser.userId,
            balanceBefore: currentBalance,
            balanceAfter: actualNewBalance,
          },
        });

        // 3. Catat Audit Log keuangan
        await prismaTx.auditLog.create({
          data: {
            actorUserId: authUser.userId,
            action: isShoppingDeposit ? 'MEMBER_SHOPPING_DEPOSIT_APPROVED' : 'AGENT_DEPOSIT_TOPUP_APPROVED',
            entityType: 'MEMBER',
            entityId: tx.memberId,
            afterJson: JSON.stringify({
              transactionId: tx.id,
              referenceId: tx.referenceId,
              amount: tx.amount,
              balanceBefore: currentBalance,
              balanceAfter: actualNewBalance,
              depositType: isShoppingDeposit ? 'SHOPPING' : 'AGENT',
            }),
            reason: `Deposit disetujui admin: Rp${tx.amount.toLocaleString('id-ID')} → Saldo ${isShoppingDeposit ? 'belanja mitra' : 'kas agen'} menjadi Rp${actualNewBalance.toLocaleString('id-ID')}`,
          },
        });

        // 4. Post double-entry ledger journal
        await recordDepositTopupLedger({
          transactionId: tx.id,
          memberCode: tx.member.memberCode,
          amount: tx.amount,
          isShoppingDeposit,
          referenceId: tx.referenceId || tx.id,
          txClient: prismaTx,
        });
      });

      return NextResponse.json({
        success: true,
        message: `Deposit Rp${tx.amount.toLocaleString('id-ID')} berhasil disetujui dan saldo ${isShoppingDeposit ? 'belanja mitra' : 'kas agen'} diperbarui.`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6b. REJECT_TOPUP (Tolak Pengajuan Deposit)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'REJECT_TOPUP' || action === 'REJECT_DEPOSIT_TOPUP') {
      const { transactionId, rejectionReason, reason } = body;
      const finalReason = rejectionReason || reason;
      const tx = await prisma.agentDepositTransaction.findUnique({
        where: { id: transactionId },
        include: { member: true },
      });
      if (!tx || tx.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Transaksi tidak valid atau sudah diproses.' },
          { status: 400 }
        );
      }

      await withTransactionRetry(async (prismaTx: any) => {
        await prismaTx.agentDepositTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'REJECTED',
            approvedBy: authUser.userId,
            notes: finalReason
              ? `[DITOLAK] ${finalReason}`
              : '[DITOLAK] Bukti transfer tidak valid atau nominal tidak sesuai',
          },
        });

        await prismaTx.auditLog.create({
          data: {
            actorUserId: authUser.userId,
            action: 'DEPOSIT_TOPUP_REJECTED',
            entityType: 'MEMBER',
            entityId: tx.memberId,
            reason: finalReason || 'Bukti transfer tidak valid',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Pengajuan deposit ditolak dan member diberitahu untuk re-upload.',
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. AWARD_REWARD (Berikan Reward Performa Dana / Barang Tercatat Akuntansi)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'AWARD_REWARD') {
      const { agentMemberId, memberId, rewardType, title, rewardTitle, cashAmount, rewardValue, goodsDescription, description, goodsValuation, reasonNotes } = body;
      const targetAgentId = agentMemberId || memberId;
      const agent = await prisma.member.findUnique({ where: { id: targetAgentId } });
      if (!agent) return NextResponse.json({ error: 'Data agen tidak ditemukan.' }, { status: 404 });

      const finalVal = parseInt(rewardValue || cashAmount || goodsValuation, 10) || 0;
      const finalTitle = title || rewardTitle || 'Bonus Performa Agen';
      const finalDesc = description || goodsDescription || null;

      const reward = await withTransactionRetry(async (prismaTx: any) => {
        // Buat Catatan Reward
        const rwd = await prismaTx.agentReward.create({
          data: {
            agentMemberId: targetAgentId,
            rewardType: rewardType || 'CASH_BONUS',
            title: finalTitle,
            cashAmount: rewardType === 'CASH_BONUS' ? finalVal : 0,
            goodsDescription: rewardType === 'PHYSICAL_GOODS' ? finalDesc : null,
            goodsValuation: finalVal,
            reasonNotes: reasonNotes || finalDesc || 'Evaluasi performa penjualan wilayah yang melampaui target',
            awardedBy: authUser.userId,
            deliveryStatus: rewardType === 'CASH_BONUS' ? 'TRANSFERRED' : 'PENDING',
          },
        });

        // Jika reward dana tunai, kreditkan langsung ke saldo deposit agen agar bisa dicairkan atau dipakai beli stok
        if (rewardType === 'CASH_BONUS' && finalVal > 0) {
          const newBal = (agent.agentDepositBalance || 0) + finalVal;
          await prismaTx.member.update({
            where: { id: agent.id },
            data: { agentDepositBalance: newBal },
          });

          await prismaTx.agentDepositTransaction.create({
            data: {
              memberId: agent.id,
              type: 'ADJUSTMENT_CREDIT',
              amount: finalVal,
              balanceBefore: agent.agentDepositBalance || 0,
              balanceAfter: newBal,
              referenceId: rwd.id,
              notes: `Bonus Performa Keagenan Resmi: ${title}`,
              status: 'COMPLETED',
            },
          });
        }

        // Catat Audit Keuangan Perusahaan
        await prismaTx.auditLog.create({
          data: {
            actorUserId: authUser.userId,
            action: rewardType === 'CASH_BONUS' ? 'AGENT_CASH_BONUS_AWARDED' : 'AGENT_GOODS_AWARDED',
            entityType: 'MEMBER',
            entityId: agent.id,
            afterJson: JSON.stringify({
              rewardId: rwd.id,
              rewardType,
              title: finalTitle,
              amount: finalVal,
              goodsDescription: finalDesc,
              valuation: finalVal,
            }),
            reason: reasonNotes || finalDesc || 'Reward performa agen',
          },
        });

        return rwd;
      });

      return NextResponse.json({
        success: true,
        message: `Reward performa "${finalTitle}" berhasil diberikan dan dicatat dalam pembukuan korporasi.`,
        reward,
      });
    }

    return NextResponse.json({ error: 'Aksi admin agen tidak dikenali.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses aksi admin agen.' }, { status: 500 });
  }
}
