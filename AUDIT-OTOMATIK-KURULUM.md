# Otomatik Audit Log Sistemi — Kurulum ve Deployment Notu

**Tarih:** 09.10.2026
**Amaç:** Uygulamada oluşturulan, güncellenen ve silinen TÜM kayıtlar için zaman
damgalı bir kayıt `audit_logs` tablosuna **mutlaka** yazılır.

---

## Ne değişti?

### 1. Otomatik audit katmanı (Prisma extension)
**Dosya:** `src/lib/prisma-audit-middleware.ts` (yeniden yazıldı)

- Eski sistem Prisma `$use` middleware kullanıyordu. Bu, `PrismaPg`
  (`@prisma/adapter-pg`) adapter ile **çalışmıyordu** — `src/lib/prisma.ts:29`
  satırında yorum satırına alınmış, yani **kapalıydı**.
- Yeni sistem `Prisma.$extends` (query extension) kullanır:
  - Adapter ile çalışır.
  - `$transaction(async (tx) => ...)` içindeki yazmaları da yakalar.
  - Tüm modelleri ve `create / createMany / update / updateMany / delete /
    deleteMany / upsert` operasyonlarını kapsar.
- Audit kaydı, extension uygulanmamış **temel client** ile yazılır →
  özyineleme (recursion) imkansız.
- `AuditLog` ve `ErrorLog` tabloları loglanmaz (log'un log'u olmaz).
- Hassas alanlar (`password`, `*token`) `[REDACTED]` olarak maskelenir.

### 2. Prisma client bağlantısı
**Dosya:** `src/lib/prisma.ts`
- `$extends(createAuditExtension())` ile otomatik audit aktif edildi.
- Hot-reload'da (dev) yazıcı referansı her modül yüklemesinde yeniden bağlanır.

### 3. Kullanıcı/IP bağlamı
**Dosya:** `src/lib/api-route-handler.ts`
- `withApiHandler` artık `setAuditContext(...)` çağırıyor. Böylece otomatik
  audit kayıtları doğru kullanıcı, e-posta, IP ve user-agent ile yazılır.
- Bağlam yoksa (ör. script/seed) kayıt yine yazılır, `userName="system"` olur.
  → "Mutlaka log" garantisi bozulmaz.

### 4. Çift kayıt önlendi
**Dosyalar:** `src/lib/audit.ts`, `src/lib/auth.ts`
- Extension aktifken eski manuel `auditCreate/auditUpdate/auditDelete`
  çağrıları **no-op** olur (çift kayıt oluşmaz). 22 çağrı yeri değişmeden
  güvenli hale geldi.
- Giriş (login) olayı veritabanı yazımı olmadığı için extension yakalayamaz;
  bunun için ayrı `auditLogin()` fonksiyonu eklendi ve `auth.ts` ona geçirildi.
  LOGIN kaydı `action=LOGIN`, `tableName=users` olarak yazılır.

---

## Doğrulama (yapıldı)

Gerçek `prisma` export'u üzerinden ve gerçek HTTP istekleriyle test edildi:

| Test | Sonuç |
|---|---|
| CREATE / UPDATE / DELETE yakalama | ✅ |
| UPDATE'te eski + yeni değer ve değişen alanlar | ✅ (`{name,phone}`) |
| DELETE'te silinen verinin saklanması | ✅ |
| `$transaction` içi yazımların yakalanması | ✅ |
| Çift kayıt olmaması | ✅ |
| Audit'in kendini loglamaması | ✅ |
| Bağlam yokken bile loglanması (`system`) | ✅ |
| Gerçek HTTP: POST/PUT/DELETE → audit (kullanıcı+IP+zaman) | ✅ |

Test scriptleri: `scripts/test-audit-extension.ts`,
`scripts/test-audit-wiring.ts`, `scripts/test-audit-atomicity.ts`
(çalıştırma: `npx tsx scripts/test-audit-extension.ts`)

---

## Bilinçli ödünleşim (önemli)

**Transaction rollback durumunda audit kaydı kalabilir.**

- Prisma'da query hook'ları, `$transaction` override edilmediği sürece tx
  içinde çalışır; ancak o zaman da audit, tx'in **dışında** (temel client ile)
  yazılır. Yani başarısız bir tx'te "girişim kaydı" kalabilir.
- Prisma'nın mevcut sürümünde hem "her yazım mutlaka loglanır" hem de "rollback
  audit'i de geri alır" aynı anda garanti edilemiyor (tx-scoped client hook
  closure'ından erişilemiyor).
- Gereksinim "MUTLAKA log" olduğu için **log kaybı olmayan** taraf seçildi.
  Rollback'te kalan kayıt, silinmemiş bir girişim izi olarak zaten değerlidir.
- İstenirse: bu kayıtları ayırt etmek için audit tablosuna bir `success`
  alanı eklenip tx sonucu ile işaretlenebilir (opsiyonel sonraki adım).

---

## Deployment

1. Sunucuda kodu güncelleyip yeniden deploy edin (Coolify → `optimus-vet`).
   Değişen dosyalar:
   - `src/lib/prisma-audit-middleware.ts`
   - `src/lib/prisma.ts`
   - `src/lib/api-route-handler.ts`
   - `src/lib/audit.ts`
   - `src/lib/auth.ts`
   - `src/lib/payment-allocation.ts` (tip uyumu)
2. Şema değişikliği **yok** — `prisma migrate` gerekmez.
3. Deploy sonrası doğrulama:
   - Panelden bir müşteri/hayvan/işlem oluşturun, güncelleyin.
   - **Audit Logları** menüsünden kaydın kullanıcı + IP + zaman ile
     listelendiğini kontrol edin.

### Kapsam notu
Bu değişiklikten sonra oluşan tüm kayıtlar otomatik loglanır. **Geçmiş**
kayıtlar (04.02.2026 audit başlangıcından önceki dönem ve bu tarihten sonra
extension kapalıyken yapılan işlem güncellemeleri) geriye dönük olarak
loglanamaz — o veriler zaten yoktu.
