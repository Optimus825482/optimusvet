-- CreateEnum: UserRole
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'VETERINARIAN', 'ACCOUNTANT', 'USER');

-- CreateEnum: MovementType
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'WASTE');

-- CreateEnum: TransactionType
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'SALE', 'TREATMENT', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'REFUND');

-- CreateEnum: TransactionStatus
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum: PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'PROMISSORY');

-- CreateEnum: Species
CREATE TYPE "Species" AS ENUM ('DOG', 'CAT', 'CATTLE', 'SHEEP', 'GOAT', 'HORSE', 'BIRD', 'RABBIT', 'OTHER');

-- CreateEnum: Gender
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum: ProtocolType
CREATE TYPE "ProtocolType" AS ENUM ('VACCINATION', 'FERTILITY', 'TREATMENT', 'CHECKUP');

-- CreateEnum: ProtocolStatus
CREATE TYPE "ProtocolStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum: RecordStatus
CREATE TYPE "RecordStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum: ReminderType
CREATE TYPE "ReminderType" AS ENUM ('PAYMENT_DUE', 'COLLECTION_DUE', 'VACCINATION', 'FERTILITY', 'CHECK_MATURITY', 'STOCK_CRITICAL', 'CUSTOM');

-- ==================== AUTH ====================

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: accounts
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: verification_tokens
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- ==================== CARİ HESAPLAR ====================

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "image" TEXT,
    "notes" TEXT,
    "balance" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: suppliers
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "contactName" TEXT,
    "image" TEXT,
    "notes" TEXT,
    "balance" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- ==================== STOK ====================

-- CreateTable: product_categories
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: products
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Adet',
    "purchasePrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "salePrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "stock" NUMERIC(12,3) NOT NULL DEFAULT 0,
    "criticalLevel" NUMERIC(12,3) NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "lotNumber" TEXT,
    "image" TEXT,
    "description" TEXT,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stock_movements
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" NUMERIC(12,3) NOT NULL,
    "unitPrice" NUMERIC(12,2) NOT NULL,
    "totalPrice" NUMERIC(12,2) NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- ==================== İŞLEMLER ====================

-- CreateTable: transactions
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "animalId" TEXT,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotal" NUMERIC(12,2) NOT NULL,
    "vatTotal" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "discount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "total" NUMERIC(12,2) NOT NULL,
    "paidAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: transaction_items
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" NUMERIC(12,3) NOT NULL,
    "unitPrice" NUMERIC(12,2) NOT NULL,
    "vatRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
    "discount" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "total" NUMERIC(12,2) NOT NULL,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" NUMERIC(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "checkNumber" TEXT,
    "checkDate" TIMESTAMP(3),
    "bankName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- ==================== HAYVAN ====================

-- CreateTable: animals
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "breed" TEXT,
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "weight" NUMERIC(8,2),
    "color" TEXT,
    "chipNumber" TEXT,
    "earTag" TEXT,
    "image" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- ==================== PROTOKOL & AŞI ====================

-- CreateTable: protocols
CREATE TABLE "protocols" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProtocolType" NOT NULL,
    "species" "Species"[],
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable: protocol_steps
CREATE TABLE "protocol_steps" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: animal_protocols
CREATE TABLE "animal_protocols" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "ProtocolStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animal_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable: protocol_records
CREATE TABLE "protocol_records" (
    "id" TEXT NOT NULL,
    "animalProtocolId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protocol_records_pkey" PRIMARY KEY ("id")
);

-- ==================== HATIRLATICI ====================

-- CreateTable: reminders
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "animalId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- ==================== SİSTEM AYARLARI ====================

-- CreateTable: settings
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- ==================== INDEXES ====================

-- Unique Indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE UNIQUE INDEX "transactions_code_key" ON "transactions"("code");
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- Foreign Key Indexes (for performance)
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX "transactions_customerId_idx" ON "transactions"("customerId");
CREATE INDEX "transactions_supplierId_idx" ON "transactions"("supplierId");
CREATE INDEX "transactions_animalId_idx" ON "transactions"("animalId");
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");
CREATE INDEX "transaction_items_transactionId_idx" ON "transaction_items"("transactionId");
CREATE INDEX "transaction_items_productId_idx" ON "transaction_items"("productId");
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");
CREATE INDEX "animals_customerId_idx" ON "animals"("customerId");
CREATE INDEX "protocol_steps_protocolId_idx" ON "protocol_steps"("protocolId");
CREATE INDEX "animal_protocols_animalId_idx" ON "animal_protocols"("animalId");
CREATE INDEX "animal_protocols_protocolId_idx" ON "animal_protocols"("protocolId");
CREATE INDEX "protocol_records_animalProtocolId_idx" ON "protocol_records"("animalProtocolId");
CREATE INDEX "reminders_userId_idx" ON "reminders"("userId");
CREATE INDEX "reminders_customerId_idx" ON "reminders"("customerId");
CREATE INDEX "reminders_supplierId_idx" ON "reminders"("supplierId");
CREATE INDEX "reminders_animalId_idx" ON "reminders"("animalId");

-- Business Query Indexes
CREATE INDEX "customers_isActive_idx" ON "customers"("isActive");
CREATE INDEX "suppliers_isActive_idx" ON "suppliers"("isActive");
CREATE INDEX "products_isActive_idx" ON "products"("isActive");
CREATE INDEX "products_stock_idx" ON "products"("stock");
CREATE INDEX "transactions_date_idx" ON "transactions"("date");
CREATE INDEX "transactions_status_idx" ON "transactions"("status");
CREATE INDEX "animals_isActive_idx" ON "animals"("isActive");
CREATE INDEX "protocols_isActive_idx" ON "protocols"("isActive");
CREATE INDEX "reminders_isRead_idx" ON "reminders"("isRead");
CREATE INDEX "reminders_dueDate_idx" ON "reminders"("dueDate");

-- ==================== FOREIGN KEYS ====================

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "animals" ADD CONSTRAINT "animals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "protocol_steps" ADD CONSTRAINT "protocol_steps_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "animal_protocols" ADD CONSTRAINT "animal_protocols_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "animal_protocols" ADD CONSTRAINT "animal_protocols_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "protocol_records" ADD CONSTRAINT "protocol_records_animalProtocolId_fkey" FOREIGN KEY ("animalProtocolId") REFERENCES "animal_protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
