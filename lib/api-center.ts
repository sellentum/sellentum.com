import { buildAnalyticsQualityReport } from "./analytics-quality";
import { buildExperienceRegistry } from "./experience-registry";
import { buildRuntimeOperationsReport } from "./runtime-operations";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type ApiCenterStatus = "ready" | "watch" | "blocked";
export type ApiEndpointStatus = "ready" | "review" | "blocked";
export type ApiCheckStatus = "pass" | "warn" | "fail";
export type ApiActionPriority = "critical" | "high" | "medium" | "low";

export type ApiCenterEndpoint = {
  id: string;
  label: string;
  method: "GET" | "POST";
  path: string;
  experience: "finder" | "assistant" | "search" | "configurator" | "analytics" | "widget";
  purpose: string;
  status: ApiEndpointStatus;
  statusLabel: string;
  requestExample: string;
  responseFields: string[];
  guardrails: string[];
  clientSnippet: string;
};

export type ApiCenterCheck = {
  id: string;
  label: string;
  status: ApiCheckStatus;
  detail: string;
  evidence: string;
  href: string;
};

export type ApiCenterAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: ApiActionPriority;
  href: string;
  label: string;
};

export type ApiCenterReport = {
  status: ApiCenterStatus;
  score: number;
  headline: string;
  summary: {
    endpoints: number;
    readyEndpoints: number;
    blockedEndpoints: number;
    checksPassing: number;
    totalViews: number;
    totalCompletions: number;
    analyticsQualityScore: number;
    runtimeScore: number;
  };
  endpoints: ApiCenterEndpoint[];
  checks: ApiCenterCheck[];
  actions: ApiCenterAction[];
  sdkNotes: Array<{ label: string; detail: string; proof: string }>;
  packet: string;
};

function cleanOrigin(origin: string) {
  return (origin || "https://your-sellentum-app.vercel.app").replace(/\/+$/, "");
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function preferredPublishedFinder(quizzes: Quiz[]) {
  return quizzes.find((quiz) => quiz.published) || quizzes[0];
}

function preferredPublishedConfigurator(configurators: Configurator[]) {
  return configurators.find((configurator) => configurator.published) || configurators[0];
}

function finderContextStatus(finder?: Quiz): ApiEndpointStatus {
  if (!finder) return "blocked";
  return finder.published ? "ready" : "review";
}

function configuratorContextStatus(configurator?: Configurator): ApiEndpointStatus {
  if (!configurator) return "blocked";
  return configurator.published ? "ready" : "review";
}

function statusLabel(status: ApiEndpointStatus) {
  if (status === "ready") return "Ready";
  if (status === "review") return "Draft context";
  return "Missing context";
}

function clientSnippet(method: "GET" | "POST", path: string, requestExample: string) {
  if (method === "GET") {
    return [
      `const response = await fetch("${path}");`,
      "const data = await response.json();",
      "console.log(data);",
    ].join("\n");
  }

  return [
    `const response = await fetch("${path}", {`,
    "  method: \"POST\",",
    "  headers: { \"Content-Type\": \"application/json\" },",
    `  body: JSON.stringify(${requestExample.replace(/\n/g, "\n  ")}),`,
    "});",
    "const data = await response.json();",
    "console.log(data);",
  ].join("\n");
}

function endpoint({
  id,
  label,
  method,
  path,
  experience,
  purpose,
  status,
  request,
  responseFields,
  guardrails,
}: {
  id: string;
  label: string;
  method: ApiCenterEndpoint["method"];
  path: string;
  experience: ApiCenterEndpoint["experience"];
  purpose: string;
  status: ApiEndpointStatus;
  request: unknown;
  responseFields: string[];
  guardrails: string[];
}): ApiCenterEndpoint {
  const requestExample = typeof request === "string" ? request : json(request);
  return {
    id,
    label,
    method,
    path,
    experience,
    purpose,
    status,
    statusLabel: statusLabel(status),
    requestExample,
    responseFields,
    guardrails,
    clientSnippet: clientSnippet(method, path, requestExample),
  };
}

function buildEndpoints(origin: string, quizzes: Quiz[], configurators: Configurator[]): ApiCenterEndpoint[] {
  const clean = cleanOrigin(origin);
  const finder = preferredPublishedFinder(quizzes);
  const configurator = preferredPublishedConfigurator(configurators);
  const finderId = finder?.id || "YOUR_PUBLISHED_FINDER_ID";
  const configuratorId = configurator?.id || "YOUR_PUBLISHED_CONFIGURATOR_ID";
  const finderStatus = finderContextStatus(finder);
  const configuratorStatus = configuratorContextStatus(configurator);

  return [
    endpoint({
      id: "finder-config",
      label: "Load finder config",
      method: "GET",
      path: `${clean}/api/public/finder/${encodeURIComponent(finderId)}`,
      experience: "finder",
      purpose: "Load the published finder shell, questions, catalog count and normalized brand settings for a custom storefront UI.",
      status: finderStatus,
      request: "No request body.",
      responseFields: ["quiz", "catalog.active_products", "settings"],
      guardrails: ["Published finder only", "No full product catalog in GET", "Normalized public branding"],
    }),
    endpoint({
      id: "finder-recommendations",
      label: "Run finder recommendations",
      method: "POST",
      path: `${clean}/api/public/finder/${encodeURIComponent(finderId)}`,
      experience: "finder",
      purpose: "Validate selected answer paths, rank active products deterministically and return 1–3 recommendations with recovery metadata.",
      status: finderStatus,
      request: { answers: [{ questionId: "q_use", optionId: "o_trail" }, { questionId: "q_budget", optionId: "o_140" }] },
      responseFields: ["recommendations", "recovery", "answers", "experience", "retrieval.question_path"],
      guardrails: ["Bounded JSON body", "Server-side catalog loading", "Branch path validation", "Rules select products before AI explanations"],
    }),
    endpoint({
      id: "advisor-search",
      label: "Run conversational advisor",
      method: "POST",
      path: `${clean}/api/public/assistant/${encodeURIComponent(finderId)}`,
      experience: "assistant",
      purpose: "Accept natural-language shopper needs, retrieve catalog candidates and return deterministic advisor matches or clarification turns.",
      status: finderStatus,
      request: { query: "I need a waterproof trail shoe under £140", history: [{ role: "assistant", content: "What terrain will you use most?" }] },
      responseFields: ["status", "matches", "clarifyingOptions", "recovery", "experience", "retrieval.candidate_count"],
      guardrails: ["Published finder context", "Rate-limited public requests", "Catalog-backed candidate retrieval", "AI explains already-ranked products"],
    }),
    endpoint({
      id: "semantic-search",
      label: "Run semantic search",
      method: "POST",
      path: `${clean}/api/public/search/${encodeURIComponent(finderId)}`,
      experience: "search",
      purpose: "Parse shopper language, budget and intent terms, then return deterministic search results with grounded explanations and recovery guidance.",
      status: finderStatus,
      request: { query: "comfortable office shoes under £100", limit: 6 },
      responseFields: ["query", "results", "intent.coverage", "recovery", "experience", "retrieval.explanation_source"],
      guardrails: ["Published finder context", "Budget eligibility checks", "No-result recovery", "Grounded explanation copy"],
    }),
    endpoint({
      id: "configurator-config",
      label: "Load configurator config",
      method: "GET",
      path: `${clean}/api/public/configurator/${encodeURIComponent(configuratorId)}`,
      experience: "configurator",
      purpose: "Load a published visual configurator, active products and normalized public brand settings for a custom builder UI.",
      status: configuratorStatus,
      request: "No request body.",
      responseFields: ["configurator", "products", "settings"],
      guardrails: ["Published configurator only", "Server-owned product data", "Normalized public branding"],
    }),
    endpoint({
      id: "configurator-validation",
      label: "Validate configurator bundle",
      method: "POST",
      path: `${clean}/api/public/configurator/${encodeURIComponent(configuratorId)}`,
      experience: "configurator",
      purpose: "Validate selected option IDs, enforce incompatibility rules and return compatibility guidance before review or buy-click.",
      status: configuratorStatus,
      request: { selectedIds: ["config_opt_terra", "config_opt_mud", "config_opt_care"] },
      responseFields: ["valid", "total", "selectedOptions", "blockedOptions", "compatibility_guidance", "experience"],
      guardrails: ["Bounded selection payload", "Server-side compatibility validation", "Safe alternatives for blocked choices"],
    }),
    endpoint({
      id: "analytics-event",
      label: "Record public event",
      method: "POST",
      path: `${clean}/api/events`,
      experience: "analytics",
      purpose: "Record widget telemetry from custom storefront UIs using the same contract as the embed script.",
      status: "ready",
      request: { event_type: "quiz_start", quiz_id: finder?.id || finderId, metadata: { experience_type: "finder", experience_id: finderId, session_id: "anonymous-session-id", sellentum_source: "custom-ui" } },
      responseFields: ["accepted", "event_id"],
      guardrails: ["Sanitized metadata", "Required event contract", "Anonymous session IDs", "Rate-limited public writes"],
    }),
    endpoint({
      id: "widget-script",
      label: "Load widget SDK",
      method: "GET",
      path: `${clean}/api/widget.js`,
      experience: "widget",
      purpose: "Load the framework-independent script when a custom UI still wants Sellentum’s modal or inline iframe launcher.",
      status: "ready",
      request: "No request body.",
      responseFields: ["JavaScript widget runtime"],
      guardrails: ["No framework dependency", "Lazy-loaded modal iframe", "Attribution data attributes"],
    }),
  ];
}

function check(id: string, label: string, status: ApiCheckStatus, detail: string, evidence: string, href: string): ApiCenterCheck {
  return { id, label, status, detail, evidence, href };
}

function checkScore(status: ApiCheckStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 62;
  return 12;
}

function buildChecks({
  endpoints,
  products,
  quizzes,
  configurators,
  runtimeScore,
  analyticsQualityScore,
  totalViews,
}: {
  endpoints: ApiCenterEndpoint[];
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  runtimeScore: number;
  analyticsQualityScore: number;
  totalViews: number;
}) {
  const readyEndpoints = endpoints.filter((item) => item.status === "ready").length;
  const blockedEndpoints = endpoints.filter((item) => item.status === "blocked").length;
  const publishedFinders = quizzes.filter((quiz) => quiz.published).length;
  const publishedConfigurators = configurators.filter((configurator) => configurator.published).length;
  const activeProducts = products.filter((product) => product.active).length;

  return [
    check(
      "published-context",
      "Published API contexts",
      publishedFinders && publishedConfigurators ? "pass" : publishedFinders ? "warn" : "fail",
      "Headless APIs need stable published finder and configurator contexts.",
      `${publishedFinders} published finder${publishedFinders === 1 ? "" : "s"} · ${publishedConfigurators} published configurator${publishedConfigurators === 1 ? "" : "s"}.`,
      "/dashboard/experiences",
    ),
    check(
      "endpoint-readiness",
      "Endpoint readiness",
      blockedEndpoints ? "fail" : readyEndpoints >= endpoints.length - 1 ? "pass" : "warn",
      "Every endpoint should have a real context ID before handoff to a custom storefront team.",
      `${readyEndpoints}/${endpoints.length} endpoints are ready; ${blockedEndpoints} blocked.`,
      "/dashboard/api-center",
    ),
    check(
      "catalog-runtime",
      "Server-side catalog runtime",
      activeProducts >= 2 ? "pass" : activeProducts ? "warn" : "fail",
      "Public APIs load active product data server-side instead of trusting browser-supplied catalogs.",
      `${activeProducts} active product${activeProducts === 1 ? "" : "s"} available to public runtimes.`,
      "/dashboard/products",
    ),
    check(
      "runtime-guardrails",
      "Runtime guardrails",
      runtimeScore >= 82 ? "pass" : runtimeScore >= 58 ? "warn" : "fail",
      "Public APIs should enforce published-resource checks, bounded JSON, rate limits and sanitized analytics metadata.",
      `Runtime Operations score is ${runtimeScore}%.`,
      "/dashboard/operations",
    ),
    check(
      "analytics-contract",
      "Analytics contract",
      analyticsQualityScore >= 82 ? "pass" : analyticsQualityScore >= 58 ? "warn" : "fail",
      "Custom frontends should emit the same event contract as the widget for views, starts, completions, recommendations and buy clicks.",
      `Analytics QA score is ${analyticsQualityScore}% with ${totalViews} widget views captured.`,
      "/dashboard/analytics",
    ),
  ];
}

function buildActions(checks: ApiCenterCheck[]): ApiCenterAction[] {
  const actions: ApiCenterAction[] = checks
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      id: `fix-${item.id}`,
      title: item.status === "fail" ? `Fix ${item.label.toLowerCase()}` : `Review ${item.label.toLowerCase()}`,
      detail: item.detail,
      evidence: item.evidence,
      priority: item.status === "fail" ? "critical" as const : "high" as const,
      href: item.href,
      label: item.status === "fail" ? "Fix blocker" : "Review",
    }));

  actions.push({
    id: "copy-api-packet",
    title: "Copy the headless API packet",
    detail: "Share endpoint URLs, request bodies, response fields and public-runtime guardrails with a custom storefront developer.",
    evidence: "The packet includes finder, advisor, search, configurator, analytics and widget runtime contracts.",
    priority: "low",
    href: "/dashboard/api-center",
    label: "Copy packet",
  });

  const rank: Record<ApiActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function headline(status: ApiCenterStatus, score: number) {
  if (status === "ready") return `Headless API readiness is strong at ${score}%.`;
  if (status === "watch") return "Headless APIs are usable, but a few launch contracts need review.";
  return "Publish launch contexts before handing APIs to a custom storefront team.";
}

function packet(report: Omit<ApiCenterReport, "packet">) {
  return [
    "Sellentum Headless API Center packet",
    "=================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Endpoints: ${report.summary.endpoints} · Ready: ${report.summary.readyEndpoints} · Blocked: ${report.summary.blockedEndpoints}`,
    "",
    "Endpoints",
    ...report.endpoints.map((endpointItem) => [
      `- [${endpointItem.status.toUpperCase()}] ${endpointItem.method} ${endpointItem.path}`,
      `  Purpose: ${endpointItem.purpose}`,
      `  Request: ${endpointItem.requestExample.replace(/\n/g, " ")}`,
      `  Response: ${endpointItem.responseFields.join(", ")}`,
      `  Guardrails: ${endpointItem.guardrails.join(", ")}`,
    ].join("\n")),
    "",
    "Checks",
    ...report.checks.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.evidence}`),
    "",
    "SDK notes",
    ...report.sdkNotes.map((item) => `- ${item.label}: ${item.proof}`),
    "",
    "Actions",
    ...report.actions.map((item) => `- [${item.priority.toUpperCase()}] ${item.title}: ${item.evidence}`),
  ].join("\n");
}

export function buildApiCenterReport({
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
}): ApiCenterReport {
  const endpoints = buildEndpoints(origin, quizzes, configurators);
  const registry = buildExperienceRegistry({ origin, settings, quizzes, configurators, events });
  const runtime = buildRuntimeOperationsReport({ origin, settings, products, quizzes, configurators, events });
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const checks = buildChecks({
    endpoints,
    products,
    quizzes,
    configurators,
    runtimeScore: runtime.score,
    analyticsQualityScore: analyticsQuality.score,
    totalViews: registry.summary.totalViews,
  });
  const readyEndpoints = endpoints.filter((item) => item.status === "ready").length;
  const blockedEndpoints = endpoints.filter((item) => item.status === "blocked").length;
  const checkAverage = Math.round(checks.reduce((sum, item) => sum + checkScore(item.status), 0) / Math.max(1, checks.length));
  const endpointScore = Math.round((readyEndpoints / Math.max(1, endpoints.length)) * 100);
  const score = Math.round(endpointScore * 0.45 + checkAverage * 0.35 + runtime.score * 0.2);
  const status: ApiCenterStatus = blockedEndpoints || checks.some((item) => item.status === "fail")
    ? "blocked"
    : checks.some((item) => item.status === "warn")
      ? "watch"
      : "ready";
  const baseReport: Omit<ApiCenterReport, "packet"> = {
    status,
    score,
    headline: headline(status, score),
    summary: {
      endpoints: endpoints.length,
      readyEndpoints,
      blockedEndpoints,
      checksPassing: checks.filter((item) => item.status === "pass").length,
      totalViews: registry.summary.totalViews,
      totalCompletions: registry.summary.totalCompletions,
      analyticsQualityScore: analyticsQuality.score,
      runtimeScore: runtime.score,
    },
    endpoints,
    checks,
    actions: buildActions(checks),
    sdkNotes: [
      {
        label: "Selection boundary",
        detail: "Custom frontends can call Sellentum APIs directly, but product selection remains server-side and deterministic.",
        proof: "Finder, advisor, search and configurator endpoints load published resources and active catalog records on the server.",
      },
      {
        label: "Analytics parity",
        detail: "Headless builds should emit the same five events as the widget.",
        proof: "Use /api/events with widget_view, quiz_start, quiz_complete, product_recommended and buy_click metadata.",
      },
      {
        label: "No secret exposure",
        detail: "The packet shares public runtime URLs and request examples only.",
        proof: "Supabase service keys, OpenAI keys and dashboard credentials stay server-side.",
      },
    ],
  };

  return { ...baseReport, packet: packet(baseReport) };
}
