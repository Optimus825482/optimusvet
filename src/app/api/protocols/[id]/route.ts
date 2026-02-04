import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ProtocolResponse } from "@/types/protocol";

// GET single protocol
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const animalProtocol = await prisma.animalProtocol.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        protocol: {
          include: {
            steps: {
              orderBy: { dayOffset: "asc" },
            },
          },
        },
        records: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    if (!animalProtocol) {
      return NextResponse.json(
        { error: "Protokol bulunamadı" },
        { status: 404 },
      );
    }

    // Calculate progress from records
    const completedRecords = animalProtocol.records.filter(
      (r) => r.completedDate,
    ).length;
    const totalRecords = animalProtocol.records.length;
    const progress =
      totalRecords > 0
        ? Math.round((completedRecords / totalRecords) * 100)
        : 0;

    // Transform records to steps format expected by frontend
    // Frontend expects 'steps' at root level, not 'protocol.steps'
    // NOTE: ProtocolRecord doesn't have dayOffset, so we calculate it from startDate
    const steps = animalProtocol.records.map((record) => {
      // Calculate dayOffset from protocol startDate to scheduled date
      const startDate = new Date(animalProtocol.startDate);
      const scheduledDate = new Date(record.scheduledDate);
      const diffTime = scheduledDate.getTime() - startDate.getTime();
      const dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: record.id,
        name: record.stepName,
        description: record.notes,
        dayOffset,
        scheduledDate: record.scheduledDate.toISOString(),
        completedAt: record.completedDate?.toISOString() || null,
        notes: record.notes,
      };
    });

    // Build response matching frontend Protocol interface
    // Type assertion ensures compile-time type safety
    const response: ProtocolResponse = {
      id: animalProtocol.id,
      name: animalProtocol.protocol?.name || "Protokol",
      type: animalProtocol.protocol?.type || "OTHER",
      status: animalProtocol.status,
      startDate: animalProtocol.startDate.toISOString(),
      notes: animalProtocol.notes,
      progress,
      completedSteps: completedRecords,
      totalSteps: totalRecords,
      animal: animalProtocol.animal,
      template: animalProtocol.protocol
        ? {
            id: animalProtocol.protocol.id,
            name: animalProtocol.protocol.name,
            type: animalProtocol.protocol.type,
          }
        : null,
      steps,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Protocol fetch error:", error);
    return NextResponse.json(
      { error: "Protokol getirilemedi" },
      { status: 500 },
    );
  }
}

// PUT update protocol
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

    const animalProtocol = await prisma.animalProtocol.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
      },
      include: {
        records: true,
      },
    });

    return NextResponse.json(animalProtocol);
  } catch (error) {
    console.error("Protocol update error:", error);
    return NextResponse.json(
      { error: "Protokol güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE protocol
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

    // Delete related records first
    const animalProtocol = await prisma.animalProtocol.findUnique({
      where: { id },
      include: { records: true },
    });

    if (animalProtocol) {
      // Delete all records
      await prisma.protocolRecord.deleteMany({
        where: { animalProtocolId: id },
      });
    }

    // Delete animal protocol
    await prisma.animalProtocol.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Protocol delete error:", error);
    return NextResponse.json({ error: "Protokol silinemedi" }, { status: 500 });
  }
}
