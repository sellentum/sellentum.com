import { analyticsEventSessionId } from "./analytics";
import type { AnalyticsEvent, ExperienceType, Product } from "@/lib/types";
import { getEventExperienceType } from "./utils";

export type JourneyOutcome = "clicked" | "completed" | "started" | "viewed";

export type ShopperJourneyStep = {
  eventType: AnalyticsEvent["event_type"];
  label: string;
  productName?: string;
  createdAt: string;
};

export type ShopperJourney = {
  sessionId: string;
  experienceType: ExperienceType;
  experienceName: string;
  intentSummary: string;
  startedAt: string;
  lastSeenAt: string;
  durationSeconds: number;
  eventCount: number;
  outcome: JourneyOutcome;
  recommendedProducts: string[];
  clickedProducts: string[];
  steps: ShopperJourneyStep[];
};

export type JourneyDropoff = {
  stage: "viewed" | "started" | "completed";
  label: string;
  count: number;
  rate: number;
  recommendation: string;
};

export type ShopperJourneyReport = {
  journeys: ShopperJourney[];
  dropoffs: JourneyDropoff[];
  summary: {
    sessions: number;
    completed: number;
    clicked: number;
    abandonedAfterStart: number;
    viewOnly: number;
    averageDurationSeconds: number;
  };
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function answerSummary(metadata?: Record<string, unknown>) {
  const answers = metadata?.answers;
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    return text((item as Record<string, unknown>).answer);
  }).filter(Boolean);
}

function productName(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return text(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || "";
}

function experienceName(event: AnalyticsEvent, type: ExperienceType) {
  return text(event.metadata?.experience_name)
    || (type === "assistant" ? "AI advisor"
      : type === "search" ? "Semantic search"
        : type === "configurator" ? "Configurator"
          : "Product finder");
}

function intentForEvents(events: AnalyticsEvent[]) {
  for (const event of events) {
    const metadata = event.metadata || {};
    const query = text(metadata.query);
    if (query) return query;
    const answers = [...textArray(metadata.answer_summary), ...answerSummary(metadata), ...textArray(metadata.selected_option_names)];
    if (answers.length) return answers.slice(0, 3).join(" · ");
  }
  return "No explicit intent captured yet";
}

function stepLabel(event: AnalyticsEvent, product?: string) {
  if (event.event_type === "widget_view") return "Viewed widget";
  if (event.event_type === "quiz_start") return "Started journey";
  if (event.event_type === "quiz_complete") return "Completed journey";
  if (event.event_type === "product_recommended") return product ? `Recommended ${product}` : "Recommended product";
  return product ? `Clicked ${product}` : "Clicked buy CTA";
}

function outcomeFor(events: AnalyticsEvent[]): JourneyOutcome {
  if (events.some((event) => event.event_type === "buy_click")) return "clicked";
  if (events.some((event) => event.event_type === "quiz_complete")) return "completed";
  if (events.some((event) => event.event_type === "quiz_start")) return "started";
  return "viewed";
}

function stageRate(count: number, denominator: number) {
  return denominator ? Math.round((count / denominator) * 1000) / 10 : 0;
}

export function buildShopperJourneyReport(events: AnalyticsEvent[], products: Product[] = []): ShopperJourneyReport {
  const groups = new Map<string, AnalyticsEvent[]>();
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const event of events) {
    const id = analyticsEventSessionId(event);
    groups.set(id, [...(groups.get(id) || []), event]);
  }

  const journeys = [...groups.entries()].map(([sessionId, sessionEvents]) => {
    const ordered = sessionEvents.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const first = ordered[0]!;
    const last = ordered[ordered.length - 1]!;
    const experienceType = getEventExperienceType(first);
    const recommendedProducts = [...new Set(ordered.filter((event) => event.event_type === "product_recommended").map((event) => productName(event, productsById)).filter(Boolean))];
    const clickedProducts = [...new Set(ordered.filter((event) => event.event_type === "buy_click").map((event) => productName(event, productsById)).filter(Boolean))];
    const steps = ordered.map((event) => {
      const name = productName(event, productsById);
      return {
        eventType: event.event_type,
        label: stepLabel(event, name),
        productName: name || undefined,
        createdAt: event.created_at,
      };
    });

    return {
      sessionId,
      experienceType,
      experienceName: experienceName(first, experienceType),
      intentSummary: intentForEvents(ordered),
      startedAt: first.created_at,
      lastSeenAt: last.created_at,
      durationSeconds: Math.max(0, Math.round((new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / 1000)),
      eventCount: ordered.length,
      outcome: outcomeFor(ordered),
      recommendedProducts,
      clickedProducts,
      steps,
    };
  }).sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  const viewed = journeys.filter((journey) => journey.steps.some((step) => step.eventType === "widget_view")).length;
  const started = journeys.filter((journey) => journey.steps.some((step) => step.eventType === "quiz_start")).length;
  const completed = journeys.filter((journey) => journey.steps.some((step) => step.eventType === "quiz_complete")).length;
  const clicked = journeys.filter((journey) => journey.steps.some((step) => step.eventType === "buy_click")).length;
  const viewOnly = journeys.filter((journey) => journey.outcome === "viewed").length;
  const abandonedAfterStart = journeys.filter((journey) => journey.outcome === "started").length;
  const completedNoClick = journeys.filter((journey) => journey.outcome === "completed").length;
  const averageDurationSeconds = journeys.length ? Math.round(journeys.reduce((sum, journey) => sum + journey.durationSeconds, 0) / journeys.length) : 0;

  const dropoffs: JourneyDropoff[] = [
    {
      stage: "viewed" as const,
      label: "Viewed but did not start",
      count: viewOnly,
      rate: stageRate(viewOnly, viewed || journeys.length),
      recommendation: "Improve launcher copy or make the welcome promise more specific.",
    },
    {
      stage: "started" as const,
      label: "Started but did not complete",
      count: abandonedAfterStart,
      rate: stageRate(abandonedAfterStart, started),
      recommendation: "Shorten the path, clarify ambiguous answers, or move constraints earlier.",
    },
    {
      stage: "completed" as const,
      label: "Completed but did not click",
      count: completedNoClick,
      rate: stageRate(completedNoClick, completed),
      recommendation: "Strengthen result explanations, product imagery, price confidence or CTA language.",
    },
  ].sort((a, b) => b.count - a.count || b.rate - a.rate);

  return {
    journeys,
    dropoffs,
    summary: {
      sessions: journeys.length,
      completed,
      clicked,
      abandonedAfterStart,
      viewOnly,
      averageDurationSeconds,
    },
  };
}
