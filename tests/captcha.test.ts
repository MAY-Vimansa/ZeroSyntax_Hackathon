import { describe, expect, it } from "vitest";
import { captchaSitekey, HCAPTCHA_TEST_SITEKEY } from "../src/lib/captcha";

describe("CAPTCHA deployment configuration", () => {
  it("requires an explicit sitekey", () => {
    expect(captchaSitekey(undefined, "true")).toBe("");
    expect(captchaSitekey("  ", "false")).toBe("");
  });
  it("allows the public test key only for the local demo", () => {
    expect(captchaSitekey(HCAPTCHA_TEST_SITEKEY, "true")).toBe(
      HCAPTCHA_TEST_SITEKEY,
    );
    expect(captchaSitekey(HCAPTCHA_TEST_SITEKEY, "false")).toBe("");
    expect(captchaSitekey(HCAPTCHA_TEST_SITEKEY, undefined)).toBe("");
  });
  it("accepts a configured real sitekey", () => {
    expect(captchaSitekey(" site-key ", "false")).toBe("site-key");
  });
});
