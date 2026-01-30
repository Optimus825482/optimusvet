import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET single transaction with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        supplier: true,
        animal: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json({ error: "İşlem getirilemedi" }, { status: 500 });
  }
}

// PUT update transaction status
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

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        status: body.status,
        paidAmount: body.paidAmount,
        notes: body.notes,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Transaction update error:", error);
    return NextResponse.json(
      { error: "İşlem güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE transaction
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

    // Get transaction with items to restore stock
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
    }

    // Restore stock for each item
    for (const item of transaction.items) {
      if (item.product && !item.product.isService) {
        if (transaction.type === "SALE") {
          // Restore stock for sales
          await prisma.product.update({
            where: { id: item.productId! },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        } else if (transaction.type === "PURCHASE") {
          // Reduce stock for purchases
          await prisma.product.update({
            where: { id: item.productId! },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }
    }

    // Update customer balance
    if (transaction.customerId) {
      const balanceChange =
        transaction.type === "SALE"
          ? -(Number(transaction.total) - Number(transaction.paidAmount))
          : Number(transaction.total) - Number(transaction.paidAmount);

      await prisma.customer.update({
        where: { id: transaction.customerId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });
    }

    // Delete transaction items
    await prisma.transactionItem.deleteMany({
      where: { transactionId: id },
    });

    // Delete transaction
    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transaction delete error:", error);
    return NextResponse.json({ error: "İşlem silinemedi" }, { status: 500 });
  }
}
