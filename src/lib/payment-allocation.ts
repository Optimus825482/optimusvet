import { prisma } from "./prisma";

/**
 * Tahsilat yapıldığında en eski alacaklardan başlayarak düşer
 * FIFO (First In First Out) mantığı
 */
export async function allocatePaymentToSales(
  customerId: string,
  paymentAmount: number,
) {
  // En eski bekleyen/kısmi ödenmiş satışları getir
  const pendingSales = await prisma.transaction.findMany({
    where: {
      customerId,
      type: "SALE",
      status: {
        in: ["PENDING", "PARTIAL"],
      },
    },
    orderBy: {
      date: "asc", // En eski önce
    },
  });

  let remainingPayment = paymentAmount;
  const updates: Array<{
    id: string;
    paidAmount: number;
    status: "PAID" | "PARTIAL" | "PENDING";
  }> = [];

  for (const sale of pendingSales) {
    if (remainingPayment <= 0) break;

    const saleTotal = Number(sale.total);
    const alreadyPaid = Number(sale.paidAmount);
    const remainingDebt = saleTotal - alreadyPaid;

    if (remainingDebt <= 0) continue; // Zaten ödendi

    if (remainingPayment >= remainingDebt) {
      // Bu satış tamamen ödenebilir
      updates.push({
        id: sale.id,
        paidAmount: saleTotal,
        status: "PAID",
      });
      remainingPayment -= remainingDebt;
    } else {
      // Kısmi ödeme
      updates.push({
        id: sale.id,
        paidAmount: alreadyPaid + remainingPayment,
        status: "PARTIAL",
      });
      remainingPayment = 0;
    }
  }

  // Güncellemeleri uygula
  for (const update of updates) {
    await prisma.transaction.update({
      where: { id: update.id },
      data: {
        paidAmount: update.paidAmount,
        status: update.status,
      },
    });
  }

  return {
    allocatedAmount: paymentAmount - remainingPayment,
    remainingPayment,
    updatedSales: updates.length,
  };
}

/**
 * Satış iptal edildiğinde veya tahsilat silindiğinde
 * satış durumlarını yeniden hesapla
 */
export async function recalculateCustomerSalesStatus(customerId: string) {
  // Müşterinin tüm tahsilatlarını topla
  const paymentsResult = await prisma.transaction.aggregate({
    where: {
      customerId,
      type: "CUSTOMER_PAYMENT",
    },
    _sum: {
      total: true,
    },
  });

  const totalPayments = Number(paymentsResult._sum.total || 0);

  // Tüm satışları getir (en eskiden yeniye)
  const sales = await prisma.transaction.findMany({
    where: {
      customerId,
      type: "SALE",
    },
    orderBy: {
      date: "asc",
    },
  });

  let remainingPayment = totalPayments;

  // Her satışı güncelle
  for (const sale of sales) {
    const saleTotal = Number(sale.total);

    if (remainingPayment >= saleTotal) {
      // Tam ödendi
      await prisma.transaction.update({
        where: { id: sale.id },
        data: {
          paidAmount: saleTotal,
          status: "PAID",
        },
      });
      remainingPayment -= saleTotal;
    } else if (remainingPayment > 0) {
      // Kısmi ödendi
      await prisma.transaction.update({
        where: { id: sale.id },
        data: {
          paidAmount: remainingPayment,
          status: "PARTIAL",
        },
      });
      remainingPayment = 0;
    } else {
      // Ödenmedi
      await prisma.transaction.update({
        where: { id: sale.id },
        data: {
          paidAmount: 0,
          status: "PENDING",
        },
      });
    }
  }

  return {
    totalSales: sales.length,
    totalPayments,
  };
}
