import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStatementHTML } from "@/lib/pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get customer with transactions
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "asc" },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 },
      );
    }

    // Get clinic settings
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["clinicName", "phone", "address"],
        },
      },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    const clinicName = settingsMap.clinicName || "OPTIMUS VET";
    const clinicPhone = settingsMap.phone || "";
    const clinicAddress = settingsMap.address || "";

    // Calculate opening balance (0 for now, can be customized)
    const openingBalance = 0;

    // Build transactions array with running balance
    let runningBalance = openingBalance;
    const transactions = customer.transactions.map((transaction) => {
      const isDebit =
        transaction.type === "SALE" || transaction.type === "TREATMENT";
      const isCredit = transaction.type === "CUSTOMER_PAYMENT";

      const debit = isDebit ? Number(transaction.total) : 0;
      const credit = isCredit ? Number(transaction.total) : 0;

      // Update running balance
      runningBalance += debit - credit;

      return {
        date: new Date(transaction.date).toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        code: transaction.code,
        description: getTransactionDescription(transaction),
        debit,
        credit,
        balance: runningBalance,
      };
    });

    const closingBalance = runningBalance;

    // Generate HTML
    const html = generateStatementHTML({
      customer: {
        name: customer.name,
        code: customer.code,
        phone: customer.phone || undefined,
        email: customer.email || undefined,
      },
      clinic: {
        name: clinicName,
        phone: clinicPhone,
      },
      period: {
        start: transactions.length > 0 ? transactions[0].date : "-",
        end:
          transactions.length > 0
            ? transactions[transactions.length - 1].date
            : "-",
      },
      openingBalance,
      closingBalance,
      transactions,
    });

    // Return HTML response
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Statement generation error:", error);
    return NextResponse.json(
      { error: "Hesap eksteri oluşturulamadı" },
      { status: 500 },
    );
  }
}

function getTransactionDescription(transaction: any): string {
  if (transaction.type === "SALE") {
    const itemCount = transaction.items?.length || 0;
    return `Satış - ${itemCount} kalem`;
  }
  if (transaction.type === "TREATMENT") {
    return "Tedavi";
  }
  if (transaction.type === "CUSTOMER_PAYMENT") {
    return "Ödeme";
  }
  return transaction.type;
}
