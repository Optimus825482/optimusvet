import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "balance"; // balance, name, code, lastTransactionDate
    const order = searchParams.get("order") || "desc"; // asc, desc

    // Alacaklı müşterileri getir (balance > 0 = Onun bize borcu var)
    const customers = await prisma.customer.findMany({
      where: {
        balance: {
          gt: 0, // Pozitif bakiye = Borçlu müşteri
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        balance: true,
        transactions: {
          where: {
            OR: [{ type: "SALE" }, { type: "CUSTOMER_PAYMENT" }],
          },
          orderBy: {
            date: "desc",
          },
          take: 1,
          select: {
            date: true,
            type: true,
          },
        },
        _count: {
          select: {
            transactions: {
              where: {
                type: "SALE",
                status: {
                  in: ["PENDING", "PARTIAL"],
                },
              },
            },
          },
        },
      },
    });

    // En son işlem tarihi ve gün sayısını hesapla
    const now = new Date();
    const customersWithLastTransaction = customers.map((customer) => {
      const lastTransaction = customer.transactions[0] || null;
      const lastTransactionDate = lastTransaction?.date || null;
      const lastTransactionType = lastTransaction?.type || null;
      const daysSinceLastTransaction = lastTransactionDate
        ? Math.floor(
            (now.getTime() - new Date(lastTransactionDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        balance: customer.balance,
        lastTransactionDate,
        lastTransactionType,
        daysSinceLastTransaction,
        _count: customer._count,
      };
    });

    // Sıralama
    const sortedCustomers = customersWithLastTransaction.sort((a, b) => {
      if (sortBy === "balance") {
        const diff = Number(b.balance) - Number(a.balance);
        return order === "desc" ? diff : -diff;
      } else if (sortBy === "name") {
        const diff = a.name.localeCompare(b.name, "tr");
        return order === "desc" ? -diff : diff;
      } else if (sortBy === "code") {
        const diff = a.code.localeCompare(b.code);
        return order === "desc" ? -diff : diff;
      } else if (sortBy === "lastTransactionDate") {
        // En eski işlem en üstte (null en sonda)
        if (a.lastTransactionDate === null) return 1;
        if (b.lastTransactionDate === null) return -1;
        const diff =
          new Date(a.lastTransactionDate).getTime() -
          new Date(b.lastTransactionDate).getTime();
        return order === "desc" ? -diff : diff;
      }
      return 0;
    });

    // Toplam alacak hesapla
    const totalReceivable = sortedCustomers.reduce(
      (sum, customer) => sum + Number(customer.balance),
      0,
    );

    // İstatistikler
    const stats = {
      totalCustomers: sortedCustomers.length,
      totalReceivable,
      averageReceivable:
        sortedCustomers.length > 0
          ? totalReceivable / sortedCustomers.length
          : 0,
      highestReceivable:
        sortedCustomers.length > 0 ? Number(sortedCustomers[0].balance) : 0,
    };

    return NextResponse.json({
      customers: sortedCustomers,
      stats,
    });
  } catch (error) {
    console.error("Receivables report error:", error);
    return NextResponse.json(
      { error: "Alacaklar raporu oluşturulamadı" },
      { status: 500 },
    );
  }
}
