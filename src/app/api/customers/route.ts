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

    // Generate code
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const lastNumber = lastCustomer
      ? parseInt(lastCustomer.code.split("-")[1])
      : 0;
    const newCode = `MUS-${(lastNumber + 1).toString().padStart(4, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        code: newCode,
        email: validatedData.email || null,
      },
    });

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
