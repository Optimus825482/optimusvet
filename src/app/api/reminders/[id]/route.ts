import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET single reminder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const reminder = await prisma.reminder.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
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

    if (!reminder) {
      return NextResponse.json(
        { error: "Hatırlatma bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Reminder fetch error:", error);
    return NextResponse.json(
      { error: "Hatırlatma getirilemedi" },
      { status: 500 },
    );
  }
}

// PATCH update reminder (mark as completed, etc.)
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
    const body = await request.json();

    const updateData: any = {};

    if (body.isCompleted !== undefined) {
      updateData.isCompleted = body.isCompleted;
    }
    if (body.isRead !== undefined) {
      updateData.isRead = body.isRead;
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Reminder update error:", error);
    return NextResponse.json(
      { error: "Hatırlatma güncellenemedi" },
      { status: 500 },
    );
  }
}

// PUT update reminder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else if (body.status === "PENDING") {
        updateData.completedAt = null;
      }
    }

    const reminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Reminder update error:", error);
    return NextResponse.json(
      { error: "Hatırlatma güncellenemedi" },
      { status: 500 },
    );
  }
}

// DELETE reminder
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

    await prisma.reminder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reminder delete error:", error);
    return NextResponse.json(
      { error: "Hatırlatma silinemedi" },
      { status: 500 },
    );
  }
}
