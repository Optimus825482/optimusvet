import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTreatmentSchema } from "@/lib/validations/treatment";
import { ZodError } from "zod";
import { withApiHandler, ApiError } from "@/lib/api-route-handler";
import { auditUpdate, auditDelete } from "@/lib/audit";

// GET single treatment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
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
        throw new ApiError("Tedavi kaydı bulunamadı", 404);
      }

      return NextResponse.json(treatment);
    },
    { component: "TreatmentsAPI" },
  );
}

// PATCH update treatment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;

      // ✅ AUDIT: Get OLD data before update
      const oldData = await prisma.treatment.findUnique({
        where: { id },
      });

      if (!oldData) {
        throw new ApiError("Tedavi kaydı bulunamadı", 404);
      }

      const body = await request.json();

      // Validate input
      let validatedData;
      try {
        validatedData = updateTreatmentSchema.parse(body);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ApiError(
            `Geçersiz veri: ${error.issues.map((i) => i.message).join(", ")}`,
            400,
            "VALIDATION_ERROR",
          );
        }
        throw error;
      }

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
          throw new ApiError("Seçilen ürün bulunamadı", 404);
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

      // ✅ AUDIT: Log UPDATE with old and new data
      await auditUpdate(
        "treatments",
        id,
        oldData,
        treatment,
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json(treatment);
    },
    { component: "TreatmentsAPI" },
  );
}

// DELETE treatment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;

      // ✅ AUDIT: Get OLD data before delete
      const oldData = await prisma.treatment.findUnique({
        where: { id },
      });

      if (!oldData) {
        throw new ApiError("Tedavi kaydı bulunamadı", 404);
      }

      // Delete treatment
      await prisma.treatment.delete({
        where: { id },
      });

      // ✅ AUDIT: Log DELETE with old data
      await auditDelete("treatments", id, oldData, ctx.auditContext).catch(
        console.error,
      );

      return NextResponse.json({
        success: true,
        message: "Tedavi kaydı silindi",
      });
    },
    { component: "TreatmentsAPI" },
  );
}
