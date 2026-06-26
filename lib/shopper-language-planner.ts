import { buildCatalogBenefitReport } from "./catalog-benefits";
import { buildCatalogOntology } from "./catalog-ontology";
import { extractSearchIntentTokens, runSemanticProductSearch } from "./search-engine";
import type { AnalyticsEvent, Product, Quiz } from "@/lib/types";

export type ShopperLanguageStatus = "ready" | "needs-work" | "blocked";
export type ShopperLanguageCoverageStatus = "covered" | "thin" | "missing";
export type ShopperLanguageActionPriority = "critical" | "high" | "medium" | "low";
export type ShopperLanguageSource = "catalog" | "benefit" | "quiz" | "analytics" | "synonym";

export type ShopperLanguageTerm = {
  term: string;
  label: string;
  status: ShopperLanguageCoverageStatus;
  productCount: number;
  semanticProductCount: number;
  productIds: string[];
  sampleProducts: string[];
  sources: ShopperLanguageSource[];
  exampleQueries: string[];
  suggestedSynonyms: string[];
  recommendation: string;
};

export type ShopperLanguageProductAudit = {
  productId: string;
  productName: string;
  score: number;
  missingFields: string[];
  buyerNeeds: string[];
  suggestedBuyerNeeds: string[];
  suggestedSearchText: string;
};

export type ShopperLanguageAction = {
  id: string;
  title: string;
  detail: string;
  priority: ShopperLanguageActionPriority;
  actionHref: string;
  actionLabel: string;
  evidence: string;
};

export type ShopperLanguageQuizGuidance = {
  id: string;
  title: string;
  detail: string;
  suggestedQuestion: string;
  suggestedOptions: string[];
  impact: "search" | "advisor" | "finder" | "catalog";
};

export type ShopperLanguagePlan = {
  status: ShopperLanguageStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    totalTerms: number;
    coveredTerms: number;
    thinTerms: number;
    missingTerms: number;
    observedTerms: number;
    missingObservedTerms: number;
    productsNeedingLanguage: number;
    synonymSuggestions: number;
    quizTermsCovered: number;
  };
  terms: ShopperLanguageTerm[];
  missingTerms: ShopperLanguageTerm[];
  thinTerms: ShopperLanguageTerm[];
  productAudits: ShopperLanguageProductAudit[];
  actions: ShopperLanguageAction[];
  quizGuidance: ShopperLanguageQuizGuidance[];
  suggestedSearchPrompts: string[];
};

type TermSeed = {
  term: string;
  sources: Set<ShopperLanguageSource>;
  examples: Set<string>;
  weight: number;
};

const stopWords = new Set([
  "about",
  "after",
  "also",
  "best",
  "choose",
  "find",
  "findly",
  "from",
  "good",
  "help",
  "item",
  "kind",
  "match",
  "need",
  "option",
  "pair",
  "product",
  "products",
  "recommend",
  "recommendation",
  "show",
  "shopper",
  "something",
  "that",
  "this",
  "under",
  "want",
  "what",
  "where",
  "which",
  "with",
  "your",
]);

const synonymHints: Record<string, string[]> = {
  "all-day": ["long-wear", "workday", "daily comfort"],
  breathable: ["cool", "airy", "ventilated"],
  city: ["commute", "urban", "travel"],
  comfort: ["cushioning", "soft feel", "all-day"],
  comfortable: ["comfort", "cushioning", "soft feel"],
  cushioned: ["comfort", "soft landing", "all-day"],
  durability: ["rugged", "long-lasting", "hard-wearing"],
  everyday: ["daily", "commute", "travel"],
  fast: ["speed", "responsive", "race"],
  grip: ["traction", "non-slip", "outdoor"],
  hiking: ["trail", "outdoor", "grip"],
  lightweight: ["light", "nimble", "travel"],
  office: ["workday", "smart casual", "standing"],
  orthopedic: ["arch support", "supportive", "wide fit"],
  outdoor: ["trail", "hiking", "weather-ready"],
  premium: ["pro", "advanced", "high-end"],
  rain: ["wet-weather", "water resistant", "waterproof"],
  responsive: ["energy return", "fast", "race"],
  road: ["running", "pavement", "tempo"],
  speed: ["fast", "responsive", "race"],
  stable: ["supportive", "steady", "wide base"],
  trail: ["hiking", "outdoor", "off-road"],
  travel: ["lightweight", "commute", "packable"],
  waterproof: ["rain", "wet-weather", "water resistant"],
  wet: ["rain", "waterproof", "wet-weather"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleize(value: string) {
  const normalized = normalize(value);
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function percentage(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function tokenise(value: string) {
  return normalize(value).match(/[a-z][a-z-]{2,}/g)?.filter((word) => !stopWords.has(word)) || [];
}

function productCorpus(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.features.join(" "),
    product.tags.join(" "),
    (product.buyer_needs || []).join(" "),
    product.search_text || "",
  ].join(" "));
}

function hasTerm(product: Product, term: string) {
  const corpus = productCorpus(product);
  const normalized = normalize(term);
  if (!normalized) return false;
  if (corpus.includes(normalized)) return true;
  const tokens = tokenise(normalized);
  return tokens.length > 0 && tokens.every((token) => corpus.includes(token));
}

function addTerm(map: Map<string, TermSeed>, rawTerm: string, source: ShopperLanguageSource, weight = 1, example = "") {
  const normalized = normalize(rawTerm);
  if (!normalized || normalized.length < 3 || /^\d+$/.test(normalized) || stopWords.has(normalized)) return;
  const seed = map.get(normalized) || { term: normalized, sources: new Set<ShopperLanguageSource>(), examples: new Set<string>(), weight: 0 };
  seed.sources.add(source);
  if (example) seed.examples.add(example.trim());
  seed.weight += weight;
  map.set(normalized, seed);
}

function addTokenTerms(map: Map<string, TermSeed>, value: string, source: ShopperLanguageSource, weight = 1, example = "") {
  for (const token of tokenise(value)) addTerm(map, token, source, weight, example);
}

function analyticsQuery(event: AnalyticsEvent) {
  const query = event.metadata?.query;
  return typeof query === "string" ? query.trim() : "";
}

function metadataArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function collectTerms(products: Product[], quizzes: Quiz[], events: AnalyticsEvent[]) {
  const terms = new Map<string, TermSeed>();
  const ontology = buildCatalogOntology(products);
  const benefits = buildCatalogBenefitReport(products);

  for (const signal of ontology.topSignals) {
    addTerm(terms, signal.key, "catalog", signal.productCount);
    addTokenTerms(terms, signal.label, "catalog", Math.max(1, signal.productCount / 2));
  }

  for (const benefit of benefits.benefits) {
    addTerm(terms, benefit.label, "benefit", benefit.productCount);
    for (const sourceTerm of benefit.sourceTerms) addTerm(terms, sourceTerm, "benefit", benefit.productCount);
  }

  for (const quiz of quizzes) {
    for (const question of quiz.questions || []) {
      for (const option of question.options || []) {
        if (option.match_type === "budget_max" || option.match_type === "none") continue;
        addTerm(terms, option.match_value || option.label, "quiz", 2, question.title);
        addTokenTerms(terms, option.label, "quiz", 1, question.title);
      }
    }
  }

  for (const event of events) {
    const metadata = event.metadata || {};
    const query = analyticsQuery(event);
    const recoveryStatus = typeof metadata.recovery_status === "string" ? metadata.recovery_status : "";
    const resultCount = typeof metadata.result_count === "number" ? metadata.result_count : null;
    const eventWeight = resultCount === 0 || recoveryStatus === "no-results" ? 7 : 3;
    if (query) {
      for (const term of extractSearchIntentTokens(query)) addTerm(terms, term, "analytics", eventWeight, query);
    }
    for (const term of metadataArray(metadata.terms)) addTerm(terms, term, "analytics", eventWeight, query);
    for (const term of metadataArray(metadata.matched_signals)) addTerm(terms, term, "analytics", Math.max(2, eventWeight - 1), query);
    for (const term of metadataArray(metadata.answer_summary)) addTokenTerms(terms, term, "analytics", Math.max(2, eventWeight - 1), term);
  }

  for (const term of [...terms.keys()]) {
    for (const synonym of synonymHints[term] || []) addTerm(terms, synonym, "synonym", 0.7, term);
  }

  return [...terms.values()].sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
}

function semanticProductCount(term: string, products: Product[]) {
  const report = runSemanticProductSearch({ query: term, products, limit: 6 });
  return report.results.filter((result) => result.score > 0 && result.eligible).length;
}

function recommendationForTerm(term: ShopperLanguageTerm) {
  if (term.status === "missing") {
    return term.sources.includes("analytics")
      ? "Add this shopper phrase to buyer needs, tags or semantic search text on the most relevant products."
      : "Add this synonym only where it is factually true so search and advisor matching can find it.";
  }
  if (term.status === "thin") return "Broaden this term across more relevant products or make it a narrower quiz branch.";
  return "Covered well enough for matching, quiz options and explanation evidence.";
}

function buildTerm(seed: TermSeed, products: Product[], active: Product[]): ShopperLanguageTerm {
  const directMatches = active.filter((product) => hasTerm(product, seed.term));
  const semanticCount = semanticProductCount(seed.term, products);
  const coveredThreshold = Math.min(2, Math.max(1, active.length));
  const status: ShopperLanguageCoverageStatus = directMatches.length >= coveredThreshold
    ? "covered"
    : directMatches.length
      ? "thin"
      : "missing";
  const term: ShopperLanguageTerm = {
    term: seed.term,
    label: titleize(seed.term),
    status,
    productCount: directMatches.length,
    semanticProductCount: semanticCount,
    productIds: directMatches.map((product) => product.id),
    sampleProducts: directMatches.map((product) => product.name).slice(0, 3),
    sources: [...seed.sources],
    exampleQueries: [...seed.examples].slice(0, 3),
    suggestedSynonyms: synonymHints[seed.term] || [],
    recommendation: "",
  };
  return { ...term, recommendation: recommendationForTerm(term) };
}

function productBenefitSuggestions(product: Product, products: Product[]) {
  const benefits = buildCatalogBenefitReport(products).benefits.filter((benefit) => benefit.productIds.includes(product.id));
  return benefits.map((benefit) => benefit.label).slice(0, 4);
}

function buildProductAudit(product: Product, products: Product[]): ShopperLanguageProductAudit {
  const missingFields = [
    !(product.buyer_needs || []).length ? "buyer needs" : "",
    !(product.search_text || "").trim() ? "semantic search text" : "",
    product.description.trim().length < 50 ? "longer description" : "",
    product.features.length + product.tags.length < 3 ? "more tags/features" : "",
  ].filter(Boolean);
  const suggestedBuyerNeeds = unique([
    ...productBenefitSuggestions(product, products),
    ...(product.buyer_needs || []),
    ...product.tags.slice(0, 2).map(titleize),
    ...product.features.slice(0, 2).map(titleize),
  ]).slice(0, 5);
  const suggestedSearchText = unique([
    product.name,
    product.category,
    product.description,
    product.features.length ? `Features: ${product.features.join(", ")}` : "",
    product.tags.length ? `Use cases: ${product.tags.join(", ")}` : "",
    suggestedBuyerNeeds.length ? `Best for: ${suggestedBuyerNeeds.join(", ")}` : "",
  ]).join(". ");
  const score = Math.max(0, 100 - missingFields.length * 22 - ((product.buyer_needs || []).length ? 0 : 8));

  return {
    productId: product.id,
    productName: product.name,
    score,
    missingFields,
    buyerNeeds: product.buyer_needs || [],
    suggestedBuyerNeeds,
    suggestedSearchText,
  };
}

function buildQuizGuidance(terms: ShopperLanguageTerm[], products: Product[], quizzes: Quiz[]): ShopperLanguageQuizGuidance[] {
  const observedMissing = terms.filter((term) => term.status === "missing" && term.sources.includes("analytics"));
  const thinTerms = terms.filter((term) => term.status === "thin").slice(0, 4);
  const activeCategories = unique(products.filter((product) => product.active).map((product) => product.category)).slice(0, 4);
  const guidance: ShopperLanguageQuizGuidance[] = [];

  if (observedMissing.length) {
    guidance.push({
      id: "missing-shopper-terms",
      title: "Turn missing shopper terms into catalog enrichment tasks",
      detail: "Observed queries are asking for language that is not directly present in product facts.",
      suggestedQuestion: "Which use case best describes what you need?",
      suggestedOptions: observedMissing.slice(0, 4).map((term) => term.label),
      impact: "search",
    });
  }

  if (thinTerms.length) {
    guidance.push({
      id: "thin-quiz-branches",
      title: "Avoid one-product answer traps",
      detail: "Thin terms can create finder branches with only one eligible product unless the wording is intentionally narrow.",
      suggestedQuestion: "What should Findly prioritise?",
      suggestedOptions: thinTerms.map((term) => term.label),
      impact: "finder",
    });
  }

  if (!quizzes.some((quiz) => quiz.questions?.length) && activeCategories.length > 1) {
    guidance.push({
      id: "category-starting-question",
      title: "Start the finder with a high-coverage category question",
      detail: "Multiple categories are available, so the first question can quickly route shoppers to a relevant branch.",
      suggestedQuestion: "What type of product are you shopping for?",
      suggestedOptions: activeCategories,
      impact: "finder",
    });
  }

  return guidance.slice(0, 4);
}

function actionPriority(action: ShopperLanguageAction) {
  if (action.priority === "critical") return 4;
  if (action.priority === "high") return 3;
  if (action.priority === "medium") return 2;
  return 1;
}

function buildActions(plan: Omit<ShopperLanguagePlan, "actions" | "headline" | "status">): ShopperLanguageAction[] {
  const actions: ShopperLanguageAction[] = [];
  const observedMissing = plan.missingTerms.filter((term) => term.sources.includes("analytics"));
  const thinImportant = plan.thinTerms.filter((term) => term.sources.includes("quiz") || term.sources.includes("analytics"));
  const weakestProducts = plan.productAudits.filter((audit) => audit.missingFields.length).slice(0, 3);

  if (plan.summary.activeProducts < 2) {
    actions.push({
      id: "add-products-for-language",
      title: "Add enough products to compare shopper language",
      detail: "The planner needs at least two active products before it can judge coverage across alternatives.",
      priority: "critical",
      actionHref: "/dashboard/products",
      actionLabel: "Add products",
      evidence: `${plan.summary.activeProducts} active product${plan.summary.activeProducts === 1 ? "" : "s"} available.`,
    });
  }

  if (observedMissing.length) {
    actions.push({
      id: "add-missing-shopper-language",
      title: "Add missing shopper language to catalog facts",
      detail: "Search/advisor analytics include terms that are not directly present in product copy, tags, buyer needs or semantic text.",
      priority: "high",
      actionHref: "/dashboard/products",
      actionLabel: "Update products",
      evidence: observedMissing.slice(0, 4).map((term) => term.label).join(", "),
    });
  }

  if (weakestProducts.length) {
    actions.push({
      id: "fill-product-language-backlog",
      title: "Fill product-level discovery language",
      detail: "Products with missing buyer needs or semantic search text weaken AI explanations, search and generated quiz options.",
      priority: weakestProducts.length >= Math.max(2, plan.summary.activeProducts - 1) ? "medium" : "low",
      actionHref: "/dashboard/products",
      actionLabel: "Edit products",
      evidence: weakestProducts.map((audit) => `${audit.productName}: ${audit.missingFields.join(", ")}`).join(" · "),
    });
  }

  if (thinImportant.length) {
    actions.push({
      id: "strengthen-thin-shopper-terms",
      title: "Strengthen thin quiz and query terms",
      detail: "Important terms map to only one active product. Keep them if they should be narrow, or add equivalent facts to more relevant products.",
      priority: "medium",
      actionHref: "/dashboard/ontology",
      actionLabel: "Review ontology",
      evidence: thinImportant.slice(0, 4).map((term) => `${term.label} (${term.productCount})`).join(", "),
    });
  }

  if (plan.summary.synonymSuggestions >= 6) {
    actions.push({
      id: "approve-semantic-synonyms",
      title: "Approve synonym coverage for search and advisor",
      detail: "The planner found useful adjacent phrases. Add only the synonyms that are factually true for each product.",
      priority: "low",
      actionHref: "/dashboard/ontology",
      actionLabel: "Review synonyms",
      evidence: `${plan.summary.synonymSuggestions} synonym suggestions available.`,
    });
  }

  return actions.sort((a, b) => actionPriority(b) - actionPriority(a) || a.title.localeCompare(b.title)).slice(0, 5);
}

function buildSuggestedSearchPrompts(products: Product[], terms: ShopperLanguageTerm[]) {
  const active = products.filter((product) => product.active);
  const covered = terms.filter((term) => term.status !== "missing");
  const categories = unique(active.map((product) => product.category)).slice(0, 2);
  return unique([
    covered[0] ? `${covered[0].label.toLowerCase()} options` : "",
    covered[1] ? `Best ${covered[1].label.toLowerCase()} under £150` : "",
    categories[0] && covered[2] ? `${categories[0]} with ${covered[2].label.toLowerCase()}` : "",
    categories[1] ? `Compare ${categories[1].toLowerCase()} by comfort and value` : "",
  ]).slice(0, 4);
}

function termImportance({ term, weight }: { term: ShopperLanguageTerm; weight: number }) {
  let score = weight;
  if (term.sources.includes("analytics")) score += 40;
  if (term.sources.includes("quiz")) score += 16;
  if (term.sources.length > 1) score += 4;
  if (term.status === "missing") score += term.sources.includes("analytics") ? 35 : 8;
  if (term.status === "thin") score += 14;
  if (term.status === "covered") score += 10;
  score += term.productCount * 4 + term.semanticProductCount;
  return score;
}

export function buildShopperLanguagePlan({
  products,
  quizzes = [],
  events = [],
  maxTerms = 24,
}: {
  products: Product[];
  quizzes?: Quiz[];
  events?: AnalyticsEvent[];
  maxTerms?: number;
}): ShopperLanguagePlan {
  const active = products.filter((product) => product.active);
  const seeds = collectTerms(products, quizzes, events);
  const terms = seeds
    .map((seed) => ({ term: buildTerm(seed, products, active), weight: seed.weight }))
    .sort((a, b) => termImportance(b) - termImportance(a) || a.term.term.localeCompare(b.term.term))
    .slice(0, maxTerms)
    .map(({ term }) => term);
  const missingTerms = terms.filter((term) => term.status === "missing");
  const thinTerms = terms.filter((term) => term.status === "thin");
  const coveredTerms = terms.filter((term) => term.status === "covered");
  const observedTerms = terms.filter((term) => term.sources.includes("analytics"));
  const missingObservedTerms = observedTerms.filter((term) => term.status === "missing");
  const productAudits = active.map((product) => buildProductAudit(product, products)).sort((a, b) => a.score - b.score || a.productName.localeCompare(b.productName));
  const productsNeedingLanguage = productAudits.filter((audit) => audit.missingFields.length).length;
  const termScore = terms.length ? Math.round((coveredTerms.length + thinTerms.length * 0.55) / terms.length * 100) : active.length ? 55 : 0;
  const productScore = productAudits.length ? Math.round(productAudits.reduce((sum, audit) => sum + audit.score, 0) / productAudits.length) : 0;
  const observedScore = observedTerms.length ? Math.round((observedTerms.length - missingObservedTerms.length) / observedTerms.length * 100) : 72;
  const quizTerms = terms.filter((term) => term.sources.includes("quiz"));
  const quizTermsCovered = percentage(quizTerms.filter((term) => term.status !== "missing").length, quizTerms.length);
  const score = Math.round(termScore * 0.42 + productScore * 0.28 + observedScore * 0.2 + (quizTerms.length ? quizTermsCovered : 70) * 0.1);
  const summary = {
    activeProducts: active.length,
    totalTerms: terms.length,
    coveredTerms: coveredTerms.length,
    thinTerms: thinTerms.length,
    missingTerms: missingTerms.length,
    observedTerms: observedTerms.length,
    missingObservedTerms: missingObservedTerms.length,
    productsNeedingLanguage,
    synonymSuggestions: terms.reduce((sum, term) => sum + term.suggestedSynonyms.length, 0),
    quizTermsCovered,
  };
  const partialPlan = {
    score,
    summary,
    terms,
    missingTerms,
    thinTerms,
    productAudits,
    quizGuidance: buildQuizGuidance(terms, products, quizzes),
    suggestedSearchPrompts: buildSuggestedSearchPrompts(products, terms),
  };
  const actions = buildActions(partialPlan);
  const status: ShopperLanguageStatus = active.length < 2 || score < 45 ? "blocked" : score >= 82 && !missingObservedTerms.length ? "ready" : "needs-work";
  const headline = status === "ready"
    ? "Shopper language is covered across the catalog."
    : status === "blocked"
      ? "Catalog language is not ready for confident discovery."
      : "Shopper language needs a focused enrichment pass.";

  return {
    status,
    headline,
    ...partialPlan,
    actions,
  };
}
