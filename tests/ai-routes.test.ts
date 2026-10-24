import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  ai: vi.fn(),
  search: vi.fn(),
}));
vi.mock("../src/lib/supabase/server", () => ({ db: vi.fn() }));
vi.mock("../src/lib/http", async (original) => ({
  ...(await original<typeof import("../src/lib/http")>()),
  actor: mocks.actor,
}));
vi.mock("../src/lib/ai", async (original) => ({
  ...(await original<typeof import("../src/lib/ai")>()),
  structuredResponse: mocks.ai,
}));
vi.mock("../src/lib/search", () => ({ searchAvailableJobs: mocks.search }));
import { POST as chat } from "../src/app/api/ai/chat/route";
import { POST as extract } from "../src/app/api/ai/extract-skills/route";
import { ApiError } from "../src/lib/http";

const intent = {
  intent: "search",
  message: "MODEL TEXT MUST NOT BECOME SEARCH RESULTS",
  query: null,
  category: "warehouse",
  city: "Colombo",
  district: null,
  minWage: 3000,
  date: null,
  radiusKm: null,
  sort: null,
  useCurrentLocation: false,
  skills: ["packing"],
};
function request(body: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { origin },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actor.mockResolvedValue({ user: { id: crypto.randomUUID() } });
  mocks.ai.mockResolvedValue(intent);
});
afterEach(() => vi.unstubAllEnvs());
describe("AI route behavior with explicitly mocked provider output", () => {
  it("returns database jobs and counts, never invented model listings", async () => {
    const job = {
      id: "database-job",
      title: "Packing fixture",
      required_skills: ["packing"],
    };
    mocks.search.mockResolvedValue({ jobs: [job], total: 1 });
    const response = await chat(
      request({ message: "packing in Colombo above 3000" }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.jobs).toEqual([job]);
    expect(body.data.total).toBe(1);
    expect(body.data.message).not.toContain("MODEL TEXT");
    expect(mocks.search).toHaveBeenCalledWith({
      limit: 6,
      page: 1,
      category: "warehouse",
      city: "Colombo",
      minWage: 3000,
    });
  });
  it("reports empty database results without relaxing filters", async () => {
    mocks.search.mockResolvedValue({ jobs: [], total: 0 });
    const response = await chat(request({ message: "packing above 900000" }));
    const body = await response.json();
    expect(body.data.jobs).toEqual([]);
    expect(body.data.message).toMatch(/No available shifts/);
    expect(mocks.search).toHaveBeenCalledTimes(1);
  });
  it("asks for location rather than inventing it or silently searching everywhere", async () => {
    mocks.ai.mockResolvedValue({ ...intent, useCurrentLocation: true });
    const response = await chat(request({ message: "jobs near me" }));
    expect((await response.json()).data.needsLocation).toBe(true);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("keeps precise coordinates out of the model input and passes them only to database search", async () => {
    mocks.ai.mockResolvedValue({ ...intent, useCurrentLocation: true });
    mocks.search.mockResolvedValue({ jobs: [], total: 0 });
    await chat(
      request({
        message: "jobs near me",
        location: { lat: 6.9271, lng: 79.8612 },
      }),
    );
    expect(mocks.ai.mock.calls[0][3]).not.toMatch(/6\.9271|79\.8612/);
    expect(mocks.search.mock.calls[0][0]).toMatchObject({
      lat: 6.9271,
      lng: 79.8612,
      radiusKm: 10,
    });
  });
  it("blocks cross-origin requests before any paid request", async () => {
    expect(
      (await chat(request({ message: "jobs" }, "https://untrusted.example")))
        .status,
    ).toBe(403);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("requires a real user and rejects malformed payloads before inference", async () => {
    mocks.actor.mockRejectedValueOnce(new ApiError("SIGN_IN_REQUIRED", 401));
    expect((await chat(request({ message: "jobs" }))).status).toBe(401);
    expect((await chat(request({ message: "" }))).status).toBe(422);
    expect(mocks.ai).not.toHaveBeenCalled();
  });
  it("surfaces quota exhaustion without pretending to return an AI answer", async () => {
    mocks.ai.mockRejectedValue(new ApiError("AI_QUOTA_EXCEEDED", 503));
    const response = await chat(request({ message: "packing" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: { code: "AI_QUOTA_EXCEEDED" },
    });
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it("returns deduplicated skill suggestions without writing to the profile", async () => {
    mocks.ai.mockResolvedValue({ skills: ["Packing", "packing", "sorting"] });
    const response = await extract(
      request({ text: "I pack and sort parcels." }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.skills).toEqual(["packing", "sorting"]);
    expect(mocks.actor).toHaveBeenCalledWith("WORKER");
  });
});
