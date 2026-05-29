# ClipFlow AI

ClipFlow AI is a Next.js + Supabase + OpenAI + n8n app for managing Whop Content Rewards campaigns and clipping deals without relying on aggressive scraping.

## What it does

- Add and store campaign briefs, deadlines, asset links, statuses, and payout estimates
- Send campaign data to an n8n webhook from a single AI processing action
- Receive structured requirements, checklist items, titles, descriptions, captions, and rejection warnings
- Flag risky captions when disclosure or hashtag rules are violated
- Track clip title, platform, caption, posted link, views, and Whop submission status manually
- Send campaign payloads to an n8n webhook and receive generated outputs back

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the values you want to use.

3. Run the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Runtime modes

- Demo mode: If Supabase or OpenAI env vars are missing, the app uses `data/demo-db.json` plus heuristic AI fallbacks so the workflow still runs locally.
- Live mode: When `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENAI_API_KEY` are present, the app writes to Supabase and uses the OpenAI Responses API.

## Supabase

Run the SQL in [supabase/schema.sql](./supabase/schema.sql) to create the required tables.

## n8n webhook contract

ClipFlow AI POSTs the following payload to the configured webhook:

```json
{
  "event": "requirements.extract",
  "callbackUrl": "http://localhost:3000/api/n8n/callback",
  "campaign": {},
  "requestedAt": "2026-05-29T00:00:00.000Z"
}
```

The webhook can either:

- return JSON immediately with `extraction` and/or `captions`
- or POST back later to `/api/n8n/callback`

Async callback shape:

```json
{
  "campaignId": "your-campaign-id",
  "extraction": {},
  "captions": {}
}
```

## Guardrails

- Do not scrape Whop aggressively
- Require manual paste of campaign requirements when access is limited
- Use official assets only
- Include FTC disclosure if required
- Block extra hashtags when the campaign forbids them
- Keep uploads and Whop submission manual for now
