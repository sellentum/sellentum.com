# Sellentum Progress Report

Last updated: **30 June 2026**

Live site: **https://www.sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Main branch: **main**

---

## 1. Plain-English summary

Sellentum is now a real working SaaS MVP, not just a landing page.

But it is **not yet a fully proven production SaaS**.

The simplest way to understand the current position:

| Area | Current status |
|---|---|
| Product idea | Clear |
| Landing website | Built |
| Authentication | Built, needs final live signup proof |
| Supabase database | Built and verified from code side |
| Merchant dashboard | Built, needs simplification/polish |
| Product catalog | Built, needs real catalog test |
| Quiz/finder builder | Built, needs real merchant workflow proof |
| Recommendations | Built with deterministic matching plus AI explanations |
| Customer-facing finder | Built, needs real storefront proof |
| Embeddable widget | Built, needs live website install proof |
| Analytics | Built, needs real event proof |
| Production readiness | Partly ready, still needs real end-to-end testing |

My honest current estimate:

| Category | Progress |
|---|---:|
| Core MVP feature build | **80–85%** |
| Production infrastructure | **70–75%** |
| Real-world merchant proof | **30–40%** |
| Design and SaaS polish | **40–45%** |
| Zoovu-level maturity | **10–15%** |

Important:

> The codebase has many pieces built, but the product is not “serious SaaS ready” until we prove the full journey on production with real data.

The real MVP proof we still need:

> A business owner signs up, uploads products, creates a product finder, embeds it on a website, customers complete the finder, recommendations appear, buy clicks are tracked, and analytics show the journey correctly.

---

## 2. Markdown cleanup status

Current Markdown files that should stay:

| File | Keep? | Why |
|---|---|---|
| `README.md` | Yes | Technical setup, local run, Supabase, Vercel, environment variables, widget and production verification instructions. |
| `SELLENTUM_PROGRESS_REPORT.md` | Yes | Human-readable project status, roadmap, progress stages and next actions. |

There are currently **no other project Markdown files at the repo root that need deletion**.

Note:

- Markdown files inside `node_modules` are third-party package files. We do not touch those.
- Going forward, this file is the main human progress report.
- The README stays as the technical setup document.

---

## 3. What we have completed so far

### Stage 1 — Project foundation

Status: **Done**

What was completed:

- Next.js application created.
- React app structure created.
- Tailwind CSS styling system added.
- Reusable UI components added.
- App routes and dashboard routes created.
- API routes created.
- Vercel-ready project structure created.

What this means:

> Sellentum has a real web application foundation.

---

### Stage 2 — Brand, repo and domain setup

Status: **Done**

What was completed:

- Brand changed from **Findly** to **Sellentum**.
- Local folder renamed from `Site_MVP` to `sellentum`.
- GitHub repo moved to the Sellentum organization.
- Main branch connected to the new GitHub repo.
- Production domain connected at **sellentum.com**.
- Vercel deployment connected.

What still needs watching:

- If old “Findly” wording appears anywhere, replace it immediately.
- If Codex or local tools still point to the old folder path, use:

```text
/Users/abhishekdubey/Documents/sellentum
```

---

### Stage 3 — Public marketing website

Status: **Mostly done**

What was completed:

- Landing page.
- Hero section.
- Feature sections.
- How-it-works sections.
- Use-case sections.
- Pricing placeholder.
- Calls to action.
- Resource/support/security/privacy/terms-style pages.

What still needs improvement:

- Final pricing offer.
- Stronger sales copy after we prove the demo workflow.
- Founder/company story.
- Final legal review for Privacy Policy and Terms.
- Better real screenshots once the production workflow is proven.

Current judgment:

> Good enough for early credibility, not yet final sales-grade positioning.

---

### Stage 4 — Authentication

Status: **Built, needs final production proof**

What was completed:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Email verification through Supabase.
- Forgot password flow.
- Reset password flow.
- Branded Sellentum email/SMTP discussion and setup guidance.
- Login demo-prefill problem was addressed in the app.

What still needs to be proven on production:

- Signup works at `https://www.sellentum.com`.
- Verification email comes from the Sellentum sender.
- Verification link opens the production site, not localhost.
- Login works after verification.
- Forgot password email works.
- Password reset works.

Owner:

- **You:** test with a real inbox.
- **Codex:** fix any app-side issue if the production auth flow fails.

---

### Stage 5 — Supabase database and security

Status: **Built and verified from Codex side**

What was completed:

- Supabase schema created.
- Main database tables created:
  - profiles
  - products
  - quizzes
  - questions
  - answer options
  - recommendation rules
  - analytics events
  - widget settings
- Row Level Security added.
- Production repair scripts added.
- Schema verification scripts added.
- Supabase schema verification passed from the local project.

Latest known verification:

```text
npm run verify:supabase-schema
Result: passed
```

What still matters:

- Live user testing still needs to confirm the full workflow.
- Supabase RLS should be treated carefully whenever new tables are added.

Current judgment:

> The database foundation is strong enough for MVP testing.

---

### Stage 6 — Merchant dashboard

Status: **Built, needs product polish**

What was completed:

- Dashboard home.
- Products area.
- Finder/quiz area.
- Widget/settings area.
- Analytics area.
- Production verification area.
- Launch proof queue.
- Next-best-action card.
- Core launch path:
  - Products
  - Finder
  - Publish
  - Embed
  - Analytics proof
- Temporary MVP audit section removed.

What still needs improvement:

- Keep making the dashboard less technical.
- Improve empty states.
- Improve loading states.
- Improve error messages.
- Make every page clearly answer: “What should I do next?”
- Remove internal/developer/founder language from merchant-facing screens.
- Latest completed interval: Launch Studio now says **Storefront launch handoff**, **Implementation contract** and **Storefront QA checklist** instead of developer-first wording.

Current judgment:

> The dashboard works, but it should feel calmer, simpler and more like a serious SaaS product.

---

### Stage 7 — Product catalog

Status: **Built, needs real catalog test**

What was completed:

- Add products manually.
- Edit products.
- Delete products.
- Upload products through CSV.
- Product fields support:
  - name
  - price
  - image URL
  - category
  - description
  - features
  - tags
  - product URL
- CSV importer supports flexible column names.
- CSV validation exists.
- First-catalog launch kit exists.
- Latest completed interval: the empty Products page now shows a **First catalog proof path** with import/template/manual-entry actions and proof-ready catalog acceptance criteria.

What still needs to be proven:

- Upload a real product catalog.
- Confirm product images display correctly.
- Confirm product URLs open correctly.
- Confirm tags/features/categories are useful enough for recommendations.
- Confirm the CSV importer is understandable for a normal business owner.

Owner:

- **You:** provide or upload a real product CSV.
- **Codex:** improve importer UX and fix issues found during upload.

---

### Stage 8 — Guided-selling quiz / product finder builder

Status: **Built, needs real merchant proof**

What was completed:

- Create product finder quizzes.
- Add questions.
- Add answer options.
- Connect answers to recommendation signals.
- Use tags, categories, features and budget logic.
- Save and edit finder flows.
- Publish-ready checks were added.
- Builder and launch tools were expanded.
- Latest completed interval: the Product Finders page now shows a **First finder proof path** and **Proof-ready finder** criteria before merchants publish or embed their first guided-selling flow.

What still needs improvement:

- Simpler builder language.
- Better preview flow.
- Clearer “publish” moment.
- Easier question creation for non-technical merchants.
- Better guidance when the catalog is too weak to build a good finder.

Current judgment:

> The builder exists, but the merchant experience still needs simplification.

---

### Stage 9 — Recommendation logic and AI explanations

Status: **Built**

What was completed:

- Deterministic product matching.
- Rule-based scoring using:
  - tags
  - categories
  - features
  - budget
  - answer rules
- Product selection does not rely fully on AI.
- AI is used to explain why products match.
- Fallback explanations exist when OpenAI is unavailable.
- Guardrails were added around the idea:

```text
Rules select. AI explains.
```

What still needs improvement:

- More explanation quality testing with real product data.
- Better handling of weak catalogs.
- More merchant-friendly explanation preview.
- More confidence indicators for why a product was recommended.

Current judgment:

> The recommendation foundation is correct for MVP: deterministic selection first, AI explanation second.

---

### Stage 10 — Customer-facing finder and widget

Status: **Built, needs live storefront proof**

What was completed:

- Customer-facing question flow.
- Product recommendation results.
- Product image/title/price display.
- AI/fallback explanation display.
- Buy Now buttons.
- Restart flow.
- Embeddable JavaScript widget.
- Modal/iframe-style embed support.
- Storefront demo page.
- Widget install scanner.
- Storefront QA guidance.

What still needs to be proven:

- Embed the widget on a real website page.
- Confirm the widget loads correctly.
- Confirm customers can complete the finder.
- Confirm recommendations display correctly.
- Confirm Buy Now clicks open the right product URL.
- Confirm widget analytics events are recorded.

Owner:

- **You:** provide the storefront/staging page where the widget will be installed.
- **Codex:** verify the widget install and fix issues.

---

### Stage 11 — Analytics

Status: **Built, needs real event proof**

What was completed:

Analytics support exists for:

- Widget views.
- Quiz starts.
- Completed quizzes.
- Recommended products.
- Buy button clicks.
- Session tracking.
- Journey/event proof.
- Analytics QA.
- Basic launch proof guidance.

What still needs to be proven:

- Real production widget view event.
- Real quiz start event.
- Real quiz completion event.
- Real recommendation event.
- Real Buy Now click event.
- Analytics dashboard correctly showing those events.

Current judgment:

> Analytics exists, but it needs a real end-to-end proof session before we trust it as production-ready.

---

### Stage 12 — Settings and branding

Status: **Built**

What was completed:

- Brand name setting.
- Primary color setting.
- Button text setting.
- Widget title setting.
- Welcome message setting.
- Shared branding across embedded experiences.

What still needs improvement:

- Better preview while editing settings.
- More polished settings page design.
- Safer defaults for new merchants.

---

### Stage 13 — Production deployment and verification

Status: **Partly done**

What was completed:

- Vercel connected.
- Environment variables added.
- Supabase environment variables added.
- OpenAI environment variables added.
- Production verification script added.
- Supabase schema verification script added.
- Production route checks added.

Latest known production checks:

```text
npm run verify:production -- --base-url=https://www.sellentum.com --probe-rate-limit
Result: mostly passing with one expected warning around REST-level RLS proof
```

Meaning:

> The production deployment is connected and testable, but the final proof must come from real user journeys.

---

## 4. What is still left before Sellentum feels like serious SaaS

### Must-have before showing seriously to customers

1. Prove production signup and email verification.
2. Upload a real product catalog.
3. Build one real product finder from that catalog.
4. Publish the finder.
5. Embed the widget on a real storefront or staging page.
6. Complete one full shopper journey.
7. Confirm recommendations are correct.
8. Confirm Buy Now links work.
9. Confirm analytics events appear.
10. Polish the dashboard language and obvious rough edges.

### Important after first proof

1. Simplify onboarding.
2. Improve dashboard empty states.
3. Improve finder preview.
4. Continue improving CSV import guidance.
5. Improve analytics explanations.
6. Add better production monitoring.
7. Add proper support/contact flows.
8. Improve pricing and plan messaging.
9. Add better example/demo data.
10. Prepare a strong demo video or walkthrough.

### Not needed yet

These should stay out of scope for now:

- Full Shopify app.
- Magento integration.
- WooCommerce integration.
- Salesforce integration.
- SAP integration.
- Complex team permissions.
- Enterprise SSO.
- Advanced personalization.
- Full Stripe billing.
- Large-scale partner marketplace features.

---

## 5. Current biggest risks

| Risk | Why it matters | What to do |
|---|---|---|
| We have many features but not enough real proof | A SaaS product is only believable after the real workflow works | Run the first real end-to-end production test |
| Dashboard language is too technical in places | Merchants may feel confused or overwhelmed | Simplify copy page by page |
| No real catalog has been tested yet | Product matching quality depends on real data | Upload a real CSV |
| Widget has not been proven on a real storefront yet | Embed reliability is central to the product | Install on staging/live test page |
| Analytics needs real event proof | Business owners need to trust the numbers | Complete one real journey and check events |
| Legal/pricing copy is still placeholder-level | Public trust needs stronger details | Finalize after product proof |

---

## 6. What Codex should do next

This is the recommended order. We should not jump randomly.

### Step 1 — Clean merchant-facing dashboard language

Goal:

> Make the dashboard feel less like an internal development tool and more like a polished SaaS product.

Codex tasks:

- Remove unnecessary technical wording from merchant-facing pages.
- Replace “developer handoff” style language where merchants see it.
- Improve “what to do next” copy.
- Keep technical details only where they are truly useful.

Status: **In progress**

---

### Step 2 — Prove production auth

Goal:

> Confirm signup, email verification, login, forgot password and reset password work on `sellentum.com`.

You need to:

- Create a fresh account using a real email.
- Confirm the verification email sender looks correct.
- Confirm the email link opens `https://www.sellentum.com`, not localhost.
- Try login after verification.
- Try forgot password.

Codex will:

- Fix redirect or UI issues if anything fails.

Status: **Waiting for live test**

---

### Step 3 — Upload the first real catalog

Goal:

> Replace demo confidence with real product confidence.

You need to:

- Prepare or provide a real CSV.

Codex will:

- Help clean the CSV format.
- Improve importer issues.
- Check recommendation fields.

Status: **Waiting for real catalog**

---

### Step 4 — Build the first real finder

Goal:

> Create a product finder that actually helps a shopper choose products.

Codex tasks:

- Review the finder questions.
- Check answer-to-product logic.
- Check recommendation quality.
- Improve wording and flow.

Status: **After catalog upload**

---

### Step 5 — Embed the widget and prove analytics

Goal:

> Prove Sellentum works on an ecommerce page.

You need to:

- Provide the storefront or staging page.

Codex will:

- Check widget installation.
- Run the install scanner.
- Verify events.
- Confirm recommendations and Buy Now clicks.

Status: **After finder publish**

---

## 7. What you need to do now

Short version:

1. Wait for Vercel to finish deploying the latest pushed code.
2. Test signup/login on `https://www.sellentum.com`.
3. Prepare one real product CSV.
4. Create or share a storefront/staging page where the widget can be installed.

Most important user-side task:

> Test production signup and email verification first.

Without this, the rest of the production proof is weaker.

---

## 8. What “done” means for the MVP

The MVP is done only when this exact story works:

1. A business owner visits Sellentum.
2. They create an account.
3. They verify email.
4. They enter the dashboard.
5. They upload products.
6. They create a product finder.
7. They publish it.
8. They copy an embed snippet.
9. The widget works on a storefront.
10. A shopper answers questions.
11. The shopper receives 1–3 recommendations.
12. The shopper sees clear explanations.
13. The shopper clicks Buy Now.
14. The merchant sees analytics for the session.

Until all 14 are proven on production, we should call Sellentum:

> A strong working MVP in production testing.

Not:

> A finished production SaaS.

---

## 9. Project log so far

High-level work completed:

- Built the Next.js app foundation.
- Built the public marketing website.
- Added Sellentum branding.
- Renamed the local project folder.
- Moved GitHub remote to the Sellentum organization.
- Connected Vercel deployment.
- Connected `sellentum.com`.
- Added Supabase auth.
- Added protected dashboard routes.
- Added product CRUD.
- Added CSV upload.
- Added quiz/finder builder.
- Added deterministic recommendation logic.
- Added OpenAI explanation support.
- Added fallback explanation support.
- Added customer-facing finder.
- Added embeddable widget.
- Added widget settings.
- Added analytics events.
- Added Supabase schema and RLS.
- Added production verification scripts.
- Added Supabase verification scripts.
- Added widget install/scanner tools.
- Added production proof guidance.
- Removed temporary MVP audit section from dashboard.
- Improved launch path visibility inside dashboard.
- Created this human-readable progress report.

---

## 10. File rule going forward

To keep the project clean:

- `README.md` = technical setup and developer instructions.
- `SELLENTUM_PROGRESS_REPORT.md` = human progress, roadmap and next steps.

If a new planning/audit/status Markdown file is created later, it should either:

1. be merged into this progress report, or
2. be deleted once its information is no longer needed.

This keeps the project from becoming a graveyard of confusing old notes.
