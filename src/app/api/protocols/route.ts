import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/protocols - List protocol templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActive = searchParams.get("isActive") === "true";

    const where: any = {};
    if (type) where.type = type;
    if (searchParams.has("isActive")) where.isActive = isActive;

    const protocols = await prisma.protocol.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(protocols);
  } catch (error) {
    console.error("Protocols GET error:", error);
    return NextResponse.json(
      { error: "Protokoller yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST /api/protocols - Create a new protocol template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, species, description, steps } = body;

    if (!name || !type || !steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "İsim, tip ve adımlar zorunludur" },
        { status: 400 },
      );
    }

    const protocol = await prisma.protocol.create({
      data: {
        name,
        type,
        species: species || [],
        description,
        steps: {
          create: steps.map((step: any, index: number) => ({
            name: step.name,
            dayOffset: parseInt(step.dayOffset),
            notes: step.notes,
            order: index,
          })),
        },
      },
      include: {
        steps: true,
      },
    });

    return NextResponse.json(protocol, { status: 201 });
  } catch (error) {
    console.error("Protocol POST error:", error);
    return NextResponse.json(
      { error: "Protokol oluşturulurken hata oluştu" },
      { status: 500 },
    );
  }
}
