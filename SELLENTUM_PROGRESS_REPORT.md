# Sellentum Progress Report

Last updated: **2026-06-30**

Website: **https://sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

---

## 1. Plain-English summary

Sellentum is no longer just a landing page or a rough prototype.

The core SaaS product is now built in code:

- a business owner can sign up,
- manage products,
- upload a catalog,
- build guided product finders,
- publish customer-facing experiences,
- embed those experiences on a website,
- collect basic analytics,
- and use AI for explanation copy after deterministic rules choose the products.

The honest status is:

> Sellentum is a strong early SaaS MVP, but it is not yet production-proven.

The next phase is not about adding random new features. The next phase is about proving that the existing product works safely, reliably and clearly for a real merchant on the real domain.

---

## 2. Where we stand right now

| Area | Status | Human meaning |
|---|---|---|
| Brand and domain | Done | Sellentum branding is in place and `sellentum.com` is live. |
| Landing website | Mostly done | The site looks like a real B2B SaaS product, but copy/legal/pricing still need final polish. |
| Authentication | Built | Signup, login, logout and password reset exist. Production email flow still needs full proof. |
| Dashboard | Built | The merchant dashboard exists with catalog, finder, widget, analytics and operations areas. |
| Product catalog | Built | Manual products and CSV import are working in code. Needs real catalog testing. |
| Finder builder | Built | Merchants can create guided questions and answer logic. Needs production Supabase verification. |
| Customer finder | Built | Shoppers can answer questions and get recommended products. Needs live journey testing. |
| Recommendation logic | Built | Product selection is deterministic/rule-based. AI explains; AI does not select products. |
| AI explanations | Built | OpenAI support and safe fallbacks exist. Needs live quality/cost testing. |
| Embeddable widget | Built | Modal and iframe embed support exists. Needs real storefront proof. |
| Analytics | Built | Events are tracked in code. Needs real production event proof. |
| Supabase backend | Prepared | Schema, migrations, RLS and verification SQL exist. Production project still needs verification. |
| Billing | Placeholder only | Stripe/full billing is intentionally not built yet. |

---

## 3. Honest progress estimate

These are practical product-readiness estimates, not file-count estimates.

| Readiness area | Estimate | Meaning |
|---|---:|---|
| Core MVP feature coverage | 80–85% | The main product idea exists in the app. |
| Production readiness | 45–55% | The live setup still needs Supabase, auth, widget, analytics and AI proof. |
| Serious SaaS readiness | 35–45% | Needs polish, onboarding, real data testing, support/legal pages and reliability hardening. |
| Zoovu-level maturity | 10–15% | Zoovu is an enterprise platform. Sellentum is still an early focused product. |

Important:

Sellentum does not need to become Zoovu right now. The correct target is a smaller, sharper SaaS that proves this promise extremely well:

> Ecommerce brands can upload products, build a guided product finder, embed it, and help shoppers choose confidently.

---

## 4. Stage-by-stage progress

### Stage 1 — Foundation, brand, repo and deployment

Status: **Done**

Completed:

- Renamed the product from Findly to **Sellentum**.
- Renamed the local project folder to `sellentum`.
- Moved GitHub remote to the Sellentum organization repo.
- Connected the app to Vercel.
- Put `sellentum.com` live.
- Added production environment variables in Vercel.

Still left:

- Watch every Vercel deployment after important pushes.
- Keep production/staging environment variables clean and consistent.

---

### Stage 2 — Public website

Status: **Mostly done, launch-support pages added**

Completed:

- Premium desktop-first SaaS landing page.
- B2B ecommerce positioning.
- Hero, features, workflow, use cases, pricing placeholder and CTA sections.
- Resources/platform-style pages.
- Sellentum brand language across the app.
- Contact page.
- Support page.
- Security page.
- Privacy Policy page.
- Terms of Service page.
- Shared public footer with support/legal links.

Still left:

- Final marketing copy.
- Better pricing/early-access message.
- Legal review of Privacy and Terms before broad commercial launch.
- Remove any wording that makes the app feel like a temporary MVP.

---

### Stage 3 — Authentication

Status: **Built, needs final production proof**

Completed:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Supabase email confirmation.
- Password reset request page.
- Reset password page.
- Login page no longer shows fake demo credentials.
- Production redirect configuration has been started.
- SMTP branding was discussed so emails can come from Sellentum instead of generic Supabase branding.

Still left:

- Test production signup from `sellentum.com`.
- Click the real confirmation email and confirm it returns to `sellentum.com`.
- Test forgot password from production.
- Confirm the reset link opens `sellentum.com`, not `localhost`.
- Confirm a new password works.
- Confirm email sender/name/branding looks like Sellentum.

---

### Stage 4 — Merchant dashboard

Status: **Built**

Completed:

- Dashboard home.
- Product management.
- Finder management.
- Widget/settings areas.
- Analytics area.
- Operations/QA/verification areas.
- First-launch path added so merchants see what to do first.
- Advanced internal tools are still available but less central.

Still left:

- Test the dashboard as a real merchant, not as a developer.
- Improve empty states and plain-language instructions.
- Keep simplifying anything that feels too technical.

---

### Stage 5 — Product catalog

Status: **Built**

Completed:

- Add products manually.
- Upload products by CSV.
- View, edit and delete products.
- Store product name, price, image URL, category, description, features, tags and product URL.
- Added richer catalog fields for better matching and search.
- Added catalog readiness/health-style tools.

Still left:

- Test with a real product catalog.
- Improve CSV import error messages.
- Add clearer warnings for weak product data.
- Improve bulk cleanup for messy catalogs.

---

### Stage 6 — Guided-selling / quiz builder

Status: **Built**

Completed:

- Create product finder quizzes.
- Add questions.
- Add answer options.
- Connect answers to tags, categories, features and budgets.
- Add answer weighting.
- Add branching logic.
- Save, edit and publish finders.
- Added safer transactional save logic so a builder save is less likely to be half-written.

Still left:

- Confirm the production Supabase database has all required save functions.
- Test with a real merchant use case.
- Make the builder feel less technical.

---

### Stage 7 — Customer-facing product finder

Status: **Built, currently being privacy-hardened**

Completed:

- Customer-facing finder page.
- Shopper answers guided questions.
- System returns 1–3 recommended products.
- Product image, title, price, explanation and Buy Now button are shown.
- Buy button clicks can be tracked.
- Fallback explanations exist if OpenAI fails.
- Public finder responses now hide private answer rules, internal scoring data and merchant-only matching details.

Currently being finished:

- Shared public payload cleanup for finder, advisor, search and configurator experiences.
- This means public shopper-facing APIs should return only shopper-safe product and explanation data, not internal catalog/rule machinery.

Still left:

- Verify the deployed production API responses after Vercel deploys the latest code.
- Run one full shopper journey on the live domain.
- Polish the shopper UI after live testing.

---

### Stage 8 — Recommendation engine

Status: **Built**

Completed:

- Product selection is deterministic.
- Matching uses product data, tags, categories, features, budgets and rules.
- Merchant rules can affect recommendation logic.
- AI is only used after selection to explain why a selected product fits.
- This protects the core promise: **rules select, AI explains**.

Still left:

- Test recommendation quality with a real product catalog.
- Tune matching weights after real examples.
- Watch for weak/no-result journeys.

---

### Stage 9 — AI features

Status: **Built, needs live proof**

Completed:

- OpenAI explanation support.
- AI-assisted catalog enrichment paths.
- AI-assisted finder/configurator generation paths.
- Safe fallback copy when OpenAI is unavailable.
- AI boundary is clear: AI should not secretly choose products.

Still left:

- Test OpenAI on production with the real API key.
- Check explanation quality with real product data.
- Watch response speed and API cost.
- Confirm fallbacks still work if OpenAI fails.

---

### Stage 10 — Embeddable widget

Status: **Built, needs real storefront proof**

Completed:

- JavaScript embed snippet.
- Modal widget mode.
- Inline iframe mode.
- Public widget loader.
- Finder/advisor/search/configurator experience support.
- Widget settings for brand name, color, title, welcome message and button copy.
- Domain/metadata safety work has started.

Still left:

- Install the widget on a real or staging ecommerce page.
- Complete one full shopper journey inside the widget.
- Confirm widget view, start, completion, recommendation and buy-click events are recorded.

---

### Stage 11 — Analytics

Status: **Built, needs production event proof**

Completed:

- Widget view events.
- Quiz start events.
- Quiz completion events.
- Recommended product events.
- Buy button click events.
- Recommendation feedback events.
- Journey/session analytics.
- Server-side event routes so public browser traffic does not write directly into Supabase.

Still left:

- Generate real events from the production widget.
- Confirm events appear in Supabase.
- Confirm dashboard analytics display real production activity.
- Confirm storefront/domain metadata is correct.

---

### Stage 12 — Supabase production backend

Status: **Prepared, verification still required**

Completed in code:

- Tables and migrations are prepared.
- RLS policies are prepared.
- RPC/functions for safer saves and rate limits are prepared.
- Production verification SQL files exist.
- The app has Supabase auth and server route structure.

Still left:

- Run Supabase verification SQL in the production project.
- Confirm tables exist.
- Confirm RLS is enabled.
- Confirm policies are correct.
- Confirm functions/RPCs exist.
- Confirm rate-limit support exists.

This is one of the biggest remaining blockers.

---

## 5. What is done vs not done

### Done in the app

- Landing page.
- Auth screens.
- Dashboard shell.
- Product catalog.
- CSV import.
- Product CRUD.
- Finder builder.
- Customer-facing finder.
- Rule-based recommendation engine.
- AI explanation support.
- Widget embed system.
- Analytics tracking.
- Settings page.
- Supabase schema/migrations.
- Vercel deployment connection.
- Sellentum brand rename.
- Password reset flow.
- Public finder payload privacy pass.
- Merchant-first launch path in dashboard.

### Not fully done yet

- Production Supabase verification.
- Production auth/email proof.
- Production widget proof.
- Production analytics proof.
- Production AI quality/cost proof.
- Real catalog recommendation testing.
- Final dashboard simplification.
- Professional legal review for Privacy and Terms.
- Real billing.
- Final launch polish.

---

## 6. Current blockers

These are the real blockers before we can honestly say Sellentum is production-ready.

1. **Supabase production verification is not complete.**

   We need proof that the live Supabase project has the correct tables, RLS policies and functions.

2. **Production auth still needs full testing.**

   Signup, email confirmation and password reset must be tested on `sellentum.com`.

3. **Public shopper payloads need deployed verification.**

   The code is being hardened so public APIs do not leak private matching rules, internal scores or merchant-only data. After deployment, we need to inspect production responses.

4. **The widget has not been proven on a real storefront.**

   The widget exists, but we need one real/staging page test.

5. **Analytics have not been proven with real traffic.**

   We need real widget and journey events in Supabase/dashboard.

6. **AI has not been tested with a real production catalog.**

   The system works in code, but quality, cost and speed need live proof.

7. **Dashboard needs real merchant usability testing.**

   We need to see if a merchant can use it without us explaining every step.

---

## 7. Next work order

We should follow this order so we stop jumping around.

### Step 1 — Finish public payload hardening

Owner: **Codex**

Goal:

- Public finder/advisor/search/configurator APIs should only return shopper-safe data.
- Private rules, internal scores, raw tags, buyer-need fields and merchant-only decision details should stay server-side.

Status:

- Code completed and pushed.

Done when:

- Typecheck, lint, build and smoke test pass.
- Code is pushed.
- Vercel deploys successfully.
- Production responses are checked.

---

### Step 2 — Verify Supabase production

Owner: **User + Codex**

User needs to:

- Open Supabase production project.
- Run the verification SQL.
- Send me any failed rows or errors.
- Run the production verification command after Vercel deploys:

  ```bash
  npm run verify:production -- --base-url=https://sellentum.com
  ```

Codex will:

- Fix schema/RLS/function issues if anything fails.
- Update this report after verification.

Done when:

- Required tables exist.
- RLS is enabled.
- Policies are correct.
- RPC/functions exist.
- Rate-limit support is installed.
- Production route/widget checks pass.

---

### Step 3 — Prove production auth

Owner: **User + Codex**

User needs to:

- Sign up on production.
- Confirm email.
- Log in.
- Request password reset.
- Set a new password.
- Log in again.

Codex will:

- Fix redirect or auth route issues if anything breaks.

Done when:

- All auth links open `sellentum.com`.
- Emails look acceptable for Sellentum.
- Login works after confirmation and password reset.

---

### Step 4 — Prove widget on a real page

Owner: **User + Codex**

User needs to provide either:

- a staging/real ecommerce page where the widget can be installed, or
- permission to create a simple temporary storefront test page.

Codex will:

- Install/check the snippet.
- Run a full shopper journey.
- Confirm analytics events.

Done when:

- Widget loads.
- Customer can complete the finder.
- Product recommendations appear.
- Buy button works.
- Analytics events are recorded.

---

### Step 5 — Test with real catalog data

Owner: **User + Codex**

User needs to provide:

- a real or realistic product CSV.

Codex will:

- Import it.
- Check catalog quality.
- Build/test a finder.
- Tune recommendation logic if needed.

Done when:

- Recommendations make sense for real products.
- Explanations are accurate.
- No-result journeys are handled cleanly.

---

### Step 6 — Final launch polish

Owner: **Codex + User**

Needed:

- Legal review of Privacy and Terms.
- Final marketing copy.
- Clear pricing/early-access message.
- Better empty/loading/error states.
- Final desktop UI pass.
- Final production smoke test.

Done when:

- A real merchant can understand the site, sign up, launch a finder and test the widget without developer help.

---

## 8. What I need from you next

The most useful things from your side are:

1. Supabase verification results.
2. Confirmation that production signup works.
3. Confirmation that production email confirmation opens `sellentum.com`.
4. Confirmation that production password reset works.
5. A real or staging storefront page for widget testing.
6. A real product CSV/catalog.

If you give me those, I can move Sellentum from “built MVP” to “production-proven SaaS.”

---

## 9. Work log so far

This is the simplified history of what we have done.

### Phase 1 — MVP build

- Created the Next.js/Tailwind app structure.
- Built the landing page.
- Built auth screens.
- Built protected dashboard routes.
- Built product catalog management.
- Built CSV product upload.
- Built guided finder builder.
- Built customer-facing finder.
- Built deterministic recommendation logic.
- Added AI-generated explanation support.
- Added widget embed support.
- Added analytics event tracking.
- Added settings page.
- Added Supabase schema/migration structure.

### Phase 2 — Brand and deployment cleanup

- Changed brand from Findly to Sellentum.
- Renamed local project folder.
- Moved Git remote to the Sellentum GitHub organization.
- Connected Vercel.
- Added production environment variables.
- Made `sellentum.com` live.

### Phase 3 — Supabase and production preparation

- Added Supabase production verification SQL.
- Added schema/RLS verification direction.
- Added rate-limit migration support.
- Added safer server-side public runtime routes.
- Added environment variable guidance.
- Added README setup/deployment instructions.

### Phase 4 — Auth improvements

- Fixed fake prefilled login credentials.
- Added forgot password page.
- Added reset password page.
- Connected login to password recovery.
- Discussed branded SMTP so auth emails can come from Sellentum.

### Phase 5 — Product quality and dashboard clarity

- Removed temporary MVP audit from the dashboard.
- Added a more merchant-friendly first-launch path.
- Added an Operations map so advanced tools are organized instead of scattered.
- Consolidated project status into this single progress report.

### Phase 6 — Public runtime privacy and safety

- Hardened public finder responses so private matching rules are not exposed.
- Hardened recommendation responses so shoppers do not see internal scores or private buyer-profile data.
- Started shared public payload sanitization for finder, advisor, search and configurator runtimes.

### Phase 7 — Public SaaS trust pages

- Added Contact page.
- Added Support page.
- Added Security page.
- Added Privacy Policy page.
- Added Terms of Service page.
- Added shared public footer with Contact, Support, Privacy, Terms and Security links.
- Linked signup/login fine print to the real legal pages.
- Linked dashboard help actions to the Support page.

### Phase 8 — Production verification command

- Added `npm run verify:production`.
- The command checks required env variables without printing secrets.
- The command checks live public routes and the widget loader.
- The command checks Supabase table/column reachability through the service-role key.
- The command points back to the authoritative Supabase SQL verification for RLS, extensions and exact function grants.

---

## 10. Markdown cleanup

Only two Markdown files are currently kept in the project:

- `README.md`
  - needed for setup, deployment and developer handoff.

- `SELLENTUM_PROGRESS_REPORT.md`
  - this file,
  - the human-readable source of truth for project status and next steps.

There are no extra audit, research or duplicate roadmap Markdown files left in the project.

---

## 11. Bottom line

Sellentum has crossed the first important line: the product idea exists in working code.

The next line is more serious:

> Prove Sellentum works on the real domain, with the real Supabase project, real auth emails, a real catalog, a real widget install and real analytics events.

That is the work directly ahead.
