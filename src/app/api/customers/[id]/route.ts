import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";

// GET - Tek müşteri
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        animals: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customer GET error:", error);
    return NextResponse.json(
      { error: "Müşteri yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// PUT - Müşteri güncelle
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
    const validatedData = customerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...validatedData,
        email: validatedData.email || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    console.error("Customer PUT error:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Müşteri güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// PATCH - Müşteri resmi güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { image } = body;

    // image null olabilir (resim kaldırma için) veya string olmalı
    if (image !== null && typeof image !== "string") {
      return NextResponse.json(
        { error: "Geçersiz resim verisi" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { image },
    });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    console.error("Customer PATCH error:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Resim güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// DELETE - Müşteri sil (soft delete)
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

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Müşteri silindi" });
  } catch (error: unknown) {
    console.error("Customer DELETE error:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Müşteri silinirken hata oluştu" },
      { status: 500 },
    );
  }
}
