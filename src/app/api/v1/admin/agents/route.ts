import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCorporateUser } from '@/lib/auth';
import { withTransactionRetry } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    const authUser = await getCorporateUser(userId, userEmail);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengakses data keagenan.' }, { status: 403 });
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
      // 5. Pengajuan Topup Deposit Agen Menunggu Approval
      prisma.agentDepositTransaction.findMany({
        where: { status: 'PENDING' },
        include: {
          member: { select: { memberCode: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      agents: agents.map((a) => ({
        id: a.id,
        memberCode: a.memberCode,
        displayName: a.displayName,
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
        rewardsCount: a.agentRewards?.length || 0,
      })),
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
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');

    const authUser = await getCorporateUser(userId, userEmail);
    if (!authUser) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya pengelola korporasi yang berhak mengatur keagenan.' }, { status: 403 });
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
            reviewedBy: authUser.id,
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
            actorUserId: authUser.id,
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
          reviewedBy: authUser.id,
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
    // 3. APPOINT_AGENT (Penunjukan Langsung oleh Kantor Pusat)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'APPOINT_AGENT') {
      const { memberCode, city, province, address, initialStock, discountType, discountValue } = body;
      const member = await prisma.member.findUnique({ where: { memberCode: memberCode?.trim().toUpperCase() } });
      if (!member) return NextResponse.json({ error: 'Kode member tidak ditemukan.' }, { status: 404 });

      await prisma.member.update({
        where: { id: member.id },
        data: {
          isAgent: true,
          agentType: 'REGIONAL_AGENT',
          agentStatus: 'ACTIVE',
          agentCity: city?.trim() || 'Jakarta',
          agentProvince: province?.trim() || 'DKI Jakarta',
          agentAddress: address?.trim() || member.addressDetail || 'Kantor Distribusi',
          agentInventory: parseInt(initialStock, 10) || 50,
          agentDiscountType: discountType || 'PERCENTAGE',
          agentDiscountValue: parseFloat(discountValue) || 15.0,
          agentVerifiedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          actorUserId: authUser.id,
          action: 'AGENT_DIRECT_APPOINTED',
          entityType: 'MEMBER',
          entityId: member.id,
          reason: `Penunjukan langsung agen resmi kota ${city}`,
        },
      });

      return NextResponse.json({ success: true, message: `Member ${member.displayName} berhasil diangkat sebagai Agen Resmi ${city}.` });
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
          updatedBy: authUser.id,
        },
        update: {
          minimumRestockBox: parseInt(minimumRestockBox, 10) || 10,
          defaultDiscountType: defaultDiscountType || 'PERCENTAGE',
          defaultDiscountValue: parseFloat(defaultDiscountValue) || 15.0,
          updatedBy: authUser.id,
        },
      });

      return NextResponse.json({ success: true, message: 'Pengaturan keagenan berhasil diperbarui.', config: updatedConfig });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. APPROVE_TOPUP (Konfirmasi Topup Saldo Deposit Kas Agen)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'APPROVE_TOPUP') {
      const { transactionId } = body;
      const tx = await prisma.agentDepositTransaction.findUnique({ where: { id: transactionId }, include: { member: true } });
      if (!tx || tx.status !== 'PENDING') return NextResponse.json({ error: 'Transaksi topup tidak valid atau sudah diproses.' }, { status: 400 });

      await withTransactionRetry(async (prismaTx: any) => {
        const newBalance = (tx.member.agentDepositBalance || 0) + tx.amount;
        await prismaTx.member.update({
          where: { id: tx.memberId },
          data: { agentDepositBalance: newBalance },
        });

        await prismaTx.agentDepositTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            approvedBy: authUser.id,
            balanceBefore: tx.member.agentDepositBalance || 0,
            balanceAfter: newBalance,
          },
        });
      });

      return NextResponse.json({ success: true, message: `Topup deposit Rp${tx.amount.toLocaleString('id-ID')} berhasil disetujui.` });
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
            awardedBy: authUser.id,
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
            actorUserId: authUser.id,
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
