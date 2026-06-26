import { answerToFinderAnswer, buildFinderQuestionPath, defaultFinderSelections, orderedFinderQuestions } from "./finder-flow";
import type { Product, Quiz } from "@/lib/types";
import { auditProductMatches } from "./utils";

export type RecommendationQaStatus = "pass" | "warn" | "fail";

export type RecommendationQaScenario = {
  id: string;
  quizId: string;
  quizName: string;
  label: string;
  status: RecommendationQaStatus;
  answers: string[];
  visitedQuestions: string[];
  eligibleProducts: number;
  blockedProducts: number;
  topProduct?: string;
  topScore: number;
  detail: string;
};

export type RecommendationQaReport = {
  status: RecommendationQaStatus;
  score: number;
  scenarios: RecommendationQaScenario[];
  blockers: RecommendationQaScenario[];
  warnings: RecommendationQaScenario[];
  summary: {
    quizzesChecked: number;
    scenariosChecked: number;
    passingScenarios: number;
    thinResultScenarios: number;
    noResultScenarios: number;
  };
};

function statusRank(status: RecommendationQaStatus) {
  return status === "fail" ? 2 : status === "warn" ? 1 : 0;
}

function worstStatus(statuses: RecommendationQaStatus[]): RecommendationQaStatus {
  return statuses.reduce<RecommendationQaStatus>((worst, status) => statusRank(status) > statusRank(worst) ? status : worst, "pass");
}

function scenarioStatus(answerCount: number, eligibleProducts: number, topScore: number): RecommendationQaStatus {
  if (!answerCount || !eligibleProducts) return "fail";
  if (eligibleProducts < 3 || topScore <= 0) return "warn";
  return "pass";
}

function scenarioDetail(status: RecommendationQaStatus, eligibleProducts: number, topProduct?: string) {
  if (status === "fail") return "This path does not produce any eligible recommendation. Review answer rules, budget ceilings or active product coverage.";
  if (status === "warn") return `${eligibleProducts} eligible product${eligibleProducts === 1 ? "" : "s"} found. This can launch, but consider adding catalog coverage or broader answer rules.`;
  return `Returns a healthy recommendation set led by ${topProduct || "the top-ranked product"}.`;
}

function scenarioSelections(quiz: Quiz) {
  const questions = orderedFinderQuestions(quiz);
  const firstQuestion = questions[0];
  const defaults = defaultFinderSelections(quiz);
  const seeds: Array<{ id: string; label: string; selections: Record<string, string> }> = [
    { id: "default", label: "Default shopper path", selections: defaults },
  ];

  for (const option of firstQuestion?.options.slice(0, 5) || []) {
    seeds.push({
      id: `start-${option.id}`,
      label: `Starts with “${option.label}”`,
      selections: { ...defaults, [firstQuestion.id]: option.id },
    });
  }

  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const key = JSON.stringify(seed.selections);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analyzeScenario(quiz: Quiz, products: Product[], seed: ReturnType<typeof scenarioSelections>[number]): RecommendationQaScenario {
  const path = buildFinderQuestionPath(quiz, seed.selections, true);
  const answers = path.flatMap((step) => step.selectedOption ? [answerToFinderAnswer(step.question, step.selectedOption)] : []);
  const audits = auditProductMatches(products, answers, { overrides: quiz.recommendation_overrides || [] });
  const eligible = audits.filter((audit) => audit.eligible);
  const top = eligible[0];
  const status = scenarioStatus(answers.length, eligible.length, top?.score || 0);

  return {
    id: `${quiz.id}:${seed.id}`,
    quizId: quiz.id,
    quizName: quiz.name,
    label: seed.label,
    status,
    answers: answers.map((answer) => answer.answer),
    visitedQuestions: path.map((step) => step.question.title),
    eligibleProducts: eligible.length,
    blockedProducts: audits.length - eligible.length,
    topProduct: top?.product.name,
    topScore: Math.round((top?.score || 0) * 10) / 10,
    detail: scenarioDetail(status, eligible.length, top?.product.name),
  };
}

export function buildRecommendationQaReport(quizzes: Quiz[], products: Product[]): RecommendationQaReport {
  const publishedOrAll = quizzes.filter((quiz) => quiz.published).length ? quizzes.filter((quiz) => quiz.published) : quizzes;
  const checkable = publishedOrAll.filter((quiz) => quiz.questions.length);
  const scenarios = checkable.flatMap((quiz) => scenarioSelections(quiz).map((seed) => analyzeScenario(quiz, products, seed)));
  const blockers = scenarios.filter((scenario) => scenario.status === "fail");
  const warnings = scenarios.filter((scenario) => scenario.status === "warn");
  const passingScenarios = scenarios.filter((scenario) => scenario.status === "pass").length;
  const status = scenarios.length ? worstStatus(scenarios.map((scenario) => scenario.status)) : "fail";
  const score = scenarios.length ? Math.round((passingScenarios / scenarios.length) * 100) : 0;

  return {
    status,
    score,
    scenarios,
    blockers,
    warnings,
    summary: {
      quizzesChecked: checkable.length,
      scenariosChecked: scenarios.length,
      passingScenarios,
      thinResultScenarios: warnings.length,
      noResultScenarios: blockers.length,
    },
  };
}
