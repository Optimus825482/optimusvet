import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/reminders/[id]/dismiss - Dismiss/close a reminder
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

    // Verify reminder exists
    const existingReminder = await prisma.reminder.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Hatırlatma bulunamadı" },
        { status: 404 },
      );
    }

    // Mark reminder as completed (dismissed)
    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        isCompleted: true,
        isRead: true,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
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
    });

    return NextResponse.json({
      success: true,
      data: reminder,
      message: "Hatırlatma kapatıldı",
    });
  } catch (error) {
    console.error("Reminder dismiss error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Hatırlatma kapatılamadı",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
