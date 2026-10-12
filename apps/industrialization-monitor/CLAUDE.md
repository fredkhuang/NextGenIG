# Startup Industrialization Monitor

Next.js 16 (App Router, Cache Components) + Supabase. It tracks startup factory and pilot sites in the US, Canada and Mexico.
Read `node_modules/next/dist/docs/` before using Next APIs (this version differs from older ones), and follow `../../packages/brand/BRAND.md` for all UI.

## Data model (supabase/migrations)
- companies → sites → announcements. Milestone dates live only in announcements: each restatement is a new row, and the views `site_milestones_current`, `milestone_slips` and `site_timeline` derive current dates and slips.
- Money: announcements (amount_usd, funding_stage, award_status) + announcement_parties → organizations (parent_id) / programs. Query funding through the `funding_flows` view.
- Vague timing is stored as one calendar day: "end of 2025" → 2025-12-31, "mid-2026" → 2026-07-01, "Q1 2027" → 2027-01-01 (`lib/import/transform.ts` parseFuzzyDate, mirrored in the extraction prompt).
- Phased figures: store the initial phase only.
- All edits from extraction, submissions and the scrub become `proposed_changes`, which are applied only when an admin approves them in /admin/queue (`lib/queue/apply.ts`).

## Commands (from this folder)
- `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`
- `pnpm import:xlsx "<sheet.xlsx>" [--dry-run] [--prune]`: legacy sheet import (idempotent; merges in config/site-merges.json)
- `pnpm corpus:build` and `pnpm eval:extract`: extraction test corpus and eval (reports/extract-eval.md)
- `pnpm queue:relabel "<sheet.xlsx>"`: reconcile imported data with source articles
- `pnpm scrub [--dry-run] [--company "Name"] [--no-search] [--search-limit N]`: weekly news scrub (runs in .github/workflows/scrub.yml)
- `supabase db push`: apply migrations. Use `supabase config push` only after checking its diff, because it can overwrite dashboard auth settings.

## Access
- The anon role has no database access: no API reads at all. Public pages read published data on the server with the service key (`lib/supabase/service.ts`, server-only). Admin pages act as the signed-in admin through RLS (`is_admin()`).
- Don't add public data endpoints. The map payload is limited to the fields it displays.

## Env
`.env.local` here holds the Supabase URL, anon key and service role key (Vercel needs the service role key too: the map and submissions use it); `ANTHROPIC_API_KEY` sits in `~/code/.env.local` (loaded by `lib/env.ts` for scripts).
Turnstile: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (Cloudflare test keys are used automatically in dev).
