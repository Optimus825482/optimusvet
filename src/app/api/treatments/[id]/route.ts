import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateTreatmentSchema } from "@/lib/validations/treatment";
import { ZodError } from "zod";

// GET single treatment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const treatment = await prisma.treatment.findUnique({
      where: { id },
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
          },
        },
      },
    });

    if (!treatment) {
      return NextResponse.json(
        { error: "Tedavi kaydı bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(treatment);
  } catch (error) {
    console.error("Treatment fetch error:", error);
    return NextResponse.json(
      { error: "Tedavi kaydı getirilemedi" },
      { status: 500 },
    );
  }
}

// PATCH update treatment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    // Verify treatment exists
    const existingTreatment = await prisma.treatment.findUnique({
      where: { id },
    });

    if (!existingTreatment) {
      return NextResponse.json(
        { error: "Tedavi kaydı bulunamadı" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = updateTreatmentSchema.parse(body);

    // If product is being changed, verify it exists
    if (validatedData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: validatedData.productId },
        select: {
          id: true,
          name: true,
          stock: true,
          salePrice: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Seçilen ürün bulunamadı" },
          { status: 404 },
        );
      }
    }

    // Update treatment
    const treatment = await prisma.treatment.update({
      where: { id },
      data: {
        ...(validatedData.productId !== undefined && {
          productId: validatedData.productId,
        }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.dosage !== undefined && {
          dosage: validatedData.dosage,
        }),
        ...(validatedData.frequency !== undefined && {
          frequency: validatedData.frequency,
        }),
        ...(validatedData.duration !== undefined && {
          duration: validatedData.duration,
        }),
        ...(validatedData.startDate && {
          startDate: new Date(validatedData.startDate),
        }),
        ...(validatedData.endDate !== undefined && {
          endDate: validatedData.endDate
            ? new Date(validatedData.endDate)
            : null,
        }),
        ...(validatedData.applicationMethod !== undefined && {
          applicationMethod: validatedData.applicationMethod,
        }),
        ...(validatedData.notes !== undefined && {
          notes: validatedData.notes,
        }),
        ...(validatedData.cost !== undefined && {
          cost: validatedData.cost,
        }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.nextCheckupDate !== undefined && {
          nextCheckupDate: validatedData.nextCheckupDate
            ? new Date(validatedData.nextCheckupDate)
            : null,
        }),
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
              },
            },
          },
        },
      },
    });

    return NextResponse.json(treatment);
  } catch (error) {
    console.error("Treatment update error:", error);

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
      { error: "Tedavi kaydı güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE treatment
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

    // Verify treatment exists
    const existingTreatment = await prisma.treatment.findUnique({
      where: { id },
    });

    if (!existingTreatment) {
      return NextResponse.json(
        { error: "Tedavi kaydı bulunamadı" },
        { status: 404 },
      );
    }

    // Delete treatment
    await prisma.treatment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Tedavi kaydı silindi",
    });
  } catch (error) {
    console.error("Treatment delete error:", error);
    return NextResponse.json(
      { error: "Tedavi kaydı silinemedi" },
      { status: 500 },
    );
  }
}
