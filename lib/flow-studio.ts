import { answerToFinderAnswer, buildFinderQuestionPath, orderedFinderQuestions } from "./finder-flow";
import { analyzeQuizReadiness } from "./quiz-readiness";
import { getAnswerOptionCoverage } from "./rule-coverage";
import { buildScenarioCoverageReport } from "./scenario-coverage";
import type { AnswerOption, Product, Question, Quiz } from "@/lib/types";
import { auditProductMatches, formatCurrency } from "./utils";

export type FlowStudioStatus = "ready" | "review" | "blocked";
export type FlowStudioItemStatus = "pass" | "warn" | "fail";
export type FlowStudioNodeType = "welcome" | "question" | "result";
export type FlowStudioActionPriority = "critical" | "high" | "medium" | "low";

export type FlowStudioNode = {
  id: string;
  type: FlowStudioNodeType;
  label: string;
  detail: string;
  status: FlowStudioItemStatus;
  x: number;
  y: number;
  stats: {
    options: number;
    branchingOptions: number;
    matchedOptions: number;
    unmatchedOptions: number;
  };
};

export type FlowStudioEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  detail: string;
  status: FlowStudioItemStatus;
  answerId?: string;
  matchType?: AnswerOption["match_type"];
  matchValue?: string;
  weight?: number;
  productMatches: number;
  skippedQuestions: string[];
};

export type FlowStudioRoute = {
  id: string;
  label: string;
  status: FlowStudioItemStatus;
  answers: string[];
  visitedQuestions: string[];
  skippedQuestions: string[];
  topProducts: Array<{
    id: string;
    name: string;
    price: string;
    score: number;
  }>;
  detail: string;
  recommendation: string;
};

export type FlowStudioAction = {
  id: string;
  priority: FlowStudioActionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  label: string;
};

export type FlowStudioReport = {
  status: FlowStudioStatus;
  score: number;
  summary: {
    questions: number;
    answers: number;
    branchingAnswers: number;
    noMatchAnswers: number;
    invalidBranches: number;
    routeScenarios: number;
    passingRoutes: number;
    productCoverageRate: number;
  };
  nodes: FlowStudioNode[];
  edges: FlowStudioEdge[];
  routes: FlowStudioRoute[];
  actions: FlowStudioAction[];
  packet: string;
};

function statusScore(status: FlowStudioItemStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 62;
  return 0;
}

function reportStatus(score: number, actions: FlowStudioAction[]): FlowStudioStatus {
  if (actions.some((action) => action.priority === "critical")) return "blocked";
  if (score >= 84 && !actions.some((action) => action.priority === "high")) return "ready";
  return "review";
}

function edgeStatus(option: AnswerOption, targetQuestion?: Question, coverageStatus?: ReturnType<typeof getAnswerOptionCoverage>["status"]): FlowStudioItemStatus {
  if (option.next_question_id && !targetQuestion) return "fail";
  if (coverageStatus === "empty") return "fail";
  if (coverageStatus === "preference") return "warn";
  return "pass";
}

function edgeDetail(option: AnswerOption, targetLabel: string, coverageCount: number, invalidBranch: boolean) {
  if (invalidBranch) return `Routes to a missing question ID (${option.next_question_id}).`;
  const signal = option.match_type === "none" ? "preference-only answer" : `${option.match_type.replace("_", " ")}=${option.match_value || "empty"}`;
  return `${signal}; ${coverageCount} catalog match${coverageCount === 1 ? "" : "es"} before routing to ${targetLabel}.`;
}

function defaultSelectionsForOption(quiz: Quiz, question: Question, option: AnswerOption) {
  return Object.fromEntries(
    buildFinderQuestionPath(quiz, { [question.id]: option.id }, true)
      .flatMap((step) => step.selectedOption ? [[step.question.id, step.selectedOption.id] as const] : []),
  );
}

function targetForOption(questions: Question[], questionIndex: number, option: AnswerOption) {
  if (option.next_question_id) return questions.find((question) => question.id === option.next_question_id);
  return questions[questionIndex + 1];
}

function skippedForEdge(questions: Question[], questionIndex: number, target?: Question) {
  if (!target) return [];
  const targetIndex = questions.findIndex((question) => question.id === target.id);
  if (targetIndex <= questionIndex + 1) return [];
  return questions.slice(questionIndex + 1, targetIndex).map((question) => question.title);
}

function routeFromOption(quiz: Quiz, products: Product[], question: Question, option: AnswerOption): FlowStudioRoute {
  const selections = defaultSelectionsForOption(quiz, question, option);
  const path = buildFinderQuestionPath(quiz, selections, true);
  const answers = path.flatMap((step) => step.selectedOption ? [answerToFinderAnswer(step.question, step.selectedOption)] : []);
  const audits = auditProductMatches(products, answers, { overrides: quiz.recommendation_overrides || [] });
  const eligible = audits.filter((audit) => audit.eligible);
  const visitedQuestionIds = new Set(path.map((step) => step.question.id));
  const skippedQuestions = orderedFinderQuestions(quiz).filter((item) => !visitedQuestionIds.has(item.id)).map((item) => item.title);
  const status: FlowStudioItemStatus = !answers.length || !eligible.length ? "fail" : eligible.length < 2 ? "warn" : "pass";
  const topProducts = eligible.slice(0, 3).map((audit) => ({
    id: audit.product.id,
    name: audit.product.name,
    price: formatCurrency(audit.product.price),
    score: Math.round(audit.score * 10) / 10,
  }));

  return {
    id: `route:${question.id}:${option.id}`,
    label: `${question.title}: ${option.label}`,
    status,
    answers: answers.map((answer) => answer.answer),
    visitedQuestions: path.map((step) => step.question.title),
    skippedQuestions,
    topProducts,
    detail: status === "fail" ? "This answer path cannot produce a viable recommendation." : status === "warn" ? "This route works, but the recommendation set is thin." : `This route produces a usable match set led by ${topProducts[0]?.name || "a top product"}.`,
    recommendation: status === "fail" ? "Fix the answer mapping or branch before publishing." : status === "warn" ? "Broaden the rule or add another product signal for a stronger comparison set." : "Keep this route in launch QA when changing catalog or branch rules.",
  };
}

function actionsForReport({
  quiz,
  readinessScore,
  scenarioScore,
  noMatchAnswers,
  invalidBranches,
  failingRoutes,
}: {
  quiz: Quiz;
  readinessScore: number;
  scenarioScore: number;
  noMatchAnswers: number;
  invalidBranches: number;
  failingRoutes: number;
}) {
  const actions: FlowStudioAction[] = [];
  if (!quiz.questions.length) {
    actions.push({
      id: "add-questions",
      priority: "critical",
      title: "Add finder questions",
      detail: "The visual flow cannot launch without at least one question and answer route.",
      evidence: "0 questions detected.",
      href: "/dashboard/quizzes",
      label: "Open builder",
    });
  }
  if (invalidBranches) {
    actions.push({
      id: "fix-branches",
      priority: "critical",
      title: "Fix invalid branch targets",
      detail: "Some answers route to missing questions, which can break shopper navigation.",
      evidence: `${invalidBranches} invalid branch target${invalidBranches === 1 ? "" : "s"}.`,
      href: "/dashboard/quizzes",
      label: "Edit routes",
    });
  }
  if (noMatchAnswers) {
    actions.push({
      id: "repair-answer-coverage",
      priority: "high",
      title: "Repair no-match answer rules",
      detail: "Answers with no catalog coverage create dead recommendation paths.",
      evidence: `${noMatchAnswers} answer${noMatchAnswers === 1 ? "" : "s"} have no product matches.`,
      href: "/dashboard/quizzes",
      label: "Review rules",
    });
  }
  if (failingRoutes) {
    actions.push({
      id: "route-qa",
      priority: "high",
      title: "Fix blocked route QA paths",
      detail: "Simulated shopper routes should return at least one eligible recommendation.",
      evidence: `${failingRoutes} route scenario${failingRoutes === 1 ? "" : "s"} are blocked.`,
      href: "/dashboard/lab",
      label: "Open lab",
    });
  }
  if (readinessScore < 80) {
    actions.push({
      id: "readiness-score",
      priority: "medium",
      title: "Improve finder readiness",
      detail: "Publish-readiness checks still see structure, rule or catalog issues.",
      evidence: `Readiness score is ${readinessScore}%.`,
      href: "/dashboard/quizzes",
      label: "Fix readiness",
    });
  }
  if (scenarioScore < 80) {
    actions.push({
      id: "scenario-score",
      priority: "medium",
      title: "Expand route scenario coverage",
      detail: "More answer paths should produce healthy product coverage before a major campaign.",
      evidence: `Scenario coverage score is ${scenarioScore}%.`,
      href: "/dashboard/lab",
      label: "Run scenarios",
    });
  }
  if (!actions.length) {
    actions.push({
      id: "ready-to-launch",
      priority: "low",
      title: "Flow is ready for launch QA",
      detail: "The finder flow has valid branches, usable answer coverage and healthy route simulations.",
      evidence: "No high-risk flow issues detected.",
      href: "/dashboard/release-center",
      label: "Open release center",
    });
  }
  return actions;
}

function formatPacket(report: Omit<FlowStudioReport, "packet">, quiz: Quiz) {
  return [
    `Findly visual flow studio packet: ${quiz.name}`,
    "========================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Questions: ${report.summary.questions}`,
    `Answers: ${report.summary.answers}`,
    `Branching answers: ${report.summary.branchingAnswers}`,
    `No-match answers: ${report.summary.noMatchAnswers}`,
    `Invalid branches: ${report.summary.invalidBranches}`,
    "",
    "Answer route map",
    ...report.edges.map((edge) => `- [${edge.status.toUpperCase()}] ${edge.label}: ${edge.detail}`),
    "",
    "Route QA",
    ...report.routes.map((route) => `- [${route.status.toUpperCase()}] ${route.label}: ${route.detail}`),
    "",
    "Actions",
    ...report.actions.map((action) => `- ${action.priority.toUpperCase()}: ${action.title} — ${action.evidence}`),
  ].join("\n");
}

export function buildFlowStudioReport({ quiz, products, maxRoutes = 10 }: { quiz: Quiz; products: Product[]; maxRoutes?: number }): FlowStudioReport {
  const questions = orderedFinderQuestions(quiz);
  const readiness = analyzeQuizReadiness(quiz, products);
  const scenarioCoverage = buildScenarioCoverageReport(quiz, products, maxRoutes);
  const nodes: FlowStudioNode[] = [
    {
      id: "welcome",
      type: "welcome",
      label: quiz.welcome_title || quiz.name,
      detail: quiz.welcome_message || "The shopper starts here.",
      status: questions.length ? "pass" : "fail",
      x: 0,
      y: 160,
      stats: { options: 0, branchingOptions: 0, matchedOptions: 0, unmatchedOptions: 0 },
    },
    ...questions.map((question, index) => {
      const coverages = question.options.map((option) => getAnswerOptionCoverage(option, products));
      const matchedOptions = coverages.filter((coverage) => coverage.status === "matched").length;
      const unmatchedOptions = coverages.filter((coverage) => coverage.status === "empty").length;
      const branchingOptions = question.options.filter((option) => option.next_question_id).length;
      return {
        id: question.id,
        type: "question" as const,
        label: question.title || `Question ${index + 1}`,
        detail: question.helper_text || `${question.options.length} answer option${question.options.length === 1 ? "" : "s"}.`,
        status: !question.options.length || unmatchedOptions === question.options.length ? "fail" as const : unmatchedOptions ? "warn" as const : "pass" as const,
        x: 260 + index * 300,
        y: 80 + (index % 2) * 180,
        stats: { options: question.options.length, branchingOptions, matchedOptions, unmatchedOptions },
      };
    }),
    {
      id: "results",
      type: "result",
      label: "Recommended products",
      detail: "The deterministic engine ranks eligible products, then AI/fallback copy explains the already-selected matches.",
      status: readiness.canPublish ? "pass" : "warn",
      x: 260 + questions.length * 300,
      y: 160,
      stats: { options: 0, branchingOptions: 0, matchedOptions: 0, unmatchedOptions: 0 },
    },
  ];

  const welcomeEdge: FlowStudioEdge[] = questions[0] ? [{
    id: "welcome:start",
    source: "welcome",
    target: questions[0].id,
    label: "Start finder",
    detail: `Routes shoppers into ${questions[0].title}.`,
    status: "pass",
    productMatches: products.filter((product) => product.active).length,
    skippedQuestions: [],
  }] : [];

  const answerEdges = questions.flatMap((question, questionIndex) => question.options.map((option) => {
    const target = targetForOption(questions, questionIndex, option);
    const coverage = getAnswerOptionCoverage(option, products);
    const invalidBranch = Boolean(option.next_question_id && !target);
    const targetLabel = invalidBranch ? "a missing question" : target?.title || "recommended products";
    return {
      id: `edge:${question.id}:${option.id}`,
      source: question.id,
      target: target?.id || "results",
      label: option.label || "Untitled answer",
      detail: edgeDetail(option, targetLabel, coverage.count, invalidBranch),
      status: edgeStatus(option, target, coverage.status),
      answerId: option.id,
      matchType: option.match_type,
      matchValue: option.match_value,
      weight: option.weight,
      productMatches: coverage.count,
      skippedQuestions: skippedForEdge(questions, questionIndex, target),
    };
  }));

  const edges = [...welcomeEdge, ...answerEdges];
  const routes = answerEdges.slice(0, maxRoutes).map((edge) => {
    const question = questions.find((item) => item.id === edge.source);
    const option = question?.options.find((item) => item.id === edge.answerId);
    return question && option ? routeFromOption(quiz, products, question, option) : undefined;
  }).filter((route): route is FlowStudioRoute => Boolean(route));
  const noMatchAnswers = answerEdges.filter((edge) => edge.status === "fail" && edge.productMatches === 0).length;
  const invalidBranches = answerEdges.filter((edge) => edge.detail.includes("missing question")).length;
  const failingRoutes = routes.filter((route) => route.status === "fail").length;
  const actions = actionsForReport({
    quiz,
    readinessScore: readiness.score,
    scenarioScore: scenarioCoverage.score,
    noMatchAnswers,
    invalidBranches,
    failingRoutes,
  });
  const edgeScore = Math.round(edges.reduce((sum, edge) => sum + statusScore(edge.status), 0) / Math.max(1, edges.length));
  const score = Math.round(readiness.score * 0.32 + scenarioCoverage.score * 0.34 + edgeScore * 0.34);
  const status = reportStatus(score, actions);
  const baseReport = {
    status,
    score,
    summary: {
      questions: questions.length,
      answers: answerEdges.length,
      branchingAnswers: answerEdges.filter((edge) => edge.skippedQuestions.length || questions.some((question) => question.options.some((option) => option.id === edge.answerId && option.next_question_id))).length,
      noMatchAnswers,
      invalidBranches,
      routeScenarios: scenarioCoverage.summary.scenarios,
      passingRoutes: scenarioCoverage.summary.passing,
      productCoverageRate: scenarioCoverage.summary.productCoverageRate,
    },
    nodes,
    edges,
    routes,
    actions,
  };

  return { ...baseReport, packet: formatPacket(baseReport, quiz) };
}
