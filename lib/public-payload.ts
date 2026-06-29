import type { AdvisorRecoveryReport } from "@/lib/advisor-recovery";
import type { AdvisorResult } from "@/lib/assistant-engine";
import type { ConfiguratorValidationResult } from "@/lib/configurator-engine";
import type { ProductSearchReport, ProductSearchResult, ProductSearchSignal } from "@/lib/search-engine";
import type { Configurator, ConfiguratorOption, ConfiguratorStep, ConversationalMatch, Product } from "@/lib/types";

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£$€.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function publicQueryTerms(query: string) {
  return unique((normalizeTerm(query).match(/[a-z0-9£$€.-]+/g) || []).filter((term) => term.length > 1).slice(0, 8));
}

function publicDisplayScore(index: number) {
  return Number(Math.max(1, 10 - index * 1.2).toFixed(1));
}

function publicTermsFromQuery(terms: string[], query: string, fallback: string[] = publicQueryTerms(query)) {
  const normalizedQuery = normalizeTerm(query);
  const directTerms = terms.filter((term) => normalizedQuery.includes(normalizeTerm(term))).slice(0, 8);
  return unique(directTerms.length ? directTerms : fallback.slice(0, 5));
}

export function toPublicProduct(product: Product): Product {
  return {
    id: product.id,
    user_id: "public",
    name: product.name,
    price: product.price,
    image_url: product.image_url,
    category: product.category,
    description: product.description,
    features: product.features || [],
    tags: [],
    product_url: product.product_url,
    active: true,
    search_text: "",
    buyer_needs: [],
    created_at: "",
    updated_at: "",
  };
}

function toPublicSearchSignal(signal: ProductSearchSignal): ProductSearchSignal {
  return {
    term: signal.term,
    source: "description",
    contribution: 0,
    detail: "Matched shopper-facing product information.",
  };
}

function toPublicSearchResult(result: ProductSearchResult, index: number, query: string): ProductSearchResult {
  const publicTerms = publicTermsFromQuery(
    result.matchedSignals.map((signal) => signal.term),
    query,
  );
  const publicSignals = publicTerms.map((term) => toPublicSearchSignal({ term, source: "description", contribution: 0, detail: "" }));
  return {
    ...result,
    product: toPublicProduct(result.product),
    score: publicDisplayScore(index),
    blockedReason: result.blockedReason ? "Outside the current shopper constraints." : undefined,
    matchedSignals: publicSignals,
  };
}

function publicSearchSuggestions(report: ProductSearchReport) {
  const products = [...report.results, ...report.nearMisses].map((result) => result.product);
  const categories = unique(products.map((product) => product.category)).slice(0, 2);
  const features = unique(products.flatMap((product) => product.features || [])).slice(0, 2);
  return unique([
    categories[0] ? `${categories[0]} options` : "",
    features[0] ? `Products with ${features[0].toLowerCase()}` : "",
    report.intent.maxBudget ? `Options under £${report.intent.maxBudget}` : "",
    categories[1] ? `Compare ${categories[1].toLowerCase()}` : "",
    "Best overall match",
  ]).slice(0, 4);
}

export function toPublicSearchReport(report: ProductSearchReport): ProductSearchReport {
  const publicTerms = publicTermsFromQuery(report.intent.terms, report.query);
  const publicTermSet = new Set(publicTerms.map(normalizeTerm));
  return {
    ...report,
    intent: {
      ...report.intent,
      terms: publicTerms,
      coverage: report.intent.coverage
        .filter((item) => publicTermSet.has(normalizeTerm(item.term)))
        .map((item) => ({
          term: item.term,
          productCount: item.status === "missing" ? 0 : 1,
          sources: [],
          status: item.status,
        })),
    },
    suggestions: publicSearchSuggestions(report),
    results: report.results.map((result, index) => toPublicSearchResult(result, index, report.query)),
    nearMisses: report.nearMisses.map((result, index) => toPublicSearchResult(result, index, report.query)),
  };
}

export function publicClarifyingOptions(products: Product[]) {
  const active = products.filter((product) => product.active);
  return unique([
    ...active.map((product) => product.category),
    ...active.flatMap((product) => product.features || []),
  ]).slice(0, 4);
}

export function publicMatchedSignals(signals: string[], query: string) {
  return publicTermsFromQuery(signals, query).slice(0, 5);
}

function toPublicAdvisorRecovery(recovery: AdvisorRecoveryReport | undefined, query: string): AdvisorRecoveryReport | undefined {
  if (!recovery) return undefined;
  return {
    ...recovery,
    missingTerms: publicTermsFromQuery(recovery.missingTerms, query),
    thinTerms: publicTermsFromQuery(recovery.thinTerms, query),
    suggestions: recovery.suggestions.slice(0, 4).map((suggestion) => ({
      ...suggestion,
      detail: suggestion.id.includes("budget")
        ? suggestion.detail
        : "Try a broader shopper phrase so the advisor can compare more public product information.",
    })),
    nearMisses: recovery.nearMisses.slice(0, 3).map((item) => ({
      ...item,
      reason: item.reason.includes("budget") || item.reason.includes("£") ? item.reason : "Close public catalog option for the current request.",
      matchedSignals: publicTermsFromQuery(item.matchedSignals, query),
    })),
  };
}

function toPublicAdvisorMatch(match: ConversationalMatch, index: number, query: string): ConversationalMatch {
  return {
    ...match,
    product: toPublicProduct(match.product),
    score: publicDisplayScore(index),
    matchedSignals: publicMatchedSignals(match.matchedSignals, query),
  };
}

export function toPublicAdvisorResult(result: AdvisorResult, query: string, products: Product[]): AdvisorResult {
  const safeClarifyingOptions = result.status === "clarifying" ? publicClarifyingOptions(products) : result.clarifyingOptions;
  return {
    ...result,
    intent: {
      ...result.intent,
      terms: publicTermsFromQuery(result.intent.terms, query),
    },
    clarifyingOptions: safeClarifyingOptions,
    recovery: toPublicAdvisorRecovery(result.recovery, query),
    matches: result.matches.map((match, index) => toPublicAdvisorMatch(match, index, query)),
  };
}

function toPublicConfiguratorOption(option: ConfiguratorOption): ConfiguratorOption {
  return {
    ...option,
    tags: [],
  };
}

function toPublicConfiguratorStep(step: ConfiguratorStep): ConfiguratorStep {
  return {
    ...step,
    options: step.options.map(toPublicConfiguratorOption),
  };
}

export function toPublicConfigurator(configurator: Configurator): Configurator {
  return {
    id: configurator.id,
    user_id: "public",
    name: configurator.name,
    slug: configurator.slug,
    title: configurator.title,
    subtitle: configurator.subtitle,
    hero_image_url: configurator.hero_image_url,
    base_price: configurator.base_price,
    published: true,
    steps: configurator.steps.map(toPublicConfiguratorStep),
    created_at: "",
    updated_at: "",
  };
}

export function linkedPublicConfiguratorProducts(configurator: Configurator, products: Product[]) {
  const linkedProductIds = new Set(configurator.steps.flatMap((step) => step.options.map((option) => option.product_id).filter(Boolean)));
  return products.filter((product) => linkedProductIds.has(product.id)).map(toPublicProduct);
}

export function toPublicConfiguratorValidationResult(result: ConfiguratorValidationResult): ConfiguratorValidationResult {
  return {
    ...result,
    selectedOptions: result.selectedOptions.map(toPublicConfiguratorOption),
    selectedProducts: result.selectedProducts.map(toPublicProduct),
    primaryProduct: result.primaryProduct ? toPublicProduct(result.primaryProduct) : undefined,
    selectedTags: [],
  };
}
