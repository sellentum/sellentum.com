import type { Product } from "@/lib/types";

export type ProductSearchSignal = {
  term: string;
  source: "name" | "category" | "tag" | "feature" | "need" | "description" | "budget";
  contribution: number;
  detail: string;
};

export type ProductSearchResult = {
  product: Product;
  score: number;
  eligible: boolean;
  blockedReason?: string;
  matchedSignals: ProductSearchSignal[];
  explanation: string;
  confidence: "strong" | "medium" | "weak";
};

export type ProductSearchReport = {
  query: string;
  intent: {
    terms: string[];
    maxBudget: number | null;
  };
  totalProducts: number;
  activeProducts: number;
  eligibleProducts: number;
  blockedProducts: number;
  suggestions: string[];
  results: ProductSearchResult[];
};

const synonyms: Record<string, string[]> = {
  trail: ["outdoor", "outdoors", "hiking", "grip"],
  hiking: ["trail", "outdoor", "outdoors", "grip"],
  outdoor: ["trail", "hiking"],
  outdoors: ["trail", "hiking"],
  city: ["everyday", "travel", "commute"],
  comfortable: ["comfort", "cushion", "soft"],
  comfort: ["cushion", "soft", "stable"],
  cushioned: ["cushion", "soft", "comfort"],
  light: ["lightweight", "nimble"],
  lightweight: ["light", "nimble", "travel"],
  waterproof: ["water", "rain", "weather", "wet"],
  resistant: ["water", "weather"],
  wet: ["water", "rain", "weather", "waterproof"],
  fast: ["speed", "race", "responsive"],
  running: ["runner", "road", "trail"],
  travel: ["city", "commute", "everyday", "lightweight"],
};

const stopWords = new Set([
  "what",
  "which",
  "where",
  "when",
  "with",
  "that",
  "this",
  "have",
  "need",
  "want",
  "looking",
  "product",
  "products",
  "something",
  "show",
  "find",
  "under",
  "below",
  "than",
  "from",
  "about",
  "would",
  "could",
  "please",
  "some",
  "kind",
  "most",
  "best",
  "match",
  "matches",
  "help",
  "choose",
  "your",
  "you",
  "the",
  "and",
  "for",
  "are",
]);

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function stem(word: string) {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function formatCurrency(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function extractSearchIntentTokens(query: string) {
  const base = (normalize(query).match(/[a-z][a-z-]{1,}/g) || [])
    .map(stem)
    .filter((word) => !stopWords.has(word));
  return unique(base.flatMap((word) => [word, ...(synonyms[word] || [])]));
}

export function extractSearchBudget(query: string) {
  const match = query.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*[£$€]?\s*(\d+(?:\.\d+)?)/i) || query.match(/[£$€]\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function productFields(product: Product) {
  return [
    { source: "tag" as const, weight: 3.4, text: product.tags.join(" "), detail: "Matched product tags." },
    { source: "need" as const, weight: 3.2, text: (product.buyer_needs || []).join(" "), detail: "Matched enriched buyer needs." },
    { source: "feature" as const, weight: 2.6, text: product.features.join(" "), detail: "Matched product features." },
    { source: "name" as const, weight: 2.2, text: product.name, detail: "Matched the product name." },
    { source: "category" as const, weight: 2, text: product.category, detail: "Matched the product category." },
    { source: "description" as const, weight: 1.1, text: `${product.description} ${product.search_text || ""}`, detail: "Matched descriptive catalog language." },
  ];
}

function productCorpus(product: Product) {
  return productFields(product).map((field) => field.text).join(" ").toLowerCase();
}

function scoreProduct(product: Product, tokens: string[], maxBudget: number | null, documentFrequency: Record<string, number>, activeCount: number): ProductSearchResult {
  const matchedSignals: ProductSearchSignal[] = [];
  let score = 0;
  const blockedReason = !product.active
    ? "Product is inactive."
    : maxBudget !== null && product.price > maxBudget
      ? `${formatCurrency(product.price)} is above the ${formatCurrency(maxBudget)} search budget.`
      : undefined;

  for (const token of tokens) {
    for (const field of productFields(product)) {
      const text = normalize(field.text);
      if (!text.includes(token)) continue;
      const specificity = Math.log((activeCount + 1) / ((documentFrequency[token] || 0) + 1)) + 0.8;
      const contribution = Number((field.weight * specificity).toFixed(4));
      matchedSignals.push({
        term: token,
        source: field.source,
        contribution,
        detail: field.detail,
      });
      score += contribution;
    }
  }

  if (maxBudget !== null && product.active && product.price <= maxBudget) {
    const contribution = Number((1 + Math.max(0, 1 - product.price / maxBudget)).toFixed(4));
    matchedSignals.push({
      term: `≤ ${formatCurrency(maxBudget)}`,
      source: "budget",
      contribution,
      detail: `${formatCurrency(product.price)} is inside the shopper's stated budget.`,
    });
    score += contribution;
  }

  const uniqueSignals = Array.from(
    new Map(
      matchedSignals
        .sort((a, b) => b.contribution - a.contribution)
        .map((signal) => [`${signal.term}-${signal.source}`, signal]),
    ).values(),
  );
  const budgetSignals = uniqueSignals.filter((signal) => signal.source === "budget").slice(0, 1);
  const semanticSignalsToShow = uniqueSignals.filter((signal) => signal.source !== "budget").slice(0, budgetSignals.length ? 7 : 8);
  const dedupedSignals = [...semanticSignalsToShow, ...budgetSignals];
  const roundedScore = Number(score.toFixed(4));
  const semanticSignals = dedupedSignals.filter((signal) => signal.source !== "budget").slice(0, 3);
  const signalCopy = semanticSignals.map((signal) => signal.term).join(", ");
  const explanation = signalCopy
    ? `${product.name} ranks because the query maps to ${signalCopy} in its catalog data.`
    : maxBudget !== null && product.price <= maxBudget
      ? `${product.name} fits the stated budget, but the query has few catalog-specific signals.`
      : `${product.name} is active, but this query does not strongly match its catalog language.`;

  return {
    product,
    score: roundedScore,
    eligible: !blockedReason,
    blockedReason,
    matchedSignals: dedupedSignals,
    explanation,
    confidence: roundedScore >= 6 ? "strong" : roundedScore >= 2 ? "medium" : "weak",
  };
}

function buildSuggestions(products: Product[]) {
  const active = products.filter((product) => product.active);
  const tags = unique(active.flatMap((product) => [...(product.buyer_needs || []), ...product.tags])).slice(0, 3);
  const features = unique(active.flatMap((product) => product.features)).slice(0, 3);
  const categories = unique(active.map((product) => product.category)).slice(0, 2);
  return unique([
    tags[0] ? `${tags[0]} options` : "",
    features[0] ? `Products with ${features[0].toLowerCase()}` : "",
    categories[0] ? `Best ${categories[0].toLowerCase()} under £150` : "",
    tags[1] && features[1] ? `${tags[1]} with ${features[1].toLowerCase()}` : "",
  ]).slice(0, 4);
}

export function runSemanticProductSearch({ query, products, limit = 6 }: { query: string; products: Product[]; limit?: number }): ProductSearchReport {
  const trimmedQuery = query.trim();
  const terms = extractSearchIntentTokens(trimmedQuery);
  const maxBudget = extractSearchBudget(trimmedQuery);
  const active = products.filter((product) => product.active);
  const corpus = active.map(productCorpus);
  const documentFrequency = Object.fromEntries(terms.map((term) => [term, corpus.filter((text) => text.includes(term)).length]));
  const scored = products
    .map((product) => scoreProduct(product, terms, maxBudget, documentFrequency, Math.max(1, active.length)))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.product.price - b.product.price || a.product.name.localeCompare(b.product.name));
  const eligible = scored.filter((result) => result.eligible);
  const meaningfulResults = eligible.filter((result) => result.score > 0 || (!trimmedQuery && result.product.active));
  const results = (meaningfulResults.length ? meaningfulResults : eligible).slice(0, limit);

  return {
    query: trimmedQuery,
    intent: { terms, maxBudget },
    totalProducts: products.length,
    activeProducts: active.length,
    eligibleProducts: eligible.length,
    blockedProducts: scored.length - eligible.length,
    suggestions: buildSuggestions(products),
    results,
  };
}
