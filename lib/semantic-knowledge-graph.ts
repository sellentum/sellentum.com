import { buildCatalogBenefitReport } from "./catalog-benefits";
import { buildCatalogOntology } from "./catalog-ontology";
import { buildCompatibilityMatrixReport } from "./compatibility-matrix";
import { buildDecisionGraph } from "./decision-graph";
import { buildGroundingCenterReport } from "./grounding-center";
import { buildVocabularyStudioReport } from "./vocabulary-studio";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export type SemanticGraphStatus = "ready" | "review" | "blocked";
export type SemanticGraphLayerStatus = "pass" | "warn" | "fail";
export type SemanticGraphActionPriority = "critical" | "high" | "medium" | "low";

export type SemanticGraphLayer = {
  id: "catalog" | "ontology" | "rules" | "vocabulary" | "benefits" | "grounding" | "compatibility";
  label: string;
  status: SemanticGraphLayerStatus;
  score: number;
  entities: number;
  edges: number;
  detail: string;
  evidence: string;
  href: string;
};

export type SemanticGraphEntity = {
  id: string;
  type: "product" | "category" | "signal" | "benefit" | "term" | "rule" | "configurator";
  label: string;
  detail: string;
  connections: number;
  status: SemanticGraphLayerStatus;
};

export type SemanticGraphWeakLink = {
  id: string;
  label: string;
  status: SemanticGraphLayerStatus;
  source: string;
  detail: string;
  action: string;
  href: string;
};

export type SemanticGraphAction = {
  id: string;
  priority: SemanticGraphActionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  label: string;
};

export type SemanticKnowledgeGraphReport = {
  status: SemanticGraphStatus;
  score: number;
  headline: string;
  summary: {
    products: number;
    entities: number;
    edges: number;
    layers: number;
    readyLayers: number;
    reviewLayers: number;
    blockedLayers: number;
    weakLinks: number;
  };
  layers: SemanticGraphLayer[];
  entities: SemanticGraphEntity[];
  weakLinks: SemanticGraphWeakLink[];
  actions: SemanticGraphAction[];
  packet: string;
};

function layerStatus(score: number): SemanticGraphLayerStatus {
  if (score >= 78) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

function reportStatus(layers: SemanticGraphLayer[]): SemanticGraphStatus {
  if (layers.some((layer) => layer.status === "fail")) return "blocked";
  if (layers.some((layer) => layer.status === "warn")) return "review";
  return "ready";
}

function priority(status: SemanticGraphLayerStatus): SemanticGraphActionPriority {
  if (status === "fail") return "critical";
  if (status === "warn") return "high";
  return "low";
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function productSignals(product: Product) {
  return unique([
    product.category,
    ...product.tags,
    ...product.features,
    ...(product.buyer_needs || []),
  ].filter(Boolean));
}

function buildEntities({
  products,
  ontology,
  benefits,
  vocabulary,
  decision,
  compatibility,
}: {
  products: Product[];
  ontology: ReturnType<typeof buildCatalogOntology>;
  benefits: ReturnType<typeof buildCatalogBenefitReport>;
  vocabulary: ReturnType<typeof buildVocabularyStudioReport>;
  decision: ReturnType<typeof buildDecisionGraph>;
  compatibility: ReturnType<typeof buildCompatibilityMatrixReport>;
}): SemanticGraphEntity[] {
  const activeProducts = products.filter((product) => product.active);
  const productEntities = activeProducts.map((product) => ({
    id: `product-${product.id}`,
    type: "product" as const,
    label: product.name,
    detail: `${product.category || "Uncategorized"} · ${productSignals(product).length} catalog signal${productSignals(product).length === 1 ? "" : "s"}`,
    connections: decision.edges.filter((edge) => edge.source.includes(product.id) || edge.target.includes(product.id)).length + benefits.benefits.filter((benefit) => benefit.productIds.includes(product.id)).length,
    status: product.description && product.product_url && productSignals(product).length >= 3 ? "pass" as const : "warn" as const,
  }));

  const categoryEntities = ontology.categoryClusters.slice(0, 8).map((cluster) => ({
    id: `category-${cluster.category}`,
    type: "category" as const,
    label: cluster.category,
    detail: `${cluster.productCount} product${cluster.productCount === 1 ? "" : "s"} · ${cluster.needs.length + cluster.tags.length + cluster.features.length} category signal${cluster.needs.length + cluster.tags.length + cluster.features.length === 1 ? "" : "s"}`,
    connections: cluster.productCount + cluster.needs.length + cluster.tags.length + cluster.features.length,
    status: cluster.productCount >= 2 ? "pass" as const : "warn" as const,
  }));

  const signalEntities = ontology.topSignals.slice(0, 10).map((signal) => ({
    id: `signal-${signal.type}-${signal.key}`,
    type: "signal" as const,
    label: signal.label,
    detail: `${signal.type.replace("_", " ")} · ${signal.productCount} product${signal.productCount === 1 ? "" : "s"}`,
    connections: signal.productCount,
    status: signal.productCount >= 2 ? "pass" as const : "warn" as const,
  }));

  const benefitEntities = benefits.benefits.slice(0, 8).map((benefit) => ({
    id: `benefit-${benefit.id}`,
    type: "benefit" as const,
    label: benefit.label,
    detail: benefit.benefit,
    connections: benefit.productCount,
    status: benefit.productCount ? "pass" as const : "warn" as const,
  }));

  const termEntities = vocabulary.terms.slice(0, 8).map((term) => ({
    id: `term-${term.term}`,
    type: "term" as const,
    label: term.label,
    detail: `${term.status} discovery vocabulary · ${term.sampleProducts.slice(0, 2).join(", ") || "No sample products"}`,
    connections: term.sampleProducts.length,
    status: term.status === "approved" ? "pass" as const : term.status === "review" ? "warn" as const : "fail" as const,
  }));

  const ruleEntities = decision.ruleAudits.slice(0, 8).map((rule) => ({
    id: `rule-${rule.id}`,
    type: "rule" as const,
    label: rule.answerLabel,
    detail: `${rule.quizName} · ${rule.matchType}:${rule.matchValue}`,
    connections: rule.linkedProducts.length + rule.linkedSignals.length,
    status: rule.status,
  }));

  const configuratorEntities = compatibility.options.slice(0, 8).map((option) => ({
    id: `configurator-${option.id}`,
    type: "configurator" as const,
    label: option.label,
    detail: `${option.configuratorName} · ${option.productName || "No product link"}`,
    connections: option.ruleCount + (option.productName ? 1 : 0),
    status: option.activeProduct ? "pass" as const : "fail" as const,
  }));

  return [
    ...productEntities,
    ...categoryEntities,
    ...signalEntities,
    ...benefitEntities,
    ...termEntities,
    ...ruleEntities,
    ...configuratorEntities,
  ].sort((a, b) => b.connections - a.connections || a.label.localeCompare(b.label)).slice(0, 36);
}

function buildWeakLinks({
  ontology,
  benefits,
  vocabulary,
  decision,
  grounding,
  compatibility,
}: {
  ontology: ReturnType<typeof buildCatalogOntology>;
  benefits: ReturnType<typeof buildCatalogBenefitReport>;
  vocabulary: ReturnType<typeof buildVocabularyStudioReport>;
  decision: ReturnType<typeof buildDecisionGraph>;
  grounding: ReturnType<typeof buildGroundingCenterReport>;
  compatibility: ReturnType<typeof buildCompatibilityMatrixReport>;
}): SemanticGraphWeakLink[] {
  const links: SemanticGraphWeakLink[] = [];

  ontology.gaps.slice(0, 3).forEach((gap, index) => links.push({
    id: `ontology-gap-${index}`,
    label: "Ontology gap",
    status: "warn",
    source: "Catalog ontology",
    detail: gap,
    action: "Normalize catalog categories, buyer needs or features.",
    href: "/dashboard/ontology",
  }));

  benefits.gaps.slice(0, 3).forEach((gap, index) => links.push({
    id: `benefit-gap-${index}`,
    label: "Benefit gap",
    status: "warn",
    source: "Catalog benefits",
    detail: gap,
    action: "Add shopper-outcome language or run enrichment.",
    href: "/dashboard/attributes",
  }));

  vocabulary.unsupportedTerms.slice(0, 4).forEach((term) => links.push({
    id: `unsupported-term-${term.term}`,
    label: term.label,
    status: "warn",
    source: "Vocabulary Studio",
    detail: term.reviewNote,
    action: "Approve, reject or map this shopper term to real catalog evidence.",
    href: "/dashboard/vocabulary",
  }));

  decision.actions.slice(0, 4).forEach((action) => links.push({
    id: `decision-${action.id}`,
    label: action.title,
    status: action.severity === "critical" || action.severity === "high" ? "fail" : "warn",
    source: "Decision graph",
    detail: action.detail,
    action: action.label,
    href: action.href,
  }));

  grounding.actions.filter((action) => action.priority !== "low").slice(0, 4).forEach((action) => links.push({
    id: `grounding-${action.id}`,
    label: action.title,
    status: action.priority === "critical" || action.priority === "high" ? "fail" : "warn",
    source: "Grounding Center",
    detail: action.detail,
    action: action.label,
    href: action.href,
  }));

  compatibility.actions.filter((action) => action.priority !== "low").slice(0, 4).forEach((action) => links.push({
    id: `compatibility-${action.id}`,
    label: action.title,
    status: action.priority === "critical" || action.priority === "high" ? "fail" : "warn",
    source: "Compatibility Matrix",
    detail: action.detail,
    action: action.actionLabel,
    href: action.actionHref,
  }));

  return links
    .filter((link, index, list) => list.findIndex((item) => item.id === link.id) === index)
    .slice(0, 12);
}

function buildActions(layers: SemanticGraphLayer[], weakLinks: SemanticGraphWeakLink[]): SemanticGraphAction[] {
  const actions = layers
    .filter((layer) => layer.status !== "pass")
    .map((layer) => ({
      id: `graph-layer-${layer.id}`,
      priority: priority(layer.status),
      title: `${layer.label} needs ${layer.status === "fail" ? "repair" : "review"}`,
      detail: layer.detail,
      evidence: layer.evidence,
      href: layer.href,
      label: "Open layer",
    }));

  weakLinks.filter((link) => link.status === "fail").slice(0, 3).forEach((link) => actions.push({
    id: `graph-weak-${link.id}`,
    priority: "high",
    title: link.label,
    detail: link.detail,
    evidence: link.source,
    href: link.href,
    label: link.action,
  }));

  if (!actions.length) {
    actions.push({
      id: "graph-ready",
      priority: "low",
      title: "Attach semantic graph packet to launch handoff",
      detail: "Catalog ontology, decision rules, vocabulary, benefits, grounding and compatibility layers are ready for launch review.",
      evidence: `${layers.length} semantic graph layers are passing.`,
      href: "/dashboard/production",
      label: "Open production",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .slice(0, 8);
}

function buildPacket(report: Omit<SemanticKnowledgeGraphReport, "packet">) {
  return [
    "Findly Semantic Knowledge Graph packet",
    "======================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Graph layers",
    ...report.layers.map((layer) => `- [${layer.status.toUpperCase()}] ${layer.label}: ${layer.evidence}`),
    "",
    "Top connected entities",
    ...report.entities.slice(0, 12).map((entity) => `- ${entity.label} (${entity.type}) · ${entity.connections} connection${entity.connections === 1 ? "" : "s"} · ${entity.detail}`),
    "",
    "Weak links",
    ...report.weakLinks.map((link) => `- [${link.status.toUpperCase()}] ${link.source}: ${link.detail}`),
    "",
    "Boundary",
    "- Findly uses this graph to structure catalog understanding, quiz rules, semantic vocabulary, benefit mapping, grounding evidence and compatibility relationships.",
    "- The graph informs discovery and AI prompts, but deterministic runtime logic still selects products before AI writes explanations.",
  ].join("\n");
}

export function buildSemanticKnowledgeGraphReport({
  products,
  quizzes,
  configurators,
  events,
  openaiConfigured = false,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  openaiConfigured?: boolean;
}): SemanticKnowledgeGraphReport {
  const activeProducts = products.filter((product) => product.active);
  const ontology = buildCatalogOntology(products);
  const benefits = buildCatalogBenefitReport(products);
  const decision = buildDecisionGraph({ products, quizzes, configurators, events });
  const vocabulary = buildVocabularyStudioReport({ products, quizzes, events });
  const grounding = buildGroundingCenterReport({ products, quizzes, events, openaiConfigured });
  const compatibility = buildCompatibilityMatrixReport({ products, configurators });

  const catalogScore = activeProducts.length
    ? Math.round(activeProducts.reduce((sum, product) => sum + Math.min(100, 20 + productSignals(product).length * 10 + (product.description ? 20 : 0) + (product.search_text ? 15 : 0) + (product.product_url ? 15 : 0)), 0) / activeProducts.length)
    : 0;

  const layers: SemanticGraphLayer[] = [
    {
      id: "catalog",
      label: "Product truth layer",
      status: layerStatus(catalogScore),
      score: catalogScore,
      entities: activeProducts.length,
      edges: activeProducts.reduce((sum, product) => sum + productSignals(product).length, 0),
      detail: "Active products with shopper-facing descriptions, tags, features, buyer needs, semantic text and commerce URLs.",
      evidence: `${activeProducts.length} active products · ${activeProducts.reduce((sum, product) => sum + productSignals(product).length, 0)} product signals.`,
      href: "/dashboard/products",
    },
    {
      id: "ontology",
      label: "Catalog ontology",
      status: layerStatus(ontology.gaps.length ? Math.max(45, 86 - ontology.gaps.length * 12) : 92),
      score: ontology.gaps.length ? Math.max(45, 86 - ontology.gaps.length * 12) : 92,
      entities: ontology.categoryClusters.length + ontology.topSignals.length,
      edges: ontology.topSignals.reduce((sum, signal) => sum + signal.productCount, 0),
      detail: "Category clusters and reusable catalog signals that become guided-selling questions.",
      evidence: `${ontology.categoryClusters.length} category clusters · ${ontology.topSignals.length} top ontology signals.`,
      href: "/dashboard/ontology",
    },
    {
      id: "rules",
      label: "Decision rules",
      status: decision.status === "healthy" ? "pass" : decision.status === "needs-review" ? "warn" : "fail",
      score: decision.score,
      entities: decision.nodes.length,
      edges: decision.edges.length,
      detail: "Answer rules, question flow, product signals and observed shopper language connected by deterministic selection logic.",
      evidence: `${decision.summary.connectedRules}/${decision.summary.finderRules} finder rules connected · ${decision.summary.edges} graph edges.`,
      href: "/dashboard/decision-graph",
    },
    {
      id: "vocabulary",
      label: "Discovery vocabulary",
      status: vocabulary.status === "ready" ? "pass" : vocabulary.status === "review" ? "warn" : "fail",
      score: vocabulary.score,
      entities: vocabulary.summary.terms,
      edges: vocabulary.terms.filter((term) => term.productCount > 0).length,
      detail: "Approved, review and unsupported shopper language mapped back to product evidence.",
      evidence: `${vocabulary.summary.approvedTerms} approved terms · ${vocabulary.summary.missingTerms} missing terms.`,
      href: "/dashboard/vocabulary",
    },
    {
      id: "benefits",
      label: "Benefit graph",
      status: layerStatus(benefits.coverage),
      score: benefits.coverage,
      entities: benefits.benefits.length,
      edges: benefits.benefits.reduce((sum, benefit) => sum + benefit.productCount, 0),
      detail: "Spec-to-benefit translations that turn product facts into shopper-friendly outcomes.",
      evidence: `${benefits.coverage}% benefit coverage · ${benefits.benefits.length} benefit mappings.`,
      href: "/dashboard/attributes",
    },
    {
      id: "grounding",
      label: "AI grounding map",
      status: grounding.status === "ready" ? "pass" : grounding.status === "review" ? "warn" : "fail",
      score: grounding.score,
      entities: grounding.summary.groundedFacts,
      edges: grounding.summary.benefitMappings + grounding.summary.approvedTerms + grounding.summary.explanationAudits,
      detail: "RAG-safe product facts, approved vocabulary, benefit mappings and explanation-audit evidence.",
      evidence: `${grounding.summary.groundedFacts} grounded facts · ${grounding.summary.explanationAudits} explanation audits.`,
      href: "/dashboard/grounding",
    },
    {
      id: "compatibility",
      label: "Compatibility graph",
      status: compatibility.status === "ready" ? "pass" : compatibility.status === "watch" ? "warn" : compatibility.status === "needs-attention" ? "fail" : "warn",
      score: compatibility.score,
      entities: compatibility.summary.options,
      edges: compatibility.summary.compatibilityRules,
      detail: "Configurator product links, option dependencies and blocked-pair guardrails.",
      evidence: `${compatibility.summary.productLinkedOptions}/${compatibility.summary.options} product-linked options · ${compatibility.summary.compatibilityRules} compatibility rules.`,
      href: "/dashboard/compatibility",
    },
  ];

  const entities = buildEntities({ products, ontology, benefits, vocabulary, decision, compatibility });
  const weakLinks = buildWeakLinks({ ontology, benefits, vocabulary, decision, grounding, compatibility });
  const status = reportStatus(layers);
  const score = Math.round(layers.reduce((sum, layer) => sum + layer.score, 0) / Math.max(1, layers.length));
  const baseReport: Omit<SemanticKnowledgeGraphReport, "packet"> = {
    status,
    score,
    headline: status === "ready"
      ? "The product-discovery graph is connected enough for launch handoff."
      : status === "review"
        ? "The product-discovery graph is useful, but a few semantic layers need review."
        : "The product-discovery graph has weak links that should be fixed before launch.",
    summary: {
      products: activeProducts.length,
      entities: entities.length,
      edges: layers.reduce((sum, layer) => sum + layer.edges, 0),
      layers: layers.length,
      readyLayers: layers.filter((layer) => layer.status === "pass").length,
      reviewLayers: layers.filter((layer) => layer.status === "warn").length,
      blockedLayers: layers.filter((layer) => layer.status === "fail").length,
      weakLinks: weakLinks.length,
    },
    layers,
    entities,
    weakLinks,
    actions: buildActions(layers, weakLinks),
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
