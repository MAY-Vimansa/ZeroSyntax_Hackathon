import { chromium, expect as baseExpect } from "@playwright/test";
import { config } from "dotenv";
import { createServerClient } from "@supabase/ssr";
import { mkdir, writeFile } from "node:fs/promises";
import { localCaptchaOptions } from "./captcha-test-helpers.mjs";
config({ path: ".env.local", quiet: true });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
for (const url of [base, process.env.NEXT_PUBLIC_SUPABASE_URL]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("AI browser checks require local demo services.");
}
const expect = baseExpect.configure({ timeout: 20000 });
const jar = new Map();
const client = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) =>
        items.forEach(({ name, value }) => jar.set(name, value)),
    },
  },
);
const login = await client.auth.signInWithPassword({
  email: "worker@flexirova.example",
  password: "FlexiRova!2026",
  options: localCaptchaOptions(),
});
if (login.error) throw new Error(`Demo login failed: ${login.error.code}`);
await mkdir("artifacts/ai", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
await context.addCookies(
  [...jar].map(([name, value]) => ({
    name,
    value,
    url: base,
    httpOnly: true,
    sameSite: "Lax",
  })),
);
const page = await context.newPage();
const errors = [];
const checks = [];
const result = {
  liveAI: "not_tested",
  liveError: null,
  checks,
  browserErrors: errors,
};
page.on("pageerror", (error) => errors.push(error.message));
function pass(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}
async function fits() {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
try {
  await page.goto(`${base}/assistant`);
  const input = page.getByLabel("Describe the work you want");
  await expect(input).toBeEnabled();
  await input.fill("Find packing jobs in Colombo paying at least Rs. 3000.");
  const liveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/ai/chat") &&
      response.request().method() === "POST",
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const response = await liveResponse;
  const body = await response.json();
  if (response.ok()) {
    expect(body.data.jobs.length).toBeGreaterThan(0);
    expect(
      body.data.jobs.every(
        (job) => job.daily_wage_lkr >= 3000 && job.city === "Colombo",
      ),
    ).toBe(true);
    await expect(
      page.locator(".assistant-jobs .job-card").first(),
    ).toBeVisible();
    result.liveAI = "passed";
    pass("real OpenAI request returned matching database jobs");
  } else {
    result.liveAI = "blocked";
    result.liveError = body.error?.code;
    expect(body.error?.code).toBe("AI_QUOTA_EXCEEDED");
    await expect(page.locator(".assistant-error")).toContainText(
      "no available quota or credits",
    );
    await expect(page.locator(".assistant-jobs")).toHaveCount(0);
    pass("real provider quota error is visible with no fabricated AI answer");
  }
  await fits();
  await page.screenshot({
    path: "artifacts/ai/assistant-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await fits();
  await page.screenshot({
    path: "artifacts/ai/assistant-mobile.png",
    fullPage: true,
  });
  pass("desktop dark and phone light layouts fit the viewport");

  // Explicit browser fixture: validates rendering only, never counts as live AI success.
  const jobs = await (
    await context.request.get(
      `${base}/api/jobs?category=warehouse&city=Colombo&minWage=3000&limit=6`,
    )
  ).json();
  await context.route("**/api/ai/chat", (route) =>
    route.fulfill({
      json: {
        data: {
          message: "Browser fixture: matching database listings.",
          jobs: jobs.data.jobs,
          total: jobs.data.total,
          filters: { category: "warehouse", city: "Colombo", minWage: 3000 },
          skills: ["packing"],
          needsLocation: false,
        },
      },
    }),
  );
  await input.fill("Find packing work.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator(".assistant-jobs .job-card").first()).toContainText(
    "Warehouse Packing Assistant",
  );
  await expect(page.locator(".assistant-turn.assistant").last()).toContainText(
    "Matching skills: packing",
  );
  await fits();
  await page.screenshot({
    path: "artifacts/ai/assistant-results-fixture-mobile.png",
    fullPage: true,
  });
  pass(
    "explicit UI fixture renders actual database job cards and matching skills on phone",
  );
  for (const locale of ["si", "ta"]) {
    await page.getByLabel("Language / භාෂාව / மொழி").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".assistant-page h1")).not.toContainText(
      "Find your next shift",
    );
    await fits();
  }
  pass("Sinhala and Tamil assistant controls fit on phone");
  await page.getByLabel("Language / භාෂාව / மொழி").selectOption("en");
  await context.unroute("**/api/ai/chat");
  await page.goto(`${base}/profile`);
  const originalSkills = await page.locator('[name="skills"]').inputValue();
  const originalBio = await page.locator('[name="bio"]').inputValue();
  // Second real provider request exercises the skill route, without saving a profile.
  await page
    .locator('[name="bio"]')
    .fill("I pack parcels and sort warehouse stock.");
  const skillResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/ai/extract-skills") &&
      r.request().method() === "POST",
    { timeout: 45000 },
  );
  await page.getByRole("button", { name: "Extract skills with AI" }).click();
  const skill = await skillResponse;
  if (!skill.ok()) {
    expect((await skill.json()).error.code).toBe("AI_QUOTA_EXCEEDED");
    await expect(page.locator(".assistant-error")).toContainText(
      "no available quota or credits",
    );
  } else {
    expect((await skill.json()).data.skills.length).toBeGreaterThan(0);
  }
  await page.screenshot({
    path: "artifacts/ai/profile-live.png",
    fullPage: true,
  });
  pass(
    "skill extraction calls the real endpoint and displays its actual outcome",
  );
  await context.route("**/api/ai/extract-skills", (route) =>
    route.fulfill({ json: { data: { skills: ["parcel packing"] } } }),
  );
  await page.getByRole("button", { name: "Extract skills with AI" }).click();
  await expect(page.locator('[name="skills"]')).toHaveValue(/parcel packing/);
  await page.reload();
  await expect(page.locator('[name="skills"]')).toHaveValue(originalSkills);
  await expect(page.locator('[name="bio"]')).toHaveValue(originalBio);
  pass(
    "explicit UI fixture adds suggestions to the form without automatically changing saved profile data",
  );
  expect(errors).toEqual([]);
} finally {
  await writeFile(
    "artifacts/ai/browser-results.json",
    JSON.stringify(result, null, 2),
  );
  await browser.close();
  await client.auth.signOut({ scope: "local" });
}
console.log(JSON.stringify(result));
