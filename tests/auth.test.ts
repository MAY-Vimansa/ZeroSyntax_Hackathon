import { describe, it, expect } from "vitest";
import { authErrorMessage, authDestination } from "../src/lib/auth";
describe("account error recovery", () => {
  it("distinguishes unconfirmed accounts, CAPTCHA, and wrong credentials", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toBe(
      "emailUnconfirmed",
    );
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
      "invalidCredentials",
    );
    expect(authErrorMessage({ code: "captcha_failed" })).toBe("captchaFailed");
  });
  it("distinguishes rate limits, existing accounts, and connectivity failures", () => {
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toBe(
      "authRateLimited",
    );
    expect(authErrorMessage({ code: "user_already_exists" })).toBe(
      "accountExists",
    );
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "authUnavailable",
    );
  });
  it("routes by the verified profile role", () => {
    expect(authDestination("EMPLOYER")).toBe("/employer");
    expect(authDestination("WORKER")).toBe("/applications");
  });
  it("rejects external and backslash redirects", () => {
    for (const next of [
      "https://untrusted.example",
      "//untrusted.example",
      "/\\untrusted.example",
      "/\n/untrusted.example",
    ])
      expect(authDestination("WORKER", next)).toBe("/applications");
    expect(authDestination("WORKER", "/jobs/123")).toBe("/jobs/123");
  });
});
