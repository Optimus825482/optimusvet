import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { withApiHandler, ApiError } from "@/lib/api-route-handler";
import { auditUpdate, auditDelete } from "@/lib/audit";

// GET - Tek müşteri
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          animals: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
          },
          transactions: {
            orderBy: { date: "desc" },
            include: {
              items: {
                include: { product: true },
              },
            },
          },
        },
      });

      if (!customer) {
        throw new ApiError("Müşteri bulunamadı", 404);
      }

      return NextResponse.json(customer);
    },
    { component: "CustomersAPI" },
  );
}

// PUT - Müşteri güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;
      const body = await request.json();
      const validatedData = customerSchema.parse(body);

      // ✅ AUDIT: Get OLD data before update
      const oldData = await prisma.customer.findUnique({
        where: { id },
      });

      if (!oldData) {
        throw new ApiError("Müşteri bulunamadı", 404);
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...validatedData,
          email: validatedData.email || null,
        },
      });

      // ✅ AUDIT: Log UPDATE with old and new data
      await auditUpdate(
        "customers",
        id,
        oldData,
        customer,
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json(customer);
    },
    { component: "CustomersAPI" },
  );
}

// PATCH - Müşteri resmi güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;
      const body = await request.json();
      const { image } = body;

      // image null olabilir (resim kaldırma için) veya string olmalı
      if (image !== null && typeof image !== "string") {
        throw new ApiError("Geçersiz resim verisi", 400);
      }

      // ✅ AUDIT: Get OLD data before update
      const oldData = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, image: true },
      });

      if (!oldData) {
        throw new ApiError("Müşteri bulunamadı", 404);
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: { image },
      });

      // ✅ AUDIT: Log image update
      await auditUpdate(
        "customers",
        id,
        oldData,
        { id, image },
        ctx.auditContext,
      ).catch(console.error);

      return NextResponse.json(customer);
    },
    { component: "CustomersAPI" },
  );
}

// DELETE - Müşteri sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiHandler(
    request,
    async (ctx) => {
      const { id } = await params;

      // ✅ AUDIT: Get OLD data before delete
      const oldData = await prisma.customer.findUnique({
        where: { id },
      });

      if (!oldData) {
        throw new ApiError("Müşteri bulunamadı", 404);
      }

      await prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });

      // ✅ AUDIT: Log DELETE with old data (soft delete, so we capture the full record)
      await auditDelete("customers", id, oldData, ctx.auditContext).catch(
        console.error,
      );

      return NextResponse.json({ message: "Müşteri silindi" });
    },
    { component: "CustomersAPI" },
  );
}
