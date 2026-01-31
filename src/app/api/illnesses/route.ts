import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/illnesses - List all illnesses with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const animalId = searchParams.get("animalId");
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by illness name or diagnosis
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { diagnosis: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by animal
    if (animalId) {
      where.animalId = animalId;
    }

    const [illnesses, total] = await Promise.all([
      prisma.illness.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "desc" },
        include: {
          animal: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          treatments: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
            orderBy: { startDate: "desc" },
          },
          _count: {
            select: {
              treatments: true,
            },
          },
        },
      }),
      prisma.illness.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: illnesses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Illnesses GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Hastalık kayıtları getirilemedi",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST /api/illnesses - Create new illness (if needed globally)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const {
      animalId,
      name,
      diagnosis,
      symptoms,
      findings,
      notes,
      startDate,
      endDate,
      status,
      severity,
    } = body;

    // Validate required fields
    if (!animalId || !name) {
      return NextResponse.json(
        { error: "Hayvan ID ve hastalık adı zorunludur" },
        { status: 400 },
      );
    }

    // Verify animal exists
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true },
    });

    if (!animal) {
      return NextResponse.json({ error: "Hayvan bulunamadı" }, { status: 404 });
    }

    // Create illness
    const illness = await prisma.illness.create({
      data: {
        animalId,
        name,
        diagnosis: diagnosis || null,
        symptoms: symptoms || null,
        findings: findings || null,
        notes: notes || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: status || "ACTIVE",
        severity: severity || "MODERATE",
      },
      include: {
        animal: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        treatments: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: illness,
      message: "Hastalık kaydı oluşturuldu",
    });
  } catch (error) {
    console.error("Illness POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Hastalık kaydı oluşturulamadı",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
