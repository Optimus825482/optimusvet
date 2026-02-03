/**
 * Customer Contact Information Validators
 *
 * Provides validation schemas and utilities for customer contact fields:
 * - Phone number validation (Turkish formats)
 * - Email validation
 * - Address field validation
 * - Phone formatting and normalization
 */

import { z } from "zod";

// =====================================================
// PHONE NUMBER VALIDATION
// =====================================================

/**
 * Turkish phone number patterns
 * - Mobile: 05xxxxxxxxx (11 digits starting with 05)
 * - Landline: 0xxxyyyyyyy (11 digits starting with 0)
 * - International: +90xxxxxxxxxx (13 chars with +90 prefix)
 */
const PHONE_PATTERNS = {
  mobile: /^(05\d{9})$/, // 05xxxxxxxxx
  landline: /^(0\d{3}\d{7})$/, // 0xxxyyyyyyy
  international: /^\+90\d{10}$/, // +90xxxxxxxxxx
};

/**
 * Phone number validation schema
 * Accepts Turkish mobile, landline, and international formats
 * Automatically cleans spaces, dashes, and parentheses
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true; // Optional field
      const cleaned = val.replace(/[\s\-\(\)]/g, "");
      return (
        PHONE_PATTERNS.mobile.test(cleaned) ||
        PHONE_PATTERNS.landline.test(cleaned) ||
        PHONE_PATTERNS.international.test(cleaned)
      );
    },
    {
      message:
        "Geçerli bir telefon numarası giriniz (05xxxxxxxxx veya 0xxxyyyyyyy)",
    },
  );

// =====================================================
// CONTACT INFORMATION SCHEMA
// =====================================================

/**
 * Complete customer contact validation schema
 * Validates all contact-related fields with appropriate constraints
 */
export const customerContactSchema = z.object({
  phone: phoneSchema,
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Adres en fazla 500 karakter olabilir")
    .optional(),
  city: z.string().max(100, "Şehir en fazla 100 karakter olabilir").optional(),
  district: z
    .string()
    .max(100, "İlçe en fazla 100 karakter olabilir")
    .optional(),
  village: z.string().max(100, "Köy en fazla 100 karakter olabilir").optional(),
});

// =====================================================
// PHONE UTILITIES
// =====================================================

/**
 * Format phone number for display
 * Converts: 05551234567 → 0555 123 45 67
 *
 * @param phone - Raw phone number
 * @returns Formatted phone number for display
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Format mobile: 0xxx xxx xx xx
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }

  // Format international: +90 xxx xxx xx xx
  if (cleaned.length === 13 && cleaned.startsWith("+90")) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 11)} ${cleaned.slice(11)}`;
  }

  return phone;
}

/**
 * Normalize phone number for storage
 * Removes all formatting characters (spaces, dashes, parentheses)
 *
 * @param phone - Phone number with or without formatting
 * @returns Normalized phone number (digits only with country code)
 */
export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  return phone.replace(/[\s\-\(\)]/g, "");
}

/**
 * Validate phone number format
 *
 * @param phone - Phone number to validate
 * @returns Object with validation result and error message
 */
export function validatePhone(phone: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!phone) return { valid: true }; // Optional field

  const cleaned = normalizePhone(phone);
  if (!cleaned) return { valid: true };

  const isValid =
    PHONE_PATTERNS.mobile.test(cleaned) ||
    PHONE_PATTERNS.landline.test(cleaned) ||
    PHONE_PATTERNS.international.test(cleaned);

  if (!isValid) {
    return {
      valid: false,
      error:
        "Geçerli bir telefon numarası giriniz (05xxxxxxxxx veya 0xxxyyyyyyy)",
    };
  }

  return { valid: true };
}

/**
 * Get phone number type
 *
 * @param phone - Phone number
 * @returns Phone type: 'mobile', 'landline', 'international', or 'unknown'
 */
export function getPhoneType(
  phone: string | null | undefined,
): "mobile" | "landline" | "international" | "unknown" {
  if (!phone) return "unknown";

  const cleaned = normalizePhone(phone);
  if (!cleaned) return "unknown";

  if (PHONE_PATTERNS.mobile.test(cleaned)) return "mobile";
  if (PHONE_PATTERNS.landline.test(cleaned)) return "landline";
  if (PHONE_PATTERNS.international.test(cleaned)) return "international";

  return "unknown";
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type CustomerContact = z.infer<typeof customerContactSchema>;
export type PhoneType = "mobile" | "landline" | "international" | "unknown";
