import { z } from "zod";
import { categories, districts, type Job, type SearchFilters } from "./types";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(["en", "si", "ta"]).default("en"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(6)
    .default([]),
  location: z
    .object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    })
    .nullable()
    .optional(),
});
export const aiIntentSchema = z.object({
  intent: z.enum(["search", "help"]),
  message: z.string().max(1000),
  query: z.string().max(120).nullable(),
  category: z.enum(categories).nullable(),
  district: z.enum(districts).nullable(),
  city: z.string().max(80).nullable(),
  minWage: z.number().min(0).max(10000000).nullable(),
  date: z.iso.date().nullable(),
  radiusKm: z
    .union([z.literal(5), z.literal(10), z.literal(25), z.literal(50)])
    .nullable(),
  sort: z.enum(["nearest", "wage", "soonest"]).nullable(),
  useCurrentLocation: z.boolean(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20),
});
export const skillsRequestSchema = z.object({
  text: z.string().trim().min(3).max(2000),
});
export const skillsResultSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(60)).max(20),
});
export type AiIntent = z.infer<typeof aiIntentSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type AiChatResult = {
  message: string;
  jobs: Job[];
  total: number;
  filters: SearchFilters;
  skills: string[];
  needsLocation: boolean;
};
export function intentFilters(
  intent: AiIntent,
  location?: ChatRequest["location"],
): SearchFilters {
  const filters: SearchFilters = { limit: 6, page: 1 };
  for (const field of [
    "query",
    "category",
    "district",
    "city",
    "minWage",
    "date",
    "sort",
  ] as const) {
    const value = intent[field];
    if (value !== null) Object.assign(filters, { [field]: value });
  }
  // Coordinates come only from explicit browser permission, never the model.
  if (intent.useCurrentLocation && location) {
    filters.lat = location.lat;
    filters.lng = location.lng;
    filters.radiusKm = intent.radiusKm ?? 10;
  }
  return filters;
}
export function aiErrorKey(code: string) {
  switch (code) {
    case "AI_NOT_CONFIGURED":
      return "aiMissing";
    case "AI_AUTH_ERROR":
      return "aiAuthError";
    case "AI_QUOTA_EXCEEDED":
      return "aiQuotaError";
    case "AI_RATE_LIMITED":
    case "RATE_LIMITED":
      return "rateLimit";
    case "AI_MODEL_UNAVAILABLE":
      return "aiModelError";
    default:
      return "aiUnavailable";
  }
}
