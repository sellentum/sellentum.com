import { buildCatalogBenefitReport } from "./catalog-benefits";
import { buildExplanationGroundingReport, type ExplanationGroundingAudit } from "./explanation-grounding";
import { buildVocabularyStudioReport, type VocabularyTerm } from "./vocabulary-studio";
import type { AnalyticsEvent, Product, Quiz } from "@/lib/types";

export type GroundingCenterStatus = "ready" | "review" | "blocked";
export type GroundingItemStatus = "grounded" | "review" | "missing";
export type GroundingActionPriority = "critical" | "high" | "medium" | "low";

export type GroundingFact = {
  id: string;
  label: string;
  kind: "description" | "feature" | "tag" | "buyer_need" | "semantic_text" | "benefit" | "commerce";
  status: GroundingItemStatus;
  detail: string;
  source: string;
};

export type GroundingProduct = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  status: GroundingItemStatus;
  score: number;
  evidenceCount: number;
  approvedTermCount: number;
  benefitCount: number;
  auditCount: number;
  facts: GroundingFact[];
  approvedTerms: string[];
  benefitLabels: string[];
  unsupportedTerms: string[];
  sampleExplanation?: string;
  guardrail: string;
  recommendation: string;
};

export type GroundingAction = {
  id: string;
  priority: GroundingActionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  label: string;
};

export type GroundingCenterReport = {
  status: GroundingCenterStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    groundedProducts: number;
    reviewProducts: number;
    missingProducts: number;
    groundedFacts: number;
    benefitMappings: number;
    approvedTerms: number;
    explanationAudits: number;
    unsupportedTerms: number;
  };
  products: GroundingProduct[];
  checks: Array<{
    id: string;
    label: string;
    status: GroundingItemStatus;
    detail: string;
    recommendation: string;
  }>;
  actions: GroundingAction[];
  packet: string;
};

const riskTerms = new Set(["always", "certified", "clinical", "cure", "cures", "guaranteed", "medical", "never", "official", "perfect", "safest"]);

const priorityRank: Record<GroundingActionPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£$.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value).match(/[a-z][a-z0-9-]{2,}/g) || [];
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function sentence(value: string, max = 170) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function statusFromScore(score: number): GroundingItemStatus {
  if (score >= 78) return "grounded";
  if (score >= 50) return "review";
  return "missing";
}

function reportStatus(products: GroundingProduct[]): GroundingCenterStatus {
  if (!products.length || products.some((product) => product.status === "missing")) return "blocked";
  if (products.some((product) => product.status === "review")) return "review";
  return "ready";
}

function productText(product: Product) {
  return [
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" ");
}

function matchesProduct(term: VocabularyTerm, product: Product) {
  const haystack = normalize(productText(product));
  const termTokens = tokens(`${term.term} ${term.label}`);
  return term.sampleProducts.includes(product.name) || termTokens.some((token) => haystack.includes(token));
}

function addFact(facts: GroundingFact[], fact: GroundingFact) {
  if (fact.detail.trim()) facts.push(fact);
}

function buildProductFacts(product: Product, benefitLabels: string[]): GroundingFact[] {
  const facts: GroundingFact[] = [];
  addFact(facts, {
    id: `${product.id}-description`,
    label: "Description",
    kind: "description",
    status: product.description ? "grounded" : "missing",
    detail: product.description ? sentence(product.description, 220) : "No product description is available for AI explanation grounding.",
    source: "products.description",
  });
  product.features.slice(0, 6).forEach((feature, index) => addFact(facts, {
    id: `${product.id}-feature-${index}`,
    label: "Feature",
    kind: "feature",
    status: "grounded",
    detail: sentence(feature, 120),
    source: "products.features",
  }));
  product.tags.slice(0, 6).forEach((tag, index) => addFact(facts, {
    id: `${product.id}-tag-${index}`,
    label: "Tag",
    kind: "tag",
    status: "grounded",
    detail: tag,
    source: "products.tags",
  }));
  (product.buyer_needs || []).slice(0, 6).forEach((need, index) => addFact(facts, {
    id: `${product.id}-need-${index}`,
    label: "Buyer need",
    kind: "buyer_need",
    status: "grounded",
    detail: sentence(need, 120),
    source: "products.buyer_needs",
  }));
  addFact(facts, {
    id: `${product.id}-semantic`,
    label: "Semantic text",
    kind: "semantic_text",
    status: product.search_text ? "grounded" : "review",
    detail: product.search_text ? sentence(product.search_text, 180) : "Add shopper-language search text to strengthen advisor/search grounding.",
    source: "products.search_text",
  });
  benefitLabels.slice(0, 5).forEach((benefit, index) => addFact(facts, {
    id: `${product.id}-benefit-${index}`,
    label: "Benefit mapping",
    kind: "benefit",
    status: "grounded",
    detail: benefit,
    source: "catalog-benefits",
  }));
  addFact(facts, {
    id: `${product.id}-commerce-url`,
    label: "Buy Now URL",
    kind: "commerce",
    status: product.product_url ? "grounded" : "missing",
    detail: product.product_url || "Missing product URL; do not publish Buy Now CTAs until fixed.",
    source: "products.product_url",
  });
  return facts;
}

function scoreProduct({
  facts,
  approvedTerms,
  benefits,
  audits,
  unsupportedTerms,
}: {
  facts: GroundingFact[];
  approvedTerms: string[];
  benefits: string[];
  audits: ExplanationGroundingAudit[];
  unsupportedTerms: string[];
}) {
  const groundedFacts = facts.filter((fact) => fact.status === "grounded").length;
  const missingFacts = facts.filter((fact) => fact.status === "missing").length;
  const passedAudits = audits.filter((audit) => audit.status === "pass").length;
  return Math.max(0, Math.min(100, Math.round(
    groundedFacts * 8
    + Math.min(18, approvedTerms.length * 3)
    + Math.min(16, benefits.length * 5)
    + Math.min(18, passedAudits * 9)
    - missingFacts * 12
    - unsupportedTerms.length * 8,
  )));
}

function productRecommendation(product: GroundingProduct) {
  if (product.status === "grounded") return "Safe to use as RAG evidence for finder, advisor, search and result-card explanations.";
  if (product.unsupportedTerms.length) return "Review unsupported or risky terms before allowing AI to reuse them in shopper-facing copy.";
  if (product.evidenceCount < 4) return "Add more product facts, buyer needs and semantic text before using this product in AI explanations.";
  return "Review thin evidence and rerun explanation grounding before production launch.";
}

function buildActions(report: Omit<GroundingCenterReport, "actions" | "packet">): GroundingAction[] {
  const actions: GroundingAction[] = [];
  const missingProduct = report.products.find((product) => product.status === "missing");
  const reviewProduct = report.products.find((product) => product.status === "review");

  if (!report.summary.activeProducts) {
    actions.push({
      id: "add-products-for-grounding",
      priority: "critical",
      title: "Add active products before AI grounding",
      detail: "The Grounding Center needs active catalog products before it can create a fact map.",
      evidence: "0 active products are available.",
      href: "/dashboard/products",
      label: "Add products",
    });
  }

  if (missingProduct) {
    actions.push({
      id: `fix-grounding-${missingProduct.productId}`,
      priority: "critical",
      title: `Add grounding facts for ${missingProduct.productName}`,
      detail: missingProduct.recommendation,
      evidence: `${missingProduct.evidenceCount} grounded facts · ${missingProduct.unsupportedTerms.length} unsupported terms.`,
      href: "/dashboard/products",
      label: "Edit product",
    });
  }

  if (report.summary.unsupportedTerms) {
    actions.push({
      id: "review-unsupported-grounding-language",
      priority: "high",
      title: "Review unsupported shopper language",
      detail: "Unsupported or risky terms should not be used by advisor/search explanations until a merchant maps them to true product facts.",
      evidence: `${report.summary.unsupportedTerms} unsupported term${report.summary.unsupportedTerms === 1 ? "" : "s"} appear in the grounding map.`,
      href: "/dashboard/vocabulary",
      label: "Open vocabulary",
    });
  }

  if (reviewProduct) {
    actions.push({
      id: `review-grounding-${reviewProduct.productId}`,
      priority: "medium",
      title: `Review AI evidence for ${reviewProduct.productName}`,
      detail: reviewProduct.recommendation,
      evidence: `${reviewProduct.score}% grounding score with ${reviewProduct.auditCount} explanation audit${reviewProduct.auditCount === 1 ? "" : "s"}.`,
      href: "/dashboard/preflight",
      label: "Rerun audits",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "grounding-ready-for-launch",
      priority: "low",
      title: "Attach grounding packet to production verification",
      detail: "Catalog facts, approved vocabulary, benefits and explanation audits are ready for AI-safe launch handoff.",
      evidence: `${report.summary.groundedProducts}/${report.summary.activeProducts} products are grounded.`,
      href: "/dashboard/production",
      label: "Open production",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function buildChecks(report: Omit<GroundingCenterReport, "checks" | "actions" | "packet">): GroundingCenterReport["checks"] {
  return [
    {
      id: "catalog-facts",
      label: "Catalog fact coverage",
      status: report.summary.activeProducts && report.summary.groundedFacts / Math.max(1, report.summary.activeProducts) >= 5 ? "grounded" : report.summary.groundedFacts ? "review" : "missing",
      detail: `${report.summary.groundedFacts} grounded fact${report.summary.groundedFacts === 1 ? "" : "s"} across ${report.summary.activeProducts} active product${report.summary.activeProducts === 1 ? "" : "s"}.`,
      recommendation: "Every launch product should have a description, features, buyer needs, semantic text and Buy Now URL.",
    },
    {
      id: "benefit-map",
      label: "Benefit mapping",
      status: report.summary.benefitMappings >= report.summary.activeProducts ? "grounded" : report.summary.benefitMappings ? "review" : "missing",
      detail: `${report.summary.benefitMappings} product-benefit mapping${report.summary.benefitMappings === 1 ? "" : "s"} are available for shopper-friendly explanations.`,
      recommendation: "Run enrichment or add benefit language such as comfort, durability, compatibility, protection and performance.",
    },
    {
      id: "approved-vocabulary",
      label: "Approved vocabulary",
      status: report.summary.approvedTerms ? "grounded" : "review",
      detail: `${report.summary.approvedTerms} approved discovery term${report.summary.approvedTerms === 1 ? "" : "s"} can be reused by search, advisor and explanation copy.`,
      recommendation: "Approve observed shopper language before allowing it into AI-facing prompts or result copy.",
    },
    {
      id: "explanation-audits",
      label: "Explanation audit evidence",
      status: report.summary.explanationAudits ? "grounded" : "missing",
      detail: `${report.summary.explanationAudits} recommendation explanation audit${report.summary.explanationAudits === 1 ? "" : "s"} connect result copy to facts.`,
      recommendation: "Publish a finder and run preflight to audit top recommendation explanations.",
    },
  ];
}

function buildPacket(report: Omit<GroundingCenterReport, "packet">) {
  return [
    "Findly Grounding Center packet",
    "==============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "RAG grounding boundary",
    "- AI can explain only product facts, approved vocabulary, benefit mappings and audited recommendation evidence listed here.",
    "- Deterministic matching selects products before AI explanation, advisor copy or sales content is generated.",
    "- Unsupported terms must be added to true catalog facts or rejected before launch.",
    "",
    "Grounded product fact map",
    ...report.products.map((product) => [
      `- [${product.status.toUpperCase()}] ${product.productName} (${product.score}%)`,
      `  Facts: ${product.evidenceCount}; Benefits: ${product.benefitLabels.join(", ") || "none"}`,
      `  Approved terms: ${product.approvedTerms.slice(0, 8).join(", ") || "none"}`,
      `  Unsupported terms: ${product.unsupportedTerms.join(", ") || "none"}`,
      `  Guardrail: ${product.guardrail}`,
    ].join("\n")),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildGroundingCenterReport({
  products,
  quizzes,
  events,
  openaiConfigured = false,
}: {
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
  openaiConfigured?: boolean;
}): GroundingCenterReport {
  const activeProducts = products.filter((product) => product.active);
  const benefits = buildCatalogBenefitReport(products);
  const vocabulary = buildVocabularyStudioReport({ products, quizzes, events });
  const explanation = buildExplanationGroundingReport({ products, quizzes, openaiConfigured });
  const approvedTerms = vocabulary.terms.filter((term) => term.status === "approved");
  const unsupportedTerms = vocabulary.unsupportedTerms;
  const productsReport = activeProducts.map((product) => {
    const productBenefits = benefits.benefits.filter((benefit) => benefit.productIds.includes(product.id));
    const benefitLabels = productBenefits.map((benefit) => benefit.label);
    const facts = buildProductFacts(product, benefitLabels);
    const productApprovedTerms = approvedTerms.filter((term) => matchesProduct(term, product));
    const productUnsupportedTerms = unique([
      ...unsupportedTerms.filter((term) => matchesProduct(term, product)).map((term) => term.label),
      ...tokens(productText(product)).filter((token) => riskTerms.has(token)),
    ]);
    const audits = explanation.audits.filter((audit) => audit.productId === product.id || audit.productName === product.name);
    const score = scoreProduct({
      facts,
      approvedTerms: productApprovedTerms.map((term) => term.label),
      benefits: benefitLabels,
      audits,
      unsupportedTerms: productUnsupportedTerms,
    });
    const status = statusFromScore(score);
    const sampleExplanation = audits.find((audit) => audit.sampleExplanation)?.sampleExplanation;
    const productReport: GroundingProduct = {
      id: `grounding-${product.id}`,
      productId: product.id,
      productName: product.name,
      category: product.category,
      status,
      score,
      evidenceCount: facts.filter((fact) => fact.status === "grounded").length,
      approvedTermCount: productApprovedTerms.length,
      benefitCount: benefitLabels.length,
      auditCount: audits.length,
      facts,
      approvedTerms: productApprovedTerms.map((term) => term.label).slice(0, 12),
      benefitLabels,
      unsupportedTerms: productUnsupportedTerms,
      sampleExplanation,
      guardrail: "Use only listed catalog facts, approved vocabulary, mapped benefits and audited explanation evidence; do not invent claims, certifications, stock status or guarantees.",
      recommendation: "",
    };
    return { ...productReport, recommendation: productRecommendation(productReport) };
  }).sort((a, b) => b.score - a.score || a.productName.localeCompare(b.productName));

  const groundedProducts = productsReport.filter((product) => product.status === "grounded").length;
  const reviewProducts = productsReport.filter((product) => product.status === "review").length;
  const missingProducts = productsReport.filter((product) => product.status === "missing").length;
  const groundedFacts = productsReport.reduce((sum, product) => sum + product.evidenceCount, 0);
  const benefitMappings = productsReport.reduce((sum, product) => sum + product.benefitCount, 0);
  const approvedTermCount = productsReport.reduce((sum, product) => sum + product.approvedTermCount, 0);
  const unsupportedTermCount = productsReport.reduce((sum, product) => sum + product.unsupportedTerms.length, 0);
  const score = productsReport.length ? Math.round(productsReport.reduce((sum, product) => sum + product.score, 0) / productsReport.length) : 0;
  const status = reportStatus(productsReport);
  const baseReport: Omit<GroundingCenterReport, "checks" | "actions" | "packet"> = {
    status,
    score,
    headline: status === "ready"
      ? "AI-safe product facts are ready for grounded recommendations and sales copy."
      : status === "review"
        ? "Most grounding evidence is available, but a few products or terms need review."
        : "Grounding evidence is incomplete before AI-assisted launch.",
    summary: {
      activeProducts: activeProducts.length,
      groundedProducts,
      reviewProducts,
      missingProducts,
      groundedFacts,
      benefitMappings,
      approvedTerms: approvedTermCount,
      explanationAudits: explanation.summary.auditedRecommendations,
      unsupportedTerms: unsupportedTermCount,
    },
    products: productsReport,
  };
  const withChecks = { ...baseReport, checks: buildChecks(baseReport) };
  const withActions = { ...withChecks, actions: buildActions(withChecks) };
  return { ...withActions, packet: buildPacket(withActions) };
}
