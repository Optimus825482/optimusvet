# Deployment Rehberi — Kod + Şema + Veri Düzeltmeleri (Otomatik)

**Tarih:** 09.10.2026
**Kritik kural:** **Tüm veritabanı yedeği YÜKLENMEZ.** Deploy'da gerekli
şema ve veri düzeltmeleri **otomatik ve tek seferlik** uygulanır.

---

## Nasıl Çalışır? (Otomatik Deploy Migration)

Sistem, deploy edilirken şu üç parçayı uygular:

| # | Parça | Kim uygular | Ne zaman |
|---|---|---|---|
| 1 | **Uygulama kodu** | Coolify build + `npm start` | Deploy |
| 2 | **Yeni tablolar** (`reconciliation_runs`, `reconciliation_issues`) | `scripts/deploy-migrate.js` | Sunucu başlarken |
| 3 | **6 müşteri bakiye düzeltmesi** | `scripts/deploy-migrate.js` | Sunucu başlarken, **yalnızca bir kez** |

### Tek seferlik garanti

- Deploy edilen migration dosyaları `prisma/migrations/deploy/` altında:
  - `0001_reconciliation_tables.sql` (tablolar — `IF NOT EXISTS`, zararsız)
  - `0002_one_time_balance_fixes.sql` (6 bakiye düzeltmesi)
- Uygulanan her dosya **`app_migrations`** tablosuna yazılır.
- Bir sonraki deploy'da **atlanır** → aynı düzeltme tekrar çalışmaz.
- Bakiye düzeltmesi ayrıca **koşullu**: yalnızca eski değer hâlâ geçerliyse
  uygular. Kullanıcı değeri elle değiştirdiyse **dokunmaz** (yanlış ezme yok).

### Zincir

`package.json`:
```json
"start": "node scripts/deploy-migrate.js && next start -p 3002"
```
Dockerfile `scripts/` klasörünü imaja kopyalar (eklendi).

---

## Deploy Adımları

### 1. Kodu gönder / Coolify'da yeniden deploy et
Normal akış: git push → Coolify build → container yeniden başlar.
Başlangıçta `deploy-migrate.js` otomatik çalışır, tabloları kurar ve
6 bakiyeyi (bir kez) düzeltir.

### 2. (Opsiyonel) Logdan doğrula
Container loglarında şunu görmelisiniz:
```
[DEPLOY-MIGRATE] Uygulanıyor: 0001_reconciliation_tables.sql
[DEPLOY-MIGRATE] ✅ 0001_reconciliation_tables.sql
[DEPLOY-MIGRATE] Uygulanıyor: 0002_one_time_balance_fixes.sql
[DEPLOY-MIGRATE] ✅ 0002_one_time_balance_fixes.sql
[DEPLOY-MIGRATE] Bitti — 2 yeni migration uygulandı.
```
Bir sonraki restart'ta:
```
[DEPLOY-MIGRATE] Atlandı (zaten uygulanmış): 0001_reconciliation_tables.sql
[DEPLOY-MIGRATE] Atlandı (zaten uygulanmış): 0002_one_time_balance_fixes.sql
```

### 3. Doğrulama (tek komut)
```bash
docker exec -i q12oh057gvs5lt1h26q8qmbq psql -U postgres -d optimusvet -c \
  "SELECT code, balance FROM customers WHERE code IN
   ('MUS-192','MUS-1924','MUS-2389','MUS-2448','MUS-2545','MUS-2535') ORDER BY code;"
```
**Beklenen:**
| code | balance |
|---|---:|
| MUS-192 | 14100.00 |
| MUS-1924 | 500.00 |
| MUS-2389 | 8000.00 |
| MUS-2448 | 3500.00 |
| MUS-2535 | 0.00 |
| MUS-2545 | 4500.00 |

---

## Kontrol Anahtarları (ortam değişkenleri)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `DEPLOY_MIGRATIONS_ENABLED` | `true` | `false` → otomatik migration kapalı |
| `INTERNAL_AUDIT_ENABLED` | `false` | `true` → 6 saatlik iç denetim açık |
| `INTERNAL_AUDIT_INTERVAL_MINUTES` | `360` | Denetim aralığı (dakika) |

---

## ⚠️ Neden Tüm Yedeği Yüklememeliyiz?

| Sorun | Sonuç |
|---|---|
| Yedek **09.10.2026 00:43**'te alındı (en yeni veri 08.10 21:31) | Yedek düzeltmeleri **içermez**, bozuk bakiyeleri içerir |
| Production'da sonrasında yeni işlem yapılmış olabilir | Yedeği yüklersen **08.10 sonrası veri KAYBOLUR** |
| — | Doğrusu: sadece kod + `deploy-migrate` (şema + 6 satır) |

---

## Geri Alma

Düzeltmeler geri alınmak istenirse (audit kayıtlarından):
```sql
-- Örnek: MUS-192'yi eski değere döndür
UPDATE customers SET balance = 12100 WHERE code = 'MUS-192';
```
Değerler `audit_logs`'ta: `requestPath = '/deploy/migration-0002'`
(veya yerelde `/scripts/repair-customer-balances`).

---

## Test Edildi (09.10.2026)

Ayrı bir "production benzeri" test veritabanında uçtan uca doğrulandı:
- ✅ Tablolar oluştu, 6 bakiye doğru değere çekildi, 6 audit kaydı yazıldı
- ✅ İkinci çalıştırma atlandı, sahte kayıt üretmedi
- ✅ Elle değiştirilmiş değere dokunmadı (güvenli)
