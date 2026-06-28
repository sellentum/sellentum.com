import { analyticsEventSessionId, buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildCommercialImpactReport } from "./commercial-impact";
import { buildExperienceRegistry } from "./experience-registry";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "./types";

export type UsagePlanId = "starter" | "growth" | "scale";
export type UsageMeterStatus = "healthy" | "watch" | "over";
export type UsageCenterStatus = "empty" | "ready" | "watch" | "needs-upgrade";
export type UsageActionPriority = "critical" | "high" | "medium" | "low";

export type UsagePlan = {
  id: UsagePlanId;
  name: string;
  priceLabel: string;
  description: string;
  limits: {
    sessions: number;
    interactions: number;
    products: number;
    experiences: number;
    aiCredits: number;
  };
  includes: string[];
  stripePlaceholder: string;
};

export type UsageMeter = {
  id: keyof UsagePlan["limits"];
  label: string;
  used: number;
  limit: number;
  unit: string;
  percent: number;
  status: UsageMeterStatus;
  detail: string;
};

export type BillingReadinessCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  evidence: string;
};

export type UsageAction = {
  id: string;
  priority: UsageActionPriority;
  title: string;
  detail: string;
  evidence: string;
  actionHref: string;
  actionLabel: string;
};

export type UsageCenterReport = {
  status: UsageCenterStatus;
  score: number;
  headline: string;
  currentPlan: UsagePlan;
  recommendedPlan: UsagePlan;
  plans: UsagePlan[];
  meters: UsageMeter[];
  checks: BillingReadinessCheck[];
  actions: UsageAction[];
  summary: {
    periodLabel: string;
    sessions: number;
    interactions: number;
    aiCredits: number;
    activeProducts: number;
    publishedExperiences: number;
    liveSurfaces: number;
    assistedValue: number;
    completionRate: number;
    clickRate: number;
    projectedMonthlySessions: number;
    planFit: UsageCenterStatus;
  };
  packet: string;
};

export const usagePlans: UsagePlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceLabel: "£99/mo placeholder",
    description: "For a small storefront proving the guided-selling loop.",
    limits: { sessions: 1_000, interactions: 5_000, products: 250, experiences: 3, aiCredits: 1_000 },
    includes: ["Finder, advisor, search and configurator embeds", "CSV catalog import", "Basic analytics", "Stripe checkout placeholder"],
    stripePlaceholder: "price_sellentum_starter_placeholder",
  },
  {
    id: "growth",
    name: "Growth",
    priceLabel: "£249/mo placeholder",
    description: "For teams scaling multiple guided experiences and channels.",
    limits: { sessions: 10_000, interactions: 50_000, products: 2_500, experiences: 12, aiCredits: 10_000 },
    includes: ["Launch channels and syndication boards", "Headless API handoff", "Advanced QA centers", "Usage-based overage placeholder"],
    stripePlaceholder: "price_sellentum_growth_placeholder",
  },
  {
    id: "scale",
    name: "Scale",
    priceLabel: "Talk to sales placeholder",
    description: "For larger catalogs, partner deployments and higher-volume usage.",
    limits: { sessions: 100_000, interactions: 500_000, products: 25_000, experiences: 50, aiCredits: 100_000 },
    includes: ["Partner-safe syndication", "Workspace export", "Runtime operations", "Custom pricing placeholder"],
    stripePlaceholder: "price_sellentum_scale_placeholder",
  },
];

function recentPeriodEvents(events: AnalyticsEvent[], days = 30) {
  if (!events.length) return [];
  const latest = events.reduce((max, event) => Math.max(max, new Date(event.created_at).getTime()), 0);
  const cutoff = latest - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.created_at).getTime() >= cutoff);
}

function publishedExperiences(quizzes: Quiz[], configurators: Configurator[]) {
  const publishedFinders = quizzes.filter((quiz) => quiz.published).length;
  const publishedConfigurators = configurators.filter((configurator) => configurator.published).length;
  return publishedFinders * 3 + publishedConfigurators;
}

function estimatedAiCredits(events: AnalyticsEvent[]) {
  return events.reduce((sum, event) => {
    if (event.event_type === "product_recommended") return sum + 1;
    if (event.event_type === "quiz_complete") return sum + 2;
    if (event.metadata?.experience_type === "assistant" || event.metadata?.experience_type === "search") return sum + 1;
    return sum;
  }, 0);
}

function meterStatus(percent: number): UsageMeterStatus {
  if (percent >= 100) return "over";
  if (percent >= 75) return "watch";
  return "healthy";
}

function buildMeter(id: keyof UsagePlan["limits"], label: string, used: number, limit: number, unit: string): UsageMeter {
  const percent = stageRate(used, limit);
  const status = meterStatus(percent);
  return {
    id,
    label,
    used,
    limit,
    unit,
    percent,
    status,
    detail: `${used.toLocaleString("en-GB")} of ${limit.toLocaleString("en-GB")} ${unit} used in the current metering window.`,
  };
}

function firstPlanThatFits(usage: UsagePlan["limits"]) {
  return usagePlans.find((plan) => (
    usage.sessions <= plan.limits.sessions &&
    usage.interactions <= plan.limits.interactions &&
    usage.products <= plan.limits.products &&
    usage.experiences <= plan.limits.experiences &&
    usage.aiCredits <= plan.limits.aiCredits
  )) || usagePlans.at(-1)!;
}

function statusFromMeters(meters: UsageMeter[], sessions: number): UsageCenterStatus {
  if (!sessions && meters.every((meter) => meter.used === 0)) return "empty";
  if (meters.some((meter) => meter.status === "over")) return "needs-upgrade";
  if (meters.some((meter) => meter.status === "watch")) return "watch";
  return "ready";
}

function scoreFromMeters(meters: UsageMeter[], checks: BillingReadinessCheck[]) {
  const usagePenalty = meters.reduce((sum, meter) => sum + (meter.status === "over" ? 22 : meter.status === "watch" ? 10 : 0), 0);
  const checkPenalty = checks.reduce((sum, check) => sum + (check.status === "fail" ? 16 : check.status === "warn" ? 6 : 0), 0);
  return Math.max(0, Math.min(100, 100 - usagePenalty - checkPenalty));
}

function buildChecks(input: {
  settings: WidgetSettings;
  events: AnalyticsEvent[];
  liveSurfaces: number;
  publishedExperiences: number;
  activeProducts: number;
}): BillingReadinessCheck[] {
  return [
    {
      id: "workspace-identity",
      label: "Workspace identity",
      status: input.settings.brand_name ? "pass" : "warn",
      detail: input.settings.brand_name ? `Invoices and usage exports can label this workspace as ${input.settings.brand_name}.` : "Add a brand name before exposing billing exports.",
      evidence: input.settings.brand_name || "No brand name configured.",
    },
    {
      id: "event-metering",
      label: "Event metering",
      status: input.events.length ? "pass" : "warn",
      detail: input.events.length ? "Usage can be measured from captured widget and journey events." : "No events are available to meter usage yet.",
      evidence: `${input.events.length} event${input.events.length === 1 ? "" : "s"} in the current 30-day window.`,
    },
    {
      id: "experience-metering",
      label: "Experience metering",
      status: input.publishedExperiences ? "pass" : "fail",
      detail: input.publishedExperiences ? "Published finders, advisor/search surfaces and configurators can be counted against plan limits." : "Publish at least one customer-facing experience before charging for usage.",
      evidence: `${input.publishedExperiences} published billable surface${input.publishedExperiences === 1 ? "" : "s"}; ${input.liveSurfaces} have live telemetry.`,
    },
    {
      id: "catalog-metering",
      label: "Catalog scale",
      status: input.activeProducts ? "pass" : "fail",
      detail: input.activeProducts ? "Active products can be counted against catalog-scale pricing drivers." : "Import products before the workspace is billable.",
      evidence: `${input.activeProducts} active product${input.activeProducts === 1 ? "" : "s"}.`,
    },
    {
      id: "stripe-placeholder",
      label: "Stripe placeholder boundary",
      status: "warn",
      detail: "This MVP intentionally stops at pricing and usage readiness. No Stripe checkout, subscription or payment mutation is enabled.",
      evidence: "Placeholder price IDs only; no card is charged.",
    },
  ];
}

function buildActions(input: {
  status: UsageCenterStatus;
  currentPlan: UsagePlan;
  recommendedPlan: UsagePlan;
  meters: UsageMeter[];
  checks: BillingReadinessCheck[];
}): UsageAction[] {
  const actions: UsageAction[] = [];
  const over = input.meters.filter((meter) => meter.status === "over");
  const watch = input.meters.filter((meter) => meter.status === "watch");
  const failed = input.checks.filter((check) => check.status === "fail");

  if (over.length) {
    actions.push({
      id: "upgrade-plan-fit",
      priority: "critical",
      title: `Move this workspace to ${input.recommendedPlan.name}`,
      detail: "Current usage is above the starter placeholder limit for at least one metered dimension.",
      evidence: over.map((meter) => `${meter.label}: ${Math.round(meter.percent)}%`).join(", "),
      actionHref: "/dashboard/usage",
      actionLabel: "Review plan fit",
    });
  }

  if (watch.length && !over.length) {
    actions.push({
      id: "watch-plan-thresholds",
      priority: "medium",
      title: "Watch plan thresholds before the next launch",
      detail: "Usage is approaching one or more starter placeholder limits.",
      evidence: watch.map((meter) => `${meter.label}: ${Math.round(meter.percent)}%`).join(", "),
      actionHref: "/dashboard/analytics",
      actionLabel: "Inspect usage",
    });
  }

  for (const check of failed) {
    actions.push({
      id: `fix-${check.id}`,
      priority: "high",
      title: `Fix ${check.label.toLowerCase()}`,
      detail: check.detail,
      evidence: check.evidence,
      actionHref: check.id === "catalog-metering" ? "/dashboard/products" : "/dashboard/launch",
      actionLabel: check.id === "catalog-metering" ? "Import products" : "Publish experience",
    });
  }

  actions.push({
    id: "keep-stripe-placeholder-safe",
    priority: "low",
    title: "Keep billing as a safe placeholder",
    detail: "Document the future Stripe price IDs and plan limits without enabling payment collection in the MVP.",
    evidence: `${input.currentPlan.name} uses ${input.currentPlan.stripePlaceholder}.`,
    actionHref: "/dashboard/usage",
    actionLabel: "Copy billing packet",
  });

  return actions.slice(0, 5);
}

function headline(status: UsageCenterStatus, currentPlan: UsagePlan, recommendedPlan: UsagePlan) {
  if (status === "empty") return "Usage metering is ready, but this workspace needs traffic before plan fit can be proven.";
  if (status === "needs-upgrade") return `${recommendedPlan.name} is the safer placeholder plan for the current Sellentum usage profile.`;
  if (status === "watch") return `${currentPlan.name} still fits, but one or more metered dimensions is nearing its placeholder limit.`;
  return `${currentPlan.name} is a healthy placeholder fit for the current guided-selling usage.`;
}

function buildPacket(report: Omit<UsageCenterReport, "packet">) {
  return [
    "Sellentum Usage & Plan Center packet",
    "",
    `Status: ${report.status} · Score: ${report.score}%`,
    `Workspace: ${report.summary.periodLabel}`,
    `Current placeholder plan: ${report.currentPlan.name} (${report.currentPlan.priceLabel})`,
    `Recommended placeholder plan: ${report.recommendedPlan.name} (${report.recommendedPlan.priceLabel})`,
    "",
    "Metered usage",
    ...report.meters.map((meter) => `- ${meter.label}: ${meter.used.toLocaleString("en-GB")}/${meter.limit.toLocaleString("en-GB")} ${meter.unit} (${Math.round(meter.percent)}%, ${meter.status})`),
    "",
    "Billing boundary",
    "- Stripe is a placeholder only in this MVP.",
    "- No checkout session, subscription, invoice, card charge or billing mutation is enabled.",
    "- Usage events remain internal workspace analytics until real billing is deliberately added.",
    "",
    "Readiness checks",
    ...report.checks.map((check) => `- [${check.status}] ${check.label}: ${check.evidence}`),
    "",
    "Action queue",
    ...report.actions.map((action, index) => `${index + 1}. [${action.priority}] ${action.title}: ${action.detail}`),
  ].join("\n");
}

export function buildUsageCenterReport({
  origin = "https://your-sellentum-app.vercel.app",
  settings,
  products,
  quizzes,
  configurators,
  events,
}: {
  origin?: string;
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
}): UsageCenterReport {
  const periodEvents = recentPeriodEvents(events, 30);
  const snapshot = buildAnalyticsSnapshot(periodEvents);
  const registry = buildExperienceRegistry({ origin, settings, quizzes, configurators, events: periodEvents });
  const commercial = buildCommercialImpactReport(periodEvents, products);
  const activeProducts = products.filter((product) => product.active).length;
  const billableExperiences = publishedExperiences(quizzes, configurators);
  const aiCredits = estimatedAiCredits(periodEvents);
  const sessions = new Set(periodEvents.map(analyticsEventSessionId)).size || snapshot.sessions;
  const projectedMonthlySessions = sessions;
  const usage = {
    sessions: projectedMonthlySessions,
    interactions: periodEvents.length,
    products: activeProducts,
    experiences: billableExperiences,
    aiCredits,
  };
  const currentPlan = usagePlans[0];
  const recommendedPlan = firstPlanThatFits(usage);
  const meters = [
    buildMeter("sessions", "Shopper sessions", usage.sessions, currentPlan.limits.sessions, "sessions"),
    buildMeter("interactions", "Guided interactions", usage.interactions, currentPlan.limits.interactions, "events"),
    buildMeter("products", "Active catalog", usage.products, currentPlan.limits.products, "products"),
    buildMeter("experiences", "Published experiences", usage.experiences, currentPlan.limits.experiences, "surfaces"),
    buildMeter("aiCredits", "AI assist credits", usage.aiCredits, currentPlan.limits.aiCredits, "credits"),
  ];
  const checks = buildChecks({
    settings,
    events: periodEvents,
    liveSurfaces: registry.summary.live,
    publishedExperiences: billableExperiences,
    activeProducts,
  });
  const status = statusFromMeters(meters, sessions);
  const score = scoreFromMeters(meters, checks);
  const partial = {
    status,
    score,
    headline: headline(status, currentPlan, recommendedPlan),
    currentPlan,
    recommendedPlan,
    plans: usagePlans,
    meters,
    checks,
    summary: {
      periodLabel: "Current 30-day usage window",
      sessions,
      interactions: periodEvents.length,
      aiCredits,
      activeProducts,
      publishedExperiences: billableExperiences,
      liveSurfaces: registry.summary.live,
      assistedValue: commercial.summary.influencedRevenue,
      completionRate: stageRate(snapshot.completed, snapshot.started),
      clickRate: stageRate(snapshot.clicked, snapshot.completed || snapshot.product_recommended),
      projectedMonthlySessions,
      planFit: status,
    },
  };
  const actions = buildActions({ status, currentPlan, recommendedPlan, meters, checks });
  return {
    ...partial,
    actions,
    packet: buildPacket({ ...partial, actions }),
  };
}
