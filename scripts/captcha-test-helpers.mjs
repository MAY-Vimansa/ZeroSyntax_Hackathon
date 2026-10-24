import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

export function localCaptchaOptions() {
  if (
    process.env.NEXT_PUBLIC_LOCAL_DEMO !== "true" ||
    process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY !==
      "10000000-ffff-ffff-ffff-000000000001" ||
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
    )
  )
    throw new Error(
      "CAPTCHA automation requires the isolated local hCaptcha test configuration.",
    );
  return { captchaToken: "10000000-aaaa-bbbb-cccc-000000000001" };
}

export async function completeTestCaptcha(page) {
  localCaptchaOptions();
  await page
    .locator('.captcha-preview-check input[type="checkbox"]')
    .click({ timeout: 30000 });
}
