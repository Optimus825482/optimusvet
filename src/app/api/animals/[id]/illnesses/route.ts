import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createIllnessSchema } from "@/lib/validations/illness";
import { ZodError } from "zod";

// GET all illnesses for an animal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: animalId } = await params;

    // Verify animal exists
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true },
    });

    if (!animal) {
      return NextResponse.json({ error: "Hayvan bulunamadı" }, { status: 404 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    // Build where clause
    const where: any = { animalId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    // Fetch illnesses with treatments
    const illnesses = await prisma.illness.findMany({
      where,
      include: {
        treatments: {
          orderBy: { startDate: "desc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unit: true,
              },
            },
          },
        },
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(illnesses);
  } catch (error) {
    console.error("Illnesses fetch error:", error);
    return NextResponse.json(
      { error: "Hastalıklar getirilemedi" },
      { status: 500 },
    );
  }
}

// POST create new illness
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id: animalId } = await params;

    // Verify animal exists
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true },
    });

    if (!animal) {
      return NextResponse.json({ error: "Hayvan bulunamadı" }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = createIllnessSchema.parse({
      ...body,
      animalId,
    });

    // Create illness
    const illness = await prisma.illness.create({
      data: {
        animalId: validatedData.animalId,
        name: validatedData.name,
        diagnosis: validatedData.diagnosis,
        symptoms: validatedData.symptoms,
        findings: validatedData.findings,
        notes: validatedData.notes,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status,
        severity: validatedData.severity,
        attachments: validatedData.attachments,
      },
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
          },
        },
        treatments: true,
      },
    });

    return NextResponse.json(illness, { status: 201 });
  } catch (error) {
    console.error("Illness creation error:", error);

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
      { error: "Hastalık kaydı oluşturulamadı" },
      { status: 500 },
    );
  }
}
