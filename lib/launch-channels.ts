import type { AnalyticsEvent, Configurator, ExperienceType, Quiz, WidgetSettings } from "@/lib/types";
import { buildWidgetInstallReport, buildWidgetSnippet, type WidgetEmbedExperience, type WidgetEmbedMode, type WidgetLauncherPosition, type WidgetInstallReport, type WidgetSnippetConfig, widgetExperienceLabel } from "@/lib/widget-snippet";

export type LaunchChannelStatus = "blocked" | "ready" | "learning" | "live";
export type LaunchChannelPriority = "critical" | "high" | "medium" | "low";

export type LaunchChannel = {
  id: string;
  name: string;
  placement: string;
  source: string;
  campaign: string;
  audience: string;
  targetPages: string;
  experience: WidgetEmbedExperience;
  mode: WidgetEmbedMode;
  label: string;
  objective: string;
  reason: string;
  status: LaunchChannelStatus;
  statusLabel: string;
  snippet: string;
  publicUrl: string;
  installReport: WidgetInstallReport;
  metrics: {
    views: number;
    starts: number;
    completions: number;
    recommendations: number;
    clicks: number;
    startRate: number;
    completionRate: number;
    clickRate: number;
  };
  qa: Array<{
    id: string;
    label: string;
    detail: string;
    status: "pass" | "warn" | "fail";
  }>;
  nextAction: {
    title: string;
    detail: string;
    href: string;
    label: string;
    priority: LaunchChannelPriority;
  };
};

export type LaunchChannelReport = {
  status: LaunchChannelStatus;
  score: number;
  summary: {
    channels: number;
    installReady: number;
    liveChannels: number;
    blockedChannels: number;
    totalViews: number;
    totalClicks: number;
  };
  channels: LaunchChannel[];
  recommendedChannel?: LaunchChannel;
  packet: string;
};

type LaunchChannelTemplate = {
  id: string;
  name: string;
  placement: string;
  source: string;
  campaign: string;
  audience: string;
  targetPages: string;
  experience: WidgetEmbedExperience;
  mode: WidgetEmbedMode;
  label: string;
  objective: string;
  reason: string;
};

const channelTemplates: LaunchChannelTemplate[] = [
  {
    id: "homepage-finder",
    name: "Homepage guided finder",
    placement: "homepage-hero",
    source: "homepage",
    campaign: "findly-homepage-guide",
    audience: "New shoppers who need a quick starting point before browsing the catalog.",
    targetPages: "Homepage hero, top navigation CTA, or campaign landing page",
    experience: "finder",
    mode: "modal",
    label: "Find my match",
    objective: "Start guided journeys from broad discovery traffic.",
    reason: "Best for reducing choice paralysis before shoppers commit to a category.",
  },
  {
    id: "category-inline-search",
    name: "Category semantic search",
    placement: "category-inline",
    source: "category",
    campaign: "findly-category-search",
    audience: "Shoppers already browsing a collection but using benefit or problem language.",
    targetPages: "Collection/category pages, search results pages, buying-guide pages",
    experience: "search",
    mode: "inline",
    label: "Search products",
    objective: "Capture shopper language and route natural queries to catalog-backed products.",
    reason: "Best for collecting zero-party search terms and exposing thin catalog language.",
  },
  {
    id: "pdp-configurator",
    name: "PDP bundle configurator",
    placement: "pdp-bundle",
    source: "pdp",
    campaign: "findly-pdp-configurator",
    audience: "High-intent shoppers comparing variants, accessories, kits or compatibility.",
    targetPages: "Product detail pages, bundle sections, accessories modules",
    experience: "configurator",
    mode: "inline",
    label: "Build my bundle",
    objective: "Increase confidence and average order value with compatible bundles.",
    reason: "Best when products have meaningful options, add-ons or compatibility tradeoffs.",
  },
  {
    id: "support-advisor",
    name: "Support-style advisor",
    placement: "help-drawer",
    source: "support",
    campaign: "findly-advisor-help",
    audience: "Shoppers with vague requests who would otherwise contact support or bounce.",
    targetPages: "Help pages, floating help launcher, PDP lower section",
    experience: "assistant",
    mode: "modal",
    label: "Ask for advice",
    objective: "Answer open-ended needs with deterministic recommendations and clarifying questions.",
    reason: "Best for shopper requests that start as natural language instead of quiz answers.",
  },
];

function originClean(origin: string) {
  return (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
}

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function metadataString(event: AnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function eventExperience(event: AnalyticsEvent): ExperienceType | "" {
  const value = event.metadata?.experience_type;
  return value === "finder" || value === "assistant" || value === "search" || value === "configurator" ? value : "";
}

function channelEvents(events: AnalyticsEvent[], channel: LaunchChannelTemplate) {
  return events.filter((event) => {
    const campaign = metadataString(event, "findly_campaign");
    const placement = metadataString(event, "findly_placement");
    const source = metadataString(event, "findly_source");
    const experience = eventExperience(event);
    return campaign === channel.campaign || placement === channel.placement || (source === channel.source && (!experience || experience === channel.experience));
  });
}

function metricsForEvents(events: AnalyticsEvent[]) {
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
    startRate: rate(starts, views),
    completionRate: rate(completions, starts || views),
    clickRate: rate(clicks, completions || recommendations || views),
  };
}

function idForTemplate(template: LaunchChannelTemplate, finder?: Quiz, configurator?: Configurator) {
  return template.experience === "configurator" ? configurator?.id : finder?.id;
}

function publicPathForExperience(experience: WidgetEmbedExperience) {
  if (experience === "assistant") return "assistant";
  if (experience === "configurator") return "configurator";
  if (experience === "search") return "search";
  return "finder";
}

function configForTemplate(template: LaunchChannelTemplate, origin: string, settings: WidgetSettings, id?: string): WidgetSnippetConfig {
  const position: WidgetLauncherPosition = settings.launcher_position === "bottom-left" ? "left" : "right";
  return {
    origin,
    experience: template.experience,
    mode: template.mode,
    id,
    color: settings.primary_color,
    label: template.label || settings.button_text,
    position,
    source: template.source,
    medium: "embed",
    campaign: template.campaign,
    placement: template.placement,
  };
}

function qaForChannel(channel: LaunchChannelTemplate, installReport: WidgetInstallReport, metrics: ReturnType<typeof metricsForEvents>) {
  const checks = installReport.checks.map((check) => ({
    id: `install-${check.id}`,
    label: check.label,
    detail: check.detail,
    status: check.severity === "pass" ? "pass" as const : check.severity === "warning" ? "warn" as const : "fail" as const,
  }));
  checks.push({
    id: "first-view",
    label: "First widget view",
    detail: metrics.views ? `${metrics.views} attributed widget view${metrics.views === 1 ? "" : "s"} captured for ${channel.placement}.` : "No attributed widget_view event yet; run a staging QA journey after installing.",
    status: metrics.views ? "pass" : "warn",
  });
  checks.push({
    id: "journey-proof",
    label: "Journey telemetry",
    detail: metrics.starts || metrics.completions || metrics.clicks ? `${metrics.starts} starts, ${metrics.completions} completions and ${metrics.clicks} clicks captured.` : "No start/completion/click journey proof yet.",
    status: metrics.completions || metrics.clicks ? "pass" : metrics.starts ? "warn" : "warn",
  });
  return checks;
}

function statusForChannel(installReport: WidgetInstallReport, metrics: ReturnType<typeof metricsForEvents>): LaunchChannelStatus {
  if (!installReport.canInstall) return "blocked";
  if (metrics.clicks > 0 || metrics.completions >= 3) return "live";
  if (metrics.views > 0 || metrics.starts > 0) return "learning";
  return "ready";
}

function statusLabel(status: LaunchChannelStatus) {
  if (status === "live") return "Live";
  if (status === "learning") return "Learning";
  if (status === "ready") return "Ready to install";
  return "Blocked";
}

function nextActionForChannel(channel: LaunchChannelTemplate, status: LaunchChannelStatus, metrics: ReturnType<typeof metricsForEvents>, installReport: WidgetInstallReport): LaunchChannel["nextAction"] {
  if (!installReport.canInstall) {
    const blocker = installReport.checks.find((check) => check.severity === "blocker");
    return {
      title: "Resolve install blockers",
      detail: blocker?.detail || "Publish/select the required Findly experience before installing this placement.",
      href: channel.experience === "configurator" ? "/dashboard/configurators" : "/dashboard/quizzes",
      label: "Open builder",
      priority: "critical",
    };
  }
  if (status === "ready") {
    return {
      title: "Install on staging and run QA",
      detail: "Paste the snippet into the target page, complete one shopper journey, then confirm attributed widget events arrive.",
      href: "/dashboard/preflight",
      label: "Run preflight",
      priority: "high",
    };
  }
  if (status === "learning" && metrics.completionRate < 35) {
    return {
      title: "Improve early journey completion",
      detail: `Completion is ${metrics.completionRate}%. Review question clarity, launcher placement and recovery paths for this channel.`,
      href: "/dashboard/lab",
      label: "Debug journeys",
      priority: "medium",
    };
  }
  if (status === "live" && metrics.clickRate < 20) {
    return {
      title: "Tune product click-through",
      detail: `Buy-click rate is ${metrics.clickRate}%. Review recommendation explanations and product cards for this placement.`,
      href: "/dashboard/analytics",
      label: "Open analytics",
      priority: "medium",
    };
  }
  return {
    title: "Keep collecting channel data",
    detail: "This placement has enough signal to keep learning. Compare it against the next launch channel before changing rules.",
    href: "/dashboard/analytics",
    label: "Track channel",
    priority: "low",
  };
}

function formatChannelPacket(channels: LaunchChannel[]) {
  return [
    "Findly launch channel packet",
    "============================",
    "",
    ...channels.flatMap((channel) => [
      `${channel.name} — ${channel.statusLabel}`,
      `Objective: ${channel.objective}`,
      `Target pages: ${channel.targetPages}`,
      `Experience: ${widgetExperienceLabel(channel.experience)} (${channel.mode})`,
      `Attribution: source=${channel.source}, campaign=${channel.campaign}, placement=${channel.placement}`,
      `Public URL: ${channel.publicUrl}`,
      "Snippet:",
      channel.snippet,
      "",
    ]),
  ].join("\n");
}

export function buildLaunchChannelReport({ origin, settings, finders, configurators, events }: { origin: string; settings: WidgetSettings; finders: Quiz[]; configurators: Configurator[]; events: AnalyticsEvent[] }): LaunchChannelReport {
  const cleanedOrigin = originClean(origin);
  const finder = finders.find((item) => item.published) || finders[0];
  const configurator = configurators.find((item) => item.published) || configurators[0];
  const channels = channelTemplates.map((template) => {
    const id = idForTemplate(template, finder, configurator);
    const config = configForTemplate(template, cleanedOrigin, settings, id);
    const snippet = buildWidgetSnippet(config);
    const installReport = buildWidgetInstallReport(config);
    const metrics = metricsForEvents(channelEvents(events, template));
    const status = statusForChannel(installReport, metrics);
    const publicUrl = id ? `${cleanedOrigin}/${publicPathForExperience(template.experience)}/${id}` : `${cleanedOrigin}${installReport.targetPath}`;
    return {
      ...template,
      status,
      statusLabel: statusLabel(status),
      snippet,
      publicUrl,
      installReport,
      metrics,
      qa: qaForChannel(template, installReport, metrics),
      nextAction: nextActionForChannel(template, status, metrics, installReport),
    };
  });
  const installReady = channels.filter((channel) => channel.installReport.canInstall).length;
  const liveChannels = channels.filter((channel) => channel.status === "live" || channel.status === "learning").length;
  const blockedChannels = channels.filter((channel) => channel.status === "blocked").length;
  const totalViews = channels.reduce((sum, channel) => sum + channel.metrics.views, 0);
  const totalClicks = channels.reduce((sum, channel) => sum + channel.metrics.clicks, 0);
  const score = Math.round((installReady / Math.max(1, channels.length)) * 45 + (liveChannels / Math.max(1, channels.length)) * 35 + Math.min(20, totalViews ? 12 + totalClicks * 2 : 0));
  const status: LaunchChannelStatus = blockedChannels ? "blocked" : liveChannels ? totalClicks > 0 ? "live" : "learning" : "ready";
  return {
    status,
    score,
    summary: {
      channels: channels.length,
      installReady,
      liveChannels,
      blockedChannels,
      totalViews,
      totalClicks,
    },
    channels,
    recommendedChannel: channels.find((channel) => channel.status === "blocked") || channels.find((channel) => channel.status === "ready") || channels[0],
    packet: formatChannelPacket(channels),
  };
}
