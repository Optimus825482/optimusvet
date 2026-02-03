import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { auth } from "@/lib/auth";
import { withAuditContext } from "@/lib/audit-api-helper";
import { auditUpdate, auditDelete } from "@/lib/audit";
import { getAuditContext } from "@/lib/prisma-audit-middleware";

// GET - Tek ürün
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json(
      { error: "Ürün yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}

// PUT - Ürün güncelle
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
      const validatedData = productSchema.parse(body);

      // ✅ Eski veriyi al
      const oldData = await prisma.product.findUnique({ where: { id } });

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...validatedData,
          expiryDate: validatedData.expiryDate || null,
        },
        include: {
          category: true,
        },
      });

      // ✅ Audit log
      if (oldData) {
        await auditUpdate(
          "products",
          id,
          oldData,
          product,
          getAuditContext(),
        ).catch(console.error);
      }

      return NextResponse.json(product);
    } catch (error: unknown) {
      console.error("Product PUT error:", error);

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Ürün güncellenirken hata oluştu" },
        { status: 500 },
      );
    }
  });
}

// DELETE - Ürün sil (soft delete)
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

      // ✅ Eski veriyi al
      const oldData = await prisma.product.findUnique({ where: { id } });

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      // ✅ Audit log
      if (oldData) {
        await auditDelete("products", id, oldData, getAuditContext()).catch(
          console.error,
        );
      }

      return NextResponse.json({ message: "Ürün silindi" });
    } catch (error: unknown) {
      console.error("Product DELETE error:", error);

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Ürün silinirken hata oluştu" },
        { status: 500 },
      );
    }
  });
}
