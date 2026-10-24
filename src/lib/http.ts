import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "./supabase/server";
import type { Profile } from "./types";
export class ApiError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export async function actor(role?: Profile["role"]) {
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new ApiError("SIGN_IN_REQUIRED", 401);
  const { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || (role && profile.role !== role))
    throw new ApiError("NOT_ALLOWED", 403);
  return { client, user, profile: profile as Profile };
}
export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}
export async function endpoint(
  fn: () => Promise<NextResponse>,
  request?: Request,
) {
  try {
    if (request && request.method !== "GET") {
      const origin = request.headers.get("origin");
      if (
        origin &&
        new URL(origin).host !==
          (request.headers.get("host") ?? new URL(request.url).host)
      )
        throw new ApiError("NOT_ALLOWED", 403);
    }
    return await fn();
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: e.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        },
        { status: 422 },
      );
    if (e instanceof ApiError)
      return NextResponse.json(
        { error: { code: e.code } },
        { status: e.status },
      );
    const message =
      e && typeof e === "object" && "message" in e ? String(e.message) : "";
    const allowed = [
      "JOB_FULL",
      "JOB_UNAVAILABLE",
      "WORKER_REQUIRED",
      "NOT_ALLOWED",
      "APPLICATION_ALREADY_DECIDED",
      "WITHDRAWAL_UNAVAILABLE",
    ];
    const code = allowed.find((s) => message.includes(s));
    return NextResponse.json(
      { error: { code: code ?? "REQUEST_FAILED" } },
      { status: code ? (code === "NOT_ALLOWED" ? 403 : 409) : 500 },
    );
  }
}
const buckets = new Map<string, { n: number; until: number }>();
export function limit(key: string, max = 20) {
  const now = Date.now();
  if (buckets.size > 2000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const value = buckets.get(key);
  if (!value || value.until < now) {
    buckets.set(key, { n: 1, until: now + 60000 });
    return;
  }
  if (value.n >= max) throw new ApiError("RATE_LIMITED", 429);
  value.n++;
}
