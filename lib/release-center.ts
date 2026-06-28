import { buildAnalyticsQualityReport } from "./analytics-quality";
import { analyzeCatalogIntelligence } from "./catalog-intelligence";
import { analyzeConfiguratorReadiness } from "./configurator-readiness";
import { buildDecisionGraph } from "./decision-graph";
import { buildExperimentPlanningReport } from "./experiments";
import { buildLaunchChannelReport } from "./launch-channels";
import { analyzeQuizReadiness } from "./quiz-readiness";
import { buildRecommendationQaReport } from "./recommendation-qa";
import { buildStorefrontSandboxReport } from "./storefront-sandbox";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type ReleaseGateStatus = "pass" | "warn" | "fail";
export type ReleaseDecision = "go" | "review" | "no-go";

export type ReleaseGate = {
  id: string;
  label: string;
  detail: string;
  status: ReleaseGateStatus;
  owner: "Merchant" | "Developer" | "Growth" | "Catalog" | "Sellentum";
  href: string;
  action: string;
};

export type ReleaseAction = {
  id: string;
  title: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
  href: string;
  label: string;
};

export type ReleaseCandidate = {
  id: string;
  title: string;
  decision: ReleaseDecision;
  score: number;
  generatedAt: string;
  summary: {
    activeProducts: number;
    publishedFinders: number;
    publishedConfigurators: number;
    installReadyChannels: number;
    sandboxVerifiedCases: number;
    analyticsQualityScore: number;
    decisionGraphScore: number;
    recommendationQaScore: number;
  };
  scope: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  gates: ReleaseGate[];
  actions: ReleaseAction[];
  rollbackPlan: string[];
  releaseNotes: string;
  strengths: string[];
};

function statusScore(status: ReleaseGateStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 62;
  return 0;
}

function decisionFromGates(gates: ReleaseGate[], score: number): ReleaseDecision {
  if (gates.some((gate) => gate.status === "fail")) return "no-go";
  if (score >= 86 && gates.filter((gate) => gate.status === "warn").length <= 2) return "go";
  return "review";
}

function releaseId(date: Date) {
  return `sellentum-${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
}

function gate(id: string, label: string, detail: string, status: ReleaseGateStatus, owner: ReleaseGate["owner"], href: string, action: string): ReleaseGate {
  return { id, label, detail, status, owner, href, action };
}

function buildActions(gates: ReleaseGate[]): ReleaseAction[] {
  const actions: ReleaseAction[] = gates
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      id: `release-${item.id}`,
      title: item.status === "fail" ? `Blocker: ${item.label}` : `Review: ${item.label}`,
      detail: item.detail,
      priority: item.status === "fail" ? "critical" as const : item.owner === "Developer" ? "high" as const : "medium" as const,
      href: item.href,
      label: item.action,
    }));

  if (!actions.length) {
    actions.push({
      id: "release-ship",
      title: "Ship the release candidate",
      detail: "All launch gates are passing. Copy the release notes and QA packet before installing the selected snippets on production.",
      priority: "low",
      href: "/dashboard/storefront-sandbox",
      label: "Open QA sandbox",
    });
  }

  return actions;
}

function formatReleaseNotes(candidate: Omit<ReleaseCandidate, "releaseNotes">) {
  return [
    `Sellentum release candidate: ${candidate.title}`,
    "========================================",
    "",
    `Release ID: ${candidate.id}`,
    `Decision: ${candidate.decision.toUpperCase()}`,
    `Score: ${candidate.score}%`,
    `Generated: ${candidate.generatedAt}`,
    "",
    "Release scope",
    ...candidate.scope.map((item) => `- ${item.label}: ${item.value} — ${item.detail}`),
    "",
    "Launch gates",
    ...candidate.gates.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),
    "",
    "Rollback plan",
    ...candidate.rollbackPlan.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Next actions",
    ...candidate.actions.map((item) => `- ${item.priority.toUpperCase()}: ${item.title} — ${item.detail}`),
  ].join("\n");
}

export function buildReleaseCandidate({
  origin,
  products,
  quizzes,
  configurators,
  events,
  settings,
  generatedAt = new Date(),
}: {
  origin: string;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  generatedAt?: Date;
}): ReleaseCandidate {
  const activeProducts = products.filter((product) => product.active);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const catalog = analyzeCatalogIntelligence(products);
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const recommendationQa = buildRecommendationQaReport(quizzes, products);
  const decisionGraph = buildDecisionGraph({ products, quizzes, configurators, events });
  const launchChannels = buildLaunchChannelReport({ origin, settings, finders: quizzes, configurators, events });
  const sandbox = buildStorefrontSandboxReport({ origin, settings, finders: quizzes, configurators, events });
  const experiments = buildExperimentPlanningReport({ origin, settings, products, quizzes, configurators, events });
  const readyFinders = publishedFinders.filter((quiz) => analyzeQuizReadiness(quiz, products).canPublish);
  const readyConfigurators = publishedConfigurators.filter((configurator) => analyzeConfiguratorReadiness(configurator, products).canPublish);
  const primaryFinder = readyFinders[0] || publishedFinders[0] || quizzes[0];
  const primaryConfigurator = readyConfigurators[0] || publishedConfigurators[0] || configurators[0];

  const gates: ReleaseGate[] = [
    gate(
      "catalog",
      "Catalog launch quality",
      `${activeProducts.length} active products · ${catalog.score}% catalog intelligence score.`,
      activeProducts.length >= 3 && catalog.score >= 78 ? "pass" : activeProducts.length >= 2 ? "warn" : "fail",
      "Catalog",
      "/dashboard/products",
      "Review catalog",
    ),
    gate(
      "finder",
      "Published finder",
      readyFinders.length ? `${readyFinders.length} finder${readyFinders.length === 1 ? "" : "s"} are published and readiness-checked.` : "No published finder is fully launch-ready.",
      readyFinders.length ? "pass" : publishedFinders.length ? "warn" : "fail",
      "Merchant",
      "/dashboard/quizzes",
      "Open finder",
    ),
    gate(
      "recommendations",
      "Recommendation reliability",
      `${recommendationQa.score}% QA score · ${recommendationQa.summary.passingScenarios}/${recommendationQa.summary.scenariosChecked} scenarios passed.`,
      recommendationQa.status,
      "Sellentum",
      "/dashboard/lab",
      "Debug recommendations",
    ),
    gate(
      "decision-graph",
      "Decision graph trust",
      `${decisionGraph.score}% graph confidence across products, rules, configurators and shopper language.`,
      decisionGraph.status === "healthy" ? "pass" : decisionGraph.status === "needs-review" ? "warn" : "fail",
      "Merchant",
      "/dashboard/decision-graph",
      "Open graph",
    ),
    gate(
      "channels",
      "Install-ready channels",
      `${launchChannels.summary.installReady}/${launchChannels.summary.channels} channel snippets are install-ready.`,
      launchChannels.summary.blockedChannels ? "fail" : launchChannels.summary.installReady === launchChannels.summary.channels ? "pass" : "warn",
      "Growth",
      "/dashboard/channels",
      "Open channels",
    ),
    gate(
      "sandbox",
      "Storefront QA proof",
      `${sandbox.summary.verified}/${sandbox.summary.cases} sandbox cases have completed attributed QA telemetry.`,
      sandbox.summary.blocked ? "fail" : sandbox.summary.verified ? "pass" : "warn",
      "Developer",
      "/dashboard/storefront-sandbox",
      "Run sandbox QA",
    ),
    gate(
      "analytics",
      "Analytics event quality",
      `${analyticsQuality.score}% analytics QA score across ${events.length} events.`,
      analyticsQuality.score >= 85 ? "pass" : analyticsQuality.score >= 60 ? "warn" : "fail",
      "Sellentum",
      "/dashboard/analytics",
      "Open analytics",
    ),
    gate(
      "experiments",
      "Post-launch optimization plan",
      `${experiments.summary.ready + experiments.summary.learning + experiments.summary.winners}/${experiments.summary.experiments} experiments are ready, learning or winning.`,
      experiments.status === "blocked" ? "warn" : "pass",
      "Growth",
      "/dashboard/experiments",
      "Open experiments",
    ),
  ];
  const score = Math.round(gates.reduce((sum, item) => sum + statusScore(item.status), 0) / Math.max(1, gates.length));
  const decision = decisionFromGates(gates, score);
  const baseCandidate = {
    id: releaseId(generatedAt),
    title: `${settings.brand_name || "Sellentum"} storefront release`,
    decision,
    score,
    generatedAt: generatedAt.toISOString(),
    summary: {
      activeProducts: activeProducts.length,
      publishedFinders: publishedFinders.length,
      publishedConfigurators: publishedConfigurators.length,
      installReadyChannels: launchChannels.summary.installReady,
      sandboxVerifiedCases: sandbox.summary.verified,
      analyticsQualityScore: analyticsQuality.score,
      decisionGraphScore: decisionGraph.score,
      recommendationQaScore: recommendationQa.score,
    },
    scope: [
      { label: "Primary finder", value: primaryFinder?.name || "Not selected", detail: primaryFinder?.published ? "Published and available for finder/advisor/search channels." : "Draft or missing; publish before production launch." },
      { label: "Primary configurator", value: primaryConfigurator?.name || "Not selected", detail: primaryConfigurator?.published ? "Published and available for PDP bundle channels." : "Optional; publish when bundles/compatibility matter." },
      { label: "Launch channels", value: `${launchChannels.summary.installReady}/${launchChannels.summary.channels} ready`, detail: "Homepage, category, PDP and support placements are packaged with attribution labels." },
      { label: "Storefront QA", value: `${sandbox.summary.verified}/${sandbox.summary.cases} verified`, detail: "Sandbox cases prove embed behavior and expected telemetry before live theme changes." },
      { label: "Optimization backlog", value: `${experiments.summary.experiments} experiments`, detail: "Post-launch tests are available for copy, friction, search, PDP configurator and attribution." },
    ],
    gates,
    actions: buildActions(gates),
    rollbackPlan: [
      "Remove or comment out the newest Sellentum script snippet from the storefront theme slot.",
      "Restore the previous stable snippet from the last copied launch packet or channel packet.",
      "If a published finder/configurator caused the issue, unpublish it and route the channel back to the previous stable experience ID.",
      "Run Storefront QA Sandbox for the restored placement and confirm widget_view plus buy_click telemetry are accepted.",
      "Monitor Analytics for one full traffic window before trying the release again.",
    ],
    strengths: gates.filter((item) => item.status === "pass").map((item) => `${item.label}: ${item.detail}`),
  };

  return { ...baseCandidate, releaseNotes: formatReleaseNotes(baseCandidate) };
}
