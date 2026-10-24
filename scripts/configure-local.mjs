import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
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
writeFileSync(
  ".env.local",
  `NEXT_PUBLIC_SUPABASE_URL=${config.API_URL}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${config.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${config.SERVICE_ROLE_KEY}\nNEXT_PUBLIC_APP_URL=http://localhost:3000\nNEXT_PUBLIC_LOCAL_DEMO=true\n`,
);
console.log(
  "Local Supabase settings saved to ignored .env.local. Secret values were not printed.",
);
