/**
 * AUDIT LOGS STATISTICS API
 *
 * GET /api/audit-logs/stats
 * - Get audit log statistics
 * - Action breakdown
 * - Table breakdown
 * - User activity summary
 * - Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Auth check - Admin only
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Admin yetkisi gerekli" },
        },
        { status: 403 },
      );
    }

    // Query parameters
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;

    // Build where clause
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Get statistics
    const [totalLogs, actionBreakdown, tableBreakdown, topUsers] =
      await Promise.all([
        // Total logs
        prisma.auditLog.count({ where }),

        // Action breakdown
        prisma.auditLog.groupBy({
          by: ["action"],
          where,
          _count: { action: true },
        }),

        // Table breakdown
        prisma.auditLog.groupBy({
          by: ["tableName"],
          where,
          _count: { tableName: true },
          orderBy: { _count: { tableName: "desc" } },
          take: 10,
        }),

        // Top users
        prisma.auditLog.groupBy({
          by: ["userId", "userEmail", "userName"],
          where: { ...where, userId: { not: null } },
          _count: { userId: true },
          orderBy: { _count: { userId: "desc" } },
          take: 10,
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalLogs,
        actionBreakdown: actionBreakdown.map((item) => ({
          action: item.action,
          count: item._count.action,
        })),
        tableBreakdown: tableBreakdown.map((item) => ({
          tableName: item.tableName,
          count: item._count.tableName,
        })),
        topUsers: topUsers.map((item) => ({
          userId: item.userId,
          userEmail: item.userEmail,
          userName: item.userName,
          activityCount: item._count.userId,
        })),
      },
    });
  } catch (error) {
    console.error("[AUDIT STATS API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Audit istatistikleri alınırken hata oluştu",
        },
      },
      { status: 500 },
    );
  }
}
