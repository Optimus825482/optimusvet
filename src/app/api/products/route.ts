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
    const productCategory = searchParams.get("productCategory") || "";
    const stockStatus = searchParams.get("stockStatus") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
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

    if (productCategory) {
      where.productCategory = productCategory;
    }

    // Stock status filter
    if (stockStatus === "CRITICAL") {
      // Stock <= criticalLevel
      where.AND = [
        { isService: false },
        { stock: { lte: prisma.product.fields.criticalLevel } },
      ];
    } else if (stockStatus === "LOW") {
      // Stock > criticalLevel but < criticalLevel * 2
      where.AND = [
        { isService: false },
        { stock: { gt: prisma.product.fields.criticalLevel } },
      ];
    } else if (stockStatus === "NORMAL") {
      where.isService = false;
    }

    // Sorting
    const orderBy: Record<string, string> = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "stock") {
      orderBy.stock = sortOrder;
    } else if (sortBy === "price") {
      orderBy.salePrice = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate stats
    const stats = {
      total,
      byCategory: await prisma.product.groupBy({
        by: ["productCategory"],
        where: { isActive: true },
        _count: true,
      }),
      criticalStock: await prisma.product.count({
        where: {
          isActive: true,
          isService: false,
          stock: { lte: prisma.product.fields.criticalLevel },
        },
      }),
    };

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
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

    // Auto-set isService if category is SERVICE
    if (validatedData.productCategory === "SERVICE") {
      validatedData.isService = true;
    }

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
        image: validatedData.image || null,
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
