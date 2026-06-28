import { buildLaunchChannelReport, type LaunchChannel } from "./launch-channels";
import type { AnalyticsEvent, Configurator, Quiz, WidgetSettings } from "@/lib/types";
import { widgetExperienceLabel } from "@/lib/widget-snippet";

export type StorefrontSandboxStatus = "blocked" | "ready" | "verified";

export type StorefrontSandboxCase = {
  id: string;
  title: string;
  channelName: string;
  placement: string;
  experienceLabel: string;
  mode: "modal" | "inline";
  publicUrl: string;
  snippet: string;
  storefrontArea: string;
  shopperPrompt: string;
  status: StorefrontSandboxStatus;
  statusLabel: string;
  telemetry: {
    views: number;
    starts: number;
    completions: number;
    recommendations: number;
    clicks: number;
  };
  expectedEvents: Array<{
    event: AnalyticsEvent["event_type"];
    purpose: string;
  }>;
  acceptanceCriteria: string[];
  qaSteps: string[];
  risks: string[];
};

export type StorefrontSandboxReport = {
  status: StorefrontSandboxStatus;
  score: number;
  summary: {
    cases: number;
    ready: number;
    verified: number;
    blocked: number;
    expectedEvents: number;
  };
  cases: StorefrontSandboxCase[];
  recommendedCase?: StorefrontSandboxCase;
  packet: string;
};

function pageArea(channelId: string) {
  if (channelId === "homepage-finder") return "Homepage hero";
  if (channelId === "category-inline-search") return "Category grid";
  if (channelId === "pdp-configurator") return "Product detail page";
  if (channelId === "support-advisor") return "Help drawer";
  return "Storefront placement";
}

function shopperPrompt(channelId: string) {
  if (channelId === "homepage-finder") return "I’m new here and need help choosing the right product.";
  if (channelId === "category-inline-search") return "I know the outcome I want, not the exact product name.";
  if (channelId === "pdp-configurator") return "I’m comparing bundle choices and want to avoid incompatible options.";
  if (channelId === "support-advisor") return "I have a vague request and would normally ask support.";
  return "I want product guidance before buying.";
}

function expectedEvents(channel: LaunchChannel): StorefrontSandboxCase["expectedEvents"] {
  const base: StorefrontSandboxCase["expectedEvents"] = [
    { event: "widget_view", purpose: "Proves the widget frame/script loaded with channel attribution." },
    { event: "quiz_start", purpose: "Proves the shopper intentionally started the guided experience." },
    { event: "quiz_complete", purpose: "Proves the journey reached a recommendation or validated configuration." },
  ];
  if (channel.experience !== "configurator") base.push({ event: "product_recommended", purpose: "Proves deterministic product ranking created surfaced products." });
  base.push({ event: "buy_click", purpose: "Proves product or bundle CTA attribution reaches Analytics." });
  return base;
}

function statusForChannel(channel: LaunchChannel): StorefrontSandboxStatus {
  if (!channel.installReport.canInstall) return "blocked";
  if (channel.metrics.views && (channel.metrics.completions || channel.metrics.clicks)) return "verified";
  return "ready";
}

function statusLabel(status: StorefrontSandboxStatus) {
  if (status === "verified") return "QA verified";
  if (status === "ready") return "Ready for QA";
  return "Blocked";
}

function risksForChannel(channel: LaunchChannel, status: StorefrontSandboxStatus) {
  const risks: string[] = [];
  if (status === "blocked") {
    risks.push(...channel.installReport.checks.filter((check) => check.severity === "blocker").map((check) => check.detail));
  }
  if (status === "ready") {
    risks.push("No completed attributed QA journey has been captured for this placement yet.");
  }
  if (!channel.metrics.clicks) {
    risks.push("Buy-click telemetry has not been proven for this channel.");
  }
  return risks;
}

function acceptanceCriteria(channel: LaunchChannel) {
  return [
    `${widgetExperienceLabel(channel.experience)} loads at ${channel.publicUrl}.`,
    `Snippet includes data-source="${channel.source}", data-campaign="${channel.campaign}" and data-placement="${channel.placement}".`,
    "Widget uses the saved Sellentum brand color, title and welcome copy.",
    "A complete shopper journey records widget_view, quiz_start, quiz_complete and buy_click where applicable.",
    "Analytics shows the expected source/campaign/placement labels after the QA run.",
  ];
}

function qaSteps(channel: LaunchChannel) {
  return [
    `Paste the snippet into a staging ${pageArea(channel.id).toLowerCase()} container, or use the sandbox preview before touching a live theme.`,
    channel.mode === "modal" ? "Click the floating launcher and confirm the iframe lazy-loads." : "Confirm the inline iframe appears in the intended page slot without layout overflow.",
    "Complete one realistic shopper journey using the suggested prompt.",
    "Click the final product or bundle CTA.",
    "Open Analytics and confirm the event sequence includes the channel attribution labels.",
  ];
}

function caseFromChannel(channel: LaunchChannel): StorefrontSandboxCase {
  const status = statusForChannel(channel);
  return {
    id: channel.id,
    title: `${pageArea(channel.id)} QA`,
    channelName: channel.name,
    placement: channel.placement,
    experienceLabel: widgetExperienceLabel(channel.experience),
    mode: channel.mode,
    publicUrl: channel.publicUrl,
    snippet: channel.snippet,
    storefrontArea: pageArea(channel.id),
    shopperPrompt: shopperPrompt(channel.id),
    status,
    statusLabel: statusLabel(status),
    telemetry: {
      views: channel.metrics.views,
      starts: channel.metrics.starts,
      completions: channel.metrics.completions,
      recommendations: channel.metrics.recommendations,
      clicks: channel.metrics.clicks,
    },
    expectedEvents: expectedEvents(channel),
    acceptanceCriteria: acceptanceCriteria(channel),
    qaSteps: qaSteps(channel),
    risks: risksForChannel(channel, status),
  };
}

function formatPacket(cases: StorefrontSandboxCase[]) {
  return [
    "Sellentum storefront QA sandbox packet",
    "===================================",
    "",
    ...cases.flatMap((item) => [
      `${item.title} — ${item.statusLabel}`,
      `Placement: ${item.placement}`,
      `Experience: ${item.experienceLabel} (${item.mode})`,
      `Preview: ${item.publicUrl}`,
      `Shopper prompt: ${item.shopperPrompt}`,
      "Expected events:",
      ...item.expectedEvents.map((event) => `- ${event.event}: ${event.purpose}`),
      "Acceptance criteria:",
      ...item.acceptanceCriteria.map((criterion) => `- ${criterion}`),
      "Snippet:",
      item.snippet,
      "",
    ]),
  ].join("\n");
}

export function buildStorefrontSandboxReport({
  origin,
  settings,
  finders,
  configurators,
  events,
}: {
  origin: string;
  settings: WidgetSettings;
  finders: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
}): StorefrontSandboxReport {
  const channelReport = buildLaunchChannelReport({ origin, settings, finders, configurators, events });
  const cases = channelReport.channels.map(caseFromChannel);
  const ready = cases.filter((item) => item.status === "ready").length;
  const verified = cases.filter((item) => item.status === "verified").length;
  const blocked = cases.filter((item) => item.status === "blocked").length;
  const expectedEventCount = cases.reduce((sum, item) => sum + item.expectedEvents.length, 0);
  const score = Math.round((verified / Math.max(1, cases.length)) * 55 + ((ready + verified) / Math.max(1, cases.length)) * 35 + (blocked ? 0 : 10));
  const status: StorefrontSandboxStatus = blocked ? "blocked" : verified ? "verified" : "ready";

  return {
    status,
    score,
    summary: {
      cases: cases.length,
      ready,
      verified,
      blocked,
      expectedEvents: expectedEventCount,
    },
    cases,
    recommendedCase: cases.find((item) => item.status === "blocked") || cases.find((item) => item.status === "ready") || cases[0],
    packet: formatPacket(cases),
  };
}
