import { chromium, expect as baseExpect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  completeTestCaptcha,
  localCaptchaOptions,
} from "./captcha-test-helpers.mjs";

localCaptchaOptions();
const expect = baseExpect.configure({ timeout: 30000 });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const checks = [],
  errors = [],
  created = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir("artifacts/captcha", { recursive: true });
function pass(label) {
  checks.push(label);
  console.log(`PASS ${label}`);
}
try {
  for (const role of ["WORKER", "EMPLOYER"]) {
    for (const options of [{}, { captchaToken: "FAKE-TOKEN" }]) {
      const { data, error } = await anon.auth.signUp({
        email: `captcha-reject-${role.toLowerCase()}-${Date.now()}@flexirova.example`,
        password: "FlexiRova!2026",
        options: {
          ...options,
          data: { role, display_name: "Rejected CAPTCHA Fixture" },
        },
      });
      if (data.user) created.push(data.user.id);
      assert.equal(error?.code, "captcha_failed");
      assert.equal(data.user, null);
    }
    pass(
      `Supabase rejects direct ${role} signups with missing and invalid tokens`,
    );
  }
  const { error: loginError } = await anon.auth.signInWithPassword({
    email: "worker@flexirova.example",
    password: "FlexiRova!2026",
  });
  assert.equal(loginError?.code, "captcha_failed");
  pass("Supabase also enforces CAPTCHA for password login");

  for (const [role, width, theme] of [
    ["WORKER", 1440, "dark"],
    ["EMPLOYER", 390, "light"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 1100 },
    });
    await context.addCookies([
      { name: "flexirova-theme", value: theme, url: base },
    ]);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/register?role=${role}`);
    const submit = page.getByRole("button", {
      name: "Create your account",
      exact: true,
    });
    const email = `captcha-${role.toLowerCase()}-${Date.now()}@flexirova.example`;
    await page
      .getByLabel("Full name", { exact: true })
      .fill(`Fictional ${role} CAPTCHA Test`);
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
    await expect(submit).toBeDisabled();
    await expect(page.getByText("hCaptcha is for testing only.")).toBeVisible();
    await completeTestCaptcha(page);
    await expect(submit).toBeEnabled();
    await expect(page.locator(".captcha-preview-check input")).toBeChecked();
    await page.locator(".captcha-preview-check input").uncheck();
    await expect(submit).toBeDisabled();
    await completeTestCaptcha(page);
    await expect(submit).toBeEnabled();
    await expect(page.locator('iframe[title*="checkbox"]:visible')).toHaveCount(
      0,
    );
    if (role === "WORKER") {
      await page
        .getByRole("button", { name: "I’m hiring workers", exact: true })
        .click();
      await expect(submit).toBeDisabled();
      await page
        .getByRole("button", { name: "I’m looking for work", exact: true })
        .click();
      await expect(submit).toBeDisabled();
      await completeTestCaptcha(page);
      await expect(submit).toBeEnabled();
      pass(
        "changing registration role clears verification, including switching back",
      );
      await page.locator(".theme-toggle").click();
      await expect(submit).toBeDisabled();
      await page.locator(".theme-toggle").click();
      await completeTestCaptcha(page);
      await expect(submit).toBeEnabled();
      for (const locale of ["si", "ta"]) {
        await page.getByLabel("Language / භාෂාව / மொழி").selectOption(locale);
        await expect(page.locator("form button[type=submit]")).toBeDisabled();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await page.getByLabel("Language / භාෂාව / மொழி").selectOption("en");
      await completeTestCaptcha(page);
      await expect(submit).toBeEnabled();
      pass(
        "theme and language changes require fresh verification; translated forms fit",
      );
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `artifacts/captcha/register-${role.toLowerCase()}-${theme}.png`,
      fullPage: true,
    });
    await submit.click();
    await expect(
      page.getByText("Check your email to verify your account, then log in."),
    ).toBeVisible();
    await expect(page.locator("form button[type=submit]")).toBeDisabled();
    const users = await admin.auth.admin.listUsers({ perPage: 1000 });
    assert.ifError(users.error);
    const user = users.data.users.find((user) => user.email === email);
    assert.ok(user);
    created.push(user.id);
    assert.equal(user.user_metadata.role, role);
    assert.ok(!user.email_confirmed_at);
    pass(
      `${role} checkbox signup works at ${width}px in ${theme} theme; token resets and email verification remains required`,
    );
    await context.close();
  }

  const context = await browser.newContext({
    viewport: { width: 320, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/login`);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("worker@flexirova.example");
  await page.getByLabel("Password", { exact: true }).fill("Incorrect!Password");
  const login = page.getByRole("button", { name: "Log in", exact: true });
  await expect(login).toBeDisabled();
  await completeTestCaptcha(page);
  await expect(login).toBeEnabled();
  await login.click();
  await expect(page.locator(".form-error")).toBeVisible();
  await expect(login).toBeDisabled();
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await completeTestCaptcha(page);
  await login.click();
  await page.waitForURL("**/applications");
  pass("failed login clears token; fresh checkbox allows login at 320px");
  await context.close();
  assert.deepEqual(errors, []);
  pass("no captured browser runtime exceptions");
  await writeFile(
    "artifacts/captcha/results.json",
    JSON.stringify(
      {
        checks,
        errors,
        mode: "official hCaptcha test keys; no real bot protection",
      },
      null,
      2,
    ),
  );
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  await browser.close();
}
