// Public hCaptcha test key. Never use this key for a real-user deployment.
export const HCAPTCHA_TEST_SITEKEY = "10000000-ffff-ffff-ffff-000000000001";

export function captchaSitekey(
  sitekey: string | undefined,
  localDemo: string | undefined,
) {
  const key = sitekey?.trim() ?? "";
  // Fail closed when local test configuration is accidentally used for a pilot.
  return key === HCAPTCHA_TEST_SITEKEY && localDemo !== "true" ? "" : key;
}
