import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { bulkPriceUpdateSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = bulkPriceUpdateSchema.parse(body);

    // Fetch products
    const products = await prisma.product.findMany({
      where: {
        id: { in: validatedData.productIds },
        isActive: true,
      },
      select: { id: true, name: true, salePrice: true },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Seçili ürünler bulunamadı" },
        { status: 404 },
      );
    }

    // Calculate new prices
    const updates = products.map((product) => {
      const oldPrice = Number(product.salePrice);
      let newPrice = oldPrice;

      switch (validatedData.updateType) {
        case "PERCENTAGE":
          // Percentage increase/decrease
          newPrice = oldPrice * (1 + validatedData.value / 100);
          break;
        case "FIXED":
          // Fixed amount increase/decrease
          newPrice = oldPrice + validatedData.value;
          break;
        case "SET_PRICE":
          // Set specific price
          newPrice = validatedData.value;
          break;
      }

      // Ensure price is not negative
      newPrice = Math.max(0, newPrice);
      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;

      return {
        productId: product.id,
        productName: product.name,
        oldPrice,
        newPrice,
        success: true,
      };
    });

    // Perform bulk update in transaction
    try {
      await prisma.$transaction(async (tx) => {
        // Update all products
        for (const update of updates) {
          await tx.product.update({
            where: { id: update.productId },
            data: { salePrice: update.newPrice },
          });

          // Create price history record
          await tx.priceHistory.create({
            data: {
              productId: update.productId,
              oldPrice: update.oldPrice,
              newPrice: update.newPrice,
              changeReason: validatedData.reason,
              changedBy: session.user.id,
            },
          });
        }
      });

      return NextResponse.json({
        updated: updates.length,
        failed: 0,
        results: updates,
      });
    } catch (txError) {
      console.error("Transaction error:", txError);
      return NextResponse.json(
        { error: "Toplu güncelleme sırasında hata oluştu" },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    console.error("Bulk price update error:", error);

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
      { error: "Toplu fiyat güncellemesi başarısız" },
      { status: 500 },
    );
  }
}
