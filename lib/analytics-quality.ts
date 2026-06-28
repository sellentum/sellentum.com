import { analyticsEventSessionId } from "./analytics";
import type { AnalyticsEvent, AnalyticsEventType, ExperienceType } from "@/lib/types";
import { getEventExperienceType } from "./utils";

export type AnalyticsQualityStatus = "healthy" | "watch" | "needs-attention";
export type AnalyticsQualityCheckStatus = "pass" | "warn" | "fail";

export type AnalyticsQualityCheck = {
  id: string;
  label: string;
  status: AnalyticsQualityCheckStatus;
  detail: string;
  evidence: string;
  action: string;
  actionHref: string;
};

export type AnalyticsQualityReport = {
  status: AnalyticsQualityStatus;
  score: number;
  checks: AnalyticsQualityCheck[];
  missingEventTypes: AnalyticsEventType[];
  summary: {
    events: number;
    sessions: number;
    completeEventTypes: number;
    eventsWithSession: number;
    eventsWithExperience: number;
    missingRequiredMetadata: number;
    sequenceIssues: number;
    orphanProductEvents: number;
    productEventsWithoutProduct: number;
  };
};

const eventTypes: AnalyticsEventType[] = ["widget_view", "quiz_start", "quiz_complete", "product_recommended", "buy_click"];

const requiredEventFields: Record<AnalyticsEventType, Array<{ label: string; alternatives: string[] }>> = {
  widget_view: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
  ],
  quiz_start: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
  ],
  quiz_complete: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
    { label: "result_count", alternatives: ["result_count"] },
  ],
  product_recommended: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
    { label: "rank", alternatives: ["rank"] },
    { label: "product identity", alternatives: ["product_id", "product_name"] },
  ],
  buy_click: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
    { label: "product identity", alternatives: ["product_id", "product_name"] },
  ],
  recommendation_feedback: [
    { label: "session_id", alternatives: ["session_id"] },
    { label: "experience_type", alternatives: ["experience_type"] },
    { label: "experience_id", alternatives: ["experience_id"] },
    { label: "feedback", alternatives: ["feedback", "feedback_sentiment"] },
    { label: "product identity", alternatives: ["product_id", "product_name"] },
  ],
};

function metadataValue(event: AnalyticsEvent, field: string) {
  if (field === "product_id") return event.product_id;
  return event.metadata?.[field];
}

function hasValue(event: AnalyticsEvent, field: string) {
  const value = metadataValue(event, field);
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function missingRequiredGroups(event: AnalyticsEvent) {
  return requiredEventFields[event.event_type].filter((group) => !group.alternatives.some((field) => hasValue(event, field)));
}

function productIdentityMissing(event: AnalyticsEvent) {
  return (event.event_type === "product_recommended" || event.event_type === "buy_click" || event.event_type === "recommendation_feedback") && !hasValue(event, "product_id") && !hasValue(event, "product_name");
}

function eventsBySession(events: AnalyticsEvent[]) {
  const groups = new Map<string, AnalyticsEvent[]>();
  for (const event of events) {
    const id = analyticsEventSessionId(event);
    groups.set(id, [...(groups.get(id) || []), event]);
  }
  return [...groups.values()].map((items) => items.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
}

function sessionSequenceIssues(sessionEvents: AnalyticsEvent[]) {
  const issues: string[] = [];
  let sawView = false;
  let sawStart = false;
  let sawResultSignal = false;
  let sawRecommendation = false;
  let source: ExperienceType = getEventExperienceType(sessionEvents[0]!);

  for (const event of sessionEvents) {
    source = getEventExperienceType(event);
    if (event.event_type === "widget_view") sawView = true;
    if (event.event_type === "quiz_start") {
      if (!sawView) issues.push(`${source} session started without a prior widget_view.`);
      sawStart = true;
    }
    if (event.event_type === "quiz_complete") {
      if (!sawStart) issues.push(`${source} session completed without a prior quiz_start.`);
      sawResultSignal = true;
    }
    if (event.event_type === "product_recommended") {
      if (!sawStart) issues.push(`${source} session recommended products before quiz_start.`);
      sawRecommendation = true;
      sawResultSignal = true;
    }
    if (event.event_type === "buy_click") {
      if (!sawResultSignal) issues.push(`${source} session clicked buy before any result event.`);
      if (!sawRecommendation) issues.push(`${source} session clicked buy without a prior product_recommended event.`);
    }
    if (event.event_type === "recommendation_feedback" && !sawResultSignal) {
      issues.push(`${source} session gave recommendation feedback before any result event.`);
    }
  }

  return issues;
}

function check(id: string, label: string, status: AnalyticsQualityCheckStatus, detail: string, evidence: string, action: string, actionHref: string): AnalyticsQualityCheck {
  return { id, label, status, detail, evidence, action, actionHref };
}

function qualityStatus(checks: AnalyticsQualityCheck[]): AnalyticsQualityStatus {
  if (checks.some((item) => item.status === "fail")) return "needs-attention";
  if (checks.some((item) => item.status === "warn")) return "watch";
  return "healthy";
}

export function buildAnalyticsQualityReport(events: AnalyticsEvent[]): AnalyticsQualityReport {
  const presentEventTypes = new Set(events.map((event) => event.event_type));
  const missingEventTypes = eventTypes.filter((type) => !presentEventTypes.has(type));
  const sessions = eventsBySession(events);
  const eventsWithSession = events.filter((event) => hasValue(event, "session_id")).length;
  const eventsWithExperience = events.filter((event) => hasValue(event, "experience_type") && hasValue(event, "experience_id")).length;
  const missingRequiredMetadata = events.reduce((sum, event) => sum + missingRequiredGroups(event).length, 0);
  const productEvents = events.filter((event) => event.event_type === "product_recommended" || event.event_type === "buy_click" || event.event_type === "recommendation_feedback");
  const productEventsWithoutProduct = productEvents.filter(productIdentityMissing).length;
  const sequenceIssueList = sessions.flatMap(sessionSequenceIssues);
  const orphanProductEvents = sequenceIssueList.filter((issue) => issue.includes("product_recommended") || issue.includes("result event")).length;
  const checks: AnalyticsQualityCheck[] = [
    events.length
      ? check("event-volume", "Telemetry captured", "pass", `${events.length} analytics event${events.length === 1 ? "" : "s"} captured in this filter.`, `${sessions.length} session${sessions.length === 1 ? "" : "s"} reconstructed from session metadata.`, "Keep collecting sessions and compare this score before and after launch changes.", "/dashboard/analytics")
      : check("event-volume", "Telemetry captured", "warn", "No analytics events are available in this filter yet.", "The dashboard cannot prove the storefront loop without at least one widget session.", "Open the embedded widget, complete a journey and click a product CTA.", "/dashboard/launch"),
    missingRequiredMetadata
      ? check("required-metadata", "Required metadata", "fail", `${missingRequiredMetadata} required metadata field${missingRequiredMetadata === 1 ? " is" : "s are"} missing from tracked events.`, "Launch analytics need session, experience, result and product identity fields to power journey replay and product demand.", "Re-copy the latest widget/runbook and verify all public runtimes use the shared event contract.", "/dashboard/launch")
      : check("required-metadata", "Required metadata", "pass", "All captured events include their required contract metadata.", "Session, experience, result and product identity fields are present where required.", "No action needed.", "/dashboard/analytics"),
    events.length && eventsWithSession !== events.length
      ? check("session-linkage", "Session linkage", "fail", `${events.length - eventsWithSession} event${events.length - eventsWithSession === 1 ? "" : "s"} cannot be tied to an anonymous shopper session.`, "Missing session_id breaks funnel rates, journey replay and drop-off diagnosis.", "Retest in a browser that allows local storage and confirm getSessionMetadata is attached to every event.", "/dashboard/analytics")
      : check("session-linkage", "Session linkage", events.length ? "pass" : "warn", events.length ? "Every event has a shopper session ID." : "Session linkage has not been proven yet.", events.length ? `${eventsWithSession}/${events.length} events include session_id.` : "No events are available to inspect.", "Run one complete QA session from the storefront widget.", "/dashboard/launch"),
    sequenceIssueList.length
      ? check("event-sequence", "Journey sequence", "warn", `${sequenceIssueList.length} event ordering issue${sequenceIssueList.length === 1 ? "" : "s"} detected.`, sequenceIssueList.slice(0, 2).join(" "), "Run the storefront QA runbook and confirm view → start → result → recommendation → click order.", "/dashboard/launch")
      : check("event-sequence", "Journey sequence", events.length ? "pass" : "warn", events.length ? "Captured sessions follow the expected event order." : "Journey order has not been proven yet.", events.length ? "No orphan starts, recommendations or clicks found." : "No sessions are available to inspect.", "Complete a full QA journey and refresh Analytics.", "/dashboard/launch"),
    productEventsWithoutProduct
      ? check("product-attribution", "Product attribution", "fail", `${productEventsWithoutProduct} product event${productEventsWithoutProduct === 1 ? "" : "s"} lack product identity.`, "Product demand and buy-click reports cannot tie those events back to catalog items.", "Confirm product_recommended and buy_click events pass productId or product_name.", "/dashboard/products")
      : check("product-attribution", "Product attribution", productEvents.length ? "pass" : "warn", productEvents.length ? "Product recommendation/click events include product identity." : "No product recommendation or click events captured yet.", productEvents.length ? `${productEvents.length} product event${productEvents.length === 1 ? "" : "s"} inspected.` : "Product-level analytics need at least one completed journey.", "Complete a journey that surfaces products, then click one Buy Now CTA.", "/dashboard/launch"),
    missingEventTypes.length
      ? check("contract-coverage", "Event contract coverage", events.length ? "warn" : "warn", `${missingEventTypes.length} of 5 event types are not present in this filter.`, `Missing: ${missingEventTypes.join(", ")}.`, "Use the storefront QA runbook to generate every contract event before launch.", "/dashboard/launch")
      : check("contract-coverage", "Event contract coverage", "pass", "All five launch-contract events are present in this filter.", "widget_view, quiz_start, quiz_complete, product_recommended and buy_click have all been captured.", "No action needed.", "/dashboard/analytics"),
    events.length && eventsWithExperience !== events.length
      ? check("experience-attribution", "Experience attribution", "fail", `${events.length - eventsWithExperience} event${events.length - eventsWithExperience === 1 ? "" : "s"} lack experience attribution.`, "Experience filters and cross-surface comparison need experience_type and experience_id.", "Verify each public runtime sends experience_type and experience_id metadata.", "/dashboard/launch")
      : check("experience-attribution", "Experience attribution", events.length ? "pass" : "warn", events.length ? "Every event can be attributed to a published experience." : "Experience attribution has not been proven yet.", events.length ? `${eventsWithExperience}/${events.length} events include experience metadata.` : "No events are available to inspect.", "Generate a session from each embedded surface you plan to launch.", "/dashboard/launch"),
  ];

  const score = Math.max(0, Math.round(100
    - Math.min(30, missingRequiredMetadata * 4)
    - Math.min(20, sequenceIssueList.length * 6)
    - Math.min(20, productEventsWithoutProduct * 8)
    - Math.min(15, missingEventTypes.length * 3)
    - (events.length ? 0 : 25)));

  return {
    status: qualityStatus(checks),
    score,
    checks,
    missingEventTypes,
    summary: {
      events: events.length,
      sessions: sessions.length,
      completeEventTypes: eventTypes.length - missingEventTypes.length,
      eventsWithSession,
      eventsWithExperience,
      missingRequiredMetadata,
      sequenceIssues: sequenceIssueList.length,
      orphanProductEvents,
      productEventsWithoutProduct,
    },
  };
}
