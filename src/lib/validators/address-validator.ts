/**
 * Address Validation Utilities
 *
 * Provides validation for address fields with hierarchical logic:
 * - Address, City, District, Village validation
 * - Hierarchical validation (village requires district, district requires city)
 * - Turkish address format support
 */

import { z } from "zod";

// =====================================================
// ADDRESS SCHEMA
// =====================================================

/**
 * Address validation schema
 * All fields are optional but have max length constraints
 */
export const addressSchema = z.object({
  address: z
    .string()
    .max(500, "Adres en fazla 500 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  city: z
    .string()
    .max(100, "Şehir en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  district: z
    .string()
    .max(100, "İlçe en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),

  village: z
    .string()
    .max(100, "Köy en fazla 100 karakter olabilir")
    .optional()
    .transform((val) => val?.trim()),
});

// =====================================================
// HIERARCHICAL VALIDATION
// =====================================================

/**
 * Validate address hierarchy logic
 *
 * Rules:
 * - If village is provided, district must be provided
 * - If district is provided, city must be provided
 *
 * @param data - Address data to validate
 * @returns Validation result with error message if invalid
 */
export function validateAddressHierarchy(data: {
  city?: string | null;
  district?: string | null;
  village?: string | null;
}): { valid: boolean; error?: string } {
  // If village is provided, district should be provided
  if (data.village && !data.district) {
    return {
      valid: false,
      error: "Köy girildiğinde ilçe bilgisi zorunludur",
    };
  }

  // If district is provided, city should be provided
  if (data.district && !data.city) {
    return {
      valid: false,
      error: "İlçe girildiğinde şehir bilgisi zorunludur",
    };
  }

  return { valid: true };
}

/**
 * Validate complete address data
 * Combines schema validation with hierarchical validation
 *
 * @param data - Address data to validate
 * @returns Validation result with parsed data or error
 */
export function validateAddress(data: {
  address?: string;
  city?: string;
  district?: string;
  village?: string;
}): {
  valid: boolean;
  data?: z.infer<typeof addressSchema>;
  error?: string;
} {
  // Schema validation
  const schemaResult = addressSchema.safeParse(data);
  if (!schemaResult.success) {
    return {
      valid: false,
      error: schemaResult.error.issues[0]?.message || "Validation error",
    };
  }

  // Hierarchical validation
  const hierarchyResult = validateAddressHierarchy(data);
  if (!hierarchyResult.valid) {
    return {
      valid: false,
      error: hierarchyResult.error,
    };
  }

  return {
    valid: true,
    data: schemaResult.data,
  };
}

// =====================================================
// ADDRESS FORMATTING
// =====================================================

/**
 * Format address for display
 * Combines address components into a single formatted string
 *
 * @param data - Address components
 * @returns Formatted address string
 */
export function formatAddress(data: {
  address?: string | null;
  village?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  const parts: string[] = [];

  if (data.address) parts.push(data.address);
  if (data.village) parts.push(data.village);
  if (data.district) parts.push(data.district);
  if (data.city) parts.push(data.city);

  return parts.filter(Boolean).join(", ");
}

/**
 * Format location (city, district, village only)
 *
 * @param data - Location components
 * @returns Formatted location string
 */
export function formatLocation(data: {
  village?: string | null;
  district?: string | null;
  city?: string | null;
}): string {
  const parts: string[] = [];

  if (data.village) parts.push(data.village);
  if (data.district) parts.push(data.district);
  if (data.city) parts.push(data.city);

  return parts.filter(Boolean).join(", ");
}

/**
 * Check if address is complete
 *
 * @param data - Address data
 * @returns True if all address fields are provided
 */
export function isAddressComplete(data: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
}): boolean {
  return Boolean(data.address && data.city && data.district);
}

/**
 * Get address completeness percentage
 *
 * @param data - Address data
 * @returns Percentage of filled address fields (0-100)
 */
export function getAddressCompleteness(data: {
  address?: string | null;
  city?: string | null;
  district?: string | null;
  village?: string | null;
}): number {
  const fields = [data.address, data.city, data.district, data.village];
  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}

// =====================================================
// TURKISH CITIES (COMMON ONES)
// =====================================================

/**
 * Common Turkish cities for autocomplete/validation
 * This is a subset - expand as needed
 */
export const TURKISH_CITIES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kilis",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şanlıurfa",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
] as const;

/**
 * Validate if city is a valid Turkish city
 *
 * @param city - City name to validate
 * @returns True if city is in the list
 */
export function isValidTurkishCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return TURKISH_CITIES.includes(city as any);
}

// =====================================================
// TYPE EXPORTS
// =====================================================

export type Address = z.infer<typeof addressSchema>;
export type TurkishCity = (typeof TURKISH_CITIES)[number];
