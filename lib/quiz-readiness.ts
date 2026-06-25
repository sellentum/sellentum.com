import type { MatchType, Product, Quiz } from "@/lib/types";

export type QuizReadinessSeverity = "pass" | "warning" | "blocker";

export type QuizReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  severity: QuizReadinessSeverity;
};

export type QuizReadinessReport = {
  score: number;
  canPublish: boolean;
  blockers: QuizReadinessCheck[];
  warnings: QuizReadinessCheck[];
  checks: QuizReadinessCheck[];
};

function check(id: string, label: string, detail: string, severity: QuizReadinessSeverity): QuizReadinessCheck {
  return { id, label, detail, severity };
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

function catalogValues(products: Product[], matchType: MatchType) {
  const active = activeProducts(products);
  if (matchType === "category") return new Set(active.map((product) => normalize(product.category)).filter(Boolean));
  if (matchType === "tag") return new Set(active.flatMap((product) => [...product.tags, ...(product.buyer_needs || [])]).map(normalize).filter(Boolean));
  if (matchType === "feature") return new Set(active.flatMap((product) => product.features).map(normalize).filter(Boolean));
  return new Set<string>();
}

function optionMatchesCatalog(products: Product[], matchType: MatchType, matchValue: string) {
  const value = normalize(matchValue);
  if (!value || matchType === "none") return true;
  if (matchType === "budget_max") {
    const budget = Number(value);
    return Number.isFinite(budget) && budget > 0 && activeProducts(products).some((product) => product.price <= budget);
  }
  const values = catalogValues(products, matchType);
  if (matchType === "feature") return [...values].some((feature) => feature.includes(value) || value.includes(feature));
  return values.has(value);
}

export function analyzeQuizReadiness(quiz: Quiz, products: Product[]): QuizReadinessReport {
  const active = activeProducts(products);
  const checks: QuizReadinessCheck[] = [];
  const questions = [...quiz.questions].sort((a, b) => a.position - b.position);
  const options = questions.flatMap((question) => question.options);
  const ruleOptions = options.filter((option) => option.match_type !== "none");
  const blankValueOptions = ruleOptions.filter((option) => option.match_type !== "none" && !option.match_value.trim());
  const catalogMisses = products.length ? ruleOptions.filter((option) => option.match_value.trim() && !optionMatchesCatalog(products, option.match_type, option.match_value)) : [];
  const malformedBudgets = options.filter((option) => option.match_type === "budget_max" && (!Number.isFinite(Number(option.match_value)) || Number(option.match_value) <= 0));

  checks.push(check(
    "catalog",
    "Recommendation catalog",
    active.length >= 2 ? `${active.length} active products are available for matching.` : "Add at least two active products before publishing a useful finder.",
    active.length >= 2 ? "pass" : "blocker",
  ));

  checks.push(check(
    "questions",
    "Question flow",
    questions.length ? `${questions.length} guided question${questions.length === 1 ? "" : "s"} configured.` : "Add at least one question.",
    questions.length ? "pass" : "blocker",
  ));

  const weakQuestions = questions.filter((question) => question.options.length < 2);
  checks.push(check(
    "answer-options",
    "Answer choices",
    weakQuestions.length ? `${weakQuestions.length} question${weakQuestions.length === 1 ? "" : "s"} need at least two answer options.` : "Every question has at least two answer options.",
    weakQuestions.length ? "blocker" : "pass",
  ));

  const blankLabels = options.filter((option) => !option.label.trim());
  checks.push(check(
    "labels",
    "Buyer-facing labels",
    blankLabels.length ? `${blankLabels.length} answer label${blankLabels.length === 1 ? "" : "s"} are blank.` : "All answer labels are filled in.",
    blankLabels.length ? "blocker" : "pass",
  ));

  checks.push(check(
    "rule-values",
    "Recommendation rules",
    blankValueOptions.length ? `${blankValueOptions.length} answer rule${blankValueOptions.length === 1 ? "" : "s"} are missing match values.` : `${ruleOptions.length} answer rule${ruleOptions.length === 1 ? "" : "s"} can influence matching.`,
    blankValueOptions.length || !ruleOptions.length ? "blocker" : "pass",
  ));

  if (malformedBudgets.length) {
    checks.push(check("budget-rules", "Budget rules", `${malformedBudgets.length} budget answer${malformedBudgets.length === 1 ? "" : "s"} have invalid maximum prices.`, "blocker"));
  } else if (options.some((option) => option.match_type === "budget_max")) {
    checks.push(check("budget-rules", "Budget rules", "Budget answers use valid maximum prices.", "pass"));
  }

  checks.push(check(
    "catalog-mapping",
    "Catalog mapping",
    catalogMisses.length ? `${catalogMisses.length} rule value${catalogMisses.length === 1 ? "" : "s"} do not currently match active product data.` : "Rule values map to active catalog signals.",
    catalogMisses.length ? "warning" : "pass",
  ));

  const hasWelcome = Boolean(quiz.welcome_title.trim() && quiz.welcome_message.trim());
  checks.push(check(
    "welcome",
    "Welcome copy",
    hasWelcome ? "Welcome headline and message are ready." : "Add a clear welcome headline and message before sharing.",
    hasWelcome ? "pass" : "warning",
  ));

  const warnings = checks.filter((item) => item.severity === "warning");
  const blockers = checks.filter((item) => item.severity === "blocker");
  const passed = checks.filter((item) => item.severity === "pass").length;

  return {
    score: Math.round((passed / checks.length) * 100),
    canPublish: blockers.length === 0,
    blockers,
    warnings,
    checks,
  };
}
