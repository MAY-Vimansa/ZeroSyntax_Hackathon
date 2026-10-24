import { searchAvailableJobs } from "@/lib/search";
import { jobSchema } from "@/lib/validation";
import { actor, endpoint, ok, ApiError, limit } from "@/lib/http";
export async function GET(req: Request) {
  return endpoint(
    async () =>
      ok(
        await searchAvailableJobs(
          Object.fromEntries(
            [...new URL(req.url).searchParams].filter(
              ([, value]) => value !== "",
            ),
          ),
        ),
      ),
    req,
  );
}
export async function POST(req: Request) {
  return endpoint(async () => {
    const { client, user } = await actor("EMPLOYER");
    limit(user.id);
    const body = jobSchema.parse(await req.json());
    if (Date.parse(body.shift_start_at) <= Date.now() + 3600000)
      throw new ApiError("FUTURE_SHIFT_REQUIRED", 422);
    const { data: company } = await client
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .single();
    if (!company) throw new ApiError("COMPANY_REQUIRED", 422);
    const { data, error } = await client
      .from("jobs")
      .insert({
        ...body,
        company_id: company.id,
        created_by: user.id,
        application_cutoff_at: new Date(
          Date.parse(body.shift_start_at) - 3600000,
        ).toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return ok(data, 201);
  }, req);
}
