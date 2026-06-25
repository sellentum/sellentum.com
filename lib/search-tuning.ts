import type { ProductSearchReport, SearchTermCoverage } from "@/lib/search-engine";

export type SearchTuningOpportunity = {
  title: string;
  detail: string;
  recommendation: string;
  severity: "good" | "watch" | "critical";
  terms: string[];
};

export type SearchTuningReport = {
  score: number;
  summary: string;
  counts: {
    covered: number;
    thin: number;
    missing: number;
  };
  opportunities: SearchTuningOpportunity[];
};

function termsByStatus(coverage: SearchTermCoverage[], status: SearchTermCoverage["status"]) {
  return coverage.filter((item) => item.status === status).map((item) => item.term);
}

function formatTermList(terms: string[]) {
  if (!terms.length) return "";
  if (terms.length === 1) return `“${terms[0]}”`;
  return terms.slice(0, 4).map((term) => `“${term}”`).join(", ");
}

export function buildSearchTuningReport(report: ProductSearchReport): SearchTuningReport {
  const coverage = report.intent.coverage;
  const coveredTerms = termsByStatus(coverage, "covered");
  const thinTerms = termsByStatus(coverage, "thin");
  const missingTerms = termsByStatus(coverage, "missing");
  const coverageScore = coverage.length
    ? Math.round(coverage.reduce((sum, item) => sum + (item.status === "covered" ? 100 : item.status === "thin" ? 55 : 0), 0) / coverage.length)
    : report.results.length ? 65 : 0;
  const topConfidence = report.results[0]?.confidence;
  const rankingBonus = topConfidence === "strong" ? 10 : topConfidence === "medium" ? 4 : 0;
  const score = Math.max(0, Math.min(100, coverageScore + rankingBonus - (report.results.length ? 0 : 20)));
  const opportunities: SearchTuningOpportunity[] = [];

  if (!report.query.trim()) {
    opportunities.push({
      title: "Test a realistic shopper query",
      detail: "Search tuning needs a query with use-case, feature, category or budget language.",
      recommendation: "Try one of the generated search suggestions or paste a recent shopper question.",
      severity: "watch",
      terms: [],
    });
  }

  if (missingTerms.length) {
    opportunities.push({
      title: `Add missing language: ${formatTermList(missingTerms)}`,
      detail: `${missingTerms.length} parsed term${missingTerms.length === 1 ? "" : "s"} are not present in active catalog fields.`,
      recommendation: "Add these words to relevant product tags, buyer needs, search text or feature copy so the search engine has deterministic evidence.",
      severity: "critical",
      terms: missingTerms,
    });
  }

  if (thinTerms.length) {
    opportunities.push({
      title: `Strengthen thin coverage: ${formatTermList(thinTerms)}`,
      detail: `${thinTerms.length} term${thinTerms.length === 1 ? "" : "s"} appear on only one active product.`,
      recommendation: "If multiple products should qualify, add the term or a close synonym to those product records before changing ranking rules.",
      severity: "watch",
      terms: thinTerms,
    });
  }

  if (!report.results.length) {
    opportunities.push({
      title: "No products are ranking",
      detail: "The query produced no eligible result cards from the active catalog.",
      recommendation: "Check active product status, budget constraints and whether the query uses language missing from catalog tags or descriptions.",
      severity: "critical",
      terms: report.intent.terms,
    });
  } else if (report.results[0].confidence === "weak") {
    opportunities.push({
      title: "Top result has weak confidence",
      detail: `${report.results[0].product.name} is first, but its score is mostly based on sparse or generic signals.`,
      recommendation: "Enrich the top product and close alternatives with buyer-needs, benefit-focused tags and clearer feature labels.",
      severity: "watch",
      terms: report.results[0].matchedSignals.map((signal) => signal.term),
    });
  }

  if (report.blockedProducts > 0 && report.intent.maxBudget !== null) {
    opportunities.push({
      title: "Budget is blocking part of the catalog",
      detail: `${report.blockedProducts} product${report.blockedProducts === 1 ? "" : "s"} are excluded by the parsed budget ceiling.`,
      recommendation: "If this query is common, make sure lower-priced alternatives have complete tags, features and product URLs.",
      severity: "watch",
      terms: [`≤ ${report.intent.maxBudget}`],
    });
  }

  if (!opportunities.length && coveredTerms.length) {
    opportunities.push({
      title: "Search coverage looks healthy",
      detail: `${coveredTerms.length} parsed term${coveredTerms.length === 1 ? "" : "s"} are backed by active catalog data.`,
      recommendation: "Use this query in launch QA, then watch analytics for real shopper phrases that need new catalog language.",
      severity: "good",
      terms: coveredTerms,
    });
  }

  const summary = score >= 80
    ? "Strong catalog evidence for this search."
    : score >= 55
      ? "Usable search, but a few terms need stronger catalog support."
      : "Weak search coverage; enrich product language before relying on this query.";

  return {
    score,
    summary,
    counts: { covered: coveredTerms.length, thin: thinTerms.length, missing: missingTerms.length },
    opportunities: opportunities.slice(0, 4),
  };
}
