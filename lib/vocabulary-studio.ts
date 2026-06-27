import { buildCatalogBenefitReport } from "./catalog-benefits";
import { buildCatalogOntology } from "./catalog-ontology";
import { buildShopperLanguagePlan, type ShopperLanguageCoverageStatus, type ShopperLanguageSource, type ShopperLanguageTerm } from "./shopper-language-planner";
import type { AnalyticsEvent, Product, Quiz } from "@/lib/types";

export type VocabularyStudioStatus = "ready" | "review" | "blocked";
export type VocabularyStudioItemStatus = "approved" | "review" | "missing";
export type VocabularyActionPriority = "critical" | "high" | "medium" | "low";

export type VocabularyTerm = {
  term: string;
  label: string;
  status: VocabularyStudioItemStatus;
  coverageStatus: ShopperLanguageCoverageStatus;
  sourceLabel: string;
  sources: ShopperLanguageSource[];
  productCount: number;
  semanticProductCount: number;
  sampleProducts: string[];
  exampleQueries: string[];
  suggestedSynonyms: string[];
  canonicalSignal?: {
    label: string;
    type: string;
    productCount: number;
  };
  reviewNote: string;
};

export type VocabularySynonymCluster = {
  id: string;
  anchor: string;
  status: VocabularyStudioItemStatus;
  synonyms: Array<{
    term: string;
    status: VocabularyStudioItemStatus;
    productCount: number;
    recommendation: string;
  }>;
  productCount: number;
  recommendation: string;
};

export type VocabularyProductTask = {
  productId: string;
  productName: string;
  score: number;
  status: VocabularyStudioItemStatus;
  missingFields: string[];
  suggestedBuyerNeeds: string[];
  suggestedSearchText: string;
};

export type VocabularyAction = {
  id: string;
  priority: VocabularyActionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  label: string;
};

export type VocabularyStudioReport = {
  status: VocabularyStudioStatus;
  score: number;
  summary: {
    terms: number;
    approvedTerms: number;
    reviewTerms: number;
    missingTerms: number;
    observedTerms: number;
    synonymClusters: number;
    productTasks: number;
    benefitCoverage: number;
    ontologySignals: number;
  };
  terms: VocabularyTerm[];
  synonymClusters: VocabularySynonymCluster[];
  unsupportedTerms: VocabularyTerm[];
  productTasks: VocabularyProductTask[];
  quizOpportunities: Array<{
    id: string;
    title: string;
    detail: string;
    suggestedQuestion: string;
    suggestedOptions: string[];
    impact: string;
  }>;
  governance: Array<{
    id: string;
    label: string;
    detail: string;
    status: "pass" | "warn" | "fail";
  }>;
  actions: VocabularyAction[];
  glossary: string;
  packet: string;
};

function vocabularyStatus(term: ShopperLanguageTerm): VocabularyStudioItemStatus {
  if (term.status === "covered") return "approved";
  if (term.status === "thin") return "review";
  return "missing";
}

function statusFromScore(score: number, missingObservedTerms: number, activeProducts: number): VocabularyStudioStatus {
  if (activeProducts < 2 || score < 45) return "blocked";
  if (score >= 82 && !missingObservedTerms) return "ready";
  return "review";
}

function sourceLabel(sources: ShopperLanguageSource[]) {
  return sources.join(", ");
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return normalize(value).match(/[a-z][a-z-]{2,}/g) || [];
}

function overlapScore(a: string, b: string) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  let score = 0;
  for (const token of left) if (right.has(token)) score += 1;
  if (normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a))) score += 2;
  return score;
}

function canonicalSignal(term: ShopperLanguageTerm, ontology: ReturnType<typeof buildCatalogOntology>) {
  const candidates = ontology.topSignals
    .map((signal) => ({ signal, score: Math.max(overlapScore(term.term, signal.key), overlapScore(term.label, signal.label)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.signal.productCount - a.signal.productCount);
  const match = candidates[0]?.signal;
  return match ? { label: match.label, type: match.type, productCount: match.productCount } : undefined;
}

function reviewNote(term: ShopperLanguageTerm) {
  if (term.status === "missing" && term.sources.includes("analytics")) return "Observed by shoppers but missing from catalog language. Add it only to products where the claim is true.";
  if (term.status === "missing") return "Suggested vocabulary is not yet supported by product facts.";
  if (term.status === "thin") return "Supported by one product or too narrow for broad routing. Approve intentionally or broaden coverage.";
  return "Supported by enough product facts for search, finder rules and grounded explanations.";
}

function buildTerms(plan: ReturnType<typeof buildShopperLanguagePlan>, ontology: ReturnType<typeof buildCatalogOntology>): VocabularyTerm[] {
  return plan.terms.map((term) => ({
    term: term.term,
    label: term.label,
    status: vocabularyStatus(term),
    coverageStatus: term.status,
    sourceLabel: sourceLabel(term.sources),
    sources: term.sources,
    productCount: term.productCount,
    semanticProductCount: term.semanticProductCount,
    sampleProducts: term.sampleProducts,
    exampleQueries: term.exampleQueries,
    suggestedSynonyms: term.suggestedSynonyms,
    canonicalSignal: canonicalSignal(term, ontology),
    reviewNote: reviewNote(term),
  }));
}

function synonymClusters(terms: VocabularyTerm[]): VocabularySynonymCluster[] {
  return terms
    .filter((term) => term.suggestedSynonyms.length)
    .slice(0, 10)
    .map((term) => {
      const synonyms = term.suggestedSynonyms.slice(0, 5).map((synonym) => {
        const existing = terms.find((item) => item.term === normalize(synonym));
        const status = existing?.status || (term.status === "missing" ? "missing" : "review");
        return {
          term: synonym,
          status,
          productCount: existing?.productCount || 0,
          recommendation: existing ? existing.reviewNote : "Review this synonym before adding it to product buyer needs, tags or semantic search text.",
        };
      });
      const hasMissing = synonyms.some((synonym) => synonym.status === "missing");
      const hasReview = synonyms.some((synonym) => synonym.status === "review");
      const status: VocabularyStudioItemStatus = hasMissing ? "missing" : hasReview ? "review" : "approved";
      return {
        id: `synonym-${term.term}`,
        anchor: term.label,
        status,
        synonyms,
        productCount: term.productCount,
        recommendation: status === "approved" ? "This synonym cluster is covered well enough for launch." : "Approve only the synonyms that are factually true for the mapped products.",
      };
    });
}

function productTasks(plan: ReturnType<typeof buildShopperLanguagePlan>): VocabularyProductTask[] {
  return plan.productAudits
    .filter((audit) => audit.missingFields.length || audit.score < 82)
    .slice(0, 8)
    .map((audit) => ({
      productId: audit.productId,
      productName: audit.productName,
      score: audit.score,
      status: audit.score >= 82 ? "approved" : audit.score >= 58 ? "review" : "missing",
      missingFields: audit.missingFields,
      suggestedBuyerNeeds: audit.suggestedBuyerNeeds,
      suggestedSearchText: audit.suggestedSearchText,
    }));
}

function glossary(terms: VocabularyTerm[]) {
  return [
    "Findly approved discovery vocabulary",
    "====================================",
    "",
    ...terms.map((term) => [
      `${term.label} — ${term.status.toUpperCase()}`,
      `Sources: ${term.sourceLabel}`,
      `Catalog coverage: ${term.productCount} direct / ${term.semanticProductCount} semantic`,
      term.canonicalSignal ? `Canonical signal: ${term.canonicalSignal.label} (${term.canonicalSignal.type})` : "Canonical signal: review required",
      term.suggestedSynonyms.length ? `Synonyms to review: ${term.suggestedSynonyms.join(", ")}` : "Synonyms to review: none",
      `Note: ${term.reviewNote}`,
      "",
    ].join("\n")),
  ].join("\n");
}

function governance(report: {
  plan: ReturnType<typeof buildShopperLanguagePlan>;
  benefits: ReturnType<typeof buildCatalogBenefitReport>;
  terms: VocabularyTerm[];
  clusters: VocabularySynonymCluster[];
}) {
  const missingObserved = report.terms.filter((term) => term.status === "missing" && term.sources.includes("analytics")).length;
  return [
    {
      id: "observed-language",
      label: "Observed shopper language",
      detail: missingObserved ? `${missingObserved} observed shopper terms still need catalog support.` : "Observed search/advisor language is covered by catalog facts or reviewed synonyms.",
      status: missingObserved ? "warn" as const : "pass" as const,
    },
    {
      id: "benefit-coverage",
      label: "Benefit coverage",
      detail: `${report.benefits.coverage}% of active products map to shopper-facing benefits.`,
      status: report.benefits.coverage >= 70 ? "pass" as const : report.benefits.coverage >= 45 ? "warn" as const : "fail" as const,
    },
    {
      id: "synonym-review",
      label: "Synonym review",
      detail: `${report.clusters.length} synonym clusters are available for merchant approval.`,
      status: report.clusters.some((cluster) => cluster.status === "missing") ? "warn" as const : "pass" as const,
    },
    {
      id: "product-language",
      label: "Product language fields",
      detail: `${report.plan.summary.productsNeedingLanguage} active products need buyer needs, search text or richer descriptions.`,
      status: report.plan.summary.productsNeedingLanguage ? "warn" as const : "pass" as const,
    },
  ];
}

function actions({
  plan,
  productTasks,
  unsupportedTerms,
  clusters,
}: {
  plan: ReturnType<typeof buildShopperLanguagePlan>;
  productTasks: VocabularyProductTask[];
  unsupportedTerms: VocabularyTerm[];
  clusters: VocabularySynonymCluster[];
}): VocabularyAction[] {
  const items: VocabularyAction[] = plan.actions.map((action) => ({
    id: action.id,
    priority: action.priority,
    title: action.title,
    detail: action.detail,
    evidence: action.evidence,
    href: action.actionHref,
    label: action.actionLabel,
  }));

  if (unsupportedTerms.length) {
    items.push({
      id: "approve-vocabulary-backlog",
      priority: "high",
      title: "Approve or reject unsupported shopper vocabulary",
      detail: "Missing terms should become product buyer needs, semantic search text or deliberate exclusions.",
      evidence: unsupportedTerms.slice(0, 4).map((term) => term.label).join(", "),
      href: "/dashboard/products",
      label: "Update products",
    });
  }

  if (clusters.some((cluster) => cluster.status !== "approved")) {
    items.push({
      id: "review-synonym-clusters",
      priority: "medium",
      title: "Review synonym clusters before launch",
      detail: "Synonyms can improve semantic matching, but only approved product-true phrases should be added to catalog facts.",
      evidence: `${clusters.filter((cluster) => cluster.status !== "approved").length} clusters need review.`,
      href: "/dashboard/vocabulary",
      label: "Review clusters",
    });
  }

  if (productTasks.length) {
    items.push({
      id: "fill-product-search-text",
      priority: productTasks.length >= Math.max(2, plan.summary.activeProducts - 1) ? "high" : "medium",
      title: "Fill product-level search language",
      detail: "Products without buyer needs or semantic text weaken search, advisor matching and AI explanation grounding.",
      evidence: productTasks.slice(0, 3).map((task) => task.productName).join(", "),
      href: "/dashboard/products",
      label: "Edit products",
    });
  }

  if (!items.length) {
    items.push({
      id: "vocabulary-ready",
      priority: "low",
      title: "Vocabulary is ready for launch QA",
      detail: "Discovery language, synonyms and product-level semantic fields are covered enough for launch testing.",
      evidence: "No urgent vocabulary actions detected.",
      href: "/dashboard/preflight",
      label: "Run preflight",
    });
  }

  const rank: Record<VocabularyActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function packet(report: Omit<VocabularyStudioReport, "packet">) {
  return [
    "Findly Vocabulary Studio packet",
    "===============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Approved terms: ${report.summary.approvedTerms}/${report.summary.terms}`,
    `Terms needing review: ${report.summary.reviewTerms}`,
    `Missing terms: ${report.summary.missingTerms}`,
    `Synonym clusters: ${report.summary.synonymClusters}`,
    "",
    "Unsupported shopper language",
    ...(report.unsupportedTerms.length ? report.unsupportedTerms.map((term) => `- ${term.label}: ${term.reviewNote}`) : ["- None"]),
    "",
    "Synonym clusters",
    ...report.synonymClusters.map((cluster) => `- [${cluster.status.toUpperCase()}] ${cluster.anchor}: ${cluster.synonyms.map((item) => item.term).join(", ")}`),
    "",
    "Product language tasks",
    ...(report.productTasks.length ? report.productTasks.map((task) => `- ${task.productName}: ${task.missingFields.join(", ") || "Review semantic text"}`) : ["- None"]),
    "",
    "Governance checks",
    ...report.governance.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),
  ].join("\n");
}

export function buildVocabularyStudioReport({ products, quizzes = [], events = [] }: { products: Product[]; quizzes?: Quiz[]; events?: AnalyticsEvent[] }): VocabularyStudioReport {
  const plan = buildShopperLanguagePlan({ products, quizzes, events, maxTerms: 30 });
  const ontology = buildCatalogOntology(products);
  const benefits = buildCatalogBenefitReport(products);
  const terms = buildTerms(plan, ontology);
  const clusters = synonymClusters(terms);
  const unsupportedTerms = terms.filter((term) => term.status === "missing").slice(0, 10);
  const tasks = productTasks(plan);
  const score = Math.round(plan.score * 0.62 + benefits.coverage * 0.18 + Math.min(100, (terms.filter((term) => term.status === "approved").length / Math.max(1, terms.length)) * 100) * 0.2);
  const status = statusFromScore(score, plan.summary.missingObservedTerms, plan.summary.activeProducts);
  const baseReport = {
    status,
    score,
    summary: {
      terms: terms.length,
      approvedTerms: terms.filter((term) => term.status === "approved").length,
      reviewTerms: terms.filter((term) => term.status === "review").length,
      missingTerms: terms.filter((term) => term.status === "missing").length,
      observedTerms: plan.summary.observedTerms,
      synonymClusters: clusters.length,
      productTasks: tasks.length,
      benefitCoverage: benefits.coverage,
      ontologySignals: ontology.topSignals.length,
    },
    terms,
    synonymClusters: clusters,
    unsupportedTerms,
    productTasks: tasks,
    quizOpportunities: plan.quizGuidance,
    governance: governance({ plan, benefits, terms, clusters }),
    actions: actions({ plan, productTasks: tasks, unsupportedTerms, clusters }),
    glossary: glossary(terms),
  };

  return { ...baseReport, packet: packet(baseReport) };
}
