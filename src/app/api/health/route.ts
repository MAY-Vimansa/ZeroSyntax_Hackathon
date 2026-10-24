import { db } from "@/lib/supabase/server";
import { ok } from "@/lib/http";
export async function GET() {
  let database = false;
  try {
    const client = await db();
    const { error } = await client
      .from("companies")
      .select("id", { head: true, count: "exact" });
    database = !error;
  } catch {}
  return ok({ database, ai: false, aiStatus: "not_configured" });
}
