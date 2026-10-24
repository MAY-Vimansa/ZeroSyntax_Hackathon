import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
const cli =
  process.platform === "win32"
    ? "node_modules/@supabase/cli-windows-x64/bin/supabase.exe"
    : "node_modules/.bin/supabase";
const config = JSON.parse(
  execFileSync(cli, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (
  !config.API_URL?.includes("127.0.0.1") ||
  !config.ANON_KEY ||
  !config.SERVICE_ROLE_KEY
)
  throw new Error("Expected a running local Supabase stack");
// Preserve unrelated local settings, including the server-only OpenAI key.
const existing = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";
const managed = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_LOCAL_DEMO",
  "NEXT_PUBLIC_HCAPTCHA_SITEKEY",
]);
const preserved = existing
  .split(/\r?\n/)
  .filter((line) => line.trim() && !managed.has(line.split("=", 1)[0].trim()))
  .join("\n");
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${config.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${config.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${config.SERVICE_ROLE_KEY}\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nNEXT_PUBLIC_LOCAL_DEMO=true\nNEXT_PUBLIC_HCAPTCHA_SITEKEY=10000000-ffff-ffff-ffff-000000000001\n${preserved}${preserved ? "\n" : ""}`,
);
console.log(
  "Local Supabase settings saved to ignored .env.local. Secret values were not printed.",
);
