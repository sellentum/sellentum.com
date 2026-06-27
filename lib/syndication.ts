import type { AnalyticsEvent, Configurator, ExperienceType, Product, Quiz, WidgetSettings } from "@/lib/types";
import { formatCurrency } from "./utils";
import { buildWidgetInstallReport, buildWidgetSnippet, type WidgetEmbedExperience, type WidgetEmbedMode, type WidgetInstallReport, type WidgetSnippetConfig, widgetExperienceLabel } from "./widget-snippet";

export type SyndicationStatus = "blocked" | "ready" | "learning" | "live";
export type SyndicationPriority = "critical" | "high" | "medium" | "low";
export type SyndicationPartnerType = "Retailer" | "Marketplace" | "Affiliate" | "Support" | "Sales";

export type SyndicationPlacement = {
  id: string;
  name: string;
  partnerType: SyndicationPartnerType;
  audience: string;
  targetPages: string;
  objective: string;
  experience: WidgetEmbedExperience;
  mode: WidgetEmbedMode;
  source: string;
  campaign: string;
  placement: string;
  label: string;
  status: SyndicationStatus;
  statusLabel: string;
  publicUrl: string;
  snippet: string;
  installReport: WidgetInstallReport;
  metrics: {
    views: number;
    starts: number;
    completions: number;
    recommendations: number;
    clicks: number;
    clickValue: number;
    startRate: number;
    completionRate: number;
    clickRate: number;
  };
  acceptanceCriteria: string[];
  qa: Array<{
    id: string;
    label: string;
    detail: string;
    status: "pass" | "warn" | "fail";
  }>;
  dataPolicy: string[];
  nextAction: {
    title: string;
    detail: string;
    href: string;
    label: string;
    priority: SyndicationPriority;
  };
};

export type SyndicationReport = {
  status: SyndicationStatus;
  score: number;
  summary: {
    placements: number;
    installReady: number;
    activePartners: number;
    blockedPlacements: number;
    totalViews: number;
    totalClicks: number;
    assistedValue: number;
  };
  placements: SyndicationPlacement[];
  recommendedPlacement?: SyndicationPlacement;
  governance: Array<{
    id: string;
    label: string;
    detail: string;
    status: "pass" | "warn" | "fail";
  }>;
  packet: string;
};

type SyndicationTemplate = {
  id: string;
  name: string;
  partnerType: SyndicationPartnerType;
  audience: string;
  targetPages: string;
  objective: string;
  experience: WidgetEmbedExperience;
  mode: WidgetEmbedMode;
  source: string;
  placement: string;
  label: string;
};

const templates: SyndicationTemplate[] = [
  {
    id: "retailer-pdp-advisor",
    name: "Retailer PDP advisor",
    partnerType: "Retailer",
    audience: "Retailer shoppers comparing products on a partner PDP who need guided reassurance before buying.",
    targetPages: "Retailer product detail pages, buying-guide modules, comparison widgets",
    objective: "Give downstream retailers a branded Findly advisor without exposing merchant admin access.",
    experience: "assistant",
    mode: "modal",
    source: "retailer",
    placement: "partner-pdp-advisor",
    label: "Ask for advice",
  },
  {
    id: "marketplace-buying-guide",
    name: "Marketplace buying guide",
    partnerType: "Marketplace",
    audience: "Marketplace visitors who need a concise question flow before choosing between a brand's variants.",
    targetPages: "Marketplace brand store, collection pages, sponsored buying guides",
    objective: "Syndicate the guided finder as an inline guide while preserving campaign attribution.",
    experience: "finder",
    mode: "inline",
    source: "marketplace",
    placement: "partner-brand-store-guide",
    label: "Find my match",
  },
  {
    id: "affiliate-search-guide",
    name: "Affiliate search guide",
    partnerType: "Affiliate",
    audience: "Affiliate or publisher audiences arriving through reviews, gift guides and problem-led content.",
    targetPages: "Editorial buying guides, comparison articles, influencer landing pages",
    objective: "Let partners capture natural-language shopper needs and route buyers to the right products.",
    experience: "search",
    mode: "inline",
    source: "affiliate",
    placement: "partner-editorial-search",
    label: "Search products",
  },
  {
    id: "support-advisor-syndication",
    name: "Support center advisor",
    partnerType: "Support",
    audience: "Support teams, live-chat agents and knowledge-base visitors handling fit or compatibility questions.",
    targetPages: "Retailer support centers, help-desk macros, post-purchase care pages",
    objective: "Reduce partner support escalations by giving agents the same deterministic guidance shoppers receive.",
    experience: "assistant",
    mode: "modal",
    source: "support-partner",
    placement: "partner-help-center",
    label: "Open product advisor",
  },
  {
    id: "sales-rep-configurator",
    name: "Retail associate configurator",
    partnerType: "Sales",
    audience: "In-store associates and sales reps assembling bundles, kits or compatible add-ons for shoppers.",
    targetPages: "Retail associate tablets, showroom quote tools, B2B sales portals",
    objective: "Provide a partner-safe configurator package for assisted selling and bundle confidence.",
    experience: "configurator",
    mode: "inline",
    source: "sales-partner",
    placement: "partner-sales-configurator",
    label: "Build the bundle",
  },
];

function cleanOrigin(origin: string) {
  return (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function eventMetadata(event: AnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function eventExperience(event: AnalyticsEvent): ExperienceType | "" {
  const value = event.metadata?.experience_type;
  return value === "finder" || value === "assistant" || value === "search" || value === "configurator" ? value : "";
}

function partnerCampaign(template: SyndicationTemplate) {
  return `findly-syndication-${template.id}`;
}

function placementEvents(events: AnalyticsEvent[], template: SyndicationTemplate) {
  const campaign = partnerCampaign(template);
  return events.filter((event) => {
    const eventCampaign = eventMetadata(event, "findly_campaign");
    const source = eventMetadata(event, "findly_source");
    const placement = eventMetadata(event, "findly_placement");
    const medium = eventMetadata(event, "findly_medium");
    const experience = eventExperience(event);
    return eventCampaign === campaign
      || placement === template.placement
      || (source === template.source && (medium === "syndication" || !medium) && (!experience || experience === template.experience));
  });
}

function clickValue(events: AnalyticsEvent[], products: Product[]) {
  const prices = new Map(products.map((product) => [product.id, product.price]));
  return events.reduce((sum, event) => event.event_type === "buy_click" && event.product_id ? sum + (prices.get(event.product_id) || 0) : sum, 0);
}

function metricsForEvents(events: AnalyticsEvent[], products: Product[]) {
  const views = events.filter((event) => event.event_type === "widget_view").length;
  const starts = events.filter((event) => event.event_type === "quiz_start").length;
  const completions = events.filter((event) => event.event_type === "quiz_complete").length;
  const recommendations = events.filter((event) => event.event_type === "product_recommended").length;
  const clicks = events.filter((event) => event.event_type === "buy_click").length;
  return {
    views,
    starts,
    completions,
    recommendations,
    clicks,
    clickValue: clickValue(events, products),
    startRate: rate(starts, views),
    completionRate: rate(completions, starts || views),
    clickRate: rate(clicks, completions || recommendations || views),
  };
}

function idForTemplate(template: SyndicationTemplate, finder?: Quiz, configurator?: Configurator) {
  return template.experience === "configurator" ? configurator?.id : finder?.id;
}

function publicPath(experience: WidgetEmbedExperience) {
  if (experience === "assistant") return "assistant";
  if (experience === "configurator") return "configurator";
  if (experience === "search") return "search";
  return "finder";
}

function configForTemplate(template: SyndicationTemplate, origin: string, settings: WidgetSettings, id?: string): WidgetSnippetConfig {
  return {
    origin,
    experience: template.experience,
    mode: template.mode,
    id,
    color: settings.primary_color,
    label: template.label,
    position: settings.launcher_position === "bottom-left" ? "left" : "right",
    medium: "syndication",
    source: template.source,
    campaign: partnerCampaign(template),
    placement: template.placement,
    content: template.partnerType.toLowerCase(),
  };
}

function statusForPlacement(installReport: WidgetInstallReport, metrics: ReturnType<typeof metricsForEvents>): SyndicationStatus {
  if (!installReport.canInstall) return "blocked";
  if (metrics.clicks > 0 || metrics.completions >= 5) return "live";
  if (metrics.views > 0 || metrics.starts > 0 || metrics.recommendations > 0) return "learning";
  return "ready";
}

function statusLabel(status: SyndicationStatus) {
  if (status === "live") return "Live with partner traffic";
  if (status === "learning") return "Learning from partner traffic";
  if (status === "ready") return "Ready to send";
  return "Blocked";
}

function acceptanceCriteria(template: SyndicationTemplate) {
  return [
    `Partner installs the snippet exactly as provided for ${template.targetPages}.`,
    `The snippet keeps data-medium="syndication", data-source="${template.source}", data-campaign="${partnerCampaign(template)}" and data-placement="${template.placement}".`,
    "A staging QA journey records widget_view plus at least one downstream journey event before live traffic.",
    "Partner preserves the iframe/script origin and does not proxy shopper requests through an unapproved server.",
    "Buy buttons continue to route to the merchant-provided product_url values.",
  ];
}

function qaForPlacement(template: SyndicationTemplate, installReport: WidgetInstallReport, metrics: ReturnType<typeof metricsForEvents>) {
  const checks = installReport.checks.map((item) => ({
    id: `install-${item.id}`,
    label: item.label,
    detail: item.detail,
    status: item.severity === "pass" ? "pass" as const : item.severity === "warning" ? "warn" as const : "fail" as const,
  }));
  checks.push({
    id: "syndication-attribution",
    label: "Partner attribution",
    detail: `Events are scoped with source=${template.source}, campaign=${partnerCampaign(template)} and placement=${template.placement}.`,
    status: "pass" as const,
  });
  checks.push({
    id: "partner-traffic-proof",
    label: "Partner traffic proof",
    detail: metrics.views ? `${metrics.views} partner widget view${metrics.views === 1 ? "" : "s"} captured.` : "No partner widget_view yet; send this packet for staging QA before launch.",
    status: metrics.views ? "pass" as const : "warn" as const,
  });
  checks.push({
    id: "partner-conversion-proof",
    label: "Downstream conversion proof",
    detail: metrics.clicks ? `${metrics.clicks} buy clicks worth ${formatCurrency(metrics.clickValue)} captured for this partner placement.` : "No partner buy-click proof yet.",
    status: metrics.clicks ? "pass" as const : metrics.completions ? "warn" as const : "warn" as const,
  });
  return checks;
}

function dataPolicyForPlacement(template: SyndicationTemplate) {
  return [
    "No Supabase keys, OpenAI keys, merchant admin routes or private dashboard URLs are shared with the partner.",
    `Partner receives only a public ${widgetExperienceLabel(template.experience).toLowerCase()} runtime inside a controlled script/iframe.`,
    "Analytics uses campaign, source, placement, page URL, page title and referrer labels; avoid sending customer names, emails or order IDs.",
    "Product recommendations remain selected by Findly's deterministic catalog/rule engine; AI copy is generated only after products are selected.",
  ];
}

function nextActionForPlacement(template: SyndicationTemplate, status: SyndicationStatus, metrics: ReturnType<typeof metricsForEvents>, installReport: WidgetInstallReport): SyndicationPlacement["nextAction"] {
  if (!installReport.canInstall) {
    const blocker = installReport.checks.find((item) => item.severity === "blocker");
    return {
      title: "Fix syndication blocker",
      detail: blocker?.detail || "Publish the required finder or configurator before sending this partner packet.",
      href: template.experience === "configurator" ? "/dashboard/configurators" : "/dashboard/quizzes",
      label: "Open builder",
      priority: "critical",
    };
  }
  if (status === "ready") {
    return {
      title: "Send staging packet to partner",
      detail: "Copy the partner packet, ask the partner to install on staging, then confirm attributed widget_view telemetry.",
      href: "/dashboard/syndication",
      label: "Copy packet",
      priority: "high",
    };
  }
  if (status === "learning" && metrics.completionRate < 35) {
    return {
      title: "Improve partner completion",
      detail: `Completion is ${metrics.completionRate}%. Review copy, placement and first-question clarity before expanding this partner.`,
      href: "/dashboard/lab",
      label: "Debug flow",
      priority: "medium",
    };
  }
  if (status === "live" && metrics.clickRate < 18) {
    return {
      title: "Tune downstream click-through",
      detail: `Buy-click rate is ${metrics.clickRate}%. Use Analytics to compare partner traffic against owned-storefront traffic.`,
      href: "/dashboard/analytics",
      label: "Open analytics",
      priority: "medium",
    };
  }
  return {
    title: "Scale this partner package",
    detail: "This partner placement has usable signal. Package the next placement or negotiate broader retailer coverage.",
    href: "/dashboard/channels",
    label: "Plan channels",
    priority: "low",
  };
}

function governance(placements: SyndicationPlacement[], products: Product[]) {
  const missingProductUrls = products.filter((product) => product.active && !product.product_url).length;
  return [
    {
      id: "partner-boundary",
      label: "Partner-safe runtime boundary",
      detail: "Syndication packets expose public widget runtimes only; no dashboard access, API keys or admin credentials are included.",
      status: "pass" as const,
    },
    {
      id: "commerce-links",
      label: "Commerce link coverage",
      detail: missingProductUrls ? `${missingProductUrls} active products are missing product URLs, which can weaken partner Buy Now handoff.` : "Every active product has a commerce URL for partner Buy Now handoff.",
      status: missingProductUrls ? "warn" as const : "pass" as const,
    },
    {
      id: "attribution-contract",
      label: "Attribution contract",
      detail: `${placements.length} partner placements include data-medium="syndication" plus source, campaign and placement labels.`,
      status: "pass" as const,
    },
    {
      id: "install-readiness",
      label: "Install readiness",
      detail: `${placements.filter((item) => item.installReport.canInstall).length}/${placements.length} partner placements are ready to send.`,
      status: placements.some((item) => !item.installReport.canInstall) ? "fail" as const : "pass" as const,
    },
  ];
}

function formatPacket(report: Omit<SyndicationReport, "packet">) {
  return [
    "Findly partner syndication packet",
    "=================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Install-ready placements: ${report.summary.installReady}/${report.summary.placements}`,
    `Partner traffic: ${report.summary.totalViews} views · ${report.summary.totalClicks} clicks · ${formatCurrency(report.summary.assistedValue)} assisted value`,
    "",
    "Partner acceptance criteria",
    ...report.placements.flatMap((placement) => [
      "",
      `${placement.name} — ${placement.statusLabel}`,
      `Partner type: ${placement.partnerType}`,
      `Objective: ${placement.objective}`,
      `Target pages: ${placement.targetPages}`,
      `Experience: ${widgetExperienceLabel(placement.experience)} (${placement.mode})`,
      `Attribution: medium=syndication, source=${placement.source}, campaign=${placement.campaign}, placement=${placement.placement}`,
      `Public URL: ${placement.publicUrl}`,
      "Snippet:",
      placement.snippet,
      "Acceptance:",
      ...placement.acceptanceCriteria.map((item) => `- ${item}`),
      "Data policy:",
      ...placement.dataPolicy.map((item) => `- ${item}`),
    ]),
    "",
    "Governance checks",
    ...report.governance.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),
  ].join("\n");
}

export function buildSyndicationReport({ origin, settings, products, quizzes, configurators, events }: { origin: string; settings: WidgetSettings; products: Product[]; quizzes: Quiz[]; configurators: Configurator[]; events: AnalyticsEvent[] }): SyndicationReport {
  const cleanedOrigin = cleanOrigin(origin);
  const finder = quizzes.find((quiz) => quiz.published) || quizzes[0];
  const configurator = configurators.find((item) => item.published) || configurators[0];
  const placements = templates.map((template) => {
    const id = idForTemplate(template, finder, configurator);
    const config = configForTemplate(template, cleanedOrigin, settings, id);
    const snippet = buildWidgetSnippet(config);
    const installReport = buildWidgetInstallReport(config);
    const metrics = metricsForEvents(placementEvents(events, template), products);
    const status = statusForPlacement(installReport, metrics);
    const publicUrl = id ? `${cleanedOrigin}/${publicPath(template.experience)}/${id}` : `${cleanedOrigin}${installReport.targetPath}`;
    return {
      ...template,
      campaign: partnerCampaign(template),
      status,
      statusLabel: statusLabel(status),
      publicUrl,
      snippet,
      installReport,
      metrics,
      acceptanceCriteria: acceptanceCriteria(template),
      qa: qaForPlacement(template, installReport, metrics),
      dataPolicy: dataPolicyForPlacement(template),
      nextAction: nextActionForPlacement(template, status, metrics, installReport),
    };
  });
  const installReady = placements.filter((placement) => placement.installReport.canInstall).length;
  const activePartners = placements.filter((placement) => placement.status === "learning" || placement.status === "live").length;
  const blockedPlacements = placements.filter((placement) => placement.status === "blocked").length;
  const totalViews = placements.reduce((sum, placement) => sum + placement.metrics.views, 0);
  const totalClicks = placements.reduce((sum, placement) => sum + placement.metrics.clicks, 0);
  const assistedValue = placements.reduce((sum, placement) => sum + placement.metrics.clickValue, 0);
  const score = Math.round((installReady / Math.max(1, placements.length)) * 48 + (activePartners / Math.max(1, placements.length)) * 32 + Math.min(20, totalViews ? 10 + totalClicks * 2 : 0));
  const status: SyndicationStatus = blockedPlacements ? "blocked" : activePartners ? totalClicks > 0 ? "live" : "learning" : "ready";
  const baseReport = {
    status,
    score,
    summary: {
      placements: placements.length,
      installReady,
      activePartners,
      blockedPlacements,
      totalViews,
      totalClicks,
      assistedValue,
    },
    placements,
    recommendedPlacement: placements.find((placement) => placement.status === "blocked") || placements.find((placement) => placement.status === "ready") || placements[0],
    governance: governance(placements, products),
  };
  return { ...baseReport, packet: formatPacket(baseReport) };
}
