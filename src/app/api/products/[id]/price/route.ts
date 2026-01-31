import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { priceUpdateSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = priceUpdateSchema.parse(body);

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id },
      select: { salePrice: true, name: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    const oldPrice = Number(product.salePrice);
    const newPrice = validatedData.newPrice;

    // Check if price actually changed
    if (oldPrice === newPrice) {
      return NextResponse.json(
        { error: "Yeni fiyat mevcut fiyatla aynı" },
        { status: 400 },
      );
    }

    // Update price and create history record in a transaction
    const [updatedProduct, priceHistory] = await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { salePrice: newPrice },
        include: { category: true },
      }),
      prisma.priceHistory.create({
        data: {
          productId: id,
          oldPrice,
          newPrice,
          changeReason: validatedData.reason,
          changedBy: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({
      product: updatedProduct,
      priceHistory,
    });
  } catch (error: unknown) {
    console.error("Price update error:", error);

    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json(
        {
          error: "Geçersiz veri",
          details: (error as { errors: unknown }).errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Fiyat güncellenirken hata oluştu" },
      { status: 500 },
    );
  }
}
