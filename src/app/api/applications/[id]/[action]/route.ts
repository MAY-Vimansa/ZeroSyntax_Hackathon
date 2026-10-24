import { actor, endpoint, ok, ApiError, limit } from "@/lib/http";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  return endpoint(async () => {
    const { id, action } = await params;
    if (!["approve", "reject", "withdraw"].includes(action))
      throw new ApiError("NOT_FOUND", 404);
    const { client, user } = await actor(
      action === "withdraw" ? "WORKER" : "EMPLOYER",
    );
    limit(user.id, 40);
    const { data, error } =
      action === "withdraw"
        ? await client.rpc("withdraw_application", { target: id })
        : await client.rpc("decide_application", {
            target: id,
            decision: action === "approve" ? "APPROVED" : "REJECTED",
          });
    if (error) throw error;
    return ok(data);
  }, req);
}
