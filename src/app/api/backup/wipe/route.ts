/**
 * TÜM VERİYİ SİLME API
 *
 * POST /api/backup/wipe
 *   body: { confirm: "DELETE_ALL", keepUsers?: boolean, keepSettings?: boolean }
 *
 * Güvenlik:
 *  - Yalnızca ADMIN
 *  - confirm === "DELETE_ALL" zorunlu
 *  - Otomatik güvenlik yedeği alınır ve yanıtta döner (kullanıcı indirebilir)
 *  - Varsayılan: kullanıcılar ve ayarlar KORUNUR (sisteme giriş yapılabilsin)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { wipeAllData, createBackup, summarizeBackup } from "@/lib/backup";

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

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* boş gövde */
  }

  if (body?.confirm !== "DELETE_ALL") {
    return NextResponse.json(
      { error: 'Onay gerekli: "confirm": "DELETE_ALL" gönderilmeli' },
      { status: 400 },
    );
  }

  const keepUsers = body?.keepUsers !== false; // varsayılan true
  const keepSettings = body?.keepSettings !== false;

  try {
    // Silmeden önce güvenlik yedeği (loglar dahil)
    const safety = await createBackup({ includeLogs: true });

    const result = await wipeAllData({ keepUsers, keepSettings });

    return NextResponse.json({
      success: true,
      deletedRows: result.deletedRows,
      perTable: result.perTable,
      kept: {
        users: keepUsers,
        settings: keepSettings,
      },
      safetyBackupMeta: safety.meta,
      safetySummary: summarizeBackup(safety),
      safetyBackup: safety,
    });
  } catch (error: any) {
    console.error("[BACKUP] Veri silme hatası:", error);
    return NextResponse.json(
      { error: "Veri silme başarısız — değişiklik yapılmadı", details: error?.message },
      { status: 500 },
    );
  }
}
