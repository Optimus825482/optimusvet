/**
 * RECORD HISTORY API
 *
 * GET /api/audit-logs/record/[table]/[id]
 * - Get audit history for a specific record
 * - Shows all changes made to the record
 * - Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
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

    const { table, id } = await params;

    // Fetch audit logs for this record
    const logs = await prisma.auditLog.findMany({
      where: {
        tableName: table,
        recordId: id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        tableName: table,
        recordId: id,
        totalChanges: logs.length,
      },
    });
  } catch (error) {
    console.error("[RECORD HISTORY API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Kayıt geçmişi alınırken hata oluştu",
        },
      },
      { status: 500 },
    );
  }
}
