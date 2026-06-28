import type { ProductSearchReport, ProductSearchResult, SearchTermCoverage } from "@/lib/search-engine";

export type SearchRecoveryStatus = "healthy" | "needs-refinement" | "no-results";

export type SearchRecoverySuggestion = {
  id: string;
  title: string;
  detail: string;
  query?: string;
  severity: "critical" | "helpful" | "info";
};

export type SearchRecoveryNearMiss = {
  productId: string;
  productName: string;
  price: number;
  category: string;
  imageUrl: string;
  productUrl: string;
  reason: string;
  matchedSignals: string[];
};

export type SearchRecoveryReport = {
  status: SearchRecoveryStatus;
  summary: string;
  primaryAction: string;
  missingTerms: string[];
  thinTerms: string[];
  budgetBlocked: boolean;
  suggestions: SearchRecoverySuggestion[];
  nearMisses: SearchRecoveryNearMiss[];
};

function termsByStatus(coverage: SearchTermCoverage[], status: SearchTermCoverage["status"]) {
  return coverage.filter((item) => item.status === status).map((item) => item.term);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function stripBudgetLanguage(query: string) {
  return query
    .replace(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*[£$€]?\s*\d+(?:\.\d+)?/gi, "")
    .replace(/[£$€]\s*\d+(?:\.\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function broaderQuery(report: ProductSearchReport, missingTerms: string[]) {
  const remaining = report.intent.terms.filter((term) => !missingTerms.includes(term));
  return remaining.slice(0, 4).join(" ") || stripBudgetLanguage(report.query) || report.suggestions[0] || "";
}

function suggestionQueryFromCoverage(report: ProductSearchReport) {
  const covered = report.intent.coverage.filter((item) => item.status === "covered").map((item) => item.term);
  if (covered.length) return covered.slice(0, 4).join(" ");
  return report.suggestions[0] || stripBudgetLanguage(report.query);
}

function mapNearMiss(result: ProductSearchResult): SearchRecoveryNearMiss {
  return {
    productId: result.product.id,
    productName: result.product.name,
    price: result.product.price,
    category: result.product.category,
    imageUrl: result.product.image_url,
    productUrl: result.product.product_url,
    reason: result.blockedReason || (result.confidence === "weak" ? "Weak semantic evidence for this query." : "Close catalog option."),
    matchedSignals: unique(result.matchedSignals.filter((signal) => signal.source !== "budget").map((signal) => signal.term)).slice(0, 5),
  };
}

export function buildSearchRecoveryReport(report: ProductSearchReport): SearchRecoveryReport {
  const missingTerms = termsByStatus(report.intent.coverage, "missing");
  const thinTerms = termsByStatus(report.intent.coverage, "thin");
  const weakTopResult = report.results[0]?.confidence === "weak";
  const thinResultSet = report.results.length > 0 && report.results.length < 3;
  const budgetBlocked = report.intent.maxBudget !== null && report.blockedProducts > 0;
  const noResults = report.results.length === 0;
  const status: SearchRecoveryStatus = noResults ? "no-results" : missingTerms.length || thinTerms.length || weakTopResult || thinResultSet || budgetBlocked ? "needs-refinement" : "healthy";
  const suggestions: SearchRecoverySuggestion[] = [];

  if (budgetBlocked) {
    suggestions.push({
      id: "relax-budget",
      title: "Widen or remove the budget",
      detail: `${report.blockedProducts} product${report.blockedProducts === 1 ? "" : "s"} were excluded by the parsed budget ceiling.`,
      query: stripBudgetLanguage(report.query),
      severity: noResults ? "critical" : "helpful",
    });
  }

  if (missingTerms.length) {
    suggestions.push({
      id: "broaden-missing-language",
      title: `Broaden missing terms: ${missingTerms.slice(0, 3).join(", ")}`,
      detail: "Those words do not appear in active catalog fields yet, so Sellentum has no deterministic evidence for them.",
      query: broaderQuery(report, missingTerms),
      severity: noResults ? "critical" : "helpful",
    });
  }

  if (thinTerms.length) {
    suggestions.push({
      id: "broaden-thin-language",
      title: `Use broader wording for ${thinTerms.slice(0, 3).join(", ")}`,
      detail: "These terms only match one active product, so comparison depth may be limited.",
      query: suggestionQueryFromCoverage(report),
      severity: "helpful",
    });
  }

  if (weakTopResult) {
    suggestions.push({
      id: "add-more-intent",
      title: "Add a use case or category",
      detail: "The top result is weak because the query has sparse catalog-backed evidence.",
      query: report.suggestions[0],
      severity: "helpful",
    });
  }

  if (!suggestions.length && thinResultSet) {
    suggestions.push({
      id: "compare-more-options",
      title: "Try a broader comparison query",
      detail: "Sellentum found a match, but fewer than three products are available for side-by-side choice.",
      query: report.suggestions[0],
      severity: "info",
    });
  }

  const nearMisses = (report.nearMisses.length ? report.nearMisses : status === "needs-refinement" ? report.results.filter((result) => result.confidence === "weak") : [])
    .slice(0, 3)
    .map(mapNearMiss);

  const summary = status === "healthy"
    ? "This search has enough catalog evidence for confident ranking."
    : status === "no-results"
      ? "No eligible products matched the current constraints, but Sellentum can still suggest safer refinements."
      : "The search returned products, but some shopper language or constraints need refinement for stronger confidence.";

  return {
    status,
    summary,
    primaryAction: suggestions[0]?.title || (status === "healthy" ? "Keep testing live shopper phrases" : "Try a broader query"),
    missingTerms,
    thinTerms,
    budgetBlocked,
    suggestions: suggestions.slice(0, 4),
    nearMisses,
  };
}
