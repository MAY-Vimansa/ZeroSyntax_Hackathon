import { db } from "@/lib/supabase/server";
import { ok } from "@/lib/http";
import { aiStatus } from "@/lib/ai";
export async function GET() {
  let database = false;
  try {
    const client = await db();
    const { error } = await client
      .from("companies")
      .select("id", { head: true, count: "exact" });
    database = !error;
  } catch {}
  const ai = aiStatus();
  return ok({
    database,
    ai: ai.status === "ready",
    aiConfigured: ai.configured,
    aiStatus: ai.status,
  });
}
