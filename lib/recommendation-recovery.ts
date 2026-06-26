import type { FinderAnswer, Product, ProductMatchAudit } from "@/lib/types";
import { auditProductMatches, formatCurrency } from "@/lib/utils";

export type RecommendationRecovery = {
  status: "healthy" | "thin" | "no-results";
  summary: string;
  primaryAction: string;
  suggestions: Array<{
    id: string;
    title: string;
    detail: string;
    answer?: string;
  }>;
  blockers: Array<{
    reason: string;
    count: number;
    productNames: string[];
  }>;
  closestProducts: Array<{
    productId: string;
    name: string;
    category: string;
    price: number;
    score: number;
    blockedReason?: string;
    strongestSignals: string[];
  }>;
};

function groupBlockers(audits: ProductMatchAudit[]) {
  const groups = new Map<string, ProductMatchAudit[]>();
  for (const audit of audits) {
    if (audit.eligible) continue;
    const reason = audit.blockedReason?.includes("Above the selected")
      ? "Above selected budget"
      : audit.blockedReason?.includes("inactive")
        ? "Inactive product"
        : audit.blockedReason || "Blocked by current rules";
    groups.set(reason, [...(groups.get(reason) || []), audit]);
  }

  return [...groups.entries()]
    .map(([reason, items]) => ({
      reason,
      count: items.length,
      productNames: items.slice(0, 3).map((item) => item.product.name),
    }))
    .sort((a, b) => b.count - a.count);
}

function strongestSignals(audit: ProductMatchAudit) {
  return audit.signals
    .filter((signal) => signal.matched && signal.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map((signal) => signal.answer)
    .slice(0, 3);
}

function budgetAnswers(answers: FinderAnswer[]) {
  return answers
    .filter((answer) => answer.matchType === "budget_max")
    .map((answer) => Number(answer.matchValue))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function unmatchedAnswerSuggestions(answers: FinderAnswer[], audits: ProductMatchAudit[]) {
  return answers.flatMap((answer) => {
    if (answer.matchType === "none" || answer.matchType === "budget_max") return [];
    const matched = audits.some((audit) => audit.signals.some((signal) => signal.answer === answer.answer && signal.matched));
    if (matched) return [];
    return [{
      id: `unmatched-${answer.optionId}`,
      title: `Try a different answer for “${answer.question}”`,
      detail: `No active product currently carries the ${answer.matchType.replace("_", " ")} signal “${answer.matchValue}”.`,
      answer: answer.answer,
    }];
  });
}

export function buildRecommendationRecoveryReport({
  products,
  answers,
  audits = auditProductMatches(products, answers),
  recommendedCount,
}: {
  products: Product[];
  answers: FinderAnswer[];
  audits?: ProductMatchAudit[];
  recommendedCount: number;
}): RecommendationRecovery {
  const eligible = audits.filter((audit) => audit.eligible);
  const blockers = groupBlockers(audits);
  const budgets = budgetAnswers(answers);
  const overBudgetBlocker = blockers.find((blocker) => blocker.reason === "Above selected budget");
  const closest = audits
    .filter((audit) => audit.score > 0 || !audit.eligible)
    .slice(0, 4)
    .map((audit) => ({
      productId: audit.product.id,
      name: audit.product.name,
      category: audit.product.category,
      price: audit.product.price,
      score: Number(audit.score.toFixed(2)),
      blockedReason: audit.blockedReason,
      strongestSignals: strongestSignals(audit),
    }));

  const suggestions = [
    ...(overBudgetBlocker && budgets.length ? [{
      id: "relax-budget",
      title: "Try a wider budget",
      detail: `${overBudgetBlocker.count} active product${overBudgetBlocker.count === 1 ? " is" : "s are"} close, but above ${formatCurrency(Math.min(...budgets))}.`,
    }] : []),
    ...unmatchedAnswerSuggestions(answers, audits),
  ];

  if (!suggestions.length && recommendedCount < 3 && eligible.length > recommendedCount) {
    suggestions.push({
      id: "broaden-preferences",
      title: "Broaden one preference",
      detail: "A few products are eligible but scored below the strongest matches. A less specific answer may reveal more options.",
    });
  }

  const status: RecommendationRecovery["status"] = recommendedCount === 0 ? "no-results" : recommendedCount < 3 ? "thin" : "healthy";
  const summary = status === "no-results"
    ? blockers.length
      ? `No product passed this exact answer path. The main blocker is ${blockers[0].reason.toLowerCase()} across ${blockers[0].count} product${blockers[0].count === 1 ? "" : "s"}.`
      : "No product scored strongly enough for this exact answer path."
    : status === "thin"
      ? `Only ${recommendedCount} product${recommendedCount === 1 ? "" : "s"} made the final set, so broadening one preference may reveal more options.`
      : "This answer path has enough deterministic matches.";

  return {
    status,
    summary,
    primaryAction: suggestions[0]?.title || (status === "healthy" ? "Review your matches" : "Start again with broader preferences"),
    suggestions: suggestions.slice(0, 3),
    blockers,
    closestProducts: closest,
  };
}
