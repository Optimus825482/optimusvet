import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { animalSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

// GET - Hayvan listesi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const species = searchParams.get("species") || "";
    const customerId = searchParams.get("customerId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { chipNumber: { contains: search } },
        { earTag: { contains: search } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (species) {
      where.species = species;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const [animals, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        include: {
          customer: true,
          _count: {
            select: {
              protocols: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.animal.count({ where }),
    ]);

    return NextResponse.json({
      animals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Animals GET error:", error);
    return NextResponse.json(
      { error: "Hayvanlar yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST - Yeni hayvan ekle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();

    console.log("Gelen hayvan verisi:", body);

    // Tarihleri Date objesine çevir
    const processedData = {
      ...body,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      weight: body.weight ? Number(body.weight) : null,
    };

    const validatedData = animalSchema.parse(processedData);

    console.log("Validate edilmiş veri:", validatedData);

    const animal = await prisma.animal.create({
      data: {
        customerId: validatedData.customerId,
        name: validatedData.name,
        species: validatedData.species,
        breed: validatedData.breed || null,
        gender: validatedData.gender || null,
        birthDate: validatedData.birthDate || null,
        weight: validatedData.weight || null,
        color: validatedData.color || null,
        chipNumber: validatedData.chipNumber || null,
        earTag: validatedData.earTag || null,
        notes: validatedData.notes || null,
      },
      include: {
        customer: true,
      },
    });

    console.log("Oluşturulan hayvan:", animal);

    return NextResponse.json(animal, { status: 201 });
  } catch (error: unknown) {
    console.error("Animal POST error:", error);

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
      {
        error: "Hayvan eklenirken hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
