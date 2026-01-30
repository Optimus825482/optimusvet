import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCode } from "@/lib/utils";
import { auth } from "@/lib/auth";

// GET /api/suppliers - List suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              transactions: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Suppliers GET error:", error);
    return NextResponse.json(
      { error: "Tedarikçiler yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      address,
      city,
      district,
      taxNumber,
      taxOffice,
      contactName,
      balance,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Tedarikçi adı zorunludur" },
        { status: 400 },
      );
    }

    // Generate unique code
    const count = await prisma.supplier.count();
    const code = `TDR${String(count + 1).padStart(3, "0")}`;

    const supplier = await prisma.supplier.create({
      data: {
        code,
        name,
        phone: phone || "",
        email,
        address,
        city,
        district,
        taxNumber,
        taxOffice,
        contactName,
        balance: parseFloat(balance) || 0,
        notes,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Supplier POST error:", error);
    return NextResponse.json(
      { error: "Tedarikçi eklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
