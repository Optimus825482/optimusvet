/**
 * İÇ DENETİM API — Çalıştırma ve sonuçlar
 *
 * GET  /api/internal-audit  → son denetim çalışmaları ve açık bulgular
 * POST /api/internal-audit  → yeni denetim çalıştır (body: { trigger? })
 *
 * Yetki: yalnızca ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  runInternalAudit,
  getAuditRuns,
  getOpenIssues,
} from "@/lib/internal-audit";

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
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  const [runs, openIssues] = await Promise.all([
    getAuditRuns(limit),
    getOpenIssues(200),
  ]);

  return NextResponse.json({
    runs,
    openIssuesCount: openIssues.length,
    openIssues: openIssues.slice(0, 100),
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* boş gövde kabul */
  }

  const summary = await runInternalAudit({
    trigger: "API",
    includeInactive: Boolean(body?.includeInactive),
  });

  return NextResponse.json(summary, {
    status: summary.status === "COMPLETED" ? 200 : 500,
  });
}
