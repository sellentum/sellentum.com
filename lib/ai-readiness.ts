import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export type AiReadinessStatus = "ready" | "review" | "blocked";
export type AiReadinessCheckStatus = "pass" | "warn" | "fail";
export type AiReadinessArea = "environment" | "catalog" | "generation" | "explanations" | "semantic" | "runtime" | "governance";

export type AiSourceContract = {
  id: string;
  label: string;
  area: AiReadinessArea;
  status: AiReadinessCheckStatus;
  detail: string;
  evidence: string;
  href: string;
};

export type AiReadinessCheck = {
  id: string;
  area: AiReadinessArea;
  label: string;
  status: AiReadinessCheckStatus;
  detail: string;
  evidence: string;
  href: string;
};

export type AiSurfaceReadiness = {
  id: string;
  label: string;
  route: string;
  status: AiReadinessCheckStatus;
  mode: "openai-ready" | "fallback-ready" | "contract-missing";
  detail: string;
  boundary: string;
};

export type AiReadinessAction = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
};

export type AiReadinessReport = {
  status: AiReadinessStatus;
  score: number;
  headline: string;
  generatedAt: string;
  source: "client-store" | "server-api";
  mode: "demo" | "supabase";
  openai: {
    configured: boolean;
    model: string;
    embeddingsModel: string;
    liveCheck: "not-run" | "not-configured";
  };
  summary: {
    aiSurfaces: number;
    fallbackSurfaces: number;
    groundedContracts: number;
    deterministicContracts: number;
    enrichedProducts: number;
    activeProducts: number;
    passingChecks: number;
    warningChecks: number;
    failingChecks: number;
  };
  surfaces: AiSurfaceReadiness[];
  checks: AiReadinessCheck[];
  sourceContracts: AiSourceContract[];
  actions: AiReadinessAction[];
  packet: string;
};

export type AiReadinessSourceAudit = {
  catalogRouteAuthenticated?: boolean;
  catalogFallback?: boolean;
  catalogEmbeddings?: boolean;
  quizRouteAuthenticated?: boolean;
  quizFallback?: boolean;
  configuratorRouteAuthenticated?: boolean;
  configuratorFallback?: boolean;
  recommendationFallback?: boolean;
  recommendationPromptGrounded?: boolean;
  searchFallback?: boolean;
  searchPromptDeterministic?: boolean;
  finderSelectionDeterministic?: boolean;
  semanticCandidates?: boolean;
  pgvectorSchema?: boolean;
  explanationRateLimited?: boolean;
  publicRuntimeGuardrails?: boolean;
};

function statusScore(status: AiReadinessCheckStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 58;
  return 0;
}

function boolStatus(value?: boolean, warning = false): AiReadinessCheckStatus {
  if (value) return "pass";
  return warning ? "warn" : "fail";
}

function check(id: string, area: AiReadinessArea, label: string, status: AiReadinessCheckStatus, detail: string, evidence: string, href: string): AiReadinessCheck {
  return { id, area, label, status, detail, evidence, href };
}

function contract(id: string, label: string, area: AiReadinessArea, status: AiReadinessCheckStatus, detail: string, evidence: string, href: string): AiSourceContract {
  return { id, label, area, status, detail, evidence, href };
}

function priority(status: AiReadinessCheckStatus, index: number): AiReadinessAction["priority"] {
  if (status === "fail") return index < 2 ? "critical" : "high";
  if (status === "warn") return "medium";
  return "low";
}

function hasDiscoveryLanguage(product: Product) {
  return product.enrichment_status === "enriched" || Boolean(product.search_text?.trim()) || Boolean(product.buyer_needs?.length);
}

function productHasEmbedding(product: Product) {
  const maybeEmbedding = (product as Product & { embedding?: unknown }).embedding;
  return Array.isArray(maybeEmbedding) && maybeEmbedding.length > 0;
}

function surfacedEventTypes(events: AnalyticsEvent[]) {
  return new Set(events.map((event) => event.event_type));
}

function surfaceStatus(required: boolean[], openaiConfigured: boolean): AiReadinessCheckStatus {
  if (required.every(Boolean) && openaiConfigured) return "pass";
  if (required.every(Boolean)) return "warn";
  return "fail";
}

function surfaceMode(status: AiReadinessCheckStatus, openaiConfigured: boolean): AiSurfaceReadiness["mode"] {
  if (status === "fail") return "contract-missing";
  if (openaiConfigured) return "openai-ready";
  return "fallback-ready";
}

function buildSurfaces(audit: AiReadinessSourceAudit, openaiConfigured: boolean): AiSurfaceReadiness[] {
  const definitions = [
    {
      id: "catalog-enrichment",
      label: "Catalog enrichment",
      route: "/api/catalog/enrich",
      required: [audit.catalogRouteAuthenticated, audit.catalogFallback, audit.catalogEmbeddings],
      detail: "Normalizes categories, features, tags, buyer needs, semantic search text and optional embeddings.",
      boundary: "AI enriches catalog facts; products remain merchant-owned records.",
    },
    {
      id: "quiz-generation",
      label: "Guided finder generation",
      route: "/api/quizzes/generate",
      required: [audit.quizRouteAuthenticated, audit.quizFallback],
      detail: "Generates editable guided-selling questions from ontology and product evidence.",
      boundary: "Generated answers must map back to deterministic tag/category/feature/budget rules.",
    },
    {
      id: "configurator-generation",
      label: "Configurator generation",
      route: "/api/configurators/generate",
      required: [audit.configuratorRouteAuthenticated, audit.configuratorFallback],
      detail: "Turns active products into editable bundle/configurator blueprints.",
      boundary: "Product IDs and compatibility rules are validated before accepting OpenAI output.",
    },
    {
      id: "finder-explanations",
      label: "Finder result explanations",
      route: "/api/explain + /api/public/finder/[id]",
      required: [audit.recommendationFallback, audit.recommendationPromptGrounded, audit.finderSelectionDeterministic],
      detail: "Writes short explanations after deterministic recommendations are selected.",
      boundary: "Rules, budgets, buyer profile and merchandising controls select products first.",
    },
    {
      id: "semantic-search-explanations",
      label: "Semantic search explanations",
      route: "/search/[id] + /api/public/search/[id]",
      required: [audit.searchFallback, audit.searchPromptDeterministic],
      detail: "Adds grounded copy to already-ranked semantic search results.",
      boundary: "Search ranking is deterministic and budget-aware before AI text generation.",
    },
    {
      id: "pgvector-candidates",
      label: "Embedding candidate retrieval",
      route: "public.match_products + semantic candidates",
      required: [audit.semanticCandidates, audit.pgvectorSchema],
      detail: "Uses OpenAI embeddings and pgvector to retrieve candidates before deterministic ranking.",
      boundary: "Vector similarity can add candidate signals, but final ranking still uses Sellentum scoring.",
    },
  ];

  return definitions.map((item) => {
    const status = surfaceStatus(item.required.map(Boolean), openaiConfigured);
    return {
      id: item.id,
      label: item.label,
      route: item.route,
      status,
      mode: surfaceMode(status, openaiConfigured),
      detail: item.detail,
      boundary: item.boundary,
    };
  });
}

function buildContracts(audit: AiReadinessSourceAudit): AiSourceContract[] {
  return [
    contract("catalog-auth", "Catalog enrichment auth", "catalog", boolStatus(audit.catalogRouteAuthenticated), "Catalog enrichment must require a signed-in workspace.", "Looks for getWorkspaceIdentity in app/api/catalog/enrich.", "/dashboard/products"),
    contract("catalog-fallback", "Catalog enrichment fallback", "catalog", boolStatus(audit.catalogFallback), "Catalog enrichment needs deterministic keyword and buyer-need fallback when OpenAI is absent.", "Looks for fallbackEnrich in the enrichment route.", "/dashboard/catalog-pipeline"),
    contract("catalog-embeddings", "Embedding generation", "semantic", boolStatus(audit.catalogEmbeddings, true), "Semantic candidate retrieval needs 1536-dimension product embeddings.", "Looks for text-embedding-3-small and dimensions: 1536.", "/dashboard/catalog-pipeline"),
    contract("quiz-auth", "Quiz generation auth", "generation", boolStatus(audit.quizRouteAuthenticated), "AI quiz generation should only run inside an authenticated workspace.", "Looks for getWorkspaceIdentity in app/api/quizzes/generate.", "/dashboard/launch"),
    contract("quiz-fallback", "Ontology quiz fallback", "generation", boolStatus(audit.quizFallback), "Quiz drafts should be generatable from catalog ontology without an API key.", "Looks for buildOntologyQuizSuggestion.", "/dashboard/launch"),
    contract("configurator-auth", "Configurator generation auth", "generation", boolStatus(audit.configuratorRouteAuthenticated), "AI configurator drafts should only run inside an authenticated workspace.", "Looks for getWorkspaceIdentity in app/api/configurators/generate.", "/dashboard/configurators"),
    contract("configurator-fallback", "Configurator blueprint fallback", "generation", boolStatus(audit.configuratorFallback), "Configurator drafts need deterministic product-linked fallback blueprints.", "Looks for buildConfiguratorBlueprint.", "/dashboard/configurators"),
    contract("recommendation-fallback", "Recommendation explanation fallback", "explanations", boolStatus(audit.recommendationFallback), "Finder explanations should degrade to deterministic copy when OpenAI fails.", "Looks for fallbackRecommendationExplanation.", "/dashboard/trust-center"),
    contract("grounded-prompt", "Grounded recommendation prompt", "explanations", boolStatus(audit.recommendationPromptGrounded), "Recommendation prompts must instruct AI to use only supplied facts.", "Looks for the supplied-facts prompt contract.", "/dashboard/grounding"),
    contract("search-prompt", "Deterministic search explanation prompt", "explanations", boolStatus(audit.searchPromptDeterministic), "Search explanation prompts must state products were already selected deterministically.", "Looks for the deterministic search prompt boundary.", "/dashboard/search"),
    contract("finder-boundary", "Finder selection boundary", "runtime", boolStatus(audit.finderSelectionDeterministic), "Finder product selection must happen before AI explanations.", "Looks for auditProductMatches before explainRecommendation.", "/dashboard/lab"),
    contract("semantic-candidates", "Semantic candidate helper", "semantic", boolStatus(audit.semanticCandidates, true), "Supabase catalogs should be able to use pgvector candidates when OpenAI embeddings exist.", "Looks for getSemanticProductCandidates and match_products.", "/dashboard/search"),
    contract("pgvector-schema", "Pgvector schema contract", "semantic", boolStatus(audit.pgvectorSchema, true), "The database must include vector(1536) embeddings and a service-role match_products RPC.", "Looks for vector schema and match_products RPC.", "/dashboard/data-contract"),
    contract("explain-rate-limit", "Explanation API rate limit", "runtime", boolStatus(audit.explanationRateLimited), "Public explanation requests must be bounded to protect OpenAI usage.", "Looks for publicRateLimit in app/api/explain.", "/dashboard/operations"),
    contract("public-guardrails", "Public runtime guardrails", "runtime", boolStatus(audit.publicRuntimeGuardrails), "Embedded runtime APIs need bounded JSON bodies and shared rate-limit responses.", "Looks for readBoundedJson and publicRateLimit.", "/dashboard/operations"),
  ];
}

function buildPacket(report: Omit<AiReadinessReport, "packet">) {
  return [
    "Sellentum AI Readiness packet",
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    `Workspace mode: ${report.mode}`,
    `Status: ${report.status} (${report.score}%)`,
    `OpenAI: ${report.openai.configured ? "configured" : "not configured"} · Model: ${report.openai.model} · Embeddings: ${report.openai.embeddingsModel}`,
    "",
    "AI boundary:",
    "- OpenAI may enrich catalog data, draft editable flows and write explanations.",
    "- Deterministic rules, budget constraints, active-product checks and merchant controls select products first.",
    "- Every AI path has a deterministic fallback for demo/local operation.",
    "",
    "Surface readiness:",
    ...report.surfaces.map((surface) => `- [${surface.status.toUpperCase()}] ${surface.label}: ${surface.detail} Boundary: ${surface.boundary}`),
    "",
    "Source contracts:",
    ...report.sourceContracts.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.evidence}`),
    "",
    "Open actions:",
    ...(report.actions.length ? report.actions.map((item) => `- [${item.priority.toUpperCase()}] ${item.title}: ${item.detail}`) : ["- No AI readiness actions remain for this snapshot."]),
  ].join("\n");
}

export function buildAiReadinessReport({
  mode,
  source = "client-store",
  openaiConfigured = false,
  openaiModel = "gpt-4o-mini",
  embeddingsModel = "text-embedding-3-small",
  products,
  quizzes,
  configurators,
  events,
  sourceAudit = {},
}: {
  mode: "demo" | "supabase";
  source?: "client-store" | "server-api";
  openaiConfigured?: boolean;
  openaiModel?: string;
  embeddingsModel?: string;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  sourceAudit?: AiReadinessSourceAudit;
}): AiReadinessReport {
  const generatedAt = new Date().toISOString();
  const activeProducts = products.filter((product) => product.active);
  const enrichedProducts = activeProducts.filter(hasDiscoveryLanguage);
  const embeddedProducts = activeProducts.filter(productHasEmbedding);
  const publishedFinders = quizzes.filter((quiz) => quiz.published && quiz.questions.length);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published && configurator.steps.length);
  const eventTypes = surfacedEventTypes(events);
  const sourceContracts = buildContracts(sourceAudit);
  const surfaces = buildSurfaces(sourceAudit, openaiConfigured);
  const groundedContracts = sourceContracts.filter((item) => ["grounded-prompt", "search-prompt", "recommendation-fallback"].includes(item.id) && item.status === "pass").length;
  const deterministicContracts = sourceContracts.filter((item) => ["finder-boundary", "quiz-fallback", "configurator-fallback", "catalog-fallback"].includes(item.id) && item.status === "pass").length;

  const checks = [
    check("server-proof", "environment", "Authenticated AI readiness proof", source === "server-api" ? "pass" : "warn", source === "server-api" ? "AI readiness came from the authenticated server route." : "Using browser-store evidence until the server AI health route responds.", source, "/dashboard/ai-readiness"),
    check("openai-key", "environment", "OpenAI API key", openaiConfigured ? "pass" : "warn", openaiConfigured ? "OPENAI_API_KEY is present server-side." : "OPENAI_API_KEY is not configured; deterministic fallbacks will run, but production AI proof remains incomplete.", openaiConfigured ? "Configured without exposing the key." : "Missing server key.", "/dashboard/production"),
    check("openai-model", "environment", "OpenAI model default", openaiModel ? "pass" : "warn", `Chat/completion calls use ${openaiModel || "the default gpt-4o-mini model"}.`, "OPENAI_MODEL is optional and defaults safely.", "/dashboard/production"),
    check("catalog-ready", "catalog", "AI-ready catalog language", activeProducts.length && enrichedProducts.length / Math.max(1, activeProducts.length) >= 0.75 ? "pass" : enrichedProducts.length ? "warn" : "fail", `${enrichedProducts.length}/${activeProducts.length} active products include enrichment, buyer needs or semantic search text.`, "Needed for enrichment review, advisor, search and grounded explanations.", "/dashboard/catalog-pipeline"),
    check("embedding-readiness", "semantic", "Embedding and pgvector readiness", openaiConfigured && sourceAudit.pgvectorSchema && sourceAudit.catalogEmbeddings ? "pass" : sourceAudit.pgvectorSchema && sourceAudit.catalogEmbeddings ? "warn" : "fail", embeddedProducts.length ? `${embeddedProducts.length} active products expose embedding data in this snapshot.` : "Schema/source contracts support embeddings; run enrichment with OpenAI to populate vectors.", `${embeddingsModel} · vector(1536)`, "/dashboard/search"),
    check("generated-finders", "generation", "Generated finder workflow", publishedFinders.length && sourceAudit.quizFallback ? "pass" : sourceAudit.quizFallback ? "warn" : "fail", publishedFinders.length ? `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"} available for AI-assisted generation QA.` : "Publish a generated or manually-built finder before launch.", "AI drafts remain editable and rule-backed.", "/dashboard/launch"),
    check("generated-configurators", "generation", "Generated configurator workflow", publishedConfigurators.length && sourceAudit.configuratorFallback ? "pass" : sourceAudit.configuratorFallback ? "warn" : "warn", publishedConfigurators.length ? `${publishedConfigurators.length} published configurator${publishedConfigurators.length === 1 ? "" : "s"} available.` : "Configurator generation is available, but no published configurator is ready in this snapshot.", "AI output validates real product IDs before acceptance.", "/dashboard/configurators"),
    check("grounded-explanations", "explanations", "Grounded explanation contracts", groundedContracts >= 3 ? "pass" : groundedContracts ? "warn" : "fail", `${groundedContracts}/3 explanation contracts are proven from source.`, "Finder and search explanation prompts must use supplied facts only.", "/dashboard/grounding"),
    check("deterministic-boundary", "governance", "Deterministic product-selection boundary", deterministicContracts >= 4 ? "pass" : deterministicContracts >= 2 ? "warn" : "fail", `${deterministicContracts}/4 deterministic fallback/selection contracts are proven from source.`, "Rules select. AI explains.", "/dashboard/trust-center"),
    check("ai-route-safety", "runtime", "AI route auth and rate limits", sourceAudit.catalogRouteAuthenticated && sourceAudit.quizRouteAuthenticated && sourceAudit.configuratorRouteAuthenticated && sourceAudit.explanationRateLimited ? "pass" : "fail", "Catalog, quiz and configurator generation are authenticated; explanation requests are rate-limited.", "Server routes gate AI usage and public usage is bounded.", "/dashboard/operations"),
    check("runtime-telemetry", "runtime", "AI outcome telemetry", eventTypes.has("product_recommended") && eventTypes.has("buy_click") ? "pass" : eventTypes.has("product_recommended") ? "warn" : "fail", `${eventTypes.size} core analytics event type${eventTypes.size === 1 ? "" : "s"} observed.`, "AI readiness is stronger when recommendation and conversion outcomes are visible.", "/dashboard/analytics"),
  ];

  const failingChecks = checks.filter((item) => item.status === "fail");
  const warningChecks = checks.filter((item) => item.status === "warn");
  const checkScore = checks.reduce((sum, item) => sum + statusScore(item.status), 0) / Math.max(1, checks.length);
  const contractScore = sourceContracts.reduce((sum, item) => sum + statusScore(item.status), 0) / Math.max(1, sourceContracts.length);
  const score = Math.round(checkScore * 0.58 + contractScore * 0.42);
  const status: AiReadinessStatus = failingChecks.length ? "blocked" : warningChecks.length ? "review" : "ready";
  const actions = [...failingChecks, ...warningChecks].slice(0, 8).map((item, index) => ({
    id: `ai-action-${item.id}`,
    priority: priority(item.status, index),
    title: item.status === "fail" ? `Fix ${item.label}` : `Review ${item.label}`,
    detail: item.detail,
    href: item.href,
  }));
  const reportWithoutPacket = {
    status,
    score,
    headline: status === "ready" ? "AI services are configured, grounded and bounded by deterministic product selection." : status === "review" ? "AI services can run with fallbacks, but production OpenAI or telemetry proof still needs review." : "AI readiness has blocking source, catalog or route-safety gaps before production launch.",
    generatedAt,
    source,
    mode,
    openai: {
      configured: openaiConfigured,
      model: openaiModel || "gpt-4o-mini",
      embeddingsModel,
      liveCheck: openaiConfigured ? "not-run" as const : "not-configured" as const,
    },
    summary: {
      aiSurfaces: surfaces.length,
      fallbackSurfaces: surfaces.filter((surface) => surface.mode === "fallback-ready").length,
      groundedContracts,
      deterministicContracts,
      enrichedProducts: enrichedProducts.length,
      activeProducts: activeProducts.length,
      passingChecks: checks.filter((item) => item.status === "pass").length,
      warningChecks: warningChecks.length,
      failingChecks: failingChecks.length,
    },
    surfaces,
    checks,
    sourceContracts,
    actions,
  };
  return { ...reportWithoutPacket, packet: buildPacket(reportWithoutPacket) };
}
