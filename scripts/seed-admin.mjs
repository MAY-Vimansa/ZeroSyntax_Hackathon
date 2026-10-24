import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local", quiet: true });
if (
  process.env.NEXT_PUBLIC_LOCAL_DEMO !== "true" ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error(
    "The fictional admin account is restricted to local demo Supabase.",
  );
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const email = "admin@flexirova.example";
let user;
for (let page = 1; !user; page++) {
  const { data, error } = await client.auth.admin.listUsers({
    page,
    perPage: 100,
  });
  if (error) throw error;
  user = data.users.find((u) => u.email === email);
  if (data.users.length < 100) break;
}
if (!user) {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: "FlexiRova!2026",
    email_confirm: true,
    user_metadata: { display_name: "Platform Admin" },
  });
  if (error) throw error;
  user = data.user;
}
const { error } = await client
  .from("profiles")
  .update({ role: "ADMIN" })
  .eq("id", user.id);
if (error) throw error;
console.log(
  "Local fictional admin ready: admin@flexirova.example (documented demo password). Existing accounts preserved.",
);
