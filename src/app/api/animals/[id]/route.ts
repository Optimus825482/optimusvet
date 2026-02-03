import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withAuditContext } from "@/lib/audit-api-helper";
import { auditUpdate, auditDelete } from "@/lib/audit";
import { getAuditContext } from "@/lib/prisma-audit-middleware";

// GET single animal with customer and protocols
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const animal = await prisma.animal.findUnique({
      where: { id },
      include: {
        customer: true,
        protocols: {
          orderBy: { startDate: "desc" },
          include: {
            protocol: true,
            records: {
              orderBy: { scheduledDate: "asc" },
            },
          },
        },
      },
    });

    if (!animal) {
      return NextResponse.json({ error: "Hayvan bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(animal);
  } catch (error) {
    console.error("Animal fetch error:", error);
    return NextResponse.json({ error: "Hayvan getirilemedi" }, { status: 500 });
  }
}

// PUT update animal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuditContext(request, async () => {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
      }

      const { id } = await params;
      const body = await request.json();

      // ✅ Eski veriyi al
      const oldData = await prisma.animal.findUnique({ where: { id } });

      const animal = await prisma.animal.update({
        where: { id },
        data: {
          name: body.name,
          species: body.species,
          breed: body.breed || null,
          gender: body.gender,
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
          color: body.color || null,
          weight: body.weight || null,
          chipNumber: body.chipNumber || null,
          notes: body.notes || null,
        },
      });

      // ✅ Audit log
      if (oldData) {
        await auditUpdate(
          "animals",
          id,
          oldData,
          animal,
          getAuditContext(),
        ).catch((err) => {
          console.error("[AUDIT ERROR]", err);
        });
      }

      return NextResponse.json(animal);
    } catch (error) {
      console.error("Animal update error:", error);
      return NextResponse.json(
        { error: "Hayvan güncellenemedi" },
        { status: 500 },
      );
    }
  });
}

// DELETE animal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuditContext(request, async () => {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
      }

      const { id } = await params;

      // Check if animal has protocols
      const animal = await prisma.animal.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              protocols: true,
              transactions: true,
            },
          },
        },
      });

      if (!animal) {
        return NextResponse.json(
          { error: "Hayvan bulunamadı" },
          { status: 404 },
        );
      }

      // Delete related protocols and their records
      await prisma.protocolRecord.deleteMany({
        where: {
          animalProtocol: {
            animalId: id,
          },
        },
      });

      await prisma.animalProtocol.deleteMany({
        where: { animalId: id },
      });

      // Delete related reminders
      await prisma.reminder.deleteMany({
        where: { animalId: id },
      });

      await prisma.animal.delete({
        where: { id },
      });

      // ✅ Audit log
      await auditDelete("animals", id, animal, getAuditContext()).catch(
        (err) => {
          console.error("[AUDIT ERROR]", err);
        },
      );

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Animal delete error:", error);
      return NextResponse.json({ error: "Hayvan silinemedi" }, { status: 500 });
    }
  });
}
