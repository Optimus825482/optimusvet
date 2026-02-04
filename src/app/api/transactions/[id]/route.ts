import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recalculateCustomerSalesStatus } from "@/lib/payment-allocation";
import { withApiHandler, ApiError } from "@/lib/api-route-handler";
import { auditUpdate, auditDelete } from "@/lib/audit";

// GET single transaction with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
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
        throw new ApiError("İşlem bulunamadı", 404);
      }

      return NextResponse.json(transaction);
    },
    { component: "TransactionsAPI" },
  );
}

// PUT update transaction status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;
      const body = await request.json();

      // ✅ AUDIT: Get OLD data before update
      const oldData = await prisma.transaction.findUnique({
        where: { id },
      });

      if (!oldData) {
        throw new ApiError("İşlem bulunamadı", 404);
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          status: body.status,
          paidAmount: body.paidAmount,
          notes: body.notes,
        },
      });

      // ✅ AUDIT: Log UPDATE with old and new data
      await auditUpdate(
        "transactions",
        id,
        oldData,
        transaction,
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json(transaction);
    },
    { component: "TransactionsAPI" },
  );
}

// DELETE transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;

      // ✅ AUDIT: Get OLD data before delete
      const transactionToDelete = await prisma.transaction.findUnique({
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

      if (!transactionToDelete) {
        throw new ApiError("İşlem bulunamadı", 404);
      }

      // Use Prisma transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        const transaction = transactionToDelete;

        // 1. Restore stock for each item
        for (const item of transaction.items) {
          if (item.product && !item.product.isService) {
            if (
              transaction.type === "SALE" ||
              transaction.type === "TREATMENT"
            ) {
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
          } else if (transaction.type === "CUSTOMER_PAYMENT") {
            // For payments, increase customer balance (remove payment)
            await tx.customer.update({
              where: { id: transaction.customerId },
              data: {
                balance: {
                  increment: Number(transaction.total),
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
          customerId: transaction.customerId,
          type: transaction.type,
        };
      });

      // ✅ AUDIT: Log DELETE with old data (includes items, customer info)
      await auditDelete(
        "transactions",
        id,
        transactionToDelete,
        ctx.auditContext,
      ).catch(console.error);

      // Eğer tahsilat silindiyse, satış durumlarını yeniden hesapla
      if (result.type === "CUSTOMER_PAYMENT" && result.customerId) {
        await recalculateCustomerSalesStatus(result.customerId);
      }

      return NextResponse.json(result);
    },
    { component: "TransactionsAPI" },
  );
}
