# We Are Plas Madoc (WAPM)

A public website and staff back-office for **We Are Plas Madoc**, a community-led charity (CIO, Charity No. 1197278) operating in Plas Madoc, Wrexham. The codebase serves three distinct audiences from one React SPA:

1. **The public website** — services, news, events (with RSVP), gallery, volunteering, and contact for residents.
2. **The Admin CMS** — role-gated tooling staff use to publish content, manage volunteers, and read contact messages.
3. **The Visitor Management System (VMS)** — a safeguarding-grade register for playground/youth-club sessions: children, parents, volunteers, attendance, incidents, and a daily opening/closing checklist with task tracking.

Live domain: `weareplasmadoc.co.uk` · Hosted on **Vercel** · Backend on **Supabase** (Postgres + Auth + Storage + Edge Functions).

---

## Table of contents

- [Tech stack](#tech-stack)
- [System architecture](#system-architecture)
- [Repository layout](#repository-layout)
- [Data model](#data-model)
- [Authentication & authorization](#authentication--authorization)
- [Public site](#public-site)
- [Admin CMS](#admin-cms)
- [Visitor Management System (VMS)](#visitor-management-system-vms)
- [Daily Log & Tasks](#daily-log--tasks)
- [Supabase Edge Functions](#supabase-edge-functions)
- [Scheduled jobs (pg_cron)](#scheduled-jobs-pg_cron)
- [Design system](#design-system)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations & scripts](#database-migrations--scripts)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript, built with Vite (SWC plugin) |
| Routing | React Router v6 (client-side, single `BrowserRouter`) |
| Server state | TanStack Query (`@tanstack/react-query`) |
| UI primitives | shadcn/ui on top of Radix UI, Tailwind CSS |
| Icons | `@phosphor-icons/react` (admin/VMS), `lucide-react` (public site) |
| Forms & validation | `react-hook-form` + `zod` resolvers |
| Charts | `recharts` (Admin Analytics) |
| Exports | `jspdf` / `jspdf-autotable` (PDF reports), `xlsx` (Excel workbooks) |
| Backend-as-a-service | Supabase — Postgres, Row-Level Security, Auth, Storage, Edge Functions (Deno) |
| Scheduled jobs | Supabase `pg_cron` + `pg_net` calling Edge Functions over HTTP |
| Transactional email | Resend API (called from Edge Functions) |
| Hosting | Vercel (static SPA with catch-all rewrite to `index.html`) |
| Analytics | `@vercel/analytics` |
| Testing | Vitest + Testing Library + jsdom |

There is no custom Node/Express server — the frontend talks directly to Supabase via the JS client (`@supabase/supabase-js`), protected by Postgres Row-Level Security policies. Server-side logic that needs elevated privileges (sending email, deleting auth users, third-party API calls) lives in Supabase Edge Functions.

---

## System architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│        Browser (SPA)        │        │             Supabase              │
│  React + Router + RQuery    │        │                                    │
│                              │  REST  │  ┌──────────────┐  ┌────────────┐ │
│  Public site ───────────────┼───────►│  │  Postgres    │  │   Auth     │ │
│  Admin CMS  ─────────────── ┼───────►│  │  + RLS       │  │ (GoTrue)   │ │
│  VMS + Daily Log  ───────── ┼───────►│  └──────────────┘  └────────────┘ │
│                              │        │  ┌──────────────┐  ┌────────────┐ │
│                              │ invoke │  │ Edge Functions│  │  Storage   │ │
│                              ├───────►│  │  (Deno)       │  │ (media)    │ │
└──────────────────────────────┘        │  └──────┬───────┘  └────────────┘ │
                                          │         │ pg_cron / pg_net       │
                                          └─────────┼─────────────────────────┘
                                                     │ HTTPS
                                                     ▼
                                          ┌────────────────────┐
                                          │   Resend (email)    │
                                          └────────────────────┘

Vercel: builds & serves the SPA, rewrites all routes to /index.html (client
routing), and exposes /api-style Vercel Analytics.
```

Key architectural decisions visible in the code:

- **No server-rendered pages / no API layer of its own.** Vercel serves a static bundle; `vercel.json` rewrites every path to `index.html` so React Router can handle deep links (e.g. `/events/:id`, `/admin/vms/children/:id`).
- **Authorization is enforced twice**: client-side (route guards + `PermissionGuard`/`hasPermission` hide UI) and, authoritatively, via Postgres RLS policies driven by a `has_role(user_id, role)` SQL function — so a hidden button is not the real security boundary.
- **Privileged operations are pushed into Edge Functions** (using the `SUPABASE_SERVICE_ROLE_KEY`, never exposed to the browser) rather than relaxing RLS: inviting/deleting staff, sending email, handling anonymous public submissions (RSVP, volunteer applications, contact form, child registration).
- **Public write paths bypass user auth entirely.** Functions like `handle-rsvp`, `handle-contact`, `handle-volunteer`, and `handle-child-registration` have `verify_jwt = false` in `supabase/config.toml` and use the service role internally — this lets anonymous website visitors submit data validated only by the Edge Function itself, without granting anon Postgres roles direct INSERT rights on sensitive tables.
- **Scheduled background work** (event reminders, VMS milestone notifications, task reminders) is done via `pg_cron` jobs that `net.http_post` into the relevant Edge Function daily — see [Scheduled jobs](#scheduled-jobs-pg_cron).

---

## Repository layout

```
src/
  App.tsx                    Route table (public + admin + VMS + daily log), providers
  main.tsx                   React root
  pages/                     One file per public route
    admin/                   Admin CMS pages (news, events, gallery, volunteers, staff, settings, analytics…)
    admin/vms/               Visitor Management System pages
    admin/checks/            Daily Log & Tasks pages
  components/
    layout/                  Navbar, Footer, PageHero, CookieBanner, ScrollToTop, WAPMLogo
    home/                    Homepage sections (Hero, StatsBar, ServicesOverview, UpcomingEvents, LatestNews…)
    events/                  RSVP modal/button, social share
    admin/layout/            AdminShell, AdminSidebar, AdminTopBar (the CMS chrome)
    admin/shared/            PermissionGuard and other cross-admin widgets
    admin/vms/               VMS-specific filters/export widgets (DateRangeFilter, PlaygroundFilter, ExportMenu…)
    admin/events/            Admin event-editing widgets
    ui/                      shadcn/ui primitives (button, dialog, table, etc.)
    icons/                   Custom icon components
  hooks/
    useAuth.tsx              Auth/session/role context (see below)
    use-mobile.tsx, useCountUp.ts, useIntersectionObserver.ts, use-toast.ts
  lib/
    vms.ts                   VMS domain helpers: age bands, playgrounds, quotes, weather, person reports, CSV export
    dailyLog.ts              Daily Log & Tasks data access helpers
    excel.ts / pdf.ts        Export helpers (xlsx workbooks, jsPDF reports)
    serviceIcons.ts          Icon lookup for the Services section
    utils.ts                 `cn()` class-merge helper (shadcn convention)
  integrations/superbase/    Supabase client + generated `Database` types (note: directory is spelled "superbase")
  tests/                     Vitest setup + example test

supabase/
  config.toml                Project ref + per-function `verify_jwt` overrides
  migrations/                Timestamped SQL migrations (schema, RLS, functions) — source of truth for the DB
  functions/                 Deno Edge Functions (see below)
  setup_*.sql, seed_*.sql    One-off scripts run manually in the Supabase SQL editor (cron jobs, storage bucket, seed data)
  backfill_test_playground.sql, cleanup_test_data.sql  Maintenance scripts for the seeded test dataset
```

---

## Data model

All tables live in the `public` schema of the Supabase Postgres database and are protected by Row-Level Security. Types are generated into `src/integrations/superbase/types.ts` (the `Database` type consumed everywhere via `Tables<'x'>` / `supabase.from('x')`).

### Public content

| Table | Purpose |
|---|---|
| `news_posts` | Blog/news articles (`slug`, `status: draft\|published`, `featured`, category) |
| `events` | Events with optional recurrence (`recurrence_rule`, `recurrence_until`, `recurrence_parent_id`), RSVP-ability (`is_free`) |
| `event_rsvps` | Public RSVPs per event, with `cancellation_token` for self-service cancellation and `reminder_sent` flag |
| `services` | The charity's service offerings (slug-routed detail pages) |
| `gallery_items` | Photo gallery, categorized, ordered by `display_order` |
| `team_members` | Staff/trustee profiles (`is_trustee` flag) |
| `volunteer_positions` | Open roles shown on Get Involved (newline-separated bullet fields) |
| `volunteers` | Volunteer applications (also links into VMS DBS tracking — `dbs_checked_status`, `dbs_number`) |
| `messages` | Contact form submissions, with `read` flag |
| `site_settings` | Generic key/value store for site-wide settings |
| `activity_log` | Admin audit trail of content actions |
| `profiles` / `user_roles` | Staff accounts and their `app_role` assignments |

### Visitor Management System (VMS)

| Table | Purpose |
|---|---|
| `children` | Registered children, with `approval_status`, `playground`, medical/allergy/ALN fields, soft-archival (`archived_at`, `archived_reason`) |
| `parents` | Parents/carers, with their own `approval_status` and demographic fields |
| `child_parent_links` | Many-to-many join, flags `is_primary_contact` and `relationship` |
| `adult_visitors` / `external_visitors` | Sign-in log for adults and outside organisations visiting a playground |
| `attendance` | Per-session check-in/out for a child, parent, or volunteer, tagged by `service` and `playground` |
| `incidents` | Safeguarding/accident log, tied to a child/parent/volunteer, with follow-up tracking and parent-notified flag |
| `notifications` | System-generated alerts (birthdays, youth-club transitions, absence milestones — see [scheduled jobs](#scheduled-jobs-pg_cron)) |
| `vms_daily_quotes` | Optional custom "quote of the day" override, otherwise generated client-side from a static list |
| `vms_activity_log` | VMS-specific audit trail |

### Daily Log & Tasks (playground open/close checklist)

| Table | Purpose |
|---|---|
| `checklist_items` | Configurable checklist entries, grouped by `section: opening\|closing` |
| `daily_logs` | One row per playground per day (notes, staff team, weather/quote snapshot, session times) |
| `daily_log_checks` | Per-item check state against a `daily_logs` row (`checked`, `initials`, `comment`) |
| `vms_tasks` | Follow-up tasks (optionally raised from a failed daily-log check), with `status: open\|in_progress\|resolved`, assignment, and reminder tracking (`last_reminded_at`) |

### Roles

Defined as a single Postgres enum, `app_role`:

```
super_admin | editor | contributor | gallery_only | playground_worker
```

### Security model (RLS)

- A `SECURITY DEFINER` SQL function `has_role(_user_id uuid, _role app_role) returns boolean` is the building block for nearly every policy — it avoids recursive RLS checks against `user_roles` itself.
- Companion RPCs `get_user_role` / `get_user_roles` are called from the client (`useAuth`) to populate the current user's role set after sign-in.
- Public tables generally follow the pattern: **anonymous `SELECT` on published/approved rows only** (e.g. `news_posts` where `status = 'published'`), **`authenticated` full read**, and **role-gated write/delete** (e.g. only `super_admin` or `editor` may delete news).
- `site_settings` and published content are world-readable; everything under VMS/Daily Log is `authenticated`-only and additionally checked in the UI via `PermissionGuard`/`hasPermission`.
- Storage: a single public `media` bucket (`supabase/setup_storage.sql`) — public read, authenticated write/update/delete — backs gallery images, news/event images, and team photos.

---

## Authentication & authorization

`src/hooks/useAuth.tsx` wraps the app in an `AuthProvider` that:

1. Subscribes to `supabase.auth.onAuthStateChange` and hydrates the initial session via `getSession()`.
2. On sign-in, fetches the user's `profiles` row and role set (`get_user_roles` RPC) in parallel, and stamps `profiles.last_sign_in`.
3. Exposes `signIn`, `signOut`, `resetPassword` (emails a link to `/admin/reset-password`), `updatePassword`, and `hasPermission(roles[])`.
4. `hasPermission` treats `super_admin` as a wildcard — it satisfies any role check.

Route-level enforcement:
- **`AdminShell`** (wraps every admin page) redirects to `/admin/login` if unauthenticated, and shows a "No Access" screen if the user has zero roles.
- **`PermissionGuard`** wraps specific sections/actions inside a page and renders an "Access Denied" panel (or a custom `fallback`) if the current user lacks the required roles.
- **`AdminSidebar`** filters nav items per-role so users only ever see entry points they can use — VMS and Daily Log nav sections only render for `playground_worker` (or `super_admin`).

Staff account lifecycle (invite/delete) is handled by Edge Functions using the service role key rather than client-side Auth Admin calls — see [Edge Functions](#supabase-edge-functions).

---

## Public site

Routes (all under `PublicLayout` = `Navbar` + page + `Footer` + `ScrollToTop` + `CookieBanner`):

| Route | Page | Notes |
|---|---|---|
| `/` | `Index` | Hero, stats, services overview, upcoming events, latest news, about strip, get-involved banner |
| `/services`, `/services/:slug` | `Services`, `ServiceDetail` | Reads `services` table |
| `/news`, `/news/:slug` | `News`, `NewsDetail` | Published `news_posts` only |
| `/events`, `/events/:id` | `Events`, `EventDetail` | Published events; RSVP flow via `RsvpModal`/`RsvpButton` → `handle-rsvp` Edge Function |
| `/events/cancel-rsvp` | `CancelRsvp` | Self-service cancellation via emailed `cancellation_token` link |
| `/gallery` | `Gallery` | `gallery_items`, filterable by category |
| `/get-involved` | `GetInvolved` | Volunteer positions + application form → `handle-volunteer` Edge Function |
| `/register` | `Register` | Public child/parent registration → `handle-child-registration` Edge Function; feeds VMS approval queue |
| `/contact` | `Contact` | → `handle-contact` Edge Function (emails staff + optional reply thread) |
| `/team` | `Team` | `team_members`, trustees flagged separately |
| `*` | `NotFound` | 404 |

All public writes (RSVP, contact, volunteer application, child registration) go through Edge Functions rather than direct table inserts, so validation and staff-notification emails happen server-side regardless of client trustworthiness.

---

## Admin CMS

Entered via `/admin/login`; every subsequent `/admin/*` route (outside the auth pages themselves) is wrapped in `AdminShell`, giving a persistent sidebar (`AdminSidebar`) + topbar (`AdminTopBar`) chrome rendered in the `font-admin` (Manrope) typeface, distinct from the public site's Nunito/Fredoka pairing.

| Area | Route(s) | Roles |
|---|---|---|
| Overview (dashboard) | `/admin` | all admin roles |
| News | `/admin/news`, `/new`, `/:id/edit` | super_admin, editor, contributor |
| Events | `/admin/events`, `/new`, `/:id/edit` | super_admin, editor, contributor |
| Gallery | `/admin/gallery` | super_admin, editor, contributor, gallery_only |
| Volunteers / Volunteer Positions | `/admin/volunteers`, `/admin/volunteer-positions` | super_admin, editor |
| Messages | `/admin/messages` | super_admin, editor — includes reply-by-email (`send-reply` function) |
| Services | `/admin/services`, `/:id/edit` | super_admin, editor |
| Team | `/admin/team` | super_admin, editor |
| Analytics | `/admin/analytics` | super_admin, editor — pulls Vercel Analytics data via `get-analytics` function |
| Staff Accounts | `/admin/staff` | super_admin only — invite/manage/delete staff & roles |
| Settings | `/admin/settings` | all admin roles |

Sidebar nav items are declared as plain arrays (`navItems`, `vmsNavItems`, `checksNavItems`, `bottomItems`) each carrying their own `roles` list, and `renderItem` calls `hasPermission` per item — adding a new admin page + role gate is a one-line addition there plus a `<Route>` in `App.tsx`.

---

## Visitor Management System (VMS)

A safeguarding register for the two playground sites (`caia_park`, `plas_madoc` — see `PLAYGROUNDS` in `src/lib/vms.ts`), gated to `super_admin` and `playground_worker` roles.

| Route | Page | Purpose |
|---|---|---|
| `/admin/vms` | `VmsOverview` | Dashboard/landing for the module |
| `/admin/vms/children`, `/new`, `/:id/edit`, `/:id` | `VmsChildren`, `VmsChildEditor`, `VmsChildProfile` | Child registry, editable profile, approval workflow |
| `/admin/vms/parents`, `/new`, `/:id/edit`, `/:id` | `VmsParents`, `VmsParentEditor`, `VmsParentProfile` | Parent/carer registry |
| `/admin/vms/youth` | `VmsYouth` | Youth-club-age cohort view (ages 10–17, see `YOUTH_AGE_BANDS`) |
| `/admin/vms/attendance` | `VmsAttendance` | Session check-in/out |
| `/admin/vms/incidents` | `VmsIncidents` | Incident/accident reporting and follow-up |
| `/admin/vms/visitors`, `/:id` | `VmsVisitors`, `VmsVisitorProfile` | Adult/external visitor sign-in log |
| `/admin/vms/volunteers`, `/:id` | `VmsVolunteers`, `VmsVolunteerProfile` | Volunteer roster incl. DBS status |
| `/admin/vms/reports` | `VmsReports` | Aggregate reporting, CSV/Excel/PDF export |
| `/admin/vms/report/:personType/:id` | `VmsPersonReport` | Per-person attendance/incident report, exportable to PDF |
| `/admin/vms/notifications` | `VmsNotifications` | System-generated alerts (see below) |

Domain logic in `src/lib/vms.ts`:
- **Age bands**: `AGE_BANDS` (0-4…16-17) and `YOUTH_AGE_BANDS` (10-12…16-17), derived from `calculateAge(dob)`.
- **Emergency contacts**: `fetchEmergencyContacts` resolves primary-contact parents for a list of children in one round trip.
- **Quote of the day**: `getQuoteOfDay()` picks deterministically from a static `QUOTES` list by date, with an optional per-day override in `vms_daily_quotes` (`fetchCustomQuote`/`setCustomQuote`/`clearCustomQuote`) settable by staff.
- **Weather**: `fetchWeatherNow()` — lightweight current-conditions fetch shown on the daily log/dashboard.
- **Reporting**: `fetchPersonReport` assembles a child/parent/volunteer's attendance + incident history; `downloadCsv`, plus `excel.ts`/`pdf.ts`, turn that into exportable files (`ExportMenu` component drives the CSV/Excel/PDF choice from the UI).

### Notifications (automated safeguarding prompts)

Generated daily by the `vms-daily-notifications` Edge Function (see below) rather than in the client:
- Birthday reminders for registered children.
- Youth-club transition alerts when a child crosses into the 10+ age band.
- Absence-milestone alerts at 3 months and 1 year of no recorded attendance.

---

## Daily Log & Tasks

A lightweight opening/closing-checklist and task-tracking module (`/admin/checks/*`), also gated to `playground_worker`/`super_admin`, backed by `checklist_items`, `daily_logs`, `daily_log_checks`, and `vms_tasks`.

| Route | Page |
|---|---|
| `/admin/checks` | `ChecksLog` — today's log for the signed-in worker's playground |
| `/admin/checks/log/:id` | `ChecksLog` (existing log by id) |
| `/admin/checks/history` | `ChecksHistory` — past logs |
| `/admin/checks/tasks` | `Tasks` — kanban-style task board; the sidebar shows a live badge of the current user's open task count |
| `/admin/checks/items` | `ChecklistItems` — super_admin-only management of the checklist item catalogue |

Flow, per `src/lib/dailyLog.ts`:
1. `fetchTodayLogs(playground, date)` / `createLog(...)` — one `daily_logs` row per playground per day, snapshotting the day's quote and weather at creation time.
2. `fetchChecklistItems()` — active items split into `opening`/`closing` sections.
3. `saveCheck(...)` — toggles a `daily_log_checks` row (`checked`, `initials`, `comment`) per item per log.
4. A failed/flagged check can spawn a `vms_tasks` row (`daily_log_check_id` links back to its origin), assignable to a staff member (`fetchStaffOptions`), transitioning `open → in_progress → resolved` via `updateTaskStatus`.
5. Unresolved tasks assigned to a user trigger an email (`notify-task-assigned` on creation, `task-reminders` cron for stale ones) and are counted live in `AdminSidebar`'s "Tasks" nav badge.

---

## Supabase Edge Functions

All functions live under `supabase/functions/<name>/index.ts`, run on Deno, share a permissive CORS header block, and are deployed individually. `supabase/config.toml` marks the public-facing ones with `verify_jwt = false` (they authenticate/authorize internally, if at all, since they're meant to be reachable by anonymous visitors or cron).

| Function | `verify_jwt` | Trigger | Purpose |
|---|---|---|---|
| `handle-contact` | false | Public contact form | Inserts a `messages` row, emails staff an HTML notification |
| `handle-rsvp` | false | Public event RSVP | Creates `event_rsvps` row, generates Google/Apple calendar links, emails confirmation + cancellation link |
| `handle-volunteer` | false | Public volunteer application | Inserts into `volunteers`, emails staff |
| `handle-child-registration` | false | Public `/register` form | Inserts `children`/`parents`/`child_parent_links` (via service role), starts them in a pending `approval_status` |
| `send-reply` | (JWT verified) | Admin "Messages" reply action | Sends a staff reply email back to a contact-form submitter |
| `notify-event-cancellation` | false | Admin cancels an event | Emails every RSVP'd attendee that the event is off |
| `send-event-reminders` | false | `pg_cron`, daily 08:00 UTC | Emails attendees of soon-upcoming events a reminder + cancel link, sets `reminder_sent` |
| `vms-daily-notifications` | false | `pg_cron`, daily 06:00 UTC | Computes and inserts `notifications` rows: birthdays, youth-club transitions, 3-month/1-year absence milestones |
| `notify-task-assigned` | (JWT verified) | Task assignment (Daily Log) | Emails the assignee of a new `vms_tasks` item via Resend |
| `task-reminders` | false | `pg_cron`, daily 07:00 UTC | Re-emails assignees of stale open tasks, throttled to once per 3 days per task via `last_reminded_at` |
| `invite-staff` | (JWT verified) | Admin → Staff Accounts | Decodes caller's JWT, verifies `super_admin`, uses the service-role client to invite a new Supabase Auth user + assign a role |
| `delete-staff` | (JWT verified) | Admin → Staff Accounts | Verifies caller, deletes a staff user via the Auth Admin API |
| `get-analytics` | (JWT verified) | Admin → Analytics page | Proxies the Vercel Analytics API using a server-side `VERCEL_TOKEN`, so the token never reaches the browser |

Functions that need to bypass RLS (staff invite/delete, public form handlers) construct their own `createClient` with `SUPABASE_SERVICE_ROLE_KEY`; functions gated by role instead decode the caller's bearer JWT manually (base64-decoding the payload segment) to extract `sub` before checking `has_role` — a deliberate choice to avoid requiring a full Supabase session object inside a Deno function context.

---

## Scheduled jobs (pg_cron)

Because Supabase Edge Functions have no built-in scheduler, three `pg_cron` jobs (set up manually via the SQL editor, using `supabase/setup_cron.sql`, `setup_vms_cron.sql`, `setup_task_reminders_cron.sql`) call the corresponding function over HTTP using the `pg_net` extension:

| Schedule (UTC) | Job | Calls |
|---|---|---|
| `0 6 * * *` (06:00) | `vms-daily-notifications` | Runs ahead of morning check-in so notifications are ready when staff arrive |
| `0 7 * * *` (07:00) | `task-reminders` | Checks daily but only actually emails a given task's assignee once every 3 days |
| `0 8 * * *` (08:00) | `daily-event-reminders` | Sends reminders for events happening soon |

To (re)install a job, run the relevant `setup_*.sql` file in the Supabase SQL editor after substituting the project's anon key; `SELECT * FROM cron.job;` lists active schedules, `cron.unschedule('<name>')` removes one.

---

## Design system

- **Public site type**: `Nunito` (body) + `Fredoka` (display/headings), loaded via Google Fonts `<link>` in `index.html`.
- **Admin type**: `Manrope`, applied via a `font-admin` Tailwind utility scoped to `AdminShell`/`AdminSidebar` so the CMS reads as a distinct product surface from the public site.
- **Color system**: HSL CSS custom properties (`--primary`, `--background`, etc., shadcn convention) plus a bespoke brand palette (`--wapm-deep`, `--wapm-purple`, `--wapm-cyan`, `--wapm-pink`, `--wapm-lavender`, `--wapm-green`) and a parallel `--admin-*` set (`admin-chrome`, `admin-surface`, `admin-border`) for the CMS's darker sidebar chrome vs. light content surface. All wired through `tailwind.config.ts`.
- **Components**: shadcn/ui (Radix primitives + Tailwind), generated/configured via `components.json`; icons split between `lucide-react` (public) and `@phosphor-icons/react` (admin/VMS, using the `Icon` suffix naming convention, e.g. `SquaresFourIcon`).
- **Dark mode**: enabled at the Tailwind config level (`darkMode: ["class"]`) via `next-themes`, primarily relevant to shadcn component defaults.

---

## Getting started

**Prerequisites**: Node.js (LTS), npm, and a Supabase project (or use the existing dev/staging project's credentials).

```bash
npm install
cp .env.example .env   # if present — otherwise create .env per "Environment variables" below
npm run dev             # starts Vite on http://localhost:8080
```

Other scripts:

```bash
npm run build       # production build
npm run build:dev   # development-mode build (useful for debugging a prod-like bundle)
npm run preview      # preview a production build locally
npm run lint          # ESLint
npm run test           # run Vitest once
npm run test:watch    # Vitest watch mode
```

The dev server binds to `::` (all interfaces) on port `8080` and disables the Vite HMR error overlay (see `vite.config.ts`). The `@` path alias resolves to `src/`.

---

## Environment variables

Read via `import.meta.env` (client-exposed, must be prefixed `VITE_`) and `Deno.env` (server-only, set as Supabase function secrets). None of the values below should be committed — see `.env` for the local template (values redacted here).

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPERBASE_URL` | client (`src/integrations/superbase/client.ts`) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Supabase anon/publishable key |
| `VITE_CLOUDINARY_CLOUD_NAME` | (reserved) | Present in `.env` but not currently referenced in `src/` — legacy or planned image-hosting integration; the app currently uses the Supabase `media` storage bucket instead |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | (reserved) | Same as above |
| `RESEND_API_KEY` | Edge Functions (email-sending ones) | Transactional email via Resend |
| `CRON_SECRET` | (reserved) | Not currently referenced by the cron SQL scripts, which authenticate via the Supabase anon key instead |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Full-privilege Postgres/Auth access, set as a Supabase function secret (not in `.env`) |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | `get-analytics` function | Server-side Vercel Analytics API access |

Note the client/types code consistently spells the integration **"superbase"** (directory `src/integrations/superbase/`, variable `SUPERBASE_URL`) — this is intentional/consistent throughout the codebase, not a typo to "fix" in isolation.

---

## Database migrations & scripts

`supabase/migrations/*.sql` is the authoritative, timestamp-ordered schema history (tables, RLS policies, functions like `has_role`/`get_user_roles`, and later additions such as the VMS and Daily Log modules). Apply them with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

In addition, `supabase/` contains a set of **manually-run, idempotent-where-possible** one-off scripts (not part of the CLI migration chain — run directly in the Supabase SQL editor):

- `setup_storage.sql` — creates the public `media` storage bucket and its access policies.
- `setup_cron.sql`, `setup_vms_cron.sql`, `setup_task_reminders_cron.sql` — install the three `pg_cron` jobs described above.
- `setup_recurring_events.sql` — adds recurrence columns to `events`.
- `setup_volunteer_positions.sql` — creates `volunteer_positions`.
- `seed_services.sql` — seeds the charity's core services (safe to re-run, `ON CONFLICT DO NOTHING`).
- `seed_test_data.sql` / `backfill_test_playground.sql` / `cleanup_test_data.sql` — a `TEST_`-prefixed sample dataset for exercising the VMS, plus its cleanup script (matches only rows whose name fields start with `TEST_`, so it's safe against real data).

---

## Testing

- **Vitest** (`vitest.config.ts`) with `jsdom` environment and Testing Library, globals enabled (`describe`/`it`/`expect` available without imports).
- Test files match `src/**/*.{test,spec}.{ts,tsx}`; current coverage is a starter example (`src/tests/example.test.ts`) plus setup (`src/tests/setup.ts`) — the suite is scaffolded but not yet a comprehensive regression net, so treat new features as needing their own tests rather than assuming existing coverage.

```bash
npm run test
```

---

## Deployment

- **Frontend**: Vercel. `vercel.json` rewrites all paths to `/index.html` so client-side routing works on hard refresh/direct links. Vercel Analytics is mounted globally in `App.tsx`.
- **Backend**: Supabase-hosted Postgres/Auth/Storage; Edge Functions are deployed via `supabase functions deploy <name>` (Supabase CLI), each picking up its secrets from the project's function environment.
- **Email sending domain**: Resend, sending as `WAPM <noreply@weareplasmadoc.co.uk>`.
- Changing the `verify_jwt` requirement for a function is done in `supabase/config.toml` and takes effect on redeploy.
