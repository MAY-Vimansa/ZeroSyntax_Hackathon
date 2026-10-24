import { actor, endpoint, ok } from "@/lib/http";
import { profileSchema } from "@/lib/validation";
export async function GET() {
  return endpoint(async () => {
    const { profile } = await actor();
    return ok(profile);
  });
}
export async function PATCH(req: Request) {
  return endpoint(async () => {
    const { client, user } = await actor();
    const body = profileSchema.parse(await req.json());
    const { data, error } = await client
      .from("profiles")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return ok(data);
  }, req);
}
