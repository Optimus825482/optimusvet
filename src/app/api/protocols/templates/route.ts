import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/protocols/templates - List protocol templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const species = searchParams.get("species");
    const isActive = searchParams.get("isActive");

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (species) {
      where.OR = [{ species }, { species: null }];
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const protocols = await prisma.protocol.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        steps: {
          orderBy: { dayOffset: "asc" },
        },
        _count: {
          select: {
            animalProtocols: true,
          },
        },
      },
    });

    return NextResponse.json({ protocols });
  } catch (error) {
    console.error("Protocol templates GET error:", error);
    return NextResponse.json(
      { error: "Protokol şablonları yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST /api/protocols/templates - Create protocol template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, species, description, steps, isActive = true } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Protokol adı ve tipi zorunludur" },
        { status: 400 },
      );
    }

    const protocol = await prisma.protocol.create({
      data: {
        name,
        type,
        species,
        description,
        isActive,
        steps: {
          create:
            steps?.map((step: any, index: number) => ({
              name: step.name,
              description: step.description,
              dayOffset: step.dayOffset || index * 7,
              isRequired: step.isRequired ?? true,
            })) || [],
        },
      },
      include: {
        steps: {
          orderBy: { dayOffset: "asc" },
        },
      },
    });

    return NextResponse.json(protocol, { status: 201 });
  } catch (error) {
    console.error("Protocol template POST error:", error);
    return NextResponse.json(
      { error: "Protokol şablonu eklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
