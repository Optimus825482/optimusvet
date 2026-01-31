import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createTreatmentSchema } from "@/lib/validations/treatment";
import { ZodError } from "zod";

// GET all treatments for an illness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  try {
    const { illnessId } = await params;

    // Verify illness exists
    const illness = await prisma.illness.findUnique({
      where: { id: illnessId },
      select: { id: true },
    });

    if (!illness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build where clause
    const where: any = { illnessId };
    if (status) where.status = status;

    // Fetch treatments
    const treatments = await prisma.treatment.findMany({
      where,
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
              },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(treatments);
  } catch (error) {
    console.error("Treatments fetch error:", error);
    return NextResponse.json(
      { error: "Tedaviler getirilemedi" },
      { status: 500 },
    );
  }
}

// POST create new treatment
export async function POST(
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
    const illness = await prisma.illness.findUnique({
      where: { id: illnessId },
      select: { id: true, animalId: true },
    });

    if (!illness) {
      return NextResponse.json(
        { error: "Hastalık kaydı bulunamadı" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = createTreatmentSchema.parse({
      ...body,
      illnessId,
    });

    // Extract createReminders flag
    const createReminders = body.createReminders === true;

    // If product is selected, verify it exists and has stock
    if (validatedData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId },
        select: {
          id: true,
          name: true,
          stock: true,
          isService: true,
          salePrice: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Seçilen ürün bulunamadı" },
          { status: 404 },
        );
      }

      // If cost is not provided, use product sale price
      if (!validatedData.cost && product.salePrice) {
        validatedData.cost = Number(product.salePrice);
      }
    }

    // Create treatment
    const treatment = await prisma.treatment.create({
      data: {
        illnessId: validatedData.illnessId,
        productId: validatedData.productId,
        name: validatedData.name,
        dosage: validatedData.dosage,
        frequency: validatedData.frequency,
        duration: validatedData.duration,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        applicationMethod: validatedData.applicationMethod,
        notes: validatedData.notes,
        cost: validatedData.cost,
        status: validatedData.status,
        nextCheckupDate: validatedData.nextCheckupDate
          ? new Date(validatedData.nextCheckupDate)
          : null,
      },
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
        illness: {
          select: {
            id: true,
            name: true,
            animal: {
              select: {
                id: true,
                name: true,
                species: true,
                customerId: true,
              },
            },
          },
        },
      },
    });

    // Create reminders if requested
    if (createReminders) {
      const reminders = [];
      const animal = treatment.illness.animal;

      if (validatedData.startDate) {
        reminders.push({
          userId: session.user.id as string,
          customerId: animal.customerId,
          animalId: animal.id,
          type: "TREATMENT" as const,
          title: `Tedavi Başlangıcı: ${validatedData.name}`,
          description: `${animal.name} için ${validatedData.name} tedavisi başlıyor`,
          dueDate: new Date(validatedData.startDate),
          isCompleted: false,
        });
      }

      if (validatedData.endDate) {
        reminders.push({
          userId: session.user.id as string,
          customerId: animal.customerId,
          animalId: animal.id,
          type: "TREATMENT" as const,
          title: `Tedavi Bitişi: ${validatedData.name}`,
          description: `${animal.name} için ${validatedData.name} tedavisi bitiyor`,
          dueDate: new Date(validatedData.endDate),
          isCompleted: false,
        });
      }

      if (validatedData.nextCheckupDate) {
        reminders.push({
          userId: session.user.id as string,
          customerId: animal.customerId,
          animalId: animal.id,
          type: "CHECKUP" as const,
          title: `Kontrol Randevusu: ${validatedData.name}`,
          description: `${animal.name} için ${validatedData.name} tedavisi kontrol randevusu`,
          dueDate: new Date(validatedData.nextCheckupDate),
          isCompleted: false,
        });
      }

      if (reminders.length > 0) {
        await prisma.reminder.createMany({ data: reminders });
      }
    }

    return NextResponse.json(treatment, { status: 201 });
  } catch (error) {
    console.error("Treatment creation error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri",
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Tedavi kaydı oluşturulamadı" },
      { status: 500 },
    );
  }
}
