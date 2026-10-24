import type { MessageKey } from "./i18n";
export function authErrorMessage(error: unknown): MessageKey {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "captcha_failed") return "captchaFailed";
  if (code === "email_not_confirmed") return "emailUnconfirmed";
  if (
    [
      "over_email_send_rate_limit",
      "over_request_rate_limit",
      "email_rate_limit_exceeded",
    ].includes(code)
  )
    return "authRateLimited";
  if (["user_already_exists", "email_exists"].includes(code))
    return "accountExists";
  if (code === "weak_password") return "passwordHelp";
  if (["email_address_invalid", "validation_failed"].includes(code))
    return "invalidEmail";
  if (code === "signup_disabled") return "signupUnavailable";
  if (code === "invalid_credentials") return "invalidCredentials";
  if (
    error instanceof TypeError ||
    (error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AuthRetryableFetchError")
  )
    return "authUnavailable";
  return "authError";
}
export function authDestination(role: string, next: string | null = null) {
  const safe =
    next?.startsWith("/") &&
    !next.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(next)
      ? next
      : null;
  return (
    safe ??
    (role === "ADMIN"
      ? "/admin"
      : role === "EMPLOYER"
        ? "/employer"
        : role === "WORKER"
          ? "/applications"
          : "/profile")
  );
}
