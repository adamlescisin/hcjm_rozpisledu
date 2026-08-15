import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neplatný formát barvy"),
  icon: z.string().optional().nullable(),
  defaultDurationMinutes: z.number().int().min(15).max(480).default(60),
  requiresResurfacingBefore: z.boolean().default(false),
  requiresResurfacingAfter: z.boolean().default(false),
  resurfacingBeforeMinutes: z.number().int().min(5).max(60).default(15),
  resurfacingAfterMinutes: z.number().int().min(5).max(60).default(15),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const eventSchema = z.object({
  venueId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().min(1, "Název je povinný"),
  description: z.string().optional().nullable(),
  startDatetime: z.string().datetime(),
  endDatetime: z.string().datetime(),
  status: z.enum(["CONFIRMED", "CANCELLED", "TENTATIVE"]).default("CONFIRMED"),
  capacity: z.number().int().positive().optional().nullable(),
  isBookable: z.boolean().default(false),
}).refine(
  (data) => new Date(data.endDatetime) > new Date(data.startDatetime),
  { message: "Konec musí být po začátku", path: ["endDatetime"] }
);

export const eventUpdateSchema = z.object({
  venueId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDatetime: z.string().datetime().optional(),
  endDatetime: z.string().datetime().optional(),
  status: z.enum(["CONFIRMED", "CANCELLED", "TENTATIVE"]).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  isBookable: z.boolean().optional(),
});

const recurrenceSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  interval: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  untilDate: z.string().optional().nullable(),
  occurrenceCount: z.number().int().positive().optional().nullable(),
  exceptions: z.array(z.string()).default([]),
});

export const recurrenceEventSchema = z.object({
  venueId: z.string().min(1),
  categoryId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDatetime: z.string().datetime(),
  endDatetime: z.string().datetime(),
  status: z.enum(["CONFIRMED", "CANCELLED", "TENTATIVE"]).default("CONFIRMED"),
  recurrence: recurrenceSchema,
});

export const priceRuleSchema = z.object({
  categoryId: z.string().optional().nullable(),
  label: z.string().min(1),
  dayOfWeekFrom: z.number().int().min(0).max(6).optional().nullable(),
  dayOfWeekTo: z.number().int().min(0).max(6).optional().nullable(),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  priceCzk: z.number().int().min(0),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fontHeading: z.string().min(1),
  fontBody: z.string().min(1),
  logoUrl: z.string().url().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type EventFormData = z.infer<typeof eventSchema>;
export type RecurrenceEventFormData = z.infer<typeof recurrenceEventSchema>;
export type PriceRuleFormData = z.infer<typeof priceRuleSchema>;
export type ThemeFormData = z.infer<typeof themeSchema>;
