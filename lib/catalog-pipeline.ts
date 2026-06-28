import { analyzeCatalogIntelligence } from "./catalog-intelligence";
import { buildZeroPartyInsights } from "./insights";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export type CatalogPipelineStatus = "empty" | "blocked" | "needs-enrichment" | "ready";
export type CatalogPipelineStageStatus = "pass" | "warn" | "fail";
export type CatalogPipelineActionPriority = "critical" | "high" | "medium" | "low";

export type CatalogPipelineStage = {
  id: string;
  label: string;
  status: CatalogPipelineStageStatus;
  score: number;
  detail: string;
  evidence: string;
  href: string;
  actionLabel: string;
};

export type CatalogPipelineSource = {
  id: string;
  label: string;
  status: CatalogPipelineStageStatus;
  count: number;
  detail: string;
  contract: string[];
};

export type CatalogFieldCoverage = {
  id: string;
  label: string;
  coverage: number;
  filled: number;
  total: number;
  status: CatalogPipelineStageStatus;
  detail: string;
};

export type CatalogPipelineAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: CatalogPipelineActionPriority;
  href: string;
  label: string;
};

export type CatalogPipelineReport = {
  status: CatalogPipelineStatus;
  score: number;
  headline: string;
  summary: {
    products: number;
    activeProducts: number;
    discoveryReadyProducts: number;
    enrichedProducts: number;
    categories: number;
    duplicateGroups: number;
    downstreamExperiences: number;
    productsWithDemand: number;
    fieldCoverageAverage: number;
  };
  stages: CatalogPipelineStage[];
  sources: CatalogPipelineSource[];
  fieldCoverage: CatalogFieldCoverage[];
  actions: CatalogPipelineAction[];
  consumers: Array<{ label: string; count: number; detail: string; status: CatalogPipelineStageStatus; href: string }>;
  packet: string;
};

type FieldCoverageInput = {
  id: string;
  label: string;
  detail: string;
  predicate: (product: Product) => boolean;
};

const csvContracts = [
  "Required headers: name, price, category",
  "Supported aliases include title, sale price, collection, image, benefits, semantic text and link",
  "features, tags and buyer_needs accept pipe, comma or semicolon-separated values",
  "active=false keeps products in the catalog but out of recommendations",
];

function percentage(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function stageStatus(score: number, failBelow = 35, passAt = 80): CatalogPipelineStageStatus {
  if (score >= passAt) return "pass";
  if (score <= failBelow) return "fail";
  return "warn";
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

function hasSignals(product: Product) {
  return Boolean(product.category.trim() && (product.tags.length || product.features.length || product.buyer_needs?.length));
}

function hasEnrichment(product: Product) {
  return Boolean(product.enrichment_status === "enriched" || product.buyer_needs?.length || product.search_text?.trim());
}

function duplicateGroups(products: Product[]) {
  const map = new Map<string, Product[]>();
  for (const product of products) {
    const key = `${product.name.trim().toLowerCase()}::${product.category.trim().toLowerCase()}`;
    if (!product.name.trim() || !product.category.trim()) continue;
    map.set(key, [...(map.get(key) || []), product]);
  }
  return [...map.values()].filter((group) => group.length > 1);
}

function fieldCoverageRow(products: Product[], input: FieldCoverageInput): CatalogFieldCoverage {
  const filled = products.filter(input.predicate).length;
  const coverage = percentage(filled, products.length);
  return {
    id: input.id,
    label: input.label,
    coverage,
    filled,
    total: products.length,
    status: stageStatus(coverage, 0, input.id === "search-text" ? 90 : 80),
    detail: input.detail,
  };
}

function downstreamConsumers(quizzes: Quiz[], configurators: Configurator[], products: Product[]) {
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const finderRules = quizzes.reduce((sum, quiz) => sum + quiz.questions.reduce((questionSum, question) => questionSum + question.options.filter((option) => option.match_type !== "none").length, 0), 0);
  const productLinkedOptions = configurators.reduce((sum, configurator) => sum + configurator.steps.reduce((stepSum, step) => stepSum + step.options.filter((option) => option.product_id).length, 0), 0);
  const active = products.filter((product) => product.active).length;
  return [
    {
      label: "Product finders",
      count: publishedFinders.length,
      detail: `${quizzes.length} finder${quizzes.length === 1 ? "" : "s"} with ${finderRules} deterministic answer rule${finderRules === 1 ? "" : "s"}.`,
      status: publishedFinders.length ? "pass" as const : quizzes.length ? "warn" as const : "fail" as const,
      href: "/dashboard/quizzes",
    },
    {
      label: "Advisor and search",
      count: active,
      detail: `${active} active product${active === 1 ? "" : "s"} available for semantic search and conversational discovery.`,
      status: active >= 2 ? "pass" as const : active ? "warn" as const : "fail" as const,
      href: "/dashboard/search",
    },
    {
      label: "Configurators",
      count: publishedConfigurators.length,
      detail: `${configurators.length} configurator${configurators.length === 1 ? "" : "s"} with ${productLinkedOptions} product-linked option${productLinkedOptions === 1 ? "" : "s"}.`,
      status: publishedConfigurators.length ? "pass" as const : configurators.length ? "warn" as const : "warn" as const,
      href: "/dashboard/configurators",
    },
  ];
}

function buildSources(products: Product[], quizzes: Quiz[], configurators: Configurator[]): CatalogPipelineSource[] {
  const active = activeProducts(products);
  const enriched = active.filter(hasEnrichment);
  const semantic = active.filter((product) => product.search_text?.trim());
  const commerce = active.filter((product) => product.image_url.trim() && product.product_url.trim());
  const publishedExperiences = quizzes.filter((quiz) => quiz.published).length + configurators.filter((configurator) => configurator.published).length;
  return [
    {
      id: "manual-products",
      label: "Manual product manager",
      status: products.length ? "pass" : "fail",
      count: products.length,
      detail: "Products can be created, edited, hidden and deleted directly in the dashboard.",
      contract: ["name, price and category are required", "active=false excludes products from recommendation runtime", "features, tags and buyer needs feed deterministic matching"],
    },
    {
      id: "csv-import",
      label: "CSV import contract",
      status: products.length ? "pass" : "warn",
      count: products.length,
      detail: "CSV upload supports aliases, validation, warnings and import previews before rows enter the catalog.",
      contract: csvContracts,
    },
    {
      id: "ai-enrichment",
      label: "AI enrichment layer",
      status: enriched.length ? stageStatus(percentage(enriched.length, active.length), 0, 80) : "warn",
      count: enriched.length,
      detail: "Enrichment normalizes categories, adds buyer needs, tags, features and semantic text with deterministic fallback.",
      contract: ["OpenAI improves quality when configured", "local rules fallback keeps the workflow available", "AI enriches facts but does not select products"],
    },
    {
      id: "semantic-index",
      label: "Semantic discovery text",
      status: semantic.length ? stageStatus(percentage(semantic.length, active.length), 0, 80) : "warn",
      count: semantic.length,
      detail: "Semantic text and optional embeddings power advisor/search candidate retrieval before deterministic ranking.",
      contract: ["search_text should contain shopper outcomes and synonyms", "pgvector is used when Supabase embeddings exist", "deterministic ranking remains the final selector"],
    },
    {
      id: "commerce-assets",
      label: "Commerce assets",
      status: commerce.length ? stageStatus(percentage(commerce.length, active.length), 0, 80) : "warn",
      count: commerce.length,
      detail: "Product images and URLs make recommendation cards credible and buy-click tracking useful.",
      contract: ["image_url improves result cards", "product_url powers Buy Now buttons", "missing assets are launch warnings, not AI problems"],
    },
    {
      id: "downstream-consumers",
      label: "Downstream consumers",
      status: publishedExperiences ? "pass" : "warn",
      count: publishedExperiences,
      detail: "Published finders, configurators, advisor and search consume the same catalog truth layer.",
      contract: ["finder rules map to catalog signals", "configurator options can link to products", "public runtimes load catalog server-side"],
    },
  ];
}

function buildStages({
  products,
  quizzes,
  configurators,
  events,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
}): CatalogPipelineStage[] {
  const intelligence = analyzeCatalogIntelligence(products);
  const active = activeProducts(products);
  const duplicates = duplicateGroups(products);
  const consumers = downstreamConsumers(quizzes, configurators, products);
  const insights = buildZeroPartyInsights(events, products);
  const downstreamScore = percentage(consumers.filter((consumer) => consumer.status === "pass").length, consumers.length);
  const telemetryScore = events.length ? Math.min(100, insights.summary.productsWithDemand * 25 + Math.min(50, events.length)) : 20;
  const duplicatePenalty = duplicates.length ? 20 : 0;
  const normalizedScore = Math.max(0, Math.min(100, Math.round((intelligence.coverage.descriptions + intelligence.coverage.matchingSignals + intelligence.coverage.images + intelligence.coverage.productUrls) / 4 - duplicatePenalty)));

  return [
    {
      id: "import-contract",
      label: "Catalog import contract",
      status: products.length ? "pass" : "fail",
      score: products.length ? 100 : 0,
      detail: "The catalog has a concrete ingestion path through manual CRUD and CSV upload.",
      evidence: products.length ? `${products.length} product${products.length === 1 ? "" : "s"} currently stored.` : "No products have been added yet.",
      href: "/dashboard/products",
      actionLabel: "Manage products",
    },
    {
      id: "normalization",
      label: "Normalization and taxonomy",
      status: stageStatus(normalizedScore),
      score: normalizedScore,
      detail: "Product names, categories, descriptions, tags and commerce assets should be consistent enough for buyer-facing experiences.",
      evidence: `${intelligence.categoryCount} categor${intelligence.categoryCount === 1 ? "y" : "ies"} · ${duplicates.length} duplicate name/category group${duplicates.length === 1 ? "" : "s"}.`,
      href: "/dashboard/attributes",
      actionLabel: "Normalize attributes",
    },
    {
      id: "enrichment",
      label: "AI enrichment coverage",
      status: stageStatus(intelligence.coverage.enrichment, 0, 80),
      score: intelligence.coverage.enrichment,
      detail: "Buyer needs and semantic text help quizzes, advisor, search and AI explanations speak shopper language.",
      evidence: `${intelligence.enrichedProducts}/${active.length || 0} active product${active.length === 1 ? "" : "s"} enriched or discovery-ready.`,
      href: "/dashboard/products",
      actionLabel: "Run enrichment",
    },
    {
      id: "semantic-readiness",
      label: "Semantic discovery readiness",
      status: stageStatus(intelligence.coverage.searchText, 0, 90),
      score: intelligence.coverage.searchText,
      detail: "Search and conversational advisor need enough semantic text to map shopper intent to catalog facts.",
      evidence: `${intelligence.coverage.searchText}% semantic-search coverage across active products.`,
      href: "/dashboard/search",
      actionLabel: "Test search",
    },
    {
      id: "consumer-sync",
      label: "Downstream consumer sync",
      status: stageStatus(downstreamScore, 0, 67),
      score: downstreamScore,
      detail: "Published finders, configurators and semantic services should all be able to consume the current catalog.",
      evidence: `${consumers.filter((consumer) => consumer.status === "pass").length}/${consumers.length} downstream consumer group${consumers.length === 1 ? "" : "s"} are ready.`,
      href: "/dashboard/experiences",
      actionLabel: "Review registry",
    },
    {
      id: "telemetry-feedback",
      label: "Telemetry feedback loop",
      status: stageStatus(telemetryScore, 20, 70),
      score: telemetryScore,
      detail: "Recommendation and buy-click events prove which products and terms are actually being discovered.",
      evidence: `${events.length} analytics event${events.length === 1 ? "" : "s"} · ${insights.summary.productsWithDemand} product${insights.summary.productsWithDemand === 1 ? "" : "s"} with demand.`,
      href: "/dashboard/analytics",
      actionLabel: "Review analytics",
    },
  ];
}

function buildFieldCoverage(products: Product[]): CatalogFieldCoverage[] {
  const active = activeProducts(products);
  const inputs: FieldCoverageInput[] = [
    { id: "name", label: "Product names", detail: "Names anchor all recommendation cards and packets.", predicate: (product) => Boolean(product.name.trim()) },
    { id: "price", label: "Prices", detail: "Prices power budgets, bundle totals and value framing.", predicate: (product) => Number.isFinite(product.price) && product.price >= 0 },
    { id: "category", label: "Categories", detail: "Categories support rules, ontology groups and merchandising lanes.", predicate: (product) => Boolean(product.category.trim()) },
    { id: "description", label: "Descriptions", detail: "Descriptions support AI/fallback explanations and semantic matching.", predicate: (product) => Boolean(product.description.trim()) },
    { id: "signals", label: "Tags/features/needs", detail: "Matching signals power deterministic recommendations.", predicate: hasSignals },
    { id: "buyer-needs", label: "Buyer needs", detail: "Outcome language helps shoppers and AI explanations stay grounded.", predicate: (product) => Boolean(product.buyer_needs?.length) },
    { id: "search-text", label: "Semantic text", detail: "Search/advisor quality improves when products include shopper-language text.", predicate: (product) => Boolean(product.search_text?.trim()) },
    { id: "commerce-assets", label: "Images and URLs", detail: "Images and product URLs improve trust and buy-click telemetry.", predicate: (product) => Boolean(product.image_url.trim() && product.product_url.trim()) },
  ];
  return inputs.map((input) => fieldCoverageRow(active, input));
}

function actionPriority(status: CatalogPipelineStageStatus): CatalogPipelineActionPriority {
  if (status === "fail") return "critical";
  if (status === "warn") return "high";
  return "low";
}

function buildActions(stages: CatalogPipelineStage[], fieldCoverage: CatalogFieldCoverage[], products: Product[], events: AnalyticsEvent[]): CatalogPipelineAction[] {
  const actions: CatalogPipelineAction[] = [];
  const failingStages = stages.filter((stage) => stage.status !== "pass");
  const weakestField = fieldCoverage.slice().sort((a, b) => a.coverage - b.coverage || a.label.localeCompare(b.label))[0];
  const duplicates = duplicateGroups(products);
  const inactiveProductIds = new Set(products.filter((product) => !product.active).map((product) => product.id));
  const inactiveDemandEvents = events.filter((event) => event.product_id && inactiveProductIds.has(event.product_id) && (event.event_type === "product_recommended" || event.event_type === "buy_click"));

  for (const stage of failingStages.slice(0, 3)) {
    actions.push({
      id: `fix-${stage.id}`,
      title: stage.status === "fail" ? `Fix ${stage.label.toLowerCase()}` : `Improve ${stage.label.toLowerCase()}`,
      detail: stage.detail,
      evidence: stage.evidence,
      priority: actionPriority(stage.status),
      href: stage.href,
      label: stage.actionLabel,
    });
  }

  if (weakestField && weakestField.status !== "pass") {
    actions.push({
      id: `improve-field-${weakestField.id}`,
      title: `Improve ${weakestField.label.toLowerCase()}`,
      detail: weakestField.detail,
      evidence: `${weakestField.filled}/${weakestField.total} active products have this field ready.`,
      priority: weakestField.status === "fail" ? "high" : "medium",
      href: weakestField.id === "buyer-needs" || weakestField.id === "search-text" ? "/dashboard/products" : "/dashboard/attributes",
      label: weakestField.id === "buyer-needs" || weakestField.id === "search-text" ? "Enrich products" : "Clean attributes",
    });
  }

  if (duplicates.length) {
    actions.push({
      id: "dedupe-products",
      title: "Review duplicate product rows",
      detail: "Duplicate name/category groups can confuse rule coverage, analytics demand and merchant handoffs.",
      evidence: `${duplicates.length} duplicate group${duplicates.length === 1 ? "" : "s"} detected.`,
      priority: "high",
      href: "/dashboard/products",
      label: "Review catalog",
    });
  }

  if (inactiveDemandEvents.length) {
    actions.push({
      id: "inactive-demand-products",
      title: "Resolve demand for inactive products",
      detail: "Inactive products should not keep receiving recommendation or buy-click events after catalog cleanup.",
      evidence: `${inactiveDemandEvents.length} event${inactiveDemandEvents.length === 1 ? "" : "s"} reference inactive products.`,
      priority: "critical",
      href: "/dashboard/analytics",
      label: "Review events",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "catalog-pipeline-ready",
      title: "Catalog pipeline is ready for launch workflows",
      detail: "Import, enrichment, semantic readiness, downstream consumers and telemetry feedback are in good shape.",
      evidence: `${products.length} product${products.length === 1 ? "" : "s"} are governed by the pipeline.`,
      priority: "low",
      href: "/dashboard/launch",
      label: "Open Launch Studio",
    });
  }

  const rank: Record<CatalogPipelineActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function buildPacket(report: Omit<CatalogPipelineReport, "packet">) {
  return [
    "Sellentum catalog pipeline packet",
    "==============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Pipeline stages",
    ...report.stages.map((stage) => `- [${stage.status.toUpperCase()}] ${stage.label} (${stage.score}%): ${stage.evidence}`),
    "",
    "Source contracts",
    ...report.sources.map((source) => `- ${source.label}: ${source.detail} Contract: ${source.contract.join("; ")}`),
    "",
    "Field coverage",
    ...report.fieldCoverage.map((field) => `- ${field.label}: ${field.coverage}% (${field.filled}/${field.total})`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildCatalogPipelineReport({
  products,
  quizzes,
  configurators,
  events,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
}): CatalogPipelineReport {
  const intelligence = analyzeCatalogIntelligence(products);
  const insights = buildZeroPartyInsights(events, products);
  const active = activeProducts(products);
  const stages = buildStages({ products, quizzes, configurators, events });
  const sources = buildSources(products, quizzes, configurators);
  const fieldCoverage = buildFieldCoverage(products);
  const consumers = downstreamConsumers(quizzes, configurators, products);
  const duplicateCount = duplicateGroups(products).length;
  const fieldCoverageAverage = fieldCoverage.length ? Math.round(fieldCoverage.reduce((sum, item) => sum + item.coverage, 0) / fieldCoverage.length) : 0;
  const stageAverage = stages.length ? Math.round(stages.reduce((sum, stage) => sum + stage.score, 0) / stages.length) : 0;
  const score = Math.max(0, Math.min(100, Math.round(stageAverage * 0.58 + intelligence.score * 0.27 + fieldCoverageAverage * 0.15 - duplicateCount * 4)));
  const status: CatalogPipelineStatus = !products.length
    ? "empty"
    : stages.some((stage) => stage.status === "fail") || intelligence.blockers.length
      ? "blocked"
      : stages.some((stage) => stage.status === "warn") || intelligence.warnings.length
        ? "needs-enrichment"
        : "ready";
  const summary = {
    products: products.length,
    activeProducts: active.length,
    discoveryReadyProducts: intelligence.discoveryReadyProducts,
    enrichedProducts: intelligence.enrichedProducts,
    categories: intelligence.categoryCount,
    duplicateGroups: duplicateCount,
    downstreamExperiences: quizzes.filter((quiz) => quiz.published).length + configurators.filter((configurator) => configurator.published).length,
    productsWithDemand: insights.summary.productsWithDemand,
    fieldCoverageAverage,
  };
  const baseReport: Omit<CatalogPipelineReport, "packet"> = {
    status,
    score,
    headline: status === "ready"
      ? "Catalog pipeline is healthy enough to power live discovery experiences."
      : status === "needs-enrichment"
        ? "Catalog pipeline is usable, but enrichment and coverage improvements will make recommendations stronger."
        : status === "blocked"
          ? "Catalog pipeline has blockers before it can reliably power shopper discovery."
          : "Catalog pipeline is empty; import or add products to begin.",
    summary,
    stages,
    sources,
    fieldCoverage,
    actions: buildActions(stages, fieldCoverage, products, events),
    consumers,
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
