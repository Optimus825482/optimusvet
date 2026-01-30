import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/reports/summary - Get dashboard summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get sales summary
    const salesSummary = await prisma.transaction.aggregate({
      where: {
        type: "SALE",
        status: { not: "CANCELLED" },
        createdAt: { gte: startDate },
      },
      _sum: {
        total: true,
        paidAmount: true,
        discount: true,
      },
      _count: true,
    });

    // Get purchases summary
    const purchasesSummary = await prisma.transaction.aggregate({
      where: {
        type: "PURCHASE",
        status: { not: "CANCELLED" },
        createdAt: { gte: startDate },
      },
      _sum: {
        total: true,
        paidAmount: true,
      },
      _count: true,
    });

    // Get payments by method
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        createdAt: { gte: startDate },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get customer counts
    const customerCounts = await prisma.customer.aggregate({
      _count: true,
    });

    const newCustomers = await prisma.customer.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Get animal counts
    const animalCounts = await prisma.animal.aggregate({
      _count: true,
    });

    const newAnimals = await prisma.animal.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Get low stock products
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isService: false,
        stock: { lte: prisma.product.fields.criticalLevel },
      },
      select: {
        id: true,
        code: true,
        name: true,
        stock: true,
        criticalLevel: true,
      },
      orderBy: { stock: "asc" },
      take: 10,
    });

    // Get upcoming reminders
    const upcomingReminders = await prisma.reminder.count({
      where: {
        isCompleted: false,
        dueDate: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get pending payments (customer balances)
    const pendingPayments = await prisma.customer.aggregate({
      where: {
        balance: { gt: 0 },
      },
      _sum: {
        balance: true,
      },
      _count: true,
    });

    // Get active protocols
    const activeProtocols = await prisma.animalProtocol.count({
      where: {
        status: "ACTIVE",
      },
    });

    // Top selling products
    const topProducts = await prisma.transactionItem.groupBy({
      by: ["productId"],
      where: {
        transaction: {
          type: "SALE",
          createdAt: { gte: startDate },
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    });

    // Daily sales for chart (last 7 days)
    const dailySales: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayTotal = await prisma.transaction.aggregate({
        where: {
          type: "SALE",
          status: { not: "CANCELLED" },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
        _sum: {
          total: true,
        },
      });

      dailySales.push({
        date: dayStart.toISOString().split("T")[0],
        total: Number(dayTotal._sum.total) || 0,
      });
    }

    return NextResponse.json({
      period,
      sales: {
        total: Number(salesSummary._sum.total) || 0,
        paid: Number(salesSummary._sum.paidAmount) || 0,
        discount: Number(salesSummary._sum.discount) || 0,
        count: salesSummary._count,
      },
      purchases: {
        total: Number(purchasesSummary._sum.total) || 0,
        paid: Number(purchasesSummary._sum.paidAmount) || 0,
        count: purchasesSummary._count,
      },
      paymentsByMethod,
      customers: {
        total: customerCounts._count,
        new: newCustomers,
      },
      animals: {
        total: animalCounts._count,
        new: newAnimals,
      },
      lowStockProducts,
      upcomingReminders,
      pendingPayments: {
        total: Number(pendingPayments._sum.balance) || 0,
        count: pendingPayments._count,
      },
      activeProtocols,
      topProducts,
      dailySales,
      profit:
        (Number(salesSummary._sum.total) || 0) -
        (Number(purchasesSummary._sum.total) || 0),
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Rapor yüklenirken hata oluştu" },
      { status: 500 },
    );
  }
}
