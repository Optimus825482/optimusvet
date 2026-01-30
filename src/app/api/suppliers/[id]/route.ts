import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/suppliers/[id] - Get single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Tedarikçi bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Supplier GET error:", error);
    return NextResponse.json(
      { error: "Tedarikçi yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      phone,
      email,
      address,
      city,
      district,
      taxNumber,
      taxOffice,
      contactName,
      balance,
      notes,
    } = body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        city,
        district,
        taxNumber,
        taxOffice,
        contactName,
        balance: balance !== undefined ? parseFloat(balance) : undefined,
        notes,
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Supplier PUT error:", error);
    return NextResponse.json(
      { error: "Tedarikçi güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// DELETE /api/suppliers/[id] - Delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    // Check if supplier has transactions
    const transactionCount = await prisma.transaction.count({
      where: { supplierId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Bu tedarikçiye ait işlemler var, silinemez" },
        { status: 400 },
      );
    }

    await prisma.supplier.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier DELETE error:", error);
    return NextResponse.json(
      { error: "Tedarikçi silinirken hata oluştu" },
      { status: 500 },
    );
  }
}
