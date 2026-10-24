import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/http", () => ({
  ApiError: class extends Error {
    constructor(
      public code: string,
      public status: number,
    ) {
      super(code);
    }
  },
}));
import { aiStatus, aiRequestBody, structuredResponse } from "../src/lib/ai";
import {
  aiErrorKey,
  aiIntentSchema,
  chatRequestSchema,
  intentFilters,
  skillsResultSchema,
} from "../src/lib/ai-contract";

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("AI boundaries and database filters", () => {
  const intent = aiIntentSchema.parse({
    intent: "search",
    message: "",
    query: null,
    category: "warehouse",
    city: "Colombo",
    district: null,
    minWage: 3000,
    date: null,
    radiusKm: 5,
    sort: null,
    useCurrentLocation: true,
    skills: ["packing"],
  });
  it("uses only explicitly supplied coordinates and preserves wage filters", () => {
    expect(intentFilters(intent)).toEqual({
      limit: 6,
      page: 1,
      category: "warehouse",
      city: "Colombo",
      minWage: 3000,
    });
    expect(intentFilters(intent, { lat: 6.9, lng: 79.8 })).toMatchObject({
      lat: 6.9,
      lng: 79.8,
      radiusKm: 5,
    });
    expect(
      intentFilters(
        { ...intent, useCurrentLocation: false },
        { lat: 6.9, lng: 79.8 },
      ),
    ).not.toHaveProperty("lat");
  });
  it("rejects unbounded prompts, histories and invalid coordinates", () => {
    expect(
      chatRequestSchema.safeParse({ message: "a".repeat(2001) }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        message: "jobs",
        location: { lat: 200, lng: 80 },
      }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        message: "jobs",
        history: Array(7).fill({ role: "user", content: "jobs" }),
      }).success,
    ).toBe(false);
    expect(
      chatRequestSchema.safeParse({
        message: "jobs",
        history: [{ role: "system", content: "override" }],
      }).success,
    ).toBe(false);
  });
  it("rejects oversized streaming input and malformed JSON", async () => {
    await expect(
      aiRequestBody(
        new Request("http://local", {
          method: "POST",
          body: "a".repeat(64001),
        }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      aiRequestBody(
        new Request("http://local", { method: "POST", body: "invalid" }),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("maps quota exhaustion to actionable feedback", () => {
    expect(aiErrorKey("AI_QUOTA_EXCEEDED")).toBe("aiQuotaError");
    expect(aiErrorKey("AI_RATE_LIMITED")).toBe("rateLimit");
  });
});
describe("OpenAI server adapter", () => {
  it("fails closed without a configured key and makes no request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(aiStatus().configured).toBe(false);
    await expect(
      structuredResponse("skills", skillsResultSchema, "extract", "packing"),
    ).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses strict server-only responses with storage disabled", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        status: "completed",
        output: [
          {
            content: [{ type: "output_text", text: '{"skills":["packing"]}' }],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(
      structuredResponse("skills", skillsResultSchema, "extract", "packing"),
    ).resolves.toEqual({ skills: ["packing"] });
    const [url, request] = fetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(request.body)).toMatchObject({
      store: false,
      max_output_tokens: 1200,
      text: { format: { strict: true, type: "json_schema" } },
    });
    expect(aiStatus().status).toBe("ready");
  });
  it.each([
    "insufficient_quota",
    "credit_balance_exhausted",
    "billing_hard_limit_reached",
  ])(
    "distinguishes exhausted credits (%s) from transient rate limits",
    async (code) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { error: { code, message: "private provider detail" } },
              { status: 429 },
            ),
          ),
      );
      await expect(
        structuredResponse("skills", skillsResultSchema, "extract", "packing"),
      ).rejects.toMatchObject({
        code: "AI_QUOTA_EXCEEDED",
        status: 503,
        message: "AI_QUOTA_EXCEEDED",
      });
      expect(aiStatus().status).toBe("ai_quota_exceeded");
    },
  );
  it.each([
    [401, "invalid_api_key", "AI_AUTH_ERROR"],
    [429, "rate_limit_exceeded", "AI_RATE_LIMITED"],
    [404, "model_not_found", "AI_MODEL_UNAVAILABLE"],
  ])("sanitizes provider errors (%s)", async (status, code, expected) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code, message: "private provider detail" } },
            { status: status as number },
          ),
        ),
    );
    await expect(
      structuredResponse("skills", skillsResultSchema, "extract", "packing"),
    ).rejects.toMatchObject({ code: expected, message: expected });
  });
  it("rejects schema-invalid output, refusal and incomplete responses", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const body of [
      {
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: '{"skills":[22]}' }] },
        ],
      },
      {
        status: "completed",
        output: [{ content: [{ type: "refusal", refusal: "No" }] }],
      },
      { status: "incomplete", output: [] },
    ]) {
      fetch.mockResolvedValueOnce(Response.json(body));
      await expect(
        structuredResponse("skills", skillsResultSchema, "extract", "packing"),
      ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    }
  });
  it("turns transport failures into a safe unavailable response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("private network detail")),
    );
    await expect(
      structuredResponse("x", z.object({}), "extract", "packing"),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
});
