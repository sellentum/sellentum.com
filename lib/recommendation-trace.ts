import type { FinderAnswer, Product, ProductMatchAudit, Quiz } from "@/lib/types";

export type RecommendationTraceProduct = {
  productId: string;
  productName: string;
  rank?: number;
  eligible: boolean;
  score: number;
  status: "recommended" | "eligible" | "blocked";
  blocker?: string;
  decisiveSignals: string[];
  missedSignals: string[];
};

export type RecommendationTraceAction = {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
};

export type RecommendationTraceReport = {
  scenarioName: string;
  summary: string;
  buyerProfile: string;
  selectedAnswers: Array<{
    question: string;
    answer: string;
    rule: string;
    weight: number;
  }>;
  eligibleProducts: number;
  blockedProducts: number;
  recommendedProducts: number;
  topProduct?: {
    productId: string;
    productName: string;
    score: number;
    explanation: string;
    proofPoints: string[];
  };
  scoreSpread: {
    highest: number;
    lowestEligible: number;
    gap: number;
  };
  products: RecommendationTraceProduct[];
  tuningActions: RecommendationTraceAction[];
};

type TraceInput = {
  quiz?: Pick<Quiz, "name"> | null;
  products: Product[];
  answers: FinderAnswer[];
  audits: ProductMatchAudit[];
  limit?: number;
};

function formatCurrency(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function humanizeRule(answer: FinderAnswer) {
  if (answer.matchType === "none") return "Preference only";
  if (answer.matchType === "budget_max") return `Budget ≤ ${formatCurrency(Number(answer.matchValue) || 0)}`;
  return `${answer.matchType.replace("_", " ")} = ${answer.matchValue || "missing"}`;
}

function buildBuyerProfile(answers: FinderAnswer[]) {
  return answers.map((answer) => `${answer.question}: ${answer.answer}`).join(" · ");
}

function decisiveSignals(audit: ProductMatchAudit) {
  return audit.signals
    .filter((signal) => signal.matched && signal.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map((signal) => `${signal.answer} (+${signal.contribution.toFixed(1)})`)
    .slice(0, 5);
}

function missedSignals(audit: ProductMatchAudit) {
  return audit.signals
    .filter((signal) => !signal.matched && signal.source !== "merchandising")
    .map((signal) => `${signal.answer}: ${signal.note}`)
    .slice(0, 4);
}

function productTrace(audit: ProductMatchAudit, index: number, recommendedIds: Set<string>): RecommendationTraceProduct {
  const recommended = recommendedIds.has(audit.product.id);
  return {
    productId: audit.product.id,
    productName: audit.product.name,
    rank: recommended ? index + 1 : undefined,
    eligible: audit.eligible,
    score: Number(audit.score.toFixed(2)),
    status: !audit.eligible ? "blocked" : recommended ? "recommended" : "eligible",
    blocker: audit.blockedReason,
    decisiveSignals: decisiveSignals(audit),
    missedSignals: missedSignals(audit),
  };
}

function answerRuleIssues(answers: FinderAnswer[], audits: ProductMatchAudit[]) {
  return answers.flatMap((answer) => {
    if (answer.matchType === "none") return [];
    const matchedCount = audits.filter((audit) => audit.signals.some((signal) => signal.answer === answer.answer && signal.matched)).length;
    if (matchedCount > 0) return [];
    return [`“${answer.answer}” has no matching active product signal for ${humanizeRule(answer)}.`];
  });
}

function buildTuningActions(input: TraceInput, eligible: ProductMatchAudit[], blocked: ProductMatchAudit[], recommended: ProductMatchAudit[]) {
  const actions: RecommendationTraceAction[] = [];
  const ruleIssues = answerRuleIssues(input.answers, input.audits);
  const overBudget = blocked.filter((audit) => audit.blockedReason?.includes("Above the selected"));

  if (!input.answers.length) {
    actions.push({
      id: "scenario-empty",
      title: "Select a complete shopper path",
      detail: "The lab trace needs selected answers before it can prove recommendation logic.",
      priority: "high",
    });
  }

  if (!eligible.length && input.products.length) {
    actions.push({
      id: "no-eligible-products",
      title: "No products survive the hard filters",
      detail: overBudget.length ? `${overBudget.length} product${overBudget.length === 1 ? " is" : "s are"} blocked by budget. Add a broader budget option or lower-priced products.` : "Every product is inactive or excluded. Check product active states and merchandising exclusions.",
      priority: "high",
    });
  }

  if (ruleIssues.length) {
    actions.push({
      id: "unmatched-answer-rules",
      title: "Some answer rules do not map to the catalog",
      detail: ruleIssues.slice(0, 2).join(" "),
      priority: "high",
    });
  }

  if (recommended.length === 1 && eligible.length > 1) {
    actions.push({
      id: "thin-top-three",
      title: "Only one strong product is making the final set",
      detail: "Add richer tags, buyer needs, or feature language to close alternatives so the finder can confidently show a fuller top three.",
      priority: "medium",
    });
  }

  const top = recommended[0] || eligible[0];
  if (top && top.score < Math.max(6, input.answers.length * 2)) {
    actions.push({
      id: "weak-top-score",
      title: "Top match has a thin score",
      detail: `${top.product.name} is winning with ${top.score.toFixed(1)} points. Add more explicit product features, tags, or buyer needs that mirror shopper answer language.`,
      priority: "medium",
    });
  }

  const inactiveCount = input.products.filter((product) => !product.active).length;
  if (inactiveCount > 0) {
    actions.push({
      id: "inactive-products",
      title: "Inactive products are hidden from recommendations",
      detail: `${inactiveCount} product${inactiveCount === 1 ? " is" : "s are"} inactive. That may be intentional, but it reduces available matches for this finder.`,
      priority: "low",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "logic-healthy",
      title: "Recommendation path looks healthy",
      detail: "The selected answers produce eligible products, mapped signals, and a deterministic top recommendation.",
      priority: "low",
    });
  }

  return actions;
}

export function buildRecommendationTraceReport(input: TraceInput): RecommendationTraceReport {
  const limit = input.limit || 6;
  const eligible = input.audits.filter((audit) => audit.eligible);
  const blocked = input.audits.filter((audit) => !audit.eligible);
  const recommended = eligible.slice(0, 3);
  const recommendedIds = new Set(recommended.map((audit) => audit.product.id));
  const top = recommended[0] || eligible[0];
  const lowestEligibleScore = eligible.length ? Math.min(...eligible.map((audit) => audit.score)) : 0;
  const highestScore = top?.score || 0;
  const topSignals = top ? decisiveSignals(top) : [];
  const topProofPoints = top ? unique([
    ...top.matchedReasons.slice(0, 4),
    ...topSignals.slice(0, 3),
    top.product.category ? `Category: ${top.product.category}` : "",
  ]).slice(0, 5) : [];
  const buyerProfile = buildBuyerProfile(input.answers);

  return {
    scenarioName: input.quiz?.name || "Untitled finder scenario",
    summary: top
      ? `${top.product.name} wins this scenario with ${top.score.toFixed(1)} points from ${topSignals.slice(0, 2).join(" and ") || "the selected answer path"}. ${eligible.length} product${eligible.length === 1 ? "" : "s"} remain eligible after hard filters; ${blocked.length} product${blocked.length === 1 ? " is" : "s are"} blocked.`
      : `No product can be recommended for this scenario. ${blocked.length} product${blocked.length === 1 ? " is" : "s are"} blocked and ${eligible.length} remain eligible.`,
    buyerProfile,
    selectedAnswers: input.answers.map((answer) => ({
      question: answer.question,
      answer: answer.answer,
      rule: humanizeRule(answer),
      weight: answer.weight,
    })),
    eligibleProducts: eligible.length,
    blockedProducts: blocked.length,
    recommendedProducts: recommended.length,
    topProduct: top ? {
      productId: top.product.id,
      productName: top.product.name,
      score: Number(top.score.toFixed(2)),
      explanation: `${top.product.name} is selected deterministically from product facts. Strongest signals: ${topSignals.slice(0, 3).join(", ") || "preference-compatible answers"}.`,
      proofPoints: topProofPoints,
    } : undefined,
    scoreSpread: {
      highest: Number(highestScore.toFixed(2)),
      lowestEligible: Number(lowestEligibleScore.toFixed(2)),
      gap: Number((highestScore - lowestEligibleScore).toFixed(2)),
    },
    products: input.audits.slice(0, limit).map((audit, index) => productTrace(audit, index, recommendedIds)),
    tuningActions: buildTuningActions(input, eligible, blocked, recommended),
  };
}
