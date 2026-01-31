import { z } from "zod";

// Illness Status Enum
export const illnessStatusEnum = z.enum([
  "ACTIVE",
  "RECOVERED",
  "CHRONIC",
  "MONITORING",
  "CANCELLED",
]);

// Illness Severity Enum
export const illnessSeverityEnum = z.enum([
  "MILD",
  "MODERATE",
  "SEVERE",
  "CRITICAL",
]);

// Create Illness Schema
export const createIllnessSchema = z.object({
  animalId: z.string().cuid("Geçersiz hayvan ID"),
  name: z.string().min(1, "Hastalık adı zorunludur").max(200),
  diagnosis: z.string().max(1000).optional().nullable(),
  symptoms: z.string().max(2000).optional().nullable(),
  findings: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: illnessStatusEnum.default("ACTIVE"),
  severity: illnessSeverityEnum.default("MODERATE"),
  attachments: z.array(z.string().url()).default([]),
});

// Update Illness Schema
export const updateIllnessSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  diagnosis: z.string().max(1000).optional().nullable(),
  symptoms: z.string().max(2000).optional().nullable(),
  findings: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: illnessStatusEnum.optional(),
  severity: illnessSeverityEnum.optional(),
  attachments: z.array(z.string().url()).optional(),
});

// Query Params Schema
export const illnessQuerySchema = z.object({
  animalId: z.string().cuid().optional(),
  status: illnessStatusEnum.optional(),
  severity: illnessSeverityEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types
export type CreateIllnessInput = z.infer<typeof createIllnessSchema>;
export type UpdateIllnessInput = z.infer<typeof updateIllnessSchema>;
export type IllnessQueryParams = z.infer<typeof illnessQuerySchema>;
export type IllnessStatus = z.infer<typeof illnessStatusEnum>;
export type IllnessSeverity = z.infer<typeof illnessSeverityEnum>;
