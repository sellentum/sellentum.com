import type { AnalyticsEvent } from "@/lib/types";

export type AnalyticsSnapshot = {
  sessions: number;
  viewed: number;
  started: number;
  completed: number;
  clicked: number;
  widget_view: number;
  quiz_start: number;
  quiz_complete: number;
  product_recommended: number;
  buy_click: number;
};

export type AnalyticsTrend = {
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
  direction: "up" | "down" | "flat";
  label: string;
};

export type FunnelDiagnosis = {
  title: string;
  detail: string;
  recommendation: string;
  severity: "empty" | "watch" | "healthy";
};

export function analyticsEventSessionId(event: AnalyticsEvent) {
  const value = event.metadata?.session_id;
  return typeof value === "string" && value ? value : `event:${event.id}`;
}

export function countAnalyticsEvents(events: AnalyticsEvent[], type: AnalyticsEvent["event_type"]) {
  return events.filter((event) => event.event_type === type).length;
}

function sessionCount(events: AnalyticsEvent[]) {
  return new Set(events.map(analyticsEventSessionId)).size;
}

function sessionCountFor(events: AnalyticsEvent[], type: AnalyticsEvent["event_type"]) {
  return new Set(events.filter((event) => event.event_type === type).map(analyticsEventSessionId)).size;
}

export function buildAnalyticsSnapshot(events: AnalyticsEvent[]): AnalyticsSnapshot {
  return {
    sessions: sessionCount(events),
    viewed: sessionCountFor(events, "widget_view"),
    started: sessionCountFor(events, "quiz_start"),
    completed: sessionCountFor(events, "quiz_complete"),
    clicked: sessionCountFor(events, "buy_click"),
    widget_view: countAnalyticsEvents(events, "widget_view"),
    quiz_start: countAnalyticsEvents(events, "quiz_start"),
    quiz_complete: countAnalyticsEvents(events, "quiz_complete"),
    product_recommended: countAnalyticsEvents(events, "product_recommended"),
    buy_click: countAnalyticsEvents(events, "buy_click"),
  };
}

export function getAnalyticsPeriods(events: AnalyticsEvent[], days: number, referenceDate = new Date()) {
  const safeDays = Math.max(1, Math.floor(days));
  const currentStart = new Date(referenceDate);
  currentStart.setHours(0, 0, 0, 0);
  currentStart.setDate(currentStart.getDate() - (safeDays - 1));

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - safeDays);

  const currentEnd = new Date(referenceDate);
  currentEnd.setHours(23, 59, 59, 999);

  const current = events.filter((event) => {
    const date = new Date(event.created_at);
    return date >= currentStart && date <= currentEnd;
  });
  const previous = events.filter((event) => {
    const date = new Date(event.created_at);
    return date >= previousStart && date < currentStart;
  });

  return { current, previous, currentStart, currentEnd, previousStart };
}

export function calculateAnalyticsTrend(current: number, previous: number): AnalyticsTrend {
  const delta = current - previous;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const percent = previous === 0 ? current > 0 ? null : 0 : Math.round((delta / previous) * 1000) / 10;
  const label = percent === null ? "New" : `${percent > 0 ? "+" : ""}${percent}%`;
  return { current, previous, delta, percent, direction, label };
}

export function buildAnalyticsTrends(currentEvents: AnalyticsEvent[], previousEvents: AnalyticsEvent[]) {
  const current = buildAnalyticsSnapshot(currentEvents);
  const previous = buildAnalyticsSnapshot(previousEvents);
  return {
    sessions: calculateAnalyticsTrend(current.sessions, previous.sessions),
    widget_view: calculateAnalyticsTrend(current.widget_view, previous.widget_view),
    quiz_start: calculateAnalyticsTrend(current.quiz_start, previous.quiz_start),
    quiz_complete: calculateAnalyticsTrend(current.quiz_complete, previous.quiz_complete),
    product_recommended: calculateAnalyticsTrend(current.product_recommended, previous.product_recommended),
    buy_click: calculateAnalyticsTrend(current.buy_click, previous.buy_click),
  };
}

export function stageRate(value: number, previousValue: number) {
  return previousValue ? value / previousValue * 100 : 0;
}

export function buildFunnelDiagnosis(snapshot: Pick<AnalyticsSnapshot, "sessions" | "viewed" | "started" | "completed" | "clicked">): FunnelDiagnosis {
  if (!snapshot.sessions || !snapshot.viewed) {
    return {
      title: "No measurable widget traffic yet",
      detail: "Findly needs at least one storefront/widget session before the funnel can diagnose shopper behaviour.",
      recommendation: "Open the embedded experience from a storefront or preview link, complete a journey, then check this view again.",
      severity: "empty",
    };
  }

  const leaks = [
    {
      id: "start",
      dropoff: snapshot.viewed ? (snapshot.viewed - snapshot.started) / snapshot.viewed : 0,
      title: "Shoppers view the widget but do not start",
      detail: `${Math.max(0, snapshot.viewed - snapshot.started)} viewed session${snapshot.viewed - snapshot.started === 1 ? "" : "s"} did not become a guided journey.`,
      recommendation: "Test a clearer launcher label, stronger welcome promise, or a shorter first question.",
    },
    {
      id: "complete",
      dropoff: snapshot.started ? (snapshot.started - snapshot.completed) / snapshot.started : 0,
      title: "Shoppers start but do not finish",
      detail: `${Math.max(0, snapshot.started - snapshot.completed)} started session${snapshot.started - snapshot.completed === 1 ? "" : "s"} dropped before a result.`,
      recommendation: "Reduce question count, remove ambiguous answers, or move budget/constraint questions earlier.",
    },
    {
      id: "click",
      dropoff: snapshot.completed ? (snapshot.completed - snapshot.clicked) / snapshot.completed : 0,
      title: "Shoppers get results but do not click",
      detail: `${Math.max(0, snapshot.completed - snapshot.clicked)} completed session${snapshot.completed - snapshot.clicked === 1 ? "" : "s"} did not click through to buy.`,
      recommendation: "Improve product URLs/images, strengthen recommendation explanations, or add clearer CTA copy.",
    },
  ].sort((a, b) => b.dropoff - a.dropoff || a.id.localeCompare(b.id));

  const worst = leaks[0];
  if (!worst || worst.dropoff <= 0.15) {
    return {
      title: "Funnel looks healthy for this sample",
      detail: "No stage is showing a major deterministic drop-off yet.",
      recommendation: "Keep collecting sessions, then compare finder, advisor and configurator filters for the strongest path.",
      severity: "healthy",
    };
  }

  return {
    title: worst.title,
    detail: worst.detail,
    recommendation: worst.recommendation,
    severity: "watch",
  };
}
