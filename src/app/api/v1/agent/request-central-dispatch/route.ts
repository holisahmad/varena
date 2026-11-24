import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTransactionRetry } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/agent/request-central-dispatch
 * Agen meminta kantor pusat mengirimkan produk langsung ke mitra luar kota/daerah kantor (Central Dropship)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      agentMemberCode,
      recipientName,
      recipientPhone,
      shippingAddress,
      shippingProvince,
      shippingCity,
      variantId,
      quantity,
      paymentMethod, // 'DEPOSIT' or 'MANUAL_TRANSFER'
      notes,
    } = body;

    const member = await prisma.member.findUnique({
      where: { memberCode: agentMemberCode },
      include: { user: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Data agen tidak ditemukan.' }, { status: 404 });
    }

    if (!recipientName || !recipientPhone || !shippingAddress || !shippingCity) {
      return NextResponse.json({ error: 'Rincian nama penerima, no handphone, dan alamat lengkap wajib diisi.' }, { status: 400 });
    }

    const qty = parseInt(quantity, 10) || 1;
    const variant =
      (variantId
        ? await prisma.productVariant.findUnique({ where: { id: variantId } })
        : null) ||
      (await prisma.productVariant.findFirst({
        where: { sku: { contains: 'BOX' } },
      })) ||
      (await prisma.productVariant.findFirst());
    if (!variant) {
      return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
    }

    const grossPrice = variant.price * qty;

    // Diskon agen resmi tetap didapat oleh agen!
    const discountType = member.agentDiscountType || 'PERCENTAGE';
    const discountVal = member.agentDiscountValue ?? 15.0;
    let discountAmount = 0;
    if (discountType === 'PERCENTAGE') {
      discountAmount = Math.round((grossPrice * discountVal) / 100);
    } else {
      discountAmount = Math.round(discountVal * qty);
    }

    const netSubtotal = grossPrice - discountAmount;
    
    // Ambil setting ongkir dropship pusat dinamis jika dikonfigurasi admin
    const dispatchSetting = await prisma.systemSetting.findUnique({
      where: { key: 'CENTRAL_DISPATCH_FEE' },
    }).catch(() => null);
    const shippingCost = dispatchSetting ? Number(dispatchSetting.value) || 15000 : 15000;

    const uniqueCode = Math.floor(100 + Math.random() * 899);
    const grandTotal = netSubtotal + shippingCost + (paymentMethod === 'DEPOSIT' ? 0 : uniqueCode);

    if (paymentMethod === 'DEPOSIT') {
      if ((member.agentDepositBalance || 0) < grandTotal) {
        return NextResponse.json(
          {
            error: `Saldo deposit agen tidak mencukupi (Tersedia: Rp${(member.agentDepositBalance || 0).toLocaleString('id-ID')}, Dibutuhkan: Rp${grandTotal.toLocaleString('id-ID')}).`,
          },
          { status: 400 }
        );
      }
    }

    const orderNumber = `DRP-CENTRAL-${Date.now().toString().slice(-6)}`;

    const createdOrder = await withTransactionRetry(async (tx: any) => {
      const ord = await tx.order.create({
        data: {
          orderNumber,
          buyerUserId: member.userId,
          buyerName: `${recipientName} (Via Agen ${member.displayName})`,
          buyerPhone: recipientPhone,
          buyerEmail: member.user.email,
          shippingAddress,
          shippingProvince: shippingProvince || 'Jawa Timur',
          shippingCity,
          orderStatus: paymentMethod === 'DEPOSIT' ? 'PAID' : 'PENDING_PAYMENT',
          orderType: 'REPEAT_PURCHASE',
          fulfillmentSource: 'CENTRAL_WAREHOUSE',
          fulfillmentMode: 'AGENT_DROPSHIP_REQUEST',
          assignedAgentMemberId: member.id,
          subtotal: grossPrice,
          discount: discountAmount,
          shippingCost,
          uniqueCode: paymentMethod === 'DEPOSIT' ? 0 : uniqueCode,
          total: grandTotal,
          paidAt: paymentMethod === 'DEPOSIT' ? new Date() : null,
          agentNote: `Permintaan kirim langsung kantor pusat ke mitra luar daerah agen: ${notes || '-'}`,
          items: {
            create: [
              {
                productVariantId: variant.id,
                skuSnapshot: variant.sku,
                nameSnapshot: variant.name,
                quantity: qty,
                unitPrice: variant.price,
                hppSnapshot: variant.hpp || 250000,
                lineTotal: grossPrice,
              },
            ],
          },
        },
      });

      if (paymentMethod === 'DEPOSIT') {
        const newBal = (member.agentDepositBalance || 0) - grandTotal;
        await tx.member.update({
          where: { id: member.id },
          data: { agentDepositBalance: newBal },
        });

        await tx.agentDepositTransaction.create({
          data: {
            memberId: member.id,
            type: 'RESTOCK_PAYMENT',
            amount: grandTotal,
            balanceBefore: member.agentDepositBalance || 0,
            balanceAfter: newBal,
            referenceId: orderNumber,
            notes: `Dropship request kantor pusat ke ${recipientName} (${shippingCity}) via Saldo Deposit`,
            status: 'COMPLETED',
          },
        });
      }

      return ord;
    });

    return NextResponse.json({
      success: true,
      message:
        paymentMethod === 'DEPOSIT'
          ? 'Permintaan pengiriman langsung telah dibayar dari saldo deposit. Gudang pusat akan segera memproses kiriman.'
          : 'Permintaan kirim langsung berhasil dibuat. Silakan transfer nominal sesuai kode unik.',
      order: createdOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses permintaan kirim kantor.' }, { status: 500 });
  }
}
