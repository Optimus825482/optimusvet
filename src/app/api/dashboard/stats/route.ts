import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { trackError } from "@/lib/error-tracking";
import { auth } from "@/lib/auth";
import {
  setAuditContext,
  clearAuditContext,
} from "@/lib/prisma-audit-middleware";

export async function GET() {
  try {
    // ✅ AUDIT CONTEXT SET ET
    const session = await auth();
    if (session?.user) {
      setAuditContext({
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        ipAddress: "unknown",
        userAgent: "unknown",
        requestPath: "/api/dashboard/stats",
        requestMethod: "GET",
      });
    }
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1. Today's Sales
    const todaySales = await prisma.transaction.aggregate({
      where: {
        type: "SALE",
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _sum: {
        total: true,
      },
    });

    // 2. Monthly Income
    const monthlyIncome = await prisma.transaction.aggregate({
      where: {
        type: "SALE",
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        total: true,
      },
    });

    // 3. Pending Payments (Customer Balances) - BİZİM ALACAKLARIMIZ (balance > 0)
    const customersWithDebt = await prisma.customer.aggregate({
      where: {
        balance: {
          gt: 0, // Pozitif bakiye = Biz müşteriden alacaklıyız
        },
      },
      _sum: {
        balance: true,
      },
    });

    // 4. Total Customers Count
    const totalCustomers = await prisma.customer.count({
      where: {
        isActive: true,
      },
    });

    // 5. Total Animals Count
    const totalAnimals = await prisma.animal.count();

    // 6. Critical Stock Count
    // In Prisma, we can't easily compare two columns in a single where clause without raw SQL or a specific version
    // So we use a raw query or findMany and filter
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        criticalLevel: true,
      },
    });
    const criticalStockCount = products.filter(
      (p) => Number(p.stock) <= Number(p.criticalLevel),
    ).length;

    // 7. Today's Reminders (Appointments)
    const todayReminders = await prisma.reminder.findMany({
      where: {
        dueDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        customer: true,
        animal: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 5,
    });

    // 8. Upcoming Vaccines
    const upcomingVaccines = await prisma.reminder.findMany({
      where: {
        type: "VACCINATION",
        dueDate: {
          gt: now,
        },
        isCompleted: false,
      },
      include: {
        customer: true,
        animal: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 5,
    });

    // 9. Large Debts (Pending Payments List) - BİZİM ALACAKLARIMIZ (balance > 0)
    const largeDebts = await prisma.customer.findMany({
      where: {
        balance: {
          gt: 0, // Pozitif bakiye = Biz müşteriden alacaklıyız
        },
      },
      orderBy: {
        balance: "desc", // En yüksek alacak önce
      },
      take: 5,
    });

    // 10. Low Stock Items
    const lowStockItems = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        stock: "asc",
      },
      take: 5,
    });
    const filteredLowStock = lowStockItems.filter(
      (p) => Number(p.stock) <= Number(p.criticalLevel),
    );

    return NextResponse.json({
      summary: {
        todaySales: Number(todaySales._sum.total || 0),
        totalCustomers: totalCustomers,
        totalAnimals: totalAnimals,
        pendingPayments: Number(customersWithDebt._sum.balance || 0), // Zaten pozitif, abs'e gerek yok
        criticalStock: criticalStockCount,
      },
      todayAppointments: todayReminders.map((r) => ({
        id: r.id,
        time: r.dueDate.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customer: r.customer?.name || "Bilinmiyor",
        animal: r.animal?.name || "Bilinmiyor",
        type: r.title,
      })),
      upcomingVaccines: upcomingVaccines.map((v) => ({
        id: v.id,
        animal: v.animal?.name || "Bilinmiyor",
        owner: v.customer?.name || "Bilinmiyor",
        vaccine: v.title,
        date: new Date(v.dueDate).toLocaleDateString("tr-TR"),
      })),
      pendingPaymentsList: largeDebts.map((c) => ({
        id: c.id,
        customer: c.name,
        amount: Number(c.balance), // Zaten pozitif, abs'e gerek yok
        dueDate: "Bakiye",
        overdue: true,
      })),
      lowStockItems: filteredLowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock),
        critical: Number(p.criticalLevel),
      })),
    });
  } catch (error) {
    // ✅ AUDIT CONTEXT TEMIZLE
    clearAuditContext();

    console.error("Dashboard stats error:", error);

    // Track error to database and send email
    await trackError({
      code: "DASHBOARD_STATS_ERROR",
      message:
        error instanceof Error ? error.message : "Dashboard stats failed",
      severity: "HIGH",
      component: "DashboardAPI",
      function: "GET /api/dashboard/stats",
      stack: error instanceof Error ? error.stack : undefined,
      requestPath: "/api/dashboard/stats",
      requestMethod: "GET",
      notifyAdmin: true,
    });

    return NextResponse.json(
      {
        error: "İstatistikler yüklenemedi",
        summary: {
          todaySales: 0,
          totalCustomers: 0,
          totalAnimals: 0,
          pendingPayments: 0,
          criticalStock: 0,
        },
        todayAppointments: [],
        upcomingVaccines: [],
        pendingPaymentsList: [],
        lowStockItems: [],
      },
      { status: 500 },
    );
  }
}
