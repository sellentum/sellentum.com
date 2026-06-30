# Sellentum Progress Report

Last updated: **30 June 2026**

Production site: **https://www.sellentum.com**

GitHub repo: **https://github.com/sellentum/sellentum.com.git**

Main branch: **main**

---

## 1. Plain-English summary

Sellentum is now a working early SaaS MVP for ecommerce guided selling.

The product is no longer just a landing page. In code, it already has the main parts of the original idea:

- a public SaaS website,
- signup and login,
- a protected merchant dashboard,
- product catalog management,
- CSV product upload,
- guided product finder builder,
- rule-based product recommendations,
- AI-generated explanation text,
- customer-facing product finder pages,
- embeddable widget code,
- basic analytics tracking,
- brand/widget settings,
- Supabase database structure and security rules.

The honest current position is:

> **Sellentum is mostly built as an MVP, but it still needs real production proof with real users, real products, and a real embedded storefront test.**

That difference matters:

- **Built in code** means the feature exists.
- **Proven live** means we tested it on the production website with real data and confirmed it works end-to-end.

Right now, many features are built in code. The next job is to prove them live.

---

## 2. Current progress snapshot

| Area | Progress | Human meaning |
|---|---:|---|
| MVP feature build | **80–85%** | Most of the original MVP feature list exists in the app. |
| Production infrastructure | **70–75%** | Vercel, domain, environment variables, Supabase schema and RLS verification are mostly in place. |
| Real-world proof | **30–40%** | We still need a real catalog, real finder, real widget install and real analytics proof. |
| SaaS polish | **40–45%** | The product works, but needs clearer onboarding, simpler screens and more buyer-friendly polish. |
| Zoovu-level maturity | **10–15%** | Zoovu is an enterprise platform. Sellentum is currently an early focused SaaS MVP. |

The next milestone is not “be Zoovu.”

The next milestone is:

> **Make one real ecommerce brand able to upload products, publish a finder, embed it, and see useful recommendation analytics.**

---

## 3. What is already done

### Stage 1 — Product foundation

Status: **Done**

What has been completed:

- Built the app with Next.js, React and Tailwind CSS.
- Created the SaaS app structure.
- Added reusable UI components.
- Added server routes and API routes.
- Made the project deployable on Vercel.

Why it matters:

> Sellentum has a real application foundation, not only marketing pages.

---

### Stage 2 — Brand, domain and GitHub

Status: **Done**

What has been completed:

- Changed the brand from **Findly** to **Sellentum**.
- Renamed the local project folder to **sellentum**.
- Moved the Git remote to the Sellentum GitHub organization.
- Connected the project to the new repo.
- Deployed the production site on **sellentum.com**.

Still to watch:

- If any old “Findly” text appears later, replace it immediately.

---

### Stage 3 — Public SaaS website

Status: **Mostly done**

What has been completed:

- Landing page.
- Product/value sections.
- Feature sections.
- Use-case style sections.
- Pricing placeholder.
- Calls to action.
- Public support/resource/legal/security pages.

What is still left:

- Final pricing message.
- Final company/founder copy.
- Final legal review for Terms and Privacy.
- Stronger conversion-focused copy once the product proof is complete.

---

### Stage 4 — Authentication

Status: **Built, not fully production-proven yet**

What has been completed:

- Signup.
- Login.
- Logout.
- Protected dashboard routes.
- Supabase email verification support.
- Forgot-password route.
- Reset-password route.
- Branded sender setup discussion for Sellentum emails.

What is still left:

- Test signup on the live production site.
- Confirm the verification email opens `https://www.sellentum.com`, not localhost.
- Confirm login works after email verification.
- Confirm forgot-password works.
- Confirm reset-password works.

Owner:

- **You:** test signup and email links using a real email address.
- **Codex:** fix any app-side issue found during testing.

---

### Stage 5 — Supabase database and security

Status: **Verified**

What has been completed:

- Created database schema files.
- Added tables for profiles, products, quizzes, questions, answer options, recommendation rules, analytics events and widget settings.
- Added row-level security setup.
- Added repair SQL for production schema drift.
- Added a Codex-side Supabase repair script.
- Added a Codex-side Supabase schema/RLS verification script.
- Applied the Supabase repair through the production DB connection.
- Verified schema/RLS checks successfully.

Latest verified result:

```text
npm run verify:supabase-schema
Checks: 120
Result: All schema/RLS checks passed.
```

Latest production app verification:

```text
npm run verify:production -- --base-url=https://www.sellentum.com --probe-rate-limit
Summary: 35 pass, 1 warn, 0 fail
```

The remaining warning is expected because the production HTTP verifier cannot prove exact SQL/RLS grants by itself. The separate Supabase schema verifier does prove that, and it passed.

Why it matters:

> The major Supabase production blocker is now cleared from Codex’s side.

---

### Stage 6 — Merchant dashboard

Status: **Built, needs UX simplification**

What has been completed:

- Dashboard home.
- Product catalog area.
- Finder/quiz builder area.
- Widget/settings area.
- Analytics area.
- Production verification area.
- Live launch proof queue.
- Next-best-action card.
- Removed the temporary MVP audit section from the dashboard.
- Updated the launch proof queue so Supabase repair no longer appears as a pending task after backend verification passed.

What is still left:

- Make the dashboard less technical.
- Improve empty states.
- Improve loading states.
- Improve error messages.
- Make each screen tell the merchant exactly what to do next.
- Continue removing internal/founder-only wording from merchant-facing screens.

---

### Stage 7 — Product catalog

Status: **Built, needs real catalog proof**

What has been completed:

- Add products manually.
- Edit products.
- Delete products.
- Upload products through CSV.
- Product fields include name, price, image URL, category, description, features, tags and product URL.
- CSV importer supports flexible headers and validation.

What is still left:

- Upload a real or realistic product catalog.
- Check whether product tags, features and categories are clean enough.
- Fix importer or matching issues found with real data.

Owner:

- **You:** provide or upload a real product CSV.
- **Codex:** improve importer/matching once real data exposes issues.

---

### Stage 8 — Guided-selling quiz builder

Status: **Built, needs real workflow proof**

What has been completed:

- Create product finder quizzes.
- Add multiple questions.
- Add answer options.
- Connect answer options to tags, categories, features, budget logic and recommendation rules.
- Save and edit quiz flows.
- Publish product finder experiences.

What is still left:

- Build one real finder using a real catalog.
- Check whether the questions feel natural to a shopper.
- Check whether answer choices lead to the right products.

---

### Stage 9 — Recommendation logic

Status: **Built**

What has been completed:

- Rule-based product matching.
- Matching based on tags, categories, features, budget and merchant rules.
- Deterministic product selection.
- AI is used only to explain the recommendation after the product is selected.

Core product principle:

> **Rules select. AI explains.**

What is still left:

- Tune scoring with real products.
- Test edge cases like weak matches, no-results and too many similar products.

---

### Stage 10 — AI recommendation explanations

Status: **Built, needs real-quality testing**

What has been completed:

- OpenAI support.
- AI-generated explanations for selected products.
- Safe fallback explanations if OpenAI is unavailable.
- Boundaries so AI does not choose the products.

What is still left:

- Test explanation quality with real product data.
- Check explanation speed.
- Monitor OpenAI cost once real usage begins.

---

### Stage 11 — Customer-facing product finder

Status: **Built, needs live shopper proof**

What has been completed:

- Shopper-facing question flow.
- Result cards with image, title, price and Buy Now button.
- Recommendation explanation text.
- Restart/continue-style journey behavior.

What is still left:

- Complete one real live shopper journey on production.
- Confirm recommendations appear correctly.
- Confirm Buy Now buttons go to the correct product URLs.

---

### Stage 12 — Embeddable widget

Status: **Built, needs real storefront proof**

What has been completed:

- JavaScript widget loader.
- Modal embed mode.
- Inline iframe embed mode.
- Widget settings.
- Public storefront demo page.
- Install scanner/proof workflow.

What is still left:

- Install the widget on a staging or real ecommerce page.
- Confirm it loads outside the Sellentum site.
- Confirm modal/iframe behavior works correctly.
- Confirm analytics events fire from the embedded widget.

Owner:

- **You:** provide a staging page or test storefront page.
- **Codex:** verify the widget and fix issues.

---

### Stage 13 — Analytics

Status: **Built, needs production event proof**

What has been completed:

- Widget views.
- Quiz starts.
- Completed quizzes.
- Recommended products.
- Buy button clicks.
- Basic analytics dashboard logic.
- Launch analytics proof checks.

What is still left:

- Generate real production events from a real widget journey.
- Confirm events appear in Supabase.
- Confirm the analytics dashboard shows accurate numbers.

Important:

> Analytics is not truly proven until we can see real production events after a real shopper journey.

---

### Stage 14 — Deployment and production verification

Status: **Mostly done**

What has been completed:

- Vercel account/project setup.
- Production domain live at `https://www.sellentum.com`.
- Vercel environment variables added.
- Supabase production project connected.
- Supabase schema/RLS verified.
- Production route/API verification passed with no failures.

What is still left:

- Wait for Vercel to deploy each new pushed change.
- Test full production auth.
- Test full production product/finder/widget journey.

---

## 4. What is not done yet

These are the important unfinished items:

1. **Production signup proof**
   - A real user must sign up, verify email and log in successfully on `https://www.sellentum.com`.

2. **Real product catalog proof**
   - A real or realistic CSV catalog must be uploaded.

3. **Real product finder proof**
   - A complete guided finder must be built from that catalog and published.

4. **Real widget proof**
   - The widget must be installed on an external staging or storefront page.

5. **Real analytics proof**
   - A real shopper journey must create widget view, quiz start, completion, recommendation and Buy Now click events.

6. **Merchant UX simplification**
   - The dashboard must become easier for a normal business owner to understand.

7. **Launch-level copy and legal polish**
   - Pricing, legal pages, support wording and onboarding copy need final review.

8. **Billing**
   - Stripe is only a placeholder for now. Full billing is intentionally not part of the current MVP.

---

## 5. Next steps in the correct order

Do these in order. This keeps the project moving cleanly instead of randomly jumping between tasks.

### Next step 1 — Confirm Vercel deploy

Owner: **You**

After each pushed update, check Vercel and confirm the latest deployment is successful.

---

### Next step 2 — Test production authentication

Owner: **You first, Codex fixes if needed**

Test:

- signup,
- email verification,
- login,
- logout,
- forgot password,
- reset password.

If anything breaks, send Codex the exact error/screenshot.

---

### Next step 3 — Upload real product catalog

Owner: **You**

Upload a real or realistic CSV catalog.

Minimum useful fields:

- name,
- price,
- category,
- description,
- features,
- tags,
- product URL,
- image URL.

---

### Next step 4 — Build and publish one real finder

Owner: **You + Codex**

Create one simple guided-selling flow from the real catalog.

Example:

- Question 1: What are you shopping for?
- Question 2: What matters most?
- Question 3: What is your budget?

Then publish it.

---

### Next step 5 — Install widget on a test storefront page

Owner: **You provide page, Codex verifies**

We need one external page where the Sellentum widget snippet can be pasted.

This can be:

- a staging ecommerce page,
- a simple test HTML page,
- a temporary page on another domain.

---

### Next step 6 — Prove analytics

Owner: **Codex after widget test exists**

Run one full journey:

- widget loads,
- quiz starts,
- quiz completes,
- products are recommended,
- Buy Now is clicked.

Then confirm those events appear correctly in analytics.

---

## 6. Files kept

There are now only two project-level markdown files to care about:

| File | Purpose |
|---|---|
| `README.md` | Technical setup, local development and deployment instructions. |
| `SELLENTUM_PROGRESS_REPORT.md` | Human-readable project progress and next-step tracker. |

No other project markdown files are needed right now.

Markdown files inside `node_modules` belong to third-party packages and should not be deleted manually.

---

## 7. Current bottom line

Sellentum is in a good place for an MVP, but it is not yet a finished SaaS business product.

The app is mostly built.

The backend is now verified.

The website is live.

The next serious milestone is:

> **Prove one complete real-world merchant journey from signup → catalog upload → finder publish → widget install → analytics proof.**

Once that journey works cleanly, Sellentum becomes much more than a prototype. It becomes a real early product.
