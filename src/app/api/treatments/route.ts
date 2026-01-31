import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/treatments - List all treatments with pagination and filters
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
    const illnessId = searchParams.get("illnessId");
    const animalId = searchParams.get("animalId");
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by treatment name
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by illness
    if (illnessId) {
      where.illnessId = illnessId;
    }

    // Filter by animal (through illness)
    if (animalId) {
      where.illness = {
        animalId: animalId,
      };
    }

    const [treatments, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              unit: true,
              salePrice: true,
              stock: true,
            },
          },
          illness: {
            select: {
              id: true,
              name: true,
              status: true,
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
            },
          },
        },
      }),
      prisma.treatment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: treatments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Treatments GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Tedavi kayıtları getirilemedi",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
