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
    // Note: Auth is handled by middleware
    const { id } = await params;

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get transaction with items to restore stock
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          customer: true,
        },
      });

      if (!transaction) {
        throw new Error("İşlem bulunamadı");
      }

      // Prevent deletion of completed transactions (optional safety check)
      // Uncomment if you want to prevent deletion of paid transactions
      // if (transaction.status === "COMPLETED" || transaction.status === "PAID") {
      //   throw new Error("Tamamlanmış işlemler silinemez");
      // }

      // 1. Restore stock for each item
      for (const item of transaction.items) {
        if (item.product && !item.product.isService) {
          if (transaction.type === "SALE" || transaction.type === "TREATMENT") {
            // Restore stock for sales (add back)
            await tx.product.update({
              where: { id: item.productId! },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });

            // Record stock movement (reversal)
            await tx.stockMovement.create({
              data: {
                productId: item.productId!,
                type: "ADJUSTMENT",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: Number(item.quantity) * Number(item.unitPrice),
                reference: `${transaction.code} İPTAL`,
                notes: `Satış iptali - Stok geri yüklendi`,
              },
            });
          } else if (transaction.type === "PURCHASE") {
            // Reduce stock for purchases (remove)
            await tx.product.update({
              where: { id: item.productId! },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            // Record stock movement (reversal)
            await tx.stockMovement.create({
              data: {
                productId: item.productId!,
                type: "ADJUSTMENT",
                quantity: -item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: -(Number(item.quantity) * Number(item.unitPrice)),
                reference: `${transaction.code} İPTAL`,
                notes: `Alım iptali - Stok düşüldü`,
              },
            });
          }
        }
      }

      // 2. Update customer balance (reverse the balance change)
      if (transaction.customerId) {
        const remainingBalance =
          Number(transaction.total) - Number(transaction.paidAmount);

        if (transaction.type === "SALE" || transaction.type === "TREATMENT") {
          // For sales, decrease customer balance (remove receivable)
          await tx.customer.update({
            where: { id: transaction.customerId },
            data: {
              balance: {
                decrement: remainingBalance,
              },
            },
          });
        }
      }

      // 3. Delete transaction items first (foreign key constraint)
      await tx.transactionItem.deleteMany({
        where: { transactionId: id },
      });

      // 4. Delete the transaction
      await tx.transaction.delete({
        where: { id },
      });

      return {
        success: true,
        message: "İşlem başarıyla iptal edildi ve stoklar geri yüklendi",
        code: transaction.code,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transaction delete error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "İşlem silinemedi";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
