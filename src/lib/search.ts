import "server-only";
import { db } from "./supabase/server";
import { searchSchema } from "./validation";
import type { SearchFilters, SearchResult } from "./types";
export async function searchAvailableJobs(
  input: SearchFilters,
): Promise<SearchResult> {
  const filters = searchSchema.parse(input);
  const client = await db();
  const { data, error } = await client.rpc("search_available_jobs", {
    filters,
  });
  if (error) throw error;
  return data as SearchResult;
}
