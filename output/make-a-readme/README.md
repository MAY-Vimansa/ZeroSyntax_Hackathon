# FlexiRova

**Find work nearby. Hire smarter.**

FlexiRova is a temporary-work marketplace for Sri Lanka. Workers can discover nearby shifts, compare pay and working conditions, apply, and track decisions. Employers can publish shifts, review applicants, and manage hiring capacity in one place.

## Description

Finding a shift is only the first step. A worker also needs clear wages, practical travel options, working hours, and an application status they can follow. An employer needs a straightforward way to publish those details and fill available places.

FlexiRova connects these decisions through a shared workflow:

**Discover a shift → understand the offer → apply → review → confirm the decision.**

The project focuses on Sri Lankan locations, wages in LKR, local time, and an English, Sinhala, and Tamil interface.

### Features

| For workers                                                                    | For employers                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Search by keyword, category, district, minimum wage, and date.                 | Create a company profile and publish structured shift listings.           |
| Discover shifts within 5, 10, 25, or 50 km using optional location access.     | Set wages, times, locations, required skills, and worker counts.          |
| Review shift details and subtract a personal transport estimate from the wage. | Save drafts, edit listings, publish opportunities, and close recruitment. |
| Apply, track decisions, and withdraw eligible pending applications.            | Review applicants and approve or reject applications.                     |
| Maintain skills, availability, and profile information.                        | Use database-enforced capacity limits during approvals.                   |

Shared features include responsive layouts, light and dark themes, email verification, and availability-aware search that excludes full, expired, and closed shifts. Workers are not charged to browse or apply.

Interface translations cover navigation, forms, statuses, and feedback. User-created listings remain in their original language. Nearby distances are approximate straight-line distances, and transport estimates use amounts entered by the worker.

### Technology

| Layer                          | Tools                               |
| ------------------------------ | ----------------------------------- |
| Application                    | Next.js 16, React 19, TypeScript    |
| Styling                        | Tailwind CSS 4, custom theme tokens |
| Forms                          | React Hook Form, Zod                |
| Database and geographic search | PostgreSQL, PostGIS                 |
| Authentication                 | Supabase Auth                       |
| Icons and feedback             | Lucide, Sonner                      |
| Verification                   | Vitest, Playwright, axe             |

## Badges

[![Next.js 16](https://img.shields.io/badge/Next.js-16-111827?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![MIT License](https://img.shields.io/badge/License-MIT-red)](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/blob/main/LICENSE)

## Visuals

### Job discovery

![FlexiRova homepage and job discovery](https://raw.githubusercontent.com/MAY-Vimansa/ZeroSyntax_Hackathon/main/docs/screenshots/home-desktop.png)

### Employer workspace

![Employer dashboard for managing shifts and applications](https://raw.githubusercontent.com/MAY-Vimansa/ZeroSyntax_Hackathon/main/docs/screenshots/employer-dashboard.png)

### Worker applications

![Worker application tracking](https://raw.githubusercontent.com/MAY-Vimansa/ZeroSyntax_Hackathon/main/docs/screenshots/worker-applications.png)

Screenshots show the built application with fictional demo records. More [mobile, theme, and language screenshots](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/tree/main/docs/screenshots) are available in the project.

## Installation

### Requirements

- Node.js 24 LTS and npm.
- Git.
- Docker Desktop running Linux containers.
- Google Chrome for the browser test suites.
- Internet access for dependency downloads and the hCaptcha widget when enabled.

The instructions below use Windows PowerShell.

### 1. Get the project

```powershell
git clone https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon.git
cd ZeroSyntax_Hackathon
npm.cmd ci
```

### 2. Set up the local database

Start Docker Desktop, then run:

```powershell
npm.cmd run setup:local
```

Setup starts the isolated local Supabase stack, applies migrations, generates the local environment file, and seeds fictional demo data. The first run downloads container images.

Configuration is saved in `.env.local`, which is excluded from Git. See the [environment template](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/blob/main/.env.example) for configuration names. Keep service-role credentials private.

No AI model, AI API key, or hosted Supabase project is required for the local marketplace demo.

### 3. Start the application

```powershell
npm.cmd run dev
```

Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**.

| Local service            | Address                |
| ------------------------ | ---------------------- |
| Application              | http://127.0.0.1:3000  |
| Supabase API             | http://127.0.0.1:55321 |
| Supabase Studio          | http://127.0.0.1:55323 |
| Verification email inbox | http://127.0.0.1:55324 |

If setup fails, check that Docker Desktop is running and use `npm.cmd run db:start` for diagnostic output.

## Usage

### Demo accounts

| Role     | Email                        | Password         |
| -------- | ---------------------------- | ---------------- |
| Worker   | `worker@flexirova.example`   | `FlexiRova!2026` |
| Employer | `employer@flexirova.example` | `FlexiRova!2026` |

These accounts are fictional and preconfirmed. Newly registered accounts require email verification. Verification messages appear in the local inbox rather than external mailboxes. Open the confirmation link in the browser used to register.

Where hCaptcha is enabled, complete the displayed checkbox before submitting authentication forms. The local configuration uses official test keys, which provide no real bot protection.

### Worker example

1. Sign in with the worker account.
2. Browse jobs and filter by district, wage, category, or date.
3. Open a shift to inspect its hours, location, wages, and payment terms.
4. Optionally enter a transport estimate.
5. Apply and open **My Applications**.

**Expected result:** the application appears with a pending status until the employer makes a decision.

### Employer example

1. Open a separate browser profile or private session.
2. Sign in with the employer account.
3. Open a shift owned by that employer, or publish a new shift.
4. Review its applicants and approve an application.
5. Return to the worker session and refresh the application view.

**Expected result:** the worker sees the approved status. Approval respects the shift's available capacity.

### Demo controls

Refresh the named fictional fixtures with upcoming shift dates:

```powershell
npm.cmd run seed
```

Stop the application with **Ctrl+C**. Stop the local database stack with:

```powershell
npm.cmd run db:stop
```

The normal Supabase stop workflow preserves local data.

## Support

Use the [project issue tracker](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/issues) for bug reports, setup questions, and feature requests.

For a useful bug report, include:

- What you tried and what you expected.
- What happened instead.
- Steps to reproduce the issue.
- Your operating system, Node.js version, and browser.
- Relevant error messages or screenshots with private data removed.

For implementation details, read the [product decisions](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/blob/main/docs/PRODUCT.md) and [validation record](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/blob/main/docs/VALIDATION.md).

## Roadmap

- [x] Worker and employer authentication.
- [x] Profiles and company information.
- [x] Database-backed job search and nearby discovery.
- [x] Shift publishing and listing management.
- [x] Applications, status tracking, and employer decisions.
- [x] Capacity-safe approvals.
- [x] Trilingual interface and responsive layouts.
- [x] Light and dark themes.
- [ ] AI-assisted conversations and skill extraction.
- [ ] Notifications and map pins.
- [ ] QR attendance.
- [ ] Worker reviews and reliability history.
- [ ] Identity verification.
- [ ] Payments, commissions, and earnings accounting.

## Contributing

For substantial changes, open an issue to discuss the proposed behavior before implementation. Keep changes focused and include a clear description of the problem and the resulting behavior.

### Development setup

Follow the installation instructions, start the local Supabase stack, and use fictional data for development and testing.

Run these checks before submitting a change:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

For integration and browser checks, keep local Supabase running. Stop the development server, run `npm.cmd run start` after a successful build, then use a second terminal:

```powershell
npm.cmd run test:integration
npm.cmd run test:browser
npm.cmd run test:themes
```

The browser suites require installed Chrome and use synthetic geolocation fixtures. Add or update relevant tests when behavior changes. Never include local credentials, real applicant data, or generated build files in a contribution.

## Authors and Acknowledgment

Developed for the [ZeroSyntax_Hackathon project](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon).

- **Repository owner:** [MAY-Vimansa](https://github.com/MAY-Vimansa).
- **Project contributor:** [Sanju Hansamal](https://github.com/sashansamal).

See the [repository contributors](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/graphs/contributors) for contribution history.

The application uses open-source libraries including Next.js, React, and Supabase. Icons are provided by Lucide. External map links use OpenStreetMap. Third-party projects retain their respective licenses.

## License

This project is released under the [MIT License](https://github.com/MAY-Vimansa/ZeroSyntax_Hackathon/blob/main/LICENSE).

## Project Status

FlexiRova is a local hackathon demonstration. Search, profiles, shift publishing, applications, and employer decisions use the Supabase backend. Public hosting has not been configured.

All demo accounts, companies, and vacancies are fictional. Transport calculations are estimates; missing-information flags do not verify employers or guarantee wages. Precise worker location is optional and is not saved to profiles or browser storage.

**AI integration is deferred.** No inference provider is connected. The assistant screen explains its unavailable state, and AI endpoints return `503 AI_NOT_CONFIGURED`.

Before a real-user pilot, the project needs production hosting and email configuration, real CAPTCHA credentials, operational monitoring, shared rate limiting, account-erasure tooling, translation review, and a production security review. Keep the local demo on a trusted machine and network.

---

**Find a shift. Understand the offer. Track the decision.**
