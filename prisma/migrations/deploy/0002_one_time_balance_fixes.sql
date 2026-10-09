-- =====================================================================
-- DEPLOY MİGRASYONU 0002: Tek Seferlik Bakiye Düzeltmeleri
--
-- Tarih: 09.10.2026
-- Amaç: İşlem-bakiye tutarsızlığı tespit edilen 6 müşterinin bakiyesini
--       doğru değere çeker.
--
-- GÜVENLİK / DOĞRULUK:
--   • Her düzeltme tek ifadede (CTE) yapılır: UPDATE yalnızca ESKİ DEĞER
--     hâlâ geçerliyse satırı günceller; audit kaydı YALNIZCA gerçekten
--     güncellenen satır için yazılır (RETURNING ile).
--   • Böylece migration idempotenttir; tekrar çalışsa hiçbir şey yapmaz,
--     sahte audit kaydı üretmez.
--
-- NOT: Migration runner tarafından YALNIZCA BİR KEZ çalıştırılır
--      (app_migrations tablosunda işaretlenir).
-- =====================================================================

BEGIN;

-- MUS-192 Recep AK : 12100 -> 14100
WITH upd AS (
  UPDATE customers SET balance = 14100
  WHERE code = 'MUS-192' AND balance = 12100
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus192-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 12100), jsonb_build_object('balance', 14100),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

-- MUS-1924 İsmail TURHAN : 1000 -> 500
WITH upd AS (
  UPDATE customers SET balance = 500
  WHERE code = 'MUS-1924' AND balance = 1000
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus1924-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 1000), jsonb_build_object('balance', 500),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

-- MUS-2389 Cengiz KARACA : 5000 -> 8000
WITH upd AS (
  UPDATE customers SET balance = 8000
  WHERE code = 'MUS-2389' AND balance = 5000
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus2389-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 5000), jsonb_build_object('balance', 8000),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

-- MUS-2448 Şevki BEKAR : 0 -> 3500
WITH upd AS (
  UPDATE customers SET balance = 3500
  WHERE code = 'MUS-2448' AND balance = 0
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus2448-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 0), jsonb_build_object('balance', 3500),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

-- MUS-2545 İSMAİL ARSLAN : 2000 -> 4500
WITH upd AS (
  UPDATE customers SET balance = 4500
  WHERE code = 'MUS-2545' AND balance = 2000
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus2545-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 2000), jsonb_build_object('balance', 4500),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

-- MUS-2535 Necati ÇETİNKAYA : 9700 -> 0  (tüm işlemleri silinmiş; kullanıcı kararı)
WITH upd AS (
  UPDATE customers SET balance = 0
  WHERE code = 'MUS-2535' AND balance = 9700
  RETURNING id
)
INSERT INTO audit_logs (id, action, "tableName", "recordId", "changedFields",
  "oldValues", "newValues", "userName", "userEmail", "requestPath", "requestMethod", "createdAt")
SELECT 'deploy-fix-mus2535-' || extract(epoch from now())::text, 'UPDATE', 'customers', id,
  ARRAY['balance'], jsonb_build_object('balance', 9700), jsonb_build_object('balance', 0),
  'SISTEM-BAKIYE-ONARIM', 'system@internal', '/deploy/migration-0002', 'DEPLOY', now()
FROM upd;

COMMIT;
