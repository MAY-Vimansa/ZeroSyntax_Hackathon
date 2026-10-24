import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";
import {
  completeTestCaptcha,
  localCaptchaOptions,
} from "./captcha-test-helpers.mjs";
config({ path: ".env.local", quiet: true });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
for (const target of [base, url])
  if (!["127.0.0.1", "localhost"].includes(new URL(target).hostname))
    throw new Error(
      "Admin acceptance is restricted to the local fictional stack.",
    );
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const expect = baseExpect.configure({ timeout: 20000 });
const created = [],
  targets = [],
  checks = [],
  browserErrors = [];
let browser;
function check(result) {
  if (result.error) throw result.error;
  return result.data;
}
function pass(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
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
    cookie: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}
async function request(path, actor, body, origin) {
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: origin ?? new URL(base).origin,
      ...(actor ? { cookie: actor.cookie() } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    cache: response.headers.get("cache-control"),
    ...(await response.json()),
  };
}
async function fixtureUser(role) {
  const email = `admin-acceptance-${role.toLowerCase()}-${Date.now()}@flexirova.example`;
  const user = check(
    await service.auth.admin.createUser({
      email,
      password: "FlexiRova!2026",
      email_confirm: true,
      user_metadata: {
        role,
        display_name:
          role === "WORKER"
            ? "Admin acceptance Nimali"
            : `Admin acceptance ${role.toLowerCase()}`,
      },
    }),
  ).user;
  created.push(user.id);
  return { ...user, session: await session(email) };
}
async function axe(page, label) {
  const result = await new AxeBuilder({ page })
    .include(".admin-app")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    label,
  );
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "No page-level horizontal overflow",
  );
}
await mkdir("artifacts/admin", { recursive: true });
try {
  const admin = await session("admin@flexirova.example");
  const employer = await fixtureUser("EMPLOYER");
  const worker = await fixtureUser("WORKER");
  const forged = await fixtureUser("ADMIN");
  const forgedProfile = check(
    await service.from("profiles").select("role").eq("id", forged.id).single(),
  );
  assert.equal(forgedProfile.role, "WORKER");
  pass("Signup metadata cannot provision administrators");
  const company = check(
    await service
      .from("companies")
      .insert({
        owner_id: employer.id,
        name: "Admin acceptance company",
        description:
          "Fictional acceptance fixture for administrative review; removed after testing.",
        contact_email: employer.email,
        city: "Colombo",
        district: "Colombo",
      })
      .select()
      .single(),
  );
  targets.push(company.id);
  const job = check(
    await service
      .from("jobs")
      .insert({
        company_id: company.id,
        created_by: employer.id,
        title: "Admin acceptance listing",
        description:
          "Fictional administrative acceptance fixture, not a real vacancy.",
        category: "warehouse",
        daily_wage_lkr: 3500,
        shift_start_at: new Date(Date.now() + 172800000).toISOString(),
        shift_end_at: new Date(Date.now() + 201600000).toISOString(),
        application_cutoff_at: new Date(Date.now() + 86400000).toISOString(),
        required_workers: 3,
        location_name: "Demo warehouse",
        city: "Colombo",
        district: "Colombo",
        latitude: 6.9271,
        longitude: 79.8612,
        status: "PUBLISHED",
      })
      .select()
      .single(),
  );
  targets.push(job.id);
  check(await worker.session.client.rpc("apply_job", { target: job.id }));
  assert.equal((await request("/api/admin")).status, 401);
  for (const actor of [worker.session, employer.session, forged.session]) {
    assert.equal((await request("/api/admin", actor)).status, 403);
    assert.ok(
      (await actor.client.rpc("admin_dashboard", { period_days: 30 })).error,
    );
    assert.ok(
      (
        await actor.client.rpc("admin_moderate", {
          target: company.id,
          operation: "VERIFY_COMPANY",
          expected_status: "UNVERIFIED",
          review_note: "Unauthorized decision must be denied.",
        })
      ).error,
    );
  }
  pass(
    "Anonymous, worker, employer, and forged-admin access denied at API and database boundaries",
  );
  const snapshot = await request("/api/admin?days=30", admin);
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.data.trend.length, 30);
  assert.ok(snapshot.cache.includes("no-store"));
  for (const [table, field, role] of [
    ["profiles", "workers", "WORKER"],
    ["profiles", "employers", "EMPLOYER"],
    ["jobs", "jobs"],
    ["applications", "applications"],
  ]) {
    let query = service
      .from(table)
      .select("id", { count: "exact", head: true });
    if (role) query = query.eq("role", role);
    const result = await query;
    check(result);
    assert.equal(snapshot.data.totals[field], result.count);
  }
  assert.equal(
    (await request("/api/admin?days=7", admin)).data.trend.length,
    7,
  );
  assert.equal((await request("/api/admin?days=365", admin)).status, 422);
  assert.ok(
    (await admin.client.rpc("admin_dashboard", { period_days: null })).error,
  );
  assert.ok(
    (
      await admin.client.rpc("admin_moderate", {
        target: company.id,
        operation: "VERIFY_COMPANY",
        expected_status: null,
        review_note: "Null state must not bypass a fresh review.",
      })
    ).error,
  );
  assert.ok(
    (
      await admin.client.rpc("admin_moderate", {
        target: company.id,
        operation: "VERIFY_COMPANY",
        expected_status: "UNVERIFIED",
        review_note: null,
      })
    ).error,
  );
  pass(
    "Private snapshot totals match independent database counts; 7/30-day ranges and validation work",
  );
  const body = {
    id: company.id,
    action: "VERIFY_COMPANY",
    expectedStatus: "UNVERIFIED",
    note: "Reviewed fictional company details for acceptance.",
  };
  assert.equal((await request("/api/admin", worker.session, body)).status, 403);
  assert.equal(
    (await request("/api/admin", admin, body, "https://foreign.example"))
      .status,
    403,
  );
  assert.equal(
    (await request("/api/admin", admin, { ...body, note: "short" })).status,
    422,
  );
  assert.equal(
    (await request("/api/admin", admin, { ...body, action: "DELETE_USER" }))
      .status,
    422,
  );
  assert.equal((await request("/api/admin", admin, body)).status, 200);
  assert.equal((await request("/api/admin", admin, body)).status, 409);
  assert.equal(
    (
      await request("/api/admin", admin, {
        ...body,
        action: "UNVERIFY_COMPANY",
        expectedStatus: "VERIFIED",
      })
    ).status,
    200,
  );
  assert.equal(
    check(
      await service
        .from("admin_audit_log")
        .select("id")
        .eq("target_id", company.id),
    ).length,
    2,
  );
  assert.ok(
    (
      await admin.client
        .from("admin_audit_log")
        .delete()
        .eq("target_id", company.id)
    ).error,
  );
  assert.equal(
    check(await worker.session.client.from("admin_audit_log").select("id"))
      .length,
    0,
  );
  pass(
    "Moderation rejects invalid input, cross-origin requests, and stale state; writes one protected audit entry per decision",
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => browserErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|Minified React/i.test(m.text()))
      browserErrors.push(m.text());
  });
  await page.goto(`${base}/admin`);
  await expect(
    page.getByRole("heading", { name: "Your admin workspace awaits." }),
  ).toBeVisible();
  assert.equal(await page.locator(".ad-metrics").count(), 0);
  pass("Signed-out admin page reveals no platform data");
  await page.getByRole("link", { name: "Admin sign in" }).click();
  await page.getByLabel("Email address").fill("admin@flexirova.example");
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await completeTestCaptcha(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(`${base}/admin`);
  await expect(
    page.getByRole("heading", { name: "Platform overview" }),
  ).toBeVisible();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  await page.getByLabel("Reporting period").selectOption("7");
  await expect(page.locator(".ad-bar-column")).toHaveCount(7);
  await page.getByLabel("Reporting period").selectOption("30");
  await expect(page.locator(".ad-bar-column")).toHaveCount(30);
  await page.getByRole("button", { name: "View chart data" }).click();
  await expect(
    page.getByText("Daily registrations and applications", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide chart data" }).click();
  pass(
    "Real CAPTCHA login routes admins correctly; date ranges and accessible chart data work",
  );
  await page.locator(".ad-metric.red").click();
  await expect(
    page.getByRole("heading", { name: "Your community" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Workers", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  await page.getByRole("button", { name: /^Review \d+ companies$/ }).click();
  await expect(
    page.getByRole("heading", { name: "Company directory" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Needs review", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  pass(
    "Metric and notification links retain the intended record filter across navigation",
  );
  await page.getByLabel("Search admin records").fill("Admin acceptance");
  await expect(
    page.getByRole("heading", { name: "Search results" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Users", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Users" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your community" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workers", exact: true }).click();
  await page.getByLabel("Search admin records").fill("Admin acceptance Nimali");
  await expect(page.locator(".ad-table tbody tr")).toHaveCount(1);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  const download = await downloadEvent;
  const downloadPath = "artifacts/admin/filtered-workers.csv";
  await download.saveAs(downloadPath);
  const csv = await readFile(downloadPath, "utf8");
  assert.ok(csv.includes("Admin acceptance Nimali"));
  assert.ok(!csv.includes("Admin acceptance employer"));
  await page
    .getByLabel("Search admin records")
    .fill("no-such-record-zebrafish");
  await expect(
    page.getByRole("heading", { name: "No records found" }),
  ).toBeVisible();
  pass(
    "Global search, role filters, empty results, and filtered CSV download work",
  );
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Companies" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Company directory" }),
  ).toBeVisible();
  await page.getByLabel("Search admin records").fill(company.name);
  await expect(page.locator(".ad-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verify company", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Review note")
    .fill("Reviewed the fictional acceptance company's business details.");
  await page
    .getByRole("button", { name: "Verify company", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".ad-table .ad-badge")).toHaveText("Verified");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  pass(
    "Company review requires a note, persists verification, updates the UI, and supports keyboard dismissal",
  );
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Job listings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Job listings", exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Search admin records").fill(job.title);
  await expect(page.locator(".ad-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: `Review ${job.title}`, exact: true })
    .click();
  await page
    .getByLabel("Review note")
    .fill("Closing fictional acceptance listing after verifying moderation.");
  await page
    .getByRole("button", { name: "Close listing", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".ad-table .ad-badge")).toHaveText("Closed");
  assert.ok(
    (await forged.session.client.rpc("apply_job", { target: job.id })).error,
  );
  check(await service.from("profiles").delete().eq("id", forged.id));
  assert.ok(
    (await forged.session.client.rpc("admin_dashboard", { period_days: 30 }))
      .error,
  );
  assert.ok(
    (
      await forged.session.client.rpc("admin_moderate", {
        target: company.id,
        operation: "UNVERIFY_COMPANY",
        expected_status: "VERIFIED",
        review_note: "A missing profile must not pass authorization.",
      })
    ).error,
  );
  assert.equal(
    check(await service.from("applications").select("id").eq("job_id", job.id))
      .length,
    1,
  );
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Activity log" })
    .click();
  await expect(
    page.getByText(
      "Closing fictional acceptance listing after verifying moderation.",
    ),
  ).toBeVisible();
  pass(
    "Job closure stops new applications, preserves existing applications, and appears in the audit trail",
  );
  for (const target of targets)
    check(
      await service.from("admin_audit_log").delete().eq("target_id", target),
    );
  for (const id of created.splice(0))
    check(await service.auth.admin.deleteUser(id));
  targets.length = 0;
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  await page.reload();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  for (const mode of ["light", "dark"]) {
    const current = await page.locator("html").getAttribute("data-theme");
    if (current !== mode)
      await page
        .getByRole("button", { name: `Use ${mode} theme`, exact: true })
        .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
    await page.mouse.move(250, 80);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/screenshots/admin-${mode}-desktop.png`,
      fullPage: true,
    });
    await noOverflow(page);
    await axe(page, `${mode} desktop accessibility`);
  }
  pass(
    "Desktop light/dark layouts have no page overflow or detected WCAG A/AA violations",
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await noOverflow(page);
  await page.screenshot({
    path: "docs/screenshots/admin-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await axe(page, "mobile dark accessibility");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Users" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your community" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await expect(page.locator(".ad-metric")).toHaveCount(4);
  await page.screenshot({
    path: "docs/screenshots/admin-dark-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Use light theme" }).click();
  await noOverflow(page);
  await axe(page, "mobile light accessibility");
  await page.screenshot({
    path: "docs/screenshots/admin-light-mobile.png",
    fullPage: true,
  });
  pass(
    "Tablet and mobile layouts, mobile navigation, and both mobile themes verified",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL(`${base}/login`);
  assert.equal((await page.request.get(`${base}/api/admin`)).status(), 401);
  pass("Signing out revokes admin workspace access");
  assert.deepEqual(browserErrors, []);
  pass("No captured browser runtime or hydration errors");
  await writeFile(
    "artifacts/admin/results.json",
    JSON.stringify(
      { checks, browserErrors, checkedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`Admin acceptance checks passed: ${checks.length}`);
} finally {
  for (const target of targets)
    check(
      await service.from("admin_audit_log").delete().eq("target_id", target),
    );
  for (const id of created) check(await service.auth.admin.deleteUser(id));
  await browser?.close();
}
