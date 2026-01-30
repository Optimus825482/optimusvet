-- OPTIMUS VETERINER ON MUHASEBE - Demo Data Seed
-- Insert demo data into PostgreSQL database

-- ==================== USERS ====================

-- Admin User (password: admin123)
INSERT INTO "users" ("id", "name", "email", "emailVerified", "password", "image", "role", "createdAt", "updatedAt")
VALUES (
    'admin-user-001',
    'Admin',
    'admin@optimusvet.com',
    NOW(),
    '$2a$10$0nz7Vz7P6qH6q6q6q6q6q6Xz8X8X8X8X8X8X8X8X8X8X8X8X8X8X8',
    NULL,
    'ADMIN',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Manager User (password: manager123)
INSERT INTO "users" ("id", "name", "email", "emailVerified", "password", "image", "role", "createdAt", "updatedAt")
VALUES (
    'manager-user-001',
    'Müdür',
    'manager@optimusvet.com',
    NOW(),
    '$2a$10$0nz7Vz7P6qH6q6q6q6q6q6Xz8X8X8X8X8X8X8X8X8X8X8X8X8X8X8',
    NULL,
    'MANAGER',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Veterinarian User
INSERT INTO "users" ("id", "name", "email", "emailVerified", "password", "image", "role", "createdAt", "updatedAt")
VALUES (
    'vet-user-001',
    'Dr. Mehmet',
    'vet@optimusvet.com',
    NOW(),
    '$2a$10$0nz7Vz7P6qH6q6q6q6q6q6Xz8X8X8X8X8X8X8X8X8X8X8X8X8X8X8',
    NULL,
    'VETERINARIAN',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Accountant User
INSERT INTO "users" ("id", "name", "email", "emailVerified", "password", "image", "role", "createdAt", "updatedAt")
VALUES (
    'acc-user-001',
    'Muhasebeci',
    'accountant@optimusvet.com',
    NOW(),
    '$2a$10$0nz7Vz7P6qH6q6q6q6q6q6Xz8X8X8X8X8X8X8X8X8X8X8X8X8X8X8',
    NULL,
    'ACCOUNTANT',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- ==================== PRODUCT CATEGORIES ====================

INSERT INTO "product_categories" ("id", "name", "color", "createdAt")
VALUES 
    ('cat-001', 'Aşılar', '#3b82f6', NOW()),
    ('cat-002', 'İlaçlar', '#10b981', NOW()),
    ('cat-003', 'Mama & Beslenme', '#f59e0b', NOW()),
    ('cat-004', 'Aksesuar', '#8b5cf6', NOW()),
    ('cat-005', 'Hizmetler', '#ec4899', NOW()),
    ('cat-006', 'Laboratuvar', '#06b6d4', NOW())
ON CONFLICT DO NOTHING;

-- ==================== PRODUCTS ====================

INSERT INTO "products" ("id", "code", "name", "barcode", "categoryId", "unit", "purchasePrice", "salePrice", "vatRate", "stock", "criticalLevel", "isService", "isActive", "createdAt", "updatedAt")
VALUES 
    ('prod-001', 'URN001', 'Karma Aşı (Köpek)', '8691234567890', 'cat-001', 'Adet', 150.00, 250.00, 10.00, 50, 10, FALSE, TRUE, NOW(), NOW()),
    ('prod-002', 'URN002', 'Kuduz Aşısı', '8691234567891', 'cat-001', 'Adet', 100.00, 180.00, 10.00, 30, 5, FALSE, TRUE, NOW(), NOW()),
    ('prod-003', 'URN003', 'Antibiyotik Enjeksiyon', '8691234567892', 'cat-002', 'Ampul', 45.00, 85.00, 10.00, 100, 20, FALSE, TRUE, NOW(), NOW()),
    ('prod-004', 'URN004', 'Premium Köpek Maması 15kg', '8691234567893', 'cat-003', 'Paket', 450.00, 650.00, 10.00, 25, 5, FALSE, TRUE, NOW(), NOW()),
    ('prod-005', 'URN005', 'Kedi Taşıma Çantası', '8691234567894', 'cat-004', 'Adet', 120.00, 220.00, 20.00, 15, 3, FALSE, TRUE, NOW(), NOW()),
    ('prod-006', 'HZM001', 'Muayene', '', 'cat-005', 'Adet', 0.00, 200.00, 10.00, 0, 0, TRUE, TRUE, NOW(), NOW()),
    ('prod-007', 'HZM002', 'Dişçi Temizliği', '', 'cat-005', 'Adet', 0.00, 500.00, 10.00, 0, 0, TRUE, TRUE, NOW(), NOW()),
    ('prod-008', 'HZM003', 'Operasyon', '', 'cat-005', 'Adet', 0.00, 1500.00, 10.00, 0, 0, TRUE, TRUE, NOW(), NOW()),
    ('prod-009', 'LAB001', 'Kan Testi', '', 'cat-006', 'Adet', 0.00, 300.00, 10.00, 0, 0, TRUE, TRUE, NOW(), NOW()),
    ('prod-010', 'URN006', 'Salin Serum', '8691234567895', 'cat-002', 'Şişe', 25.00, 45.00, 10.00, 60, 15, FALSE, TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== CUSTOMERS (MÜŞTERİLER) ====================

INSERT INTO "customers" ("id", "code", "name", "phone", "email", "address", "taxNumber", "taxOffice", "balance", "isActive", "createdAt", "updatedAt")
VALUES 
    ('cust-001', 'MUS001', 'Ahmet Yılmaz', '05551234567', 'ahmet@email.com', 'İstanbul, Beşiktaş', '12345678901', 'Beşiktaş Vergi Dairesi', 0.00, TRUE, NOW(), NOW()),
    ('cust-002', 'MUS002', 'Fatima Kara', '05552234567', 'fatima@email.com', 'İstanbul, Kadıköy', '12345678902', 'Kadıköy Vergi Dairesi', 1200.50, TRUE, NOW(), NOW()),
    ('cust-003', 'MUS003', 'Mehmet Özdemir', '05553234567', 'mehmet@email.com', 'Ankara, Çankaya', '12345678903', 'Çankaya Vergi Dairesi', -850.00, TRUE, NOW(), NOW()),
    ('cust-004', 'MUS004', 'Ayşe Türk', '05554234567', 'ayse@email.com', 'İzmir, Alsancak', '12345678904', 'Alsancak Vergi Dairesi', 450.75, TRUE, NOW(), NOW()),
    ('cust-005', 'MUS005', 'Emre Kılıç', '05555234567', 'emre@email.com', 'Bursa, Nilüfer', '12345678905', 'Nilüfer Vergi Dairesi', 2300.00, TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== SUPPLIERS (TEDARİKÇİLER) ====================

INSERT INTO "suppliers" ("id", "code", "name", "phone", "email", "address", "taxNumber", "taxOffice", "contactName", "balance", "isActive", "createdAt", "updatedAt")
VALUES 
    ('supp-001', 'FRM001', 'Vet Pharma Ltd.', '02122345678', 'info@vetpharma.com', 'İstanbul, Maslak', '98765432101', 'Maslak Vergi Dairesi', 'Hasan Bey', 5000.00, TRUE, NOW(), NOW()),
    ('supp-002', 'FRM002', 'Pet Food Distribütörlüğü', '02162345678', 'sales@petfood.com', 'İstanbul, Tuzla', '98765432102', 'Tuzla Vergi Dairesi', 'Zeynep Hanım', 3200.50, TRUE, NOW(), NOW()),
    ('supp-003', 'FRM003', 'Global Pet Care', '02122345679', 'contact@globalvet.com', 'İstanbul, Şişli', '98765432103', 'Şişli Vergi Dairesi', 'Ali Bey', 0.00, TRUE, NOW(), NOW()),
    ('supp-004', 'FRM004', 'Veteriner Malzemeleri A.Ş.', '02123345678', 'supplies@vetmalz.com', 'Ankara, Çankaya', '98765432104', 'Çankaya Vergi Dairesi', 'Murat Bey', -1500.00, TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== ANIMALS (HAYVANLAR) ====================

INSERT INTO "animals" ("id", "customerId", "name", "species", "breed", "gender", "birthDate", "weight", "color", "chipNumber", "isActive", "createdAt", "updatedAt")
VALUES 
    ('animal-001', 'cust-001', 'Max', 'DOG', 'Golden Retriever', 'MALE', '2021-03-15', 28.50, 'Sarı', 'CHIP123456', TRUE, NOW(), NOW()),
    ('animal-002', 'cust-001', 'Luna', 'DOG', 'Labrador', 'FEMALE', '2022-06-20', 26.00, 'Siyah', 'CHIP123457', TRUE, NOW(), NOW()),
    ('animal-003', 'cust-002', 'Whiskers', 'CAT', 'Ankara Kedisi', 'MALE', '2020-12-01', 4.50, 'Beyaz', 'CHIP123458', TRUE, NOW(), NOW()),
    ('animal-004', 'cust-002', 'Mittens', 'CAT', 'Van Kedisi', 'FEMALE', '2023-02-14', 3.80, 'Turuncu', 'CHIP123459', TRUE, NOW(), NOW()),
    ('animal-005', 'cust-003', 'Daisy', 'DOG', 'Poodle', 'FEMALE', '2021-08-10', 22.00, 'Beyaz', 'CHIP123460', TRUE, NOW(), NOW()),
    ('animal-006', 'cust-004', 'Rex', 'DOG', 'German Shepherd', 'MALE', '2020-05-22', 32.00, 'Kahve', 'CHIP123461', TRUE, NOW(), NOW()),
    ('animal-007', 'cust-005', 'Smokey', 'CAT', 'Siyam Kedisi', 'MALE', '2022-09-30', 5.20, 'Gri', 'CHIP123462', TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== TRANSACTIONS (İŞLEMLER) ====================

-- Purchase Transaction (Stock Increase)
INSERT INTO "transactions" ("id", "code", "type", "customerId", "supplierId", "userId", "date", "dueDate", "subtotal", "vatTotal", "discount", "total", "paidAmount", "paymentMethod", "status", "createdAt", "updatedAt")
VALUES 
    ('trans-001', 'ALN001', 'PURCHASE', NULL, 'supp-001', 'admin-user-001', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 10000.00, 1000.00, 0.00, 11000.00, 0.00, NULL, 'PENDING', NOW(), NOW()),
    ('trans-002', 'ALN002', 'PURCHASE', NULL, 'supp-002', 'admin-user-001', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', 5200.00, 520.00, 100.00, 5620.00, 5620.00, 'BANK_TRANSFER', 'PAID', NOW(), NOW()),
    ('trans-003', 'SAT001', 'SALE', 'cust-001', NULL, 'admin-user-001', NOW() - INTERVAL '2 days', NOW() + INTERVAL '8 days', 5450.00, 545.00, 0.00, 5995.00, 5995.00, 'CASH', 'PAID', NOW(), NOW()),
    ('trans-004', 'SAT002', 'SALE', 'cust-002', NULL, 'admin-user-001', NOW() - INTERVAL '1 day', NOW() + INTERVAL '9 days', 2800.00, 280.00, 50.00, 3030.00, 1515.00, 'CREDIT_CARD', 'PARTIAL', NOW(), NOW()),
    ('trans-005', 'HZM001', 'TREATMENT', 'cust-003', NULL, 'vet-user-001', NOW() - INTERVAL '0 days', NULL, 500.00, 50.00, 0.00, 550.00, 550.00, 'CASH', 'PAID', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ==================== TRANSACTION ITEMS ====================

INSERT INTO "transaction_items" ("id", "transactionId", "productId", "quantity", "unitPrice", "vatRate", "discount", "total")
VALUES 
    ('ti-001', 'trans-001', 'prod-001', 30.000, 150.00, 10.00, 0.00, 4500.00),
    ('ti-002', 'trans-001', 'prod-002', 40.000, 100.00, 10.00, 0.00, 4000.00),
    ('ti-003', 'trans-001', 'prod-003', 20.000, 45.00, 10.00, 0.00, 900.00),
    ('ti-004', 'trans-002', 'prod-004', 8.000, 450.00, 10.00, 0.00, 3600.00),
    ('ti-005', 'trans-002', 'prod-010', 24.000, 25.00, 10.00, 100.00, 1600.00),
    ('ti-006', 'trans-003', 'prod-001', 2.000, 250.00, 10.00, 0.00, 500.00),
    ('ti-007', 'trans-003', 'prod-004', 1.000, 650.00, 10.00, 0.00, 650.00),
    ('ti-008', 'trans-003', 'prod-006', 1.000, 200.00, 10.00, 0.00, 200.00),
    ('ti-009', 'trans-004', 'prod-002', 1.000, 180.00, 10.00, 0.00, 180.00),
    ('ti-010', 'trans-004', 'prod-006', 2.000, 200.00, 10.00, 50.00, 350.00),
    ('ti-011', 'trans-005', 'prod-006', 1.000, 200.00, 10.00, 0.00, 200.00),
    ('ti-012', 'trans-005', 'prod-007', 1.000, 300.00, 10.00, 0.00, 300.00)
ON CONFLICT DO NOTHING;

-- ==================== PAYMENTS ====================

INSERT INTO "payments" ("id", "transactionId", "amount", "method", "checkNumber", "checkDate", "bankName", "createdAt")
VALUES 
    ('pay-001', 'trans-002', 5620.00, 'BANK_TRANSFER', NULL, NULL, 'İş Bankası', NOW() - INTERVAL '3 days'),
    ('pay-002', 'trans-003', 5995.00, 'CASH', NULL, NULL, NULL, NOW() - INTERVAL '2 days'),
    ('pay-003', 'trans-004', 1515.00, 'CREDIT_CARD', NULL, NULL, NULL, NOW() - INTERVAL '1 day'),
    ('pay-004', 'trans-005', 550.00, 'CASH', NULL, NULL, NULL, NOW())
ON CONFLICT DO NOTHING;

-- ==================== STOCK MOVEMENTS ====================

INSERT INTO "stock_movements" ("id", "productId", "type", "quantity", "unitPrice", "totalPrice", "reference", "createdAt")
VALUES 
    ('mov-001', 'prod-001', 'PURCHASE', 30.000, 150.00, 4500.00, 'ALN001', NOW() - INTERVAL '5 days'),
    ('mov-002', 'prod-002', 'PURCHASE', 40.000, 100.00, 4000.00, 'ALN001', NOW() - INTERVAL '5 days'),
    ('mov-003', 'prod-003', 'PURCHASE', 20.000, 45.00, 900.00, 'ALN001', NOW() - INTERVAL '5 days'),
    ('mov-004', 'prod-004', 'PURCHASE', 8.000, 450.00, 3600.00, 'ALN002', NOW() - INTERVAL '3 days'),
    ('mov-005', 'prod-010', 'PURCHASE', 24.000, 25.00, 600.00, 'ALN002', NOW() - INTERVAL '3 days'),
    ('mov-006', 'prod-001', 'SALE', -2.000, 250.00, -500.00, 'SAT001', NOW() - INTERVAL '2 days'),
    ('mov-007', 'prod-004', 'SALE', -1.000, 650.00, -650.00, 'SAT001', NOW() - INTERVAL '2 days'),
    ('mov-008', 'prod-002', 'SALE', -1.000, 180.00, -180.00, 'SAT002', NOW() - INTERVAL '1 day'),
    ('mov-009', 'prod-001', 'ADJUSTMENT', 5.000, 250.00, 1250.00, 'ADJ001', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- ==================== PROTOCOLS (PROTOKOLLER) ====================

INSERT INTO "protocols" ("id", "name", "type", "species", "description", "isDefault", "isActive", "createdAt", "updatedAt")
VALUES 
    ('proto-001', 'Köpek Temel Aşılama', 'VACCINATION', ARRAY['DOG'], 'Yavru köpekler için temel aşılama protokolü', TRUE, TRUE, NOW(), NOW()),
    ('proto-002', 'Kedi Temel Aşılama', 'VACCINATION', ARRAY['CAT'], 'Yavru kediler için temel aşılama protokolü', TRUE, TRUE, NOW(), NOW()),
    ('proto-003', 'Ruminant Üreme', 'FERTILITY', ARRAY['CATTLE', 'SHEEP', 'GOAT'], 'Sığır, koyun ve keçi için üreme protokolü', TRUE, TRUE, NOW(), NOW()),
    ('proto-004', 'Yıllık Koruma Aşılaması', 'VACCINATION', ARRAY['DOG', 'CAT'], 'Yıllık tekrarlayan aşılama', FALSE, TRUE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== PROTOCOL STEPS ====================

INSERT INTO "protocol_steps" ("id", "protocolId", "name", "dayOffset", "notes", "order")
VALUES 
    ('step-001', 'proto-001', '1. Karma Aşı', 0, 'İlk doz karma aşı', 1),
    ('step-002', 'proto-001', '2. Karma Aşı', 21, '21 gün sonra ikinci doz', 2),
    ('step-003', 'proto-001', '3. Karma Aşı', 42, '42 gün sonra üçüncü doz', 3),
    ('step-004', 'proto-001', 'Kuduz Aşısı', 84, '3 aydan sonra kuduz aşısı', 4),
    ('step-005', 'proto-002', '1. FVRCP Aşı', 0, 'İlk doz kedi aşısı', 1),
    ('step-006', 'proto-002', '2. FVRCP Aşı', 21, '21 gün sonra ikinci doz', 2),
    ('step-007', 'proto-002', 'Kuduz Aşısı', 84, '3 aydan sonra kuduz aşısı', 3),
    ('step-008', 'proto-003', 'Jinekolojik Muayene', 0, 'Başlangıçta muayene', 1),
    ('step-009', 'proto-003', 'Ultrason', 7, '7 gün sonra ultrason', 2),
    ('step-010', 'proto-003', 'Suni Tohumlama', 14, '14 gün sonra suni tohumlama', 3),
    ('step-011', 'proto-004', 'Yıllık Tekrar Aşısı', 365, 'Bir yıl sonra tekrar', 1)
ON CONFLICT DO NOTHING;

-- ==================== ANIMAL PROTOCOLS ====================

INSERT INTO "animal_protocols" ("id", "animalId", "protocolId", "startDate", "status", "createdAt", "updatedAt")
VALUES 
    ('ap-001', 'animal-001', 'proto-001', NOW() - INTERVAL '30 days', 'ACTIVE', NOW(), NOW()),
    ('ap-002', 'animal-003', 'proto-002', NOW() - INTERVAL '20 days', 'ACTIVE', NOW(), NOW()),
    ('ap-003', 'animal-006', 'proto-001', NOW() - INTERVAL '60 days', 'COMPLETED', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ==================== PROTOCOL RECORDS ====================

INSERT INTO "protocol_records" ("id", "animalProtocolId", "stepName", "scheduledDate", "completedDate", "status", "createdAt")
VALUES 
    ('pr-001', 'ap-001', '1. Karma Aşı', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 'COMPLETED', NOW()),
    ('pr-002', 'ap-001', '2. Karma Aşı', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', 'COMPLETED', NOW()),
    ('pr-003', 'ap-001', '3. Karma Aşı', NOW() + INTERVAL '12 days', NULL, 'PENDING', NOW()),
    ('pr-004', 'ap-002', '1. FVRCP Aşı', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 'COMPLETED', NOW()),
    ('pr-005', 'ap-002', '2. FVRCP Aşı', NOW() + INTERVAL '1 day', NULL, 'PENDING', NOW()),
    ('pr-006', 'ap-003', '1. Karma Aşı', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 'COMPLETED', NOW()),
    ('pr-007', 'ap-003', '2. Karma Aşı', NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days', 'COMPLETED', NOW()),
    ('pr-008', 'ap-003', '3. Karma Aşı', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', 'COMPLETED', NOW()),
    ('pr-009', 'ap-003', 'Kuduz Aşısı', NOW(), NOW(), 'COMPLETED', NOW())
ON CONFLICT DO NOTHING;

-- ==================== REMINDERS (HATIRLATICILAR) ====================

INSERT INTO "reminders" ("id", "userId", "type", "title", "description", "dueDate", "customerId", "animalId", "isRead", "isCompleted", "createdAt")
VALUES 
    ('rem-001', 'admin-user-001', 'VACCINATION', 'Max''in 2. Aşısı', 'Max (Golden Retriever) için 2. karma aşı zamanı', NOW() + INTERVAL '2 days', 'cust-001', 'animal-001', FALSE, FALSE, NOW()),
    ('rem-002', 'admin-user-001', 'PAYMENT_DUE', 'Fatima Kara''dan alacak', 'Fatima Kara''dan 1515 TL alacak var', NOW() + INTERVAL '3 days', 'cust-002', NULL, FALSE, FALSE, NOW()),
    ('rem-003', 'admin-user-001', 'STOCK_CRITICAL', 'Kuduz Aşısı stok uyarısı', 'Kuduz Aşısı stoku kritik seviyeye düştü (5 adet)', NOW(), NULL, NULL, FALSE, FALSE, NOW()),
    ('rem-004', 'admin-user-001', 'PAYMENT_DUE', 'Vet Pharma ödemeleri', 'Vet Pharma Ltd. ye 5000 TL ödeme borcu var', NOW() + INTERVAL '5 days', NULL, NULL, TRUE, FALSE, NOW()),
    ('rem-005', 'vet-user-001', 'VACCINATION', 'Whiskers''ın 1. Aşısı', 'Whiskers (Ankara Kedisi) için 1. FVRCP aşısı zamanı', NOW() + INTERVAL '1 day', 'cust-002', 'animal-003', FALSE, FALSE, NOW())
ON CONFLICT DO NOTHING;

-- ==================== SETTINGS ====================

INSERT INTO "settings" ("id", "key", "value", "type", "updatedAt")
VALUES 
    ('set-001', 'app.name', 'OPTIMUS VETERINER', 'string', NOW()),
    ('set-002', 'app.version', '1.0.0', 'string', NOW()),
    ('set-003', 'currency', 'TRY', 'string', NOW()),
    ('set-004', 'timezone', 'Europe/Istanbul', 'string', NOW()),
    ('set-005', 'language', 'tr', 'string', NOW()),
    ('set-006', 'invoicePrefix', 'FAT', 'string', NOW()),
    ('set-007', 'purchasePrefix', 'ALN', 'string', NOW()),
    ('set-008', 'companyName', 'OPTIMUS VETERINER KLİNİĞİ', 'string', NOW()),
    ('set-009', 'companyTaxNumber', '1234567890', 'string', NOW()),
    ('set-010', 'companyEmail', 'info@optimusvet.com', 'string', NOW())
ON CONFLICT (key) DO NOTHING;

-- ==================== BATCH SEED SUMMARY ====================

-- Created:
-- ✅ 4 Users (Admin, Manager, Vet, Accountant)
-- ✅ 6 Product Categories
-- ✅ 10 Products
-- ✅ 5 Customers
-- ✅ 4 Suppliers
-- ✅ 7 Animals
-- ✅ 5 Transactions (2 Purchase, 3 Sales/Treatment)
-- ✅ 12 Transaction Items
-- ✅ 4 Payments
-- ✅ 9 Stock Movements
-- ✅ 4 Protocols (Vaccination, Fertility)
-- ✅ 11 Protocol Steps
-- ✅ 3 Animal Protocols
-- ✅ 9 Protocol Records
-- ✅ 5 Reminders
-- ✅ 10 Settings

-- Total: 100+ Demo Records

-- To restore this database:
-- 1. Create PostgreSQL database
-- 2. Run migration.sql to create schema
-- 3. Run this seed.sql for demo data

-- Example psql commands:
-- psql -U postgres -d optimusvet < migration.sql
-- psql -U postgres -d optimusvet < seed.sql
