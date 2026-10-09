/**
 * YEDEK GERİ YÜKLEME API
 *
 * POST /api/backup/restore
 *   body: { backup: <yedek JSON>, mode: "replace" | "merge", confirm: "RESTORE" }
 *
 * Güvenlik:
 *  - Yalnızca ADMIN
 *  - confirm === "RESTORE" zorunlu (kazara tetiklenmesin)
 *  - mode "replace" ise mevcut veri silinir (önce otomatik güvenlik yedeği alınır)
 *
 * Dönen: geri yükleme özeti + alınan güvenlik yedeği (istemci indirebilir)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateBackupFile, restoreBackup, type BackupFile } from "@/lib/backup";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Yetkisiz erişim", status: 401 } as const;
  if (session.user.role !== "ADMIN") {
    return { error: "Bu işlem için yönetici yetkisi gerekli", status: 403 } as const;
  }
  return { user: session.user } as const;
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400 });
  }

  // Zorunlu onay anahtarı
  if (body?.confirm !== "RESTORE") {
    return NextResponse.json(
      { error: 'Onay gerekli: "confirm": "RESTORE" gönderilmeli' },
      { status: 400 },
    );
  }

  const file = body?.backup as BackupFile;
  const check = validateBackupFile(file);
  if (!check.ok) {
    return NextResponse.json(
      { error: `Geçersiz yedek dosyası: ${check.error}` },
      { status: 400 },
    );
  }

  const mode: "replace" | "merge" = body?.mode === "merge" ? "merge" : "replace";

  try {
    const result = await restoreBackup(file, mode === "replace");

    return NextResponse.json({
      success: true,
      mode,
      restoredTables: result.restoredTables,
      restoredRows: result.restoredRows,
      perTable: result.perTable,
      safetyBackupMeta: result.safetyBackup.meta,
      // İstemci isterse güvenlik yedeğini indirebilir
      safetyBackup: result.safetyBackup,
    });
  } catch (error: any) {
    console.error("[BACKUP] Geri yükleme hatası:", error);
    return NextResponse.json(
      { error: "Geri yükleme başarısız — değişiklik yapılmadı (transaction geri alındı)",
        details: error?.message },
      { status: 500 },
    );
  }
}
