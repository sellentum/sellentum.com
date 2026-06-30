# Sellentum Project Progress Report

Last updated: **30 June 2026**

Production site: **https://www.sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Main branch: **main**

---

## 1. Simple current answer

Sellentum is now a real working MVP, but it is **not yet a fully proven production SaaS**.

The important difference:

- **Built in code** means the feature exists inside the app.
- **Production-proven** means we tested it live with real products, real signup, real widget embed, real analytics, and real user journeys.

Right now:

| Area | Current state |
|---|---|
| Core MVP code | Mostly built |
| Live production setup | Mostly connected |
| Real merchant workflow proof | Still needs testing |
| UI/product polish | Needs simplification |
| Zoovu-level maturity | Still early |

My honest estimate:

| Category | Progress |
|---|---:|
| MVP feature build | **80–85%** |
| Production infrastructure | **70–75%** |
| Real-world launch proof | **30–40%** |
| Serious SaaS polish | **40–45%** |
| Zoovu-style platform maturity | **10–15%** |

So the product is not only 10% done anymore. But it is also not “finished” in the serious SaaS sense.

The next real milestone is:

> A business owner can sign up, upload products, create a finder, embed it on a storefront, receive product recommendations, and see useful analytics — all on production.

---

## 2. Markdown cleanup status

Current useful Markdown files in the repo:

| File | Keep? | Why |
|---|---|---|
| `README.md` | Yes | Technical setup, local run, Supabase, Vercel, CSV, widget and production verification instructions. |
| `SELLENTUM_PROGRESS_REPORT.md` | Yes | Human-readable progress, next steps, ownership and launch status. |

I checked the repo and there are no extra duplicate progress/audit Markdown files left to remove right now.

Going forward, this file should be the main progress report.

---

## 3. What has been completed so far

### Stage 1 — App foundation

Status: **Done**

What is done:

- Next.js app created.
- React and Tailwind CSS setup.
- Reusable components added.
- App routing created.
- API routes added.
- Project is Vercel-ready.

Meaning:

> Sellentum has a real application foundation, not just a landing page.

---

### Stage 2 — Brand, folder, GitHub and domain

Status: **Done**

What is done:

- Brand changed from **Findly** to **Sellentum**.
- Local folder renamed to **sellentum**.
- Git remote moved to the Sellentum GitHub organization.
- Main branch connected to the new repo.
- Production domain connected at **sellentum.com**.
- Vercel deployment is active.

Still to watch:

- If any old “Findly” wording appears anywhere, replace it immediately.

---

### Stage 3 — Public marketing website

Status: **Mostly done**

What is done:

- Landing page.
- Hero section.
- Feature sections.
- How-it-works sections.
- Use-case sections.
- Pricing placeholder.
- CTA sections.
- Public support/resource/security/legal-style pages.

What still needs improvement:

- Final pricing copy.
- More direct founder/company story.
- Final legal review for Terms and Privacy.
- Stronger conversion copy after the first real demo flow is proven.

Meaning:

> The website is good enough for early credibility, but not yet final sales-grade positioning.

---

### Stage 4 — Authentication

Status: **Built, needs final production proof**

What is done:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Email verification through Supabase.
- Forgot password route.
- Reset password route.
- Production redirect settings were discussed.
- Branded Sellentum email sending was discussed through SMTP.

What still needs proof:

- Signup on **https://www.sellentum.com**.
- Verification email opens the production site, not localhost.
- Login works after email verification.
- Forgot-password email works.
- Reset-password flow works.
- Login form no longer shows demo credentials by default.

Owner:

- **You:** test production signup with a real email inbox.
- **Codex:** fix app-side issues if the production flow fails.

---

### Stage 5 — Supabase database and security

Status: **Verified from Codex side**

What is done:

- Supabase schema files exist.
- Main tables were created:
  - profiles
  - products
  - quizzes
  - questions
  - answer options
  - recommendation rules
  - analytics events
  - widget settings
- Row Level Security was added.
- Supabase production repair scripts were added.
- Supabase verification scripts were added.
- Schema/RLS verification passed from the local project.

Latest known verification:

```text
npm run verify:supabase-schema
Result: All schema/RLS checks passed.
```

Meaning:

> The main database blocker is cleared, but live user testing still matters.

---

### Stage 6 — Merchant dashboard

Status: **Built, needs simplification**

What is done:

- Dashboard home.
- Products section.
- Product finder section.
- Widget/settings section.
- Analytics section.
- Production verification section.
- Launch proof queue.
- Next-best-action card.
- Temporary MVP audit section removed.

What still needs improvement:

- Make dashboard language less technical.
- Improve empty states.
- Improve loading states.
- Improve error messages.
- Make every dashboard page clearly answer: “What should I do next?”
- Remove founder/internal wording from merchant-facing pages.

Meaning:

> The dashboard exists, but it needs to feel less like a builder tool and more like a calm SaaS product.

---

### Stage 7 — Product catalog

Status: **Built, needs real catalog test**

What is done:

- Add products manually.
- Edit products.
- Delete products.
- Upload CSV products.
- Product fields include:
  - name
  - price
  - image URL
  - category
  - description
  - features
  - tags
  - product URL
- CSV importer supports flexible headings.
- Validation exists for imported data.
- First-catalog launch kit was added.
- Supplier/developer brief was added.
- CSV template support was added.

What still needs proof:

- Upload a real or realistic product CSV.
- Confirm product images load.
- Confirm Buy Now URLs work.
- Confirm tags/categories/features are good enough for matching.
- Fix importer gaps found from real data.

Owner:

- **You:** provide or upload the first real product CSV.
- **Codex:** improve import/matching issues after real catalog testing.

---

### Stage 8 — Product finder / quiz builder

Status: **Built, needs real workflow proof**

What is done:

- Create product finder quizzes.
- Add questions.
- Add answer options.
- Connect answers to:
  - product tags
  - categories
  - features
  - budget logic
  - recommendation rules
- Save and edit finder flows.
- Publish-readiness checks exist.
- Branching/conditional flow support exists in code.
- Recommendation lab/testing tools exist.
- Product Finders dashboard includes a first-finder launch kit with readiness cards, suggested question plan and copyable finder brief.

What still needs proof:

- Build one real finder from a real catalog.
- Use the first-finder brief after real catalog upload to shape the first production flow.
- Test multiple shopper paths.
- Confirm there are no dead-end paths.
- Confirm each important answer maps to useful product logic.
- Confirm the builder is understandable for a normal merchant.

Owner:

- **You:** choose the first example store/category we should test with.
- **Codex:** improve the builder UX and recommendation checks.

---

### Stage 9 — Recommendation engine

Status: **Built**

What is done:

- Product selection is deterministic.
- Matching uses rule-based signals like:
  - tags
  - categories
  - features
  - budget
  - buyer intent
- AI does not choose the products.
- AI/fallback text explains why selected products match the shopper.
- Fallback explanation works when OpenAI is unavailable.

What still needs improvement:

- More real-data testing.
- Better explanation quality review.
- Better handling of weak/no-result journeys.
- More merchant-readable scoring explanations.

Meaning:

> The correct architecture is in place: rules select, AI explains.

---

### Stage 10 — Customer-facing finder

Status: **Built, needs live journey proof**

What is done:

- Shopper can answer guided questions.
- Shopper receives recommended products.
- Results include:
  - product image
  - title
  - price
  - explanation
  - Buy Now button
- Restart and interaction tracking exist.

What still needs proof:

- Test with real products.
- Confirm recommendations are useful.
- Confirm explanations feel trustworthy.
- Confirm Buy Now button clicks track correctly.
- Confirm the experience feels polished on desktop.

Note:

> Mobile is intentionally not the priority right now because you asked to focus on desktop first.

---

### Stage 11 — Embeddable widget

Status: **Built, needs real storefront test**

What is done:

- JavaScript widget loader exists.
- Supports modal and inline iframe modes.
- Widget can load a published finder.
- Snippet can be copied from the dashboard.
- Storefront demo/testing pages exist.
- Widget analytics are connected.

What still needs proof:

- Install the snippet on a real or staging ecommerce page.
- Confirm the modal opens correctly.
- Confirm the iframe loads correctly.
- Confirm analytics events are recorded from the embedded page.
- Confirm no browser/CORS/script loading issue appears.

Owner:

- **You:** provide a staging page or test storefront where the widget can be installed.
- **Codex:** debug widget install/runtime issues.

---

### Stage 12 — Analytics

Status: **Built, needs live event proof**

What is done:

- Tracks widget views.
- Tracks quiz starts.
- Tracks completed quizzes.
- Tracks recommended products.
- Tracks Buy Now clicks.
- Analytics dashboard exists.
- Launch analytics proof tooling exists.

What still needs proof:

- Run one full embedded shopper journey.
- Confirm every expected event appears.
- Confirm event sequence is correct.
- Confirm recommended products and Buy Now clicks are attached to the right session.

Meaning:

> Analytics are built, but we need production event evidence.

---

### Stage 13 — Settings

Status: **Built**

What is done:

- Brand name setting.
- Primary color setting.
- Button text setting.
- Widget title setting.
- Welcome message setting.
- Shared branding for public finder/widget surfaces.

What still needs improvement:

- Better preview of how settings affect the live widget.
- More beginner-friendly copy.

---

### Stage 14 — AI/OpenAI setup

Status: **Built, needs production usage monitoring**

What is done:

- OpenAI API key environment variable support.
- OpenAI model environment variable support.
- AI-generated explanation support.
- Deterministic fallback when OpenAI is not available.
- AI readiness checks exist.

What still needs improvement:

- Monitor cost.
- Monitor explanation quality.
- Confirm OpenAI works in production after Vercel deployment.
- Add safer admin visibility around when AI was used vs fallback.

---

### Stage 15 — Extra advanced areas already added

Status: **Partially built, not MVP-critical**

The codebase also contains several more advanced areas, including:

- semantic search,
- conversational advisor,
- configurator/bundle builder,
- launch studio,
- AI trust/grounding tools,
- partner/channel packaging,
- storefront QA tools,
- release center,
- usage and plan placeholders.

These are useful long-term, but they should not distract from the next immediate goal.

Immediate priority should remain:

> Products → Finder → Widget → Analytics → Production proof.

---

## 4. What is left before calling this a serious production MVP

### Priority 1 — Prove production auth

Needs to happen:

- Sign up on production.
- Verify email.
- Login.
- Forgot password.
- Reset password.

Why it matters:

> If signup/login is not smooth, nothing else matters.

---

### Priority 2 — Upload the first real catalog

Needs to happen:

- Upload a real CSV.
- Confirm all product data appears correctly.
- Confirm images and URLs work.
- Confirm tags/features/categories are good enough.

Why it matters:

> The recommendation engine is only as good as the product data.

---

### Priority 3 — Build the first real finder

Needs to happen:

- Create a real product finder.
- Add 3–5 useful questions.
- Map answers to product tags/categories/features/budget.
- Test multiple shopper paths.
- Publish the finder.

Why it matters:

> This is the core product promise.

---

### Priority 4 — Embed the widget on a real page

Needs to happen:

- Copy the widget snippet.
- Install it on a staging/storefront page.
- Open the modal or inline widget.
- Complete a shopper journey.
- Click Buy Now.

Why it matters:

> Sellentum only becomes valuable when it works outside the dashboard.

---

### Priority 5 — Prove analytics

Needs to happen:

- Confirm widget view.
- Confirm quiz start.
- Confirm quiz completion.
- Confirm recommended products.
- Confirm Buy Now click.

Why it matters:

> Analytics prove the product is useful to the merchant after launch.

---

### Priority 6 — Simplify the product experience

Needs to happen:

- Reduce technical language.
- Improve empty states.
- Add clearer setup guidance.
- Make dashboard pages feel calmer and more premium.
- Hide or simplify advanced tools until the core flow is proven.

Why it matters:

> A serious SaaS product should feel obvious to use, not impressive but confusing.

---

## 5. What Codex should work on next

Latest completed Codex interval:

- Added the first-finder launch kit to the Product Finders dashboard.
- Added readiness cards for catalog choice, question language, deterministic answer rules and published finder proof.
- Added a suggested first-finder question plan.
- Added a copyable first-finder brief.
- Added smoke-test coverage for the launch kit.

I should continue in this order:

1. Make the dashboard setup flow clearer:
   - Step 1: Upload products.
   - Step 2: Create finder.
   - Step 3: Publish finder.
   - Step 4: Embed widget.
   - Step 5: Check analytics.
2. Improve production-proof screens so they show plain English pass/fail status.
3. Improve merchant empty states across dashboard pages.
4. Keep validation running after each meaningful step.
5. Commit and push completed work to GitHub so Vercel can deploy it.

---

## 6. What you need to do next

Your next actions:

1. Test signup/login again on **https://www.sellentum.com**.
2. Confirm whether the verification email is branded correctly.
3. Prepare or upload the first real product CSV.
4. Tell me what product category/store we should use for the first real finder.
5. Provide a staging or test page where the widget can be embedded.

If you only want to do one thing next, do this:

> Create one production account on sellentum.com and confirm whether signup, verification and login work cleanly.

---

## 7. Current project position in one sentence

Sellentum has the core MVP built, but the next phase is about proving the full production journey with real data and making the product feel simple, trustworthy and serious.
