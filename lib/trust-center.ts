import { buildAnalyticsQualityReport } from "./analytics-quality";
import { buildDecisionGraph } from "./decision-graph";
import { buildExplanationGroundingReport } from "./explanation-grounding";
import { buildRecommendationQaReport } from "./recommendation-qa";
import { buildVocabularyStudioReport } from "./vocabulary-studio";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export type TrustCenterStatus = "trusted" | "review" | "blocked";
export type TrustPillarStatus = "pass" | "warn" | "fail";
export type TrustActionPriority = "critical" | "high" | "medium" | "low";

export type TrustPillar = {
  id: string;
  label: string;
  status: TrustPillarStatus;
  score: number;
  detail: string;
  evidence: string[];
  href: string;
  action: string;
};

export type TrustAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: TrustActionPriority;
  href: string;
  label: string;
};

export type TrustCenterReport = {
  status: TrustCenterStatus;
  score: number;
  headline: string;
  summary: {
    pillars: number;
    passing: number;
    warnings: number;
    blockers: number;
    groundedRecommendations: number;
    analyticsQualityScore: number;
    recommendationQaScore: number;
    vocabularyScore: number;
    decisionGraphScore: number;
  };
  principles: Array<{
    label: string;
    detail: string;
    proof: string;
  }>;
  pillars: TrustPillar[];
  actions: TrustAction[];
  aiBoundary: string[];
  dataBoundary: string[];
  packet: string;
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFromScore(score: number): TrustPillarStatus {
  if (score >= 82) return "pass";
  if (score >= 58) return "warn";
  return "fail";
}

function normalizeStatus(status: string, score: number): TrustPillarStatus {
  if (["pass", "healthy", "ready"].includes(status)) return "pass";
  if (["warn", "watch", "needs-review", "review"].includes(status)) return "warn";
  if (["fail", "needs-attention", "blocked"].includes(status)) return "fail";
  return statusFromScore(score);
}

function reportStatus(pillars: TrustPillar[]): TrustCenterStatus {
  if (pillars.some((pillar) => pillar.status === "fail")) return "blocked";
  if (pillars.some((pillar) => pillar.status === "warn")) return "review";
  return "trusted";
}

function actionPriority(status: TrustPillarStatus): TrustActionPriority {
  if (status === "fail") return "critical";
  if (status === "warn") return "high";
  return "low";
}

function buildActions(pillars: TrustPillar[]): TrustAction[] {
  const actions = pillars
    .filter((pillar) => pillar.status !== "pass")
    .map((pillar) => ({
      id: `trust-${pillar.id}`,
      title: pillar.action,
      detail: pillar.detail,
      evidence: pillar.evidence[0] || `${pillar.label} score is ${pillar.score}%.`,
      priority: actionPriority(pillar.status),
      href: pillar.href,
      label: pillar.status === "fail" ? "Fix before launch" : "Review",
    }));

  if (!actions.length) {
    actions.push({
      id: "trust-ready-for-release",
      title: "Attach the trust packet to your release checklist",
      detail: "The current workspace has deterministic product selection, grounded AI copy, analytics coverage and runtime guardrails ready for launch QA.",
      evidence: "All trust pillars passed.",
      priority: "low",
      href: "/dashboard/release-center",
      label: "Open release center",
    });
  }

  const rank: Record<TrustActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function packet(report: Omit<TrustCenterReport, "packet">) {
  return [
    "Sellentum AI trust packet",
    "======================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Trust principles",
    ...report.principles.map((principle) => `- ${principle.label}: ${principle.detail} Proof: ${principle.proof}`),
    "",
    "Runtime guardrails",
    ...report.aiBoundary.map((item) => `- ${item}`),
    "",
    "Data boundary",
    ...report.dataBoundary.map((item) => `- ${item}`),
    "",
    "Trust pillars",
    ...report.pillars.map((pillar) => `- [${pillar.status.toUpperCase()}] ${pillar.label} (${pillar.score}%): ${pillar.detail}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildTrustCenterReport({
  products,
  quizzes,
  configurators = [],
  events = [],
  openaiConfigured = false,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators?: Configurator[];
  events?: AnalyticsEvent[];
  openaiConfigured?: boolean;
}): TrustCenterReport {
  const activeProducts = products.filter((product) => product.active);
  const publishedQuizzes = quizzes.filter((quiz) => quiz.published && quiz.questions.length);
  const explanation = buildExplanationGroundingReport({ products, quizzes, openaiConfigured });
  const analytics = buildAnalyticsQualityReport(events);
  const recommendationQa = buildRecommendationQaReport(quizzes, products);
  const graph = buildDecisionGraph({ products, quizzes, configurators, events });
  const vocabulary = buildVocabularyStudioReport({ products, quizzes, events });
  const publicRuntimeScore = clampScore(
    42
    + (publishedQuizzes.length ? 18 : 0)
    + (activeProducts.length >= 2 ? 15 : 0)
    + (recommendationQa.status !== "fail" ? 15 : 0)
    + (analytics.summary.events ? 10 : 0),
  );
  const privacyScore = clampScore(analytics.score * 0.72 + (events.length ? 18 : 8) + 10);
  const deterministicScore = clampScore(recommendationQa.score * 0.6 + graph.score * 0.4);
  const aiGroundingScore = clampScore(explanation.score);
  const vocabularyScore = clampScore(vocabulary.score);

  const pillars: TrustPillar[] = [
    {
      id: "deterministic-selection",
      label: "Deterministic product selection",
      status: normalizeStatus(recommendationQa.status === "fail" || graph.status === "blocked" ? "fail" : recommendationQa.status === "warn" || graph.status === "needs-review" ? "warn" : "pass", deterministicScore),
      score: deterministicScore,
      detail: "Products are selected by stored answer rules, catalog signals, budget constraints and merchandising overrides before AI copy is used.",
      evidence: [
        `${recommendationQa.summary.passingScenarios}/${recommendationQa.summary.scenariosChecked} QA scenarios pass.`,
        `${graph.summary.connectedRules}/${graph.summary.finderRules} finder rules connect to catalog facts.`,
      ],
      href: "/dashboard/lab",
      action: "Repair finder rules and run the recommendation lab",
    },
    {
      id: "grounded-ai",
      label: "Grounded AI explanations",
      status: normalizeStatus(explanation.status, aiGroundingScore),
      score: aiGroundingScore,
      detail: "AI only explains why deterministic matches fit the shopper; explanation copy is audited against product facts and selected answer reasons.",
      evidence: [
        `${explanation.summary.groundedRecommendations}/${explanation.summary.auditedRecommendations} audited recommendations are grounded.`,
        `Explanation source mode: ${explanation.sourceMode}.`,
      ],
      href: "/dashboard/preflight",
      action: "Strengthen product facts and rerun explanation grounding",
    },
    {
      id: "approved-vocabulary",
      label: "Approved discovery vocabulary",
      status: normalizeStatus(vocabulary.status, vocabularyScore),
      score: vocabularyScore,
      detail: "Shopper language, synonyms, benefits and semantic fields are reviewed before they influence search, advisor matching or explanation copy.",
      evidence: [
        `${vocabulary.summary.approvedTerms}/${vocabulary.summary.terms} discovery terms are approved.`,
        `${vocabulary.summary.productTasks} product language tasks remain.`,
      ],
      href: "/dashboard/vocabulary",
      action: "Approve or reject unsupported shopper vocabulary",
    },
    {
      id: "analytics-integrity",
      label: "Analytics and attribution integrity",
      status: normalizeStatus(analytics.status, privacyScore),
      score: privacyScore,
      detail: "Launch analytics use anonymous session metadata and experience IDs so funnel, replay and product-demand reports stay auditable.",
      evidence: [
        `${analytics.summary.events} events across ${analytics.summary.sessions} sessions inspected.`,
        `${analytics.summary.completeEventTypes}/5 required event types captured.`,
      ],
      href: "/dashboard/analytics",
      action: "Generate a full QA journey and repair missing event metadata",
    },
    {
      id: "runtime-guardrails",
      label: "Public runtime guardrails",
      status: statusFromScore(publicRuntimeScore),
      score: publicRuntimeScore,
      detail: "Embeds load public runtimes that fetch only published experiences, keep catalog logic server-side, and return bounded recommendation payloads.",
      evidence: [
        `${publishedQuizzes.length} published finder${publishedQuizzes.length === 1 ? "" : "s"} available.`,
        `${activeProducts.length} active catalog product${activeProducts.length === 1 ? "" : "s"} available.`,
      ],
      href: "/dashboard/storefront-sandbox",
      action: "Run storefront QA against the public embed runtime",
    },
    {
      id: "partner-data-boundary",
      label: "Partner-safe data boundary",
      status: normalizeStatus(graph.status, graph.score),
      score: clampScore(graph.score),
      detail: "Partner, syndication and release workflows can share launch packets without exposing private override logic or full internal QA traces to shoppers.",
      evidence: [
        `${graph.summary.edges} graph relationships are modeled.`,
        `${graph.summary.unresolvedLanguageTerms} unresolved observed shopper terms remain.`,
      ],
      href: "/dashboard/syndication",
      action: "Review partner packet boundaries before syndication",
    },
  ];

  const status = reportStatus(pillars);
  const score = clampScore(pillars.reduce((sum, pillar) => sum + pillar.score, 0) / Math.max(1, pillars.length));
  const actions = buildActions(pillars);
  const headline = status === "trusted"
    ? "This workspace is ready to explain AI-assisted recommendations with merchant-auditable evidence."
    : status === "review"
      ? "This workspace is safe to QA, but a few trust checks should be reviewed before launch."
      : "This workspace has launch-blocking trust gaps before the widget should go live.";
  const baseReport: Omit<TrustCenterReport, "packet"> = {
    status,
    score,
    headline,
    summary: {
      pillars: pillars.length,
      passing: pillars.filter((pillar) => pillar.status === "pass").length,
      warnings: pillars.filter((pillar) => pillar.status === "warn").length,
      blockers: pillars.filter((pillar) => pillar.status === "fail").length,
      groundedRecommendations: explanation.summary.groundedRecommendations,
      analyticsQualityScore: analytics.score,
      recommendationQaScore: recommendationQa.score,
      vocabularyScore: vocabulary.score,
      decisionGraphScore: graph.score,
    },
    principles: [
      {
        label: "Rules select. AI explains.",
        detail: "Recommendation ranking stays deterministic, auditable and repeatable.",
        proof: `${recommendationQa.summary.scenariosChecked} branch-aware scenarios checked by the QA helper.`,
      },
      {
        label: "Catalog facts are the source of truth.",
        detail: "Explanations can cite product names, categories, features, tags, buyer needs and selected answers only.",
        proof: `${explanation.summary.auditedRecommendations} result-card explanations sampled.`,
      },
      {
        label: "No hidden shopper profiling.",
        detail: "Analytics are tied to anonymous widget sessions, experience IDs and product events rather than personal identities.",
        proof: `${analytics.summary.eventsWithSession}/${analytics.summary.events} events include session linkage.`,
      },
      {
        label: "Embed output is bounded.",
        detail: "Public runtimes return 1–3 product recommendations and metadata needed for analytics, not the merchant’s whole catalog.",
        proof: `${publishedQuizzes.length || quizzes.length} finder experience${(publishedQuizzes.length || quizzes.length) === 1 ? "" : "s"} available.`,
      },
    ],
    pillars,
    actions,
    aiBoundary: [
      "Rules select products first; AI only explains selected deterministic matches.",
      "AI explanations must be grounded in catalog facts, answer reasons and approved shopper vocabulary.",
      "When OpenAI is unavailable, Sellentum falls back to deterministic explanation copy.",
      "Risky certainty, medical or unsupported claims are treated as grounding blockers.",
      "Recommendation QA, decision graph and preflight reports are reusable audits before every launch.",
    ],
    dataBoundary: [
      "Public finder endpoints validate published experiences before returning shopper-facing payloads.",
      "The widget tracks anonymous session IDs, experience metadata, recommendation ranks and buy-click product IDs.",
      "Catalog products, answer rules and merchandising overrides remain merchant-owned workspace data.",
      "Partner packets should share launch status, snippets and approved copy—not private API keys or raw customer identities.",
      "Sellentum does not need checkout-order attribution for this MVP; commercial impact is modeled from guided-session events.",
    ],
  };

  return { ...baseReport, packet: packet(baseReport) };
}
