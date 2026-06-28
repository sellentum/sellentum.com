# Sellentum Production Audit

Date: 2026-06-28  
Audit scope: desktop SaaS app, public customer experiences, widget runtime, API routes, Supabase schema/RLS, build/dependency health, and visible UX/accessibility behavior.

## Current verification baseline

These checks passed locally after the first hardening stage:

```bash
npm run lint
npm run typecheck
npm run build
```

The production build confirms both widget loader routes are present:

- `/api/widget.js` — canonical loader
- `/widget.js` — compatibility alias

Latest pushed hardening commit:

- `c5a49bb` — `Harden dashboard navigation and widget loader`
- Stage 2 local verification also passed with no `/api/events` POST during a bundled demo finder journey.
- Stage 3 adds atomic Supabase RPC saves for nested finder and configurator builders.

## Fixed in the first hardening stage

1. Dashboard navigation was too overwhelming for a real merchant workflow. It now prioritizes the main launch flow and moves secondary/advanced tools into grouped advanced sections.
2. Dashboard overview had too many shortcut pills. It now focuses on the four actions a merchant actually needs first: products, finder, brand/embed, launch checklist.
3. Widget script copy and runtime were inconsistent. `/api/widget.js` is now canonical, `/widget.js` remains as a safe compatibility alias, and the loader source is centralized.
4. Storefront install scanning now recognizes both `/api/widget.js` and `/widget.js`.
5. Several marketing/finder headings used raw forced line breaks. They now use block spans with readable accessible text.
6. Landing demo toggle buttons now expose `aria-pressed`, and option buttons have cleaner accessible labels.

## Fixed in the second hardening stage

1. Public demo telemetry no longer posts to `/api/events` when Supabase env vars are configured.
   - Public finder, advisor, search, and configurator pages now carry an explicit `source: "local" | "public"` runtime flag.
   - Local/demo-backed experiences record preview telemetry in client state instead of calling public ingestion.
   - Public API-backed experiences still post through `/api/events`.
   - Finder/advisor/search/configurator runtime behavior now branches from the actual data source, not from environment-variable mode.

## Fixed in the third hardening stage

1. Product finder and configurator saves are now transaction-safe in Supabase.
   - Added `save_quiz_with_children(payload jsonb)` for atomic quiz/question/answer-option saves.
   - Added `save_configurator_with_children(payload jsonb)` for atomic configurator/step/option saves.
   - Dashboard client saves now call these RPCs instead of parent upsert + child delete/reinsert loops.
   - The RPCs run as authenticated invoker functions, enforce workspace ownership through `auth.uid()`, and reject invalid child references.
   - Data Contract health now checks that these transactional RPCs exist in schema SQL.

## High-priority production problems

1. Public demo telemetry source split.
   - Status: fixed in Stage 2.
   - Remaining watch item: add automated smoke coverage so this does not regress.

2. Public slug lookup is ambiguous across tenants.
   - Supabase schema only enforces `unique(user_id, slug)`, but public routes can load by plain slug.
   - If two merchants publish the same slug, `.maybeSingle()` can fail or return no stable result.
   - Likely fix: snippets should use global experience IDs, or introduce a globally unique public slug/handle.

3. Quiz and configurator saves are not transactional.
   - Status: fixed in Stage 3.
   - Remaining watch item: run the new migration in production Supabase and confirm Data Contract shows transactional builder saves as passing.

4. Browser-side analytics insertion conflicts with RLS.
   - `analytics_events` has an owner read policy, but no owner insert policy.
   - Public events use the service-role API, but `store.recordEvent()` in Supabase mode attempts browser-client inserts.
   - Likely fix: either add a safe owner insert policy or route all analytics writes through `/api/events` / authenticated server routes.

5. Rate limiting is in-memory.
   - This is acceptable for local MVP testing, but weak on Vercel/serverless because limits are not shared across instances.
   - Likely fix: use Upstash Redis, Supabase-backed rate limits, or Vercel KV before real traffic.

6. Public analytics ingestion has no merchant/domain allowlist yet.
   - The service-role API validates published experience IDs and product ownership, which is good.
   - But any origin can still send events for a known published experience ID.
   - Likely fix: add allowed domains/widget origins per workspace, or signed widget/session tokens.

7. Dependency audit reports two moderate vulnerabilities.
   - `npm audit --json` reports `postcss <8.5.10` through the installed Next.js package.
   - Current installed Next is `15.5.19`; latest registry version checked during audit was `16.2.9`.
   - Likely fix: plan a controlled Next upgrade, because `npm audit fix --force` suggests an unsafe downgrade path.

8. Production proof is still incomplete.
   - Vercel/domain exists, but full completion still needs real Supabase data, real OpenAI calls, real widget install, and analytics telemetry from an end-to-end session.

## Medium-priority technical problems

9. Public finder GET exposes recommendation metadata in quiz data.
   - The UI needs question/option labels, but public payloads currently include match type, match value, weight, and branching data.
   - This reveals merchandising logic that could be kept server-side.

10. Product CSV import saves rows one-by-one.
    - This is slower and can partially import a catalog if one later row fails.
    - A batch upsert with row-level error reporting would be safer.

11. Public Buy buttons can fall back to `href="#"`.
    - If a product URL is missing, the customer sees a Buy/View CTA that goes nowhere.
    - Better behavior: disable the CTA, show “View unavailable”, or surface a merchant QA warning.

12. Middleware checks widget settings on every dashboard request.
    - This keeps onboarding strict, but adds database latency to all dashboard navigation.
    - If Supabase has a transient issue, users may be redirected to onboarding unexpectedly.

13. Forgot password UI exists but has no action.
    - The login screen shows “Forgot password?” as a button, but it does not trigger reset email flow.

14. Auth fields are empty now, but missing standard `name` and `autocomplete` attributes.
    - This avoids sample-value autofill, but weakens normal password-manager behavior and accessibility.
    - Use real attributes without hard-coded default values.

15. Demo state is initialized even in Supabase mode.
    - This helps marketing demos, but it blurs data source boundaries.
    - The app should explicitly know when data came from demo seed vs authenticated Supabase workspace.

16. Public routes depend heavily on service-role reads.
    - This is acceptable if every route carefully validates published status and ownership.
    - It increases the importance of route-level tests and origin/rate controls.

17. Storefront scanner SSRF protection is basic.
    - It blocks localhost/private-looking hostnames.
    - Production-grade scanning should also consider DNS rebinding and resolved private IP ranges.

18. OpenAI production readiness is not fully proven.
    - Code has deterministic fallbacks, which is good.
    - Still needs live `OPENAI_API_KEY` verification against real merchant catalog data.

19. Embeds use fixed iframe sizing.
    - The widget is reliable, but does not yet support iframe auto-resize via `postMessage`.
    - This can create nested scrolling on some storefront placements.

20. Widget install proof is still external.
    - Scanner and QA tools exist, but we still need a real staging/storefront URL with the snippet installed.

## Medium-priority UX/design problems

21. The dashboard still has too many advanced modules for a first-time merchant.
    - The sidebar is improved, but the product surface is still broader than the MVP promise.
    - Recommendation: keep advanced modules, but add “starter mode” copy and progressive reveal.

22. Some pages are visually dense.
    - Many dashboard modules are useful internally but read like operational control centers.
    - For production merchants, key pages should prioritize one main action and one next-step hint.

23. Landing page uses many interactive demo controls.
    - They look polished, but some controls are illustrative rather than real navigation.
    - This is okay for marketing, but should not distract from the CTA path.

24. Desktop-first design is good, but mobile remains intentionally under-prioritized.
    - This matches the current instruction, but production buyers may still open links on phones.
    - Treat mobile as a known later-stage risk, not a surprise.

25. Some image assets depend on remote Unsplash URLs.
    - Good for demo speed, but not ideal for production reliability/performance.
    - Replace with owned optimized assets before launch marketing push.

26. Public finder result cards can feel cramped with long product names/explanations.
    - Desktop layout is strong, but needs stress testing with real catalog data.

27. Empty/error states exist, but production copy should be more merchant-safe.
    - Some messages still describe technical failure plainly.
    - Add clearer “what to do next” language for non-technical business users.

28. The README and product report still use “MVP” language.
    - That is accurate for internal development, but production-facing docs should shift toward “starter launch” or “early access”.

## Recommended next stages

### Stage 2 — Runtime data-source and telemetry cleanup

- Fix public demo telemetry `404`.
- Add explicit `source: "demo" | "public-api" | "workspace"` runtime state.
- Ensure finder/advisor/search/configurator tracking cannot silently post invalid experience events.
- Add tests or smoke coverage for public demo pages with Supabase env vars present.

### Stage 3 — Supabase persistence safety

- Move nested quiz/configurator saves to server-side transactional routes or RPCs.
- Fix/confirm analytics insert path under RLS.
- Add schema verification for policies, not just table existence.

### Stage 4 — Public experience IDs and widget trust boundary

- Make public embed IDs globally unambiguous.
- Add allowed origin/domain checks or signed widget sessions.
- Extend install scanner to validate expected merchant domain.

### Stage 5 — Production external proof

- Use real Supabase catalog.
- Verify OpenAI enrichment/explanations.
- Install the widget on a real staging/storefront page.
- Capture all five core events: `widget_view`, `quiz_start`, `quiz_complete`, `product_recommended`, `buy_click`.

## Bottom line

Sellentum is visually and functionally far beyond a thin demo. The biggest remaining risks are not “missing screens”; they are production hardening issues:

- stronger tenant-safe public routing,
- transactional persistence,
- reliable telemetry,
- real Supabase/OpenAI/storefront proof,
- and a cleaner boundary between demo data and production data.
