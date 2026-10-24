import { z } from "zod";
import { actor, ApiError, endpoint, limit, ok } from "@/lib/http";

export async function GET(request: Request) {
  return endpoint(async () => {
    const { client } = await actor("ADMIN");
    const days = z
      .enum(["7", "30"])
      .parse(new URL(request.url).searchParams.get("days") ?? "30");
    const { data, error } = await client.rpc("admin_dashboard", {
      period_days: Number(days),
    });
    if (error) throw error;
    const response = ok(data);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  });
}
const moderation = z
  .object({
    id: z.uuid(),
    action: z.enum(["VERIFY_COMPANY", "UNVERIFY_COMPANY", "CLOSE_JOB"]),
    expectedStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "PUBLISHED"]),
    note: z.string().trim().min(10).max(500),
  })
  .strict();
export async function POST(request: Request) {
  return endpoint(async () => {
    const { client, user } = await actor("ADMIN");
    limit(`admin:${user.id}`, 30);
    const input = moderation.parse(await request.json());
    const { data, error } = await client.rpc("admin_moderate", {
      target: input.id,
      operation: input.action,
      expected_status: input.expectedStatus,
      review_note: input.note,
    });
    if (error?.message.includes("STATE_CHANGED"))
      throw new ApiError("STATE_CHANGED", 409);
    if (error?.message.includes("NOT_FOUND"))
      throw new ApiError("NOT_FOUND", 404);
    if (error) throw error;
    return ok(data);
  }, request);
}
