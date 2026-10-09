/**
 * İÇ DENETİM BULGU YÖNETİMİ
 *
 * PATCH /api/internal-audit/issues/[id] → bulguyu çözüldü işaretle
 * GET   /api/internal-audit/issues/[id] → tek bulgu detayı
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveIssue } from "@/lib/internal-audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }
  const { id } = await params;
  const issue = await prisma.reconciliationIssue.findUnique({ where: { id } });
  if (!issue) {
    return NextResponse.json({ error: "Bulgu bulunamadı" }, { status: 404 });
  }
  return NextResponse.json(issue);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const { id } = await params;
  let note: string | undefined;
  try {
    const body = await request.json();
    note = body?.note;
  } catch {
    /* boş gövde */
  }

  const existing = await prisma.reconciliationIssue.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bulgu bulunamadı" }, { status: 404 });
  }

  const updated = await resolveIssue(
    id,
    session.user.email ?? session.user.id,
    note,
  );
  return NextResponse.json(updated);
}
