import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateIllnessSchema } from "@/lib/validations/illness";
import { ZodError } from "zod";

// GET single illness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illnessId: string }> },
) {
  try {
    const { id: animalId, illnessId } = await params;

    const illness = await prisma.illness.findFirst({
      where: {
        id: illnessId,
        animalId,
      },
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
          orderBy: { startDate: "desc" },
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
  { params }: { params: Promise<{ id: string; illnessId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: animalId, illnessId } = await params;

    // Verify illness exists and belongs to animal
    const existingIllness = await prisma.illness.findFirst({
      where: {
        id: illnessId,
        animalId,
      },
    });

    if (!existingIllness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = updateIllnessSchema.parse(body);

    // Update illness
    const illness = await prisma.illness.update({
      where: { id: illnessId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.diagnosis !== undefined && {
          diagnosis: validatedData.diagnosis,
        }),
        ...(validatedData.symptoms !== undefined && {
          symptoms: validatedData.symptoms,
        }),
        ...(validatedData.findings !== undefined && {
          findings: validatedData.findings,
        }),
        ...(validatedData.notes !== undefined && {
          notes: validatedData.notes,
        }),
        ...(validatedData.startDate && {
          startDate: new Date(validatedData.startDate),
        }),
        ...(validatedData.endDate !== undefined && {
          endDate: validatedData.endDate
            ? new Date(validatedData.endDate)
            : null,
        }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.severity && { severity: validatedData.severity }),
        ...(validatedData.attachments && {
          attachments: validatedData.attachments,
        }),
      },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
          },
        },
        treatments: {
          orderBy: { startDate: "desc" },
        },
      },
    });

    return NextResponse.json(illness);
  } catch (error) {
    console.error("Illness update error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Hastalık kaydı güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE illness
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; illnessId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: animalId, illnessId } = await params;

    // Verify illness exists and belongs to animal
    const existingIllness = await prisma.illness.findFirst({
      where: {
        id: illnessId,
        animalId,
      },
      include: {
        _count: {
          select: {
            treatments: true,
          },
        },
      },
    });

    if (!existingIllness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    // Delete illness (treatments will be cascade deleted)
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
