# Sellentum

Sellentum is a compact guided-selling SaaS product for ecommerce brands. A merchant can import products, build question flows, create configurable bundles, connect choices to deterministic matching signals, publish the experience, and embed it on any website. OpenAI turns the selected product facts into concise match explanations; it never chooses the products.

For the current human-readable project status, open [`SELLENTUM_PROGRESS_REPORT.md`](./SELLENTUM_PROGRESS_REPORT.md).

## What is included

- Premium marketing site with product, workflow, use-case, pricing, resource, platform, contact, support, security, privacy and terms pages
- Supabase email/password authentication, protected dashboard routes and logout
- Product catalog CRUD plus CSV upload with flexible header aliases, row-level validation, import preview, real-catalog intake checklist and reusable CSV template (`name`, `price`, and `category` are required; buyer needs/search text are optional discovery fields)
- AI catalog enrichment with normalized attributes, buyer needs, semantic search text and optional OpenAI embeddings
- Catalog Pipeline Center that governs import contracts, enrichment coverage, semantic readiness, downstream consumers, field coverage and copyable catalog handoff packets
- Availability Guard Center that proves active products, Buy Now URLs, imagery and runtime references are safe before recommendations reach shoppers
- Catalog intelligence scoring for enrichment coverage, semantic-search readiness, matching signals, product media and commerce links
- Attribute Studio for normalizing messy specs, aliases, materials, price bands and shopper-benefit language before they power discovery
- Ontology map for inspecting category clusters, buyer needs, tags, features, spec-to-benefit translations, thin signals and AI-ready quiz question ideas
- Vocabulary Studio for approving shopper terms, synonym clusters, unsupported search/advisor language and product-level semantic text tasks
- Decision graph workbench that connects products, catalog signals, finder answer rules, configurator options and observed shopper language into one merchant-readable trust map
- AI Trust Center that proves “Rules select. AI explains.” with deterministic selection audits, grounded explanation QA, runtime guardrails, analytics integrity and partner-safe data boundaries
- Grounding Center that turns catalog facts, approved vocabulary, benefit mappings and explanation audits into an AI-safe product fact map and copyable RAG grounding packet
- Semantic Knowledge Graph Center that unifies ontology, benefits, vocabulary, deterministic rules, grounding evidence and configurator compatibility into a practical Zoovu-style graph packet
- Shopper language planner that compares catalog facts, generated quiz terms and real search/advisor queries to find covered, thin and missing shopper vocabulary before launch
- AI quiz blueprint review in Launch Studio so merchants can inspect planned questions, catalog coverage and generation risks before publishing
- Industry starter kits that install editable sample products, finder questions, deterministic answer rules and product-linked configurator drafts for faster merchant onboarding
- Launch Studio workflow that enriches a catalog, generates a finder, publishes it, prepares finder/advisor/search/configurator embed snippets and copies a developer launch packet from one screen
- Widget Studio that centralizes finder/advisor/search/configurator modal and inline snippets, install contracts, attribution labels, QA checks and copyable developer handoff packets
- Headless API Center that packages finder, advisor, search, configurator, widget and analytics runtimes with request examples, response fields, guardrails and copyable developer packets
- Data Contract Center that verifies Supabase persistence mode, schema table coverage, catalog records, published experiences, analytics event shape and widget settings through an authenticated health endpoint
- AI Readiness Center that verifies OpenAI environment state, authenticated AI routes, deterministic fallbacks, grounded prompts, embedding/pgvector contracts and the “rules select, AI explains” boundary
- Experience Registry that inventories finder, advisor, search and configurator surfaces with public URLs, snippets, QA status and runtime metrics
- Launch Channels board that packages homepage, category, PDP and support placements with copy-ready snippets, attribution labels, QA checks and channel metrics
- Partner Syndication board that packages retailer, marketplace, affiliate, support and sales-partner widget snippets with syndication attribution, QA checks and data-policy handoff notes
- Storefront QA sandbox that previews each channel in a controlled desktop storefront, lists expected telemetry events and exports a copyable QA packet before theme installation
- Public storefront widget demo page that loads the real `/api/widget.js` contract on a simulated ecommerce page before a live theme install
- Storefront Install Scanner that fetches a staging/production page, verifies the Sellentum widget script and data attributes, checks attribution labels, exposes a storefront proof handoff checklist and exports copyable scan/proof packets
- Runtime Operations Center that monitors public endpoint contracts, guardrails, analytics quality, release gates and telemetry proof
- Release Center that rolls catalog, experience, channel, sandbox, analytics and optimization gates into a go/no-go release candidate with rollback notes
- Production Verification Center that packages Vercel deployment gates, Supabase/demo mode evidence, required route/API contracts, desktop QA scenarios, final verification commands and copyable production handoff packets
- System typography guardrails using a simple Helvetica/Poppins/SF Pro stack, a 16px base, readable line/word spacing and a desktop source sweep that keeps app/component UI on standard `text-xs`/`text-sm` scales instead of tiny arbitrary font sizes
- Workspace Snapshot exporter that packages products, finder rules, configurators, brand settings, install snippets, release state and redacted analytics into copyable JSON/CSV/handoff files
- Usage & Plan Center that meters sessions, guided interactions, catalog scale, published experiences and AI-assist credits against Stripe-placeholder plan tiers
- Copyable launch contract with runtime endpoints, widget data attributes, analytics payload requirements, QA checks and troubleshooting guidance for storefront handoff
- Storefront QA runbook for staging install, shopper-journey proof, telemetry verification, recovery-path testing and rollback planning
- Ontology-guided finder generation that uses category clusters, repeated buyer needs and product features before falling back to OpenAI copy
- Visual finder builder with questions, answer options, optional conditional branching, weights, tag/category/feature/budget rules, per-answer catalog coverage and publish-readiness diagnostics
- Flow Studio workbench that turns finder questions, answer routes, branch skips and deterministic route QA into a visual no-code canvas
- Finder merchandising controls to pin, boost or exclude specific products without handing selection to AI
- One-click product finder generation from the current catalog
- Deterministic top-three recommendation engine with budget eligibility filtering, buyer-profile intent scoring and merchant overrides
- Branch-aware recommendation lab for testing shopper answer paths, inspecting score breakdowns and copying a deterministic decision trace before publishing
- Scenario coverage suite in the recommendation lab that sweeps likely finder paths, branch routing, answer coverage, product coverage and blocked/thin recommendation risks before launch
- Merchandising Studio that audits finder pins, boosts and exclusions against product demand, stale controls, stalled products and invisible SKUs before merchants tune live ranking
- Deterministic no-result recovery that explains blocked finder paths and suggests safer next-step adjustments instead of dead-ending shoppers
- Synthetic recommendation QA in Launch Preflight to catch no-result and thin-result finder paths before embedding
- Semantic Search Lab and authenticated search API for testing natural-language product discovery, parsed-term catalog coverage and deterministic tuning guidance over the active catalog
- OpenAI match explanations with a safe fact-based fallback when no API key is present
- Explanation grounding QA in Launch Preflight to verify recommendation copy is supported by product facts and selected answer evidence
- Conversational product advisor combining semantic similarity, deterministic field signals, hard budget constraints and clarification turns for vague requests
- Advisor Studio for testing open-ended shopper prompts, inspecting intent coverage, recovery suggestions and copyable assistant widget packets before launch
- Published advisor runtime that loads the merchant catalog server-side instead of trusting browser-supplied products
- Conversational advisor recovery with quick-refinement prompts, budget guidance and closest catalog options when requests are too broad or blocked
- Customer-facing semantic search experience for natural-language product discovery over a published catalog context
- Benefit-aware semantic search and advisor token expansion so shopper outcome language maps back to concrete catalog terms
- Grounded AI/fallback explanations for semantic search results after deterministic ranking
- Semantic search recovery with missing-term guidance, budget relaxation suggestions and closest catalog near misses for weak or blocked queries
- Pgvector-backed advisor candidate retrieval for enriched Supabase catalogs, with deterministic ranking as the final selector
- AI-assisted configurator generation that turns active catalog products into draft visual bundle builders with product-linked anchor choices and compatibility guardrails
- Visual configurator builder with steps, options, product-linked price deltas, compatibility rules and publish-readiness diagnostics
- Configurator path QA that simulates valid bundles, product-linked completion paths and incompatible option guardrails before launch
- Compatibility Matrix Center that audits blocked option pairs, stale references, product-link availability and one-way dependency rules before launch
- Bundle & Attach Studio that converts configurator anchors, paid add-ons, compatibility rules and telemetry into deterministic AOV lift opportunities
- Customer finder with welcome, progress, AI explanations, side-by-side result comparison, restart and buy-click tracking
- Published finder runtime that validates the selected branched answer path, builds a semantic buyer profile and ranks products server-side
- Customer-facing configurator with live bundle price, compatibility filtering, review and buy-click tracking
- Published configurator runtime that revalidates final bundles server-side before review/buy
- Configurator compatibility guidance that explains blocked options, conflicting choices and safe alternatives
- Shared public branding layer so finder, advisor, semantic search and configurator embeds all inherit merchant brand name, primary colour, widget title, welcome message and CTA copy consistently
- Copyable JavaScript widget that opens a finder, advisor, semantic search or configurator in a lazy-loaded modal iframe or direct inline iframe, with install QA checks and launch handoff packets for generated snippets
- Public runtime guardrails with bounded JSON bodies, shared rate-limit responses and sanitized analytics metadata for embedded finder, advisor, search, configurator and event APIs
- Analytics for sessions, journey replay, real period-over-period trends, funnel diagnosis, views, starts, completions, recommendations, buy clicks, selected answers, search/advisor themes, matched intent signals, product demand and zero-party opportunity suggestions
- Launch analytics proof that checks the five critical storefront events, scores session-level evidence and exports a copyable QA proof packet
- Shopper-facing recommendation feedback on finder, advisor, search and configurator result cards, with a Feedback Center for product-quality lanes, negative themes, tuning actions and copyable feedback packets
- Sales Content Studio that converts catalog proof, zero-party intent, product demand and recommendation feedback into grounded PDP, collection, email and support copy blocks with a copyable content packet
- Shopper Persona Studio that turns zero-party answers, search/advisor terms, configurator choices, recommendations and buy clicks into deterministic buyer segments, product affinities and activation actions
- Audience Capture Center that converts anonymous guided-selling sessions into zero-party segments, capture prompts, consent guardrails, safe export fields and copyable audience handoff packets
- Widget attribution analytics for source, medium, campaign, placement, page URL, page title and referrer so merchants can compare storefront launches and campaigns
- Analytics QA that validates event-contract coverage, session linkage, required metadata, event sequence and product attribution before launch decisions
- Discovery gap analytics that detect no-result paths, thin recommendation sets, missing shopper language, low-confidence matches and stalled surfaced products
- Real dashboard command center with period trends, live performance bars, launch score, command queue, milestones and experience mix built from actual workspace data
- Founder launch queue that separates Codex-shipped work from founder-side production proof tasks such as Supabase repair, auth email testing, real catalog upload, storefront widget proof and analytics verification
- Conversion playbook that turns analytics quality, funnel rates, discovery gaps, catalog health and product demand into prioritized merchant actions
- Experiment planner that turns funnel, channel, attribution and discovery signals into controlled post-launch tests with metrics, guardrails, success criteria and rollback plans
- Commercial impact reporting that estimates assisted product value, unclicked recommendation value, demand coverage and ROI opportunities from recommendation and buy-click events
- Returns & Fit Intelligence that detects wrong-fit risk from catalog gaps, thin/no-result journeys, stalled recommendations, compatibility guardrails and missing pre-purchase questions
- Brand, colour, widget copy and launcher-position settings
- Stripe placeholder plan logic only: visible usage/pricing drivers without checkout sessions, subscriptions, card collection or billing mutations
- Launch preflight checks for catalog readiness, shopper-language coverage, builder readiness diagnostics, configurator path QA, synthetic recommendation QA, AI/env keys, published experiences, widget setup, analytics coverage and telemetry quality
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

-- Adds optional recommendation feedback analytics events.
supabase/migrations/006_recommendation_feedback.sql

-- Adds transactional finder/configurator builder save RPCs.
supabase/migrations/007_transactional_experience_saves.sql

-- Adds approved storefront-domain allowlists for widget analytics.
supabase/migrations/008_widget_allowed_domains.sql

-- Adds Supabase-backed shared rate-limit buckets and RPC.
supabase/migrations/009_shared_rate_limits.sql
```

For production verification, follow the next-step checklist in [`SELLENTUM_PROGRESS_REPORT.md`](./SELLENTUM_PROGRESS_REPORT.md). The SQL files are [`supabase/verification/production_schema_check.sql`](./supabase/verification/production_schema_check.sql) and [`supabase/verification/rate_limit_runtime_probe.sql`](./supabase/verification/rate_limit_runtime_probe.sql).

## Enable OpenAI explanations

Set `OPENAI_API_KEY` on the server. `OPENAI_MODEL` defaults to `gpt-4o-mini` and can be changed without code. OpenAI enables richer catalog enrichment, automatic question design, vector embeddings, semantic conversational matching and grounded product explanations. Every workflow has a deterministic local fallback when no key is configured.

## CSV format

```csv
name,price,image_url,category,description,features,tags,buyer_needs,search_text,product_url,active
Terra Trail Runner,128,https://example.com/terra.jpg,Running shoes,Cushioned trail runner,High cushioning|Trail grip,trail|outdoors,wet-weather protection|outdoor confidence,Water-resistant trail shoe for mixed surfaces and rainy weekend runs,https://store.example/terra,true
```

Use pipes, commas or semicolons inside `features`, `tags`, and `buyer_needs`. `search_text` is optional extra discovery language for semantic search/advisor matching. The dashboard includes a downloadable template, accepts common aliases such as `title`, `sale price`, `collection`, `image`, `benefits`, `semantic text`, and `link`, and shows invalid rows or weak recommendation-data warnings before import.

The Products CSV importer also includes a **Real catalog intake contract** with required/recommended columns, a pre-import checklist, a richer sample template and a copyable handoff packet for preparing the first production catalog.

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
  data-medium="embed"
  data-campaign="sellentum-launch"
  data-placement="pdp-bottom"
  async
></script>
```

Set `data-experience` to `finder`, `assistant`, `search`, or `configurator`. Search uses a published finder ID as the catalog context. Set `data-mode` to `modal` for a floating launcher that lazy-loads the iframe only when opened, or `inline` to embed the iframe directly where the script is placed. The widget has no framework dependency and can be used on any HTML storefront.

The canonical production loader is `/api/widget.js`. `/widget.js` is kept as a compatibility alias for older snippets, but new installs should use the generated `/api/widget.js` URL from the dashboard.

For attribution, the widget automatically passes the storefront page URL, page title, referrer, launcher position and inferred host source into the iframe. Add optional labels such as `data-source`, `data-medium`, `data-campaign`, `data-placement`, `data-content`, or `data-term` when you want Analytics to compare specific launches.

The public runtime normalizes the saved widget settings before rendering, so brand name, primary colour, widget title, welcome message and button copy are shared across all embedded experiences with safe defaults if a setting is missing.

To test a snippet before touching a real storefront theme, open `/storefront-demo`, paste a published experience ID, choose modal or inline mode, and complete the simulated shopper journey. The page loads the same `/api/widget.js` script contract used by production storefronts.

## Deploy to Vercel

Import the repository into Vercel, add the variables from `.env.example`, and deploy. Set `NEXT_PUBLIC_APP_URL` to the production origin. No persistent filesystem is required.

## Verify production

After Vercel deploys and Supabase migrations are applied, run:

```bash
npm run verify:production -- --base-url=https://www.sellentum.com
```

The command checks required environment variables, public production routes, the widget loader and Supabase table/column reachability through the service-role key without printing secrets. It does not replace the authoritative SQL/RLS verification in Supabase. Run [`supabase/verification/production_schema_check.sql`](./supabase/verification/production_schema_check.sql) in the Supabase SQL editor and confirm every row returns `pass`.

If production verification reports `widget_settings.allowed_domains` or `rate_limit_buckets` as missing, run the focused repair pack in the Supabase SQL editor:

```sql
supabase/verification/production_repair_widget_rate_limits.sql
```

Then rerun `npm run verify:production -- --base-url=https://www.sellentum.com`.

The dashboard **Production Verification Center** also surfaces this repair workflow with copyable steps, a paste-ready repair SQL button, the live verifier command, and the full schema/RLS SQL check so production handoff is not hidden in documentation only.

The same center includes a copyable production auth checklist. Before merchant onboarding, prove signup confirmation and password-reset emails route through `https://www.sellentum.com/auth/callback` and never back to `localhost`.

To perform the optional shared rate-limit RPC probe from the CLI, add:

```bash
npm run verify:production -- --base-url=https://www.sellentum.com --probe-rate-limit
```

## Architecture notes

- `app/` — App Router pages and server routes
- `components/` — reusable navigation, shell, modal and state components
- `lib/store.tsx` — demo/Supabase data adapter
- `lib/analytics.ts` — session-aware analytics snapshots, period trends and funnel diagnostics
- `lib/attribution.ts` — widget/source attribution metadata capture and campaign/placement performance reporting
- `lib/analytics-quality.ts` — event-contract QA for required metadata, session linkage, event ordering and product attribution
- `lib/recommendation-feedback.ts`, `components/recommendation-feedback.tsx` and `app/dashboard/feedback` — shopper recommendation-quality feedback capture, product feedback lanes, themes and deterministic tuning packets
- `lib/content-studio.ts` and `app/dashboard/content` — grounded sales-content generation from catalog facts, zero-party intent, demand and feedback with deterministic AI-claim boundaries
- `lib/commercial-impact.ts` — deterministic assisted-revenue and ROI-opportunity reporting from product recommendation and buy-click events
- `lib/returns-intelligence.ts` and `app/dashboard/returns` — return-prevention intelligence from fit-language gaps, product friction, compatibility rules, question guardrails and support-safe scripts
- `lib/conversion-playbook.ts` — deterministic merchant optimization actions from funnel, catalog, QA and zero-party intent signals
- `lib/experiments.ts` and `app/dashboard/experiments` — deterministic post-launch experiment planner for launcher copy, journey friction, result trust, semantic search, configurator and attribution tests
- `lib/dashboard-command-center.ts` — overview-page command center combining analytics, catalog intelligence, readiness, recommendation QA and discovery gaps
- `lib/starter-kits.ts` and `app/dashboard/templates` — vertical launch templates that materialize starter catalog products, finder rules and configurator drafts into the workspace
- `lib/insights.ts` — zero-party insight extraction for shopper answers, query themes, catalog signals, product demand and deterministic merchant opportunities
- `lib/journey-insights.ts` — anonymous shopper journey reconstruction, drop-off detection and recent path summaries
- `lib/persona-studio.ts` and `app/dashboard/personas` — shopper persona segmentation from zero-party signals, product affinities, source coverage and copyable activation packets
- `lib/audience-capture.ts` and `app/dashboard/audience` — consent-aware zero-party audience capture planning, safe export schemas, anonymous segment readiness and copyable audience packets
- `lib/discovery-gaps.ts` — deterministic analytics intelligence for no-result paths, missing terms, thin results and stalled product recommendations
- `lib/catalog-pipeline.ts` and `app/dashboard/catalog-pipeline` — ingestion, enrichment, semantic-readiness and downstream-consumer control center for the product truth layer
- `lib/availability-guard.ts` and `app/dashboard/availability` — availability guardrails for active products, Buy Now URLs, stale runtime references, inactive demand and recommendation safety
- `lib/catalog-benefits.ts` — deterministic spec-to-benefit translation for shopper-friendly ontology insights and question ideas
- `lib/catalog-intelligence.ts` — catalog health scoring for enrichment coverage, matching signals, semantic text, media and commerce links
- `lib/attribute-studio.ts` and `app/dashboard/attributes` — catalog normalization workbench for canonical attributes, raw aliases, spec cleanup tasks and copyable attribute packets
- `lib/catalog-ontology.ts` — category, buyer-need, tag and feature clustering for ontology mapping and question ideas
- `lib/vocabulary-studio.ts` and `app/dashboard/vocabulary` — discovery vocabulary governance for approved terms, synonym clusters, unsupported shopper language and product semantic text tasks
- `lib/decision-graph.ts` and `app/dashboard/decision-graph` — deterministic relationship graph for product signals, finder rules, configurator product links and unresolved shopper language
- `lib/trust-center.ts` and `app/dashboard/trust-center` — AI trust governance for deterministic selection, grounded explanations, public runtime guardrails, analytics integrity and partner-safe data boundaries
- `lib/grounding-center.ts` and `app/dashboard/grounding` — AI-safe product fact map from catalog evidence, approved vocabulary, benefit mappings and explanation audits
- `lib/semantic-knowledge-graph.ts` and `app/dashboard/knowledge-graph` — Zoovu-style semantic graph control center spanning ontology, benefits, vocabulary, rules, grounding and compatibility relationships
- `lib/shopper-language-planner.ts` — deterministic shopper-vocabulary coverage planner for catalog enrichment, synonym review, quiz guidance and preflight launch checks
- `lib/quiz-generation.ts` — ontology-guided quiz generation fallback and OpenAI grounding summary
- `lib/quiz-blueprint.ts` — launch-ready preview of generated finder questions, option coverage and catalog risks
- `lib/finder-flow.ts` — deterministic conditional question routing and server-side answer-path validation
- `lib/flow-studio.ts` and `app/dashboard/flow-studio` — visual finder flow canvas, answer route map, route QA and copyable flow packet
- `lib/recommendation-qa.ts` — synthetic finder-path recommendation QA for no-result and thin-result launch risks
- `lib/scenario-coverage.ts` — bounded branch-aware finder scenario QA with answer, route and product coverage scoring
- `lib/merchandising-studio.ts` and `app/dashboard/merchandising` — deterministic merchandising control center for pins, boosts, exclusions, product demand lanes and copyable override packets
- `lib/recommendation-recovery.ts` — deterministic shopper-facing recovery guidance for no-result and thin-result finder paths
- `lib/catalog-import.ts` and `lib/catalog-intake.ts` — flexible CSV header mapping, row validation, import previews, real-catalog checklist and reusable CSV intake packet
- `lib/search-engine.ts` — deterministic benefit-aware semantic search ranking, intent parsing, parsed-term catalog coverage and budget eligibility checks
- `lib/search-tuning.ts` — merchant-facing search tuning guidance from term coverage, weak confidence and budget blockers
- `lib/search-recovery.ts` — shopper-facing semantic-search recovery guidance, budget adjustments and near-miss explanation
- `lib/search-explanations.ts` — grounded OpenAI/fallback copy for already-ranked semantic search results
- `lib/advisor-studio.ts` and `app/dashboard/advisor` — conversational advisor QA for prompt suites, catalog evidence, recovery prompts, readiness checks and assistant launch packets
- `lib/recommendation-explanations.ts` — shared grounded OpenAI/fallback copy for already-ranked finder recommendations
- `lib/explanation-grounding.ts` — launch-time explanation QA for unsupported claims, fact coverage and fallback/OpenAI copy readiness
- `lib/widget-snippet.ts` — shared widget snippet generation and install-readiness diagnostics for Settings and Launch Studio
- `lib/widget-studio.ts` and `app/dashboard/widget-studio` — desktop widget implementation center for modal/inline snippets, install contracts, attribution, QA checks and copyable handoff packets
- `lib/api-center.ts` and `app/dashboard/api-center` — headless API console for finder, advisor, semantic search, configurator, widget and analytics runtime contracts
- `lib/workspace-health.ts`, `app/api/workspace/health` and `app/dashboard/data-contract` — authenticated workspace data-contract checks for Supabase schema coverage, runtime data health, analytics shape and copyable launch packets
- `lib/ai-readiness.ts`, `app/api/ai/health` and `app/dashboard/ai-readiness` — authenticated AI readiness checks for OpenAI env/model state, route auth, deterministic fallbacks, grounded prompts, embeddings, pgvector and copyable AI launch packets
- `lib/public-runtime-guard.ts` and `lib/rate-limit.ts` — bounded JSON parsing, Supabase-backed shared rate-limit responses with local fallback, and analytics metadata sanitization for embeddable runtimes
- `lib/experience-launch.ts` — multi-experience launch cards for finder, advisor, semantic search and configurator embeds
- `lib/experience-registry.ts` and `app/dashboard/experiences` — operational registry for all customer-facing discovery surfaces, install QA, snippets and telemetry proof
- `lib/launch-channels.ts` and `app/dashboard/channels` — channelized storefront placement planner for attributed snippets, install QA and early channel metrics
- `lib/syndication.ts` and `app/dashboard/syndication` — partner-safe syndication packets for retailer, marketplace, affiliate, support and sales channels
- `lib/storefront-sandbox.ts` and `app/dashboard/storefront-sandbox` — controlled storefront QA preview with expected event contracts, acceptance criteria and copyable staging packets
- `lib/storefront-install-scanner.ts`, `app/api/storefront/scan` and `app/dashboard/install-scanner` — authenticated storefront scanner for widget script detection, attribute validation, origin checks and install packets
- `lib/runtime-operations.ts` and `app/dashboard/operations` — production runtime operations center for public endpoint contracts, guardrails, analytics quality and telemetry proof
- `lib/release-center.ts` and `app/dashboard/release-center` — go/no-go release candidate builder with launch gates, release scope, rollback plan and copyable release notes
- `lib/production-verification.ts` and `app/dashboard/production` — production verification center for Vercel deployment evidence, required routes/APIs, desktop QA scenarios, analytics proof and launch handoff commands
- `SELLENTUM_PROGRESS_REPORT.md` — human-readable project progress, blockers and next actions
- `supabase/verification/*` — production Supabase schema, RLS, grant and shared-rate-limit verification SQL
- `lib/workspace-snapshot.ts` and `app/dashboard/workspace-snapshot` — safe workspace archive, product/analytics CSV exports and developer/support handoff packet
- `lib/usage-metering.ts` and `app/dashboard/usage` — Stripe-placeholder usage and plan-fit center for sessions, interactions, catalog scale, experiences and AI-assist credits
- `lib/launch-packet.ts` — copyable developer handoff text for preview URLs, embed snippets, QA checks and analytics contracts
- `lib/launch-contract.ts` — deterministic launch contract for runtime endpoints, widget attributes, analytics payloads and troubleshooting
- `lib/storefront-qa-runbook.ts` and `lib/storefront-proof.ts` — deterministic manual QA scripts for storefront install, analytics proof, recovery testing, rollback and founder/developer proof handoff
- `lib/rule-coverage.ts` — deterministic answer-rule coverage helper used by the finder builder and readiness checks
- `lib/quiz-readiness.ts` — publish-readiness diagnostics for finder structure, catalog mapping and rule quality
- `lib/configurator-blueprint.ts` — deterministic configurator blueprint generation from active products, shopper signals, benefits and compatibility inference
- `lib/configurator-readiness.ts` — publish-readiness diagnostics for configurator structure, linked products, pricing and compatibility rules
- `lib/configurator-qa.ts` — deterministic configurator path QA for required-step completion, product-linked bundles and incompatibility guardrails
- `lib/configurator-guidance.ts` — deterministic shopper-facing compatibility explanations and safe alternatives for configurator choices
- `lib/compatibility-matrix.ts` and `app/dashboard/compatibility` — B2B-style dependency matrix for blocked pairs, stale references, product links and configurator QA evidence
- `lib/bundle-studio.ts` and `app/dashboard/bundles` — AOV lift workbench for product anchors, paid add-ons, compatibility guardrails, attach telemetry and copyable bundle packets
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
- `app/api/configurators/generate` — authenticated visual configurator generation with OpenAI copy/structure and deterministic catalog fallback
- `app/api/assistant` — rate-limited hybrid conversational discovery with deterministic clarification when shopper intent is vague
- `app/api/public/assistant/[id]` — published advisor runtime that validates the experience and loads active products server-side
- `lib/advisor-recovery.ts` — deterministic conversational recovery guidance for broad, weak or budget-blocked advisor requests
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

## Current product boundaries

Stripe is represented only by the pricing placeholder. Shopify, Magento, WooCommerce, Salesforce, SAP, CRM/contact sync, advanced personalisation, multi-user permissions and enterprise integrations are deliberately out of scope.
