import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Bugün veya geçmiş tarihli, tamamlanmamış hatırlatmalar
    const reminders = await prisma.reminder.findMany({
      where: {
        isCompleted: false,
        dueDate: {
          lte: now,
        },
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
      orderBy: {
        dueDate: "asc",
      },
      take: 20, // Limit to 20 most urgent reminders
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("Active reminders fetch error:", error);
    return NextResponse.json(
      { error: "Hatırlatmalar yüklenemedi" },
      { status: 500 },
    );
  }
}
