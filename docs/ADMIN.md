# FlexiRova administration

The `/admin` workspace provides platform oversight using the existing local Supabase data. It includes an overview, users, companies, job listings, applications, and an administrative activity log. The admin interface is currently English; the marketplace retains its existing language controls.

## Local setup

New installations provision the fictional administrator during `npm run setup:local`. For an already running local stack:

```powershell
& node_modules\@supabase\cli-windows-x64\bin\supabase.exe migration up --local
npm.cmd run seed:admin
npm.cmd run build
npm.cmd run start
```

Open [the admin workspace](http://127.0.0.1:3000/admin) and sign in with:

- Email: `admin@flexirova.example`
- Password: `FlexiRova!2026`

These are public fictional demo credentials. The provisioning script refuses non-loopback Supabase URLs and requires `NEXT_PUBLIC_LOCAL_DEMO=true`. It creates only the demo administrator; existing accounts are preserved. Hosted administrators must be provisioned separately through a trusted operator. Registration metadata and profile editing cannot grant the admin role.

## Behavior

- Metrics count all database records. Open opportunities are published listings with a future cutoff and remaining capacity. Registration changes, chart data, and application status distribution use the selected 7/30 calendar days in Asia/Colombo.
- Record tables, search, and exports cover the latest 200 records per section. This bound is disclosed in each table. The overview search searches across those recent users, companies, jobs, and applications.
- Users and applications are inspectable. Hiring decisions remain with the employer.
- A company review can set or remove verification. A published listing can be closed. Both actions require a 10–500 character review note. Closing a listing preserves existing applications and prevents new applications.
- Each successful action records the administrator, record name, before/after status, note, and time in the same database transaction. Stale decisions return a conflict; refresh and review the current state before trying again.
- Activity entries cannot be edited or removed by client accounts. Trusted database operators retain maintenance access.
- CSV exports respect the current table search and filters and neutralize spreadsheet formulas in user-written values. Overview exports contain snapshot metrics; overview search exports contain matching records.
- Both light/dark themes and mobile navigation are supported. Refresh is explicit; metrics are snapshots rather than realtime subscriptions.

## Security and implementation

The API verifies the signed-in user and protected profile role on every read and mutation. Database functions independently verify admin authorization and reject missing roles. Functions use an empty search path and explicit table references. Mutation payloads are validated, cross-origin requests are rejected, and moderation is rate-limited. Admin responses use `Cache-Control: private, no-store`.

The browser uses the existing session client, with no service-role credential. The service-role key is used only by local provisioning/acceptance scripts. No public signup path creates administrators, and no broad worker/employer row policies are changed.

Files: `src/components/admin.tsx`, `src/components/admin.css`, `src/lib/admin.ts`, `src/app/api/admin/route.ts`, and `supabase/migrations/202610240004_admin_workspace.sql`.

## Acceptance

```powershell
npm.cmd run test:admin
```

The suite uses local fictional fixtures and removes them afterward. It covers real API/database authorization, counts, moderation, stale-state rejection, the audit log, CAPTCHA login, searches/filters, downloaded CSV, mobile navigation, theme rendering, and automated WCAG A/AA checks. Results are written to ignored `artifacts/admin/results.json`; screenshots are stored under `docs/screenshots/admin-*`.
