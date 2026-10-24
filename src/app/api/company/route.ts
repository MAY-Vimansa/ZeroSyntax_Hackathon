import { actor, endpoint, ok } from "@/lib/http";
import { companySchema } from "@/lib/validation";
export async function GET() {
  return endpoint(async () => {
    const { client, user } = await actor("EMPLOYER");
    const { data, error } = await client
      .from("companies")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  });
}
export async function POST(req: Request) {
  return endpoint(async () => {
    const { client, user } = await actor("EMPLOYER");
    const body = companySchema.parse(await req.json());
    const { data: existing } = await client
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    const result = existing
      ? await client
          .from("companies")
          .update(body)
          .eq("id", existing.id)
          .select("*")
          .single()
      : await client
          .from("companies")
          .insert({ ...body, owner_id: user.id })
          .select("*")
          .single();
    if (result.error) throw result.error;
    return ok(result.data);
  }, req);
}
