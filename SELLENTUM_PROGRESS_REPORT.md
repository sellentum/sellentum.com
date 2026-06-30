# Sellentum Progress Report

Last updated: **30 June 2026**

Live website: **https://www.sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Main local folder: **/Users/abhishekdubey/Documents/sellentum**

---

## 1. Short answer: where Sellentum stands today

Sellentum is no longer just an idea or landing page. It is a working SaaS MVP with:

- a public marketing website,
- signup/login/logout,
- a protected merchant dashboard,
- product catalog tools,
- CSV product upload,
- guided product finder creation,
- deterministic product recommendations,
- AI-generated recommendation explanations,
- customer-facing product finder pages,
- embeddable widget code,
- analytics tracking,
- Supabase database/auth,
- Vercel production deployment,
- production verification scripts.

But Sellentum is **not yet a fully proven production SaaS**.

The biggest missing piece is not “more pages”. The biggest missing piece is **real production proof**:

> A real merchant account uploads real products, creates a finder, embeds it on a real storefront, a shopper completes the flow, recommendations appear, Buy Now is clicked, and analytics prove the whole journey.

That full live proof has not been completed yet.

---

## 2. Current progress estimate

These numbers are honest estimates, not marketing numbers.

| Area | Current progress | What it means |
|---|---:|---|
| Core MVP feature build | **80–85%** | Most major MVP features exist in the app. |
| Production infrastructure | **70–75%** | Vercel, Supabase, env vars and verification scripts are in place, but live proof still matters. |
| Real merchant workflow proof | **30–40%** | The flow exists, but needs real data and real storefront testing. |
| Visual polish / SaaS maturity | **50–55%** | The product story is clearer now, but the dashboard still needs simplification and real product screenshots. |
| Zoovu-level maturity | **10–15%** | Sellentum is an early focused product, not an enterprise platform yet. |

Simple version:

> We have built a strong MVP foundation. Now we need to prove it, simplify it, polish it, and make it trustworthy for real ecommerce brands.

---

## 3. Markdown file cleanup

Current useful Markdown files:

| File | Keep? | Purpose |
|---|---|---|
| `README.md` | Yes | Technical setup, environment variables, local development, Supabase, Vercel and verification instructions. |
| `SELLENTUM_PROGRESS_REPORT.md` | Yes | Human-readable project status, progress, roadmap and next actions. |

I checked the repo and there are currently **no other root project Markdown files that need to be removed**.

Going forward:

- Keep `README.md` for technical instructions.
- Keep this file for human progress tracking.
- If we create temporary audit/roadmap/status markdown files later, we should merge them into this file and delete the temporary file.

---

## 4. Stage-by-stage progress

### Stage 1 — Product idea and MVP direction

Status: **Done**

What we decided:

- Sellentum is an AI-powered guided-selling SaaS for ecommerce brands.
- The product helps a merchant upload products, create a guided product finder, embed it on their store and recommend the right products to shoppers.
- The MVP should be practical and focused, not overloaded with enterprise features.

What is not included yet:

- full Shopify app,
- Magento integration,
- WooCommerce integration,
- Salesforce/SAP integrations,
- advanced team permissions,
- enterprise workflows.

---

### Stage 2 — App foundation

Status: **Done**

What is built:

- Next.js app.
- React frontend.
- Tailwind styling.
- App Router routes.
- API routes.
- Reusable components.
- Dashboard shell.
- Public marketing layout.
- Vercel-ready project structure.

Current judgment:

> The technical foundation is good enough to keep building on.

---

### Stage 3 — Branding, domain and repository

Status: **Done**

What is completed:

- Brand changed from **Findly** to **Sellentum**.
- Project folder renamed to `sellentum`.
- GitHub remote moved to the Sellentum organization.
- Main branch connected to the new repo.
- Vercel connected.
- `sellentum.com` is live.

Important note:

If any tool still points to this old folder:

```text
/Users/abhishekdubey/Documents/Site_MVP
```

it should now use:

```text
/Users/abhishekdubey/Documents/sellentum
```

---

### Stage 4 — Public website

Status: **Mostly done**

What is built:

- homepage,
- desktop-first homepage product story animation,
- platform pages,
- industry pages,
- resources page,
- support page,
- contact page,
- security page,
- privacy page,
- terms page,
- marketing navigation and footer,
- calls to action.

What still needs work:

- stronger sales copy,
- clearer pricing offer,
- better real product screenshots,
- founder/company story,
- legal review for final terms and privacy policy.

Latest completed interval:

- Reviewed the supplied Zoovu homepage screen recording and extracted the useful pattern: a large browser-style product demo that explains the product in motion.
- Built an original Sellentum hero animation that cycles through catalog import, guided questions, deterministic recommendations, AI explanations, widget embed and analytics proof.
- Added smoke-test coverage so the homepage must keep explaining the product-finder story clearly.

Current judgment:

> The public site now explains the core Sellentum service much more clearly. It still needs real merchant proof, stronger pricing and sharper production screenshots before it feels like a mature SaaS.

---

### Stage 5 — Authentication

Status: **Built, needs final live proof**

What is built:

- signup,
- login,
- logout,
- protected dashboard routes,
- Supabase email verification,
- forgot password,
- reset password,
- branded login/signup screens.

What still needs production proof:

- signup works on `https://www.sellentum.com`,
- verification email uses the Sellentum sender,
- verification links open production, not localhost,
- login works after email verification,
- forgot password works,
- reset password works.

Owner:

- **You:** test with a real email inbox.
- **Codex:** fix any app-side or redirect issue if it fails.

---

### Stage 6 — Supabase database and security

Status: **Built and locally verified**

What is built:

- Supabase authentication setup.
- PostgreSQL schema.
- Row Level Security policies.
- Production repair scripts.
- Schema verification scripts.
- Server-side Supabase helpers.
- Client-side Supabase helpers.

Main tables covered:

- profiles,
- products,
- quizzes,
- questions,
- answer options,
- recommendation rules,
- analytics events,
- widget settings,
- rate-limit/runtime tables,
- additional product discovery/configurator/feedback tables.

Current judgment:

> The database foundation is solid for MVP testing. Every new table must continue to use RLS carefully.

---

### Stage 7 — Merchant dashboard

Status: **Built, needs simplification and polish**

What is built:

- dashboard home,
- products page,
- product finder/quiz area,
- settings area,
- widget and embed area,
- analytics area,
- launch area,
- production verification area,
- onboarding and workspace health tools,
- additional studios for catalog, content, feedback, personas, merchandising, search, configurators and operations.

What still needs work:

- reduce complexity for first-time users,
- make the “next thing to do” obvious on every page,
- remove developer-style language from merchant screens,
- improve empty states,
- improve error messages,
- improve loading states,
- visually polish dashboard pages.

Latest completed interval:

- Reframed the dashboard around the plain service promise: **an AI-guided product finder widget for ecommerce stores**.
- Added a dashboard explainer showing the four core steps: upload products, build a finder, recommend clearly, embed and learn.
- Moved configurators and richer discovery tools into an **after the first finder** position so they do not confuse the first-use workflow.
- Added a **First live merchant proof** card to the dashboard.
- Added a copyable first-proof packet.
- Made the proof definition explicit: auth, real catalog, published finder, widget install, five analytics events and saved launch proof.

Current judgment:

> Powerful, but currently busier than it should be. The next phase should make it feel simple and serious.

---

### Stage 8 — Product catalog

Status: **Built, needs real catalog proof**

What is built:

- manually add products,
- edit products,
- delete products,
- CSV upload/import support,
- product fields such as name, price, image URL, category, description, features, tags and product URL,
- catalog guidance and proof steps.

What still needs proof:

- upload a real product CSV,
- confirm imported fields map correctly,
- confirm product images load correctly,
- confirm product URLs work,
- confirm categories/tags/features are clean enough for recommendations.

Owner:

- **You:** provide or upload a real product CSV.
- **Codex:** fix import, mapping or UI issues found during the test.

---

### Stage 9 — Guided-selling finder builder

Status: **Built, needs real merchant workflow proof**

What is built:

- create product finders/quizzes,
- add questions,
- add answer options,
- connect answers to tags/categories/features/recommendation logic,
- save and edit finder data,
- launch readiness guidance.

What still needs proof:

- create one real finder from scratch,
- publish it,
- run through the customer journey,
- confirm the recommended products make sense,
- confirm editing a finder after creation is clear.

Current judgment:

> The builder exists, but we still need to prove it feels easy for a normal business owner.

---

### Stage 10 — Recommendation engine

Status: **Built, needs real data tuning**

What is built:

- deterministic matching using product data,
- matching based on tags/categories/features/budget-style signals,
- recommendation tracing,
- fallback behavior,
- AI-generated explanation support,
- non-AI product selection.

Important:

> Product selection is not fully left to AI. AI is used mainly to explain why a product was recommended.

What still needs work:

- test with a real catalog,
- confirm scoring is understandable,
- improve weak recommendation cases,
- make bad/no-match states more helpful,
- add more merchant-facing explanation of how recommendations are decided.

---

### Stage 11 — Customer-facing finder

Status: **Built, needs real storefront proof**

What is built:

- public finder pages,
- question flow,
- answer selection,
- recommendation results,
- product image/title/price/explanation,
- Buy Now button,
- analytics event tracking.

What still needs proof:

- test with a real catalog,
- complete a real shopper journey,
- confirm results feel trustworthy,
- confirm Buy Now routes to the right product page,
- confirm analytics captures the session.

---

### Stage 12 — Embeddable widget

Status: **Built, needs live install proof**

What is built:

- embeddable JavaScript snippet,
- widget route,
- modal/iframe-style loading behavior,
- widget settings,
- widget proof checklist,
- storefront install scanner,
- launch handoff packet.

What still needs proof:

- copy snippet from the dashboard,
- install it on a real or staging ecommerce page,
- open the page as a shopper,
- confirm the widget loads,
- complete the finder,
- click Buy Now,
- confirm analytics events were recorded.

Owner:

- **You:** provide/storefront page access or install the snippet.
- **Codex:** verify the install and fix any widget/runtime issue.

---

### Stage 13 — Analytics

Status: **Built, needs real event proof**

What is built:

- widget view tracking,
- quiz start tracking,
- quiz completion tracking,
- product recommendation tracking,
- buy button click tracking,
- analytics dashboard,
- launch analytics proof card,
- copyable proof packet,
- proof-ready acceptance criteria.

The five critical launch events are:

1. `widget_view`
2. `quiz_start`
3. `quiz_complete`
4. `product_recommended`
5. `buy_click`

What still needs proof:

- all five events appear from one real storefront test session,
- session ID stays consistent,
- storefront URL/source/campaign/placement data is captured,
- proof packet is copied into the launch record.

Latest completed interval:

- Tightened launch proof logic so the first shopper journey is **not** treated as proven unless `buy_click` is captured.

Current judgment:

> Analytics features exist. Now we need one clean production proof session.

---

### Stage 14 — Production deployment and verification

Status: **Partly done**

What is done:

- Vercel project connected.
- Production domain live.
- Environment variables added.
- Supabase connected.
- OpenAI environment variable added.
- Production verification script exists.
- Supabase schema verification script exists.

What still needs proof:

- latest commit deployed to Vercel,
- production signup/login tested,
- production widget tested,
- production analytics tested,
- production AI explanation tested,
- production rate limiting and runtime protection confirmed.

Current judgment:

> Infrastructure is in place. Production behavior still needs full end-to-end proof.

---

## 5. What has been done so far: complete project log

High-level log:

- Defined Sellentum as an AI-guided product finder SaaS.
- Built the Next.js application.
- Built the public marketing website.
- Rewrote the homepage/platform/resources messaging so a normal ecommerce owner can understand the offer before seeing advanced modules.
- Added a desktop-first homepage product story animation inspired by the observed guided-selling demo pattern: catalog import, questions, recommendations, AI explanation, widget embed and analytics proof.
- Added Sellentum branding.
- Replaced the old Findly brand.
- Renamed the local folder from `Site_MVP` to `sellentum`.
- Changed GitHub remote to the Sellentum organization repo.
- Connected Vercel.
- Connected `sellentum.com`.
- Added Supabase packages.
- Added Supabase client/server/admin helpers.
- Added Supabase authentication.
- Added email verification flow.
- Added login, signup, logout, forgot password and reset password pages.
- Protected dashboard routes.
- Built merchant dashboard shell.
- Built product management.
- Built CSV catalog upload/import support.
- Built guided finder/quiz creation.
- Built question and answer option logic.
- Built deterministic recommendation matching.
- Added AI explanation generation.
- Added fallback explanations when AI is unavailable.
- Built customer-facing finder pages.
- Built widget JavaScript route.
- Built embeddable widget/snippet functionality.
- Built widget settings.
- Added analytics event capture.
- Built analytics dashboard.
- Added launch analytics proof guidance.
- Added proof-ready analytics acceptance criteria.
- Added a dashboard-level First live merchant proof contract.
- Tightened production proof logic so Buy Now click evidence is mandatory.
- Added storefront install scanner.
- Added launch handoff/checklist language.
- Added production verification scripts.
- Added Supabase schema verification scripts.
- Added Supabase repair scripts.
- Added smoke tests.
- Added lint/typecheck/build workflows.
- Added product/finder/widget/analytics proof guidance inside the dashboard.
- Added a website/dashboard clarity pass inspired by guided-selling platform positioning: product finder first, advanced modules second.
- Removed the temporary MVP audit section from the dashboard.
- Created this human progress report.

---

## 6. What is left before calling the MVP truly proven

The MVP should only be considered proven when this exact story works in production:

1. A business owner visits `https://www.sellentum.com`.
2. They create an account.
3. They verify email.
4. They log in.
5. They upload a real product catalog.
6. They create a real product finder.
7. They publish the finder.
8. They copy the widget snippet.
9. The snippet is installed on a storefront page.
10. A shopper opens the storefront page.
11. The shopper opens the Sellentum widget.
12. The shopper answers the questions.
13. Sellentum recommends 1–3 products.
14. Each recommendation has a clear explanation.
15. The shopper clicks Buy Now.
16. Analytics shows the full journey.

Until this is proven, we should call Sellentum:

> A strong MVP in production testing.

Not:

> A finished production SaaS.

---

## 7. What you need to do next

These are the next things needed from your side.

### First priority

1. Wait for the latest GitHub push to deploy on Vercel.
2. Test signup on `https://www.sellentum.com`.
3. Confirm the verification email comes from the Sellentum sender.
4. Confirm the verification link opens production, not localhost.
5. Log in after verification.

### Second priority

6. Prepare one real product CSV.
7. Upload it inside the dashboard.
8. Check that product names, prices, images, categories, tags and URLs look correct.

### Third priority

9. Create one real product finder.
10. Publish it.
11. Copy the widget snippet.
12. Install it on one test/staging/storefront page.
13. Send me that storefront URL so I can verify the widget install path.

### Fourth priority

14. Complete one shopper journey.
15. Click Buy Now.
16. Check analytics for these events:
    - `widget_view`
    - `quiz_start`
    - `quiz_complete`
    - `product_recommended`
    - `buy_click`

---

## 8. What Codex should do next

Codex should continue in this order:

1. Keep the dashboard simpler and more merchant-friendly.
2. Validate production after each meaningful change.
3. Keep Supabase schema/RLS safe.
4. Push code to GitHub after each completed interval.
5. Help prove the first real product catalog.
6. Help prove the first real product finder.
7. Help prove the first widget install.
8. Help prove the first complete analytics session.
9. Polish the design after the workflow is proven.
10. Only then expand toward more Zoovu-like advanced features.

---

## 9. Next milestone

The next serious milestone is:

> **First live merchant proof**

That means:

- one real account,
- one real catalog,
- one real finder,
- one real widget install,
- one real shopper session,
- one complete analytics proof packet.

Once that works, Sellentum moves from:

> built MVP

to:

> proven MVP.

That is the next meaningful step.
