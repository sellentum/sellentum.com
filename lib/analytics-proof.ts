import { analyticsEventSessionId, countAnalyticsEvents } from "@/lib/analytics";
import type { AnalyticsEvent, AnalyticsEventType } from "@/lib/types";
import { getEventExperienceType } from "@/lib/utils";

export type AnalyticsLaunchProofStatus = "empty" | "partial" | "proven";
export type AnalyticsLaunchProofEventStatus = "pass" | "missing";

export type LaunchCriticalAnalyticsEvent = {
  event: Extract<AnalyticsEventType, "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click">;
  label: string;
  description: string;
  action: string;
};

export type AnalyticsLaunchProofEvent = LaunchCriticalAnalyticsEvent & {
  status: AnalyticsLaunchProofEventStatus;
  count: number;
  sessions: number;
  latestAt?: string;
  evidence: string;
};

export type AnalyticsLaunchProofSession = {
  sessionId: string;
  eventCount: number;
  coveredEvents: number;
  startedAt: string;
  completedAt: string;
  experience: string;
  pageUrl: string;
};

export type AnalyticsLaunchProofReport = {
  status: AnalyticsLaunchProofStatus;
  score: number;
  headline: string;
  summary: {
    totalEvents: number;
    requiredEvents: number;
    coveredEvents: number;
    missingEvents: number;
    sessions: number;
    completeSessions: number;
    attributedEvents: number;
    storefrontPages: number;
    experiences: number;
  };
  events: AnalyticsLaunchProofEvent[];
  sessions: AnalyticsLaunchProofSession[];
  missingEvents: AnalyticsLaunchProofEvent[];
  nextAction: string;
  packet: string;
};

export const launchCriticalAnalyticsEvents: LaunchCriticalAnalyticsEvent[] = [
  {
    event: "widget_view",
    label: "Widget loaded",
    description: "Proves the storefront script/iframe was seen by a shopper.",
    action: "Open the installed widget from a storefront or storefront-demo page.",
  },
  {
    event: "quiz_start",
    label: "Journey started",
    description: "Proves the shopper engaged with the guided experience.",
    action: "Click the launcher and answer the first question.",
  },
  {
    event: "quiz_complete",
    label: "Journey completed",
    description: "Proves the shopper reached the recommendation moment.",
    action: "Complete every required question in the experience.",
  },
  {
    event: "product_recommended",
    label: "Recommendation emitted",
    description: "Proves deterministic selection surfaced product results.",
    action: "Finish a path that returns at least one product recommendation.",
  },
  {
    event: "buy_click",
    label: "Buy Now clicked",
    description: "Proves product intent is tracked after recommendations appear.",
    action: "Click a recommended product Buy Now button during QA.",
  },
];

export const launchAnalyticsProofCriteria = [
  "All five launch-critical events are present: widget_view, quiz_start, quiz_complete, product_recommended and buy_click.",
  "At least one uninterrupted session contains every launch-critical event under the same session ID.",
  "The session includes storefront attribution such as page URL, source, campaign or placement.",
  "The proof packet is copied into the launch record before judging conversion performance.",
];

function readableDate(value?: string) {
  if (!value) return "Not captured yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function metadataText(event: AnalyticsEvent, key: string) {
  const value = event.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function eventPageUrl(event: AnalyticsEvent) {
  return metadataText(event, "sellentum_page_url") || metadataText(event, "page_url") || metadataText(event, "referrer") || "";
}

function eventExperienceLabel(event: AnalyticsEvent) {
  const type = getEventExperienceType(event);
  const id = metadataText(event, "experience_id") || event.quiz_id || "unknown";
  return `${type}:${id}`;
}

function hasAttribution(event: AnalyticsEvent) {
  return Boolean(
    metadataText(event, "sellentum_source") ||
    metadataText(event, "sellentum_campaign") ||
    metadataText(event, "sellentum_placement") ||
    eventPageUrl(event),
  );
}

function groupBySession(events: AnalyticsEvent[]) {
  const groups = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    const sessionId = analyticsEventSessionId(event);
    groups.set(sessionId, [...(groups.get(sessionId) || []), event]);
  }
  return [...groups.entries()].map(([sessionId, items]) => ({
    sessionId,
    events: items.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }));
}

function buildSessionProof(events: AnalyticsEvent[]): AnalyticsLaunchProofSession[] {
  return groupBySession(events)
    .map(({ sessionId, events: sessionEvents }) => {
      const first = sessionEvents[0];
      const last = sessionEvents[sessionEvents.length - 1] || first;
      const eventTypes = new Set(sessionEvents.map((event) => event.event_type));
      return {
        sessionId,
        eventCount: sessionEvents.length,
        coveredEvents: launchCriticalAnalyticsEvents.filter((item) => eventTypes.has(item.event)).length,
        startedAt: first?.created_at || "",
        completedAt: last?.created_at || "",
        experience: first ? eventExperienceLabel(first) : "unknown",
        pageUrl: sessionEvents.map(eventPageUrl).find(Boolean) || "No storefront page captured",
      };
    })
    .sort((a, b) => b.coveredEvents - a.coveredEvents || new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

function buildPacket(report: Omit<AnalyticsLaunchProofReport, "packet">) {
  const eventLines = report.events.map((event) => `- ${event.label}: ${event.status.toUpperCase()} (${event.count} events, ${event.sessions} sessions)`);
  const sessionLines = report.sessions.slice(0, 3).map((session) => `- ${session.sessionId}: ${session.coveredEvents}/${report.summary.requiredEvents} events · ${session.experience} · ${session.pageUrl}`);
  return [
    "Sellentum launch analytics proof",
    `Status: ${report.status}`,
    `Score: ${report.score}/100`,
    `Captured events: ${report.summary.totalEvents}`,
    `Sessions: ${report.summary.sessions}`,
    `Complete QA sessions: ${report.summary.completeSessions}`,
    `Attribution evidence: ${report.summary.attributedEvents} events across ${report.summary.storefrontPages} storefront page(s)`,
    "",
    "Launch-critical events:",
    ...eventLines,
    "",
    "Best session evidence:",
    ...(sessionLines.length ? sessionLines : ["- No session evidence captured yet."]),
    "",
    "Proof-ready analytics means:",
    ...launchAnalyticsProofCriteria.map((item) => `- ${item}`),
    "",
    `Next action: ${report.nextAction}`,
  ].join("\n");
}

export function buildAnalyticsLaunchProofReport(events: AnalyticsEvent[]): AnalyticsLaunchProofReport {
  const sessions = buildSessionProof(events);
  const completeSessions = sessions.filter((session) => session.coveredEvents === launchCriticalAnalyticsEvents.length).length;
  const attributedEvents = events.filter(hasAttribution).length;
  const storefrontPages = new Set(events.map(eventPageUrl).filter(Boolean)).size;
  const experiences = new Set(events.map(eventExperienceLabel).filter(Boolean)).size;

  const proofEvents: AnalyticsLaunchProofEvent[] = launchCriticalAnalyticsEvents.map((item) => {
    const scoped = events.filter((event) => event.event_type === item.event);
    const latest = scoped.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const sessionCount = new Set(scoped.map(analyticsEventSessionId)).size;
    const count = countAnalyticsEvents(events, item.event);
    return {
      ...item,
      status: count ? "pass" : "missing",
      count,
      sessions: sessionCount,
      latestAt: latest?.created_at,
      evidence: count
        ? `${count} ${item.event.replaceAll("_", " ")} event${count === 1 ? "" : "s"} across ${sessionCount} session${sessionCount === 1 ? "" : "s"}. Latest: ${readableDate(latest?.created_at)}.`
        : `Missing ${item.event}. ${item.action}`,
    };
  });

  const missingEvents = proofEvents.filter((event) => event.status === "missing");
  const coveredEvents = proofEvents.length - missingEvents.length;
  const score = events.length
    ? Math.min(100, Math.round((coveredEvents / launchCriticalAnalyticsEvents.length) * 70 + (completeSessions ? 20 : 0) + (attributedEvents ? 10 : 0)))
    : 0;
  const status: AnalyticsLaunchProofStatus = !events.length ? "empty" : !missingEvents.length && completeSessions ? "proven" : "partial";
  const nextAction = !events.length
    ? "Run one complete storefront QA journey: view widget, start, complete, see recommendations and click Buy Now."
    : missingEvents.length
      ? `Generate missing launch events: ${missingEvents.map((event) => event.event).join(", ")}.`
      : completeSessions
        ? "Store this proof packet with the storefront QA run and keep monitoring future launches."
        : "Run one uninterrupted QA session that captures all five launch events under the same session_id.";
  const headline = status === "proven"
    ? "Launch analytics are proven for this filter."
    : status === "partial"
      ? "Launch analytics are partially proven; one more QA pass is needed."
      : "Launch analytics have not been proven yet.";

  const reportWithoutPacket = {
    status,
    score,
    headline,
    summary: {
      totalEvents: events.length,
      requiredEvents: launchCriticalAnalyticsEvents.length,
      coveredEvents,
      missingEvents: missingEvents.length,
      sessions: sessions.length,
      completeSessions,
      attributedEvents,
      storefrontPages,
      experiences,
    },
    events: proofEvents,
    sessions,
    missingEvents,
    nextAction,
  };

  return {
    ...reportWithoutPacket,
    packet: buildPacket(reportWithoutPacket),
  };
}
