import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "balance"; // balance, name, code
    const order = searchParams.get("order") || "desc"; // asc, desc

    // Alacaklı müşterileri getir (balance > 0)
    const customers = await prisma.customer.findMany({
      where: {
        balance: {
          gt: 0,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        balance: true,
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
      orderBy:
        sortBy === "balance"
          ? { balance: order as "asc" | "desc" }
          : sortBy === "name"
            ? { name: order as "asc" | "desc" }
            : { code: order as "asc" | "desc" },
    });

    // Toplam alacak hesapla
    const totalReceivable = customers.reduce(
      (sum, customer) => sum + Number(customer.balance),
      0,
    );

    // İstatistikler
    const stats = {
      totalCustomers: customers.length,
      totalReceivable,
      averageReceivable:
        customers.length > 0 ? totalReceivable / customers.length : 0,
      highestReceivable:
        customers.length > 0 ? Number(customers[0].balance) : 0,
    };

    return NextResponse.json({
      customers,
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
