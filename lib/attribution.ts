import { analyticsEventSessionId, countAnalyticsEvents, stageRate } from "./analytics";
import type { AnalyticsEvent } from "@/lib/types";

export type AttributionStatus = "empty" | "needs-labels" | "learning" | "actionable";
export type AttributionActionSeverity = "critical" | "watch" | "info" | "win";

export type AttributionMetadata = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  findly_source?: string;
  findly_medium?: string;
  findly_campaign?: string;
  findly_content?: string;
  findly_term?: string;
  findly_placement?: string;
  findly_page_url?: string;
  findly_page_title?: string;
  findly_referrer?: string;
  findly_embed_mode?: string;
  findly_widget_experience?: string;
  findly_launcher_position?: string;
};

export type AttributionChannel = {
  id: string;
  label: string;
  source: string;
  medium: string;
  campaign: string;
  placement: string;
  pageUrl: string;
  pageTitle: string;
  sessions: number;
  events: number;
  views: number;
  starts: number;
  completions: number;
  recommendations: number;
  clicks: number;
  startRate: number;
  completionRate: number;
  clickRate: number;
  clickThroughRate: number;
  score: number;
  recommendation: string;
};

export type AttributionAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  severity: AttributionActionSeverity;
};

export type AttributionReport = {
  status: AttributionStatus;
  summary: {
    events: number;
    attributedEvents: number;
    unattributedEvents: number;
    attributionRate: number;
    sources: number;
    campaigns: number;
    placements: number;
    pages: number;
    bestSource: string;
    bestConversionRate: number;
  };
  channels: AttributionChannel[];
  campaigns: AttributionChannel[];
  placements: AttributionChannel[];
  actions: AttributionAction[];
};

const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "findly_source",
  "findly_medium",
  "findly_campaign",
  "findly_content",
  "findly_term",
  "findly_placement",
  "findly_page_url",
  "findly_page_title",
  "findly_referrer",
  "findly_embed_mode",
  "findly_widget_experience",
  "findly_launcher_position",
] as const;

function cleanText(value: unknown, fallback = "", max = 160) {
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/\s+/g, " ").slice(0, max) || fallback;
}

function cleanUrl(value: unknown) {
  const text = cleanText(value, "", 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.hash = "";
    return url.toString().slice(0, 500);
  } catch {
    return text.startsWith("/") ? text.slice(0, 500) : "";
  }
}

function firstText(metadata: Record<string, unknown> | undefined, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = cleanText(metadata?.[key]);
    if (value) return value;
  }
  return fallback;
}

function eventHasAttribution(event: AnalyticsEvent) {
  return attributionKeys.some((key) => cleanText(event.metadata?.[key]));
}

function attributionParts(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  const source = firstText(metadata, ["utm_source", "findly_source"], "Unattributed");
  const medium = firstText(metadata, ["utm_medium", "findly_medium"], source === "Unattributed" ? "unknown" : "embed");
  const campaign = firstText(metadata, ["utm_campaign", "findly_campaign"], "Unlabelled campaign");
  const placement = firstText(metadata, ["findly_placement", "utm_content", "findly_content"], "Unlabelled placement");
  const pageUrl = cleanUrl(metadata.findly_page_url) || "Unknown page";
  const pageTitle = firstText(metadata, ["findly_page_title"], pageUrl === "Unknown page" ? "Unknown page" : "");
  return { source, medium, campaign, placement, pageUrl, pageTitle };
}

function channelKey(parts: ReturnType<typeof attributionParts>) {
  return [parts.source, parts.medium, parts.campaign, parts.placement, parts.pageUrl].join("::");
}

function action(id: string, title: string, detail: string, evidence: string, recommendation: string, severity: AttributionActionSeverity): AttributionAction {
  return { id, title, detail, evidence, recommendation, severity };
}

function buildChannel(events: AnalyticsEvent[], parts: ReturnType<typeof attributionParts>, id: string): AttributionChannel {
  const sessions = new Set(events.map(analyticsEventSessionId)).size;
  const views = countAnalyticsEvents(events, "widget_view");
  const starts = countAnalyticsEvents(events, "quiz_start");
  const completions = countAnalyticsEvents(events, "quiz_complete");
  const recommendations = countAnalyticsEvents(events, "product_recommended");
  const clicks = countAnalyticsEvents(events, "buy_click");
  const startRate = stageRate(starts, views || sessions);
  const completionRate = stageRate(completions, starts);
  const clickRate = stageRate(clicks, completions);
  const clickThroughRate = stageRate(clicks, views || sessions);
  const score = Math.round(Math.min(100, clickThroughRate * 0.55 + completionRate * 0.25 + startRate * 0.2));
  const label = [parts.source, parts.campaign !== "Unlabelled campaign" ? parts.campaign : "", parts.placement !== "Unlabelled placement" ? parts.placement : ""].filter(Boolean).join(" · ");
  const recommendation = !views
    ? "Capture at least one widget view from this placement before judging performance."
    : startRate < 35
      ? "Test stronger launcher copy or move this widget closer to high-intent PDP/category sections."
      : completionRate < 45
        ? "Reduce friction in the first question/search prompt or tighten the promised outcome."
        : clickRate < 25
          ? "Review product URLs, prices, images and recommendation explanations for this traffic source."
          : "This channel is producing healthy shopper intent; consider scaling similar placements.";

  return {
    id,
    label: label || parts.pageTitle || parts.pageUrl,
    ...parts,
    sessions,
    events: events.length,
    views,
    starts,
    completions,
    recommendations,
    clicks,
    startRate,
    completionRate,
    clickRate,
    clickThroughRate,
    score,
    recommendation,
  };
}

function aggregateChannels(events: AnalyticsEvent[], dimension: "campaign" | "placement") {
  const groups = new Map<string, { parts: ReturnType<typeof attributionParts>; events: AnalyticsEvent[] }>();
  for (const event of events) {
    const parts = attributionParts(event);
    const key = dimension === "campaign"
      ? [parts.source, parts.medium, parts.campaign].join("::")
      : [parts.source, parts.medium, parts.placement].join("::");
    const existing = groups.get(key);
    if (existing) existing.events.push(event);
    else groups.set(key, { parts: dimension === "campaign" ? { ...parts, placement: "All placements", pageUrl: "All pages", pageTitle: "All pages" } : { ...parts, campaign: "All campaigns", pageUrl: "All pages", pageTitle: "All pages" }, events: [event] });
  }
  return [...groups.entries()]
    .map(([id, group]) => buildChannel(group.events, group.parts, `${dimension}:${id}`))
    .sort((a, b) => b.clicks - a.clicks || b.completions - a.completions || b.views - a.views || a.label.localeCompare(b.label));
}

export function buildAttributionReport(events: AnalyticsEvent[]): AttributionReport {
  const attributedEvents = events.filter(eventHasAttribution);
  const grouped = new Map<string, { parts: ReturnType<typeof attributionParts>; events: AnalyticsEvent[] }>();
  for (const event of events) {
    const parts = attributionParts(event);
    const key = channelKey(parts);
    const existing = grouped.get(key);
    if (existing) existing.events.push(event);
    else grouped.set(key, { parts, events: [event] });
  }

  const channels = [...grouped.entries()]
    .map(([id, group]) => buildChannel(group.events, group.parts, id))
    .sort((a, b) => b.clicks - a.clicks || b.completions - a.completions || b.views - a.views || a.label.localeCompare(b.label));
  const campaigns = aggregateChannels(events, "campaign");
  const placements = aggregateChannels(events, "placement");
  const sources = new Set(channels.map((channel) => channel.source).filter((source) => source !== "Unattributed"));
  const campaignSet = new Set(channels.map((channel) => channel.campaign).filter((campaign) => campaign !== "Unlabelled campaign"));
  const placementSet = new Set(channels.map((channel) => channel.placement).filter((placement) => placement !== "Unlabelled placement"));
  const pages = new Set(channels.map((channel) => channel.pageUrl).filter((page) => page !== "Unknown page"));
  const top = channels[0];
  const attributionRate = events.length ? Math.round(attributedEvents.length / events.length * 100) : 0;
  const unattributedEvents = events.length - attributedEvents.length;
  const actions: AttributionAction[] = [];

  if (!events.length) {
    actions.push(action("capture-first-attribution", "Capture the first attributed widget session", "No traffic is available in this analytics filter yet.", "0 events inspected.", "Install the latest snippet on a staging page and complete a QA journey.", "watch"));
  } else if (attributionRate < 70) {
    actions.push(action("label-widget-traffic", "Label more widget traffic", "A large share of events lacks source, campaign, placement or page context.", `${unattributedEvents}/${events.length} events are unattributed.`, "Re-copy the latest snippet or add data-campaign/data-placement labels to current installs.", "critical"));
  }

  const weakStart = channels.find((channel) => channel.views >= 3 && channel.startRate < 35);
  if (weakStart) actions.push(action("fix-low-start-placement", "Improve a low-start placement", `${weakStart.label} gets visibility but too few shoppers start.`, `${weakStart.views} views · ${Math.round(weakStart.startRate)}% start rate.`, weakStart.recommendation, "watch"));

  const weakClick = channels.find((channel) => channel.completions >= 2 && channel.clickRate < 20);
  if (weakClick) actions.push(action("fix-low-click-source", "Fix a low-click traffic source", `${weakClick.label} produces results but weak product-click intent.`, `${weakClick.completions} completions · ${Math.round(weakClick.clickRate)}% click rate.`, weakClick.recommendation, "watch"));

  if (top && top.clicks > 0) actions.push(action("scale-winning-source", "Scale the strongest source", `${top.label} is currently your best attributed path to product clicks.`, `${top.clicks} buy clicks · ${Math.round(top.clickThroughRate)}% view-to-click rate.`, "Use this source/placement pattern for the next launch packet or PDP/category rollout.", "win"));

  const status: AttributionStatus = !events.length ? "empty" : attributionRate < 70 ? "needs-labels" : top && top.clicks > 0 ? "actionable" : "learning";

  return {
    status,
    summary: {
      events: events.length,
      attributedEvents: attributedEvents.length,
      unattributedEvents,
      attributionRate,
      sources: sources.size,
      campaigns: campaignSet.size,
      placements: placementSet.size,
      pages: pages.size,
      bestSource: top?.source || "None yet",
      bestConversionRate: top?.clickThroughRate || 0,
    },
    channels,
    campaigns,
    placements,
    actions,
  };
}

function paramValue(params: URLSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(params.get(key));
    if (value) return value;
  }
  return "";
}

export function getAttributionMetadata(): AttributionMetadata {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const source = paramValue(params, ["utm_source", "findly_source"]);
  const medium = paramValue(params, ["utm_medium", "findly_medium"]);
  const campaign = paramValue(params, ["utm_campaign", "findly_campaign"]);
  const content = paramValue(params, ["utm_content", "findly_content"]);
  const term = paramValue(params, ["utm_term", "findly_term"]);
  const pageUrl = cleanUrl(paramValue(params, ["findly_page_url"])) || cleanUrl(document.referrer) || cleanUrl(window.location.href);
  const metadata: AttributionMetadata = {
    ...(source ? { utm_source: source, findly_source: source } : {}),
    ...(medium ? { utm_medium: medium, findly_medium: medium } : {}),
    ...(campaign ? { utm_campaign: campaign, findly_campaign: campaign } : {}),
    ...(content ? { utm_content: content, findly_content: content } : {}),
    ...(term ? { utm_term: term, findly_term: term } : {}),
    ...(paramValue(params, ["findly_placement"]) ? { findly_placement: paramValue(params, ["findly_placement"]) } : {}),
    ...(pageUrl ? { findly_page_url: pageUrl } : {}),
    ...(paramValue(params, ["findly_page_title"]) ? { findly_page_title: paramValue(params, ["findly_page_title"]) } : {}),
    ...(paramValue(params, ["findly_referrer"]) || document.referrer ? { findly_referrer: cleanUrl(paramValue(params, ["findly_referrer"])) || cleanUrl(document.referrer) } : {}),
    ...(paramValue(params, ["findly_embed_mode"]) ? { findly_embed_mode: paramValue(params, ["findly_embed_mode"]) } : {}),
    ...(paramValue(params, ["findly_widget_experience"]) ? { findly_widget_experience: paramValue(params, ["findly_widget_experience"]) } : {}),
    ...(paramValue(params, ["findly_launcher_position"]) ? { findly_launcher_position: paramValue(params, ["findly_launcher_position"]) } : {}),
  };
  return metadata;
}
