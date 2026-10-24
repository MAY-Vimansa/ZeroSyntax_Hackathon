import { actor, endpoint, ok, ApiError } from "@/lib/http";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const { client } = await actor("EMPLOYER");
    const { id } = await params;
    const { data: owned } = await client.rpc("owns_job", { target: id });
    if (!owned) throw new ApiError("NOT_ALLOWED", 403);
    const { data, error } = await client
      .from("applications")
      .select("*,worker:profiles(*)")
      .eq("job_id", id)
      .order("applied_at");
    if (error) throw error;
    return ok(data);
  }, req);
}
