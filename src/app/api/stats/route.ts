import { db } from "@/lib/supabase/server";
import { endpoint, ok } from "@/lib/http";
export async function GET() {
  return endpoint(async () => {
    const client = await db();
    const { data, error } = await client.rpc("marketplace_stats");
    if (error) throw error;
    return ok(data);
  });
}
