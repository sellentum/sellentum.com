import { NextResponse } from "next/server";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz, demoSettings } from "@/lib/demo-data";
import { buildAnalyticsQualityReport } from "@/lib/analytics-quality";
import { buildAttributionReport } from "@/lib/attribution";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { analyzeCatalogIntelligence, type CatalogIntelligenceSeverity } from "@/lib/catalog-intelligence";
import { buildConfiguratorQaReport } from "@/lib/configurator-qa";
import { analyzeConfiguratorReadiness } from "@/lib/configurator-readiness";
import { buildExplanationGroundingReport } from "@/lib/explanation-grounding";
import { buildLaunchReadinessReport } from "@/lib/launch-readiness-report";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import { buildRecommendationQaReport } from "@/lib/recommendation-qa";
import { buildShopperLanguagePlan } from "@/lib/shopper-language-planner";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

type CheckStatus = "pass" | "warn" | "fail";

type PreflightCheck = {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

type QuizRow = Omit<Quiz, "questions"> & {
  questions?: Array<Omit<Quiz["questions"][number], "options"> & {
    options?: Quiz["questions"][number]["options"];
    answer_options?: Quiz["questions"][number]["options"];
  }>;
};

function statusRank(status: CheckStatus) {
  return status === "fail" ? 2 : status === "warn" ? 1 : 0;
}

function worstStatus(checks: PreflightCheck[]): CheckStatus {
  return checks.reduce<CheckStatus>((worst, check) => statusRank(check.status) > statusRank(worst) ? check.status : worst, "pass");
}

function check(id: string, label: string, description: string, status: CheckStatus, detail: string, actionHref?: string, actionLabel?: string): PreflightCheck {
  return { id, label, description, status, detail, actionHref, actionLabel };
}

function catalogStatus(severity: CatalogIntelligenceSeverity): CheckStatus {
  return severity === "blocker" ? "fail" : severity === "warning" ? "warn" : "pass";
}

function catalogDescription(id: string) {
  if (id === "catalog-size") return "A meaningful discovery experience needs enough active products to compare.";
  if (id === "core-copy") return "Descriptions help AI explanations, semantic search and shopper confidence.";
  if (id === "matching-signals") return "Tags, features and buyer needs are the structured signals behind deterministic ranking.";
  if (id === "enrichment") return "Enriched buyer needs and search text improve semantic and conversational discovery.";
  if (id === "semantic-text") return "Searchable language lets shopper intent map back to product facts.";
  if (id === "commerce-assets") return "Result cards need product images and links for conversion.";
  if (id === "taxonomy") return "Clear categories help comparison, filtering and generated questions.";
  return "Catalog intelligence diagnostic.";
}

function catalogActionLabel(id: string) {
  if (id === "enrichment" || id === "semantic-text") return "Run AI enrich";
  if (id === "commerce-assets") return "Fill product media";
  return "Review catalog";
}

function hasIntentMetadata(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return Array.isArray(metadata.answers) || typeof metadata.query === "string" || Array.isArray(metadata.selected_option_names);
}

function hasSessionMetadata(event: AnalyticsEvent) {
  return typeof event.metadata?.session_id === "string" && event.metadata.session_id.length > 0;
}

function hasAttributionMetadata(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return typeof metadata.findly_source === "string"
    || typeof metadata.utm_source === "string"
    || typeof metadata.findly_page_url === "string"
    || typeof metadata.findly_placement === "string";
}

function buildPreflight({ products, quizzes, configurators, events, settings, mode, origin }: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  mode: "demo" | "supabase";
  origin: string;
}) {
  const activeProducts = products.filter((product) => product.active);
  const catalogIntelligence = analyzeCatalogIntelligence(products);
  const shopperLanguage = buildShopperLanguagePlan({ products, quizzes, events });
  const finderReadiness = quizzes.map((quiz) => ({ quiz, report: analyzeQuizReadiness(quiz, products) }));
  const configuratorReadiness = configurators.map((configurator) => ({ configurator, report: analyzeConfiguratorReadiness(configurator, products) }));
  const configuratorQa = buildConfiguratorQaReport(configurators, products);
  const recommendationQa = buildRecommendationQaReport(quizzes, products);
  const explanationGrounding = buildExplanationGroundingReport({ products, quizzes, openaiConfigured: Boolean(process.env.OPENAI_API_KEY) });
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const attribution = buildAttributionReport(events);
  const readyFinders = finderReadiness.filter(({ quiz, report }) => quiz.published && report.canPublish);
  const readyConfigurators = configuratorReadiness.filter(({ configurator, report }) => configurator.published && report.canPublish);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const blockedPublishedFinders = finderReadiness.filter(({ quiz, report }) => quiz.published && !report.canPublish);
  const blockedPublishedConfigurators = configuratorReadiness.filter(({ configurator, report }) => configurator.published && !report.canPublish);
  const finderWarnings = finderReadiness.filter(({ quiz, report }) => quiz.published && report.warnings.length);
  const configuratorWarnings = configuratorReadiness.filter(({ configurator, report }) => configurator.published && report.warnings.length);
  const widgetViews = events.filter((event) => event.event_type === "widget_view").length;
  const completions = events.filter((event) => event.event_type === "quiz_complete").length;
  const recommendations = events.filter((event) => event.event_type === "product_recommended").length;
  const intentEvents = events.filter(hasIntentMetadata).length;
  const sessionEvents = events.filter(hasSessionMetadata).length;
  const attributionEvents = events.filter(hasAttributionMetadata).length;
  const sessions = new Set(events.filter(hasSessionMetadata).map((event) => event.metadata!.session_id as string)).size;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  const sections = [
    {
      id: "environment",
      label: "Environment",
      description: "Deployment keys and runtime services.",
      checks: [
        check("app-url", "App URL", "Used to generate embeddable snippets and public links.", appUrl.startsWith("http") ? "pass" : "fail", appUrl || "NEXT_PUBLIC_APP_URL is missing.", "/dashboard/settings", "Review embed"),
        check("supabase-client", "Supabase client keys", "Auth and workspace data need the public URL and anon key.", process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "pass" : mode === "demo" ? "warn" : "fail", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase browser client is configured." : "Running without Supabase keys; demo mode only.", undefined, undefined),
        check("supabase-service", "Service-role key", "Public finder/configurator reads and analytics validation use server-only service access.", process.env.SUPABASE_SERVICE_ROLE_KEY ? "pass" : mode === "demo" ? "warn" : "fail", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Server routes can validate published experiences." : "Missing SUPABASE_SERVICE_ROLE_KEY; public APIs will be demo/local only.", undefined, undefined),
        check("openai", "OpenAI key", "Enables richer catalog enrichment, quiz generation, semantic advisor search and match copy.", process.env.OPENAI_API_KEY ? "pass" : "warn", process.env.OPENAI_API_KEY ? `OpenAI enabled with ${process.env.OPENAI_MODEL || "gpt-4o-mini"}.` : "No OPENAI_API_KEY; deterministic fallbacks will run.", "/dashboard/products", "Enrich catalog"),
      ],
    },
    {
      id: "catalog",
      label: "Catalog intelligence",
      description: "Products must carry enough clean data to power reliable recommendations.",
      checks: [
        ...catalogIntelligence.checks.map((item) => check(`catalog-${item.id}`, item.label, catalogDescription(item.id), catalogStatus(item.severity), item.detail, "/dashboard/products", catalogActionLabel(item.id))),
        check("semantic-runtime", "Semantic candidate retrieval", "Published advisors can use enriched catalog text and stored embeddings to retrieve better candidates before deterministic ranking.", process.env.OPENAI_API_KEY && catalogIntelligence.enrichedProducts ? "pass" : catalogIntelligence.enrichedProducts ? "warn" : "warn", process.env.OPENAI_API_KEY && catalogIntelligence.enrichedProducts ? "OpenAI and enriched products are available for pgvector-backed advisor retrieval." : catalogIntelligence.enrichedProducts ? "Products are enriched, but OPENAI_API_KEY is missing so advisor retrieval uses rules/fallbacks." : "Run catalog enrichment with an OpenAI key to activate semantic candidate retrieval.", "/dashboard/products", "Prepare semantic catalog"),
      ],
    },
    {
      id: "shopper-language",
      label: "Shopper language coverage",
      description: "Shopper vocabulary from catalog facts, quiz options and analytics should map back to real product evidence.",
      checks: [
        check(
          "language-coverage-score",
          "Language coverage score",
          "Combines covered terms, thin terms, missing terms, product-level search text and quiz term coverage.",
          shopperLanguage.score >= 82 ? "pass" : shopperLanguage.score >= 55 ? "warn" : "fail",
          `${shopperLanguage.score}% score · ${shopperLanguage.summary.coveredTerms} covered · ${shopperLanguage.summary.thinTerms} thin · ${shopperLanguage.summary.missingTerms} missing terms.`,
          "/dashboard/ontology",
          "Review planner",
        ),
        check(
          "observed-shopper-language",
          "Observed shopper terms",
          "Search and advisor queries should not contain repeated language missing from product facts.",
          shopperLanguage.summary.observedTerms ? shopperLanguage.summary.missingObservedTerms ? "warn" : "pass" : "warn",
          shopperLanguage.summary.observedTerms ? shopperLanguage.summary.missingObservedTerms ? `${shopperLanguage.summary.missingObservedTerms}/${shopperLanguage.summary.observedTerms} observed term${shopperLanguage.summary.observedTerms === 1 ? "" : "s"} are missing direct catalog coverage.` : `${shopperLanguage.summary.observedTerms} observed shopper term${shopperLanguage.summary.observedTerms === 1 ? "" : "s"} map back to catalog evidence.` : "No search/advisor query terms captured yet; run a storefront QA session.",
          "/dashboard/analytics",
          "Review intent",
        ),
        check(
          "product-language-backlog",
          "Product language backlog",
          "Every active product should carry buyer needs and semantic search text for search, advisor and AI explanations.",
          shopperLanguage.summary.productsNeedingLanguage ? "warn" : activeProducts.length ? "pass" : "fail",
          shopperLanguage.summary.productsNeedingLanguage ? `${shopperLanguage.summary.productsNeedingLanguage} active product${shopperLanguage.summary.productsNeedingLanguage === 1 ? "" : "s"} need buyer needs, search text or richer copy.` : activeProducts.length ? "Active products have enough discovery language for launch testing." : "No active products are available to audit.",
          "/dashboard/products",
          "Edit products",
        ),
        check(
          "semantic-synonyms",
          "Semantic synonym guidance",
          "Adjacent shopper phrases should be approved only when they are factually true for the product.",
          shopperLanguage.summary.synonymSuggestions ? "pass" : "warn",
          shopperLanguage.summary.synonymSuggestions ? `${shopperLanguage.summary.synonymSuggestions} synonym suggestion${shopperLanguage.summary.synonymSuggestions === 1 ? "" : "s"} available for merchant review.` : "No synonym opportunities detected yet; add richer product tags and buyer needs.",
          "/dashboard/ontology",
          "Review synonyms",
        ),
      ],
    },
    {
      id: "experiences",
      label: "Product discovery experiences",
      description: "At least one published experience should be ready to embed.",
      checks: [
        check("published-finder", "Published finder", "Guided selling needs a published quiz with questions and answer rules.", readyFinders.length ? "pass" : publishedFinders.length ? "warn" : "fail", readyFinders.length ? `${readyFinders.length} finder${readyFinders.length === 1 ? "" : "s"} ready.` : `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"}, but structure needs review.`, "/dashboard/quizzes", "Open finder builder"),
        check("finder-readiness", "Finder readiness diagnostics", "Published finders should pass the same launch checks shown in the builder.", blockedPublishedFinders.length ? "fail" : finderWarnings.length ? "warn" : readyFinders.length ? "pass" : "fail", blockedPublishedFinders.length ? `${blockedPublishedFinders.length} published finder${blockedPublishedFinders.length === 1 ? "" : "s"} have blockers.` : finderWarnings.length ? `${finderWarnings.length} published finder${finderWarnings.length === 1 ? "" : "s"} have warnings.` : readyFinders.length ? "Published finder checks pass." : "No launch-ready finder is published.", "/dashboard/quizzes", "Review readiness"),
        check("advisor", "Conversational advisor", "The advisor reuses a launch-ready published finder and active catalog as its public entrypoint.", readyFinders.length && activeProducts.length >= 2 ? "pass" : "warn", readyFinders.length && activeProducts.length >= 2 ? "Advisor can run against the active catalog." : "Publish a readiness-checked finder and keep at least two active products for advisor mode.", "/dashboard/settings", "Copy advisor embed"),
        check("configurator", "Visual configurator", "Compatibility workflows need a published configurator with steps and options.", readyConfigurators.length ? "pass" : publishedConfigurators.length ? "warn" : "warn", readyConfigurators.length ? `${readyConfigurators.length} configurator${readyConfigurators.length === 1 ? "" : "s"} ready.` : "No ready configurator yet; optional for the MVP but useful for complex products.", "/dashboard/configurators", "Build configurator"),
        check("configurator-readiness", "Configurator readiness diagnostics", "Published configurators should pass linked-product, pricing and compatibility checks.", blockedPublishedConfigurators.length ? "fail" : configuratorWarnings.length ? "warn" : readyConfigurators.length ? "pass" : "warn", blockedPublishedConfigurators.length ? `${blockedPublishedConfigurators.length} published configurator${blockedPublishedConfigurators.length === 1 ? "" : "s"} have blockers.` : configuratorWarnings.length ? `${configuratorWarnings.length} published configurator${configuratorWarnings.length === 1 ? "" : "s"} have warnings.` : readyConfigurators.length ? "Published configurator checks pass." : "No launch-ready configurator is published yet.", "/dashboard/configurators", "Review readiness"),
      ],
    },
    {
      id: "configurator-qa",
      label: "Configurator path QA",
      description: "Published visual configurators should complete valid bundles and block incompatible combinations.",
      checks: [
        check(
          "configurator-qa-scenarios",
          "Configurator QA scenarios",
          "Preflight simulates default and alternate configurator paths plus explicit compatibility guardrails.",
          configuratorQa.summary.scenariosChecked ? "pass" : "warn",
          configuratorQa.summary.scenariosChecked ? `${configuratorQa.summary.scenariosChecked} configurator scenario${configuratorQa.summary.scenariosChecked === 1 ? "" : "s"} checked across ${configuratorQa.summary.configuratorsChecked} configurator${configuratorQa.summary.configuratorsChecked === 1 ? "" : "s"}.` : "No configurator scenarios could be checked yet.",
          "/dashboard/configurators",
          "Open configurators",
        ),
        check(
          "configurator-completion-paths",
          "Completion paths",
          "Every simulated valid path should complete required steps and return a valid server-side bundle.",
          configuratorQa.summary.invalidCompletionScenarios ? "fail" : configuratorQa.summary.completionScenarios ? "pass" : "warn",
          configuratorQa.summary.invalidCompletionScenarios ? `${configuratorQa.summary.invalidCompletionScenarios} completion path${configuratorQa.summary.invalidCompletionScenarios === 1 ? "" : "s"} failed validation.` : configuratorQa.summary.completionScenarios ? `${configuratorQa.summary.completionScenarios} completion path${configuratorQa.summary.completionScenarios === 1 ? "" : "s"} can complete required steps.` : "No completion paths were available to validate.",
          "/dashboard/configurators",
          "Fix paths",
        ),
        check(
          "configurator-linked-products",
          "Purchasable bundle links",
          "Completed bundles should include active linked products so shoppers can buy the configured result.",
          configuratorQa.summary.productLinkedScenarioRate >= 80 ? "pass" : configuratorQa.summary.productLinkedScenarioRate > 0 ? "warn" : configuratorQa.summary.completionScenarios ? "fail" : "warn",
          `${configuratorQa.summary.productLinkedScenarioRate}% of completion paths include active linked products. Average bundle value: ${configuratorQa.summary.averageBundleValue}.`,
          "/dashboard/configurators",
          "Link products",
        ),
        check(
          "configurator-compatibility-guardrails",
          "Compatibility guardrails",
          "Known incompatible option pairs should be rejected by deterministic validation before checkout.",
          configuratorQa.summary.failedGuardrails ? "fail" : configuratorQa.summary.compatibilityGuardrails ? "pass" : readyConfigurators.length ? "warn" : "warn",
          configuratorQa.summary.failedGuardrails ? `${configuratorQa.summary.failedGuardrails} compatibility guardrail${configuratorQa.summary.failedGuardrails === 1 ? "" : "s"} failed.` : configuratorQa.summary.compatibilityGuardrails ? `${configuratorQa.summary.compatibilityGuardrails} incompatibility guardrail${configuratorQa.summary.compatibilityGuardrails === 1 ? "" : "s"} verified.` : "No cross-step incompatibility pairs were available to test.",
          "/dashboard/configurators",
          "Review rules",
        ),
        check(
          "configurator-qa-score",
          "Configurator QA score",
          "Summarizes path completion, product linkage and compatibility rejection.",
          configuratorQa.score >= 85 ? "pass" : configuratorQa.score >= 60 ? "warn" : configuratorQa.summary.scenariosChecked ? "fail" : "warn",
          `${configuratorQa.score}% QA score · ${configuratorQa.summary.passingScenarios}/${configuratorQa.summary.scenariosChecked} scenarios passed.`,
          "/dashboard/configurators",
          "Review QA",
        ),
      ],
    },
    {
      id: "recommendation-qa",
      label: "Recommendation reliability",
      description: "Synthetic shopper paths should return stable, deterministic product recommendations before launch.",
      checks: [
        check(
          "qa-scenarios",
          "Synthetic shopper scenarios",
          "Preflight simulates default and alternate starting paths through published finders.",
          recommendationQa.summary.scenariosChecked ? "pass" : "fail",
          recommendationQa.summary.scenariosChecked ? `${recommendationQa.summary.scenariosChecked} scenario${recommendationQa.summary.scenariosChecked === 1 ? "" : "s"} checked across ${recommendationQa.summary.quizzesChecked} finder${recommendationQa.summary.quizzesChecked === 1 ? "" : "s"}.` : "No finder scenarios could be checked.",
          "/dashboard/lab",
          "Open lab",
        ),
        check(
          "qa-no-results",
          "No-result paths",
          "Every checked path should produce at least one eligible product.",
          recommendationQa.blockers.length ? "fail" : "pass",
          recommendationQa.blockers.length ? `${recommendationQa.blockers.length} scenario${recommendationQa.blockers.length === 1 ? "" : "s"} returned no eligible products. First issue: ${recommendationQa.blockers[0]?.quizName} · ${recommendationQa.blockers[0]?.label}.` : "All checked paths return at least one eligible recommendation.",
          "/dashboard/lab",
          "Debug paths",
        ),
        check(
          "qa-thin-results",
          "Recommendation depth",
          "Healthy paths should usually have up to three eligible alternatives for comparison.",
          recommendationQa.warnings.length ? "warn" : recommendationQa.summary.scenariosChecked ? "pass" : "fail",
          recommendationQa.warnings.length ? `${recommendationQa.warnings.length} scenario${recommendationQa.warnings.length === 1 ? "" : "s"} had a thin recommendation set.` : recommendationQa.summary.scenariosChecked ? "Checked paths have enough eligible products for confident top-three recommendations." : "No recommendation depth could be checked.",
          "/dashboard/lab",
          "Review scoring",
        ),
        check(
          "qa-score",
          "Recommendation QA score",
          "Summarizes whether synthetic paths produce launch-safe results.",
          recommendationQa.score >= 80 ? "pass" : recommendationQa.score >= 50 ? "warn" : "fail",
          `${recommendationQa.score}% of checked scenarios passed. ${recommendationQa.summary.passingScenarios}/${recommendationQa.summary.scenariosChecked} scenarios are healthy.`,
          "/dashboard/lab",
          "Test logic",
        ),
      ],
    },
    {
      id: "explanation-grounding",
      label: "Explanation grounding",
      description: "AI and fallback recommendation copy should be constrained to product facts and selected answer evidence.",
      checks: [
        check(
          "explanation-scenarios",
          "Explanation audit scenarios",
          "Preflight samples top recommendations from finder paths before checking result-card copy.",
          explanationGrounding.summary.auditedRecommendations ? "pass" : "fail",
          explanationGrounding.summary.auditedRecommendations ? `${explanationGrounding.summary.auditedRecommendations} recommendation explanation${explanationGrounding.summary.auditedRecommendations === 1 ? "" : "s"} audited across ${explanationGrounding.summary.scenarios} scenario${explanationGrounding.summary.scenarios === 1 ? "" : "s"}.` : "No recommendation explanations could be audited.",
          "/dashboard/lab",
          "Open lab",
        ),
        check(
          "explanation-fact-coverage",
          "Product fact coverage",
          "Grounded match copy needs descriptions, features, tags, buyer needs and semantic text.",
          explanationGrounding.summary.factCoverageRate >= 80 ? "pass" : explanationGrounding.summary.factCoverageRate >= 50 ? "warn" : "fail",
          `${Math.round(explanationGrounding.summary.factCoverageRate)}% of active products have strong explanation fact coverage.`,
          "/dashboard/products",
          "Improve catalog",
        ),
        check(
          "explanation-copy-safety",
          "Unsupported copy risk",
          "Result explanations should avoid unsupported claims and certainty language.",
          explanationGrounding.summary.blockers ? "fail" : explanationGrounding.summary.warnings ? "warn" : explanationGrounding.summary.auditedRecommendations ? "pass" : "fail",
          explanationGrounding.summary.blockers ? `${explanationGrounding.summary.blockers} explanation audit${explanationGrounding.summary.blockers === 1 ? "" : "s"} failed grounding checks.` : explanationGrounding.summary.warnings ? `${explanationGrounding.summary.warnings} explanation audit${explanationGrounding.summary.warnings === 1 ? "" : "s"} need review.` : explanationGrounding.summary.auditedRecommendations ? "Audited explanation samples are grounded to product facts and answer evidence." : "No explanation samples were available to inspect.",
          "/dashboard/lab",
          "Review traces",
        ),
        check(
          "explanation-source",
          "Explanation source mode",
          "OpenAI can enrich copy, while deterministic fallback keeps launch safe without an API key.",
          explanationGrounding.sourceMode === "openai" ? "pass" : "warn",
          explanationGrounding.sourceMode === "openai" ? "OpenAI explanation generation is available, with deterministic fallback if it fails." : "Using deterministic fallback explanations because OPENAI_API_KEY is not configured.",
          "/dashboard/preflight",
          "Review copy",
        ),
      ],
    },
    {
      id: "embed-analytics",
      label: "Embed and measurement",
      description: "The installed widget should be brand-safe and measurable.",
      checks: [
        check("settings", "Brand settings", "Widget copy and colour should look intentional on a storefront.", settings.brand_name && settings.button_text && /^#[0-9a-f]{6}$/i.test(settings.primary_color) ? "pass" : "warn", `${settings.brand_name || "Unnamed brand"} · ${settings.button_text || "Missing button text"} · ${settings.primary_color}`, "/dashboard/settings", "Edit brand settings"),
        check("widget-script", "Widget script", "The copy-paste embed can launch finder, advisor, or configurator in an iframe modal.", readyFinders.length || readyConfigurators.length ? "pass" : "fail", readyFinders.length || readyConfigurators.length ? "At least one embeddable experience is available." : "Publish a finder or configurator before copying the script.", "/dashboard/settings", "Copy snippet"),
        check("event-volume", "Analytics events", "Views, starts, completions, recommendations and clicks prove the loop is measurable.", events.length ? "pass" : "warn", `${events.length} event${events.length === 1 ? "" : "s"} captured · ${widgetViews} views · ${completions} completions · ${recommendations} recommendations.`, "/dashboard/analytics", "Open analytics"),
        check("session-events", "Session tracking", "Anonymous session IDs let analytics group events into shopper journeys.", sessionEvents ? "pass" : "warn", sessionEvents ? `${sessionEvents} event${sessionEvents === 1 ? "" : "s"} grouped into ${sessions} session${sessions === 1 ? "" : "s"}.` : "No session metadata captured yet; run a fresh widget journey.", "/dashboard/analytics", "Review sessions"),
        check("intent-events", "Intent metadata", "Selected answers, advisor queries and configurator choices power zero-party insights.", intentEvents ? "pass" : "warn", intentEvents ? `${intentEvents} event${intentEvents === 1 ? "" : "s"} include shopper-intent metadata.` : "No answer/query/selection metadata captured yet.", "/dashboard/analytics", "Review intent"),
        check("source-attribution", "Source attribution", "Widget events should include source, campaign, placement or storefront page context for launch comparisons.", attribution.summary.attributionRate >= 70 ? "pass" : attribution.summary.events ? "warn" : "warn", attribution.summary.events ? `${attribution.summary.attributionRate}% attributed · ${attribution.summary.sources} source${attribution.summary.sources === 1 ? "" : "s"} · ${attribution.summary.placements} placement${attribution.summary.placements === 1 ? "" : "s"}.` : "No widget attribution metadata captured yet; install the latest snippet.", "/dashboard/analytics", "Review attribution"),
      ],
    },
    {
      id: "analytics-quality",
      label: "Analytics quality",
      description: "The telemetry contract should be complete enough to trust launch decisions.",
      checks: [
        check(
          "analytics-quality-score",
          "Analytics QA score",
          "Summarizes required metadata, session linkage, event order and product attribution.",
          analyticsQuality.score >= 85 ? "pass" : analyticsQuality.score >= 65 ? "warn" : "fail",
          `${analyticsQuality.score}% quality score · ${analyticsQuality.summary.events} events · ${analyticsQuality.summary.sessions} sessions.`,
          "/dashboard/analytics",
          "Open Analytics QA",
        ),
        check(
          "analytics-required-metadata",
          "Required event metadata",
          "Every launch-contract event should carry the fields needed for journey replay and attribution.",
          analyticsQuality.summary.missingRequiredMetadata ? "fail" : analyticsQuality.summary.events ? "pass" : "warn",
          analyticsQuality.summary.missingRequiredMetadata ? `${analyticsQuality.summary.missingRequiredMetadata} required metadata field${analyticsQuality.summary.missingRequiredMetadata === 1 ? " is" : "s are"} missing.` : analyticsQuality.summary.events ? "Captured events include required metadata." : "No events are available to inspect yet.",
          "/dashboard/analytics",
          "Review event health",
        ),
        check(
          "analytics-event-sequence",
          "Event sequence integrity",
          "A healthy shopper journey should flow from widget view to start, results, recommendations and buy click.",
          analyticsQuality.summary.sequenceIssues ? "warn" : analyticsQuality.summary.events ? "pass" : "warn",
          analyticsQuality.summary.sequenceIssues ? `${analyticsQuality.summary.sequenceIssues} sequence issue${analyticsQuality.summary.sequenceIssues === 1 ? "" : "s"} detected.` : analyticsQuality.summary.events ? "Captured sessions follow the expected event order." : "Run one storefront QA journey to prove event order.",
          "/dashboard/launch",
          "Run QA runbook",
        ),
        check(
          "analytics-product-attribution",
          "Product attribution",
          "Recommendation and buy-click events should connect back to catalog products.",
          analyticsQuality.summary.productEventsWithoutProduct ? "fail" : analyticsQuality.summary.orphanProductEvents ? "warn" : analyticsQuality.summary.events ? "pass" : "warn",
          analyticsQuality.summary.productEventsWithoutProduct ? `${analyticsQuality.summary.productEventsWithoutProduct} product event${analyticsQuality.summary.productEventsWithoutProduct === 1 ? "" : "s"} lack product identity.` : analyticsQuality.summary.orphanProductEvents ? `${analyticsQuality.summary.orphanProductEvents} product event${analyticsQuality.summary.orphanProductEvents === 1 ? "" : "s"} appeared out of sequence.` : analyticsQuality.summary.events ? "Product events are attributable to catalog items." : "No product recommendation or click events captured yet.",
          "/dashboard/products",
          "Review products",
        ),
        check(
          "analytics-contract-coverage",
          "Five-event contract coverage",
          "Preflight should see widget_view, quiz_start, quiz_complete, product_recommended and buy_click before launch.",
          analyticsQuality.missingEventTypes.length ? "warn" : "pass",
          analyticsQuality.missingEventTypes.length ? `Missing event types: ${analyticsQuality.missingEventTypes.join(", ")}.` : "All five launch-contract event types have been captured.",
          "/dashboard/launch",
          "Generate test events",
        ),
      ],
    },
  ].map((section) => ({ ...section, status: worstStatus(section.checks) }));

  const checks = sections.flatMap((section) => section.checks);
  const overall = worstStatus(checks);
  const launchReport = buildLaunchReadinessReport(sections);

  return {
    mode,
    generated_at: new Date().toISOString(),
    origin,
    app_url: appUrl,
    overall,
    summary: {
      products: products.length,
      active_products: activeProducts.length,
      catalog_intelligence_score: catalogIntelligence.score,
      catalog_intelligence_blockers: catalogIntelligence.blockers.length,
      catalog_intelligence_warnings: catalogIntelligence.warnings.length,
      shopper_language_score: shopperLanguage.score,
      shopper_language_covered_terms: shopperLanguage.summary.coveredTerms,
      shopper_language_thin_terms: shopperLanguage.summary.thinTerms,
      shopper_language_missing_terms: shopperLanguage.summary.missingTerms,
      shopper_language_missing_observed_terms: shopperLanguage.summary.missingObservedTerms,
      shopper_language_products_needing_copy: shopperLanguage.summary.productsNeedingLanguage,
      published_finders: publishedFinders.length,
      ready_finders: readyFinders.length,
      published_configurators: publishedConfigurators.length,
      ready_configurators: readyConfigurators.length,
      finder_readiness_blockers: blockedPublishedFinders.length,
      finder_readiness_warnings: finderWarnings.length,
      configurator_readiness_blockers: blockedPublishedConfigurators.length,
      configurator_readiness_warnings: configuratorWarnings.length,
      configurator_qa_score: configuratorQa.score,
      configurator_qa_scenarios: configuratorQa.summary.scenariosChecked,
      configurator_qa_blockers: configuratorQa.blockers.length,
      configurator_qa_warnings: configuratorQa.warnings.length + (!configuratorQa.summary.compatibilityGuardrails && configuratorQa.summary.completionScenarios > 1 ? 1 : 0),
      configurator_qa_guardrails: configuratorQa.summary.compatibilityGuardrails,
      configurator_qa_product_link_rate: configuratorQa.summary.productLinkedScenarioRate,
      recommendation_qa_score: recommendationQa.score,
      recommendation_qa_scenarios: recommendationQa.summary.scenariosChecked,
      recommendation_qa_blockers: recommendationQa.blockers.length,
      recommendation_qa_warnings: recommendationQa.warnings.length,
      explanation_grounding_score: explanationGrounding.score,
      explanation_grounding_audits: explanationGrounding.summary.auditedRecommendations,
      explanation_grounding_blockers: explanationGrounding.summary.blockers,
      explanation_grounding_warnings: explanationGrounding.summary.warnings,
      analytics_events: events.length,
      analytics_quality_score: analyticsQuality.score,
      analytics_quality_issues: analyticsQuality.summary.missingRequiredMetadata + analyticsQuality.summary.sequenceIssues + analyticsQuality.summary.productEventsWithoutProduct,
      analytics_missing_event_types: analyticsQuality.missingEventTypes.length,
      attribution_events: attributionEvents,
      attribution_rate: attribution.summary.attributionRate,
      attribution_sources: attribution.summary.sources,
      attribution_placements: attribution.summary.placements,
      sessions,
      session_events: sessionEvents,
      intent_events: intentEvents,
    },
    launch_report: launchReport,
    sections,
  };
}

export async function GET(request: Request) {
  const identity = await getWorkspaceIdentity();
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const origin = new URL(request.url).origin;

  if (identity.mode === "demo") {
    return NextResponse.json(buildPreflight({
      products: demoProducts,
      quizzes: [demoQuiz],
      configurators: [demoConfigurator],
      events: demoEvents,
      settings: demoSettings,
      mode: "demo",
      origin,
    }));
  }

  const [productsResult, quizzesResult, configuratorsResult, eventsResult, settingsResult] = await Promise.all([
    identity.supabase.from("products").select("*"),
    identity.supabase.from("quizzes").select("*, questions(*, answer_options(*))"),
    identity.supabase.from("configurators").select("*, steps:configurator_steps(*, options:configurator_options(*))"),
    identity.supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(2000),
    identity.supabase.from("widget_settings").select("*").maybeSingle(),
  ]);

  const error = productsResult.error || quizzesResult.error || configuratorsResult.error || eventsResult.error || settingsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const quizzes = ((quizzesResult.data || []) as unknown as QuizRow[]).map((quiz) => ({
    ...quiz,
    recommendation_overrides: quiz.recommendation_overrides || [],
    questions: (quiz.questions || []).map((question) => ({ ...question, options: question.options || question.answer_options || [] })),
  }));
  const configurators = ((configuratorsResult.data || []) as unknown as Configurator[]).map((configurator) => ({
    ...configurator,
    steps: configurator.steps || [],
  }));

  return NextResponse.json(buildPreflight({
    products: (productsResult.data || []) as Product[],
    quizzes,
    configurators,
    events: (eventsResult.data || []) as AnalyticsEvent[],
    settings: (settingsResult.data as WidgetSettings | null) || demoSettings,
    mode: "supabase",
    origin,
  }));
}
