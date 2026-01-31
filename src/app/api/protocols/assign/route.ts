import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/protocols/assign - Assign protocol to animal
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { animalId, protocolId, startDate, notes } = body;

    if (!animalId || !protocolId || !startDate) {
      return NextResponse.json(
        { error: "Hayvan, protokol ve başlangıç tarihi zorunludur" },
        { status: 400 },
      );
    }

    // Get protocol template with steps
    const protocol = await prisma.protocol.findUnique({
      where: { id: protocolId },
      include: {
        steps: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!protocol) {
      return NextResponse.json(
        { error: "Protokol bulunamadı" },
        { status: 404 },
      );
    }

    // Create animal protocol
    const animalProtocol = await prisma.animalProtocol.create({
      data: {
        animalId,
        protocolId,
        startDate: new Date(startDate),
        status: "ACTIVE",
        notes,
        records: {
          create: protocol.steps.map((step) => {
            const scheduledDate = new Date(startDate);
            scheduledDate.setDate(scheduledDate.getDate() + step.dayOffset);

            return {
              stepName: step.name,
              scheduledDate,
              status: "PENDING",
              notes: step.notes,
            };
          }),
        },
      },
      include: {
        protocol: true,
        records: true,
      },
    });

    return NextResponse.json(animalProtocol, { status: 201 });
  } catch (error) {
    console.error("Protocol assign error:", error);
    return NextResponse.json({ error: "Protokol atanamadı" }, { status: 500 });
  }
}
