import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
config({ path: ".env.local", quiet: true });
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(secret, "Expected a configured server-only credential");
async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else if (/\.(js|json|css|map)$/.test(entry.name))
      assert.ok(
        !(await readFile(path, "utf8")).includes(secret),
        "Server-only credential found in a browser asset",
      );
  }
}
await inspect(".next/static");
console.log(
  "PASS server-only Supabase credential is absent from browser build assets.",
);
