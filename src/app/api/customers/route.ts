import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

// GET - Müşteri listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { animals: true, transactions: true },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json(
      { error: "Müşteriler yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Yeni müşteri ekle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    // Generate unique code - find the actual maximum number
    let customer;
    let maxRetries = 10;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Get ALL customer codes and find the maximum number
        const allCustomers = await prisma.customer.findMany({
          where: {
            code: { startsWith: "MUS-" },
          },
          select: { code: true },
        });

        let maxNumber = 0;
        for (const c of allCustomers) {
          const parts = c.code.split("-");
          if (parts[1]) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }

        // Add attempt offset to ensure uniqueness on retry
        const nextNumber = maxNumber + 1 + attempt;
        const newCode = `MUS-${nextNumber.toString().padStart(4, "0")}`;

        customer = await prisma.customer.create({
          data: {
            ...validatedData,
            code: newCode,
            email: validatedData.email || null,
          },
        });

        break; // Success, exit loop
      } catch (createError: any) {
        if (createError.code === "P2002") {
          // Unique constraint error, retry with incremented attempt
          attempt++;
          if (attempt >= maxRetries) {
            throw new Error(
              "Müşteri kodu oluşturulamadı. Lütfen tekrar deneyin.",
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }
        throw createError; // Re-throw if not retryable
      }
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    console.error("Customer POST error:", error);

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
      { error: "Müşteri eklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
