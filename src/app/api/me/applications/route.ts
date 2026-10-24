import { actor, endpoint, ok } from "@/lib/http";
export async function GET() {
  return endpoint(async () => {
    const { client, user } = await actor("WORKER");
    const { data, error } = await client
      .from("applications")
      .select(
        "*,job:jobs(*,company:companies(id,name,contact_email,verification_status))",
      )
      .eq("worker_id", user.id)
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return ok(data);
  });
}
