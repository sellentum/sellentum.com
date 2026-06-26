import type { ConversationalMatch, Product } from "@/lib/types";

export type AdvisorRecoveryStatus = "healthy" | "clarify" | "needs-refinement" | "no-results";

export type AdvisorRecoverySuggestion = {
  id: string;
  title: string;
  detail: string;
  prompt?: string;
  severity: "critical" | "helpful" | "info";
};

export type AdvisorRecoveryNearMiss = {
  productId: string;
  productName: string;
  price: number;
  category: string;
  imageUrl: string;
  productUrl: string;
  reason: string;
  matchedSignals: string[];
};

export type AdvisorRecoveryReport = {
  status: AdvisorRecoveryStatus;
  summary: string;
  primaryAction: string;
  missingTerms: string[];
  thinTerms: string[];
  budgetBlocked: boolean;
  suggestions: AdvisorRecoverySuggestion[];
  nearMisses: AdvisorRecoveryNearMiss[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stripBudgetLanguage(value: string) {
  return value
    .replace(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*[£$€]?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/[£$€]\s*\d+(?:\.\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function productText(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" "));
}

function productSignals(product: Product, terms: string[]) {
  const text = productText(product);
  return unique(terms.filter((term) => text.includes(normalize(term)))).slice(0, 5);
}

function fallbackPrompt(products: Product[]) {
  const active = products.filter((product) => product.active);
  const needs = unique(active.flatMap((product) => [...(product.buyer_needs || []), ...product.tags])).slice(0, 2);
  const categories = unique(active.map((product) => product.category)).slice(0, 1);
  return unique([...needs, ...categories]).join(" ") || "Show me the best match";
}

function mapNearMiss(product: Product, terms: string[], reason: string): AdvisorRecoveryNearMiss {
  return {
    productId: product.id,
    productName: product.name,
    price: product.price,
    category: product.category,
    imageUrl: product.image_url,
    productUrl: product.product_url,
    reason,
    matchedSignals: productSignals(product, terms),
  };
}

export function buildAdvisorRecoveryReport({
  query,
  products,
  intent,
  matches,
  status,
  clarifyingOptions = [],
}: {
  query: string;
  products: Product[];
  intent: { maxBudget: number | null; terms: string[] };
  matches: ConversationalMatch[];
  status: "clarifying" | "recommendations";
  clarifyingOptions?: string[];
}): AdvisorRecoveryReport {
  const active = products.filter((product) => product.active);
  const terms = unique(intent.terms.map(normalize).filter(Boolean));
  const coverage = terms.map((term) => ({ term, count: active.filter((product) => productText(product).includes(term)).length }));
  const missingTerms = coverage.filter((item) => item.count === 0).map((item) => item.term);
  const thinTerms = coverage.filter((item) => item.count === 1 && active.length >= 3).map((item) => item.term);
  const budgetBlockedProducts = intent.maxBudget === null ? [] : active.filter((product) => product.price > intent.maxBudget!);
  const budgetBlocked = budgetBlockedProducts.length > 0;
  const topScore = matches[0]?.score || 0;
  const weakMatch = matches.length > 0 && topScore < 1.5;
  const noResults = status === "recommendations" && matches.length === 0;
  const recoveryStatus: AdvisorRecoveryStatus = status === "clarifying"
    ? "clarify"
    : noResults
      ? "no-results"
      : missingTerms.length || thinTerms.length || weakMatch
        ? "needs-refinement"
        : "healthy";

  const suggestions: AdvisorRecoverySuggestion[] = [];

  if (status === "clarifying") {
    for (const option of clarifyingOptions.slice(0, 4)) {
      suggestions.push({
        id: `clarify-${normalize(option)}`,
        title: option,
        detail: "Use this catalog-backed signal to narrow the advisor conversation.",
        prompt: option,
        severity: "helpful",
      });
    }
  }

  if (budgetBlocked && (noResults || matches.length < 2)) {
    suggestions.push({
      id: "relax-budget",
      title: "Widen or remove the budget",
      detail: `${budgetBlockedProducts.length} active product${budgetBlockedProducts.length === 1 ? "" : "s"} sit above the stated budget.`,
      prompt: stripBudgetLanguage(query) || fallbackPrompt(products),
      severity: noResults ? "critical" : "helpful",
    });
  }

  if (missingTerms.length) {
    suggestions.push({
      id: "broaden-missing-language",
      title: `Broaden ${missingTerms.slice(0, 3).join(", ")}`,
      detail: "Those words are not present in the active catalog, so Findly has no deterministic evidence for them.",
      prompt: terms.filter((term) => !missingTerms.includes(term)).slice(0, 4).join(" ") || fallbackPrompt(products),
      severity: noResults ? "critical" : "helpful",
    });
  }

  if (thinTerms.length) {
    suggestions.push({
      id: "broaden-thin-language",
      title: `Use broader wording for ${thinTerms.slice(0, 3).join(", ")}`,
      detail: "These terms only map to one active product, which limits comparison depth.",
      prompt: fallbackPrompt(products),
      severity: "helpful",
    });
  }

  if (weakMatch && !suggestions.length) {
    suggestions.push({
      id: "add-more-context",
      title: "Add a use case or must-have feature",
      detail: "The top recommendation is weak because the request has sparse catalog-backed evidence.",
      prompt: fallbackPrompt(products),
      severity: "helpful",
    });
  }

  const nearMisses = [
    ...budgetBlockedProducts
      .filter((product) => productSignals(product, terms).length || noResults)
      .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
      .slice(0, 3)
      .map((product) => mapNearMiss(product, terms, intent.maxBudget ? `Above the stated £${intent.maxBudget} budget.` : "Outside the current constraints.")),
    ...(recoveryStatus === "needs-refinement" && !budgetBlockedProducts.length
      ? matches.filter((match) => match.score < 1.5).slice(0, 2).map((match) => mapNearMiss(match.product, terms, "Weak catalog evidence for the current wording."))
      : []),
  ].slice(0, 3);

  const summary = recoveryStatus === "healthy"
    ? "The advisor has enough catalog evidence for a confident recommendation."
    : recoveryStatus === "clarify"
      ? "The request is still broad, so one more shopper preference will improve the recommendation."
      : recoveryStatus === "no-results"
        ? "No eligible product matched the current constraints, but Findly can suggest safer next prompts."
        : "The advisor returned matches, but the request has weak or thin catalog evidence.";

  return {
    status: recoveryStatus,
    summary,
    primaryAction: suggestions[0]?.title || (recoveryStatus === "healthy" ? "Keep testing live shopper questions" : "Try a broader prompt"),
    missingTerms,
    thinTerms,
    budgetBlocked,
    suggestions: suggestions.slice(0, 4),
    nearMisses,
  };
}
