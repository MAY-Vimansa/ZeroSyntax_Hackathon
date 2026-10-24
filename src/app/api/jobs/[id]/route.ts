import { db } from "@/lib/supabase/server";
import { actor, endpoint, ok, ApiError } from "@/lib/http";
import { jobSchema } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  return endpoint(async () => {
    const { id } = await params;
    const client = await db();
    const { data, error } = await client
      .from("jobs")
      .select("*,company:companies(id,name,contact_email,verification_status)")
      .eq("id", id)
      .single();
    if (error || !data) throw new ApiError("NOT_FOUND", 404);
    return ok(data);
  }, req);
}
export async function PATCH(req: Request, { params }: Context) {
  return endpoint(async () => {
    const { client } = await actor("EMPLOYER");
    const { id } = await params;
    const { data: owned } = await client.rpc("owns_job", { target: id });
    if (!owned) throw new ApiError("NOT_ALLOWED", 403);
    const raw = await req.json();
    const { data: existing } = await client
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();
    if (!existing) throw new ApiError("NOT_FOUND", 404);
    const body = jobSchema.parse({ ...existing, ...raw });
    if (
      body.status === "PUBLISHED" &&
      Date.parse(body.shift_start_at) <= Date.now() + 3600000
    )
      throw new ApiError("FUTURE_SHIFT_REQUIRED", 422);
    const { data, error } = await client
      .from("jobs")
      .update({
        ...body,
        application_cutoff_at: new Date(
          Date.parse(body.shift_start_at) - 3600000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
    return ok(data);
  }, req);
}
