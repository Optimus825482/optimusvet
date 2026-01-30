import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { allocatePaymentToSales } from "@/lib/payment-allocation";

// GET all transactions (sales/purchases)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "SALE";
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const supplierId = searchParams.get("supplierId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      type,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          animal: {
            select: {
              id: true,
              name: true,
              species: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
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
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "İşlemler getirilemedi" },
      { status: 500 },
    );
  }
}

// POST create transaction (sale/purchase)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();

    // Generate transaction code
    const type = body.type || "SALE";
    const prefix = type === "SALE" ? "STS" : "ALS";
    const lastTransaction = await prisma.transaction.findFirst({
      where: { type },
      orderBy: { code: "desc" },
    });
    const lastNumber = lastTransaction
      ? parseInt(lastTransaction.code.replace(/\D/g, "") || "0")
      : 0;
    const code = `${prefix}-${String(lastNumber + 1).padStart(6, "0")}`;

    // Calculate totals
    let subTotal = 0;
    let vatTotal = 0;
    const items = body.items.map((item: any) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineDiscount = item.discount || 0;
      const lineVat = ((lineTotal - lineDiscount) * item.vatRate) / 100;
      const total = lineTotal - lineDiscount + lineVat;

      subTotal += lineTotal - lineDiscount;
      vatTotal += lineVat;

      return {
        productId: item.productId || null,
        description: item.description || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: lineDiscount,
        total,
      };
    });

    const discount = body.discount || 0;
    const total = subTotal + vatTotal - discount;

    // Determine payment status
    const paidAmount = body.paidAmount || 0;
    let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (paidAmount >= total) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        code,
        type,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        animalId: body.animalId || null,
        subtotal: subTotal,
        discount,
        vatTotal,
        total,
        paidAmount,
        paymentMethod: body.paymentMethod || "CASH",
        status,
        notes: body.notes || null,
        userId: session.user.id,
        items: {
          create: items,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Update stock for each item
    for (const item of transaction.items) {
      if (item.productId) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (product && !product.isService) {
          if (type === "SALE") {
            // Decrease stock for sales
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          } else if (type === "PURCHASE") {
            // Increase stock for purchases
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }
    }

    // Update customer balance if applicable
    if (body.customerId && paidAmount < total) {
      await prisma.customer.update({
        where: { id: body.customerId },
        data: {
          balance: {
            increment: total - paidAmount,
          },
        },
      });
    }

    // Update supplier balance if applicable
    if (body.supplierId && paidAmount < total) {
      await prisma.supplier.update({
        where: { id: body.supplierId },
        data: {
          balance: {
            increment: total - paidAmount,
          },
        },
      });
    }

    // Eğer tahsilat (CUSTOMER_PAYMENT) ise, en eski alacaklardan düş
    if (type === "CUSTOMER_PAYMENT" && body.customerId) {
      await allocatePaymentToSales(body.customerId, total);

      // Müşteri bakiyesini güncelle (tahsilat bakiyeyi azaltır)
      await prisma.customer.update({
        where: { id: body.customerId },
        data: {
          balance: {
            decrement: total,
          },
        },
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Transaction create error:", error);
    return NextResponse.json(
      { error: "İşlem oluşturulamadı" },
      { status: 500 },
    );
  }
}
