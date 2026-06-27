import { analyticsEventSessionId, buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildZeroPartyInsights } from "./insights";
import { buildShopperJourneyReport } from "./journey-insights";
import type { AnalyticsEvent, Configurator, ExperienceType, Product, Quiz } from "@/lib/types";
import { getEventExperienceType } from "./utils";

export type AudienceCaptureStatus = "empty" | "learning" | "ready" | "needs-attention";
export type AudienceSegmentStatus = "draft" | "learning" | "ready";
export type AudienceActionPriority = "critical" | "high" | "medium" | "low";
export type AudienceCheckStatus = "pass" | "warn" | "fail";
export type AudienceExportSensitivity = "anonymous" | "intent" | "commercial" | "consent";

export type AudienceCaptureInput = {
  products: Product[];
  quizzes?: Quiz[];
  configurators?: Configurator[];
  events: AnalyticsEvent[];
};

export type AudienceSegment = {
  id: string;
  name: string;
  description: string;
  status: AudienceSegmentStatus;
  score: number;
  size: number;
  signalCount: number;
  conversionRate: number;
  sources: ExperienceType[];
  signals: string[];
  products: string[];
  capturePrompt: string;
  activationPlay: string;
  exportFilter: string;
  evidence: string;
};

export type CaptureMoment = {
  id: string;
  title: string;
  trigger: string;
  placement: string;
  priority: AudienceActionPriority;
  reason: string;
  prompt: string;
  fields: string[];
  guardrail: string;
};

export type AudienceExportField = {
  id: string;
  label: string;
  source: string;
  description: string;
  sensitivity: AudienceExportSensitivity;
};

export type AudienceCaptureCheck = {
  id: string;
  label: string;
  status: AudienceCheckStatus;
  detail: string;
  recommendation: string;
};

export type AudienceCaptureAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: AudienceActionPriority;
  href: string;
  label: string;
};

export type AudienceCaptureReport = {
  status: AudienceCaptureStatus;
  score: number;
  headline: string;
  summary: {
    sessions: number;
    explicitSignals: number;
    highIntentSessions: number;
    attributedSessions: number;
    captureReadySegments: number;
    captureMoments: number;
    exportFields: number;
    contactFieldsDetected: number;
    consentedContacts: number;
    completionRate: number;
    clickRate: number;
  };
  segments: AudienceSegment[];
  moments: CaptureMoment[];
  exportFields: AudienceExportField[];
  checks: AudienceCaptureCheck[];
  actions: AudienceCaptureAction[];
  packet: string;
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
];

const contactKeys = [
  "email",
  "work_email",
  "customer_email",
  "phone",
  "customer_phone",
  "external_contact_id",
  "crm_contact_id",
];

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£$.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function idFrom(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "audience";
}

function answerLabels(metadata?: Record<string, unknown>) {
  const answers = metadata?.answers;
  const directAnswers = Array.isArray(answers)
    ? answers.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      return [text(entry.answer), text(entry.match_value), text(entry.matchValue)].filter(Boolean);
    })
    : [];
  return [
    ...directAnswers,
    ...stringArray(metadata?.answer_summary),
    ...stringArray(metadata?.selected_option_names),
  ];
}

function eventSignals(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return [
    text(metadata.query),
    ...stringArray(metadata.terms),
    ...answerLabels(metadata),
    ...stringArray(metadata.matched_reasons),
    ...stringArray(metadata.matched_signals),
    ...stringArray(metadata.selected_tags),
    ...stringArray(metadata.semantic_terms),
    text(metadata.product_name),
    text(metadata.experience_name),
  ].filter(Boolean);
}

function eventHaystack(event: AnalyticsEvent) {
  return normalize([
    event.product_id || "",
    event.quiz_id,
    ...eventSignals(event),
  ].join(" "));
}

function productNameForEvent(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return text(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || "";
}

function eventHasAttribution(event: AnalyticsEvent) {
  return attributionKeys.some((key) => text(event.metadata?.[key]));
}

function eventHasContactField(event: AnalyticsEvent) {
  return contactKeys.some((key) => text(event.metadata?.[key]));
}

function eventHasConsent(event: AnalyticsEvent) {
  const consent = normalize([
    text(event.metadata?.consent_status),
    text(event.metadata?.findly_consent),
    text(event.metadata?.marketing_consent),
  ].join(" "));
  return ["granted", "accepted", "true", "opt-in", "opted-in", "subscribed"].some((value) => consent.includes(value));
}

function uniqueSources(events: AnalyticsEvent[]) {
  return [...new Set(events.map(getEventExperienceType))].sort();
}

function sessionSet(events: AnalyticsEvent[]) {
  return new Set(events.map(analyticsEventSessionId));
}

function sessionsMatching(events: AnalyticsEvent[], matcher: (event: AnalyticsEvent) => boolean) {
  return sessionSet(events.filter(matcher));
}

function topProductsFromEvents(events: AnalyticsEvent[], productsById: Map<string, Product>, limit = 4) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const productName = productNameForEvent(event, productsById);
    if (!productName) continue;
    counts.set(productName, (counts.get(productName) || 0) + (event.event_type === "buy_click" ? 3 : event.event_type === "product_recommended" ? 2 : 1));
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

function segmentStatus(score: number, size: number, signalCount: number): AudienceSegmentStatus {
  if (score >= 68 && size >= 2 && signalCount >= 3) return "ready";
  if (score >= 34 || signalCount >= 2 || size >= 2) return "learning";
  return "draft";
}

function dedupeSegments(segments: AudienceSegment[]) {
  const map = new Map<string, AudienceSegment>();
  for (const segment of segments) {
    const existing = map.get(segment.id);
    if (!existing || segment.score > existing.score || segment.size > existing.size) map.set(segment.id, segment);
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score || b.size - a.size || b.signalCount - a.signalCount || a.name.localeCompare(b.name))
    .slice(0, 7);
}

function productDemandSegment(
  demand: ReturnType<typeof buildZeroPartyInsights>["productDemand"][number],
  events: AnalyticsEvent[],
  productsById: Map<string, Product>,
): AudienceSegment {
  const productKey = normalize(demand.productName);
  const matched = events.filter((event) => event.product_id === demand.productId || normalize(productNameForEvent(event, productsById)) === productKey || eventHaystack(event).includes(productKey));
  const size = sessionSet(matched).size;
  const score = Math.min(100, Math.round(demand.recommended * 9 + demand.clicks * 24 + size * 7 + demand.sources.length * 8 + demand.clickRate * 0.5));
  const signalCount = demand.recommended + demand.clicks;
  return {
    id: `product-${idFrom(demand.productName)}`,
    name: `${demand.productName} interest`,
    description: "Shoppers who saw, clicked or repeatedly matched this product during guided discovery.",
    status: segmentStatus(score, size, signalCount),
    score,
    size,
    signalCount,
    conversionRate: Math.round(demand.clickRate),
    sources: demand.sources,
    signals: ["recommended product", demand.clicks ? "buy-click intent" : "result exposure"].filter(Boolean),
    products: [demand.productName],
    capturePrompt: `Want help comparing ${demand.productName} with your shortlist? Save this recommendation and continue from any device.`,
    activationPlay: "Use as a remarketing/export segment for product education, comparison copy and PDP follow-up.",
    exportFilter: `recommended_product = "${demand.productName}" OR clicked_product = "${demand.productName}"`,
    evidence: `${demand.recommended} recommendation${demand.recommended === 1 ? "" : "s"}, ${demand.clicks} buy click${demand.clicks === 1 ? "" : "s"} and ${size} session${size === 1 ? "" : "s"}.`,
  };
}

function insightSegment(
  kind: "answer" | "query",
  label: string,
  count: number,
  sources: ExperienceType[],
  products: string[],
  events: AnalyticsEvent[],
  productsById: Map<string, Product>,
): AudienceSegment {
  const normalized = normalize(label);
  const matched = events.filter((event) => eventHaystack(event).includes(normalized));
  const size = sessionSet(matched).size;
  const clicks = matched.filter((event) => event.event_type === "buy_click").length;
  const recommendations = matched.filter((event) => event.event_type === "product_recommended").length;
  const score = Math.min(100, Math.round(count * 9 + size * 8 + clicks * 18 + recommendations * 4 + sources.length * 8 + products.length * 3));
  const sourceLabel = kind === "answer" ? "guided answer" : "search/advisor language";
  const productNames = products.length ? products : topProductsFromEvents(matched, productsById, 3);
  return {
    id: `${kind}-${idFrom(label)}`,
    name: kind === "answer" ? `${label} shoppers` : `"${label}" intent`,
    description: kind === "answer"
      ? "Shoppers who explicitly selected this guided answer or configurator choice."
      : "Shoppers who used this phrase in search/advisor prompts or semantic terms.",
    status: segmentStatus(score, size, count),
    score,
    size,
    signalCount: count,
    conversionRate: recommendations ? Math.round(stageRate(clicks, recommendations)) : clicks ? 100 : 0,
    sources,
    signals: [sourceLabel, clicks ? "buy-click proof" : "", recommendations ? "recommendation exposure" : ""].filter(Boolean),
    products: productNames,
    capturePrompt: kind === "answer"
      ? `Want your ${label.toLowerCase()} shortlist saved? Enter your email in the store form and we’ll keep the recommendations together.`
      : `Want more ${label.toLowerCase()} picks? Save this guide and get a tighter shortlist next time.`,
    activationPlay: kind === "answer"
      ? "Create a landing-page, email or paid-social segment around this explicit preference."
      : "Turn this vocabulary into campaign copy, search synonyms and product education snippets.",
    exportFilter: kind === "answer" ? `answer_summary CONTAINS "${label}"` : `query_terms CONTAINS "${label}"`,
    evidence: `${count} ${sourceLabel} signal${count === 1 ? "" : "s"} across ${sources.join(", ") || "unknown"} with ${size} session${size === 1 ? "" : "s"}.`,
  };
}

function highIntentSegment(events: AnalyticsEvent[], productsById: Map<string, Product>): AudienceSegment | null {
  const matched = events.filter((event) => event.event_type === "buy_click" || event.event_type === "quiz_complete");
  const size = sessionSet(matched).size;
  if (!size) return null;
  const clicks = matched.filter((event) => event.event_type === "buy_click").length;
  const completions = matched.filter((event) => event.event_type === "quiz_complete").length;
  const products = topProductsFromEvents(matched, productsById, 4);
  const sources = uniqueSources(matched);
  const score = Math.min(100, Math.round(size * 10 + clicks * 22 + completions * 7 + products.length * 5 + sources.length * 8));
  return {
    id: "high-intent-completers",
    name: "High-intent completers",
    description: "Anonymous sessions that completed a guided journey or clicked a buy CTA.",
    status: segmentStatus(score, size, completions + clicks),
    score,
    size,
    signalCount: completions + clicks,
    conversionRate: completions ? Math.round(stageRate(clicks, completions)) : clicks ? 100 : 0,
    sources,
    signals: ["quiz completion", clicks ? "buy-click intent" : "shortlist intent"].filter(Boolean),
    products,
    capturePrompt: "Want this shortlist sent to you? Use the store’s consented email form and continue from this recommendation later.",
    activationPlay: "Prioritize cart education, product comparison copy and price/fit reassurance for these sessions.",
    exportFilter: "event_type IN (quiz_complete, buy_click)",
    evidence: `${size} high-intent session${size === 1 ? "" : "s"} with ${completions} completion${completions === 1 ? "" : "s"} and ${clicks} buy click${clicks === 1 ? "" : "s"}.`,
  };
}

function buildExportFields(): AudienceExportField[] {
  return [
    { id: "session_id", label: "Anonymous session ID", source: "analytics metadata", description: "Groups widget events without storing a personal identity.", sensitivity: "anonymous" },
    { id: "experience_type", label: "Experience type", source: "widget runtime", description: "Finder, advisor, search or configurator path used by the shopper.", sensitivity: "anonymous" },
    { id: "intent_summary", label: "Intent summary", source: "journey reconstruction", description: "Best available answer/query summary for the session.", sensitivity: "intent" },
    { id: "answer_summary", label: "Selected answers", source: "finder/configurator metadata", description: "Explicit zero-party choices selected by the shopper.", sensitivity: "intent" },
    { id: "query_terms", label: "Query terms", source: "search/advisor metadata", description: "Parsed language from shopper prompts and searches.", sensitivity: "intent" },
    { id: "recommended_product", label: "Recommended product", source: "recommendation events", description: "Products shown by deterministic matching.", sensitivity: "commercial" },
    { id: "clicked_product", label: "Clicked product", source: "buy-click events", description: "Products receiving Buy Now intent.", sensitivity: "commercial" },
    { id: "product_category", label: "Product category", source: "catalog", description: "Catalog category for surfaced or clicked products.", sensitivity: "commercial" },
    { id: "findly_source", label: "Traffic source", source: "widget snippet labels", description: "Source or UTM source attached to the widget session.", sensitivity: "anonymous" },
    { id: "findly_campaign", label: "Campaign", source: "widget snippet labels", description: "Campaign label used for audience performance comparisons.", sensitivity: "anonymous" },
    { id: "findly_placement", label: "Placement", source: "widget snippet labels", description: "Storefront page or placement that launched the guided experience.", sensitivity: "anonymous" },
    { id: "consent_status", label: "Consent status", source: "external/store form", description: "Optional consent flag if the ecommerce site collects contact details outside Findly.", sensitivity: "consent" },
    { id: "created_at", label: "Event timestamp", source: "analytics events", description: "Timestamp used for recency windows and exports.", sensitivity: "anonymous" },
  ];
}

function buildMoments(events: AnalyticsEvent[], productsById: Map<string, Product>): CaptureMoment[] {
  const snapshot = buildAnalyticsSnapshot(events);
  const noResultEvents = events.filter((event) => event.metadata?.result_count === 0 || ["no-results", "thin-results"].includes(text(event.metadata?.recovery_status)));
  const configuratorEvents = events.filter((event) => getEventExperienceType(event) === "configurator");
  const attributedSessions = sessionsMatching(events, eventHasAttribution).size;
  const moments: CaptureMoment[] = [];

  if (!events.length) {
    moments.push({
      id: "first-qa-journey",
      title: "First QA journey",
      trigger: "Before launch",
      placement: "Storefront QA sandbox",
      priority: "critical",
      reason: "No shopper journey has been captured yet.",
      prompt: "Run a test journey, complete the finder and click a product to generate the first audience signal.",
      fields: ["session_id", "experience_type", "answer_summary", "recommended_product"],
      guardrail: "Use test traffic only until the event contract is proven.",
    });
    return moments;
  }

  if (snapshot.completed) {
    moments.push({
      id: "recommendation-reveal",
      title: "After recommendation reveal",
      trigger: "quiz_complete",
      placement: "Results screen, below the top recommendation",
      priority: "high",
      reason: `${snapshot.completed} completed journey event${snapshot.completed === 1 ? "" : "s"} can become a consented shortlist-save moment.`,
      prompt: "Save my shortlist and send me the fit notes.",
      fields: ["session_id", "experience_type", "answer_summary", "recommended_product", "consent_status"],
      guardrail: "Collect email through the ecommerce site’s consented form; Findly exports anonymous intent by default.",
    });
  }

  if (snapshot.clicked) {
    moments.push({
      id: "buy-click-follow-up",
      title: "After Buy Now click",
      trigger: "buy_click",
      placement: "Post-click interstitial or store-side follow-up",
      priority: "high",
      reason: `${snapshot.clicked} buy-click event${snapshot.clicked === 1 ? "" : "s"} shows strong commercial intent.`,
      prompt: "Keep this recommendation with your order notes.",
      fields: ["session_id", "clicked_product", "findly_source", "findly_campaign", "created_at"],
      guardrail: "Do not block checkout; use this only where the store already has consented messaging.",
    });
  }

  if (noResultEvents.length) {
    moments.push({
      id: "no-result-recovery",
      title: "No-result recovery",
      trigger: "no-results or thin-results",
      placement: "Recovery panel beneath closest matches",
      priority: "medium",
      reason: `${sessionSet(noResultEvents).size} session${sessionSet(noResultEvents).size === 1 ? "" : "s"} exposed unmet demand worth capturing.`,
      prompt: "Tell me when this product need is available.",
      fields: ["session_id", "intent_summary", "query_terms", "answer_summary", "consent_status"],
      guardrail: "Label it as demand capture, not a guaranteed back-in-stock alert unless inventory systems support it.",
    });
  }

  if (configuratorEvents.length) {
    moments.push({
      id: "bundle-summary-save",
      title: "Configurator summary save",
      trigger: "configurator completion or bundle click",
      placement: "Bundle summary card",
      priority: "medium",
      reason: `${sessionSet(configuratorEvents).size} configurator session${sessionSet(configuratorEvents).size === 1 ? "" : "s"} can preserve compatibility-sensitive choices.`,
      prompt: "Save my build and compatibility notes.",
      fields: ["session_id", "answer_summary", "recommended_product", "clicked_product"],
      guardrail: "Only export selected option names and product IDs, not personal notes, unless consent is explicit.",
    });
  }

  if (attributedSessions) {
    const topProducts = topProductsFromEvents(events.filter(eventHasAttribution), productsById, 2).join(", ") || "recommended products";
    moments.push({
      id: "campaign-segment-export",
      title: "Campaign audience export",
      trigger: "attributed widget session",
      placement: "Marketing analytics handoff",
      priority: "medium",
      reason: `${attributedSessions} attributed session${attributedSessions === 1 ? "" : "s"} can be compared by source, campaign and placement.`,
      prompt: `Create a follow-up segment for ${topProducts}.`,
      fields: ["session_id", "findly_source", "findly_campaign", "findly_placement", "recommended_product"],
      guardrail: "Export anonymous session intent unless the store has collected consent separately.",
    });
  }

  return moments.slice(0, 5);
}

function buildChecks(input: AudienceCaptureInput, segments: AudienceSegment[], moments: CaptureMoment[], exportFields: AudienceExportField[]): AudienceCaptureCheck[] {
  const events = input.events;
  const snapshot = buildAnalyticsSnapshot(events);
  const insights = buildZeroPartyInsights(events, input.products);
  const publishedSurfaces = (input.quizzes || []).filter((quiz) => quiz.published).length + (input.configurators || []).filter((configurator) => configurator.published).length;
  const attributedSessions = sessionsMatching(events, eventHasAttribution).size;
  const contactFields = events.filter(eventHasContactField).length;
  const consentedContacts = events.filter((event) => eventHasContactField(event) && eventHasConsent(event)).length;
  const readySegments = segments.filter((segment) => segment.status === "ready").length;
  const experienceTypes = new Set(events.map(getEventExperienceType));

  return [
    {
      id: "event-volume",
      label: "Audience telemetry",
      status: snapshot.sessions ? "pass" : "fail",
      detail: snapshot.sessions ? `${snapshot.sessions} anonymous session${snapshot.sessions === 1 ? "" : "s"} reconstructed from analytics events.` : "No widget, finder, search, advisor or configurator sessions are available yet.",
      recommendation: snapshot.sessions ? "Keep collecting sessions across every embedded surface." : "Run Storefront QA, complete a journey and click a product CTA.",
    },
    {
      id: "zero-party-signals",
      label: "Zero-party signal depth",
      status: insights.summary.explicitSignals >= 10 ? "pass" : insights.summary.explicitSignals > 0 ? "warn" : "fail",
      detail: `${insights.summary.explicitSignals} explicit answer/query/catalog signal${insights.summary.explicitSignals === 1 ? "" : "s"} available for audience building.`,
      recommendation: insights.summary.explicitSignals >= 10 ? "Use the strongest segment in a controlled campaign." : "Capture more answer summaries, advisor/search terms and recommendation metadata before scaling.",
    },
    {
      id: "segment-readiness",
      label: "Ready segments",
      status: readySegments ? "pass" : segments.length ? "warn" : "fail",
      detail: readySegments ? `${readySegments} segment${readySegments === 1 ? "" : "s"} are ready for activation.` : segments.length ? `${segments.length} segment draft${segments.length === 1 ? "" : "s"} need more sessions.` : "No audience segments can be formed yet.",
      recommendation: readySegments ? "Copy the packet into your launch or campaign planning workflow." : "Prioritize one high-intent path and collect more completed journeys.",
    },
    {
      id: "capture-moments",
      label: "Capture moments",
      status: moments.length > 1 ? "pass" : moments.length ? "warn" : "fail",
      detail: `${moments.length} practical capture moment${moments.length === 1 ? "" : "s"} identified.`,
      recommendation: moments.length > 1 ? "Start with the highest-priority moment and add consent copy in the store layer." : "Use recommendation reveal and no-result recovery as the first capture placements.",
    },
    {
      id: "source-labels",
      label: "Source and campaign labels",
      status: attributedSessions ? "pass" : "warn",
      detail: attributedSessions ? `${attributedSessions} attributed session${attributedSessions === 1 ? "" : "s"} include source, campaign or placement metadata.` : "No source/campaign labels were found on audience sessions.",
      recommendation: attributedSessions ? "Compare segments by source before scaling paid or email traffic." : "Install the latest snippet labels from Widget Studio or Launch channels.",
    },
    {
      id: "privacy-boundary",
      label: "Consent and PII boundary",
      status: contactFields && consentedContacts < contactFields ? "warn" : "pass",
      detail: contactFields ? `${contactFields} contact-like event${contactFields === 1 ? "" : "s"} detected; ${consentedContacts} show consent metadata.` : "No personal contact fields are required or exported by default.",
      recommendation: contactFields ? "Only export contact fields when the ecommerce site records explicit consent." : "Keep Findly exports anonymous unless a consented store form owns the contact capture.",
    },
    {
      id: "experience-coverage",
      label: "Experience coverage",
      status: publishedSurfaces && experienceTypes.size >= 2 ? "pass" : publishedSurfaces || experienceTypes.size ? "warn" : "fail",
      detail: `${publishedSurfaces} published surface${publishedSurfaces === 1 ? "" : "s"} and ${experienceTypes.size} observed experience type${experienceTypes.size === 1 ? "" : "s"}.`,
      recommendation: "Collect sessions from finder, advisor/search and configurator surfaces before treating segments as durable.",
    },
    {
      id: "export-schema",
      label: "Safe export schema",
      status: exportFields.length >= 10 ? "pass" : "warn",
      detail: `${exportFields.length} export-safe field${exportFields.length === 1 ? "" : "s"} defined for anonymous audience handoff.`,
      recommendation: "Use these fields for manual CSV/API handoff until CRM integrations are intentionally added.",
    },
  ];
}

function buildActions(report: Omit<AudienceCaptureReport, "packet" | "actions">): AudienceCaptureAction[] {
  const actions: AudienceCaptureAction[] = [];
  const topSegment = report.segments[0];
  const missingTelemetry = report.checks.find((check) => check.id === "event-volume" && check.status === "fail");
  const sourceLabels = report.checks.find((check) => check.id === "source-labels" && check.status !== "pass");
  const privacy = report.checks.find((check) => check.id === "privacy-boundary" && check.status !== "pass");

  if (missingTelemetry) {
    actions.push({
      id: "capture-first-audience-signals",
      title: "Capture the first audience session",
      detail: "Audience Capture Center needs at least one completed guided journey before it can build segments.",
      evidence: missingTelemetry.detail,
      priority: "critical",
      href: "/dashboard/storefront-sandbox",
      label: "Run QA",
    });
  }

  if (topSegment) {
    actions.push({
      id: `activate-${topSegment.id}`,
      title: `Activate ${topSegment.name}`,
      detail: topSegment.activationPlay,
      evidence: topSegment.evidence,
      priority: topSegment.status === "ready" ? "high" : "medium",
      href: "/dashboard/experiments",
      label: "Plan campaign",
    });
  }

  const topMoment = report.moments.find((moment) => moment.priority === "high") || report.moments[0];
  if (topMoment && topMoment.id !== "first-qa-journey") {
    actions.push({
      id: `ship-${topMoment.id}`,
      title: `Ship ${topMoment.title.toLowerCase()}`,
      detail: topMoment.prompt,
      evidence: topMoment.reason,
      priority: topMoment.priority,
      href: "/dashboard/widget-studio",
      label: "Review widget",
    });
  }

  if (sourceLabels) {
    actions.push({
      id: "label-audience-sources",
      title: "Label audience source, campaign and placement",
      detail: "Segments become more useful when merchants know which storefront or campaign created them.",
      evidence: sourceLabels.detail,
      priority: "medium",
      href: "/dashboard/channels",
      label: "Add labels",
    });
  }

  if (privacy) {
    actions.push({
      id: "audit-consent-boundary",
      title: "Audit consent before exporting contacts",
      detail: "Contact-like metadata exists without consent coverage for every event.",
      evidence: privacy.detail,
      priority: "high",
      href: "/dashboard/trust-center",
      label: "Review trust",
    });
  } else if (report.summary.sessions) {
    actions.push({
      id: "keep-exports-anonymous",
      title: "Keep exports anonymous until CRM work is intentional",
      detail: "The MVP can prove audience value with anonymous session intent, product affinity and campaign labels.",
      evidence: "No CRM integration and no PII export are required for the current phase.",
      priority: "low",
      href: "/dashboard/trust-center",
      label: "Review boundary",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .slice(0, 5);
}

function buildPacket(report: Omit<AudienceCaptureReport, "packet">) {
  return [
    "Findly Audience Capture packet",
    "==============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Boundary",
    "- No CRM integration and no PII storage by default.",
    "- Export anonymous session intent unless the ecommerce site owns explicit consent capture.",
    "- Product selection remains deterministic; these segments are derived from recorded events.",
    "",
    "Audience segments",
    ...report.segments.map((segment) => [
      `- ${segment.name} (${segment.status}, ${segment.score}%)`,
      `  Size: ${segment.size} session${segment.size === 1 ? "" : "s"} · Signals: ${segment.signalCount} · CVR: ${segment.conversionRate}%`,
      `  Filter: ${segment.exportFilter}`,
      `  Prompt: ${segment.capturePrompt}`,
      `  Evidence: ${segment.evidence}`,
    ].join("\n")),
    "",
    "Capture moments",
    ...report.moments.map((moment) => [
      `- [${moment.priority.toUpperCase()}] ${moment.title}`,
      `  Trigger: ${moment.trigger} · Placement: ${moment.placement}`,
      `  Prompt: ${moment.prompt}`,
      `  Guardrail: ${moment.guardrail}`,
    ].join("\n")),
    "",
    "Safe export schema",
    ...report.exportFields.map((field) => `- ${field.id}: ${field.description} (${field.sensitivity})`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildAudienceCaptureReport(input: AudienceCaptureInput): AudienceCaptureReport {
  const events = input.events;
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const snapshot = buildAnalyticsSnapshot(events);
  const insights = buildZeroPartyInsights(events, input.products);
  const journeys = buildShopperJourneyReport(events, input.products);

  const segments = dedupeSegments([
    ...insights.productDemand.slice(0, 3).map((demand) => productDemandSegment(demand, events, productsById)),
    ...insights.answers.slice(0, 3).map((insight) => insightSegment("answer", insight.label, insight.count, insight.sources, insight.products, events, productsById)),
    ...insights.queryThemes.slice(0, 3).map((insight) => insightSegment("query", insight.label, insight.count, insight.sources, insight.products, events, productsById)),
    highIntentSegment(events, productsById),
  ].filter((segment): segment is AudienceSegment => Boolean(segment)));

  const moments = buildMoments(events, productsById);
  const exportFields = buildExportFields();
  const highIntentSessions = sessionsMatching(events, (event) => event.event_type === "quiz_complete" || event.event_type === "buy_click").size;
  const attributedSessions = sessionsMatching(events, eventHasAttribution).size;
  const contactFieldsDetected = events.filter(eventHasContactField).length;
  const consentedContacts = events.filter((event) => eventHasContactField(event) && eventHasConsent(event)).length;
  const readySegments = segments.filter((segment) => segment.status === "ready").length;
  const completionRate = Math.round(stageRate(snapshot.completed, snapshot.started || snapshot.viewed || snapshot.sessions));
  const clickRate = Math.round(stageRate(snapshot.clicked, snapshot.completed));

  const partialReport = {
    status: "empty" as AudienceCaptureStatus,
    score: 0,
    headline: "",
    summary: {
      sessions: journeys.summary.sessions,
      explicitSignals: insights.summary.explicitSignals,
      highIntentSessions,
      attributedSessions,
      captureReadySegments: readySegments,
      captureMoments: moments.length,
      exportFields: exportFields.length,
      contactFieldsDetected,
      consentedContacts,
      completionRate,
      clickRate,
    },
    segments,
    moments,
    exportFields,
    checks: [] as AudienceCaptureCheck[],
    actions: [] as AudienceCaptureAction[],
  };
  const checks = buildChecks(input, segments, moments, exportFields);
  const failedChecks = checks.filter((check) => check.status === "fail").length;
  const warnChecks = checks.filter((check) => check.status === "warn").length;
  const score = Math.min(100, Math.max(0, Math.round(
    readySegments * 14
    + Math.min(26, insights.summary.explicitSignals * 1.2)
    + Math.min(18, journeys.summary.sessions * 1.4)
    + Math.min(14, highIntentSessions * 2.2)
    + Math.min(12, attributedSessions * 1.2)
    + Math.min(10, moments.length * 2.5)
    - failedChecks * 8
    - warnChecks * 2,
  )));
  const status: AudienceCaptureStatus = !events.length
    ? "empty"
    : failedChecks || contactFieldsDetected > consentedContacts
      ? "needs-attention"
      : readySegments && score >= 70
        ? "ready"
        : "learning";
  const baseReport: Omit<AudienceCaptureReport, "packet"> = {
    ...partialReport,
    status,
    score,
    headline: status === "ready"
      ? "Audience signals are strong enough to support a safe capture and activation handoff."
      : status === "needs-attention"
        ? "Audience intent exists, but telemetry or consent guardrails need attention before export."
        : status === "learning"
          ? "Audience evidence is forming; focus on one high-intent segment and capture more journeys."
          : "Audience Capture Center needs storefront sessions before it can build safe zero-party segments.",
    checks,
    actions: [],
  };
  const reportWithActions = { ...baseReport, actions: buildActions(baseReport) };
  return { ...reportWithActions, packet: buildPacket(reportWithActions) };
}
