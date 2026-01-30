import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all protocol templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const species = searchParams.get("species");

    const where: any = { isActive: true };

    if (type) {
      where.type = type;
    }

    if (species) {
      where.species = species;
    }

    const protocols = await prisma.protocol.findMany({
      where,
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
      orderBy: { name: "asc" },
    });

    return NextResponse.json(protocols);
  } catch (error) {
    console.error("Templates fetch error:", error);
    return NextResponse.json(
      { error: "Şablonlar getirilemedi" },
      { status: 500 },
    );
  }
}

// POST create protocol template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const protocol = await prisma.protocol.create({
      data: {
        name: body.name,
        type: body.type,
        species: body.species || [],
        description: body.description || null,
        isActive: true,
        steps: {
          create: body.steps.map((step: any, index: number) => ({
            name: step.name,
            notes: step.description || null,
            dayOffset: step.dayOffset,
            order: index + 1,
          })),
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
    console.error("Template create error:", error);
    return NextResponse.json(
      { error: "Şablon oluşturulamadı" },
      { status: 500 },
    );
  }
}
