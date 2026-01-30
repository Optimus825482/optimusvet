import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT complete/uncomplete a protocol record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const { id, stepId } = await params;
    const body = await request.json();

    // Update protocol record
    const record = await prisma.protocolRecord.update({
      where: { id: stepId },
      data: {
        notes: body.notes || null,
        completedDate: body.completed ? new Date() : null,
      },
    });

    // Check if all records are completed
    const animalProtocol = await prisma.animalProtocol.findUnique({
      where: { id },
      include: { records: true },
    });

    if (animalProtocol) {
      const allCompleted = animalProtocol.records.every(
        (r) => r.completedDate !== null,
      );
      const anyCompleted = animalProtocol.records.some(
        (r) => r.completedDate !== null,
      );

      let status: "ACTIVE" | "COMPLETED" | "CANCELLED" = "ACTIVE";
      if (allCompleted) {
        status = "COMPLETED";
      } else if (anyCompleted) {
        status = "ACTIVE";
      }

      await prisma.animalProtocol.update({
        where: { id },
        data: { status },
      });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Protocol record update error:", error);
    return NextResponse.json(
      { error: "Kayıt güncellenemedi" },
      { status: 500 },
    );
  }
}
