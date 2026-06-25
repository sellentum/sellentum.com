import type { AnalyticsEvent, Configurator, ConfiguratorOption, ExperienceType, FinderAnswer, Product, ProductMatchAudit, Recommendation, RecommendationComparison, RecommendationOverride } from "@/lib/types";

export type RecommendationScoringOptions = {
  overrides?: RecommendationOverride[];
  semanticScoresByProductId?: Record<string, number>;
  semanticSource?: "pgvector";
  enableBuyerProfile?: boolean;
};

type RecommendationScoringInput = RecommendationOverride[] | RecommendationScoringOptions;

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

export function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function getEventExperienceType(event: Pick<AnalyticsEvent, "metadata" | "quiz_id">): ExperienceType {
  const value = event.metadata?.experience_type;
  if (value === "assistant" || value === "configurator" || value === "finder") return value;
  if (event.quiz_id.startsWith("config_")) return "configurator";
  return "finder";
}

export function filterEventsByExperience<T extends Pick<AnalyticsEvent, "metadata" | "quiz_id">>(events: T[], filter: ExperienceType | "all") {
  return filter === "all" ? events : events.filter((event) => getEventExperienceType(event) === filter);
}

export function getSelectedBudgetCeiling(answers: FinderAnswer[]) {
  const selectedBudgets = answers
    .filter((answer) => answer.matchType === "budget_max")
    .map((answer) => Number(answer.matchValue))
    .filter((value) => Number.isFinite(value) && value > 0);
  return selectedBudgets.length ? Math.min(...selectedBudgets) : null;
}

const intentSynonyms: Record<string, string[]> = {
  trail: ["outdoor", "hiking", "grip"],
  hiking: ["trail", "outdoor", "grip"],
  outdoor: ["trail", "hiking"],
  city: ["everyday", "travel", "commute"],
  comfortable: ["comfort", "cushion", "soft"],
  comfort: ["cushion", "soft", "stable"],
  cushioned: ["cushion", "soft", "comfort"],
  light: ["lightweight", "nimble"],
  waterproof: ["water", "rain", "weather", "wet"],
  wet: ["water", "rain", "weather"],
  fast: ["speed", "race", "responsive"],
  running: ["runner", "road", "trail"],
  travel: ["city", "commute", "everyday"],
};

const intentStopWords = new Set(["what", "which", "where", "when", "with", "that", "this", "have", "need", "want", "wear", "wearing", "looking", "product", "products", "something", "show", "find", "under", "than", "from", "about", "would", "could", "please", "some", "kind", "most", "best", "match", "matches", "hoping", "help", "your", "you", "the", "and", "for", "are", "will", "them"]);

export function extractIntentTokens(value: string) {
  const base = (value.toLowerCase().match(/[a-z][a-z-]{1,}/g) || [])
    .map((word) => word.endsWith("ies") && word.length > 4 ? `${word.slice(0, -3)}y` : word.endsWith("s") && !word.endsWith("ss") && word.length > 3 ? word.slice(0, -1) : word)
    .filter((word) => !intentStopWords.has(word));
  return [...new Set(base.flatMap((word) => [word, ...(intentSynonyms[word] || [])]))];
}

export function buildFinderBuyerProfile(answers: FinderAnswer[]) {
  return answers
    .map((answer) => {
      const values = [answer.question, answer.answer];
      if (answer.matchType !== "budget_max" && answer.matchType !== "none" && answer.matchValue && answer.matchValue.toLowerCase() !== answer.answer.toLowerCase()) values.push(answer.matchValue);
      return values.join(": ");
    })
    .join(". ");
}

function productIntentFields(product: Product) {
  const tags = product.tags.join(" ").toLowerCase();
  const needs = (product.buyer_needs || []).join(" ").toLowerCase();
  const features = product.features.join(" ").toLowerCase();
  const category = product.category.toLowerCase();
  const descriptive = `${product.name} ${product.description} ${product.search_text || ""}`.toLowerCase();
  return { tags, needs, features, category, descriptive, all: `${tags} ${needs} ${features} ${category} ${descriptive}` };
}

function scoreBuyerProfileForProduct(product: Product, answers: FinderAnswer[], semanticSimilarity?: number) {
  const buyerProfile = buildFinderBuyerProfile(answers);
  const tokens = extractIntentTokens(buyerProfile);
  if (!buyerProfile || !tokens.length) return null;
  const fields = productIntentFields(product);
  const lexicalSignals = tokens.flatMap((term) => {
    if (!fields.all.includes(term)) return [];
    const contribution =
      fields.tags.includes(term) || fields.needs.includes(term) ? 0.9 :
        fields.features.includes(term) ? 0.7 :
          fields.category.includes(term) ? 0.45 :
            0.3;
    return [{ term, contribution }];
  });
  const deduped = Array.from(new Map(lexicalSignals.sort((a, b) => b.contribution - a.contribution).map((signal) => [signal.term, signal])).values()).slice(0, 8);
  const lexicalScore = Math.min(5, deduped.reduce((sum, signal) => sum + signal.contribution, 0));
  const semanticScore = semanticSimilarity ? Math.max(0, Math.min(1, semanticSimilarity)) * 4 : 0;
  const score = Number((lexicalScore + semanticScore).toFixed(4));
  if (score <= 0) return null;
  return { buyerProfile, score, semanticScore, signals: deduped.map((signal) => signal.term) };
}

function normalizedOverrideWeight(weight: number) {
  return Math.max(1, Math.min(50, Number.isFinite(weight) ? weight : 1));
}

function overrideReason(override: RecommendationOverride) {
  const note = typeof override.note === "string" ? override.note.trim() : "";
  if (note) return note;
  if (override.action === "pin") return "Pinned recommendation";
  if (override.action === "boost") return "Merchandising boost";
  return "Merchandising exclusion";
}

function normalizeScoringOptions(scoring?: RecommendationScoringInput): RecommendationScoringOptions {
  if (Array.isArray(scoring)) return { overrides: scoring };
  return scoring || {};
}

export function auditProductMatch(product: Product, answers: FinderAnswer[], scoring?: RecommendationScoringInput): ProductMatchAudit {
  const options = normalizeScoringOptions(scoring);
  const overrides = options.overrides || [];
  const budgetCeiling = getSelectedBudgetCeiling(answers);
  const productOverrides = overrides.filter((override) => override.product_id === product.id);
  const exclusion = productOverrides.find((override) => override.action === "exclude");
  const blockedReason = !product.active
    ? "Product is inactive and hidden from recommendations."
    : exclusion
      ? overrideReason(exclusion)
      : budgetCeiling !== null && product.price > budgetCeiling
        ? `Above the selected ${formatCurrency(budgetCeiling)} budget.`
        : undefined;

  let score = 0;
  const matchedReasons: string[] = [];
  const signals: ProductMatchAudit["signals"] = answers.map((answer) => {
    const value = answer.matchValue.toLowerCase().trim();
    let matched = false;
    let contribution = 0;
    let note = "No matching product signal found.";

    if (answer.matchType === "tag") {
      matched = product.tags.some((tag) => tag.toLowerCase() === value) || (product.buyer_needs || []).some((need) => need.toLowerCase() === value);
      note = matched ? "Matched a product tag or buyer need." : "No exact tag or buyer-need match.";
    } else if (answer.matchType === "category") {
      matched = product.category.toLowerCase() === value;
      note = matched ? "Matched the product category." : `Product category is ${product.category || "blank"}.`;
    } else if (answer.matchType === "feature") {
      matched = product.features.some((feature) => feature.toLowerCase().includes(value));
      note = matched ? "Matched a product feature." : "No feature contains this value.";
    } else if (answer.matchType === "budget_max") {
      const budget = Number(value);
      matched = Number.isFinite(budget) && product.price <= budget;
      note = matched ? `${formatCurrency(product.price)} is within ${formatCurrency(budget)}.` : `${formatCurrency(product.price)} is above ${formatCurrency(budget || 0)}.`;
      if (matched && budget > 0) contribution += Math.max(0, 1 - product.price / budget);
    } else if (answer.matchType === "none") {
      matched = true;
      note = "Preference-only answer; keeps every product eligible.";
    }

    if (matched) {
      contribution += Math.max(1, answer.weight);
      if (answer.matchType !== "none") matchedReasons.push(answer.answer);
    }

    score += contribution;
    return { answer: answer.answer, matchType: answer.matchType, matchValue: answer.matchValue, matched, contribution, note, source: "answer_rule" as const };
  });

  const intentMatch = options.enableBuyerProfile === false ? null : scoreBuyerProfileForProduct(product, answers, options.semanticScoresByProductId?.[product.id]);
  if (intentMatch) {
    score += intentMatch.score;
    const signalSummary = intentMatch.signals.slice(0, 4).join(", ");
    if (signalSummary) matchedReasons.push(`Buyer profile: ${signalSummary}`);
    signals.push({
      answer: options.semanticSource === "pgvector" && intentMatch.semanticScore > 0 ? "Semantic buyer profile" : "Buyer profile match",
      matchType: "none",
      matchValue: intentMatch.buyerProfile,
      matched: true,
      contribution: intentMatch.score,
      note: options.semanticSource === "pgvector" && intentMatch.semanticScore > 0
        ? `Matched the shopper's answer profile to enriched product data with pgvector similarity${signalSummary ? ` plus lexical signals: ${signalSummary}.` : "."}`
        : `Matched the shopper's answer profile to product language${signalSummary ? `: ${signalSummary}.` : "."}`,
      source: options.semanticSource === "pgvector" && intentMatch.semanticScore > 0 ? "pgvector" : "buyer_profile",
    });
  }

  for (const override of productOverrides) {
    if (override.action === "exclude") {
      signals.push({
        answer: "Merchandising exclusion",
        matchType: "none",
        matchValue: product.id,
        matched: false,
        contribution: 0,
        note: overrideReason(override),
        source: "merchandising",
      });
      continue;
    }

    const weight = normalizedOverrideWeight(override.weight);
    const contribution = override.action === "pin" ? 1000 + weight : weight;
    score += contribution;
    matchedReasons.push(overrideReason(override));
    signals.push({
      answer: override.action === "pin" ? "Pinned by merchant" : "Boosted by merchant",
      matchType: "none",
      matchValue: product.id,
      matched: true,
      contribution,
      note: override.action === "pin" ? `${overrideReason(override)}. Pinning adds top-ranking priority after hard filters.` : `${overrideReason(override)}. Boosting adds ${weight} merchandising point${weight === 1 ? "" : "s"}.`,
      source: "merchandising",
    });
  }

  return { product, eligible: !blockedReason, blockedReason, score, matchedReasons, signals };
}

export function auditProductMatches(products: Product[], answers: FinderAnswer[], scoring?: RecommendationScoringInput) {
  return products
    .map((product) => auditProductMatch(product, answers, scoring))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.product.price - b.product.price || a.product.name.localeCompare(b.product.name));
}

export function recommendProducts(products: Product[], answers: FinderAnswer[], limit = 3, scoring?: RecommendationScoringInput): Recommendation[] {
  return auditProductMatches(products, answers, scoring)
    .filter((match) => match.eligible)
    .slice(0, limit)
    .map(({ product, score, matchedReasons }) => ({ product, score, matchedReasons }));
}

const ignoredComparisonReasons = new Set(["pinned recommendation", "merchandising boost", "merchandising exclusion"]);

function normalizeComparisonSignal(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function humanizeComparisonSignal(value: string) {
  const normalized = normalizeComparisonSignal(value);
  if (!normalized) return "";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cleanComparisonReason(value: string) {
  const cleaned = value.replace(/^Buyer profile:\s*/i, "").trim();
  if (!cleaned || ignoredComparisonReasons.has(cleaned.toLowerCase())) return "";
  return humanizeComparisonSignal(cleaned);
}

function comparisonSignals(product: Product) {
  return uniqueValues([
    ...product.features,
    ...(product.buyer_needs || []),
    ...product.tags,
    product.category,
  ].map(humanizeComparisonSignal));
}

export function compareFinderRecommendations(recommendations: Recommendation[]): RecommendationComparison[] {
  if (!recommendations.length) return [];

  const prices = recommendations.map((recommendation) => recommendation.product.price).filter((price) => Number.isFinite(price));
  const cheapestPrice = prices.length ? Math.min(...prices) : 0;
  const highestPrice = prices.length ? Math.max(...prices) : 0;
  const maxFeatureCount = Math.max(...recommendations.map((recommendation) => recommendation.product.features.filter(Boolean).length), 0);
  const signalCounts = new Map<string, number>();

  for (const recommendation of recommendations) {
    const signals = new Set(comparisonSignals(recommendation.product).map(normalizeComparisonSignal));
    for (const signal of signals) signalCounts.set(signal, (signalCounts.get(signal) || 0) + 1);
  }

  return recommendations.map((recommendation, index) => {
    const { product } = recommendation;
    const cleanedReasons = recommendation.matchedReasons.map(cleanComparisonReason).filter(Boolean);
    const productSignals = comparisonSignals(product);
    const uniqueSignal = productSignals.find((signal) => signalCounts.get(normalizeComparisonSignal(signal)) === 1);
    const standout = uniqueSignal || humanizeComparisonSignal(product.features[0] || product.category || product.tags[0] || "Balanced fit");
    const bestFor = cleanedReasons[0] || humanizeComparisonSignal(product.buyer_needs?.[0] || product.tags[0] || product.category || (index === 0 ? "Best overall fit" : "A close alternative"));

    let tradeoff = "Comparable price and detail level across this match set.";
    if (recommendations.length === 1) {
      tradeoff = "Only top match found for this answer set.";
    } else if (product.price > cheapestPrice) {
      tradeoff = `Costs ${formatCurrency(product.price - cheapestPrice)} more than the lowest-priced match.`;
    } else if (highestPrice > cheapestPrice && product.features.filter(Boolean).length < maxFeatureCount) {
      tradeoff = "Lower price, with fewer listed feature signals than the most detailed match.";
    } else if (product.price === cheapestPrice) {
      tradeoff = "Lowest-priced match in this result set.";
    }

    const proofPoints = uniqueValues([
      product.category ? `Category: ${humanizeComparisonSignal(product.category)}` : "",
      ...product.features.slice(0, 2).map((feature) => `Feature: ${humanizeComparisonSignal(feature)}`),
      ...(product.buyer_needs || []).slice(0, 1).map((need) => `Need: ${humanizeComparisonSignal(need)}`),
      ...product.tags.slice(0, 1).map((tag) => `Tag: ${humanizeComparisonSignal(tag)}`),
    ]).slice(0, 3);

    return {
      productId: product.id,
      bestFor,
      standout,
      tradeoff,
      proofPoints: proofPoints.length ? proofPoints : ["Matched your selected answers"],
    };
  });
}

export function flattenConfiguratorOptions(configurator: Configurator) {
  return configurator.steps.flatMap((step) => step.options);
}

export function getConfiguratorOption(configurator: Configurator, optionId: string) {
  return flattenConfiguratorOptions(configurator).find((option) => option.id === optionId);
}

export function optionConflictsWithSelection(option: ConfiguratorOption, selectedIds: string[], configurator: Configurator) {
  return selectedIds.some((selectedId) => {
    if (selectedId === option.id) return false;
    const selected = getConfiguratorOption(configurator, selectedId);
    return option.incompatible_option_ids.includes(selectedId) || Boolean(selected?.incompatible_option_ids.includes(option.id));
  });
}

export function updateConfiguratorSelection(configurator: Configurator, selectedIds: string[], stepId: string, optionId: string) {
  const step = configurator.steps.find((item) => item.id === stepId);
  const option = step?.options.find((item) => item.id === optionId);
  if (!step || !option) return selectedIds;

  const stepOptionIds = step.options.map((item) => item.id);
  const alreadySelected = selectedIds.includes(optionId);
  let next = selectedIds;

  if (step.selection_type === "single") {
    next = [...selectedIds.filter((id) => !stepOptionIds.includes(id)), optionId];
  } else if (alreadySelected) {
    next = selectedIds.filter((id) => id !== optionId);
  } else {
    next = [...selectedIds, optionId];
  }

  const added = getConfiguratorOption(configurator, optionId);
  if (!added || alreadySelected) return next;
  return next.filter((id) => {
    if (id === optionId) return true;
    const current = getConfiguratorOption(configurator, id);
    return !added.incompatible_option_ids.includes(id) && !Boolean(current?.incompatible_option_ids.includes(optionId));
  });
}

export function getConfiguratorProgress(configurator: Configurator, selectedIds: string[]) {
  const requiredSteps = configurator.steps.filter((step) => step.required);
  if (!requiredSteps.length) return selectedIds.length ? 100 : 0;
  const complete = requiredSteps.filter((step) => step.options.some((option) => selectedIds.includes(option.id))).length;
  return Math.round((complete / requiredSteps.length) * 100);
}

export function getConfiguratorTotal(configurator: Configurator, selectedIds: string[]) {
  return selectedIds.reduce((total, id) => total + (getConfiguratorOption(configurator, id)?.price_delta || 0), configurator.base_price);
}

export function getConfiguratorProducts(configurator: Configurator, products: Product[], selectedIds: string[]) {
  const productIds = selectedIds
    .map((id) => getConfiguratorOption(configurator, id)?.product_id)
    .filter((id): id is string => Boolean(id));
  return productIds.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
}

export function describeConfiguratorSelection(configurator: Configurator, selectedIds: string[]) {
  const selected = selectedIds.map((id) => getConfiguratorOption(configurator, id)).filter((option): option is ConfiguratorOption => Boolean(option));
  const tags = uniqueValues(selected.flatMap((option) => option.tags));
  const names = selected.map((option) => option.label);
  return { selected, tags, names };
}

export function uid(prefix = "id") {
  return `${prefix}_${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
}
