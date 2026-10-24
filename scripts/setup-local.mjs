import { execFileSync } from "node:child_process";
const cli =
  process.platform === "win32"
    ? "node_modules/@supabase/cli-windows-x64/bin/supabase.exe"
    : "node_modules/.bin/supabase";
console.log(
  "Starting the isolated FlexiRova Supabase stack. Docker must be running.",
);
try {
  execFileSync(
    cli,
    [
      "start",
      "-x",
      "realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (error) {
  console.error(
    "Local database startup failed. Check Docker Desktop, then run npm run db:start for diagnostic output.",
  );
  process.exit(error.status ?? 1);
}
execFileSync(cli, ["migration", "up", "--local"], { stdio: "inherit" });
await import("./configure-local.mjs");
execFileSync(process.execPath, ["scripts/seed.mjs"], { stdio: "inherit" });
console.log("Ready. Run npm run dev, then open http://127.0.0.1:3000.");
