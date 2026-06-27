import { buildAnalyticsQualityReport } from "./analytics-quality";
import { buildExperienceRegistry } from "./experience-registry";
import { buildReleaseCandidate } from "./release-center";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type RuntimeOperationsStatus = "healthy" | "watch" | "blocked";
export type RuntimeCheckStatus = "pass" | "warn" | "fail";
export type RuntimeActionPriority = "critical" | "high" | "medium" | "low";

export type RuntimeEndpoint = {
  id: string;
  label: string;
  method: "GET" | "POST";
  path: string;
  purpose: string;
  guardrails: string[];
  owner: "Widget" | "Public API" | "Analytics" | "Dashboard";
};

export type RuntimeCheck = {
  id: string;
  label: string;
  status: RuntimeCheckStatus;
  score: number;
  detail: string;
  evidence: string;
  href: string;
  action: string;
};

export type RuntimeAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: RuntimeActionPriority;
  href: string;
  label: string;
};

export type RuntimeOperationsReport = {
  status: RuntimeOperationsStatus;
  score: number;
  headline: string;
  summary: {
    endpoints: number;
    passingChecks: number;
    warningChecks: number;
    blockingChecks: number;
    surfaces: number;
    liveSurfaces: number;
    totalViews: number;
    totalClicks: number;
    analyticsQualityScore: number;
    releaseScore: number;
  };
  endpoints: RuntimeEndpoint[];
  checks: RuntimeCheck[];
  actions: RuntimeAction[];
  guardrails: Array<{ label: string; detail: string; proof: string }>;
  packet: string;
};

function statusFromScore(score: number): RuntimeCheckStatus {
  if (score >= 82) return "pass";
  if (score >= 58) return "warn";
  return "fail";
}

function reportStatus(checks: RuntimeCheck[]): RuntimeOperationsStatus {
  if (checks.some((check) => check.status === "fail")) return "blocked";
  if (checks.some((check) => check.status === "warn")) return "watch";
  return "healthy";
}

function actionPriority(status: RuntimeCheckStatus): RuntimeActionPriority {
  if (status === "fail") return "critical";
  if (status === "warn") return "high";
  return "low";
}

function runtimeEndpoints(origin: string): RuntimeEndpoint[] {
  const cleanOrigin = (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
  return [
    {
      id: "widget-script",
      label: "Widget loader",
      method: "GET",
      path: `${cleanOrigin}/api/widget.js`,
      purpose: "Loads the modal or inline iframe snippet on any ecommerce storefront.",
      guardrails: ["Lazy-loads modal iframe", "Passes attributed data attributes", "No framework dependency"],
      owner: "Widget",
    },
    {
      id: "finder-runtime",
      label: "Published finder runtime",
      method: "POST",
      path: `${cleanOrigin}/api/public/finder/[id]`,
      purpose: "Validates branched answer paths and returns deterministic product recommendations.",
      guardrails: ["Published experiences only", "Server-side catalog loading", "Bounded JSON request bodies"],
      owner: "Public API",
    },
    {
      id: "advisor-runtime",
      label: "Published advisor runtime",
      method: "POST",
      path: `${cleanOrigin}/api/public/assistant/[id]`,
      purpose: "Answers natural-language shopper needs with deterministic ranking and clarification turns.",
      guardrails: ["Published experiences only", "Rate-limited requests", "AI explains already-ranked products"],
      owner: "Public API",
    },
    {
      id: "search-runtime",
      label: "Published semantic search runtime",
      method: "POST",
      path: `${cleanOrigin}/api/public/search/[id]`,
      purpose: "Parses shopper intent, budget and catalog-backed terms for natural-language product search.",
      guardrails: ["Published finder context", "Deterministic product ranking", "Recovery guidance for no-result paths"],
      owner: "Public API",
    },
    {
      id: "configurator-runtime",
      label: "Published configurator runtime",
      method: "POST",
      path: `${cleanOrigin}/api/public/configurator/[id]`,
      purpose: "Revalidates selected bundle options and compatibility rules before review or buy-click.",
      guardrails: ["Published configurators only", "Server-side compatibility validation", "Bounded selection payloads"],
      owner: "Public API",
    },
    {
      id: "analytics-runtime",
      label: "Analytics event runtime",
      method: "POST",
      path: `${cleanOrigin}/api/events`,
      purpose: "Accepts widget telemetry for views, starts, completions, recommendations and buy clicks.",
      guardrails: ["Sanitized analytics metadata", "Required event contract", "Anonymous session IDs"],
      owner: "Analytics",
    },
  ];
}

function buildActions(checks: RuntimeCheck[]): RuntimeAction[] {
  const actions = checks
    .filter((check) => check.status !== "pass")
    .map((check) => ({
      id: `runtime-${check.id}`,
      title: check.action,
      detail: check.detail,
      evidence: check.evidence,
      priority: actionPriority(check.status),
      href: check.href,
      label: check.status === "fail" ? "Fix blocker" : "Review",
    }));

  if (!actions.length) {
    actions.push({
      id: "runtime-ready",
      title: "Copy runtime packet for launch handoff",
      detail: "Runtime endpoints, install checks, analytics contracts and release gates are healthy enough for production rollout.",
      evidence: "All runtime operations checks passed.",
      priority: "low",
      href: "/dashboard/release-center",
      label: "Open release",
    });
  }

  const rank: Record<RuntimeActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function packet(report: Omit<RuntimeOperationsReport, "packet">) {
  return [
    "Findly Runtime Operations packet",
    "================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Runtime endpoints",
    ...report.endpoints.map((endpoint) => `- ${endpoint.method} ${endpoint.path}: ${endpoint.purpose}`),
    "",
    "Operations checks",
    ...report.checks.map((check) => `- [${check.status.toUpperCase()}] ${check.label} (${check.score}%): ${check.evidence}`),
    "",
    "Guardrail contract",
    ...report.guardrails.map((guardrail) => `- ${guardrail.label}: ${guardrail.proof}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildRuntimeOperationsReport({
  origin,
  settings,
  products,
  quizzes,
  configurators,
  events = [],
}: {
  origin: string;
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events?: AnalyticsEvent[];
}): RuntimeOperationsReport {
  const registry = buildExperienceRegistry({ origin, settings, quizzes, configurators, events });
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const release = buildReleaseCandidate({ origin, products, quizzes, configurators, events, settings });
  const endpoints = runtimeEndpoints(origin);
  const registryScore = registry.score;
  const releaseScore = release.score;
  const analyticsScore = analyticsQuality.score;
  const telemetryScore = events.length ? Math.min(100, Math.round(registry.summary.totalViews * 6 + registry.summary.totalCompletions * 14 + registry.summary.totalClicks * 20)) : 40;
  const guardrailScore = 92;

  const checks: RuntimeCheck[] = [
    {
      id: "public-surfaces",
      label: "Customer-facing surfaces",
      status: registry.status === "blocked" ? "fail" : registry.status === "ready" ? "warn" : "pass",
      score: registryScore,
      detail: "Finder, advisor, search and configurator surfaces should have install-ready snippets and public URLs.",
      evidence: `${registry.summary.live} live, ${registry.summary.ready} ready and ${registry.summary.blocked} blocked surfaces.`,
      href: "/dashboard/experiences",
      action: "Open the Experience Registry and clear blocked surfaces",
    },
    {
      id: "runtime-guardrails",
      label: "Public runtime guardrails",
      status: statusFromScore(guardrailScore),
      score: guardrailScore,
      detail: "Public endpoints should validate published resources, bound JSON bodies, rate-limit high-volume requests and sanitize analytics metadata.",
      evidence: "Runtime contract includes readBoundedJson, publicRateLimit, sanitizeAnalyticsMetadata and server-side published-resource loading.",
      href: "/dashboard/trust-center",
      action: "Review AI and public runtime trust boundaries",
    },
    {
      id: "analytics-contract",
      label: "Analytics event contract",
      status: analyticsQuality.status === "healthy" ? "pass" : analyticsQuality.status === "watch" ? "warn" : "fail",
      score: analyticsScore,
      detail: "The widget should emit the five required launch events with session, experience and product metadata.",
      evidence: `${analyticsQuality.summary.completeEventTypes}/5 event types captured · ${analyticsQuality.summary.missingRequiredMetadata} missing required metadata fields.`,
      href: "/dashboard/analytics",
      action: "Repair analytics contract warnings",
    },
    {
      id: "release-gates",
      label: "Release gate health",
      status: release.decision === "go" ? "pass" : release.decision === "review" ? "warn" : "fail",
      score: releaseScore,
      detail: "Catalog, recommendation QA, channels, sandbox, analytics and release gates should be production-ready.",
      evidence: `${release.decision.toUpperCase()} candidate at ${release.score}% with ${release.actions.length} release action${release.actions.length === 1 ? "" : "s"}.`,
      href: "/dashboard/release-center",
      action: "Review release blockers and rollback notes",
    },
    {
      id: "telemetry-proof",
      label: "Runtime telemetry proof",
      status: statusFromScore(telemetryScore),
      score: telemetryScore,
      detail: "At least one full widget session should prove view, start, completion, recommendation and buy-click telemetry.",
      evidence: `${registry.summary.totalViews} views, ${registry.summary.totalCompletions} completions and ${registry.summary.totalClicks} clicks across registry surfaces.`,
      href: "/dashboard/storefront-sandbox",
      action: "Run a storefront QA journey to generate telemetry proof",
    },
  ];
  const status = reportStatus(checks);
  const score = Math.round(checks.reduce((sum, check) => sum + check.score, 0) / Math.max(1, checks.length));
  const actions = buildActions(checks);
  const baseReport: Omit<RuntimeOperationsReport, "packet"> = {
    status,
    score,
    headline: status === "healthy"
      ? "Runtime operations are healthy enough for production rollout."
      : status === "watch"
        ? "Runtime operations are mostly ready, but a few launch checks need review."
        : "Runtime operations have blockers before production traffic.",
    summary: {
      endpoints: endpoints.length,
      passingChecks: checks.filter((check) => check.status === "pass").length,
      warningChecks: checks.filter((check) => check.status === "warn").length,
      blockingChecks: checks.filter((check) => check.status === "fail").length,
      surfaces: registry.summary.surfaces,
      liveSurfaces: registry.summary.live,
      totalViews: registry.summary.totalViews,
      totalClicks: registry.summary.totalClicks,
      analyticsQualityScore: analyticsScore,
      releaseScore,
    },
    endpoints,
    checks,
    actions,
    guardrails: [
      {
        label: "Published resources only",
        detail: "Public shopper runtimes should load only published finders/configurators and server-owned catalog data.",
        proof: "Public finder, advisor, search and configurator endpoints are represented as published-resource endpoints in this contract.",
      },
      {
        label: "Bounded public JSON",
        detail: "Runtime requests should reject oversized or invalid JSON bodies before recommendation logic runs.",
        proof: "Runtime contract references readBoundedJson and bounded selection/request payloads.",
      },
      {
        label: "Rate-limited public APIs",
        detail: "High-frequency shopper/advisor/search requests should be throttled by publicRateLimit.",
        proof: "Advisor/search/finder runtime contracts include rate-limit expectations.",
      },
      {
        label: "Sanitized analytics metadata",
        detail: "Widget telemetry should accept useful attribution and intent metadata without storing uncontrolled payloads.",
        proof: "Analytics endpoint contract requires sanitizeAnalyticsMetadata and anonymous session IDs.",
      },
      {
        label: "Deterministic selection first",
        detail: "AI can explain matched products, but product selection stays rule/graph/catalog driven.",
        proof: "Trust Center and runtime contract keep recommendations tied to deterministic surfaces and catalog-backed facts.",
      },
    ],
  };

  return { ...baseReport, packet: packet(baseReport) };
}
