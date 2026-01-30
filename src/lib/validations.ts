import { z } from "zod";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

// Customer Schemas
export const customerSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Geçerli bir e-posta giriniz")
    .optional()
    .or(z.literal("")),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  balance: z.coerce.number().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
});

// Supplier Schemas
export const supplierSchema = z.object({
  name: z.string().min(2, "Firma adı en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
  email: z
    .string()
    .email("Geçerli bir e-posta giriniz")
    .optional()
    .or(z.literal("")),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  contactName: z.string().optional(),
  notes: z.string().optional(),
});

// Product Schemas
export const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().default("Adet"),
  purchasePrice: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz"),
  salePrice: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz"),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  criticalLevel: z.coerce.number().min(0).default(0),
  expiryDate: z.date().optional().nullable(),
  lotNumber: z.string().optional(),
  description: z.string().optional(),
  isService: z.boolean().default(false),
});

// Animal Schemas
export const animalSchema = z.object({
  customerId: z.string().min(1, "Müşteri seçiniz"),
  name: z.string().min(1, "Hayvan adı giriniz"),
  species: z.enum([
    "DOG",
    "CAT",
    "CATTLE",
    "SHEEP",
    "GOAT",
    "HORSE",
    "BIRD",
    "RABBIT",
    "OTHER",
  ]),
  breed: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
  birthDate: z.date().optional().nullable(),
  weight: z.coerce.number().optional(),
  color: z.string().optional(),
  chipNumber: z.string().optional(),
  earTag: z.string().optional(),
  notes: z.string().optional(),
});

// Transaction Schemas
export const transactionItemSchema = z.object({
  productId: z.string().min(1, "Ürün seçiniz"),
  quantity: z.coerce.number().min(0.001, "Miktar giriniz"),
  unitPrice: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz"),
  vatRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).default(0),
});

export const transactionSchema = z.object({
  type: z.enum([
    "PURCHASE",
    "SALE",
    "TREATMENT",
    "CUSTOMER_PAYMENT",
    "SUPPLIER_PAYMENT",
    "REFUND",
  ]),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  animalId: z.string().optional(),
  date: z.date().default(() => new Date()),
  dueDate: z.date().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z
    .enum(["CASH", "CREDIT_CARD", "BANK_TRANSFER", "CHECK", "PROMISSORY"])
    .optional(),
  notes: z.string().optional(),
  items: z.array(transactionItemSchema).min(1, "En az bir kalem ekleyiniz"),
});

// Payment Schemas
export const paymentSchema = z.object({
  transactionId: z.string().min(1, "İşlem seçiniz"),
  amount: z.coerce.number().min(0.01, "Tutar giriniz"),
  method: z.enum([
    "CASH",
    "CREDIT_CARD",
    "BANK_TRANSFER",
    "CHECK",
    "PROMISSORY",
  ]),
  checkNumber: z.string().optional(),
  checkDate: z.date().optional().nullable(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

// Protocol Schemas
export const protocolStepSchema = z.object({
  name: z.string().min(1, "Adım adı giriniz"),
  dayOffset: z.coerce.number().min(0, "Gün değeri 0'dan küçük olamaz"),
  notes: z.string().optional(),
});

export const protocolSchema = z.object({
  name: z.string().min(2, "Protokol adı en az 2 karakter olmalıdır"),
  type: z.enum(["VACCINATION", "FERTILITY", "TREATMENT", "CHECKUP"]),
  species: z
    .array(
      z.enum([
        "DOG",
        "CAT",
        "CATTLE",
        "SHEEP",
        "GOAT",
        "HORSE",
        "BIRD",
        "RABBIT",
        "OTHER",
      ]),
    )
    .min(1, "En az bir tür seçiniz"),
  description: z.string().optional(),
  steps: z.array(protocolStepSchema).min(1, "En az bir adım ekleyiniz"),
});

// Reminder Schemas
export const reminderSchema = z.object({
  type: z.enum([
    "PAYMENT_DUE",
    "COLLECTION_DUE",
    "VACCINATION",
    "FERTILITY",
    "CHECK_MATURITY",
    "STOCK_CRITICAL",
    "CUSTOM",
  ]),
  title: z.string().min(2, "Başlık en az 2 karakter olmalıdır"),
  description: z.string().optional(),
  dueDate: z.date(),
  customerId: z.string().optional(),
  supplierId: z.string().optional(),
  animalId: z.string().optional(),
});

// Category Schemas
export const categorySchema = z.object({
  name: z.string().min(2, "Kategori adı en az 2 karakter olmalıdır"),
  color: z.string().optional(),
});

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type AnimalInput = z.infer<typeof animalSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionItemInput = z.infer<typeof transactionItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ProtocolInput = z.infer<typeof protocolSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
