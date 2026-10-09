import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recalculateCustomerSalesStatus } from "@/lib/payment-allocation";
import { withApiHandler, ApiError } from "@/lib/api-route-handler";
import { auditUpdate, auditDelete } from "@/lib/audit";
import {
  detectConvention,
  entryBalanceDelta,
  applyBalanceDelta,
} from "@/lib/customer-balance";

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

      // ✅ BAKİYE SENKRONU (konvansiyon-uyumlu delta ile)
      // paidAmount/status değişmiş olabilir. Bakiyeyi müşterinin bakiye
      // konvansiyonuna göre eski ve yeni kaydın farkı kadar düzeltiyoruz;
      // tam yeniden hesaplama yapmıyoruz (legacy defter müşterilerini bozar).
      if (transaction.customerId) {
        const recent = await prisma.transaction.findMany({
          where: {
            customerId: transaction.customerId,
            type: { in: ["SALE", "TREATMENT", "CUSTOMER_PAYMENT"] },
          },
          select: { code: true, type: true, total: true, paidAmount: true },
        });
        const balanceRow = await prisma.customer.findUnique({
          where: { id: transaction.customerId },
          select: { balance: true },
        });
        const convention = detectConvention(Number(balanceRow?.balance ?? 0), recent as any);
        const delta =
          entryBalanceDelta(
            { type: transaction.type, total: transaction.total, paidAmount: transaction.paidAmount },
            convention,
          ) -
          entryBalanceDelta(
            { type: oldData.type, total: oldData.total, paidAmount: oldData.paidAmount },
            convention,
          );
        if (Math.abs(delta) > 0.005) {
          await applyBalanceDelta(prisma, transaction.customerId, delta);
        }
      }

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

        // 2. Müşteri bakiyesini konvansiyon-uyumlu delta ile geri al
        // Eski kod sabit "total - paidAmount" kullanıyordu; bu legacy
        // (defter) kayıtlarında yanlıştı (defterde satışın TAMAMI borç
        // yazılmıştır). Silinecek kaydın, müşterinin konvansiyonuna uygun
        // bakiye etkisini hesaplayıp ters çeviriyoruz.
        const customerIdToSync = transaction.customerId;
        let balanceReversal = 0;
        if (customerIdToSync) {
          const recent = await tx.transaction.findMany({
            where: {
              customerId: customerIdToSync,
              type: { in: ["SALE", "TREATMENT", "CUSTOMER_PAYMENT"] },
            },
            select: { code: true, type: true, total: true, paidAmount: true },
          });
          const balanceRow = await tx.customer.findUnique({
            where: { id: customerIdToSync },
            select: { balance: true },
          });
          const convention = detectConvention(
            Number(balanceRow?.balance ?? 0),
            recent as any,
          );
          balanceReversal = entryBalanceDelta(
            { type: transaction.type, total: transaction.total, paidAmount: transaction.paidAmount },
            convention,
          );
        }

        // 3. Delete transaction items first (foreign key constraint)
        await tx.transactionItem.deleteMany({
          where: { transactionId: id },
        });

        // 4. Delete the transaction
        await tx.transaction.delete({
          where: { id },
        });

        // 5. Bakiye geri alımı (silinen kaydın etkisini ters çevir)
        if (customerIdToSync && Math.abs(balanceReversal) > 0.005) {
          await applyBalanceDelta(tx as any, customerIdToSync, -balanceReversal);
        }

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
