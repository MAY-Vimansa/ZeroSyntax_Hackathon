import { actor, endpoint, ok, limit } from "@/lib/http";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const { client, user } = await actor("WORKER");
    limit(user.id);
    const { data, error } = await client.rpc("apply_job", {
      target: (await params).id,
    });
    if (error) throw error;
    return ok(data);
  }, req);
}
