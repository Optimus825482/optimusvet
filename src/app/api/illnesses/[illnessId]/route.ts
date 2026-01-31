import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET single illness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  try {
    const { illnessId } = await params;

    const illness = await prisma.illness.findUnique({
      where: { id: illnessId },
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
        treatments: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                salePrice: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    if (!illness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(illness);
  } catch (error) {
    console.error("Illness fetch error:", error);
    return NextResponse.json(
      { error: "Hastalık kaydı getirilemedi" },
      { status: 500 },
    );
  }
}

// PATCH update illness
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { illnessId } = await params;

    // Verify illness exists
    const existingIllness = await prisma.illness.findUnique({
      where: { id: illnessId },
    });

    if (!existingIllness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Update illness
    const illness = await prisma.illness.update({
      where: { id: illnessId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.diagnosis !== undefined && { diagnosis: body.diagnosis }),
        ...(body.symptoms !== undefined && { symptoms: body.symptoms }),
        ...(body.findings !== undefined && { findings: body.findings }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && {
          endDate: body.endDate ? new Date(body.endDate) : null,
        }),
        ...(body.status && { status: body.status }),
        ...(body.severity && { severity: body.severity }),
        ...(body.attachments !== undefined && {
          attachments: body.attachments,
        }),
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
        treatments: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
                salePrice: true,
              },
            },
          },
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    return NextResponse.json(illness);
  } catch (error) {
    console.error("Illness update error:", error);
    return NextResponse.json(
      { error: "Hastalık kaydı güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE illness
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { illnessId } = await params;

    // Verify illness exists
    const existingIllness = await prisma.illness.findUnique({
      where: { id: illnessId },
      select: { id: true },
    });

    if (!existingIllness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    // Önce tedavileri sil (cascade delete olarak da ayarlanabilir)
    await prisma.treatment.deleteMany({
      where: { illnessId },
    });

    // Sonra hastalığı sil
    await prisma.illness.delete({
      where: { id: illnessId },
    });

    return NextResponse.json({
      success: true,
      message: "Hastalık kaydı ve ilişkili tedaviler silindi",
    });
  } catch (error) {
    console.error("Illness delete error:", error);
    return NextResponse.json(
      { error: "Hastalık kaydı silinemedi" },
      { status: 500 },
    );
  }
}
