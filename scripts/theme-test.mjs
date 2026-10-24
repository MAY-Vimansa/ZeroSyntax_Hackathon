import { chromium, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { completeTestCaptcha } from "./captcha-test-helpers.mjs";
const expect = baseExpect.configure({ timeout: 20000 });
const base = process.env.TEST_APP_URL ?? "http://127.0.0.1:3000";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Theme tests are restricted to the local app.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [],
  violations = [];
await mkdir("artifacts/theme", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
function pass(label) {
  checks.push(label);
  console.log("PASS " + label);
}
async function context(options = {}) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    ...options,
  });
  c.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (
        m.type() === "error" &&
        /hydration|hydrated|Minified React error/i.test(m.text())
      )
        errors.push(m.text());
    });
  });
  return c;
}
async function ready(page, path) {
  await page.goto(base + path);
  await expect(page.locator("main")).toBeVisible();
  if (path === "/")
    await expect(page.locator(".hero-job .job-card")).toBeVisible();
  if (path === "/jobs")
    await expect(page.locator(".job-card").first()).toBeVisible();
  if (path === "/employer")
    await expect(page.locator(".job-row").first()).toBeVisible();
  if (path === "/applications")
    await expect(page.locator(".application-card").first()).toBeVisible();
  if (path.includes("/jobs/000"))
    await expect(page.locator(".apply-panel")).toBeVisible();
}
async function theme(page, desired) {
  if ((await page.locator("html").getAttribute("data-theme")) !== desired)
    await page.locator(".theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", desired);
  await expect
    .poll(() =>
      page.locator("html").evaluate((el) => getComputedStyle(el).colorScheme),
    )
    .toBe(desired);
}
async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  for (const v of result.violations)
    violations.push({
      page: name,
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    });
}
try {
  const c = await context();
  const page = await c.newPage();
  await ready(page, "/");
  for (const mode of ["light", "dark"]) {
    await theme(page, mode);
    await page.screenshot({
      path: `docs/screenshots/theme-${mode}-desktop.png`,
    });
    await audit(page, `${mode} home`);
    for (const path of [
      "/jobs",
      "/jobs/00000000-0000-4000-8000-000000000009",
      "/login",
      "/register",
      "/assistant",
      "/for-employers",
      "/privacy",
    ]) {
      await ready(page, path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
      await audit(page, `${mode} ${path}`);
    }
    await ready(page, "/");
  }
  pass("public screens checked in both themes");
  const contrastFrames = page.evaluate(async () => {
    const button = document.querySelector(".hero-buttons .button.secondary");
    const luminance = (value) =>
      value
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((n) => {
          const c = n / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const frames = [];
    for (let i = 0; i < 24; i++) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(button);
      const values = [
        luminance(style.color),
        luminance(style.backgroundColor),
      ].sort((a, b) => b - a);
      frames.push((values[0] + 0.05) / (values[1] + 0.05));
    }
    return Math.min(...frames);
  });
  await theme(page, "light");
  expect(await contrastFrames).toBeGreaterThanOrEqual(4.5);
  pass("secondary-button text stays readable throughout theme switching");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const html = await (await c.request.get(base)).text();
  expect(html).toContain('data-theme="light"');
  pass("white theme persists and is rendered by the server before hydration");
  const other = await c.newPage();
  await ready(other, "/");
  await theme(page, "dark");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  pass("open tabs stay synchronized");
  await other.close();
  await page.locator(".theme-toggle").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  pass("keyboard theme switching");
  await ready(page, "/login");
  await page.getByLabel("Email address").fill("employer@flexirova.example");
  await page.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await completeTestCaptcha(page);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL("**/employer");
  for (const mode of ["light", "dark"]) {
    await theme(page, mode);
    for (const path of [
      "/employer",
      "/employer/jobs",
      "/employer/applicants",
      "/employer/company",
      "/employer/jobs/new",
    ]) {
      await ready(page, path);
      await expect(page.locator(".loading")).toHaveCount(0);
      await audit(page, `${mode} ${path}`);
    }
    await ready(page, "/employer");
    await page.locator(".job-row").first().hover();
    await audit(page, `${mode} hovered employer shift`);
    await page.screenshot({
      path: `docs/screenshots/theme-${mode}-employer.png`,
    });
  }
  pass("employer workspace, forms, and pending badges checked in both themes");
  await c.close();
  const worker = await context();
  const wp = await worker.newPage();
  await ready(wp, "/login");
  await wp.getByLabel("Email address").fill("worker@flexirova.example");
  await wp.getByLabel("Password", { exact: true }).fill("FlexiRova!2026");
  await completeTestCaptcha(wp);
  await wp.getByRole("button", { name: "Log in", exact: true }).click();
  await wp.waitForURL("**/applications");
  for (const mode of ["light", "dark"]) {
    await theme(wp, mode);
    for (const path of ["/applications", "/profile"]) {
      await ready(wp, path);
      await expect(wp.locator(".loading")).toHaveCount(0);
      await audit(wp, `${mode} worker ${path}`);
    }
    await wp.screenshot({ path: `docs/screenshots/theme-${mode}-profile.png` });
  }
  pass("worker applications and profile forms checked in both themes");
  await worker.close();
  const mobile = await context({ viewport: { width: 390, height: 844 } });
  const mp = await mobile.newPage();
  await ready(mp, "/");
  for (const mode of ["light", "dark"]) {
    await theme(mp, mode);
    expect(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await mp.screenshot({ path: `docs/screenshots/theme-${mode}-mobile.png` });
    await mp.locator(".mobile-menu-toggle").click();
    await audit(mp, `${mode} mobile menu`);
    await mp.locator(".mobile-menu-toggle").click();
  }
  pass("mobile controls, menus, and layout in both themes");
  await mobile.close();
  const legacy = await context();
  await legacy.addInitScript(() => {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) return;
    if (!sessionStorage.getItem("theme-test-init")) {
      localStorage.setItem("flexirova-theme", "light");
      sessionStorage.setItem("theme-test-init", "1");
    }
  });
  const lp = await legacy.newPage();
  await lp.goto(base);
  await expect(lp.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    (await legacy.cookies()).find((c) => c.name === "flexirova-theme")?.value,
  ).toBe("light");
  pass("existing localStorage preference migrates to a server-readable cookie");
  await legacy.close();
  const invalid = await context();
  await invalid.addCookies([
    { name: "flexirova-theme", value: "corrupted", url: base },
  ]);
  await invalid.addInitScript(() => {
    if (["localhost", "127.0.0.1"].includes(location.hostname))
      localStorage.setItem("flexirova-theme", "invalid");
  });
  const ip = await invalid.newPage();
  await ready(ip, "/");
  await expect(ip.locator("html")).toHaveAttribute("data-theme", "dark");
  pass("invalid saved values recover to a supported theme");
  await invalid.close();
  const blocked = await context();
  await blocked.addInitScript(() => {
    Object.defineProperty(Storage.prototype, "getItem", {
      value() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    Object.defineProperty(Storage.prototype, "setItem", {
      value() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
  });
  const bp = await blocked.newPage();
  await ready(bp, "/");
  await theme(bp, "light");
  await bp.reload();
  await expect(bp.locator("html")).toHaveAttribute("data-theme", "light");
  pass(
    "theme switching and cookie persistence work when localStorage is unavailable",
  );
  await blocked.close();
  await writeFile(
    "artifacts/theme/results.json",
    JSON.stringify({ checks, errors, violations }, null, 2),
  );
  if (violations.length) console.log(JSON.stringify(violations, null, 2));
  expect(violations, "WCAG A/AA theme accessibility violations").toEqual([]);
  expect(errors, "Browser runtime/hydration errors").toEqual([]);
  pass(
    "no detected WCAG A/AA violations or browser exceptions in checked screens",
  );
  await writeFile(
    "artifacts/theme/results.json",
    JSON.stringify({ checks, errors, violations }, null, 2),
  );
  console.log(`Theme checks passed: ${checks.length}`);
} finally {
  await browser.close();
}
