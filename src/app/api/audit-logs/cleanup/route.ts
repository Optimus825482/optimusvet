/**
 * AUDIT LOGS CLEANUP API
 *
 * DELETE /api/audit-logs/cleanup
 * - Delete old audit logs (retention policy)
 * - Admin only
 * - Default: 365 days (1 year)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cleanupOldAuditLogs } from "@/lib/audit";

export async function DELETE(request: NextRequest) {
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
    const daysToKeep = parseInt(searchParams.get("daysToKeep") || "365");

    // Cleanup old logs
    const deletedCount = await cleanupOldAuditLogs(daysToKeep);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        daysToKeep,
        message: `${deletedCount} adet eski audit log silindi`,
      },
    });
  } catch (error) {
    console.error("[AUDIT CLEANUP API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Audit log temizliği sırasında hata oluştu",
        },
      },
      { status: 500 },
    );
  }
}
