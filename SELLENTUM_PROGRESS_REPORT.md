# Sellentum Progress Report

Last updated: **2026-06-30**

Production site: **https://sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Branch: **main**

Latest pushed code before this report update: **85f4119 — Add production Supabase repair pack**

---

## 1. The simple answer

Sellentum is not just a landing page anymore.

The main MVP product is built in code:

- merchants can sign up and log in,
- merchants can add products manually,
- merchants can upload products by CSV,
- merchants can create guided product finders,
- shoppers can answer questions,
- shoppers can receive recommended products,
- AI can explain why a product was recommended,
- the finder can be embedded on another website,
- analytics events can be tracked,
- the app is live on `sellentum.com`.

The honest status:

> Sellentum is a working early SaaS MVP, but it is not fully production-proven yet.

The next job is not “build random more features.”

The next job is to prove the existing product works properly with:

- the real production Supabase project,
- real auth emails,
- a real product catalog,
- a real embedded widget,
- real analytics events.

---

## 2. Overall progress

| Area | Current progress | Meaning |
|---|---:|---|
| Core MVP feature coverage | **80–85%** | Most core features from the original MVP request exist. |
| Production readiness | **45–55%** | The live app exists, but backend/auth/widget/analytics still need proof. |
| Serious SaaS readiness | **35–45%** | Needs polish, onboarding, reliability checks, legal review and live QA. |
| Zoovu-level maturity | **10–15%** | Zoovu is an enterprise platform; Sellentum is still an early focused product. |

The right target for now:

> A smaller, sharper SaaS that helps ecommerce brands upload products, build a finder, embed it, and guide shoppers to the right product.

---

## 3. Current product status

| Product area | Status | What it means |
|---|---|---|
| Brand | **Done** | The app is now Sellentum instead of Findly. |
| Domain | **Live** | `sellentum.com` is live through Vercel. |
| GitHub | **Done** | Repo has moved to the Sellentum GitHub organization. |
| Landing page | **Mostly done** | Looks like a real SaaS, but final copy/pricing/legal polish is still needed. |
| Authentication | **Built, needs live proof** | Signup/login/logout/password reset exist. Need production email testing. |
| Dashboard | **Built** | Merchant dashboard exists. It needs simplification and merchant UX polish. |
| Product catalog | **Built, needs real data test** | Manual products and CSV import exist. Need a real catalog upload. |
| Quiz/finder builder | **Built, needs production DB proof** | Questions, options and matching rules exist. Need Supabase verification. |
| Customer finder | **Built, needs live journey test** | Shopper flow exists. Need a real end-to-end production test. |
| Recommendation logic | **Built** | Rule-based selection exists. AI explains but does not choose products. |
| AI explanations | **Built, needs quality/cost test** | OpenAI integration exists with fallback copy. Needs real catalog testing. |
| Embeddable widget | **Built, needs storefront proof** | JavaScript widget exists. Need real/staging storefront installation. |
| Analytics | **Built, needs event proof** | Tracking exists. Need to confirm real production events in Supabase/dashboard. |
| Supabase backend | **Prepared, needs repair/verification** | Schema/RLS files exist. Production project still needs final SQL repair and checks. |
| Billing | **Not built yet** | Stripe is placeholder only, intentionally outside current MVP. |

---

## 4. What has been done so far

### Stage 1 — MVP app foundation

**Status: Done**

Built the Next.js/Tailwind SaaS app, dashboard structure, API routes, reusable components, Supabase-ready backend structure and Vercel deployment setup.

### Stage 2 — Brand, repo and deployment setup

**Status: Done**

Changed the product from Findly to Sellentum, renamed the project folder, moved the Git remote to the Sellentum GitHub repo, connected Vercel and made `sellentum.com` live.

### Stage 3 — Public website

**Status: Mostly done**

Built the main SaaS website, feature sections, workflow sections, use cases, pricing placeholder, calls to action, Contact, Support, Security, Privacy Policy and Terms pages.

Still needed: final copy polish, final pricing message and legal review.

### Stage 4 — Authentication

**Status: Built, not fully proven in production**

Built signup, login, logout, protected dashboard routes, email verification, forgot password and reset password.

Still needed: test signup, email confirmation and password reset on `https://sellentum.com`.

### Stage 5 — Merchant dashboard

**Status: Built**

Built the dashboard home, product area, finder area, widget/settings area, analytics area and operations/verification areas.

Also removed the temporary MVP audit section.

Still needed: simplify merchant language, improve empty states and make the dashboard less technical.

### Stage 6 — Product catalog

**Status: Built, needs real catalog test**

Built manual product creation, edit/delete, CSV import and core product fields such as name, price, image URL, category, description, features, tags and product URL.

Still needed: upload a real product CSV and check import quality.

### Stage 7 — Guided product finder builder

**Status: Built, needs production Supabase proof**

Built quiz/finder creation, questions, answer options, matching rules and publishing.

Still needed: verify the live Supabase project has all required tables/functions.

### Stage 8 — Recommendation engine

**Status: Built**

Built deterministic recommendation logic using tags, categories, features, budgets and rules.

Important principle:

> Rules select. AI explains.

This means AI is not trusted to choose products by itself.

Still needed: tune recommendation quality with real product data.

### Stage 9 — Customer-facing finder

**Status: Built, needs live testing**

Built the shopper experience where customers answer questions and receive 1–3 recommended products with image, title, price, explanation and Buy Now button.

Still needed: run a full live shopper journey on production.

### Stage 10 — AI support

**Status: Built, needs live quality test**

Added OpenAI support for explanations and safe fallback explanations when OpenAI is unavailable.

Still needed: check explanation quality, speed and cost with real products.

### Stage 11 — Embeddable widget

**Status: Built, needs real storefront proof**

Built the JavaScript widget, modal mode, inline iframe mode and public loader at `/api/widget.js`.

Also added `/storefront-demo` so we can test the real widget script on a simulated ecommerce page.

Still needed: install and test on a real or staging storefront page.

### Stage 12 — Analytics

**Status: Built, needs production event proof**

Built tracking for widget views, quiz starts, completed quizzes, recommended products, Buy Now clicks and shopper journeys.

Still needed: generate real production events and confirm they appear correctly.

### Stage 13 — Supabase production verification

**Status: Partly blocked**

Added schema files, migrations, RLS policies, verification SQL and the production verification command.

Known production issue:

The live verifier found two missing backend items:

- `widget_settings.allowed_domains`
- `rate_limit_buckets`

Repair file already exists:

```text
supabase/verification/production_repair_widget_rate_limits.sql
```

Still needed: run that SQL file in Supabase, then rerun production verification.

---

## 5. Current blockers

These are the real blockers before we can call Sellentum production-ready.

| Blocker | Owner | What needs to happen |
|---|---|---|
| Supabase production repair | User | Run `supabase/verification/production_repair_widget_rate_limits.sql` in Supabase SQL editor. |
| Supabase schema/RLS verification | User + Codex | Run full verification SQL and fix anything that fails. |
| Production auth proof | User + Codex | Test signup, email verification, login, forgot password and reset password on `sellentum.com`. |
| Real catalog test | User + Codex | Upload a real or realistic CSV and check recommendation quality. |
| Real widget proof | User + Codex | Install the widget on a real or staging ecommerce page. |
| Analytics proof | Codex + User | Generate real widget events and confirm they appear in Supabase/dashboard. |
| Final launch polish | Codex | Improve UX, copy, empty states, error messages and launch guidance. |

---

## 6. Next step-by-step plan

### Step 1 — Run Supabase repair SQL

**Owner: User**

Open Supabase SQL editor and run:

```text
supabase/verification/production_repair_widget_rate_limits.sql
```

Tell Codex if it succeeds or paste the error if it fails.

### Step 2 — Rerun production verification

**Owner: Codex**

After the repair SQL is done, run:

```bash
npm run verify:production -- --base-url=https://sellentum.com
```

### Step 3 — Run full Supabase schema/RLS check

**Owner: User + Codex**

Run:

```text
supabase/verification/production_schema_check.sql
```

Goal: every check returns `pass`.

### Step 4 — Test production auth

**Owner: User + Codex**

Test:

- signup,
- email verification,
- login,
- forgot password,
- reset password.

Goal: all auth links open `https://sellentum.com`, not `localhost`.

### Step 5 — Upload real product catalog

**Owner: User + Codex**

User provides a real or realistic CSV.

Codex checks import quality and recommendation readiness.

### Step 6 — Build and publish one real finder

**Owner: Codex + User**

Create one realistic guided finder using the real catalog.

Goal: recommendations feel accurate and explanations are believable.

### Step 7 — Test widget on storefront

**Owner: User + Codex**

Install the widget on a real or staging ecommerce page.

Goal: widget loads, recommendations appear, Buy Now works and analytics events are recorded.

### Step 8 — Final desktop SaaS polish

**Owner: Codex**

Improve:

- dashboard clarity,
- empty states,
- loading states,
- error states,
- merchant onboarding,
- public website copy,
- launch instructions.

---

## 7. What I need from you now

The next thing I need from you is Supabase action:

1. Open your production Supabase project.
2. Open SQL editor.
3. Run:

   ```text
   supabase/verification/production_repair_widget_rate_limits.sql
   ```

4. Tell me whether it succeeded.

After that, I can continue with the production verification step.

Soon after, I will also need:

- a production signup test,
- a real or realistic product CSV,
- a storefront/staging page for widget testing.

---

## 8. Markdown file cleanup

There are currently only two markdown files kept in the project:

| File | Why it is kept |
|---|---|
| `README.md` | Needed for setup, deployment and developer handoff. |
| `SELLENTUM_PROGRESS_REPORT.md` | This human-readable progress report. |

There are no extra roadmap, audit, research or duplicate progress markdown files left in the project.

---

## 9. Bottom line

Sellentum has crossed the first line:

> The MVP exists in working code.

The next line is:

> Prove it works in production with real Supabase data, real auth emails, a real catalog, a real widget install and real analytics events.

That is the work directly ahead.
