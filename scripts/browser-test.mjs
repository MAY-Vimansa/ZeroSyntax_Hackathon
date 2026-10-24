import { chromium, expect as baseExpect } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Browser tests require a local application URL.");
if (
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error("Browser tests require local Supabase.");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [],
  checks = [],
  cleanupJobs = [];
let signupId;
await mkdir("docs/screenshots", { recursive: true });
await mkdir("artifacts", { recursive: true });
function pass(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}
async function pageFor(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrated|Minified React error/i.test(message.text())
    )
      errors.push(message.text());
  });
  return { context, page };
}
async function login(page, email) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"));
}
try {
  const { page, context } = await pageFor();
  if (process.env.TEST_AUTH_ONLY !== "true") {
    await page.goto(base);
    await expect(
      page.getByRole("heading", {
        name: "Your next shift. Closer than you think.",
      }),
    ).toBeVisible();
    await expect(
      page.locator(".stats-strip").getByText("10", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/home-desktop.png" });
    pass("desktop homepage renders database-derived statistics");
    await page
      .getByRole("button", { name: "Light theme", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({ path: "docs/screenshots/home-light.png" });
    await page.getByRole("button", { name: "Dark theme", exact: true }).click();
    pass("light and dark themes work");
    const keyboardPage = await context.newPage();
    await keyboardPage.goto(base);
    await expect(keyboardPage.locator(".hero-job .job-card")).toBeVisible();
    await keyboardPage.keyboard.press("Tab");
    await expect(
      keyboardPage.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await keyboardPage.keyboard.press("Enter");
    expect(new URL(keyboardPage.url()).hash).toBe("#main");
    await keyboardPage.close();
    pass("keyboard skip navigation works");
    await page.goto(`${base}/jobs`);
    await page.getByLabel("Minimum pay (LKR)").fill("3400");
    await page
      .locator(".filter-panel")
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(page.locator(".job-card")).toHaveCount(1);
    await expect(page.locator(".job-card")).toContainText("Event Setup Crew");
    pass("wage filtering updates real job results");
    await page.goto(`${base}/jobs?query=impossible-zebrafish-title`);
    await expect(
      page.getByRole("heading", { name: "No shifts match just yet" }),
    ).toBeVisible();
    pass("empty search state");
    await page.goto(`${base}/jobs/00000000-0000-4000-8000-000000000001`);
    await page.getByLabel("Estimated transport cost (LKR)").fill("500");
    await expect(page.locator(".travel-result strong")).toContainText("2,500");
    pass("user-entered travel calculation");
    await page.goto(`${base}/assistant`);
    await expect(
      page.getByText("AI not configured", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("textarea")).toHaveCount(0);
    pass("assistant clearly unavailable and contains no fake chat");
    const mobile = await pageFor({ width: 390, height: 844 });
    await mobile.page.goto(base);
    await expect(
      mobile.page.getByRole("heading", {
        name: "Your next shift. Closer than you think.",
      }),
    ).toBeVisible();
    await expect(mobile.page.locator(".hero-job .job-card")).toBeVisible();
    await mobile.page.screenshot({ path: "docs/screenshots/home-mobile.png" });
    expect(
      await mobile.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    pass("390px mobile homepage fits without horizontal overflow");
    for (const locale of ["si", "ta"]) {
      await mobile.page
        .getByLabel("Language / භාෂාව / மொழி")
        .selectOption(locale);
      await expect(mobile.page.locator("html")).toHaveAttribute("lang", locale);
      await expect(mobile.page.locator(".hero h1")).not.toContainText(
        "Your next shift",
      );
      expect(
        await mobile.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await mobile.page.screenshot({
        path: `docs/screenshots/home-${locale}.png`,
      });
    }
    pass("Sinhala and Tamil interfaces render on mobile");
    await mobile.context.close();
    const tablet = await pageFor({ width: 768, height: 1024 });
    await tablet.page.goto(`${base}/jobs`);
    await expect(tablet.page.locator(".job-card").first()).toBeVisible();
    expect(
      await tablet.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    pass("768px tablet job browser fits");
    await tablet.context.close();
    const denied = await pageFor({ width: 390, height: 844 });
    await denied.context.addInitScript(() => {
      window.__geoCalls = 0;
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: (_success, error) => {
            window.__geoCalls++;
            error({ code: 1 });
          },
        },
      });
    });
    await denied.page.goto(`${base}/jobs/near-me`);
    await expect(
      denied.page.getByRole("heading", { name: "Choose an area to begin" }),
    ).toBeVisible();
    expect(await denied.page.evaluate(() => window.__geoCalls)).toBe(0);
    await denied.page.getByRole("button", { name: "Use my location" }).click();
    await expect(
      denied.page.getByText(
        "Location unavailable. Please select a district instead.",
      ),
    ).toBeVisible();
    await denied.page
      .getByRole("button", { name: "Refine your search" })
      .click();
    await denied.page
      .getByLabel("District", { exact: true })
      .selectOption("Colombo");
    await denied.page
      .locator(".filter-panel")
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(denied.page.locator(".job-card").first()).toBeVisible();
    pass("simulated denied geolocation offers working manual district search");
    await denied.context.close();
    const located = await pageFor();
    await located.context.addInitScript(() => {
      window.__geoCalls = 0;
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: (success) => {
            window.__geoCalls++;
            success({ coords: { latitude: 6.9271, longitude: 79.8612 } });
          },
        },
      });
    });
    await located.page.goto(`${base}/jobs/near-me`);
    expect(await located.page.evaluate(() => window.__geoCalls)).toBe(0);
    await located.page.getByRole("button", { name: "Use my location" }).click();
    await expect(
      located.page.getByText("Location on", { exact: true }),
    ).toBeVisible();
    await expect(located.page.locator(".job-card").first()).toBeVisible();
    await located.page.getByLabel("Search radius").selectOption("5");
    await located.page
      .locator(".filter-panel")
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await expect(located.page.locator(".distance").first()).toContainText("km");
    expect(
      await located.page.evaluate(() =>
        Object.entries(localStorage).some(
          ([k, v]) => k.includes("location") || v.includes("6.9271"),
        ),
      ),
    ).toBe(false);
    pass("simulated location is requested only on click and is not persisted");
    await located.context.close();
    const employer = await pageFor();
    await login(employer.page, "employer@flexirova.example");
    await expect(
      employer.page.getByRole("heading", { name: "Welcome back, Ravi." }),
    ).toBeVisible();
    await expect(
      employer.page.locator(".dashboard-jobs .job-row").first(),
    ).toBeVisible();
    await employer.page.screenshot({
      path: "docs/screenshots/employer-dashboard.png",
    });
    await employer.page.goto(`${base}/employer/jobs/new`);
    const title = "Packing & Sorting · Demo Shift";
    await employer.page.getByLabel("Job title", { exact: true }).fill(title);
    await employer.page
      .getByLabel("Description", { exact: true })
      .fill(
        "Fictional QA shift for packing and sorting. No real employment opportunity.",
      );
    await employer.page.getByLabel("Workers needed", { exact: true }).fill("1");
    const day = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    await employer.page
      .getByLabel("Start time", { exact: true })
      .fill(`${day}T09:00`);
    await employer.page
      .getByLabel("End time", { exact: true })
      .fill(`${day}T17:00`);
    await employer.page
      .getByLabel("Daily wage (LKR)", { exact: true })
      .fill("3000");
    await employer.page
      .getByLabel("Payment terms", { exact: true })
      .fill("Demo fixture only");
    await employer.page
      .getByLabel("Workplace address", { exact: true })
      .fill("Fictional demo workplace in Colombo");
    await employer.page.getByLabel("Latitude", { exact: true }).fill("6.9271");
    await employer.page
      .getByLabel("Longitude", { exact: true })
      .fill("79.8612");
    await employer.page
      .getByRole("button", { name: "Publish shift", exact: true })
      .click();
    await employer.page.waitForURL(/\/employer\/jobs\/[0-9a-f-]+$/);
    const id = employer.page.url().split("/").pop();
    cleanupJobs.push(id);
    pass("employer publishes a shift through the actual form");
    const worker = await pageFor({ width: 390, height: 844 });
    await login(worker.page, "worker@flexirova.example");
    await worker.page.goto(`${base}/jobs/${id}`);
    await worker.page
      .getByRole("button", { name: "Apply for this shift" })
      .click();
    await worker.page.waitForURL("**/applications");
    await expect(
      worker.page.locator(".application-card").filter({ hasText: title }),
    ).toContainText("Pending");
    await employer.page.reload();
    await employer.page
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await expect(employer.page.locator(".applicant")).toContainText("Approved");
    await worker.page.reload();
    await expect(
      worker.page.locator(".application-card").filter({ hasText: title }),
    ).toContainText("Approved");
    await worker.page.screenshot({
      path: "docs/screenshots/worker-applications.png",
    });
    pass(
      "worker applies, employer approves, and worker sees approval in browser",
    );
    await worker.context.close();
    await employer.context.close();
  }
  await page.goto(`${base}/register`);
  const signupEmail = `browser-signup-${Date.now()}@flexirova.example`;
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Fictional Signup Worker");
  await page.getByLabel("Email address", { exact: true }).fill(signupEmail);
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(
    page.getByText("Check your email to verify your account, then log in."),
  ).toBeVisible();
  const listed = await admin.auth.admin.listUsers({ perPage: 1000 });
  signupId = listed.data.users.find((u) => u.email === signupEmail)?.id;
  expect(signupId).toBeTruthy();
  expect(
    listed.data.users.find((u) => u.id === signupId).email_confirmed_at,
  ).toBeFalsy();
  const mailResponse = await fetch(
    `http://127.0.0.1:55324/api/v1/search?query=${encodeURIComponent(`to:${signupEmail}`)}`,
  );
  const mailbox = await mailResponse.json();
  expect(mailbox.messages.length).toBeGreaterThan(0);
  const mail = await fetch(
    `http://127.0.0.1:55324/api/v1/message/${mailbox.messages[0].ID}`,
  ).then((r) => r.json());
  const verify = mail.Text.match(/https?:\/\/[^\s<>]+/)?.[0];
  expect(verify).toContain("/auth/v1/verify");
  await page.goto(verify);
  await expect(
    page.getByRole("heading", { name: "Your profile, your next opportunity." }),
  ).toBeVisible();
  expect(
    (await admin.auth.admin.getUserById(signupId)).data.user.email_confirmed_at,
  ).toBeTruthy();
  pass(
    "registration and real local email-verification link complete successfully",
  );
  await context.close();
  expect(errors).toEqual([]);
  pass("no browser runtime exceptions");
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(`Browser checks passed: ${checks.length}`);
} finally {
  for (const id of cleanupJobs) await admin.from("jobs").delete().eq("id", id);
  if (signupId) await admin.auth.admin.deleteUser(signupId);
  await browser.close();
}
