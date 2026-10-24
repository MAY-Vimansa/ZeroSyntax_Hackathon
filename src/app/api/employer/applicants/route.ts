import { actor, endpoint, ok } from "@/lib/http";
export async function GET() {
  return endpoint(async () => {
    const { client, user } = await actor("EMPLOYER");
    const { data: jobs, error: jobsError } = await client
      .from("jobs")
      .select("id")
      .eq("created_by", user.id);
    if (jobsError) throw jobsError;
    if (!jobs?.length) return ok([]);
    const { data, error } = await client
      .from("applications")
      .select(
        "*,job:jobs(*,company:companies(id,name,contact_email,verification_status)),worker:profiles(*)",
      )
      .in(
        "job_id",
        jobs.map((j) => j.id),
      )
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return ok(data);
  });
}
