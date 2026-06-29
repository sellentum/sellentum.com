# Sellentum Project Progress Report

Last updated: 2026-06-30

Project: **Sellentum**

Website: `https://sellentum.com`

GitHub repo: `https://github.com/sellentum/sellentum.com.git`

Main goal:

> Build a serious SaaS product where an ecommerce business can upload products, create a guided product finder, embed it on their store, and help shoppers choose the right product using reliable recommendations plus AI-generated explanations.

---

## 1. Simple current status

Sellentum is now past the “basic MVP mockup” stage.

The main product exists in code:

- public marketing website,
- signup/login/logout,
- protected dashboard,
- product catalog,
- CSV upload,
- quiz/finder builder,
- customer-facing product finder,
- AI explanation flow,
- embeddable widget,
- analytics tracking,
- settings,
- Supabase database structure,
- Vercel deployment setup.

However, it is **not yet a fully production-proven SaaS**.

The next phase is about making sure the product is safe, reliable, tested in production, and simple enough for a real business owner to use without us sitting next to them.

---

## 2. Honest progress estimate

These percentages are not “number of files completed.” They are a practical business/product estimate.

| Area | Current progress | Meaning |
|---|---:|---|
| Core app features | 80–85% | The main SaaS flow is built. |
| Production readiness | 45–55% | Needs live Supabase, auth, widget, analytics and AI proof. |
| Paid SaaS readiness | 35–45% | Needs polish, onboarding, reliability, support pages and real usage testing. |
| Zoovu-level maturity | 10–15% | Zoovu is an enterprise platform; Sellentum is still early-stage. |

Important:

Sellentum does **not** need to become Zoovu immediately. The realistic target is to become a serious, focused, smaller SaaS that proves the core guided-selling value very well.

---

## 3. Stage-by-stage progress

### Stage 1 — Brand, repo and deployment foundation

Status: **Completed**

What was done:

- Project renamed from Findly to **Sellentum**.
- Local folder renamed to `sellentum`.
- GitHub remote moved to `sellentum/sellentum.com`.
- Main branch is connected to the new repo.
- Vercel project is connected.
- `sellentum.com` is live.
- Production environment variables were added in Vercel.

What is left:

- Keep checking future deployments after each important push.

---

### Stage 2 — Public website / landing page

Status: **Mostly completed**

What was done:

- Premium SaaS-style homepage.
- Product positioning around AI product finding and guided selling.
- Feature sections.
- Use-case sections.
- Pricing placeholder.
- Resources page.
- B2B ecommerce visual direction.
- Desktop-first design, as requested.

What is left:

- Improve final marketing copy.
- Add stronger pricing/early-access message.
- Add basic support/contact/legal pages before real launch.
- Remove any remaining wording that makes the product feel like a temporary MVP.

---

### Stage 3 — Authentication

Status: **Built, needs final production test**

What was done:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Supabase email confirmation flow.
- Localhost redirect issue was addressed.
- Login screen fake demo credentials were removed.
- Forgot password page was added.
- Reset password page was added.
- Login page now links to password recovery.

What is left:

- Test signup on the real production domain.
- Test email confirmation from production.
- Test forgot password from production.
- Confirm reset email opens `sellentum.com`, not `localhost`.
- Confirm new password login works.
- Confirm emails look like they are from Sellentum, not a generic Supabase identity.

---

### Stage 4 — Business dashboard

Status: **Built, first-launch path added**

What was done:

- Dashboard home.
- Product management area.
- Finder/quiz management.
- Widget/settings areas.
- Analytics area.
- Launch/testing tools.
- Production/developer verification tools.
- Dashboard overview now includes an Operations map so deeper studios and QA centers are reachable from one organized place.
- Dashboard overview now starts with a plain-English **First launch path**: set up brand, add products, publish finder, install widget, prove one shopper journey.

What is left:

- Test the simplified dashboard with a real merchant workflow.
- Continue polishing labels and empty states.
- Keep advanced/internal tools visually secondary to the first-launch path.

---

### Stage 5 — Product catalog

Status: **Built**

What was done:

- Add products manually.
- Upload products using CSV.
- View products.
- Edit products.
- Delete products.
- Store product name, price, image URL, category, description, features, tags and product URL.
- Product fields were expanded for better recommendation quality.

What is left:

- Test with a real merchant catalog.
- Improve CSV import error messages.
- Add clearer warnings for missing product images, URLs or descriptions.
- Improve bulk catalog cleanup workflow.

---

### Stage 6 — Quiz / guided-selling builder

Status: **Built**

What was done:

- Create product finder quizzes.
- Add questions.
- Add answer options.
- Connect answers to tags, categories, features, budget and matching logic.
- Add answer weighting.
- Add basic branching logic.
- Save and edit quizzes.
- Publish quizzes.
- Transaction-safe saves were added so a quiz is less likely to be half-saved.

What is left:

- Prove the Supabase save functions are installed in production.
- Test builder with a real business use case.
- Make builder UX easier and less technical.
- Add better empty states and guidance.

---

### Stage 7 — Customer-facing product finder

Status: **Built, privacy hardened in code**

What was done:

- Customer-facing finder page.
- Shopper answers guided questions.
- System returns 1–3 recommended products.
- Product image, title, price and Buy Now button are shown.
- AI-generated recommendation explanation is shown.
- Fallback explanations exist if AI fails.
- Buy button clicks can be tracked.
- Public finder config responses no longer expose answer matching rules, rule values, answer weights or merchant override data.
- Public recommendation responses now redact internal scores, buyer-profile text, internal tags and private recovery details.

What is left:

- Test one full production shopper journey.
- Verify the sanitized public payload on the deployed production URL.
- Improve final shopper experience polish.

---

### Stage 8 — Recommendation engine

Status: **Built**

What was done:

- Product selection is deterministic and rule-based.
- Matching uses tags, category, budget, features and product data.
- AI is used for explanation, not for choosing products.
- This means recommendation selection is more reliable than a fully AI-only system.
- Public AI explanations now use shopper-safe reasons and public product facts, while private matching logic stays server-side.

What is left:

- Test recommendation quality with real products.
- Tune matching weights after real examples.

---

### Stage 9 — AI features

Status: **Built, needs live proof**

What was done:

- AI-generated recommendation explanations.
- AI-supported product/catalog enrichment paths.
- AI-supported quiz/configurator generation paths.
- Safe fallback behavior if OpenAI is unavailable.

What is left:

- Test OpenAI behavior in production with a real key.
- Test explanations with a real product catalog.
- Check response quality.
- Watch cost and latency.

---

### Stage 10 — Embeddable widget

Status: **Built, needs real storefront test**

What was done:

- JavaScript embed snippet.
- Modal widget mode.
- Inline iframe mode.
- Public widget loader route.
- Widget can load customer-facing finder experiences.
- Domain checking/allowlist work has started.

What is left:

- Install widget on a real or staging ecommerce page.
- Complete one real customer journey through the widget.
- Confirm widget views, quiz starts, completions, recommendations and buy clicks are tracked.

---

### Stage 11 — Analytics

Status: **Built, needs production event proof**

What was done:

- Widget views.
- Quiz starts.
- Quiz completions.
- Recommended products.
- Buy button clicks.
- Recommendation feedback.
- Session/journey analytics.
- Server-side analytics routes were added so browser traffic does not write directly into Supabase.

What is left:

- Generate real production analytics events.
- Confirm events appear correctly in Supabase/dashboard.
- Confirm domain allowlist behavior is correct.

---

### Stage 12 — Supabase backend

Status: **Code prepared, production verification still needed**

What was done in the project:

- Database tables planned and migration files added.
- RLS policies prepared.
- Products, quizzes, questions, answer options, recommendation rules, analytics events and widget settings are represented.
- Transactional save functions were added for important builder saves.
- Verification SQL files were created.

What is left:

- Run the Supabase SQL verification in the production Supabase project.
- Confirm all required tables exist.
- Confirm RLS is enabled where needed.
- Confirm policies are correct.
- Confirm RPC/functions exist.
- Confirm rate limiting support exists.

This is one of the most important remaining steps.

---

## 4. What is completed vs what is not completed

### Completed in code

- Landing page.
- Auth screens.
- Dashboard shell.
- Product catalog.
- CSV import.
- Product CRUD.
- Quiz/finder builder.
- Customer-facing finder.
- Rule-based recommendations.
- AI explanation support.
- Widget embed support.
- Basic analytics tracking.
- Settings page.
- Supabase schema/migrations.
- Vercel deployment connection.
- Brand rename to Sellentum.
- Password reset flow.
- Public recommendation payload privacy pass.
- Merchant-first dashboard launch path.

### Not fully completed yet

- Production Supabase verification.
- Production auth/email verification.
- Production verification of sanitized public finder/widget payloads.
- Real storefront widget proof.
- Real production analytics proof.
- Real catalog recommendation testing.
- Dashboard simplification user testing and polish.
- Final SaaS polish.
- Full billing.
- Full legal/support pages.

---

## 5. Current blockers

These are the main things preventing us from honestly saying “Sellentum is production-ready.”

1. **Supabase production verification is not complete yet.**

   We need to confirm the real production database has the correct schema, RLS policies and functions.

2. **Auth recovery needs a real production test.**

   The forgot/reset password flow exists, but we still need to confirm the real email link works on `sellentum.com`.

3. **Sanitized public finder payloads still need production verification.**

   The code now redacts private matching rules and internal scoring data. We still need to inspect the deployed production responses after Vercel deploys this change.

4. **The widget has not been proven on a real storefront yet.**

   The widget exists, but we need one real install/test.

5. **Analytics have not been proven with a real customer journey yet.**

   We need real widget view, start, completion, recommendation and buy click events.

6. **AI has not been tested with a real production catalog yet.**

   The AI paths exist, but we need to check quality, speed and cost with real data.

7. **Dashboard still needs real merchant usability testing.**

   The first-launch path and Operations map are now in place, but we still need to test whether a real merchant can use the dashboard without guidance.

---

## 6. Next work order

We should follow this order instead of randomly picking tasks.

### Step 1 — Finish Supabase production verification

Owner: **User + Codex**

User needs to:

- open Supabase production project,
- run the verification SQL,
- share any failed rows or errors.

Codex will:

- fix schema/RLS/function problems if anything fails,
- update the report after verification.

---

### Step 2 — Test auth recovery in production

Owner: **User + Codex**

User needs to:

- request a password reset from production,
- click the email,
- confirm it opens Sellentum,
- set a new password,
- log in successfully.

Codex will:

- fix redirect/email issues if the flow fails.

---

### Step 3 — Hide private recommendation data from public payloads

Owner: **Codex**

Code status: **Done**

What changed:

- sanitize public finder config responses,
- sanitize public recommendation responses,
- keep private rules server-side only,
- generate shopper explanations from public-safe product facts.
- full local smoke test now passes after fixing dashboard overview route coverage and smoke harness module resolution.

What is still needed:

- verify the deployed production response after Vercel finishes deploying this commit.

---

### Step 4 — Prove the widget on a real page

Owner: **User + Codex**

User needs to provide:

- a real/staging ecommerce page where the widget can be installed,
- or permission to create a simple test page.

Codex will:

- verify the embed loads,
- run a full shopper journey,
- confirm analytics events.

---

### Step 5 — Simplify the dashboard

Owner: **Codex**

Code status: **In progress**

What changed:

- added a reusable merchant launch-plan helper,
- added a top-of-dashboard First launch path,
- kept advanced tools available through an organized Operations map,
- added smoke coverage so this simpler path remains part of the dashboard contract.

What is still needed:

- test the dashboard with a real product catalog and real merchant workflow,
- keep simplifying copy and empty states after that test.

---

### Step 6 — Production polish

Owner: **Codex + User**

Needed before serious launch:

- final copy polish,
- support/contact/legal pages,
- pricing/early-access messaging,
- better loading and empty states,
- real product demo data,
- final deployment check.

---

## 7. What I need from you right now

The most useful things you can provide next are:

1. Supabase verification result.
2. Confirmation that production signup/email confirmation works.
3. Confirmation that production password reset works.
4. A real or staging storefront page for widget testing.
5. A real sample product catalog.

If you give me those, I can keep moving the project from “built MVP” to “production-proven SaaS.”

---

## 8. Markdown files we are keeping

Only these markdown files are needed now:

- `README.md`
  - setup and developer instructions,
  - useful for future deployment and handoff.

- `SELLENTUM_PROGRESS_REPORT.md`
  - the plain-English project status,
  - the single source of truth for progress and next steps.

Older roadmap, audit, research and verification markdown files are no longer needed as separate documents. Their useful content has been consolidated into this report or moved into proper SQL/code files.

---

## 9. Bottom line

Sellentum is in a strong position for an early SaaS product.

The core idea is already represented in the app:

> A merchant can manage products, create a guided product finder, embed it, and help shoppers choose products with deterministic recommendations and AI explanations.

But the next milestone is not “add more pages.”

The next milestone is:

> Prove the existing product works safely and reliably in production.

Once Supabase, auth, widget, analytics and AI are proven with real data, Sellentum will feel much closer to a serious SaaS rather than a development prototype.
