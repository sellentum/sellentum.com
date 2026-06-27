import { buildAnalyticsSnapshot } from "./analytics";
import { buildLaunchExperienceCards, type LaunchExperienceCard } from "./experience-launch";
import type { AnalyticsEvent, Configurator, Quiz, WidgetSettings } from "@/lib/types";
import { getEventExperienceType } from "@/lib/utils";

export type ExperienceRegistryStatus = "live" | "learning" | "ready" | "blocked";
export type ExperienceRegistryActionPriority = "critical" | "high" | "medium" | "low";

export type ExperienceRegistrySurface = {
  id: string;
  experience: LaunchExperienceCard["experience"];
  label: string;
  name: string;
  purpose: string;
  source: LaunchExperienceCard["source"];
  sourceId?: string;
  mode: LaunchExperienceCard["mode"];
  status: ExperienceRegistryStatus;
  statusLabel: string;
  publicUrl: string;
  targetPath: string;
  snippet: string;
  metrics: {
    sessions: number;
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
    priority: ExperienceRegistryActionPriority;
  };
};

export type ExperienceRegistryReport = {
  status: ExperienceRegistryStatus;
  score: number;
  summary: {
    surfaces: number;
    ready: number;
    live: number;
    blocked: number;
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    totalClicks: number;
  };
  surfaces: ExperienceRegistrySurface[];
  recommendedSurface?: ExperienceRegistrySurface;
  packet: string;
};

function rate(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function metadataString(event: AnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function surfaceEvents(events: AnalyticsEvent[], card: LaunchExperienceCard) {
  return events.filter((event) => {
    const type = getEventExperienceType(event);
    if (type !== card.experience) return false;
    const experienceId = metadataString(event, "experience_id");
    if (!card.sourceId) return true;
    return event.quiz_id === card.sourceId || experienceId === card.sourceId || experienceId === card.slug || experienceId === card.id;
  });
}

function metricsForEvents(events: AnalyticsEvent[]): ExperienceRegistrySurface["metrics"] {
  const snapshot = buildAnalyticsSnapshot(events);
  return {
    sessions: snapshot.sessions,
    views: snapshot.widget_view,
    starts: snapshot.quiz_start,
    completions: snapshot.quiz_complete,
    recommendations: snapshot.product_recommended,
    clicks: snapshot.buy_click,
    startRate: rate(snapshot.quiz_start, snapshot.widget_view),
    completionRate: rate(snapshot.quiz_complete, snapshot.quiz_start || snapshot.widget_view),
    clickRate: rate(snapshot.buy_click, snapshot.quiz_complete || snapshot.product_recommended || snapshot.widget_view),
  };
}

function qaForCard(card: LaunchExperienceCard, metrics: ExperienceRegistrySurface["metrics"]) {
  const checks = card.installReport.checks.map((check) => ({
    id: `install-${check.id}`,
    label: check.label,
    detail: check.detail,
    status: check.severity === "pass" ? "pass" as const : check.severity === "warning" ? "warn" as const : "fail" as const,
  }));

  checks.push({
    id: "publish-state",
    label: "Publish state",
    detail: card.status === "ready" ? `${card.name || card.label} is published and addressable at ${card.publicUrl}.` : card.statusLabel,
    status: card.status === "ready" ? "pass" as const : "fail" as const,
  });
  checks.push({
    id: "telemetry",
    label: "Runtime telemetry",
    detail: metrics.views ? `${metrics.views} views, ${metrics.starts} starts, ${metrics.completions} completions and ${metrics.clicks} clicks captured.` : "No runtime telemetry captured for this surface yet.",
    status: metrics.clicks || metrics.completions ? "pass" as const : metrics.views || metrics.starts ? "warn" as const : "warn" as const,
  });

  return checks;
}

function statusForSurface(card: LaunchExperienceCard, metrics: ExperienceRegistrySurface["metrics"]): ExperienceRegistryStatus {
  if (!card.installReport.canInstall || card.status !== "ready") return "blocked";
  if (metrics.clicks > 0 || metrics.completions >= 2) return "live";
  if (metrics.views > 0 || metrics.starts > 0 || metrics.recommendations > 0) return "learning";
  return "ready";
}

function statusLabel(status: ExperienceRegistryStatus) {
  if (status === "live") return "Live";
  if (status === "learning") return "Learning";
  if (status === "ready") return "Ready to install";
  return "Blocked";
}

function nextAction(card: LaunchExperienceCard, status: ExperienceRegistryStatus, metrics: ExperienceRegistrySurface["metrics"]): ExperienceRegistrySurface["nextAction"] {
  if (status === "blocked") {
    const blocker = card.installReport.checks.find((check) => check.severity === "blocker");
    return {
      title: "Resolve publish or install blockers",
      detail: blocker?.detail || card.statusLabel,
      href: card.experience === "configurator" ? "/dashboard/configurators" : "/dashboard/quizzes",
      label: "Open builder",
      priority: "critical",
    };
  }
  if (status === "ready") {
    return {
      title: "Install and run a staging QA journey",
      detail: "The snippet is ready, but this surface has not captured widget telemetry yet.",
      href: "/dashboard/storefront-sandbox",
      label: "Run QA",
      priority: "high",
    };
  }
  if (status === "learning" && !metrics.clicks) {
    return {
      title: "Collect a completed recommendation and buy-click path",
      detail: "The surface is receiving traffic, but the commercial proof loop is not complete yet.",
      href: "/dashboard/analytics",
      label: "Open analytics",
      priority: "medium",
    };
  }
  return {
    title: "Use this surface as a rollout candidate",
    detail: "This experience has install readiness, runtime telemetry and conversion proof.",
    href: "/dashboard/release-center",
    label: "Open release",
    priority: "low",
  };
}

function scoreForStatus(status: ExperienceRegistryStatus) {
  if (status === "live") return 100;
  if (status === "learning") return 78;
  if (status === "ready") return 62;
  return 20;
}

function packet(report: Omit<ExperienceRegistryReport, "packet">) {
  return [
    "Findly Experience Registry packet",
    "=================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Surfaces: ${report.summary.surfaces} · Live: ${report.summary.live} · Ready: ${report.summary.ready} · Blocked: ${report.summary.blocked}`,
    "",
    "Experience surfaces",
    ...report.surfaces.map((surface) => [
      `- [${surface.status.toUpperCase()}] ${surface.label}: ${surface.name}`,
      `  URL: ${surface.publicUrl}`,
      `  Metrics: ${surface.metrics.views} views · ${surface.metrics.completions} completions · ${surface.metrics.clicks} clicks`,
      `  Next: ${surface.nextAction.title}`,
    ].join("\n")),
    "",
    "Recommended rollout",
    report.recommendedSurface ? `${report.recommendedSurface.label}: ${report.recommendedSurface.publicUrl}` : "No rollout candidate yet.",
  ].join("\n");
}

export function buildExperienceRegistry({
  origin,
  settings,
  quizzes,
  configurators,
  events = [],
}: {
  origin: string;
  settings: WidgetSettings;
  quizzes: Quiz[];
  configurators: Configurator[];
  events?: AnalyticsEvent[];
}): ExperienceRegistryReport {
  const cards = buildLaunchExperienceCards({ origin, settings, finders: quizzes, configurators, mode: "modal" });
  const surfaces = cards.map((card) => {
    const metrics = metricsForEvents(surfaceEvents(events, card));
    const status = statusForSurface(card, metrics);
    const qa = qaForCard(card, metrics);
    return {
      id: `${card.experience}:${card.sourceId || "missing"}`,
      experience: card.experience,
      label: card.label,
      name: card.name || card.statusLabel,
      purpose: card.purpose,
      source: card.source,
      sourceId: card.sourceId,
      mode: card.mode,
      status,
      statusLabel: statusLabel(status),
      publicUrl: card.publicUrl,
      targetPath: card.targetPath,
      snippet: card.snippet,
      metrics,
      qa,
      nextAction: nextAction(card, status, metrics),
    } satisfies ExperienceRegistrySurface;
  });

  const status: ExperienceRegistryStatus = surfaces.some((surface) => surface.status === "live")
    ? "live"
    : surfaces.some((surface) => surface.status === "learning")
      ? "learning"
      : surfaces.some((surface) => surface.status === "ready")
        ? "ready"
        : "blocked";
  const score = Math.round(surfaces.reduce((sum, surface) => sum + scoreForStatus(surface.status), 0) / Math.max(1, surfaces.length));
  const recommendedSurface = surfaces
    .filter((surface) => surface.status !== "blocked")
    .sort((a, b) => scoreForStatus(b.status) - scoreForStatus(a.status) || b.metrics.clicks - a.metrics.clicks || b.metrics.completions - a.metrics.completions)[0];
  const baseReport: Omit<ExperienceRegistryReport, "packet"> = {
    status,
    score,
    summary: {
      surfaces: surfaces.length,
      ready: surfaces.filter((surface) => surface.status === "ready").length,
      live: surfaces.filter((surface) => surface.status === "live").length,
      blocked: surfaces.filter((surface) => surface.status === "blocked").length,
      totalViews: surfaces.reduce((sum, surface) => sum + surface.metrics.views, 0),
      totalStarts: surfaces.reduce((sum, surface) => sum + surface.metrics.starts, 0),
      totalCompletions: surfaces.reduce((sum, surface) => sum + surface.metrics.completions, 0),
      totalClicks: surfaces.reduce((sum, surface) => sum + surface.metrics.clicks, 0),
    },
    surfaces,
    recommendedSurface,
  };

  return { ...baseReport, packet: packet(baseReport) };
}
