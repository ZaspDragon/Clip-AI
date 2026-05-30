# TempTrack Pro

TempTrack Pro is a Supabase-powered staffing agency timeclock SaaS for:

- agency signup and admin login
- client and job site setup
- worker records and site assignments
- QR-based public worker punching with no worker login
- weekly timesheets generated from punches
- client manager approvals
- agency payroll CSV export
- support tickets and a lightweight billing/settings structure

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
PLATFORM_OWNER_EMAIL=owner@temptrackpro.com
PLATFORM_OWNER_PASSWORD=ChangeMe123!
```

Notes:

- `NEXT_PUBLIC_APP_URL` should match the deployed base URL so QR posters point to the right worker clock route.
- `OPENAI_*` is only kept for legacy compatibility with old unused routes; TempTrack Pro core flows do not depend on it.

## Supabase setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run:

   [C:\Users\ileva\Documents\Codex\2026-05-29-build-a-full-stack-app-called\clipflow-ai\supabase\schema.sql](</C:/Users/ileva/Documents/Codex/2026-05-29-build-a-full-stack-app-called/clipflow-ai/supabase/schema.sql>)

3. In Supabase Auth settings:
   - set your site URL to your deployed TempTrack Pro URL
   - add local development redirect URLs if needed
   - disable email confirmation if you want immediate password login for local/manual testing

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed test accounts and sample data

Run:

```bash
npm run seed:test-data
```

This script will create or repair:

- platform owner account
- sample agency admin account
- sample client manager account
- one agency
- one client
- one site
- one worker
- one assignment
- sample punches that generate a pending timesheet

Seed script:

[C:\Users\ileva\Documents\Codex\2026-05-29-build-a-full-stack-app-called\clipflow-ai\scripts\seed-test-accounts.mjs](</C:/Users/ileva/Documents/Codex/2026-05-29-build-a-full-stack-app-called/clipflow-ai/scripts/seed-test-accounts.mjs>)

## Test accounts

The seed script creates:

- Platform Owner
  - email: value of `PLATFORM_OWNER_EMAIL`
  - password: value of `PLATFORM_OWNER_PASSWORD`
- Agency Admin
  - email: `agencyadmin@northstarstaffing.com`
  - password: `ChangeMe123!`
- Client Manager
  - email: `manager@alphawarehouse.com`
  - password: `ChangeMe123!`

Workers do not log in.

## Main routes

- `/` worker clock home page
- `/clock` public worker clock page
- `/signup` agency signup
- `/login` admin and manager login
- `/dashboard` agency dashboard
- `/clients`
- `/sites`
- `/workers`
- `/assignments`
- `/qr`
- `/timesheets`
- `/approvals`
- `/payroll`
- `/support`
- `/help`
- `/settings`
- `/billing`

## Worker QR URL

Each site QR points to:

```text
{NEXT_PUBLIC_APP_URL}/clock?agencyId=AGENCY_ID&clientId=CLIENT_ID&siteId=SITE_ID
```

Example local format:

```text
http://localhost:3000/clock?agencyId=...&clientId=...&siteId=...
```

## What was tested locally

Validated in code and build:

- production build passes
- lint passes
- signup API compiles and auto-provisions the user metadata flow
- public clock route compiles and supports agency, client, site, worker, and punch actions
- client/site/worker/assignment pages compile cleanly with direct Supabase CRUD
- QR poster route compiles with copy, download, and print actions
- timesheet, approval, payroll, support, and settings routes compile cleanly

## End-to-end workflow to verify after Supabase is connected

1. Open `/signup`.
2. Create a new agency admin.
3. Log in and confirm the dashboard loads.
4. Create a client on `/clients`.
5. Create a job site on `/sites`.
6. Create a worker on `/workers`.
7. Create an assignment on `/assignments`.
8. Generate a QR poster on `/qr`.
9. Open the QR URL from a phone or incognito window.
10. Select the worker and punch:
    - Clock In
    - Start Lunch
    - End Lunch
    - Clock Out
11. Confirm punches appear on `/timesheets`.
12. Create a client manager login on `/approvals`.
13. Log in as that client manager and approve or reject the timesheet.
14. Log back in as the agency admin and export the approved payroll CSV on `/payroll`.

## Core reliability notes

- workers do not need email login or passwords
- worker punches are saved through Supabase, not localStorage
- public worker access uses controlled database functions instead of exposing full table reads
- agency admins and client managers are separated by Supabase policies
- audit logs are created automatically by database triggers for create, update, and delete activity on core business tables
- timesheets are rebuilt automatically from punches in the database
