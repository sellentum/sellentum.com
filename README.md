# Findly MVP

Findly is a compact guided-selling SaaS product for ecommerce brands. A merchant can import products, build question flows, create configurable bundles, connect choices to deterministic matching signals, publish the experience, and embed it on any website. OpenAI turns the selected product facts into concise match explanations; it never chooses the products.

## What is included

- Premium marketing site with product, workflow, use-case, pricing, resource and platform pages
- Supabase email/password authentication, protected dashboard routes and logout
- Product catalog CRUD plus CSV upload with flexible header aliases, row-level validation and import preview (`name`, `price`, and `category` are required; buyer needs/search text are optional discovery fields)
- AI catalog enrichment with normalized attributes, buyer needs, semantic search text and optional OpenAI embeddings
- Catalog intelligence scoring for enrichment coverage, semantic-search readiness, matching signals, product media and commerce links
- Ontology map for inspecting category clusters, buyer needs, tags, features, spec-to-benefit translations, thin signals and AI-ready quiz question ideas
- AI quiz blueprint review in Launch Studio so merchants can inspect planned questions, catalog coverage and generation risks before publishing
- Launch Studio workflow that enriches a catalog, generates a finder, publishes it, prepares finder/advisor/search/configurator embed snippets and copies a developer launch packet from one screen
- Ontology-guided finder generation that uses category clusters, repeated buyer needs and product features before falling back to OpenAI copy
- Visual finder builder with questions, answer options, optional conditional branching, weights, tag/category/feature/budget rules, per-answer catalog coverage and publish-readiness diagnostics
- Finder merchandising controls to pin, boost or exclude specific products without handing selection to AI
- One-click product finder generation from the current catalog
- Deterministic top-three recommendation engine with budget eligibility filtering, buyer-profile intent scoring and merchant overrides
- Branch-aware recommendation lab for testing shopper answer paths, inspecting score breakdowns and copying a deterministic decision trace before publishing
- Deterministic no-result recovery that explains blocked finder paths and suggests safer next-step adjustments instead of dead-ending shoppers
- Synthetic recommendation QA in Launch Preflight to catch no-result and thin-result finder paths before embedding
- Semantic Search Lab and authenticated search API for testing natural-language product discovery, parsed-term catalog coverage and deterministic tuning guidance over the active catalog
- OpenAI match explanations with a safe fact-based fallback when no API key is present
- Conversational product advisor combining semantic similarity, deterministic field signals, hard budget constraints and clarification turns for vague requests
- Published advisor runtime that loads the merchant catalog server-side instead of trusting browser-supplied products
- Customer-facing semantic search experience for natural-language product discovery over a published catalog context
- Benefit-aware semantic search and advisor token expansion so shopper outcome language maps back to concrete catalog terms
- Grounded AI/fallback explanations for semantic search results after deterministic ranking
- Pgvector-backed advisor candidate retrieval for enriched Supabase catalogs, with deterministic ranking as the final selector
- Visual configurator builder with steps, options, product-linked price deltas, compatibility rules and publish-readiness diagnostics
- Customer finder with welcome, progress, AI explanations, side-by-side result comparison, restart and buy-click tracking
- Published finder runtime that validates the selected branched answer path, builds a semantic buyer profile and ranks products server-side
- Customer-facing configurator with live bundle price, compatibility filtering, review and buy-click tracking
- Published configurator runtime that revalidates final bundles server-side before review/buy
- Shared public branding layer so finder, advisor, semantic search and configurator embeds all inherit merchant brand name, primary colour, widget title, welcome message and CTA copy consistently
- Copyable JavaScript widget that opens a finder, advisor, semantic search or configurator in a lazy-loaded modal iframe or direct inline iframe, with install QA checks and launch handoff packets for generated snippets
- Analytics for sessions, journey replay, real period-over-period trends, funnel diagnosis, views, starts, completions, recommendations, buy clicks, selected answers, search/advisor themes, matched intent signals, product demand and zero-party opportunity suggestions
- Discovery gap analytics that detect no-result paths, thin recommendation sets, missing shopper language, low-confidence matches and stalled surfaced products
- Brand, colour, widget copy and launcher-position settings
- Launch preflight checks for catalog readiness, builder readiness diagnostics, synthetic recommendation QA, AI/env keys, published experiences, widget setup and analytics coverage
- Prioritized launch-readiness report that turns preflight checks into a scored production plan with owners, evidence, effort and next actions
- Supabase schema, indexes, triggers and row-level security
- Fully interactive local demo mode when credentials are absent

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With blank Supabase values, any email/password on the login page opens the seeded demo workspace. Demo edits persist in browser local storage. Use **Brand & embed → Reset demo workspace** to restore the sample catalog.

## Connect Supabase

1. Create a Supabase project.
2. Open its SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Add the project URL, anon key, and service-role key to `.env.local`.
4. In Supabase Authentication, add your local and production URLs to the allowed redirect URLs.
5. Restart the development server.

The service-role key is used only in server routes that load published finder data and validate analytics events. It must never use a `NEXT_PUBLIC_` prefix. Dashboard data uses the signed-in user’s anon-key client and is protected with RLS.

For a project created with an earlier schema, run migrations in order:

```sql
-- Adds pgvector, enrichment fields and semantic matching.
supabase/migrations/002_ai_discovery.sql

-- Adds visual configurator tables and makes analytics experience-agnostic.
supabase/migrations/003_configurators.sql

-- Adds per-finder merchandising controls for pins, boosts and exclusions.
supabase/migrations/004_merchandising_overrides.sql

-- Adds optional answer-level branching for conditional finder flows.
supabase/migrations/005_finder_branching.sql
```

## Enable OpenAI explanations

Set `OPENAI_API_KEY` on the server. `OPENAI_MODEL` defaults to `gpt-4o-mini` and can be changed without code. OpenAI enables richer catalog enrichment, automatic question design, vector embeddings, semantic conversational matching and grounded product explanations. Every workflow has a deterministic local fallback when no key is configured.

## CSV format

```csv
name,price,image_url,category,description,features,tags,buyer_needs,search_text,product_url,active
Terra Trail Runner,128,https://example.com/terra.jpg,Running shoes,Cushioned trail runner,High cushioning|Trail grip,trail|outdoors,wet-weather protection|outdoor confidence,Water-resistant trail shoe for mixed surfaces and rainy weekend runs,https://store.example/terra,true
```

Use pipes, commas or semicolons inside `features`, `tags`, and `buyer_needs`. `search_text` is optional extra discovery language for semantic search/advisor matching. The dashboard includes a downloadable template, accepts common aliases such as `title`, `sale price`, `collection`, `image`, `benefits`, `semantic text`, and `link`, and shows invalid rows or weak recommendation-data warnings before import.

## Embed a guided experience

Publish a finder or configurator, then copy the generated snippet from **Brand & embed**. The generated script has this shape:

```html
<script
  src="https://your-app.vercel.app/api/widget.js"
  data-experience="finder"
  data-mode="modal"
  data-id="YOUR_FINDER_ID"
  data-color="#22352a"
  data-label="Find my match"
  data-position="right"
  data-height="780px"
  async
></script>
```

Set `data-experience` to `finder`, `assistant`, `search`, or `configurator`. Search uses a published finder ID as the catalog context. Set `data-mode` to `modal` for a floating launcher that lazy-loads the iframe only when opened, or `inline` to embed the iframe directly where the script is placed. The widget has no framework dependency and can be used on any HTML storefront.

The public runtime normalizes the saved widget settings before rendering, so brand name, primary colour, widget title, welcome message and button copy are shared across all embedded experiences with safe defaults if a setting is missing.

## Deploy to Vercel

Import the repository into Vercel, add the variables from `.env.example`, and deploy. Set `NEXT_PUBLIC_APP_URL` to the production origin. No persistent filesystem is required.

## Architecture notes

- `app/` — App Router pages and server routes
- `components/` — reusable navigation, shell, modal and state components
- `lib/store.tsx` — demo/Supabase data adapter
- `lib/analytics.ts` — session-aware analytics snapshots, period trends and funnel diagnostics
- `lib/insights.ts` — zero-party insight extraction for shopper answers, query themes, catalog signals, product demand and deterministic merchant opportunities
- `lib/journey-insights.ts` — anonymous shopper journey reconstruction, drop-off detection and recent path summaries
- `lib/discovery-gaps.ts` — deterministic analytics intelligence for no-result paths, missing terms, thin results and stalled product recommendations
- `lib/catalog-benefits.ts` — deterministic spec-to-benefit translation for shopper-friendly ontology insights and question ideas
- `lib/catalog-intelligence.ts` — catalog health scoring for enrichment coverage, matching signals, semantic text, media and commerce links
- `lib/catalog-ontology.ts` — category, buyer-need, tag and feature clustering for ontology mapping and question ideas
- `lib/quiz-generation.ts` — ontology-guided quiz generation fallback and OpenAI grounding summary
- `lib/quiz-blueprint.ts` — launch-ready preview of generated finder questions, option coverage and catalog risks
- `lib/finder-flow.ts` — deterministic conditional question routing and server-side answer-path validation
- `lib/recommendation-qa.ts` — synthetic finder-path recommendation QA for no-result and thin-result launch risks
- `lib/recommendation-recovery.ts` — deterministic shopper-facing recovery guidance for no-result and thin-result finder paths
- `lib/catalog-import.ts` — flexible CSV header mapping, row validation and import previews
- `lib/search-engine.ts` — deterministic benefit-aware semantic search ranking, intent parsing, parsed-term catalog coverage and budget eligibility checks
- `lib/search-tuning.ts` — merchant-facing search tuning guidance from term coverage, weak confidence and budget blockers
- `lib/search-explanations.ts` — grounded OpenAI/fallback copy for already-ranked semantic search results
- `lib/recommendation-explanations.ts` — shared grounded OpenAI/fallback copy for already-ranked finder recommendations
- `lib/widget-snippet.ts` — shared widget snippet generation and install-readiness diagnostics for Settings and Launch Studio
- `lib/experience-launch.ts` — multi-experience launch cards for finder, advisor, semantic search and configurator embeds
- `lib/launch-packet.ts` — copyable developer handoff text for preview URLs, embed snippets, QA checks and analytics contracts
- `lib/rule-coverage.ts` — deterministic answer-rule coverage helper used by the finder builder and readiness checks
- `lib/quiz-readiness.ts` — publish-readiness diagnostics for finder structure, catalog mapping and rule quality
- `lib/configurator-readiness.ts` — publish-readiness diagnostics for configurator structure, linked products, pricing and compatibility rules
- `lib/utils.ts` — deterministic matching, recommendation comparison, configurator compatibility and shared formatting
- `app/dashboard/launch` — self-serve launch workflow for enrichment, quiz generation, publishing and widget copy
- `app/dashboard/ontology` — merchant-side catalog ontology map for product attribute clusters and suggested quiz questions
- `app/dashboard/lab` — branch-aware merchant-side recommendation testing and explainability lab
- `app/dashboard/search` and `app/api/search` — semantic catalog search lab and authenticated product search service
- `app/dashboard/preflight` and `app/api/preflight` — production readiness checks before embedding, including finder/configurator readiness diagnostics
- `lib/launch-readiness-report.ts` — deterministic production launch scoring and prioritized remediation plan built from preflight checks
- `supabase/schema.sql` — PostgreSQL schema and RLS policies
- `app/api/catalog/enrich` — authenticated catalog enrichment and embedding generation
- `app/api/quizzes/generate` — authenticated guided-selling flow generation
- `app/api/assistant` — rate-limited hybrid conversational discovery with deterministic clarification when shopper intent is vague
- `app/api/public/assistant/[id]` — published advisor runtime that validates the experience and loads active products server-side
- `lib/semantic-candidates.ts` — pgvector candidate retrieval through the Supabase `match_products` RPC
- `app/api/public/finder/[id]` — published finder runtime for server-side deterministic recommendations
- `app/search/[id]` and `app/api/public/search/[id]` — customer-facing semantic search page and published search runtime
- `app/api/public/configurator/[id]` — published configurator runtime for server-side compatibility and bundle validation
- `app/assistant/[id]` — customer-facing natural-language product advisor
- `app/configurator/[id]` — customer-facing visual configurator
- `app/dashboard/configurators` — merchant configurator builder

Product selection is intentionally hybrid but not AI-dependent: exact rule signals are scored, natural-language search terms are mapped to catalog fields, a chosen budget is a hard ceiling, inactive products are excluded, enriched buyer-profile language can add semantic/lexical intent points, per-finder pins/boosts/exclusions apply deterministically, and stable price/name tie-breakers make results repeatable. AI runs only after those products have been selected.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
npm run smoke # requires the app to be running, defaults to http://localhost:3000
```

## MVP boundaries

Stripe is represented only by the pricing placeholder. Shopify, Magento, WooCommerce, Salesforce, SAP, advanced personalisation, multi-user permissions and enterprise integrations are deliberately out of scope.
