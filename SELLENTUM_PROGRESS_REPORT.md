# Sellentum Progress Report

Last updated: 2026-06-30

Project: `sellentum.com`

Repo: `https://github.com/sellentum/sellentum.com.git`

Current branch: `main`

Current status: **early production hardening**

## Short answer

Sellentum is no longer just a small MVP shell. The main SaaS product has been built: landing page, login/signup, dashboard, product catalog, finder builder, configurator, widget, customer-facing experiences, analytics, and AI explanation paths.

What is still missing is not “more random screens.” What is missing is **production proof**:

- production Supabase schema/RLS verification,
- production testing of the new forgot/reset password flow,
- hiding private recommendation logic from public payloads,
- one real end-to-end storefront widget test,
- real analytics events from a real shopper journey,
- OpenAI verification with a real catalog.

My honest current estimate:

| Area | Status |
|---|---|
| Core product build | **80–85% done** |
| Production readiness | **45–55% done** |
| Serious paid SaaS readiness | **35–45% done** |
| Zoovu-like enterprise maturity | **Still far away** |

The product idea is proven in code. The next job is proving it safely in production.

## What has been completed

### 1. Brand and deployment foundation

Status: **Done**

We changed the project from Findly to **Sellentum** and moved the repo to the new GitHub organization.

Done:

- Brand renamed to Sellentum.
- Git remote changed to `sellentum/sellentum.com`.
- Vercel project connected.
- `sellentum.com` is live.
- Production environment variables were added in Vercel.
- Project folder renamed locally to `sellentum`.

### 2. Landing page and public website

Status: **Mostly done**

Done:

- SaaS-style landing page.
- Product/platform pages.
- Resources page.
- Industry/use-case pages.
- Desktop-focused visual style.
- B2B ecommerce positioning.

Still needs:

- Remove remaining “MVP” language from some internal/product copy.
- Add clearer pricing/early-access messaging.
- Add basic help/support/contact content.

### 3. Authentication

Status: **Built, needs production email test**

Done:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Supabase email confirmation redirect fixed away from localhost.
- Login form no longer shows fake demo credentials.
- Account settings page added.
- Onboarding gate added.
- Forgot password page added.
- Reset password page added.
- Login now links to the reset flow.
- Reset emails route through `/auth/callback?next=/reset-password`.

Still needs:

- Send a real reset email from production.
- Click the reset email and confirm it lands on Sellentum, not localhost.
- Confirm the new password updates successfully.
- Final branded auth email check.

Next planned app-side step: **public recommendation payload privacy**.

### 4. Business dashboard

Status: **Built, but needs simplification**

Done:

- Dashboard home.
- Product management.
- Product CRUD.
- CSV import.
- Brand/widget settings.
- Analytics.
- Launch tools.
- Data Contract Center.
- AI Readiness Center.
- Production Verification Center.
- Widget Studio.
- Storefront Install Scanner.

The dashboard is powerful, but it has become too broad for a first-time merchant. Later we need a simpler “starter mode.”

### 5. Product catalog

Status: **Built**

Done:

- Add products manually.
- Upload CSV.
- Edit/delete products.
- Store name, price, image URL, category, description, features, tags, product URL, active status.
- Extra discovery fields like buyer needs and semantic search text.
- Catalog QA/intelligence checks.

Still needs:

- Better batch import behavior.
- Cleaner row-level import summary.
- Stronger warnings for missing images/product URLs.

### 6. Finder / quiz builder

Status: **Built**

Done:

- Create product finder quizzes.
- Add questions.
- Add answer options.
- Connect answers to tags/categories/features/budget.
- Add answer weights.
- Add branching logic.
- Save/edit quizzes.
- Publish finders.
- Recommendation lab and QA checks.

Production hardening already done:

- Builder saves are now transactional in Supabase through RPCs.
- This prevents half-saved quizzes/configurators.

Still needs:

- Production Supabase proof that those RPCs exist and work.

### 7. Customer-facing product finder

Status: **Built**

Done:

- Public finder page.
- Customer answers guided questions.
- Returns 1–3 recommended products.
- Product image/title/price/explanation/Buy Now CTA.
- AI explanation after deterministic matching.
- Fallback explanation if OpenAI fails.
- No-result recovery guidance.
- Buy click tracking.

Still needs:

- Hide private rule metadata from public config payloads.
- Real production end-to-end widget test.

### 8. Recommendation logic

Status: **Built**

Done:

- Rule-based product selection.
- Tags, categories, features and budget matching.
- Active product filtering.
- Deterministic ranking.
- AI explains only after products are already selected.

This is important: **AI does not choose the products. Rules choose. AI explains.**

Still needs:

- Public payload privacy pass so customers cannot inspect private matching/rule metadata.

### 9. AI features

Status: **Built, needs live proof**

Done:

- AI product explanation generation.
- AI catalog enrichment path.
- AI quiz generation path.
- AI configurator generation path.
- Safe fallback behavior when OpenAI is missing or fails.
- Grounding/trust checks.

Still needs:

- Test with a real OpenAI key in production.
- Test with a real merchant catalog.
- Check cost/quality.

### 10. Configurator

Status: **Built**

Done:

- Visual configurator builder.
- Configurator steps/options.
- Product-linked options.
- Price deltas.
- Compatibility/incompatibility rules.
- Public customer configurator.
- Server-side validation.
- Configurator QA tools.

Still needs:

- Real production test with real products.

### 11. Embeddable widget

Status: **Built, needs real storefront proof**

Done:

- Copy/paste JavaScript widget.
- Modal iframe mode.
- Inline iframe mode.
- Supports finder, advisor, search and configurator.
- Canonical loader: `/api/widget.js`.
- Compatibility loader: `/widget.js`.
- Storefront install scanner.
- Domain allowlist for widget analytics.

Still needs:

- Install on a real or staging storefront page.
- Run scanner against that page.
- Complete a real shopper journey through the embed.

### 12. Analytics

Status: **Built, needs real event proof**

Done:

- Widget views.
- Quiz starts.
- Completed quizzes.
- Product recommendations.
- Buy clicks.
- Recommendation feedback.
- Session/journey analytics.
- Attribution tracking.

Important hardening done:

- Browser analytics no longer write directly to Supabase.
- Workspace analytics now go through a server route.
- Public widget analytics go through a separate public API with domain checks.

Still needs:

- Confirm real production analytics events from an actual storefront session.

### 13. Supabase backend

Status: **Code ready, production verification still needed**

Done in code:

- Supabase schema.
- RLS policies.
- Product/finder/configurator/analytics tables.
- Transactional save RPCs.
- Widget domain allowlist.
- Shared rate-limit table/RPC.
- Production verification SQL files.

Still needs from you:

1. Open production Supabase SQL Editor.
2. Apply any missing migrations, especially:

   `supabase/migrations/009_shared_rate_limits.sql`

3. Run:

   `supabase/verification/production_schema_check.sql`

4. If every row passes, run:

   `supabase/verification/rate_limit_runtime_probe.sql`

5. Then tell me whether all rows passed.

## Production hardening already completed

These are the serious hardening stages already pushed:

| Stage | Status | What changed |
|---:|---|---|
| 1 | Done | Dashboard navigation and widget loader cleaned up. |
| 2 | Done | Demo/local telemetry no longer wrongly posts to public analytics API. |
| 3 | Needs production proof | Transactional Supabase saves added for finder/configurator builders. |
| 4 | Needs production proof | Widget domain allowlist added. |
| 5 | Done | Public URLs/snippets now use stable global IDs instead of unsafe slugs. |
| 6 | Done | Workspace analytics writes moved to server route. |
| 7 | Needs production proof | Supabase-backed shared rate limiting added. |
| 8 | In progress | Supabase verification packet and SQL checks added. |

## Current blockers

These are the things stopping us from honestly calling Sellentum production-ready:

1. Production Supabase verification has not been completed.
2. Forgot/reset password is implemented, but still needs a real production email test.
3. Public finder payload still needs a privacy pass.
4. No real storefront widget install has been proven yet.
5. No full real production analytics journey has been captured yet.
6. OpenAI has not been tested against a real production catalog yet.
7. Smoke test has a known dashboard overview expectation failure.
8. Dashboard is still too broad for a first-time merchant.

## Next steps in order

Do not jump randomly. This is the correct order:

### Step 1 — Finish Supabase production verification

Owner: **You + Codex**

You run the SQL checks in Supabase.
I fix anything that fails.

### Step 2 — Fix auth recovery

Owner: **Codex + You**

Code status: **Done**

Built:

- forgot password,
- reset password page,
- correct Supabase redirect handling,
- branded auth flow.

Still needs from you:

- request one reset email from production,
- click the email link,
- confirm the password updates and login works.

### Step 3 — Hide public recommendation metadata

Owner: **Codex**

Public APIs should show shoppers only what they need to see, not private matching logic.

### Step 4 — Run one real production proof session

Owner: **You + Codex**

We need:

- real product catalog,
- one published finder,
- widget installed on a real/staging storefront page,
- customer journey completed,
- analytics events confirmed.

### Step 5 — Simplify merchant onboarding/dashboard

Owner: **Codex**

Make the dashboard easier for a real business owner.

## What files matter now

Keep these markdown files:

- `README.md` — developer/setup instructions.
- `SELLENTUM_PROGRESS_REPORT.md` — plain-English project status and next steps.

The older audit/roadmap/research/verification markdown files have been consolidated into this report or moved into SQL verification files.

## Bottom line

Sellentum has a strong product foundation now.

The app can already demonstrate the core idea:

> A merchant can manage products, build a guided product finder, embed it, and give shoppers deterministic recommendations with AI-generated explanations.

But it is not fully production-ready until we verify Supabase, test auth recovery in production, complete public payload privacy, prove a real storefront install, capture real analytics, and verify real OpenAI behavior.

The next immediate action is simple:

> Finish the Supabase production verification.
