# Sellentum Production Roadmap

Last updated: 2026-06-28  
Current repo branch: `main`  
Current production-hardening commit: `260a373 Route workspace analytics through server`

## Purpose

This file is the step-by-step execution path for turning Sellentum from a strong early MVP into a serious production SaaS.

Use this as the source of truth before starting new work. After every completed stage, update:

1. The current status snapshot.
2. The completed stages table.
3. The issue tracker.
4. The next execution stage.
5. The update log.

## North star

Sellentum should become a production-grade product discovery SaaS for ecommerce brands:

> A merchant can sign up, upload a real catalog, create guided product discovery experiences, install a widget on a storefront, capture analytics, and confidently use Sellentum with real shoppers.

The goal is not to clone Zoovu feature-for-feature. The goal is to become a serious, trustworthy, simpler Zoovu-like product for small and mid-market ecommerce brands.

## Status legend

- `Done` — implemented, verified locally, committed, and pushed.
- `Needs production proof` — implemented locally but still needs real Supabase/Vercel/storefront verification.
- `In progress` — currently being worked on.
- `Next` — should be handled soon.
- `Backlog` — important, but not immediate.
- `Later` — intentionally deferred.

## Current status snapshot

Sellentum is currently in early production hardening.

What is real now:

- SaaS landing page exists.
- Supabase auth exists.
- Dashboard exists.
- Product CRUD exists.
- CSV import exists.
- Finder builder exists.
- Configurator exists.
- Public finder/advisor/search/configurator runtimes exist.
- Embeddable widget exists.
- Basic analytics exists.
- OpenAI-backed explanation/enrichment paths exist with fallbacks.
- Vercel deployment and custom domain exist.
- Several production hardening stages have already been pushed.

What is not production-proven yet:

- Full production Supabase migration/RLS verification.
- Real merchant catalog end-to-end test.
- Real storefront widget installation.
- All analytics events from a real storefront session.
- Live OpenAI quality/cost verification on real product data.
- Production-grade shared rate limiting.
- Password reset flow.
- Shopify integration.
- Customer proof/case study.
- Monitoring/error reporting/support process.

## Completed hardening stages

| Stage | Status | Commit | Description |
|---:|---|---|---|
| 1 | Done | `c5a49bb` | Hardened dashboard navigation, overview actions, widget loader consistency, accessibility polish. |
| 2 | Done | `2ce8c1c` | Split local/demo telemetry from public API telemetry to avoid bad `/api/events` posts. |
| 3 | Done / Needs production proof | `62de2cc` | Added transactional Supabase RPC saves for nested finder/configurator builders. |
| 4 | Done / Needs production proof | `d82bfdf` | Added widget storefront-domain allowlist and analytics origin validation. |
| 5 | Done | `6042c3f` | Standardized generated public URLs/snippets/API handoffs on globally unique experience IDs. |
| 6 | Done | `260a373` | Routed authenticated workspace analytics writes through a server endpoint instead of browser Supabase inserts. |

## Immediate next stages

### Stage 7 — Production shared rate limiting

Status: Next

Problem:

Current rate limiting is in-memory. That is weak on Vercel/serverless because limits are not shared across instances.

Goal:

Add a production-ready shared rate-limit abstraction, preferably Supabase-backed first because Sellentum already depends on Supabase.

Acceptance criteria:

- Add persistent rate-limit storage or RPC.
- Keep safe local in-memory fallback for development.
- Update all public/workspace API rate-limit calls to use the shared limiter.
- Return consistent `429` responses with retry headers.
- Add schema/migration docs.
- Verify `npm run lint`, `npm run typecheck`, `npm run build`.
- Commit and push.

Suggested implementation:

- Create `public.rate_limit_buckets` table or equivalent RPC-backed function.
- Add a server helper such as `checkSharedRateLimit`.
- Keep current in-memory helper as fallback when Supabase service role is missing.
- Apply to:
  - `/api/events`
  - `/api/workspace/events`
  - public finder/advisor/search/configurator routes
  - AI generation/enrichment routes
  - storefront scanner

### Stage 8 — Supabase production verification packet

Status: Next

Problem:

Some hardening work exists in local schema/migrations, but production Supabase still needs verified state.

Goal:

Create a clear Supabase verification packet and confirm production tables, columns, functions, policies, and key runtime flows.

Acceptance criteria:

- Confirm all migrations exist in production.
- Confirm `widget_settings.allowed_domains`.
- Confirm transactional RPCs:
  - `save_quiz_with_children`
  - `save_configurator_with_children`
- Confirm `analytics_events` RLS read-only browser policy remains safe.
- Confirm public/server write paths work.
- Confirm dashboard Data Contract shows expected passes.
- Document any manual Supabase SQL the user must run.

### Stage 9 — Auth completion and account recovery

Status: Next

Problem:

Signup/login exists, but forgot password flow is incomplete.

Goal:

Make auth feel like serious SaaS.

Acceptance criteria:

- Implement forgot password action.
- Add reset password page.
- Use branded Sellentum redirect URLs.
- Add correct input names and autocomplete attributes.
- Confirm verified email and reset flows route to `sellentum.com`, not localhost.
- Verify build.
- Commit and push.

### Stage 10 — Public payload and recommendation rule privacy

Status: Next

Problem:

Public finder GET currently exposes answer matching metadata that should ideally stay server-side.

Goal:

Keep deterministic recommendation logic private while still rendering the customer-facing questions/options.

Acceptance criteria:

- Public GET only returns display-safe question/option fields.
- Public POST validates option IDs server-side and computes matching privately.
- Customer UI still functions.
- No match weights/rule values leaked in public config payload.
- Verify build.
- Commit and push.

### Stage 11 — Real production proof session

Status: Next

Problem:

The app exists, but production proof is incomplete.

Goal:

Run one real end-to-end production proof using real Supabase data and a real/staging storefront page.

Acceptance criteria:

- Create or import one realistic product catalog.
- Publish one finder.
- Publish one configurator if useful.
- Install widget on a real/staging page.
- Complete a shopper journey.
- Confirm these events:
  - `widget_view`
  - `quiz_start`
  - `quiz_complete`
  - `product_recommended`
  - `buy_click`
- Confirm Buy Now links work.
- Capture screenshots or notes in a production proof report.

## Full roadmap

### Phase 1 — Production foundation

Goal: make the current product safe enough to run with real users.

| Stage | Status | Work |
|---:|---|---|
| 1 | Done | Dashboard/widget/navigation hardening. |
| 2 | Done | Runtime data-source telemetry cleanup. |
| 3 | Done / Needs production proof | Transactional builder saves. |
| 4 | Done / Needs production proof | Widget domain allowlist. |
| 5 | Done | Stable public experience IDs. |
| 6 | Done | Server-side authenticated analytics writes. |
| 7 | Next | Shared production rate limiting. |
| 8 | Next | Production Supabase schema/RLS verification. |
| 9 | Next | Auth reset/recovery polish. |

### Phase 2 — Trust, safety, and runtime hardening

Goal: reduce security, abuse, and reliability risks.

| Stage | Status | Work |
|---:|---|---|
| 10 | Next | Hide public recommendation logic metadata. |
| 11 | Backlog | Improve storefront scanner SSRF protection. |
| 12 | Backlog | Signed widget/session tokens beyond domain allowlist. |
| 13 | Backlog | Better public error messages and merchant-safe failure copy. |
| 14 | Backlog | Add route-level smoke tests for public runtimes. |
| 15 | Backlog | Add basic monitoring/logging strategy. |

### Phase 3 — Merchant workflow quality

Goal: make product setup and finder launch smooth for a real ecommerce owner.

| Stage | Status | Work |
|---:|---|---|
| 16 | Backlog | Batch CSV import with row-level validation and import summary. |
| 17 | Backlog | Product QA warnings for missing images, missing URLs, weak descriptions. |
| 18 | Backlog | Better empty states and setup guidance. |
| 19 | Backlog | Simplify dashboard starter mode for first-time merchants. |
| 20 | Backlog | Replace remote demo imagery with owned/optimized assets. |

### Phase 4 — Customer-facing experience polish

Goal: make the shopper experience reliable, trustworthy, and conversion-friendly.

| Stage | Status | Work |
|---:|---|---|
| 21 | Backlog | Disable/fix Buy Now fallback when product URL is missing. |
| 22 | Backlog | Stress-test long product names, descriptions, and explanations. |
| 23 | Backlog | Add iframe auto-resize/postMessage support. |
| 24 | Backlog | Improve accessibility for public finder/widget flows. |
| 25 | Later | Mobile polish after desktop-first production flow is stable. |

### Phase 5 — AI and recommendation quality

Goal: prove that Sellentum recommendations are reliable, explainable, and useful.

| Stage | Status | Work |
|---:|---|---|
| 26 | Backlog | Live OpenAI verification with real catalog data. |
| 27 | Backlog | Explanation quality tests and fallback copy review. |
| 28 | Backlog | Cost/rate guards for OpenAI routes. |
| 29 | Backlog | Better semantic enrichment QA. |
| 30 | Later | Advanced personalization. |

### Phase 6 — Analytics and launch intelligence

Goal: make analytics useful enough that a merchant understands performance.

| Stage | Status | Work |
|---:|---|---|
| 31 | Backlog | Analytics quality dashboard improvements. |
| 32 | Backlog | Attribution/session journey proof reports. |
| 33 | Backlog | Recommendation feedback reporting. |
| 34 | Backlog | Exportable launch report. |
| 35 | Backlog | Conversion insights based on real sessions. |

### Phase 7 — SaaS commercial readiness

Goal: make Sellentum feel like a real company/product, not an internal MVP.

| Stage | Status | Work |
|---:|---|---|
| 36 | Backlog | Remove public “MVP” wording from pricing/landing copy. |
| 37 | Backlog | Add early-access/starter pricing language. |
| 38 | Backlog | Add Stripe placeholder/billing page polish. |
| 39 | Backlog | Add docs/help center basics. |
| 40 | Backlog | Add support/contact path. |

### Phase 8 — First integration wedge

Goal: make Sellentum easier to install for the most likely early buyers.

| Stage | Status | Work |
|---:|---|---|
| 41 | Backlog | Shopify-first install/import path planning. |
| 42 | Backlog | Shopify catalog import prototype. |
| 43 | Backlog | Shopify theme/widget install guide. |
| 44 | Later | WooCommerce integration. |
| 45 | Later | Magento/BigCommerce/Salesforce Commerce Cloud. |

### Phase 9 — Beta launch and proof

Goal: get from product to trust.

| Stage | Status | Work |
|---:|---|---|
| 46 | Backlog | Create one polished demo brand/case study. |
| 47 | Backlog | Run one real merchant pilot. |
| 48 | Backlog | Capture before/after product discovery story. |
| 49 | Backlog | Turn pilot into public-facing case study. |
| 50 | Backlog | Prepare founder sales/demo deck. |

### Phase 10 — Zoovu-like seriousness, later

Goal: mature Sellentum into a platform with deeper enterprise credibility.

| Stage | Status | Work |
|---:|---|---|
| 51 | Later | Team permissions. |
| 52 | Later | Enterprise SSO. |
| 53 | Later | SOC 2 readiness planning. |
| 54 | Later | Advanced personalization. |
| 55 | Later | Multi-region/multi-locale workflows. |
| 56 | Later | PIM/ERP/CRM integrations. |
| 57 | Later | SLA/support workflows. |

## Original 28-point issue tracker

| # | Status | Issue | Current plan |
|---:|---|---|---|
| 1 | Done | Public demo telemetry source split | Fixed in Stage 2. Add smoke tests later. |
| 2 | Done | Public slug lookup ambiguous across tenants | Fixed in Stage 5. |
| 3 | Done / Needs production proof | Quiz/configurator saves not transactional | Fixed in Stage 3; verify production Supabase. |
| 4 | Done | Browser analytics insert conflicts with RLS | Fixed in Stage 6. |
| 5 | Next | Rate limiting is in-memory | Stage 7. |
| 6 | Done / Watch | Public analytics has no domain allowlist | Fixed in Stage 4; signed tokens later. |
| 7 | Backlog | Dependency audit vulnerabilities | Plan controlled Next.js/dependency upgrade. |
| 8 | Next | Production proof incomplete | Stage 11. |
| 9 | Next | Public finder exposes recommendation metadata | Stage 10. |
| 10 | Backlog | CSV import saves rows one by one | Stage 16. |
| 11 | Backlog | Buy buttons can fall back to `#` | Stage 21. |
| 12 | Backlog | Middleware checks settings on every dashboard request | Review after Supabase production proof. |
| 13 | Next | Forgot password UI has no action | Stage 9. |
| 14 | Next | Auth fields need standard attributes | Stage 9. |
| 15 | Backlog | Demo state initialized in Supabase mode | Clarify data-source boundary after production proof. |
| 16 | Watch | Public routes depend on service-role reads | Keep validating route-level ownership/published status. |
| 17 | Backlog | Storefront scanner SSRF protection is basic | Stage 11. |
| 18 | Backlog | OpenAI production readiness not proven | Stage 26. |
| 19 | Backlog | Embeds use fixed iframe sizing | Stage 23. |
| 20 | Next | Widget install proof external | Stage 11. |
| 21 | Backlog | Dashboard still broad for first-time merchants | Stage 19. |
| 22 | Backlog | Some pages visually dense | Stage 19 / UX pass. |
| 23 | Backlog | Landing has many illustrative controls | Review before paid launch. |
| 24 | Later | Mobile intentionally under-prioritized | Later after desktop path is stable. |
| 25 | Backlog | Remote Unsplash/demo imagery | Stage 20. |
| 26 | Backlog | Result cards need stress testing | Stage 22. |
| 27 | Backlog | Empty/error copy needs production polish | Stage 13. |
| 28 | Backlog | README/public docs still use MVP language | Stage 36. |

## Definition of serious production SaaS

Sellentum should not be considered serious production SaaS until all of these are true:

- Production Supabase schema/RLS verified.
- Production Vercel deployment verified.
- Auth signup/login/reset verified.
- Real product catalog imported.
- Product finder created from real data.
- Widget installed on a real or staging storefront page.
- End-to-end analytics events captured.
- OpenAI explanation/enrichment quality verified with real catalog data.
- Core public APIs protected by production-grade rate limiting.
- Public payloads do not leak private recommendation rules.
- Merchant can understand setup steps without developer help.
- Public website no longer describes the product as an MVP.
- At least one credible demo/case study exists.

## Working rules

1. Do not start random work if an earlier `Next` stage is unfinished unless there is a clear blocker.
2. Each completed stage must be:
   - implemented,
   - locally verified,
   - documented in this file,
   - committed,
   - pushed to GitHub.
3. Production proof stages must distinguish between:
   - code complete,
   - deployed,
   - verified with real data.
4. Keep the product focused on desktop-first until the core SaaS path is stable.
5. Do not add enterprise features before the small/mid-market launch path works.

## Update log

| Date | Commit | Update |
|---|---|---|
| 2026-06-28 | `c5a49bb` | Stage 1 dashboard/widget hardening. |
| 2026-06-28 | `2ce8c1c` | Stage 2 runtime telemetry cleanup. |
| 2026-06-28 | `62de2cc` | Stage 3 transactional Supabase builder saves. |
| 2026-06-28 | `d82bfdf` | Stage 4 widget domain allowlist. |
| 2026-06-28 | `6042c3f` | Stage 5 stable public experience IDs. |
| 2026-06-28 | `260a373` | Stage 6 server-side workspace analytics writes. |
| 2026-06-28 | Roadmap tracker | Added this production roadmap tracker as the source of truth for future stages. |
