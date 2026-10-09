/**
 * YEDEK ALMA API
 *
 * GET /api/backup                     → JSON yedek indir (iş verisi)
 * GET /api/backup?logs=true           → log tabloları dahil
 * GET /api/backup?preview=true        → indirmeden özet (JSON)
 *
 * Yetki: yalnızca ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createBackup } from "@/lib/backup";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Yetkisiz erişim", status: 401 } as const;
  if (session.user.role !== "ADMIN") {
    return { error: "Bu işlem için yönetici yetkisi gerekli", status: 403 } as const;
  }
  return { user: session.user } as const;
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const { searchParams } = new URL(request.url);
  const includeLogs = searchParams.get("logs") === "true";
  const preview = searchParams.get("preview") === "true";

  try {
    const backup = await createBackup({ includeLogs });

    if (preview) {
      return NextResponse.json({
        meta: backup.meta,
      });
    }

    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `optimusvet-yedek-${stamp}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[BACKUP] Yedek alma hatası:", error);
    return NextResponse.json(
      { error: "Yedek alınamadı", details: error?.message },
      { status: 500 },
    );
  }
}
