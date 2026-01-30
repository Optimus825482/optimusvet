import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reminders - List reminders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100"); // Calendar needs more records
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (status === "pending") {
      where.isCompleted = false;
      where.isSent = false;
    } else if (status === "sent") {
      where.isSent = true;
      where.isCompleted = false;
    } else if (status === "completed") {
      where.isCompleted = true;
    }

    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    } else if (upcoming) {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      where.dueDate = {
        gte: today,
        lte: nextWeek,
      };
      where.isCompleted = false;
    }

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
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
        },
      }),
      prisma.reminder.count({ where }),
    ]);

    return NextResponse.json({
      reminders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Reminders GET error:", error);
    return NextResponse.json(
      { error: "Hatırlatıcılar yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// POST /api/reminders - Create reminder
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, dueDate, animalId, customerId } = body;

    if (!type || !title || !dueDate) {
      return NextResponse.json(
        { error: "Tip, başlık ve tarih zorunludur" },
        { status: 400 },
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        type,
        title,
        description: message,
        userId: session.user.id as string,
        dueDate: new Date(dueDate),
        animalId,
        customerId,
      },
      include: {
        animal: {
          include: {
            customer: true,
          },
        },
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Reminder POST error:", error);
    return NextResponse.json(
      { error: "Hatırlatıcı eklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// PATCH /api/reminders - Mark reminder as completed/sent
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isCompleted, isSent, sentAt } = body;

    if (!id) {
      return NextResponse.json({ error: "ID zorunludur" }, { status: 400 });
    }

    const updateData: any = {};

    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
    }

    if (isSent !== undefined) {
      updateData.isSent = isSent;
      if (isSent) {
        updateData.sentAt = sentAt || new Date();
      }
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Reminder PATCH error:", error);
    return NextResponse.json(
      { error: "Hatırlatıcı güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}
