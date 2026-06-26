import { answerToFinderAnswer, buildFinderQuestionPath, defaultFinderSelections, orderedFinderQuestions } from "./finder-flow";
import type { Product, Quiz } from "@/lib/types";
import { auditProductMatches, buildFinderBuyerProfile, extractIntentTokens } from "./utils";

export type ScenarioCoverageStatus = "blocked" | "watch" | "healthy";
export type ScenarioCoveragePriority = "critical" | "high" | "medium" | "low";

export type ScenarioCoverageScenario = {
  id: string;
  label: string;
  status: ScenarioCoverageStatus;
  answers: string[];
  visitedQuestions: string[];
  skippedQuestions: string[];
  buyerProfileTerms: string[];
  eligibleProducts: number;
  blockedProducts: number;
  topProducts: string[];
  topScore: number;
  detail: string;
  recommendation: string;
};

export type ScenarioCoverageProduct = {
  productId: string;
  productName: string;
  surfacedInScenarios: number;
  topRankCount: number;
  averageScore: number;
  coverageRate: number;
};

export type ScenarioCoverageAction = {
  id: string;
  priority: ScenarioCoveragePriority;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  actionHref: string;
};

export type ScenarioCoverageReport = {
  status: ScenarioCoverageStatus;
  score: number;
  headline: string;
  summary: {
    scenarios: number;
    passing: number;
    warnings: number;
    blockers: number;
    answerCoverageRate: number;
    routeCoverageRate: number;
    productCoverageRate: number;
    averageEligibleProducts: number;
  };
  scenarios: ScenarioCoverageScenario[];
  productCoverage: ScenarioCoverageProduct[];
  actions: ScenarioCoverageAction[];
};

type ScenarioSeed = {
  id: string;
  label: string;
  selections: Record<string, string>;
};

const priorityRank: Record<ScenarioCoveragePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function statusRank(status: ScenarioCoverageStatus) {
  if (status === "blocked") return 2;
  if (status === "watch") return 1;
  return 0;
}

function scenarioStatus(answerCount: number, eligibleProducts: number, topScore: number): ScenarioCoverageStatus {
  if (!answerCount || !eligibleProducts) return "blocked";
  if (eligibleProducts < 2 || topScore <= 0) return "watch";
  return "healthy";
}

function scenarioCopy(status: ScenarioCoverageStatus, eligibleProducts: number, topProducts: string[]) {
  if (status === "blocked") {
    return {
      detail: "This simulated shopper path cannot produce a recommendation.",
      recommendation: "Review answer rules, active product coverage and budget ceilings for this branch before publishing.",
    };
  }

  if (status === "watch") {
    return {
      detail: `${eligibleProducts} eligible product${eligibleProducts === 1 ? "" : "s"} found, which makes this path fragile.`,
      recommendation: "Broaden the answer mapping or add one more product signal so the shopper has a meaningful choice set.",
    };
  }

  return {
    detail: `Returns a usable recommendation set led by ${topProducts[0] || "the top-ranked product"}.`,
    recommendation: "This path is launchable. Keep it in the QA suite when changing catalog data or answer rules.",
  };
}

function scenarioSeeds(quiz: Quiz, maxScenarios: number): ScenarioSeed[] {
  const questions = orderedFinderQuestions(quiz);
  const defaults = defaultFinderSelections(quiz);
  const seeds: ScenarioSeed[] = [{ id: "default", label: "Default full path", selections: defaults }];

  for (const question of questions) {
    for (const option of question.options) {
      seeds.push({
        id: `${question.id}-${option.id}`,
        label: `${question.title}: ${option.label}`,
        selections: { ...defaults, [question.id]: option.id },
      });
    }
  }

  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const key = JSON.stringify(seed.selections);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, Math.max(1, maxScenarios));
}

function analyzeSeed(quiz: Quiz, products: Product[], seed: ScenarioSeed): ScenarioCoverageScenario {
  const path = buildFinderQuestionPath(quiz, seed.selections, true);
  const visitedQuestionIds = new Set(path.map((step) => step.question.id));
  const skippedQuestions = orderedFinderQuestions(quiz).filter((question) => !visitedQuestionIds.has(question.id));
  const answers = path.flatMap((step) => step.selectedOption ? [answerToFinderAnswer(step.question, step.selectedOption)] : []);
  const audits = auditProductMatches(products, answers, { overrides: quiz.recommendation_overrides || [] });
  const eligible = audits.filter((audit) => audit.eligible);
  const topProducts = eligible.slice(0, 3).map((audit) => audit.product.name);
  const topScore = rounded(eligible[0]?.score || 0);
  const status = scenarioStatus(answers.length, eligible.length, topScore);
  const copy = scenarioCopy(status, eligible.length, topProducts);
  const buyerProfile = buildFinderBuyerProfile(answers);

  return {
    id: seed.id,
    label: seed.label,
    status,
    answers: answers.map((answer) => answer.answer),
    visitedQuestions: path.map((step) => step.question.title),
    skippedQuestions: skippedQuestions.map((question) => question.title),
    buyerProfileTerms: extractIntentTokens(buyerProfile).slice(0, 8),
    eligibleProducts: eligible.length,
    blockedProducts: audits.length - eligible.length,
    topProducts,
    topScore,
    detail: copy.detail,
    recommendation: copy.recommendation,
  };
}

function buildProductCoverage(products: Product[], scenarios: ScenarioCoverageScenario[], quiz: Quiz) {
  const byName = new Map(products.map((product) => [product.name, product]));
  const scoreByProduct = new Map<string, number[]>();
  const topRankCounts = new Map<string, number>();

  for (const scenario of scenarios) {
    scenario.topProducts.forEach((productName, index) => {
      const product = byName.get(productName);
      if (!product) return;
      if (!scoreByProduct.has(product.id)) scoreByProduct.set(product.id, []);
      scoreByProduct.get(product.id)!.push(index === 0 ? scenario.topScore : Math.max(0, scenario.topScore - index));
      if (index === 0) topRankCounts.set(product.id, (topRankCounts.get(product.id) || 0) + 1);
    });
  }

  const overrides = quiz.recommendation_overrides || [];
  const excludedIds = new Set(overrides.filter((override) => override.action === "exclude").map((override) => override.product_id));
  const activeProducts = products.filter((product) => product.active && !excludedIds.has(product.id));

  return activeProducts.map((product) => {
    const scores = scoreByProduct.get(product.id) || [];
    return {
      productId: product.id,
      productName: product.name,
      surfacedInScenarios: scores.length,
      topRankCount: topRankCounts.get(product.id) || 0,
      averageScore: scores.length ? rounded(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      coverageRate: scenarios.length ? scores.length / scenarios.length * 100 : 0,
    };
  }).sort((a, b) => b.topRankCount - a.topRankCount || b.surfacedInScenarios - a.surfacedInScenarios || a.productName.localeCompare(b.productName));
}

function addAction(actions: ScenarioCoverageAction[], action: ScenarioCoverageAction) {
  actions.push(action);
}

export function buildScenarioCoverageReport(quiz: Quiz | undefined, products: Product[], maxScenarios = 12): ScenarioCoverageReport {
  if (!quiz || !quiz.questions.length) {
    return {
      status: "blocked",
      score: 0,
      headline: "No finder is available for scenario coverage.",
      summary: {
        scenarios: 0,
        passing: 0,
        warnings: 0,
        blockers: 1,
        answerCoverageRate: 0,
        routeCoverageRate: 0,
        productCoverageRate: 0,
        averageEligibleProducts: 0,
      },
      scenarios: [],
      productCoverage: [],
      actions: [{
        id: "create-finder",
        priority: "critical",
        title: "Create a finder before scenario QA",
        detail: "Scenario coverage needs at least one finder with questions and answer options.",
        evidence: "No quiz questions were available to simulate.",
        recommendation: "Build or generate a product finder, then return to the Recommendation Lab.",
        actionHref: "/dashboard/quizzes",
      }],
    };
  }

  const questions = orderedFinderQuestions(quiz);
  const scenarios = scenarioSeeds(quiz, maxScenarios).map((seed) => analyzeSeed(quiz, products, seed));
  const productCoverage = buildProductCoverage(products, scenarios, quiz);
  const passing = scenarios.filter((scenario) => scenario.status === "healthy").length;
  const warnings = scenarios.filter((scenario) => scenario.status === "watch").length;
  const blockers = scenarios.filter((scenario) => scenario.status === "blocked").length;
  const status = scenarios.reduce<ScenarioCoverageStatus>((worst, scenario) => statusRank(scenario.status) > statusRank(worst) ? scenario.status : worst, "healthy");
  const visitedQuestionIds = new Set<string>();
  const coveredAnswerIds = new Set<string>();

  for (const seed of scenarioSeeds(quiz, maxScenarios)) {
    const path = buildFinderQuestionPath(quiz, seed.selections, true);
    for (const step of path) {
      visitedQuestionIds.add(step.question.id);
      if (step.selectedOption) coveredAnswerIds.add(step.selectedOption.id);
    }
  }

  const totalAnswers = questions.reduce((sum, question) => sum + question.options.length, 0);
  const answerCoverageRate = totalAnswers ? coveredAnswerIds.size / totalAnswers * 100 : 0;
  const routeCoverageRate = questions.length ? visitedQuestionIds.size / questions.length * 100 : 0;
  const eligibleProductIds = new Set(productCoverage.filter((product) => product.surfacedInScenarios > 0).map((product) => product.productId));
  const activeProducts = products.filter((product) => product.active);
  const productCoverageRate = activeProducts.length ? eligibleProductIds.size / activeProducts.length * 100 : 0;
  const averageEligibleProducts = scenarios.length ? rounded(scenarios.reduce((sum, scenario) => sum + scenario.eligibleProducts, 0) / scenarios.length) : 0;
  const actions: ScenarioCoverageAction[] = [];

  if (blockers) {
    addAction(actions, {
      id: "fix-blocked-scenarios",
      priority: "critical",
      title: "Fix blocked shopper scenarios",
      detail: "At least one simulated path cannot produce an eligible recommendation.",
      evidence: `${blockers} blocked scenario${blockers === 1 ? "" : "s"} out of ${scenarios.length}.`,
      recommendation: "Start with the blocked scenario cards, then widen budgets, repair answer rules or add matching products.",
      actionHref: "/dashboard/quizzes",
    });
  }

  if (warnings) {
    addAction(actions, {
      id: "deepen-thin-scenarios",
      priority: blockers ? "high" : "medium",
      title: "Deepen thin recommendation paths",
      detail: "Some simulated paths have a fragile product set and may feel like a forced recommendation.",
      evidence: `${warnings} scenario${warnings === 1 ? "" : "s"} returned fewer than two strong options.`,
      recommendation: "Add broader tags/features, improve buyer-needs data, or revisit answer weights for these paths.",
      actionHref: "/dashboard/products",
    });
  }

  if (answerCoverageRate < 70) {
    addAction(actions, {
      id: "expand-answer-coverage",
      priority: "medium",
      title: "Expand answer coverage",
      detail: "The scenario suite is not exercising enough answer options to prove the whole finder.",
      evidence: `${Math.round(answerCoverageRate)}% of answer options were covered by bounded scenarios.`,
      recommendation: "Add branch QA cases for answers that send shoppers to niche or budget-sensitive paths.",
      actionHref: "/dashboard/lab",
    });
  }

  if (productCoverageRate < 50 && activeProducts.length >= 3) {
    addAction(actions, {
      id: "broaden-product-coverage",
      priority: "medium",
      title: "Broaden product coverage",
      detail: "Only a small share of active products appears in simulated recommendation sets.",
      evidence: `${eligibleProductIds.size}/${activeProducts.length} active products appear across the scenario suite.`,
      recommendation: "Check whether invisible products need clearer tags, features, buyer-needs or merchandising boosts.",
      actionHref: "/dashboard/products",
    });
  }

  if (!actions.length) {
    addAction(actions, {
      id: "keep-suite-in-release-checks",
      priority: "low",
      title: "Keep this suite in release checks",
      detail: "The bounded scenario suite is healthy for the current finder and catalog.",
      evidence: `${passing}/${scenarios.length} scenarios are healthy with ${Math.round(productCoverageRate)}% product coverage.`,
      recommendation: "Rerun it after importing products, changing branches or publishing merchandising overrides.",
      actionHref: "/dashboard/preflight",
    });
  }

  const score = Math.max(0, Math.min(100, Math.round(
    (scenarios.length ? passing / scenarios.length * 45 : 0) +
    Math.min(20, answerCoverageRate * 0.2) +
    Math.min(15, routeCoverageRate * 0.15) +
    Math.min(20, productCoverageRate * 0.2),
  )));

  const headline = status === "blocked"
    ? "Some shopper scenarios cannot recommend products."
    : status === "watch"
      ? "Scenario coverage is launchable but thin in places."
      : "Scenario coverage looks healthy for this finder.";

  return {
    status,
    score,
    headline,
    summary: {
      scenarios: scenarios.length,
      passing,
      warnings,
      blockers,
      answerCoverageRate,
      routeCoverageRate,
      productCoverageRate,
      averageEligibleProducts,
    },
    scenarios,
    productCoverage,
    actions: actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id)),
  };
}
