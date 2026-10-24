import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import assert from "node:assert/strict";
import { localCaptchaOptions } from "./captcha-test-helpers.mjs";
config({ path: ".env.local", quiet: true });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Integration tests require a local application URL.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Integration tests require local Supabase.");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const created = [];
let count = 0;
function check(result) {
  if (result.error) throw result.error;
  return result.data;
}
async function session(email) {
  const jar = new Map();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) =>
        items.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  check(
    await client.auth.signInWithPassword({
      email,
      password: "FlexiRova!2026",
      options: localCaptchaOptions(),
    }),
  );
  return {
    client,
    headers: () => ({
      cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    }),
  };
}
async function request(path, { session: actor, method = "GET", body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
      ...actor?.headers(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, ...(await response.json()) };
}
function pass(label) {
  count++;
  console.log(`PASS ${label}`);
}
try {
  const employer = await session("employer@flexirova.example"),
    worker = await session("worker@flexirova.example"),
    other = await session("employer2@flexirova.example");
  const newEmail = `testworker-${Date.now()}@flexirova.example`;
  const user = check(
    await admin.auth.admin.createUser({
      email: newEmail,
      password: "FlexiRova!2026",
      email_confirm: true,
      user_metadata: { display_name: "Integration Worker", role: "WORKER" },
    }),
  ).user;
  created.push(user.id);
  const worker2 = await session(newEmail);
  const found = await request("/api/jobs?limit=50");
  assert.equal(found.status, 200);
  assert.ok(found.data.total >= 10);
  assert.ok(
    found.data.jobs.every((j) => !j.title.includes("Unavailable Fixture")),
  );
  pass("public search excludes full and expired shifts");
  const near = await request(
    "/api/jobs/nearby?lat=6.9271&lng=79.8612&radiusKm=5&limit=50",
  );
  assert.equal(near.status, 200);
  assert.ok(near.data.jobs.length > 0);
  assert.ok(near.data.jobs.every((j) => j.distance_km <= 5));
  assert.ok(!near.data.jobs.some((j) => j.city === "Negombo"));
  pass("PostGIS radius filtering and real distances");
  const noMatch = await request("/api/jobs?query=impossible-zebrafish-title");
  assert.equal(noMatch.data.total, 0);
  pass("honest empty results");
  assert.equal((await request("/api/jobs?lat=6.9")).status, 422);
  pass("incomplete coordinates rejected");
  assert.equal(
    (
      await request("/api/ai/chat", {
        method: "POST",
        body: { message: "packing" },
      })
    ).error.code,
    "SIGN_IN_REQUIRED",
  );
  assert.equal((await request("/api/ai/chat", { method: "POST", session: worker, body: { message: "" } })).status, 422);
  assert.equal((await request("/api/ai/extract-skills", { method: "POST", session: employer, body: { text: "packing" } })).status, 403);
  pass("AI requires authentication, validates input, and restricts worker skill extraction");
  assert.equal(
    (await request("/api/jobs", { method: "POST", session: worker, body: {} }))
      .status,
    403,
  );
  pass("worker cannot publish jobs");
  const forbiddenOrigin = await fetch(`${base}/api/jobs`, {
    method: "POST",
    headers: {
      ...employer.headers(),
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(forbiddenOrigin.status, 403);
  pass("cross-origin mutations are rejected");
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const job = {
    title: `Integration capacity ${Date.now()}`,
    description:
      "Fictional integration-test warehouse packing shift. This is not a real job.",
    category: "warehouse",
    required_skills: ["packing"],
    daily_wage_lkr: 3000,
    shift_start_at: `${date}T09:00:00+05:30`,
    shift_end_at: `${date}T17:00:00+05:30`,
    required_workers: 1,
    location_name: "Fictional Colombo test workplace",
    city: "Colombo",
    district: "Colombo",
    latitude: 6.9271,
    longitude: 79.8612,
    payment_terms: "Demo record only",
    status: "PUBLISHED",
  };
  const published = await request("/api/jobs", {
    method: "POST",
    session: employer,
    body: job,
  });
  assert.equal(published.status, 201);
  const id = published.data.id;
  pass("employer publishes a database-backed shift");
  assert.equal(
    (
      await request(`/api/jobs/${id}`, {
        method: "PATCH",
        session: other,
        body: { title: "Unauthorized edit" },
      })
    ).status,
    403,
  );
  pass("unrelated employer cannot edit shift");
  const application = await request(`/api/jobs/${id}/apply`, {
    method: "POST",
    session: worker,
  });
  assert.equal(application.status, 200);
  const repeated = await request(`/api/jobs/${id}/apply`, {
    method: "POST",
    session: worker,
  });
  assert.equal(repeated.data.id, application.data.id);
  pass("duplicate apply is idempotent");
  const second = await request(`/api/jobs/${id}/apply`, {
    method: "POST",
    session: worker2,
  });
  assert.equal(second.status, 200);
  assert.equal(
    (
      await request(`/api/applications/${application.data.id}/approve`, {
        method: "POST",
        session: worker,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/applications/${application.data.id}/approve`, {
        method: "POST",
        session: other,
      })
    ).status,
    403,
  );
  pass("approval role and ownership authorization");
  const race = await Promise.all(
    [application, second].map((a) =>
      request(`/api/applications/${a.data.id}/approve`, {
        method: "POST",
        session: employer,
      }),
    ),
  );
  assert.equal(race.filter((r) => r.status === 200).length, 1);
  assert.equal(race.filter((r) => r.status === 409).length, 1);
  const actual = check(
    await admin.from("jobs").select("approved_count").eq("id", id).single(),
  );
  assert.equal(actual.approved_count, 1);
  pass("concurrent approvals cannot exceed quota");
  const win = race.find((r) => r.status === 200).data;
  assert.equal(
    (
      await request(`/api/applications/${win.id}/approve`, {
        method: "POST",
        session: employer,
      })
    ).status,
    200,
  );
  assert.equal(
    check(
      await admin.from("jobs").select("approved_count").eq("id", id).single(),
    ).approved_count,
    1,
  );
  pass("repeat approval does not double-count");
  const visible = await request("/api/jobs?limit=50");
  assert.ok(!visible.data.jobs.some((j) => j.id === id));
  pass("filled shift disappears from available search");
  const own = await request("/api/me/applications", { session: worker });
  assert.ok(own.data.some((a) => a.job_id === id));
  const foreign = check(
    await worker2.client
      .from("applications")
      .select("*")
      .eq("worker_id", application.data.worker_id),
  );
  assert.equal(foreign.length, 0);
  pass("workers see own applications and RLS hides others");
  const prohibited = await worker.client
    .from("profiles")
    .update({ role: "ADMIN" })
    .eq("id", application.data.worker_id);
  assert.ok(prohibited.error);
  pass("direct REST role escalation blocked");
  const wageEdit = await worker.client
    .from("jobs")
    .update({ daily_wage_lkr: 1 })
    .eq("id", id)
    .select("id");
  assert.equal(wageEdit.data?.length ?? 0, 0);
  pass("direct REST worker job edit blocked");
  const withdrawalJob = await request("/api/jobs", {
    method: "POST",
    session: employer,
    body: { ...job, title: "Integration withdrawal" },
  });
  const withdrawalId = withdrawalJob.data.id;
  const wa = await request(`/api/jobs/${withdrawalId}/apply`, {
    method: "POST",
    session: worker,
  });
  assert.equal(
    (
      await request(`/api/applications/${wa.data.id}/withdraw`, {
        method: "POST",
        session: worker,
      })
    ).data.status,
    "WITHDRAWN",
  );
  pass("worker withdrawal before cutoff");
  check(
    await admin
      .from("jobs")
      .update({
        application_cutoff_at: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", withdrawalId),
  );
  assert.equal(
    (
      await request(`/api/jobs/${withdrawalId}/apply`, {
        method: "POST",
        session: worker2,
      })
    ).status,
    409,
  );
  pass("query and mutation enforce cutoff");
  check(await admin.from("jobs").delete().in("id", [id, withdrawalId]));
  console.log(`Integration checks passed: ${count}`);
} finally {
  for (const id of created) check(await admin.auth.admin.deleteUser(id));
}
