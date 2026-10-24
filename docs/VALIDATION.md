# Validation record

## Admin workspace (2026-10-24)

- Added the protected `/admin` workspace: database-backed overview metrics, 7/30-day registration and application charts, users, company verification, job listings/closure, application inspection, CSV exports, and an administrative audit log.
- Applied the additive migration to the isolated local FlexiRova database and provisioned only the fictional demo administrator. Existing user accounts and marketplace records were preserved. Access/setup details and bounded functionality are documented in `ADMIN.md`.
- The current production Webpack build, strict TypeScript, ESLint, and all 45 current unit checks passed. Four new unit checks cover admin routing, multi-field search, CSV quoting, and spreadsheet formula neutralization. The combined unit total also includes independently edited features in the shared checkout.
- All 14 admin acceptance scenarios passed against the production build at `http://127.0.0.1:3001`. API/database checks reject anonymous users, workers, employers, forged admin signup metadata, missing profiles, null parameters, invalid decisions, cross-origin writes, and stale reviews. Metrics match independent database counts. Mutation notes and status changes are saved transactionally, and client accounts cannot modify audit entries.
- Chrome checks covered real local test-mode CAPTCHA login, filter-preserving metric/notification links, global search, role filters, empty results, an actual downloaded filtered CSV, company verification, job closure, preservation of existing applications, audit visibility, keyboard dialog dismissal, and logout revoking access. Temporary acceptance accounts, companies, listings, applications, and audit records were cleaned up.
- Verified 1440px desktop, 768px tablet, and 390px phone layouts. Both desktop and phone themes had no detected WCAG A/AA violations in the checked overview states and no page-level horizontal overflow. Found and fixed inherited form-control layout, hidden-label overflow, and button contrast during theme changes. No captured runtime or hydration errors remained.
- Inspected actual browser screenshots: `admin-light-desktop.png`, `admin-dark-desktop.png`, `admin-tablet.png`, `admin-light-mobile.png`, and `admin-dark-mobile.png`. Acceptance results are saved in ignored `artifacts/admin/results.json`. The server-only Supabase credential is absent from browser assets.
- Scope limits: this is a local fictional-data demonstration, not a hosted production release. Admin UI is English, tables/search/exports cover the latest 200 records per section, and refresh is explicit. No suspension, payments, staff role editor, or employer hiring override is implemented. Existing marketplace/AI end-to-end suites were not rerun in full for the admin change.

## OpenAI integration (2026-10-24)

- Replaced both unavailable AI handlers with server-only OpenAI Responses requests, authenticated job-search interpretation, database-grounded job cards and worker skill extraction. Added input/output validation, origin checks, request limits, concurrency limits and specific provider errors.
- A real request reached OpenAI with the securely saved replacement key and returned `429 credit_balance_exhausted`. Both signed-in app features surface this as `503 AI_QUOTA_EXCEEDED`. Successful live inference, semantic accuracy and model language/date handling remain unverified until API credits are available.
- 45 unit checks and 19 local API/database checks passed. Provider-success tests use explicit mocks; they are not evidence of a live model answer.
- Six Chrome checks passed on the production server: the actual chat and extraction quota errors, desktop dark/mobile light layouts, Sinhala/Tamil controls, explicit UI-fixture job cards from real database records, and unsaved profile skill suggestions. The final isolated build uses port 3002 to avoid other builds replacing the shared `.next` directory. No captured browser runtime errors. `artifacts/ai/browser-results.json` records `liveAI: blocked` and identifies fixture checks separately.
- Production build, TypeScript and ESLint passed during implementation. Additional AI details and rerun instructions are in AI.md. The older no-AI records below describe the initial milestone.

## Account creation and verification recovery

- Diagnosed the reported failures from local Auth events: signup succeeded, followed by `email_not_confirmed` at password login. The local Mailpit transport captures verification messages instead of delivering them externally.
- Added a prominent verification step, local inbox link, resend action, and distinct messages for unconfirmed email, wrong credentials, rate limits, CAPTCHA errors, and service failure. Verification remains required and CAPTCHA is preserved for signup, password login, and resend.
- Login routing now reads the protected profile role rather than editable user metadata. Employer verification opens company setup; a link opened in a different browser offers a clear password-login continuation.
- Fresh production validation: build, ESLint, TypeScript, 19 unit checks, 11 account-flow browser checks, 9 CAPTCHA checks, and the existing 2 auth-only browser checks passed. Account tests cover fresh worker/employer registrations, pending-account recovery, changing the email, resend, cross-browser verification, correct role routing, company creation, logout, and subsequent login.
- Tests created and removed only fictional fixture accounts. Existing user accounts were preserved; no email confirmations or CAPTCHA protections were bypassed. Current recovery screenshot: `docs/screenshots/account-verification.png`.

Validation targets the local fictional FlexiRova stack, not a hosted production deployment.

- Final ESLint, strict TypeScript, and the production Webpack build passed.
- Vitest: 12 checks passed for geography, Asia/Colombo date boundaries, transport arithmetic, required listing information, filter validation, translation-key coverage, and theme preference parsing/fallbacks.
- Earlier marketplace API/database acceptance: 19 checks passed against the core production build for public search, geography, empty results, AI-unavailable responses, roles, publishing, ownership, cross-origin protection, duplicate applications, concurrent approvals, idempotency, private records, role escalation, withdrawal, and expiry. The theme pass did not change marketplace API handlers.
- Browser acceptance: all 16 checks passed against the production build. Coverage includes 1440px desktop, 390px phone, 768px tablet, both themes, keyboard skip navigation, wage search, empty results, travel estimates, all three interface languages, simulated geolocation states, employer publishing, worker application, employer approval, and worker-visible approval.
- A new fictional worker registered through the UI, received a real local Mailpit confirmation email, followed its verification link in the same browser, and reached the authenticated profile. No browser runtime or captured hydration errors were found in the final run.
- The server-only Supabase credential is absent from browser build assets; `.env.local` is ignored by Git. No AI requests or model runtime dependencies remain in application code.
- Browser testing found and corrected translated-label overflow, ambiguous select labels, premature pre-hydration form submission, and localhost/127.0.0.1 origin/callback handling.

## White and dark theme correction

- The updated production build, lint, TypeScript, all 12 unit tests, and the existing 16 browser checks passed.
- All 12 dedicated theme scenarios passed against the updated production build, with no captured browser/hydration errors or detected WCAG A/AA violations in the checked public, worker, employer, and mobile states.
- Added theme-specific readable colors for status badges, errors, avatars, input boundaries, focus rings, and interactive text. Primary action text and secondary buttons remain readable while switching themes; a 24-frame browser sample checks secondary-button contrast stays at least 4.5:1.
- Saved preferences are validated and restored before painting. Server rendering uses the theme cookie; older localStorage preferences migrate, multiple tabs synchronize, and invalid or unavailable storage is handled safely.
- Verified keyboard operation, mobile controls, reload/navigation persistence, localStorage-denial fallback, and native `color-scheme` alignment in Chrome.
- Current previews: `docs/screenshots/theme-light-desktop.png`, `theme-dark-desktop.png`, and the corresponding mobile/employer/profile captures.

The live handover uses `npm run start` at http://127.0.0.1:3000 with the isolated `flexirova` Supabase project on ports 55321–55324. No remote deployment was performed. Screenshots in `docs/screenshots` were captured from this actual production build using fictional records.

Limitations: geolocation tests use synthetic coordinates; local email is captured in Mailpit. No external SMTP delivery, hosted deployment, real hiring, native-speaker certification, or AI inference has been tested. AI is deliberately disconnected.

## Registration CAPTCHA (2026-10-24)

- Added hCaptcha for worker/employer registration and password login, with Supabase Auth verifying the token. Local setup explicitly uses the provider's official test sitekey and secret; these provide no real bot protection. Both the widget and form disclose test mode.
- Direct worker and employer signup requests without a token or with an invalid token were rejected by the running local Supabase server with `captcha_failed`; password login also rejected missing tokens. The official valid test token was accepted.
- `npm run test:captcha` covers actual Chrome checkbox interaction, desktop dark worker signup, phone light employer signup, role/theme/language changes, failed-login recovery, required email confirmation, and clearing the token after submission. Screenshots and check results are saved under ignored `artifacts/captcha/`.
- Final CAPTCHA run: all 9 checks passed against the current production build after preserving concurrent account-verification changes. The current checkout's 19 unit checks, TypeScript, and ESLint also passed. The prior full theme/browser records above were not rerun in full for this change.
- The existing 19 API/database checks passed with CAPTCHA enabled. The existing registration/email browser check also passed in auth-only mode, including following a real local Mailpit verification link. These are local test-key results, not evidence of real bot resistance or external email delivery.
- Unit coverage checks that missing CAPTCHA configuration blocks submission and that the official test sitekey is refused when `NEXT_PUBLIC_LOCAL_DEMO` is not `true`. Real sitekeys and the matching secret in hosted Supabase are still required before a pilot.

### Test-mode presentation refinement

- The local test key now uses a styled checkbox card that requests a real hCaptcha test token through the provider's supported invisible mode. The normal provider widget remains in use for real sitekeys. The test card displays a readable blue information panel explaining that hCaptcha is for testing only, bot protection is inactive, and a site administrator should be contacted if this appears on a live site. Privacy and terms links remain visible.
- All 9 CAPTCHA checks passed against the refreshed production app, including both role registrations, token resets, role/theme/language changes, server rejection of missing/invalid tokens, and login retry. Added checks verify unchecking clears verification and no provider checkbox with overlapping red text is visible. Desktop dark and mobile light screenshots were visually inspected.
- The production build and its TypeScript check passed; 19 unit tests passed. ESLint had no errors and reported two unrelated unused imports in the concurrently added admin component. The temporary isolated preview used while that component was unfinished was removed.
