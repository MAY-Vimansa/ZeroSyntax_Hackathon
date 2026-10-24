import { chromium, expect as baseExpect } from "@playwright/test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
import {
  completeTestCaptcha,
  localCaptchaOptions,
} from "./captcha-test-helpers.mjs";
config({ path: ".env.local", quiet: true });
localCaptchaOptions();
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Account tests require a local app.");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const created = [],
  errors = [];
let checks = 0;
function pass(label) {
  checks++;
  console.log(`PASS ${label}`);
}
async function pageFor(width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page };
}
async function userFor(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  expect(user).toBeTruthy();
  return user;
}
async function fillLogin(page, email, password = "FlexiRova!2026") {
  await page.goto(base + "/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await completeTestCaptcha(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}
async function signup(page, email, employer = false) {
  await page.goto(base + "/register");
  if (employer)
    await page
      .getByRole("button", { name: "I’m hiring workers", exact: true })
      .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill(employer ? "Fictional Employer" : "Fictional Worker");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await completeTestCaptcha(page);
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  const user = await userFor(email);
  created.push(user.id);
  expect(user.email_confirmed_at).toBeFalsy();
  return user;
}
async function verificationLink(email) {
  const inbox = await fetch(
    `http://127.0.0.1:55324/api/v1/search?query=${encodeURIComponent("to:" + email)}`,
  ).then((r) => r.json());
  expect(inbox.messages.length).toBeGreaterThan(0);
  const mail = await fetch(
    `http://127.0.0.1:55324/api/v1/message/${inbox.messages[0].ID}`,
  ).then((r) => r.json());
  const link = mail.Text.match(/https?:\/\/[^\s<>]+/)?.[0];
  expect(link).toContain("/auth/v1/verify");
  return link;
}
try {
  await mkdir("docs/screenshots", { recursive: true });
  const worker = await pageFor(390),
    workerEmail = `account-worker-${Date.now()}@flexirova.example`;
  const workerUser = await signup(worker.page, workerEmail);
  await expect(
    worker.page.getByText(/are NOT sent to Gmail or Outlook/),
  ).toBeVisible();
  await expect(
    worker.page.getByRole("link", { name: "Open local email inbox" }),
  ).toBeVisible();
  pass(
    "worker registration exposes the required verification step and local inbox",
  );
  const recovery = await pageFor(390);
  await fillLogin(recovery.page, workerEmail, "WrongPassword!2026");
  await expect(
    recovery.page.locator('.auth-form [role="alert"]'),
  ).toContainText("The email or password is incorrect");
  pass("incorrect password shows the correct error");
  await fillLogin(recovery.page, workerEmail);
  await expect(
    recovery.page.locator('.auth-form [role="alert"]'),
  ).toContainText("email has not been verified");
  await expect(
    recovery.page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  await recovery.page.screenshot({
    path: "docs/screenshots/account-verification.png",
    fullPage: true,
  });
  pass(
    "existing unconfirmed accounts receive a recovery path instead of a generic login error",
  );
  await recovery.page
    .getByLabel("Email address")
    .fill("different-account@flexirova.example");
  await expect(recovery.page.locator(".verification-panel")).toHaveCount(0);
  await fillLogin(recovery.page, workerEmail);
  await expect(
    recovery.page.getByRole("heading", { name: "Verify your email" }),
  ).toBeVisible();
  pass("changing the email clears recovery controls for the previous account");
  await completeTestCaptcha(recovery.page);
  await recovery.page
    .getByRole("button", { name: "Resend verification email", exact: true })
    .click();
  await expect(
    recovery.page.getByText(
      "Verification message requested. Check the newest email; older links may no longer work.",
    ),
  ).toBeVisible();
  expect((await userFor(workerEmail)).email_confirmed_at).toBeFalsy();
  pass(
    "CAPTCHA-protected resend delivers a new message without bypassing verification",
  );
  const otherBrowser = await pageFor();
  await otherBrowser.page.goto(await verificationLink(workerEmail));
  await expect(
    otherBrowser.page.getByText(
      "Please log in to finish. If your email is still unconfirmed, you can request another verification message here.",
    ),
  ).toBeVisible();
  expect((await userFor(workerEmail)).email_confirmed_at).toBeTruthy();
  pass(
    "a verification link opened in another browser provides a clear sign-in continuation",
  );
  await admin.auth.admin.updateUserById(workerUser.id, {
    user_metadata: { role: "EMPLOYER" },
  });
  await fillLogin(recovery.page, workerEmail);
  await recovery.page.waitForURL("**/applications");
  pass(
    "verified worker login uses the stored profile role rather than editable metadata",
  );
  await worker.context.close();
  await recovery.context.close();
  await otherBrowser.context.close();
  const employer = await pageFor(),
    employerEmail = `account-employer-${Date.now()}@flexirova.example`;
  const employerUser = await signup(employer.page, employerEmail, true);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", employerUser.id)
    .single();
  expect(profile.role).toBe("EMPLOYER");
  pass("employer registration creates the correct profile role");
  await employer.page.goto(await verificationLink(employerEmail));
  await employer.page.waitForURL("**/employer/company");
  await expect(employer.page.locator('input[name="name"]')).toBeVisible();
  pass("employer email verification opens company onboarding");
  await employer.page
    .getByLabel("Company name", { exact: true })
    .fill("Account Flow Company (Demo)");
  await employer.page
    .getByLabel("Public contact email", { exact: true })
    .fill("fictional-company@flexirova.example");
  await employer.page
    .getByLabel("City / town", { exact: true })
    .fill("Colombo");
  await employer.page
    .getByLabel("District", { exact: true })
    .selectOption("Colombo");
  await employer.page
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(employer.page.locator(".profile-identity h2")).toHaveText(
    "Account Flow Company (Demo)",
  );
  pass("new employer can save a company profile");
  await employer.page.locator(".site-header .logout-button").click();
  await employer.page.waitForURL(base + "/");
  await fillLogin(employer.page, employerEmail);
  await employer.page.waitForURL("**/employer");
  await expect(
    employer.page.getByRole("heading", { name: "Welcome back, Fictional." }),
  ).toBeVisible();
  pass("new employer can log out and log back into the employer dashboard");
  await employer.context.close();
  expect(errors).toEqual([]);
  console.log(`Account checks passed: ${checks}`);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  await browser.close();
}
