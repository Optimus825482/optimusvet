import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler, ApiError } from "@/lib/api-route-handler";
import { auditUpdate, auditDelete } from "@/lib/audit";

// GET single illness
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
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
        throw new ApiError("Hastalık kaydı bulunamadı", 404);
      }

      return NextResponse.json(illness);
    },
    { component: "IllnessesAPI" },
  );
}

// PATCH update illness
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { illnessId } = await params;

      // ✅ AUDIT: Get OLD data before update
      const oldData = await prisma.illness.findUnique({
        where: { id: illnessId },
      });

      if (!oldData) {
        throw new ApiError("Hastalık kaydı bulunamadı", 404);
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

      // ✅ AUDIT: Log UPDATE with old and new data
      await auditUpdate(
        "illnesses",
        illnessId,
        oldData,
        illness,
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json(illness);
    },
    { component: "IllnessesAPI" },
  );
}

// DELETE illness
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ illnessId: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { illnessId } = await params;

      // ✅ AUDIT: Get OLD data before delete (with treatments for full record)
      const oldData = await prisma.illness.findUnique({
        where: { id: illnessId },
        include: {
          treatments: true,
        },
      });

      if (!oldData) {
        throw new ApiError("Hastalık kaydı bulunamadı", 404);
      }

      // Önce tedavileri sil (cascade delete olarak da ayarlanabilir)
      await prisma.treatment.deleteMany({
        where: { illnessId },
      });

      // Sonra hastalığı sil
      await prisma.illness.delete({
        where: { id: illnessId },
      });

      // ✅ AUDIT: Log DELETE with old data (includes treatments)
      await auditDelete(
        "illnesses",
        illnessId,
        oldData,
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json({
        success: true,
        message: "Hastalık kaydı ve ilişkili tedaviler silindi",
      });
    },
    { component: "IllnessesAPI" },
  );
}
