import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Calculate date filter based on period
    let dateFilter = {};
    if (period === "30d") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = { createdAt: { gte: thirtyDaysAgo } };
    } else if (period === "90d") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      dateFilter = { createdAt: { gte: ninetyDaysAgo } };
    }

    // Fetch price history
    const history = await prisma.priceHistory.findMany({
      where: {
        productId: id,
        ...dateFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Calculate stats
    const prices = history.map((h) => Number(h.newPrice));
    const stats = {
      avgPrice:
        prices.length > 0
          ? prices.reduce((a, b) => a + b, 0) / prices.length
          : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      totalChanges: history.length,
    };

    return NextResponse.json({
      history,
      stats,
    });
  } catch (error) {
    console.error("Price history GET error:", error);
    return NextResponse.json(
      { error: "Fiyat geçmişi yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
