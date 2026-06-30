# Sellentum Project Progress Report

Last updated: **30 June 2026**

Production website: **https://www.sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Main branch: **main**

---

## 1. Simple summary

Sellentum is no longer just an idea or landing page.

It is now a working early SaaS MVP for ecommerce guided selling.

The product already lets a merchant:

- create an account,
- access a protected dashboard,
- add products manually,
- upload products using CSV,
- create guided product finder quizzes,
- match shopper answers to products using deterministic rules,
- generate AI-assisted recommendation explanations,
- publish a customer-facing product finder,
- embed the widget on another website,
- track basic analytics events.

The honest current position:

> **Sellentum is a working MVP in code, but it is not yet fully production-proven.**

That means the product has been built, but we still need to prove it with:

- the real production Supabase database,
- real signup and email verification,
- a real product catalog,
- a real published finder,
- a real storefront widget install,
- real analytics events.

---

## 2. Overall progress

| Area | Current status | Human meaning |
|---|---|---|
| MVP feature build | **80–85% done** | Most of the original MVP features exist in the app. |
| Production setup | **50–60% done** | Vercel and domain are live; Supabase still needs final verification. |
| Real-world proof | **25–35% done** | We still need to test with real catalog data, real auth emails and a real widget install. |
| SaaS polish | **35–45% done** | The product works, but needs simpler UX, clearer onboarding and stronger launch polish. |
| Zoovu-level maturity | **10–15% done** | Zoovu is an enterprise platform; Sellentum is still an early focused SaaS MVP. |

The correct goal for the next phase is not to copy Zoovu feature-for-feature.

The correct goal is:

> **Make Sellentum reliable, clear and trustworthy enough for a real ecommerce brand to use.**

---

## 3. Current product status

| Product area | Status | What is done | What is still left |
|---|---|---|---|
| Brand | **Done** | Product renamed from Findly to Sellentum. | Keep checking for old brand references as we work. |
| Domain | **Done** | `sellentum.com` is live on Vercel. | Canonical app URL currently matches `https://www.sellentum.com`. |
| GitHub | **Done** | Repo moved to Sellentum GitHub organization. | Continue pushing every completed work step. |
| Landing page | **Mostly done** | Premium SaaS-style public website exists. | Final copy, pricing message and legal review. |
| Auth | **Built, needs live proof** | Signup, login, logout, email verification and password reset routes exist. | Test full production signup and reset-password flow. |
| Dashboard | **Built** | Merchant dashboard exists with products, finder builder, widget, analytics and settings areas. | Simplify language and reduce technical noise for non-technical users. |
| Product catalog | **Built** | Manual product CRUD and CSV import exist. | Upload a real catalog and check data quality. |
| Quiz builder | **Built** | Questions, answer options and matching logic exist. | Test with a real production finder. |
| Recommendations | **Built** | Rule-based product selection exists. AI does not choose products. | Tune ranking with real product data. |
| AI explanations | **Built** | AI can explain why a selected product is recommended. | Test quality, speed and cost on real products. |
| Customer finder | **Built** | Shopper can answer questions and see recommended products. | Run full live shopper journey on production. |
| Embeddable widget | **Built** | JavaScript widget and iframe/modal embed exist. | Install on a real or staging ecommerce page. |
| Analytics | **Built, needs proof** | Events exist for views, starts, completions, recommendations and Buy Now clicks. | Generate real production events and confirm they appear correctly. |
| Supabase backend | **Mostly prepared** | Schema, tables, RLS files and verification scripts exist. | Run final repair SQL and production verification. |
| Billing | **Not built yet** | Stripe is placeholder only. | Full billing is intentionally not part of this MVP phase. |

---

## 4. Stage-by-stage progress

### Stage 1 — App foundation

Status: **Done**

What we completed:

- Built the app using Next.js, React and Tailwind.
- Created the main SaaS structure.
- Added reusable UI components.
- Added server/API routes.
- Made the project Vercel-ready.

Why this matters:

> This gave Sellentum a real product foundation instead of a static website.

---

### Stage 2 — Branding and repo setup

Status: **Done**

What we completed:

- Changed the brand from Findly to Sellentum.
- Renamed the local project folder to `sellentum`.
- Changed the Git remote to the new Sellentum GitHub repo.
- Pushed the project to the new GitHub repository.

Still to watch:

- If we discover any leftover “Findly” text later, we should replace it.

---

### Stage 3 — Public website

Status: **Mostly done**

What we completed:

- Built the public landing page.
- Added SaaS-style sections for product value, features, use cases and calls to action.
- Added support/resource-style public pages.
- Made the site feel more like a serious B2B ecommerce SaaS.

Still left:

- Final pricing message.
- Final founder/company copy.
- Final legal review for Privacy Policy and Terms.

---

### Stage 4 — Authentication

Status: **Built, needs production proof**

What we completed:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Email verification support.
- Forgot-password and reset-password routes.
- Supabase auth connection.
- Branded email sender setup discussion.

Still left:

- Test signup on production.
- Confirm the email verification link opens the correct production domain.
- Test login after verification.
- Test forgot-password.
- Test reset-password.

Important note:

> Auth is built, but we should not call it finished until a real production user can sign up, verify email and log in without errors.

---

### Stage 5 — Supabase database and security

Status: **Mostly prepared, final production repair pending**

What we completed:

- Created the Supabase schema structure.
- Added tables for products, quizzes, questions, answers, rules, analytics and widget settings.
- Added row-level security policy files.
- Added verification SQL files.
- Added production verification tooling.
- Added paste-ready Supabase repair SQL inside the Production Verification Center.

Known issue right now:

The production verifier on **30 June 2026** still found two missing backend pieces:

- `widget_settings.allowed_domains`
- `rate_limit_buckets`

Latest verifier result:

```text
npm run verify:production -- --base-url=https://www.sellentum.com
32 pass, 2 warn, 2 fail
```

Repair file already exists:

```text
supabase/verification/production_repair_widget_rate_limits.sql
```

Still left:

- Run that repair SQL in Supabase.
- Rerun production verification.
- Run the full schema/RLS verification SQL.

Owner:

- **You:** run SQL in Supabase.
- **Codex:** verify results, fix code/schema if needed.

---

### Stage 6 — Merchant dashboard

Status: **Built, needs simplification**

What we completed:

- Dashboard home.
- Product catalog area.
- Finder/quiz builder area.
- Widget/settings area.
- Analytics area.
- Production verification area.
- Founder launch queue.
- Removed temporary MVP audit section.

Still left:

- Make the dashboard less technical.
- Improve empty states.
- Improve loading states.
- Improve error messages.
- Make next steps clearer for a normal business owner.

---

### Stage 7 — Product catalog

Status: **Built, needs real catalog testing**

What we completed:

- Add products manually.
- Edit products.
- Delete products.
- Upload products by CSV.
- Support product fields like name, price, image, category, description, features, tags and product URL.
- Added a real-catalog intake checklist and CSV template.

Still left:

- Upload a real or realistic catalog.
- Check whether imported products are clean.
- Check whether tags/features/categories are good enough for recommendations.

Owner:

- **You:** provide or upload a real product CSV.
- **Codex:** inspect quality and improve importer/recommendation readiness if needed.

---

### Stage 8 — Quiz / guided-selling builder

Status: **Built, needs real workflow test**

What we completed:

- Create a product finder.
- Add multiple questions.
- Add answer options.
- Connect answers to matching signals.
- Save and edit finders.
- Publish finder experiences.

Still left:

- Build one real finder using a real catalog.
- Test if the questions feel natural.
- Test if the answer choices lead to good recommendations.

---

### Stage 9 — Recommendation engine

Status: **Built**

What we completed:

- Deterministic matching using product tags, categories, features, budget and rules.
- Product selection is controlled by rules, not by AI.
- AI only writes an explanation after products are selected.

Core principle:

> **Rules select. AI explains.**

Still left:

- Tune product scoring with real product data.
- Check edge cases like no-results or weak matches.

---

### Stage 10 — Customer-facing product finder

Status: **Built, needs live journey proof**

What we completed:

- Shopper-facing question flow.
- Product result cards.
- Recommended product image, title, price and Buy Now button.
- AI/fallback recommendation explanations.

Still left:

- Complete a real production shopper journey.
- Confirm recommendations appear correctly.
- Confirm Buy Now links work.

---

### Stage 11 — Embeddable widget

Status: **Built, needs storefront proof**

What we completed:

- Built `/api/widget.js`.
- Added modal embed mode.
- Added inline iframe embed mode.
- Added widget settings.
- Added a storefront demo page.
- Added install scanner/proof workflow.

Still left:

- Install the widget on a staging or real ecommerce page.
- Confirm the widget loads outside Sellentum.
- Confirm the iframe opens correctly.
- Confirm analytics events are tracked from the embedded widget.

Owner:

- **You:** provide staging/real storefront access or a test page.
- **Codex:** verify widget behavior and fix issues.

---

### Stage 12 — Analytics

Status: **Built, needs production event proof**

What we completed:

- Track widget views.
- Track quiz starts.
- Track completed quizzes.
- Track recommended products.
- Track Buy Now clicks.
- Added analytics dashboard concepts and QA checks.
- Added launch analytics proof for the five critical storefront events.
- Added a copyable analytics proof packet for storefront QA handoff.

Still left:

- Generate real events from a production widget journey.
- Confirm those events appear in Supabase.
- Confirm dashboard numbers are correct.
- Use the new launch analytics proof card after a real widget QA run.

Important:

> Analytics is not truly proven until real production events are visible after a real shopper journey.

---

### Stage 13 — AI and OpenAI

Status: **Built, needs real-quality testing**

What we completed:

- Added OpenAI API support.
- Added AI-generated recommendation explanations.
- Added fallback explanations when OpenAI is unavailable.
- Kept product selection deterministic.

Still left:

- Test explanation quality with real products.
- Check response speed.
- Watch cost once real usage starts.

---

### Stage 14 — Deployment and production verification

Status: **Partly done**

What we completed:

- Vercel project is set up.
- `https://www.sellentum.com` is live as the current canonical app URL.
- Environment variables were added to Vercel.
- Production verification command exists.
- Public routes and auth routes have been checked before.

Still left:

- Apply pending Supabase repair SQL.
- Rerun production verification.
- Complete Supabase schema/RLS verification.
- Test auth and widget end-to-end on production.

---

## 5. What is blocking us right now

These are the real blockers before we can call Sellentum production-ready.

| Priority | Blocker | Owner | What needs to happen |
|---:|---|---|---|
| 1 | Supabase production repair | You | Run the repair SQL file in Supabase SQL editor. |
| 2 | Supabase verification | You + Codex | Run schema/RLS verification and fix failures. |
| 3 | Production auth test | You + Codex | Test signup, email verification, login and password reset. |
| 4 | Real catalog test | You + Codex | Upload a real or realistic CSV catalog. |
| 5 | Real finder test | Codex + You | Build and test one serious product finder. |
| 6 | Widget proof | You + Codex | Install widget on staging/real storefront and test it. |
| 7 | Analytics proof | Codex + You | Confirm real production events appear correctly. |

---

## 6. Exact next steps

### Step 1 — Run the Supabase repair SQL

Owner: **You**

Open Supabase SQL editor and run:

```text
supabase/verification/production_repair_widget_rate_limits.sql
```

Easier option:

Open **Dashboard → Production Verification Center** and click **Copy repair SQL**, then paste it directly into Supabase SQL editor.

Then tell Codex whether it succeeded or paste the error.

---

### Step 2 — Rerun production verification

Owner: **Codex**

After the Supabase repair succeeds, Codex should run:

```bash
npm run verify:production -- --base-url=https://www.sellentum.com
```

Goal:

- no failed checks,
- only acceptable warnings,
- clear next action if anything fails.

---

### Step 3 — Run full Supabase schema/RLS verification

Owner: **You + Codex**

Run:

```text
supabase/verification/production_schema_check.sql
```

Goal:

- every required table exists,
- RLS is enabled,
- policies are correct,
- production backend is safe enough for MVP use.

---

### Step 4 — Test production auth

Owner: **You + Codex**

Test these flows:

- signup,
- email verification,
- login,
- forgot password,
- reset password.

Goal:

> A new merchant can create an account and reach the dashboard on production.

---

### Step 5 — Upload a real product catalog

Owner: **You + Codex**

Use a real or realistic CSV.

Goal:

- products import correctly,
- images load,
- Buy Now links work,
- categories/tags/features are useful for matching.

---

### Step 6 — Build one real finder

Owner: **Codex + You**

Create one serious guided-selling flow from the real catalog.

Goal:

- questions feel natural,
- answers are understandable,
- recommendations make sense,
- AI explanations are believable.

---

### Step 7 — Install and test the widget

Owner: **You + Codex**

Install the widget on a staging or real storefront page.

Goal:

- widget loads,
- quiz opens,
- shopper completes the flow,
- recommended products appear,
- Buy Now button works,
- analytics events are recorded.

---

### Step 8 — Polish the SaaS experience

Owner: **Codex**

Improve:

- dashboard clarity,
- onboarding,
- wording,
- empty states,
- loading states,
- error messages,
- launch checklist,
- final desktop UI polish.

---

## 7. What Codex has already done

This is the plain-English log of work completed so far:

- Built the first working Sellentum SaaS app.
- Built the public landing website.
- Added authentication pages and protected dashboard routes.
- Connected the app structure to Supabase.
- Added product management.
- Added CSV product import.
- Added guided quiz/finder builder.
- Added deterministic recommendation logic.
- Added AI-generated recommendation explanations.
- Added customer-facing product finder.
- Added embeddable JavaScript widget.
- Added widget settings and branding controls.
- Added analytics tracking.
- Added launch analytics proof and copyable storefront QA evidence.
- Added production verification tooling.
- Added Supabase schema and RLS files.
- Added OpenAI environment support.
- Added Vercel deployment readiness.
- Renamed product from Findly to Sellentum.
- Moved repo to the Sellentum GitHub account.
- Helped configure Vercel environment variables.
- Helped configure branded Supabase email/SMTP direction.
- Removed temporary MVP audit dashboard section.
- Added founder-side launch queue.
- Added real-catalog intake guidance.
- Added storefront widget proof workflow.
- Added Supabase repair guidance.
- Added copyable Supabase repair SQL in the dashboard.
- Added clear README reference to this progress report.

---

## 8. Markdown file cleanup

Current Markdown files intentionally kept:

| File | Keep or remove? | Reason |
|---|---|---|
| `README.md` | **Keep** | Needed for developer setup, deployment and handoff. |
| `SELLENTUM_PROGRESS_REPORT.md` | **Keep** | Main human-readable project progress report. |

There are currently no extra roadmap, audit, research or duplicate progress Markdown files left in the project.

So I did **not** remove `README.md`, because removing it would hurt setup, deployment and future handoff.

---

## 9. Bottom line

Sellentum has crossed the first important line:

> **The MVP exists in working code.**

The next important line is:

> **The MVP is proven on production with real data and real user journeys.**

That is the phase we are in now.

The immediate next action is:

> **Run the Supabase repair SQL, then rerun production verification.**
