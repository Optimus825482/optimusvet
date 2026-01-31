import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { allocatePaymentToSalesInTransaction } from "@/lib/payment-allocation";
import { randomUUID } from "crypto";

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
    const dateField = searchParams.get("dateField") || "createdAt"; // date veya createdAt
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
      // dateField parametresine göre filtreleme (date veya createdAt)
      where[dateField] = {};
      if (startDate) {
        where[dateField].gte = new Date(startDate);
      }
      if (endDate) {
        where[dateField].lte = new Date(endDate);
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

// POST create transaction (sale/purchase/payment)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const type = body.type || "SALE";

    // TAHSİLAT İŞLEMİ (CUSTOMER_PAYMENT) - Ayrı handler
    if (type === "CUSTOMER_PAYMENT") {
      return await handleCustomerPayment(body, session);
    }

    // TEDARİKÇİ ÖDEMESİ (SUPPLIER_PAYMENT) - Ayrı handler
    if (type === "SUPPLIER_PAYMENT") {
      return await handleSupplierPayment(body, session);
    }

    // SATIŞ/ALIŞ İŞLEMİ - Mevcut mantık
    return await handleSaleOrPurchase(
      body,
      session,
      type as "SALE" | "PURCHASE" | "TREATMENT",
    );
  } catch (error) {
    console.error("Transaction create error:", error);
    return NextResponse.json(
      { error: "İşlem oluşturulamadı" },
      { status: 500 },
    );
  }
}

/**
 * Generate unique transaction code with retry mechanism
 */
async function generateUniqueCode(
  prefix: string,
  maxRetries = 5,
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    // Crypto-based UUID (çok güçlü, collision riski neredeyse yok)
    const uuid = randomUUID().split("-")[0].toUpperCase(); // İlk 8 karakter
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    const code = `${prefix}-${timestamp}-${uuid}`;

    // Kod daha önce kullanılmış mı kontrol et
    const existing = await prisma.transaction.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code; // Benzersiz kod bulundu
    }

    console.warn(
      `[CODE_GEN] Duplicate detected (attempt ${i + 1}/${maxRetries}):`,
      code,
    );

    // Kısa bir bekleme (race condition için)
    await new Promise((resolve) => setTimeout(resolve, 10 * (i + 1)));
  }

  // Son çare: Tam UUID kullan
  const fullUuid = randomUUID().toUpperCase();
  return `${prefix}-${fullUuid}`;
}

/**
 * Müşteri tahsilatı işlemi
 * - Tahsilat kaydı oluşturur
 * - En eski alacaklardan düşer (FIFO)
 * - Müşteri bakiyesini azaltır
 */
async function handleCustomerPayment(body: any, session: any) {
  try {
    const amount = Number(body.total || body.amount || 0);

    if (!body.customerId) {
      console.error("[TAHSILAT] Müşteri ID eksik:", body);
      return NextResponse.json(
        { error: "Müşteri ID gerekli" },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      console.error("[TAHSILAT] Geçersiz tutar:", amount);
      return NextResponse.json(
        { error: "Geçerli bir tutar giriniz" },
        { status: 400 },
      );
    }

    console.log("[TAHSILAT] Başlatılıyor:", {
      customerId: body.customerId,
      amount,
      paymentMethod: body.paymentMethod,
    });

    // Generate unique payment code with retry
    const code = await generateUniqueCode("TAH");
    console.log("[TAHSILAT] Benzersiz kod oluşturuldu:", code);

    // Transaction içinde tüm işlemleri atomik olarak yap
    const result = await prisma.$transaction(async (tx) => {
      // 1. Tahsilat kaydı oluştur
      console.log("[TAHSILAT] Transaction kaydı oluşturuluyor...");
      const payment = await tx.transaction.create({
        data: {
          code,
          type: "CUSTOMER_PAYMENT",
          customerId: body.customerId,
          subtotal: amount, // Tahsilatta subtotal = total
          vatTotal: 0, // Tahsilatta KDV yok
          discount: 0,
          total: amount,
          paidAmount: amount,
          status: "PAID",
          paymentMethod: body.paymentMethod || "CASH",
          notes: body.notes || null,
          userId: session.user.id,
          date: body.date ? new Date(body.date) : new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
            },
          },
        },
      });

      console.log("[TAHSILAT] Transaction kaydı oluşturuldu:", payment.id);

      // 2. En eski alacaklardan düş (FIFO)
      console.log("[TAHSILAT] Alacaklara dağıtılıyor...");
      const allocationResult = await allocatePaymentToSalesInTransaction(
        tx,
        body.customerId,
        amount,
      );

      console.log("[TAHSILAT] Dağıtım tamamlandı:", allocationResult);

      // 3. Müşteri bakiyesini güncelle (tahsilat bakiyeyi AZALTIR)
      console.log("[TAHSILAT] Müşteri bakiyesi güncelleniyor...");
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          balance: { decrement: amount },
        },
      });

      console.log("[TAHSILAT] Müşteri bakiyesi güncellendi");

      return {
        payment,
        allocation: allocationResult,
      };
    });

    console.log("[TAHSILAT] Başarıyla tamamlandı:", result.payment.code);

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error: any) {
    console.error("[TAHSILAT] HATA:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Prisma unique constraint hatası
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu tahsilat kodu zaten kullanılmış. Lütfen tekrar deneyin." },
        { status: 409 },
      );
    }

    // Foreign key hatası
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Müşteri bulunamadı veya silinmiş" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: "Tahsilat oluşturulamadı",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * Tedarikçi ödemesi işlemi
 * - Ödeme kaydı oluşturur
 * - Tedarikçi bakiyesini azaltır
 */
async function handleSupplierPayment(body: any, session: any) {
  const amount = Number(body.total || body.amount || 0);

  if (!body.supplierId) {
    return NextResponse.json(
      { error: "Tedarikçi ID gerekli" },
      { status: 400 },
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: "Geçerli bir tutar giriniz" },
      { status: 400 },
    );
  }

  // Generate unique payment code with retry
  const code = await generateUniqueCode("ODE");

  // Transaction içinde tüm işlemleri atomik olarak yap
  const result = await prisma.$transaction(async (tx) => {
    // 1. Ödeme kaydı oluştur
    const payment = await tx.transaction.create({
      data: {
        code,
        type: "SUPPLIER_PAYMENT",
        supplierId: body.supplierId,
        subtotal: amount, // Ödemede subtotal = total
        vatTotal: 0, // Ödemede KDV yok
        discount: 0,
        total: amount,
        paidAmount: amount,
        status: "PAID",
        paymentMethod: body.paymentMethod || "CASH",
        notes: body.notes || null,
        userId: session.user.id,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // 2. Tedarikçi bakiyesini güncelle (ödeme bakiyeyi AZALTIR)
    await tx.supplier.update({
      where: { id: body.supplierId },
      data: {
        balance: { decrement: amount },
      },
    });

    return payment;
  });

  return NextResponse.json(result, { status: 201 });
}

/**
 * Satış/Alış işlemi
 * - Transaction kaydı oluşturur
 * - Stok günceller
 * - Müşteri/Tedarikçi bakiyesini günceller
 */
async function handleSaleOrPurchase(
  body: any,
  session: any,
  type: "SALE" | "PURCHASE" | "TREATMENT",
) {
  // Generate unique transaction code with retry
  const prefix = type === "SALE" ? "STS" : type === "TREATMENT" ? "TDV" : "ALS";
  const code = await generateUniqueCode(prefix);

  // Calculate totals
  let subTotal = body.subtotal || 0;
  let vatTotal = body.vatTotal || 0;
  const items = (body.items || []).map((item: any) => {
    const lineTotal = item.quantity * item.unitPrice;
    const lineDiscount = item.discount || 0;
    const lineVat = ((lineTotal - lineDiscount) * item.vatRate) / 100;
    const total = lineTotal - lineDiscount + lineVat;

    subTotal += lineTotal - lineDiscount;
    vatTotal += lineVat;

    return {
      productId: item.productId, // productId zorunlu
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate || 0,
      discount: lineDiscount,
      total,
    };
  });

  const discount = body.discount || 0;
  const total = body.total || subTotal + vatTotal - discount;

  // Determine payment status
  const paidAmount = body.paidAmount || 0;
  let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
  if (paidAmount >= total) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  }

  // Transaction içinde tüm işlemleri atomik olarak yap
  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Transaction kaydı oluştur
    const newTransaction = await tx.transaction.create({
      data: {
        code,
        type,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
        animalId: body.animalId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal: subTotal,
        discount,
        vatTotal,
        total,
        paidAmount,
        paymentMethod: body.paymentMethod || "CASH",
        status,
        notes: body.notes || null,
        userId: session.user.id,
        date: body.date ? new Date(body.date) : new Date(),
        ...(items.length > 0 && {
          items: {
            create: items,
          },
        }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        supplier: true,
        animal: true,
      },
    });

    // 2. Update stock for each item
    for (const item of newTransaction.items) {
      if (item.productId) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product && !product.isService) {
          if (type === "SALE" || type === "TREATMENT") {
            // Decrease stock for sales
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            // Record stock movement
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "SALE",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: Number(item.quantity) * Number(item.unitPrice),
                reference: code,
              },
            });
          } else if (type === "PURCHASE") {
            // Increase stock for purchases
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });

            // Record stock movement
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "PURCHASE",
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: Number(item.quantity) * Number(item.unitPrice),
                reference: code,
              },
            });
          }
        }
      }
    }

    // 3. Update customer balance if applicable (veresiye varsa)
    if (body.customerId && paidAmount < total) {
      const remainingBalance = total - paidAmount;
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          balance: {
            increment: remainingBalance, // Müşteri borcu ARTAR
          },
        },
      });
    }

    // 4. Update supplier balance if applicable (veresiye varsa)
    if (body.supplierId && paidAmount < total) {
      const remainingBalance = total - paidAmount;
      await tx.supplier.update({
        where: { id: body.supplierId },
        data: {
          balance: {
            increment: remainingBalance, // Tedarikçi borcu ARTAR
          },
        },
      });
    }

    return newTransaction;
  });

  // 5. Otomatik hatırlatma oluştur (vade tarihi varsa ve ödeme tam değilse)
  if (body.dueDate && status !== "PAID") {
    const remaining = total - paidAmount;
    const reminderType =
      type === "SALE" || type === "TREATMENT"
        ? "PAYMENT_DUE"
        : "COLLECTION_DUE";

    const entityName = body.customerId
      ? transaction.customer?.name
      : body.supplierId
        ? transaction.supplier?.name
        : "Perakende";

    await prisma.reminder.create({
      data: {
        type: reminderType,
        title: `${code} - Vade Tarihi`,
        description: `${entityName} - ${remaining.toFixed(2)} TL ${status === "PARTIAL" ? "(Kısmi Ödeme)" : ""}`,
        dueDate: new Date(body.dueDate),
        userId: session.user.id,
        customerId: body.customerId || null,
        supplierId: body.supplierId || null,
      },
    });
  }

  return NextResponse.json(transaction, { status: 201 });
}
