/**
 * AUDIT LOG DETAIL API
 *
 * GET /api/audit-logs/[id]
 * - Get single audit log detail
 * - Admin only
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;

    // Fetch audit log
    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Audit log bulunamadı" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("[AUDIT LOG DETAIL API ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Audit log detayı alınırken hata oluştu",
        },
      },
      { status: 500 },
    );
  }
}
