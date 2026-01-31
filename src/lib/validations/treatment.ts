import { z } from "zod";

// Treatment Status Enum
export const treatmentStatusEnum = z.enum([
  "PLANNED",
  "ONGOING",
  "COMPLETED",
  "PAUSED",
  "CANCELLED",
]);

// Create Treatment Schema
export const createTreatmentSchema = z.object({
  illnessId: z.string().cuid("Geçersiz hastalık ID"),
  productId: z.string().cuid("Geçersiz ürün ID").optional().nullable(),
  name: z.string().min(1, "Tedavi adı zorunludur").max(200),
  dosage: z.string().max(200).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  applicationMethod: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  cost: z.number().nonnegative().default(0),
  status: treatmentStatusEnum.default("ONGOING"),
  nextCheckupDate: z.string().datetime().or(z.date()).optional().nullable(),
});

// Update Treatment Schema
export const updateTreatmentSchema = z.object({
  productId: z.string().cuid().optional().nullable(),
  name: z.string().min(1).max(200).optional(),
  dosage: z.string().max(200).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  duration: z.string().max(200).optional().nullable(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  applicationMethod: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  cost: z.number().nonnegative().optional(),
  status: treatmentStatusEnum.optional(),
  nextCheckupDate: z.string().datetime().or(z.date()).optional().nullable(),
});

// Query Params Schema
export const treatmentQuerySchema = z.object({
  illnessId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  status: treatmentStatusEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Types
export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;
export type TreatmentQueryParams = z.infer<typeof treatmentQuerySchema>;
export type TreatmentStatus = z.infer<typeof treatmentStatusEnum>;
