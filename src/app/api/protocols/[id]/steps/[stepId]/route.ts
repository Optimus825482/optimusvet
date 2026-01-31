import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PUT update protocol step (mark as completed/pending)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id, stepId } = await params;
    const body = await request.json();
    const { completed, notes } = body;

    // Find the protocol record
    const record = await prisma.protocolRecord.findFirst({
      where: {
        id: stepId,
        animalProtocolId: id,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Protokol adımı bulunamadı" },
        { status: 404 },
      );
    }

    // Update the record
    const updatedRecord = await prisma.protocolRecord.update({
      where: { id: stepId },
      data: {
        status: completed ? "COMPLETED" : "PENDING",
        completedDate: completed ? new Date() : null,
        notes: notes !== undefined ? notes : record.notes,
      },
    });

    // Check if all steps are completed
    const allRecords = await prisma.protocolRecord.findMany({
      where: { animalProtocolId: id },
    });

    const allCompleted = allRecords.every((r) => r.status === "COMPLETED");

    // Update animal protocol status if all completed
    if (allCompleted) {
      await prisma.animalProtocol.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
    } else {
      // If not all completed, ensure status is ACTIVE
      await prisma.animalProtocol.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Protocol step update error:", error);
    return NextResponse.json({ error: "Adım güncellenemedi" }, { status: 500 });
  }
}

// DELETE protocol step
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { stepId } = await params;

    await prisma.protocolRecord.delete({
      where: { id: stepId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Protocol step delete error:", error);
    return NextResponse.json({ error: "Adım silinemedi" }, { status: 500 });
  }
}
