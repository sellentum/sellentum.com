import type { AnalyticsEvent, ExperienceType, Product } from "@/lib/types";
import { extractIntentTokens, getEventExperienceType } from "@/lib/utils";

export type DiscoveryGapSeverity = "critical" | "watch" | "info" | "win";

export type DiscoveryTermGap = {
  term: string;
  count: number;
  coverage: "missing" | "thin";
  matchingProducts: number;
  sources: ExperienceType[];
  exampleQueries: string[];
  lastSeen: string;
};

export type DiscoveryProductGap = {
  productId?: string;
  productName: string;
  recommended: number;
  clicks: number;
  clickRate: number;
  sources: ExperienceType[];
};

export type DiscoveryGapAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  severity: DiscoveryGapSeverity;
  actionHref: string;
  actionLabel: string;
};

export type DiscoveryGapReport = {
  status: "healthy" | "watch" | "needs-attention";
  score: number;
  summary: {
    totalGapSignals: number;
    zeroResultJourneys: number;
    thinResultJourneys: number;
    missingTermSignals: number;
    lowConfidenceRecommendations: number;
    stalledProducts: number;
  };
  termGaps: DiscoveryTermGap[];
  productGaps: DiscoveryProductGap[];
  actions: DiscoveryGapAction[];
  strengths: string[];
};

type TermGapDraft = Omit<DiscoveryTermGap, "sources" | "exampleQueries"> & {
  sources: Set<ExperienceType>;
  exampleQueries: Set<string>;
};

type ProductGapDraft = Omit<DiscoveryProductGap, "sources" | "clickRate"> & {
  sources: Set<ExperienceType>;
};

const stopWords = new Set([
  "about", "after", "also", "best", "brand", "brands", "buy", "can", "could", "find", "for", "from", "give", "good", "have", "help", "into", "like", "looking", "match", "me", "need", "please", "product", "products", "recommend", "show", "some", "something", "that", "the", "them", "this", "under", "want", "what", "when", "where", "which", "with", "would", "your",
]);

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .trim();
}

function stemWord(word: string) {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) return word.slice(0, -1);
  return word;
}

function tokenize(value: string) {
  return [...new Set((normalizeWord(value).match(/[a-z][a-z-]{2,}/g) || [])
    .map(stemWord)
    .filter((word) => !stopWords.has(word)))];
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

function buildCatalogTermCoverage(products: Product[]) {
  const activeProducts = products.filter((product) => product.active);
  const vocabulary = new Set<string>();
  const productTokens = activeProducts.map((product) => {
    const tokens = tokenize(productText(product));
    tokens.forEach((token) => vocabulary.add(token));
    return { product, tokens: new Set(tokens), text: normalizeWord(productText(product)) };
  });

  return {
    activeProducts,
    coverage(term: string) {
      const normalized = normalizeWord(term);
      const tokens = tokenize(normalized);
      if (!normalized || !tokens.length) return 0;
      return productTokens.filter((entry) => {
        if (entry.text.includes(normalized)) return true;
        return tokens.some((token) => entry.tokens.has(token) || vocabulary.has(token) && entry.text.includes(token));
      }).length;
    },
  };
}

function eventQuery(event: AnalyticsEvent) {
  return text(event.metadata?.query);
}

function eventTerms(event: AnalyticsEvent) {
  const terms = stringArray(event.metadata?.terms);
  const query = eventQuery(event);
  const queryTerms = query ? extractIntentTokens(query) : [];
  return [...new Set([...terms, ...queryTerms].map(normalizeWord).filter((term) => term && !stopWords.has(term)))];
}

function hasNoResults(event: AnalyticsEvent) {
  const resultCount = numberValue(event.metadata?.result_count);
  const advisorStatus = text(event.metadata?.advisor_status);
  const recoveryStatus = text(event.metadata?.recovery_status);
  if (advisorStatus === "clarifying") return false;
  return recoveryStatus === "no-results" || resultCount === 0 || text(event.metadata?.error) === "recommendation_failed";
}

function hasThinResults(event: AnalyticsEvent) {
  const resultCount = numberValue(event.metadata?.result_count);
  const recoveryStatus = text(event.metadata?.recovery_status);
  if (hasNoResults(event)) return false;
  return recoveryStatus === "thin-results" || (resultCount !== null && resultCount > 0 && resultCount < 3);
}

function isLowConfidenceRecommendation(event: AnalyticsEvent) {
  if (event.event_type !== "product_recommended") return false;
  const confidence = text(event.metadata?.confidence).toLowerCase();
  const score = numberValue(event.metadata?.score);
  return confidence === "low" || (score !== null && score > 0 && score < 1);
}

function productName(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return text(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || event.product_id || "";
}

function productKey(event: AnalyticsEvent, name: string) {
  return event.product_id || normalizeWord(name);
}

function addTermGap(map: Map<string, TermGapDraft>, term: string, event: AnalyticsEvent, matchingProducts: number, coverage: DiscoveryTermGap["coverage"]) {
  const cleanTerm = normalizeWord(term);
  if (!cleanTerm || stopWords.has(cleanTerm)) return;
  const source = getEventExperienceType(event);
  const query = eventQuery(event);
  const existing = map.get(cleanTerm) || {
    term: cleanTerm,
    count: 0,
    coverage,
    matchingProducts,
    sources: new Set<ExperienceType>(),
    exampleQueries: new Set<string>(),
    lastSeen: event.created_at,
  };
  existing.count += 1;
  existing.coverage = existing.coverage === "missing" || coverage === "missing" ? "missing" : "thin";
  existing.matchingProducts = Math.min(existing.matchingProducts, matchingProducts);
  existing.sources.add(source);
  if (query) existing.exampleQueries.add(query);
  if (new Date(event.created_at).getTime() > new Date(existing.lastSeen).getTime()) existing.lastSeen = event.created_at;
  map.set(cleanTerm, existing);
}

function addProductDemand(map: Map<string, ProductGapDraft>, event: AnalyticsEvent, productsById: Map<string, Product>) {
  if (event.event_type !== "product_recommended" && event.event_type !== "buy_click") return;
  const name = productName(event, productsById);
  if (!name) return;
  const key = productKey(event, name);
  const existing = map.get(key) || {
    productId: event.product_id,
    productName: name,
    recommended: 0,
    clicks: 0,
    sources: new Set<ExperienceType>(),
  };
  if (event.event_type === "product_recommended") existing.recommended += 1;
  if (event.event_type === "buy_click") existing.clicks += 1;
  existing.sources.add(getEventExperienceType(event));
  map.set(key, existing);
}

function buildActions(report: Omit<DiscoveryGapReport, "actions" | "strengths">): DiscoveryGapAction[] {
  const actions: DiscoveryGapAction[] = [];
  const topTerm = report.termGaps[0];
  const topProduct = report.productGaps[0];

  if (report.summary.zeroResultJourneys) {
    actions.push({
      id: "fix-no-result-paths",
      title: "Fix no-result shopper paths",
      detail: `${report.summary.zeroResultJourneys} journey${report.summary.zeroResultJourneys === 1 ? "" : "s"} ended without a recommendation.`,
      evidence: "Detected from result_count=0, finder recovery status, or recommendation failure metadata.",
      recommendation: "Open the Recommendation Lab, replay those paths, then loosen blocking rules or widen catalog coverage before sending paid traffic.",
      severity: "critical",
      actionHref: "/dashboard/lab",
      actionLabel: "Debug paths",
    });
  }

  if (report.summary.thinResultJourneys) {
    actions.push({
      id: "deepen-thin-results",
      title: "Deepen thin recommendation sets",
      detail: `${report.summary.thinResultJourneys} journey${report.summary.thinResultJourneys === 1 ? "" : "s"} returned fewer than three options.`,
      evidence: "Thin results reduce comparison confidence and make merchandising brittle.",
      recommendation: "Add alternate products to the mapped category/tags or make one answer preference-only instead of a hard constraint.",
      severity: "watch",
      actionHref: "/dashboard/quizzes",
      actionLabel: "Tune finder rules",
    });
  }

  if (topTerm) {
    actions.push({
      id: "add-missing-shopper-language",
      title: `Add shopper language for “${topTerm.term}”`,
      detail: `${topTerm.count} signal${topTerm.count === 1 ? "" : "s"} mention ${topTerm.coverage === "missing" ? "uncatalogued" : "thinly-covered"} language.`,
      evidence: topTerm.exampleQueries[0] ? `Example query: “${topTerm.exampleQueries[0]}”.` : `${topTerm.matchingProducts} active product${topTerm.matchingProducts === 1 ? "" : "s"} currently cover this term.`,
      recommendation: "Add the term to relevant tags, buyer needs or semantic search text, then validate the query in Search Lab.",
      severity: topTerm.coverage === "missing" ? "critical" : "watch",
      actionHref: "/dashboard/products",
      actionLabel: "Update catalog",
    });
  }

  if (report.summary.lowConfidenceRecommendations) {
    actions.push({
      id: "raise-search-confidence",
      title: "Raise low-confidence semantic matches",
      detail: `${report.summary.lowConfidenceRecommendations} recommendation${report.summary.lowConfidenceRecommendations === 1 ? "" : "s"} had weak confidence or a very low score.`,
      evidence: "Detected from recommendation confidence/score metadata in search and advisor journeys.",
      recommendation: "Use Search Lab to inspect parsed terms, then enrich product descriptions and buyer needs for the weak concepts.",
      severity: "watch",
      actionHref: "/dashboard/search",
      actionLabel: "Open Search Lab",
    });
  }

  if (topProduct) {
    actions.push({
      id: "improve-stalled-products",
      title: `Improve conversion for ${topProduct.productName}`,
      detail: `${topProduct.productName} was surfaced ${topProduct.recommended} times with ${Math.round(topProduct.clickRate)}% buy-click rate.`,
      evidence: "Detected by comparing product_recommended events with buy_click events.",
      recommendation: "Check the image, product URL, price confidence and explanation copy before changing the ranking model.",
      severity: "info",
      actionHref: "/dashboard/products",
      actionLabel: "Review product",
    });
  }

  return actions.slice(0, 5);
}

function buildStrengths(report: Omit<DiscoveryGapReport, "actions" | "strengths">) {
  const strengths: string[] = [];
  if (!report.summary.zeroResultJourneys) strengths.push("No hard no-result journeys detected for this filter.");
  if (!report.summary.missingTermSignals) strengths.push("Captured shopper terms are covered by the active catalog.");
  if (!report.summary.lowConfidenceRecommendations) strengths.push("No low-confidence recommendations detected.");
  if (!report.summary.stalledProducts) strengths.push("No repeatedly surfaced product is showing a severe click-through gap.");
  return strengths;
}

export function buildDiscoveryGapReport(events: AnalyticsEvent[], products: Product[] = []): DiscoveryGapReport {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const catalogCoverage = buildCatalogTermCoverage(products);
  const termGaps = new Map<string, TermGapDraft>();
  const productDemand = new Map<string, ProductGapDraft>();
  let zeroResultJourneys = 0;
  let thinResultJourneys = 0;
  let lowConfidenceRecommendations = 0;

  for (const event of events) {
    if (hasNoResults(event)) zeroResultJourneys += 1;
    if (hasThinResults(event)) thinResultJourneys += 1;
    if (isLowConfidenceRecommendation(event)) lowConfidenceRecommendations += 1;
    addProductDemand(productDemand, event, productsById);

    for (const term of eventTerms(event)) {
      const matches = catalogCoverage.coverage(term);
      if (matches === 0) addTermGap(termGaps, term, event, matches, "missing");
      else if (matches === 1 && catalogCoverage.activeProducts.length >= 3) addTermGap(termGaps, term, event, matches, "thin");
    }
  }

  const normalizedTermGaps = [...termGaps.values()]
    .map((item) => ({
      ...item,
      sources: [...item.sources].sort(),
      exampleQueries: [...item.exampleQueries].slice(0, 3),
    }))
    .sort((a, b) => Number(b.coverage === "missing") - Number(a.coverage === "missing") || b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 8);

  const productGaps = [...productDemand.values()]
    .map((item) => {
      const clickRate = item.recommended ? item.clicks / item.recommended * 100 : item.clicks ? 100 : 0;
      return { ...item, sources: [...item.sources].sort(), clickRate: Math.round(clickRate * 10) / 10 };
    })
    .filter((item) => item.recommended >= 2 && item.clickRate < 20)
    .sort((a, b) => b.recommended - a.recommended || a.clickRate - b.clickRate || a.productName.localeCompare(b.productName))
    .slice(0, 5);

  const missingTermSignals = normalizedTermGaps.reduce((sum, item) => sum + item.count, 0);
  const totalGapSignals = zeroResultJourneys + thinResultJourneys + missingTermSignals + lowConfidenceRecommendations + productGaps.length;
  const score = Math.max(0, Math.round(100
    - Math.min(45, zeroResultJourneys * 18)
    - Math.min(24, thinResultJourneys * 8)
    - Math.min(25, missingTermSignals * 4)
    - Math.min(20, lowConfidenceRecommendations * 5)
    - Math.min(20, productGaps.length * 8)));
  const status: DiscoveryGapReport["status"] = zeroResultJourneys || score < 60 ? "needs-attention" : totalGapSignals || score < 90 ? "watch" : "healthy";

  const baseReport = {
    status,
    score,
    summary: {
      totalGapSignals,
      zeroResultJourneys,
      thinResultJourneys,
      missingTermSignals,
      lowConfidenceRecommendations,
      stalledProducts: productGaps.length,
    },
    termGaps: normalizedTermGaps,
    productGaps,
  };

  return {
    ...baseReport,
    actions: buildActions(baseReport),
    strengths: buildStrengths(baseReport),
  };
}
