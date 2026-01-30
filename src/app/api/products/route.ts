import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

// GET - Ürün listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (lowStock) {
      where.stock = { lte: prisma.product.fields.criticalLevel };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Ürünler yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Yeni ürün ekle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Generate code
    const lastProduct = await prisma.product.findFirst({
      orderBy: { code: "desc" },
      select: { code: true },
    });
    const lastNumber = lastProduct
      ? parseInt(lastProduct.code.split("-")[1])
      : 0;
    const newCode = `URN-${(lastNumber + 1).toString().padStart(4, "0")}`;

    const product = await prisma.product.create({
      data: {
        ...validatedData,
        code: newCode,
        expiryDate: validatedData.expiryDate || null,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    console.error("Product POST error:", error);

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
      { error: "Ürün eklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
