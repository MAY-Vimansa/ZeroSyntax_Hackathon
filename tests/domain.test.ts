import { describe, it, expect } from "vitest";
import {
  haversineKm,
  colomboDate,
  travelRemainder,
  missingDetails,
} from "../src/lib/domain";
import { searchSchema, jobSchema } from "../src/lib/validation";
import { messages, locales, translate } from "../src/lib/i18n";
describe("geography, local dates, and earnings", () => {
  it("returns zero for the same coordinates", () =>
    expect(
      haversineKm({ lat: 6.9271, lng: 79.8612 }, { lat: 6.9271, lng: 79.8612 }),
    ).toBe(0));
  it("calculates Colombo to Negombo distance in a plausible bounded range", () =>
    expect(
      haversineKm({ lat: 6.9271, lng: 79.8612 }, { lat: 7.2083, lng: 79.8358 }),
    ).toBeGreaterThan(31));
  it("uses Sri Lanka date on both sides of local midnight", () => {
    expect(colomboDate(new Date("2026-10-24T18:29:59Z"))).toBe("2026-10-24");
    expect(colomboDate(new Date("2026-10-24T18:30:00Z"))).toBe("2026-10-25");
  });
  it("shows a negative remainder honestly rather than clamping it", () => {
    expect(travelRemainder(3000, 500)).toBe(2500);
    expect(travelRemainder(3000, 3500)).toBe(-500);
  });
  it("flags undisclosed payment timing", () =>
    expect(
      missingDetails({
        description: "Packing shift",
        payment_terms: "",
        location_name: "Colombo",
        shift_start_at: "2026-10-25T03:30:00Z",
        daily_wage_lkr: 3000,
      }),
    ).toEqual(["payment_terms"]));
});
describe("search validation and translations", () => {
  it("requires latitude and longitude together", () => {
    expect(searchSchema.safeParse({ lat: 6.9 }).success).toBe(false);
    expect(
      searchSchema.safeParse({ lat: 6.9, lng: 79.8, radiusKm: 10 }).success,
    ).toBe(true);
  });
  it("rejects unbounded radii, invalid dates, and protected filters", () => {
    expect(searchSchema.safeParse({ radiusKm: 1000 }).success).toBe(false);
    expect(searchSchema.safeParse({ date: "2026-99-99" }).success).toBe(false);
    expect(searchSchema.parse({ gender: "male" })).not.toHaveProperty("gender");
  });
  it("provides all interface strings in all three languages", () => {
    for (const key of Object.keys(messages) as (keyof typeof messages)[])
      for (const locale of locales)
        expect(translate(locale, key).trim().length).toBeGreaterThan(0);
  });
  it("rejects incomplete job submissions", () =>
    expect(
      jobSchema.safeParse({ title: "Packing", daily_wage_lkr: 0 }).success,
    ).toBe(false));
});
