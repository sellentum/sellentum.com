import { buildAdvisorRecoveryReport, type AdvisorRecoveryReport } from "./advisor-recovery";
import { runSemanticProductSearch, type ProductSearchReport, type ProductSearchResult } from "./search-engine";
import { buildWidgetInstallReport, buildWidgetSnippet } from "./widget-snippet";
import type { AnalyticsEvent, ConversationalMatch, Product, Quiz, WidgetSettings } from "@/lib/types";

export type AdvisorStudioStatus = "ready" | "review" | "blocked";
export type AdvisorScenarioStatus = "recommendations" | "clarifying" | "weak" | "no-results";
export type AdvisorStudioCheckStatus = "pass" | "warn" | "fail";
export type AdvisorStudioActionPriority = "critical" | "high" | "medium" | "low";

export type AdvisorScenario = {
  id: string;
  prompt: string;
  status: AdvisorScenarioStatus;
  assistantMessage: string;
  source: "rules" | "hybrid-ready";
  terms: string[];
  maxBudget: number | null;
  topScore: number;
  topProduct?: string;
  results: ProductSearchResult[];
  coverage: ProductSearchReport["intent"]["coverage"];
  recovery: AdvisorRecoveryReport;
};

export type AdvisorStudioCheck = {
  id: string;
  label: string;
  status: AdvisorStudioCheckStatus;
  detail: string;
  evidence: string;
  href: string;
  action: string;
};

export type AdvisorStudioAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: AdvisorStudioActionPriority;
  href: string;
  label: string;
};

export type AdvisorStudioReport = {
  status: AdvisorStudioStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    publishedFinders: number;
    prompts: number;
    recommendationPrompts: number;
    clarifyingPrompts: number;
    weakPrompts: number;
    noResultPrompts: number;
    observedAdvisorQueries: number;
  };
  activeScenario: AdvisorScenario;
  scenarios: AdvisorScenario[];
  checks: AdvisorStudioCheck[];
  actions: AdvisorStudioAction[];
  snippet: string;
  packet: string;
};

const fallbackPrompts = [
  "I need something comfortable for long days under £150",
  "Help me choose a waterproof option for weekend trips",
  "I want a lightweight everyday product",
  "Which option is best for speed and performance?",
];

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

function publishedFinders(quizzes: Quiz[]) {
  return quizzes.filter((quiz) => quiz.published && quiz.questions.length);
}

function metadataString(event: AnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function observedAdvisorPrompts(events: AnalyticsEvent[]) {
  return unique(events
    .filter((event) => metadataString(event, "experience_type") === "assistant")
    .map((event) => metadataString(event, "query"))
    .filter((query) => query.length > 6))
    .slice(0, 5);
}

function catalogPrompts(products: Product[]) {
  const active = activeProducts(products);
  const needs = unique(active.flatMap((product) => [...(product.buyer_needs || []), ...product.tags])).slice(0, 4);
  const features = unique(active.flatMap((product) => product.features)).slice(0, 3);
  const categories = unique(active.map((product) => product.category)).slice(0, 2);
  return unique([
    needs[0] ? `I need ${needs[0].toLowerCase()} under £150` : "",
    needs[1] && features[0] ? `Show me ${needs[1].toLowerCase()} with ${features[0].toLowerCase()}` : "",
    categories[0] ? `Which ${categories[0].toLowerCase()} should I choose?` : "",
    features[1] ? `I want ${features[1].toLowerCase()} for everyday use` : "",
  ]).slice(0, 5);
}

function broadPrompt(prompt: string, search: ProductSearchReport) {
  const wordCount = (prompt.match(/[a-z0-9£$€]+/gi) || []).length;
  const meaningfulTerms = search.intent.terms.filter((term) => !["shoe", "pair", "product", "option", "thing", "item", "choose", "help"].includes(term));
  if (!meaningfulTerms.length) return true;
  return wordCount <= 3 && meaningfulTerms.length < 2 && search.intent.maxBudget === null;
}

function clarifyingOptions(products: Product[]) {
  const active = activeProducts(products);
  return unique([
    ...active.flatMap((product) => product.buyer_needs || []),
    ...active.flatMap((product) => product.tags),
    ...active.map((product) => product.category),
  ]).slice(0, 4);
}

function toConversationalMatches(results: ProductSearchResult[]): ConversationalMatch[] {
  return results.slice(0, 3).map((result) => ({
    product: result.product,
    score: result.score,
    explanation: result.explanation,
    matchedSignals: result.matchedSignals.map((signal) => signal.term),
  }));
}

function scenarioStatus(search: ProductSearchReport, recovery: AdvisorRecoveryReport, shouldClarify: boolean): AdvisorScenarioStatus {
  if (shouldClarify) return "clarifying";
  if (!search.results.length) return "no-results";
  if (recovery.status === "needs-refinement" || search.results[0]?.confidence === "weak") return "weak";
  return "recommendations";
}

function assistantMessageForScenario(search: ProductSearchReport, status: AdvisorScenarioStatus, recovery: AdvisorRecoveryReport) {
  if (status === "clarifying") return "To narrow this down, ask one more shopper preference before recommending products.";
  if (status === "no-results") return recovery.summary;
  const top = search.results[0];
  const signals = top?.matchedSignals.filter((signal) => signal.source !== "budget").slice(0, 2).map((signal) => signal.term).join(" and ");
  if (!top) return "No matching product is ready for this prompt yet.";
  return `I’d lead with ${top.product.name}${signals ? ` because the request maps to ${signals}` : ""}.`;
}

function buildScenario(prompt: string, products: Product[], index: number): AdvisorScenario {
  const search = runSemanticProductSearch({ query: prompt, products, limit: 3 });
  const shouldClarify = broadPrompt(prompt, search);
  const matches = shouldClarify ? [] : toConversationalMatches(search.results);
  const recovery = buildAdvisorRecoveryReport({
    query: prompt,
    products,
    intent: { maxBudget: search.intent.maxBudget, terms: search.intent.terms },
    matches,
    status: shouldClarify ? "clarifying" : "recommendations",
    clarifyingOptions: shouldClarify ? clarifyingOptions(products) : [],
  });
  const status = scenarioStatus(search, recovery, shouldClarify);
  return {
    id: `advisor-scenario-${index}`,
    prompt,
    status,
    assistantMessage: assistantMessageForScenario(search, status, recovery),
    source: search.intent.coverage.some((item) => item.status !== "missing") ? "hybrid-ready" : "rules",
    terms: search.intent.terms,
    maxBudget: search.intent.maxBudget,
    topScore: search.results[0]?.score || 0,
    topProduct: search.results[0]?.product.name,
    results: search.results,
    coverage: search.intent.coverage,
    recovery,
  };
}

function checkStatus(score: number): AdvisorStudioCheckStatus {
  if (score >= 80) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

function actionPriority(status: AdvisorStudioCheckStatus): AdvisorStudioActionPriority {
  if (status === "fail") return "critical";
  if (status === "warn") return "high";
  return "low";
}

function statusFromChecks(checks: AdvisorStudioCheck[]): AdvisorStudioStatus {
  if (checks.some((check) => check.status === "fail")) return "blocked";
  if (checks.some((check) => check.status === "warn")) return "review";
  return "ready";
}

function buildChecks({
  products,
  quizzes,
  events,
  scenarios,
  canInstall,
}: {
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
  scenarios: AdvisorScenario[];
  canInstall: boolean;
}): AdvisorStudioCheck[] {
  const active = activeProducts(products);
  const published = publishedFinders(quizzes);
  const strongPrompts = scenarios.filter((scenario) => scenario.status === "recommendations").length;
  const weakPrompts = scenarios.filter((scenario) => scenario.status === "weak" || scenario.status === "no-results").length;
  const observed = observedAdvisorPrompts(events).length;
  return [
    {
      id: "catalog-evidence",
      label: "Catalog evidence",
      status: checkStatus(active.length >= 3 ? 100 : active.length >= 2 ? 70 : 25),
      detail: "Conversational recommendations need active products with buyer needs, tags, features and semantic search text.",
      evidence: `${active.length} active catalog product${active.length === 1 ? "" : "s"} available.`,
      href: "/dashboard/products",
      action: "Add or enrich active products",
    },
    {
      id: "published-context",
      label: "Published finder context",
      status: published.length ? "pass" : "fail",
      detail: "The advisor and semantic search runtimes use a published finder as the public catalog context.",
      evidence: `${published.length} published finder${published.length === 1 ? "" : "s"} available for advisor embeds.`,
      href: "/dashboard/quizzes",
      action: "Publish a finder before installing the advisor",
    },
    {
      id: "prompt-suite",
      label: "Prompt suite reliability",
      status: weakPrompts ? "warn" : strongPrompts ? "pass" : "fail",
      detail: "Starter and observed prompts should either recommend products or ask a clear clarifying question.",
      evidence: `${strongPrompts}/${scenarios.length} prompts return recommendation sets; ${weakPrompts} need refinement.`,
      href: "/dashboard/advisor",
      action: "Tune weak prompts with richer product language",
    },
    {
      id: "recovery-coverage",
      label: "Recovery and clarification",
      status: scenarios.some((scenario) => scenario.recovery.suggestions.length || scenario.status === "recommendations") ? "pass" : "warn",
      detail: "Broad or blocked requests should never dead-end; the advisor should offer safe next prompts or near misses.",
      evidence: `${scenarios.filter((scenario) => scenario.recovery.suggestions.length).length} prompt${scenarios.filter((scenario) => scenario.recovery.suggestions.length).length === 1 ? "" : "s"} include recovery suggestions.`,
      href: "/dashboard/advisor",
      action: "Add catalog-backed refinement prompts",
    },
    {
      id: "widget-install",
      label: "Advisor widget install",
      status: canInstall ? "pass" : "fail",
      detail: "A copyable assistant snippet needs a real published experience ID and production-safe widget settings.",
      evidence: canInstall ? "Advisor embed snippet is install-ready." : "Advisor embed has a blocker in the install report.",
      href: "/dashboard/settings",
      action: "Fix widget install blockers",
    },
    {
      id: "analytics-feedback",
      label: "Advisor analytics feedback loop",
      status: observed ? "pass" : "warn",
      detail: "Observed advisor queries create the zero-party feedback loop for vocabulary, search tuning and discovery gaps.",
      evidence: `${observed} observed advisor quer${observed === 1 ? "y" : "ies"} found in analytics.`,
      href: "/dashboard/analytics",
      action: "Run a QA advisor journey and capture events",
    },
  ];
}

function buildActions(checks: AdvisorStudioCheck[]): AdvisorStudioAction[] {
  const actions = checks
    .filter((check) => check.status !== "pass")
    .map((check) => ({
      id: `advisor-${check.id}`,
      title: check.action,
      detail: check.detail,
      evidence: check.evidence,
      priority: actionPriority(check.status),
      href: check.href,
      label: check.status === "fail" ? "Fix blocker" : "Review",
    }));

  if (!actions.length) {
    actions.push({
      id: "advisor-ready",
      title: "Copy the advisor snippet into a support or PDP placement",
      detail: "The advisor has catalog evidence, prompt QA, recovery guidance, published context and install-ready widget settings.",
      evidence: "All Advisor Studio checks passed.",
      priority: "low",
      href: "/dashboard/channels",
      label: "Plan placement",
    });
  }

  const rank: Record<AdvisorStudioActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function packet(report: Omit<AdvisorStudioReport, "packet">) {
  return [
    "Sellentum Advisor Studio packet",
    "============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Prompt QA",
    ...report.scenarios.map((scenario) => `- [${scenario.status.toUpperCase()}] "${scenario.prompt}" → ${scenario.topProduct || scenario.recovery.primaryAction}`),
    "",
    "Readiness checks",
    ...report.checks.map((check) => `- [${check.status.toUpperCase()}] ${check.label}: ${check.evidence}`),
    "",
    "Advisor widget snippet",
    report.snippet,
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildAdvisorStudioReport({
  products,
  quizzes,
  events = [],
  settings,
  origin = "https://your-sellentum-app.vercel.app",
  focusPrompt,
}: {
  products: Product[];
  quizzes: Quiz[];
  events?: AnalyticsEvent[];
  settings: WidgetSettings;
  origin?: string;
  focusPrompt?: string;
}): AdvisorStudioReport {
  const published = publishedFinders(quizzes);
  const primaryFinder = published[0] || quizzes[0];
  const prompts = unique([
    focusPrompt || "",
    ...observedAdvisorPrompts(events),
    ...catalogPrompts(products),
    ...fallbackPrompts,
  ]).slice(0, 8);
  const scenarioPrompts = prompts.length ? prompts : fallbackPrompts.slice(0, 3);
  const scenarios = scenarioPrompts.map((prompt, index) => buildScenario(prompt, products, index));
  const activeScenario = focusPrompt ? scenarios.find((scenario) => scenario.prompt === focusPrompt) || scenarios[0]! : scenarios[0]!;
  const snippet = buildWidgetSnippet({
    origin,
    experience: "assistant",
    mode: "modal",
    id: primaryFinder?.slug || primaryFinder?.id,
    color: settings.primary_color,
    label: settings.button_text || "Ask an advisor",
    position: settings.launcher_position === "bottom-left" ? "left" : "right",
    source: "storefront",
    medium: "embed",
    campaign: "sellentum-advisor",
    placement: "support-drawer",
  });
  const install = buildWidgetInstallReport({
    origin,
    experience: "assistant",
    mode: "modal",
    id: primaryFinder?.slug || primaryFinder?.id,
    color: settings.primary_color,
    label: settings.button_text || "Ask an advisor",
    position: settings.launcher_position === "bottom-left" ? "left" : "right",
    source: "storefront",
    medium: "embed",
    campaign: "sellentum-advisor",
    placement: "support-drawer",
  });
  const checks = buildChecks({ products, quizzes, events, scenarios, canInstall: install.canInstall });
  const status = statusFromChecks(checks);
  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum, check) => sum + (check.status === "pass" ? 100 : check.status === "warn" ? 65 : 15), 0) / Math.max(1, checks.length))));
  const actions = buildActions(checks);
  const baseReport: Omit<AdvisorStudioReport, "packet"> = {
    status,
    score,
    headline: status === "ready"
      ? "The conversational advisor is ready for launch QA."
      : status === "review"
        ? "The conversational advisor can be tested, but some prompt and analytics checks need review."
        : "The conversational advisor has blockers before it should be embedded.",
    summary: {
      activeProducts: activeProducts(products).length,
      publishedFinders: published.length,
      prompts: scenarios.length,
      recommendationPrompts: scenarios.filter((scenario) => scenario.status === "recommendations").length,
      clarifyingPrompts: scenarios.filter((scenario) => scenario.status === "clarifying").length,
      weakPrompts: scenarios.filter((scenario) => scenario.status === "weak").length,
      noResultPrompts: scenarios.filter((scenario) => scenario.status === "no-results").length,
      observedAdvisorQueries: observedAdvisorPrompts(events).length,
    },
    activeScenario,
    scenarios,
    checks,
    actions,
    snippet,
  };

  return { ...baseReport, packet: packet(baseReport) };
}
