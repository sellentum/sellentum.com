# Sellentum Supabase Production Verification

Last updated: 2026-06-28

This packet is for Stage 8 of the production roadmap. It turns Supabase production verification into a repeatable checklist instead of a one-off visual inspection.

## What this proves

The checks verify that production Supabase has:

- Required tables and columns for products, finders, configurators, analytics, settings and shared rate limiting.
- RLS enabled on browser-facing workspace tables.
- Safe analytics policy shape: browser clients can read their own analytics but cannot write analytics directly.
- `widget_settings.allowed_domains`.
- Transactional builder RPCs:
  - `save_quiz_with_children`
  - `save_configurator_with_children`
- Shared rate-limit RPC:
  - `check_rate_limit`
- Service-only rate-limit bucket access.

## Step 1 — Apply missing migrations

In Supabase production, open SQL Editor and run any migration that has not already been applied:

```text
supabase/migrations/007_transactional_experience_saves.sql
supabase/migrations/008_widget_allowed_domains.sql
supabase/migrations/009_shared_rate_limits.sql
```

If production was created fresh from `supabase/schema.sql` after these migrations existed, you may not need to rerun them.

## Step 2 — Run the read-only verification script

Open this file and paste it into the production Supabase SQL Editor:

```text
supabase/verification/production_schema_check.sql
```

Expected result:

- Every row should show `status = pass`.
- If anything shows `fail`, copy the failed rows back into Codex before continuing.

## Step 3 — Run the optional runtime limiter probe

Only run this after Step 2 passes:

```text
supabase/verification/rate_limit_runtime_probe.sql
```

Expected result:

- Attempts 1, 2 and 3: `allowed = true`
- Attempt 4: `allowed = false`
- Every row: `expected_result = pass`

This writes one harmless verification bucket into `public.rate_limit_buckets`.

## Step 4 — Verify inside Sellentum

After production Vercel redeploys from `main`:

1. Log in at `https://sellentum.com/login`.
2. Open `/dashboard/data-contract`.
3. Click `Refresh server proof`.
4. Confirm the schema section includes:
   - `widget_settings`
   - `rate_limit_buckets`
5. Confirm the RPC/schema check is passing.

## What to send back to Codex

If everything passes, send:

```text
Stage 8 Supabase checks passed.
```

If anything fails, send the failed rows from `production_schema_check.sql` and I will fix the exact issue next.
