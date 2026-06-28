# Sellentum MVP Progress Report

Date: 2026-06-28  
Current branch: `main`  
Latest pushed commit inspected: `b360afc Add AI Readiness Center`  
Product direction: desktop-first MVP, preserving Sellentum branding while moving toward a smaller Zoovu-like guided-selling SaaS.

## Executive summary

Sellentum is now well beyond the first 10% MVP shell. The current codebase includes a broad desktop SaaS application with marketing pages, authentication/demo mode, catalog management, CSV import, AI-assisted enrichment, guided finder builder, deterministic recommendation engine, customer-facing finder, conversational advisor, semantic search, configurator workflows, embeddable widget, analytics, QA centers, production verification dashboards, and multiple operational audit centers.

My estimate:

- Application/product build: about 85-90% complete for a strong MVP.
- Production proof/signoff: about 55-65% complete.
- Overall “ready to call the full objective complete”: about 75-80%.

The main reason it is not 100% is not because the screens are missing; it is because true completion needs real external proof: deployed Vercel URL, real Supabase tenant, real OpenAI key verification, real storefront/widget install evidence, and full analytics telemetry from an end-to-end production-like session.

## Stage-by-stage progress

| Stage | Status | Description |
| --- | --- | --- |
| 1. Core SaaS foundation | Done | Next.js app structure, landing page, protected dashboard shell, Sellentum branding, desktop-first design system, demo workspace behavior, and Supabase-ready auth flow. |
| 2. Product catalog management | Done | Manual product CRUD, CSV import, flexible CSV headers, validation, product fields for name, price, image, category, description, features, tags, buyer needs, search text, URL, and active state. |
| 3. Supabase schema and persistence | Built, needs production verification | Schema exists for profiles, products, quizzes, questions, answer options, recommendation rules, analytics events, widget settings, configurators, configurator steps/options, embeddings, indexes, triggers, and RLS. Still needs proof against a real production Supabase project. |
| 4. Guided-selling quiz builder | Done | Product finder builder supports questions, answer options, match types, match values, weights, publish state, branching, and readiness diagnostics. |
| 5. Deterministic recommendation engine | Done | Product selection is rule-based first: tags, category, features, hard budget ceilings, active product filtering, buyer-profile signals, merchandising overrides, and stable tie-breakers. AI does not choose products. |
| 6. Customer-facing finder runtime | Done locally | Published finder route and API validate answer paths server-side, generate 1-3 recommendations, show explanations, comparison support, recovery guidance, restart, and Buy Now tracking. Needs deployed URL QA. |
| 7. AI-assisted catalog enrichment | Built, needs live OpenAI verification | Enrichment route supports OpenAI enrichment, buyer needs, semantic text, embeddings, and deterministic fallback when no key is configured. Needs production `OPENAI_API_KEY` validation on a real catalog. |
| 8. AI quiz and configurator generation | Done locally | Quiz generation uses ontology fallback plus optional OpenAI. Configurator generation uses deterministic product-linked blueprints plus optional OpenAI structure/copy. Output remains editable and validated. |
| 9. Semantic search and conversational advisor | Done locally | Search lab, public search runtime, advisor studio, customer advisor, semantic/lexical matching, budget parsing, recovery prompts, pgvector candidate support, and grounded/fallback explanations are implemented. Needs production prompt QA with real catalog data. |
| 10. Configurator workflows | Done locally | Merchant configurator builder, visual customer configurator, server-side validation, compatibility guidance, path QA, compatibility matrix, bundle/attach studio, and product-linked options are implemented. |
| 11. Embeddable widget | Done locally | Copyable JavaScript widget supports finder, advisor, search, and configurator in modal or inline iframe mode, with attribution labels and shared brand settings. Needs real storefront install proof. |
| 12. Analytics and attribution | Done locally | Tracks widget views, starts, completions, recommendations, buy clicks, recommendation feedback, source/campaign/placement/page attribution, journey replay, discovery gaps, product demand, and analytics QA. Needs full production telemetry session. |
| 13. Merchant optimization centers | Done | Added dashboard modules for analytics, feedback, sales content, personas, audience capture, returns/fit, experiments, commercial impact, merchandising, availability, catalog pipeline, attributes, vocabulary, ontology, decision graph, and semantic knowledge graph. |
| 14. Headless/API and launch handoff | Done | API Center, Widget Studio, Experience Registry, Launch Channels, Partner Syndication, Workspace Snapshot, launch packets, launch contracts, and storefront QA runbooks are implemented. |
| 15. Production and operations verification | Built, needs external proof | Runtime Operations Center, Release Center, Production Verification Center, MVP Audit, Storefront QA Sandbox, Storefront Install Scanner, Data Contract Center, and AI Readiness Center are implemented. These prove readiness locally and define production gates, but final completion needs real deployment evidence. |
| 16. Desktop typography and polish | Done | Mobile has intentionally not been prioritized per instruction. Desktop typography guardrails, readable font scale, and no tiny arbitrary app/component text classes are covered by smoke tests. |

## Major features completed

### Marketing and positioning

- Premium Sellentum landing page.
- Platform pages for product, AI, widget, API, data, analytics, trust, production, and operational modules.
- Industries and resources pages.
- Pricing remains a placeholder, as requested.

### Authentication and workspace

- Signup/login/logout flows.
- Protected dashboard routes.
- Supabase auth support.
- Fully interactive local demo mode when Supabase credentials are absent.

### Catalog and data layer

- Manual product creation/edit/delete.
- CSV upload/import flow.
- Product fields required by the MVP.
- Catalog intelligence and enrichment scoring.
- Data Contract Center for schema/workspace health.
- Supabase schema and migrations.

### Guided selling

- Visual product finder builder.
- Question and answer option editing.
- Match logic tied to tag/category/feature/budget/none.
- Answer weights.
- Branching routes.
- Flow Studio and recommendation lab.
- Scenario coverage suite.

### Recommendations

- Deterministic product matching.
- Budget constraints as hard filters.
- Buyer-profile and semantic signals as deterministic ranking inputs.
- Merchandising controls: pin, boost, exclude.
- No-result and thin-result recovery guidance.
- Recommendation trace and QA reporting.

### AI system

- AI catalog enrichment.
- AI/fallback quiz generation.
- AI/fallback configurator generation.
- AI/fallback recommendation explanations.
- AI/fallback semantic search explanations.
- Grounding Center.
- AI Trust Center.
- AI Readiness Center.
- Strong boundary: rules select products; AI explains after selection.

### Customer-facing experiences

- Finder runtime.
- Conversational advisor runtime.
- Semantic search runtime.
- Configurator runtime.
- Shared public branding and widget settings.
- Buy Now click tracking.
- Recommendation feedback component.

### Embeds and ecommerce launch workflow

- Copyable widget snippets.
- Modal and inline iframe modes.
- Finder/advisor/search/configurator embed types.
- Attribution labels for source, medium, campaign, placement, content, term, page URL, page title, and referrer.
- Storefront QA sandbox.
- Storefront Install Scanner.

### Analytics and operations

- Analytics dashboard.
- Journey replay.
- Attribution reporting.
- Discovery gap analytics.
- Conversion playbook.
- Experiments planner.
- Commercial impact report.
- Runtime Operations Center.
- Release Center.
- Production Verification Center.
- MVP Completion Audit.
- Workspace Snapshot exporter.

## What is left

### Must-do before calling the full objective complete

1. Deploy to Vercel.
2. Configure production environment variables:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - optional `OPENAI_MODEL`
3. Run `supabase/schema.sql` against a real Supabase project.
4. Verify Supabase auth, RLS, and real workspace persistence.
5. Import or create a real merchant catalog.
6. Run real AI enrichment and verify embeddings.
7. Publish a real finder.
8. Publish a real configurator if configurator is part of launch scope.
9. Copy the production widget snippet into a staging/production storefront page.
10. Run Storefront Install Scanner against that actual URL.
11. Complete a full customer journey through the embedded widget.
12. Confirm analytics events:
    - `widget_view`
    - `quiz_start`
    - `quiz_complete`
    - `product_recommended`
    - `buy_click`
13. Run smoke tests against the deployed URL:

```bash
SMOKE_BASE_URL=https://your-production-url npm run smoke
```

14. Export final Production Verification packet.
15. Re-run MVP Completion Audit and only then mark the overall objective complete.

### Nice-to-have after MVP

These are intentionally not required for the current MVP:

- Shopify integration.
- Magento, WooCommerce, Salesforce, SAP integrations.
- Full Stripe billing.
- Complex team permissions.
- Enterprise personalization.
- Mobile-first refinement.
- Advanced admin/user roles.
- Full CRM/contact sync.

## Current verification status

Recent verification performed before the latest pushed stage:

```bash
npm run typecheck
npm run lint
git diff --check
npm run build
npm run smoke
```

All passed at the time of the latest AI Readiness stage.

## Current pushed stage history

Recent major pushed stages include:

- `b360afc` — Add AI Readiness Center
- `52d605b` — Add Workspace Data Contract Center
- `ad04510` — Add Storefront Install Scanner
- `d801a24` — Add Semantic Knowledge Graph Center
- `f979f65` — Add MVP completion audit
- `b358ed8` — Normalize desktop typography scale
- `505c611` — Add Grounding Center
- `5fc0b14` — Add Production Verification Center
- `ddf9026` — Add Headless API Center
- `baeeddd` — Add Widget Studio
- `f5eac39` — Add Catalog Pipeline Center
- `146b0b1` — Add Runtime Operations Center
- `f8cdb41` — Add Release Center
- `189777b` — Add storefront QA sandbox

## Practical progress estimate

| Area | Estimated completion | Notes |
| --- | ---: | --- |
| UI/product surface | 90% | Broad desktop dashboard and marketing surface exists. |
| Catalog/finder core MVP | 90% | Core merchant and shopper flows are implemented locally. |
| AI-assisted features | 80% | Built with fallbacks; needs live OpenAI verification. |
| Configurator workflows | 85% | Strong local implementation; production merchant QA still needed. |
| Embeds/widget | 85% | Widget exists; actual storefront install proof remains. |
| Analytics | 80% | Tracking and dashboards exist; production telemetry proof remains. |
| Production readiness tooling | 85% | Many verification centers exist; external deployment proof remains. |
| Final launch readiness | 60% | Blocked mostly by real Vercel/Supabase/OpenAI/storefront evidence. |

## Bottom line

The app is no longer just a landing page or partial prototype. The core Zoovu-like MVP concept is substantially built:

> A business can manage a catalog, build guided product-discovery experiences, embed them, and use deterministic recommendations with AI-generated explanations.

What remains is the final production proof layer:

- real deployment,
- real database,
- real AI key,
- real storefront install,
- real telemetry,
- final audit.

Until those are verified, I should keep the overall goal active rather than marking it complete.
