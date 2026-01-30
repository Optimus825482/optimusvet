import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

    // Calculate progress
    const completedRecords = animalProtocol.records.filter(
      (r) => r.completedDate,
    ).length;
    const totalRecords = animalProtocol.records.length;
    const progress =
      totalRecords > 0
        ? Math.round((completedRecords / totalRecords) * 100)
        : 0;

    return NextResponse.json({
      ...animalProtocol,
      progress,
      completedRecords,
      totalRecords,
    });
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
