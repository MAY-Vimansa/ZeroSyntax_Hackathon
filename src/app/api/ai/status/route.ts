import { aiStatus } from "@/lib/ai";
import { ok } from "@/lib/http";
export async function GET() {
  return ok(aiStatus());
}
