import { z } from "zod";
import { categories, districts } from "./types";
const coordinate = z.coerce.number().finite();
export const searchSchema = z
  .object({
    query: z.string().max(120).optional(),
    category: z.enum(categories).optional(),
    district: z.enum(districts).optional(),
    city: z.string().max(80).optional(),
    minWage: z.coerce.number().min(0).max(10000000).optional(),
    date: z.iso.date().optional(),
    lat: coordinate.min(-90).max(90).optional(),
    lng: coordinate.min(-180).max(180).optional(),
    radiusKm: z.coerce
      .number()
      .refine((n) => [5, 10, 25, 50].includes(n))
      .optional(),
    sort: z.enum(["nearest", "wage", "soonest"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined));
export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(100),
  city: z.string().max(80),
  district: z.string().max(80),
  bio: z.string().max(2000),
  skills: z.array(z.string().trim().min(1).max(60)).max(30),
  availability: z.string().max(500),
});
export const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000),
  contact_email: z.email(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().min(1).max(80),
  district: z.enum(districts),
});
export const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().min(20).max(5000),
    category: z.enum(categories),
    required_skills: z.array(z.string().trim().min(1).max(60)).max(30),
    daily_wage_lkr: z.coerce.number().positive().max(10000000),
    shift_start_at: z.iso.datetime({ offset: true }),
    shift_end_at: z.iso.datetime({ offset: true }),
    required_workers: z.coerce.number().int().min(1).max(10000),
    location_name: z.string().trim().min(3).max(250),
    city: z.string().trim().min(1).max(80),
    district: z.enum(districts),
    latitude: coordinate.min(-90).max(90),
    longitude: coordinate.min(-180).max(180),
    payment_terms: z.string().max(1000),
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
  })
  .refine((v) => Date.parse(v.shift_end_at) > Date.parse(v.shift_start_at), {
    path: ["shift_end_at"],
    message: "END_AFTER_START",
  });
export const chatFiltersSchema = z.object({
  query: z.string().max(120).nullable().optional(),
  category: z.enum(categories).nullable().optional(),
  district: z.enum(districts).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  minWage: z.number().min(0).max(10000000).nullable().optional(),
  date: z.iso.date().nullable().optional(),
  radiusKm: z
    .union([z.literal(5), z.literal(10), z.literal(25), z.literal(50)])
    .nullable()
    .optional(),
  sort: z.enum(["nearest", "wage", "soonest"]).nullable().optional(),
});
export const intentSchema = chatFiltersSchema.extend({
  useCurrentLocation: z.boolean().default(false),
  skills: z.array(z.string().max(60)).max(20).default([]),
});
