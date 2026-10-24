# Validation record

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
