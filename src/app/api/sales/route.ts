import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// GET - İşlem listesi (Satış)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const orderBy = searchParams.get("orderBy") || "date";
    const order = searchParams.get("order") || "desc";

    const where: Prisma.TransactionWhereInput = {
      type: { in: ["SALE", "TREATMENT"] },
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status as Prisma.EnumTransactionStatusFilter["equals"];
    }

    if (startDate) {
      where.date = { ...(where.date as object), gte: new Date(startDate) };
    }

    if (endDate) {
      where.date = { ...(where.date as object), lte: new Date(endDate) };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: true,
          animal: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { [orderBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Sales GET error:", error);
    return NextResponse.json(
      { error: "Satışlar yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Yeni satış
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transactionSchema.parse(body);

    // Generate code
    const year = new Date().getFullYear();
    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        type: { in: ["SALE", "TREATMENT"] },
        code: { startsWith: `SAT-${year}` },
      },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const lastNumber = lastTransaction
      ? parseInt(lastTransaction.code.split("-")[2])
      : 0;
    const newCode = `SAT-${year}-${(lastNumber + 1).toString().padStart(4, "0")}`;

    // Calculate totals
    let subtotal = 0;
    let vatTotal = 0;

    const itemsWithTotals = validatedData.items.map((item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
      const itemVat = itemSubtotal * (Number(item.vatRate) / 100);
      const itemTotal = itemSubtotal + itemVat - Number(item.discount);

      subtotal += itemSubtotal;
      vatTotal += itemVat;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: item.discount,
        total: itemTotal,
      };
    });

    const total = subtotal + vatTotal - Number(validatedData.discount);

    // Determine payment status
    let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
    if (validatedData.paidAmount >= total) {
      status = "PAID";
    } else if (validatedData.paidAmount > 0) {
      status = "PARTIAL";
    }

    // Create transaction with items in a transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction
      const newTransaction = await tx.transaction.create({
        data: {
          code: newCode,
          type: validatedData.type,
          customerId: validatedData.customerId || null,
          animalId: validatedData.animalId || null,
          userId: session.user.id,
          date: validatedData.date,
          dueDate: validatedData.dueDate || null,
          subtotal,
          vatTotal,
          discount: validatedData.discount,
          total,
          paidAmount: validatedData.paidAmount,
          status,
          paymentMethod: validatedData.paymentMethod,
          notes: validatedData.notes,
          items: {
            create: itemsWithTotals,
          },
        },
        include: {
          customer: true,
          animal: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Update stock for each item (decrease)
      for (const item of validatedData.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue;
        if (product.isService) continue; // Hizmetlerin stoğu düşmez

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: Number(item.quantity) },
          },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.quantity) * Number(item.unitPrice),
            reference: newCode,
          },
        });
      }

      // Update customer balance (increase receivable)
      if (validatedData.customerId) {
        const remainingBalance = total - validatedData.paidAmount;
        if (remainingBalance > 0) {
          await tx.customer.update({
            where: { id: validatedData.customerId },
            data: {
              balance: { increment: remainingBalance },
            },
          });
        }
      }

      return newTransaction;
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: unknown) {
    console.error("Sale POST error:", error);

    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json(
        {
          error: "Geçersiz veri",
          details: (error as { errors: unknown }).errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Satış oluşturulurken hata oluştu" },
      { status: 500 },
    );
  }
}
