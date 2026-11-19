import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberCode, city, province, warehouseAddress, storageCapacity, contactPhone, notes } = body;

    if (!memberCode || !city || !province || !warehouseAddress || !contactPhone) {
      return NextResponse.json({ error: 'Seluruh data alamat, kota, provinsi, dan kontak wajib diisi.' }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      return NextResponse.json({ error: 'Akun kemitraan tidak ditemukan.' }, { status: 404 });
    }

    if (member.isAgent) {
      return NextResponse.json({ error: 'Akun Anda sudah berstatus sebagai Agen Resmi VARENA.' }, { status: 400 });
    }

    // Check existing pending application
    const existingPending = await prisma.agentApplication.findFirst({
      where: { memberId: member.id, status: 'PENDING' },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'Anda telah memiliki pengajuan keagenan yang sedang ditinjau oleh tim kantor pusat.' },
        { status: 400 }
      );
    }

    const application = await prisma.agentApplication.create({
      data: {
        memberId: member.id,
        city: city.trim(),
        province: province.trim(),
        warehouseAddress: warehouseAddress.trim(),
        storageCapacity: parseInt(storageCapacity, 10) || 50,
        contactPhone: contactPhone.trim(),
        notes: notes ? notes.trim() : null,
        status: 'PENDING',
      },
    });

    await prisma.member.update({
      where: { id: member.id },
      data: {
        agentStatus: 'APPLIED',
        agentCity: city.trim(),
        agentProvince: province.trim(),
        agentAddress: warehouseAddress.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengajuan keagenan resmi berhasil dikirimkan. Tim manajemen kantor pusat akan segera melakukan verifikasi.',
      application,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengajukan keagenan.' }, { status: 500 });
  }
}
