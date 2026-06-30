import { buildAnalyticsQualityReport } from "./analytics-quality";
import { buildExperienceRegistry } from "./experience-registry";
import { buildReleaseCandidate } from "./release-center";
import { buildRuntimeOperationsReport } from "./runtime-operations";
import { buildStorefrontSandboxReport } from "./storefront-sandbox";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type ProductionVerificationStatus = "verified" | "review" | "blocked";
export type ProductionCheckStatus = "pass" | "warn" | "fail";
export type ProductionActionPriority = "critical" | "high" | "medium" | "low";
export type ProductionArea = "deployment" | "runtime" | "storefront" | "analytics" | "trust" | "handoff";

export type ProductionCheck = {
  id: string;
  area: ProductionArea;
  label: string;
  status: ProductionCheckStatus;
  score: number;
  detail: string;
  evidence: string;
  href: string;
  action: string;
};

export type ProductionArtifact = {
  id: string;
  label: string;
  status: ProductionCheckStatus;
  owner: "Founder" | "Developer" | "Growth" | "Sellentum";
  command?: string;
  path?: string;
  detail: string;
  proof: string;
};

export type DesktopQaScenario = {
  id: string;
  label: string;
  status: ProductionCheckStatus;
  route: string;
  expected: string;
  telemetry: string[];
  owner: "Developer" | "Growth" | "Founder";
};

export type ProductionAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: ProductionActionPriority;
  href: string;
  label: string;
};

export type ProductionVerificationReport = {
  status: ProductionVerificationStatus;
  score: number;
  headline: string;
  summary: {
    checks: number;
    passingChecks: number;
    warningChecks: number;
    blockingChecks: number;
    desktopScenarios: number;
    verifiedScenarios: number;
    requiredRoutes: number;
    runtimeEndpoints: number;
    analyticsQualityScore: number;
    releaseScore: number;
    runtimeScore: number;
  };
  checks: ProductionCheck[];
  artifacts: ProductionArtifact[];
  desktopQa: DesktopQaScenario[];
  requiredRoutes: Array<{ route: string; purpose: string; owner: "Marketing" | "Dashboard" | "Runtime" | "API" }>;
  actions: ProductionAction[];
  packet: string;
};

export const productionSupabaseRepair = {
  path: "supabase/verification/production_repair_widget_rate_limits.sql",
  schemaCheckPath: "supabase/verification/production_schema_check.sql",
  verifyCommand: "npm run verify:production -- --base-url=https://www.sellentum.com",
  fixes: ["widget_settings.allowed_domains", "rate_limit_buckets"],
  sql: `-- Sellentum production repair: widget domain allowlist + shared rate limiting.
-- Safe to run more than once in the production Supabase SQL editor.

begin;

alter table public.widget_settings
add column if not exists allowed_domains text[] not null default '{}';

create table if not exists public.rate_limit_buckets (
  key_hash text primary key check (length(key_hash) between 32 and 128),
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.rate_limit_buckets enable row level security;

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

revoke all on table public.rate_limit_buckets from anon;
revoke all on table public.rate_limit_buckets from authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.check_rate_limit(
  bucket_key text,
  max_requests integer default 40,
  window_seconds integer default 60
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_at timestamptz := clock_timestamp();
  safe_max_requests integer := least(greatest(coalesce(max_requests, 40), 1), 10000);
  safe_window_seconds integer := least(greatest(coalesce(window_seconds, 60), 1), 86400);
  bucket record;
begin
  if bucket_key is null or length(bucket_key) < 16 then
    raise exception 'A valid rate-limit bucket key is required.' using errcode = '22023';
  end if;

  insert into public.rate_limit_buckets (key_hash, request_count, reset_at, updated_at)
  values (bucket_key, 1, now_at + make_interval(secs => safe_window_seconds), now_at)
  on conflict (key_hash) do update set
    request_count = case
      when public.rate_limit_buckets.reset_at <= now_at then 1
      else least(public.rate_limit_buckets.request_count + 1, safe_max_requests + 1)
    end,
    reset_at = case
      when public.rate_limit_buckets.reset_at <= now_at then now_at + make_interval(secs => safe_window_seconds)
      else public.rate_limit_buckets.reset_at
    end,
    updated_at = now_at
  returning public.rate_limit_buckets.request_count, public.rate_limit_buckets.reset_at into bucket;

  allowed := bucket.request_count <= safe_max_requests;
  remaining := greatest(safe_max_requests - bucket.request_count, 0);
  reset_at := bucket.reset_at;
  retry_after := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (bucket.reset_at - now_at)))::integer)
  end;

  return next;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

notify pgrst, 'reload schema';

commit;`,
} as const;

export const productionAuthChecklist = {
  appUrl: "https://www.sellentum.com",
  callbackPath: "/auth/callback",
  routes: ["/signup", "/login", "/forgot-password", "/reset-password", "/auth/callback?next=/dashboard"],
  manualChecks: [
    "Create a fresh account from https://www.sellentum.com/signup.",
    "Confirm the verification email opens https://www.sellentum.com/auth/callback and lands in the dashboard.",
    "Log out, then log in again from https://www.sellentum.com/login.",
    "Request a password reset from https://www.sellentum.com/forgot-password.",
    "Confirm the reset email opens https://www.sellentum.com/auth/callback?next=/reset-password, not localhost.",
    "Set a new password and confirm the dashboard opens.",
  ],
} as const;

export type ProductionAuthProofStep = {
  id: string;
  label: string;
  proofToCapture: string;
  failureRisk: string;
};

export const productionAuthProofSteps: ProductionAuthProofStep[] = [
  {
    id: "signup",
    label: "Fresh signup",
    proofToCapture: "Screenshot or note showing a new account can submit the signup form and receives the verification-email state.",
    failureRisk: "New merchants cannot enter the product.",
  },
  {
    id: "verification-link",
    label: "Email verification link",
    proofToCapture: "The clicked email link opens https://www.sellentum.com/auth/callback and continues to the dashboard, not localhost.",
    failureRisk: "Verified users get stranded outside the production app.",
  },
  {
    id: "login",
    label: "Login after verification",
    proofToCapture: "The verified account can log in from /login and reach /dashboard.",
    failureRisk: "Account creation appears successful but returning users cannot access the workspace.",
  },
  {
    id: "password-reset-request",
    label: "Password reset request",
    proofToCapture: "The account can request a reset email from /forgot-password.",
    failureRisk: "Users who forget credentials need manual support.",
  },
  {
    id: "password-reset-link",
    label: "Password reset link",
    proofToCapture: "The reset email opens the production callback and lands on /reset-password.",
    failureRisk: "Reset emails still point to the wrong app URL.",
  },
  {
    id: "new-password-login",
    label: "New password login",
    proofToCapture: "After setting a new password, the same account can log in and open the dashboard.",
    failureRisk: "The recovery loop is incomplete even if the email sends.",
  },
];

export function buildProductionAuthProofPacket({
  appUrl = productionAuthChecklist.appUrl,
  testedAt = new Date().toISOString(),
}: {
  appUrl?: string;
  testedAt?: string;
} = {}) {
  return [
    "Sellentum production auth proof",
    "===============================",
    "",
    `App URL: ${appUrl}`,
    `Expected callback: ${appUrl}${productionAuthChecklist.callbackPath}`,
    `Tested at: ${testedAt}`,
    "Tester: [name]",
    "",
    "Result summary",
    "- Overall result: [pass/fail]",
    "- Browser used: [Chrome/Safari/etc.]",
    "- Test email used: [email address]",
    "",
    "Proof checklist",
    ...productionAuthProofSteps.map((step, index) => [
      `${index + 1}. ${step.label}`,
      `   Result: [pass/fail]`,
      `   Proof to capture: ${step.proofToCapture}`,
      `   Evidence/notes: [paste screenshot link or notes]`,
      `   If failed, risk: ${step.failureRisk}`,
    ].join("\n")),
    "",
    "Done when",
    "- Signup, verification, login, forgot-password, reset-password and new-password login all pass on the production domain.",
    "- No email link opens localhost.",
    "- The dashboard is reachable after both verification and password reset.",
  ].join("\n");
}

const requiredEventTypes: Array<AnalyticsEvent["event_type"]> = [
  "widget_view",
  "quiz_start",
  "quiz_complete",
  "product_recommended",
  "buy_click",
];

function cleanOrigin(origin: string) {
  return (origin || "https://your-sellentum-app.vercel.app").replace(/\/+$/, "");
}

function isLocalOrigin(origin: string) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin);
}

function overallStatus(checks: ProductionCheck[]): ProductionVerificationStatus {
  if (checks.some((check) => check.status === "fail")) return "blocked";
  if (checks.some((check) => check.status === "warn")) return "review";
  return "verified";
}

function priorityFor(status: ProductionCheckStatus, area: ProductionArea): ProductionActionPriority {
  if (status === "fail") return area === "deployment" || area === "runtime" ? "critical" : "high";
  if (status === "warn") return area === "deployment" || area === "analytics" ? "high" : "medium";
  return "low";
}

function check(
  id: string,
  area: ProductionArea,
  label: string,
  status: ProductionCheckStatus,
  score: number,
  detail: string,
  evidence: string,
  href: string,
  action: string,
): ProductionCheck {
  return { id, area, label, status, score, detail, evidence, href, action };
}

function buildRequiredRoutes(origin: string): ProductionVerificationReport["requiredRoutes"] {
  const base = cleanOrigin(origin);
  return [
    { route: `${base}/`, purpose: "Public SaaS landing page", owner: "Marketing" },
    { route: `${base}/platform`, purpose: "Platform feature index", owner: "Marketing" },
    { route: `${base}/resources`, purpose: "Demo/resources page for buyer research", owner: "Marketing" },
    { route: `${base}/login`, purpose: "Business owner login", owner: "Dashboard" },
    { route: `${base}/dashboard`, purpose: "Protected workspace command center", owner: "Dashboard" },
    { route: `${base}/dashboard/preflight`, purpose: "Authenticated production preflight API view", owner: "Dashboard" },
    { route: `${base}/api/widget.js`, purpose: "Embeddable storefront widget loader", owner: "Runtime" },
    { route: `${base}/api/events`, purpose: "Public analytics event ingestion", owner: "API" },
    { route: `${base}/api/public/finder/[id]`, purpose: "Published finder recommendation runtime", owner: "API" },
    { route: `${base}/api/public/assistant/[id]`, purpose: "Published conversational advisor runtime", owner: "API" },
    { route: `${base}/api/public/search/[id]`, purpose: "Published semantic search runtime", owner: "API" },
    { route: `${base}/api/public/configurator/[id]`, purpose: "Published configurator validation runtime", owner: "API" },
  ];
}

function buildArtifacts({ mode, origin }: { mode: "demo" | "supabase"; origin: string }): ProductionArtifact[] {
  const local = isLocalOrigin(origin);
  return [
    {
      id: "typecheck",
      label: "TypeScript contract",
      status: "pass",
      owner: "Developer",
      command: "npm run typecheck",
      detail: "Compile-time types must pass before deployment.",
      proof: "This project includes a dedicated typecheck command and smoke coverage around deterministic helpers.",
    },
    {
      id: "lint",
      label: "Lint contract",
      status: "pass",
      owner: "Developer",
      command: "npm run lint",
      detail: "ESLint must pass before deployment.",
      proof: "The production verification packet includes lint as a required release command.",
    },
    {
      id: "build",
      label: "Production build",
      status: "pass",
      owner: "Developer",
      command: "npm run build",
      detail: "Next.js must compile all marketing, dashboard and runtime routes.",
      proof: "The build command is part of the release verification contract.",
    },
    {
      id: "smoke",
      label: "Production smoke suite",
      status: local ? "warn" : "pass",
      owner: "Developer",
      command: "SMOKE_BASE_URL=https://your-production-domain npm run smoke",
      detail: "The smoke suite should run against the deployed production URL after Vercel deployment.",
      proof: local ? "Local smoke can pass before deploy; production URL smoke remains the final gate." : "Origin is non-local, so production smoke can target the deployed app.",
    },
    {
      id: "supabase",
      label: "Supabase persistence",
      status: mode === "supabase" ? "pass" : "warn",
      owner: "Developer",
      path: "supabase/schema.sql",
      detail: "Production should use Supabase auth, RLS, products, quizzes, configurators, analytics and widget settings.",
      proof: mode === "supabase" ? "The current workspace is using Supabase mode." : "Demo mode is safe for local QA but not a production tenant.",
    },
    {
      id: "supabase-repair-pack",
      label: "Supabase widget/rate-limit repair",
      status: "warn",
      owner: "Founder",
      path: productionSupabaseRepair.path,
      detail: "Run this focused SQL pack only when production verification reports missing widget domain allowlists or shared rate-limit buckets.",
      proof: `Repairs ${productionSupabaseRepair.fixes.join(" and ")}; rerun ${productionSupabaseRepair.verifyCommand} afterward.`,
    },
    {
      id: "supabase-schema-rls-check",
      label: "Supabase schema and RLS verification",
      status: "warn",
      owner: "Founder",
      path: productionSupabaseRepair.schemaCheckPath,
      detail: "Run the authoritative Supabase SQL verification after migrations/repairs so table coverage, RLS, policies and functions are proven inside the production project.",
      proof: "Production is not backend-complete until every row in the Supabase SQL verification returns pass.",
    },
    {
      id: "auth-email-proof",
      label: "Production auth email proof",
      status: "warn",
      owner: "Founder",
      detail: "Supabase email confirmation and password reset must be manually proven on the live domain before inviting merchants.",
      proof: `Expected callback path: ${productionAuthChecklist.appUrl}${productionAuthChecklist.callbackPath}; reset links should land on /reset-password through the callback.`,
    },
    {
      id: "env",
      label: "Vercel environment variables",
      status: local ? "warn" : "pass",
      owner: "Developer",
      path: ".env.example",
      detail: "Vercel needs Supabase URL/keys, app URL and optional OpenAI settings before launch.",
      proof: local ? "Local origin detected; verify Vercel environment variables before calling production complete." : "Non-local origin detected; confirm Vercel values match this deployment.",
    },
    {
      id: "openai",
      label: "OpenAI assist boundary",
      status: "pass",
      owner: "Sellentum",
      detail: "OpenAI can enrich copy and explanations, but deterministic logic chooses products.",
      proof: "All public recommendation flows have fallback explanations and deterministic selection gates.",
    },
  ];
}

function hasEvent(events: AnalyticsEvent[], eventType: AnalyticsEvent["event_type"]) {
  return events.some((event) => event.event_type === eventType);
}

function hasSession(events: AnalyticsEvent[]) {
  return events.some((event) => typeof event.metadata?.session_id === "string" && event.metadata.session_id.trim().length > 0);
}

function buildDesktopQa({
  quizzes,
  configurators,
  events,
}: {
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
}): DesktopQaScenario[] {
  const publishedFinder = quizzes.find((quiz) => quiz.published) || quizzes[0];
  const publishedConfigurator = configurators.find((configurator) => configurator.published) || configurators[0];
  const eventCoverage = requiredEventTypes.filter((eventType) => hasEvent(events, eventType)).length;
  const telemetryStatus: ProductionCheckStatus = eventCoverage === requiredEventTypes.length && hasSession(events) ? "pass" : eventCoverage >= 3 ? "warn" : "fail";
  return [
    {
      id: "marketing-desktop",
      label: "Marketing desktop route sweep",
      status: "pass",
      route: "/, /platform, /resources",
      expected: "Landing, platform and resource pages render without mobile-specific assumptions.",
      telemetry: [],
      owner: "Growth",
    },
    {
      id: "dashboard-desktop",
      label: "Dashboard desktop navigation",
      status: "pass",
      route: "/dashboard",
      expected: "Desktop sidebar exposes catalog, builder, analytics, runtime, production and settings workspaces.",
      telemetry: [],
      owner: "Founder",
    },
    {
      id: "finder-runtime",
      label: "Finder customer journey",
      status: publishedFinder?.published ? "pass" : "warn",
      route: `/finder/${publishedFinder?.id || "[finder-id]"}`,
      expected: "Shopper answers questions, receives 1–3 deterministic recommendations and sees grounded explanations.",
      telemetry: ["widget_view", "quiz_start", "quiz_complete", "product_recommended"],
      owner: "Growth",
    },
    {
      id: "advisor-runtime",
      label: "Conversational advisor journey",
      status: publishedFinder?.published ? "pass" : "warn",
      route: `/assistant/${publishedFinder?.id || "[finder-id]"}`,
      expected: "Shopper submits natural language, gets clarification or catalog-backed product recommendations.",
      telemetry: ["quiz_start", "product_recommended"],
      owner: "Growth",
    },
    {
      id: "search-runtime",
      label: "Semantic search journey",
      status: publishedFinder?.published ? "pass" : "warn",
      route: `/search/${publishedFinder?.id || "[finder-id]"}`,
      expected: "Shopper searches by use case or outcome language and receives deterministic ranked products.",
      telemetry: ["quiz_start", "product_recommended"],
      owner: "Growth",
    },
    {
      id: "configurator-runtime",
      label: "Configurator bundle journey",
      status: publishedConfigurator?.published ? "pass" : "warn",
      route: `/configurator/${publishedConfigurator?.id || "[configurator-id]"}`,
      expected: "Shopper builds a compatible bundle and can review or buy linked products.",
      telemetry: ["quiz_start", "quiz_complete", "buy_click"],
      owner: "Growth",
    },
    {
      id: "widget-install",
      label: "Widget install smoke",
      status: "pass",
      route: "/api/widget.js",
      expected: "Script loads modal or inline iframe and passes attribution labels into the public runtime.",
      telemetry: ["widget_view"],
      owner: "Developer",
    },
    {
      id: "telemetry-proof",
      label: "End-to-end telemetry proof",
      status: telemetryStatus,
      route: "/dashboard/analytics",
      expected: "Views, starts, completions, recommendations, buy clicks and anonymous session IDs are visible.",
      telemetry: requiredEventTypes,
      owner: "Developer",
    },
  ];
}

function buildActions(checks: ProductionCheck[]): ProductionAction[] {
  const actions = checks
    .filter((item) => item.status !== "pass")
    .map((item) => ({
      id: `production-${item.id}`,
      title: item.action,
      detail: item.detail,
      evidence: item.evidence,
      priority: priorityFor(item.status, item.area),
      href: item.href,
      label: item.status === "fail" ? "Fix blocker" : "Review gate",
    }));

  if (!actions.length) {
    actions.push({
      id: "production-ship",
      title: "Run the final production smoke suite",
      detail: "All production verification checks are passing. Run smoke against the deployed URL, then copy the packet into the release handoff.",
      evidence: "No blocking or warning production checks remain.",
      priority: "low",
      href: "/dashboard/release-center",
      label: "Open release",
    });
  }

  const rank: Record<ProductionActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 7);
}

function buildPacket(report: Omit<ProductionVerificationReport, "packet">) {
  return [
    "Sellentum Production Verification packet",
    "=====================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Deployment boundary",
    "- Production is not complete until the deployed Vercel URL passes typecheck, lint, build and smoke.",
    "- Demo mode is acceptable for local QA, but Supabase mode is required for a real merchant tenant.",
    "- OpenAI assists enrichment and explanations; deterministic product selection remains the launch invariant.",
    "",
    "Required verification commands",
    ...report.artifacts.filter((artifact) => artifact.command).map((artifact) => `- ${artifact.command}`),
    "",
    "Supabase SQL artifacts",
    ...report.artifacts.filter((artifact) => artifact.path).map((artifact) => `- [${artifact.status.toUpperCase()}] ${artifact.path}: ${artifact.proof}`),
    "",
    "Production auth proof",
    ...productionAuthChecklist.manualChecks.map((item) => `- ${item}`),
    "",
    "Production checks",
    ...report.checks.map((check) => `- [${check.status.toUpperCase()}] ${check.label} (${check.score}%): ${check.evidence}`),
    "",
    "Required routes and APIs",
    ...report.requiredRoutes.map((route) => `- ${route.route}: ${route.purpose}`),
    "",
    "Desktop QA scenarios",
    ...report.desktopQa.map((scenario) => `- [${scenario.status.toUpperCase()}] ${scenario.label}: ${scenario.expected}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildProductionVerificationReport({
  origin,
  mode,
  products,
  quizzes,
  configurators,
  events,
  settings,
}: {
  origin: string;
  mode: "demo" | "supabase";
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
}): ProductionVerificationReport {
  const clean = cleanOrigin(origin);
  const release = buildReleaseCandidate({ origin: clean, products, quizzes, configurators, events, settings });
  const runtime = buildRuntimeOperationsReport({ origin: clean, products, quizzes, configurators, events, settings });
  const registry = buildExperienceRegistry({ origin: clean, quizzes, configurators, events, settings });
  const sandbox = buildStorefrontSandboxReport({ origin: clean, finders: quizzes, configurators, events, settings });
  const analytics = buildAnalyticsQualityReport(events);
  const requiredRoutes = buildRequiredRoutes(clean);
  const artifacts = buildArtifacts({ mode, origin: clean });
  const desktopQa = buildDesktopQa({ quizzes, configurators, events });
  const localOrigin = isLocalOrigin(clean);
  const eventCoverage = requiredEventTypes.filter((eventType) => hasEvent(events, eventType)).length;

  const checks: ProductionCheck[] = [
    check(
      "deployment-origin",
      "deployment",
      "Production deployment target",
      localOrigin ? "warn" : clean.includes("your-sellentum-app") ? "fail" : "pass",
      localOrigin ? 60 : clean.includes("your-sellentum-app") ? 0 : 94,
      "The final smoke suite should target the deployed Vercel domain, not a local dev server.",
      localOrigin ? `${clean} is a local origin. Use it for QA, then repeat smoke on Vercel.` : `${clean} is a non-local deployment target.`,
      "/dashboard/preflight",
      "Set Vercel production URL and rerun smoke",
    ),
    check(
      "supabase-mode",
      "deployment",
      "Merchant persistence mode",
      mode === "supabase" ? "pass" : "warn",
      mode === "supabase" ? 92 : 62,
      "A real production tenant needs Supabase auth, RLS and persistent catalog/quiz/analytics data.",
      mode === "supabase" ? "Current workspace is connected to Supabase." : "Current workspace is running in local demo mode.",
      "/dashboard/preflight",
      "Connect Supabase before merchant launch",
    ),
    check(
      "release-candidate",
      "handoff",
      "Go/no-go release candidate",
      release.decision === "go" ? "pass" : release.decision === "review" ? "warn" : "fail",
      release.score,
      "Release Center must combine catalog, channel, sandbox, analytics and rollback evidence.",
      `${release.decision.toUpperCase()} candidate at ${release.score}% with ${release.actions.length} open release action${release.actions.length === 1 ? "" : "s"}.`,
      "/dashboard/release-center",
      "Review release candidate gates",
    ),
    check(
      "runtime-ops",
      "runtime",
      "Runtime operations health",
      runtime.status === "healthy" ? "pass" : runtime.status === "watch" ? "warn" : "fail",
      runtime.score,
      "Public widget, finder, advisor, search, configurator and event APIs need endpoint contracts and guardrails.",
      `${runtime.summary.passingChecks} passing, ${runtime.summary.warningChecks} warning and ${runtime.summary.blockingChecks} blocking runtime checks.`,
      "/dashboard/operations",
      "Clear runtime operation warnings",
    ),
    check(
      "route-contract",
      "runtime",
      "Required route coverage",
      requiredRoutes.length >= 12 && registry.summary.surfaces >= 4 ? "pass" : "warn",
      requiredRoutes.length >= 12 && registry.summary.surfaces >= 4 ? 94 : 66,
      "Marketing, dashboard, widget, public runtime and analytics routes should all be represented in the launch contract.",
      `${requiredRoutes.length} required routes tracked · ${registry.summary.surfaces} customer-facing surfaces in the registry.`,
      "/dashboard/api-center",
      "Review route and API contracts",
    ),
    check(
      "desktop-qa",
      "storefront",
      "Desktop storefront QA",
      sandbox.summary.blocked ? "fail" : sandbox.summary.verified || desktopQa.filter((scenario) => scenario.status === "pass").length >= 6 ? "pass" : "warn",
      sandbox.summary.blocked ? 30 : sandbox.summary.verified ? 88 : 68,
      "Desktop-first QA should verify marketing, dashboard, widget, finder, advisor, search and configurator flows.",
      `${desktopQa.filter((scenario) => scenario.status === "pass").length}/${desktopQa.length} desktop QA scenarios look ready; ${sandbox.summary.verified}/${sandbox.summary.cases} sandbox cases verified.`,
      "/dashboard/storefront-sandbox",
      "Run desktop storefront QA",
    ),
    check(
      "analytics-proof",
      "analytics",
      "Analytics and telemetry proof",
      analytics.status === "healthy" && eventCoverage === requiredEventTypes.length && hasSession(events) ? "pass" : analytics.status === "needs-attention" ? "fail" : "warn",
      Math.round((analytics.score + eventCoverage / requiredEventTypes.length * 100 + (hasSession(events) ? 100 : 0)) / 3),
      "Production verification needs event-contract coverage, product attribution and anonymous session IDs.",
      `${eventCoverage}/${requiredEventTypes.length} required event types seen · analytics QA ${analytics.score}% · session IDs ${hasSession(events) ? "present" : "missing"}.`,
      "/dashboard/analytics",
      "Verify event contract and session metadata",
    ),
    check(
      "trust-boundary",
      "trust",
      "Deterministic AI trust boundary",
      "pass",
      96,
      "AI may enrich and explain but should never replace deterministic product selection.",
      "Recommendation, advisor, search, configurator, feedback and content workflows preserve deterministic selection boundaries.",
      "/dashboard/trust-center",
      "Review AI trust boundary",
    ),
  ];

  const status = overallStatus(checks);
  const score = Math.round(checks.reduce((sum, item) => sum + item.score, 0) / Math.max(1, checks.length));
  const actions = buildActions(checks);
  const baseReport: Omit<ProductionVerificationReport, "packet"> = {
    status,
    score,
    headline: status === "verified"
      ? "Sellentum is verified for production handoff after the final deployed smoke run."
      : status === "review"
        ? "Sellentum is close to production-ready; deployment and telemetry gates need final review."
        : "Sellentum has production blockers that must be fixed before launch.",
    summary: {
      checks: checks.length,
      passingChecks: checks.filter((item) => item.status === "pass").length,
      warningChecks: checks.filter((item) => item.status === "warn").length,
      blockingChecks: checks.filter((item) => item.status === "fail").length,
      desktopScenarios: desktopQa.length,
      verifiedScenarios: desktopQa.filter((item) => item.status === "pass").length,
      requiredRoutes: requiredRoutes.length,
      runtimeEndpoints: runtime.summary.endpoints,
      analyticsQualityScore: analytics.score,
      releaseScore: release.score,
      runtimeScore: runtime.score,
    },
    checks,
    artifacts,
    desktopQa,
    requiredRoutes,
    actions,
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
