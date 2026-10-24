import { actor, endpoint, ok } from "@/lib/http";
export async function GET() {
  return endpoint(async () => {
    const { client, user } = await actor("EMPLOYER");
    const { data, error } = await client
      .from("jobs")
      .select(
        "*,company:companies(id,name,contact_email,verification_status),applications(count)",
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok(data);
  });
}
