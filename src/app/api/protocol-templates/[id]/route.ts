import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET single protocol template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const protocol = await prisma.protocol.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!protocol) {
      return NextResponse.json(
        { error: "Protokol bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(protocol);
  } catch (error) {
    console.error("Protocol template GET error:", error);
    return NextResponse.json(
      { error: "Protokol getirilemedi" },
      { status: 500 },
    );
  }
}

// PUT update protocol template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, type, species, description, isDefault, isActive, steps } =
      body;

    if (!name || !type || !steps || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: "İsim, tip ve adımlar zorunludur" },
        { status: 400 },
      );
    }

    // Delete existing steps
    await prisma.protocolStep.deleteMany({
      where: { protocolId: id },
    });

    // Update protocol with new steps
    const protocol = await prisma.protocol.update({
      where: { id },
      data: {
        name,
        type,
        species: species || [],
        description,
        isDefault: isDefault || false,
        isActive: isActive !== undefined ? isActive : true,
        steps: {
          create: steps.map((step: any, index: number) => ({
            name: step.name,
            dayOffset: parseInt(step.dayOffset),
            notes: step.notes || null,
            order: index,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(protocol);
  } catch (error) {
    console.error("Protocol template PUT error:", error);
    return NextResponse.json(
      { error: "Protokol güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE protocol template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    // Check if protocol is being used
    const usageCount = await prisma.animalProtocol.count({
      where: { protocolId: id },
    });

    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Bu protokol ${usageCount} hayvanda kullanılıyor. Önce bu protokolleri kaldırın.`,
        },
        { status: 400 },
      );
    }

    // Delete steps first
    await prisma.protocolStep.deleteMany({
      where: { protocolId: id },
    });

    // Delete protocol
    await prisma.protocol.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Protocol template DELETE error:", error);
    return NextResponse.json({ error: "Protokol silinemedi" }, { status: 500 });
  }
}
