import { buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildAnalyticsQualityReport } from "./analytics-quality";
import { buildAttributionReport } from "./attribution";
import { buildDiscoveryGapReport } from "./discovery-gaps";
import { buildLaunchChannelReport } from "./launch-channels";
import type { AnalyticsEvent, Configurator, ExperienceType, Product, Quiz, WidgetSettings } from "@/lib/types";

export type ExperimentPriority = "critical" | "high" | "medium" | "low";
export type ExperimentStatus = "blocked" | "ready" | "learning" | "winner";
export type ExperimentSurface = ExperienceType | "channel" | "catalog" | "measurement";

export type ExperimentMetric = {
  label: string;
  current: number;
  target: number;
  unit: "%" | "count";
  detail: string;
};

export type ExperimentPlan = {
  id: string;
  title: string;
  surface: ExperimentSurface;
  priority: ExperimentPriority;
  status: ExperimentStatus;
  owner: "Growth" | "Merchandising" | "Catalog" | "Developer";
  hypothesis: string;
  evidence: string;
  audience: string;
  control: string;
  variant: string;
  primaryMetric: ExperimentMetric;
  secondaryMetrics: ExperimentMetric[];
  setupSteps: string[];
  successCriteria: string[];
  rollbackPlan: string;
  href: string;
  cta: string;
  blockers: string[];
  sampleSizeNote: string;
};

export type ExperimentGuardrail = {
  id: string;
  label: string;
  detail: string;
  status: "pass" | "warn" | "fail";
};

export type ExperimentPlanningReport = {
  status: "blocked" | "ready" | "learning";
  score: number;
  headline: string;
  summary: {
    experiments: number;
    ready: number;
    learning: number;
    blocked: number;
    winners: number;
    analyticsQualityScore: number;
    startRate: number;
    completionRate: number;
    clickRate: number;
  };
  experiments: ExperimentPlan[];
  guardrails: ExperimentGuardrail[];
  nextExperiment?: ExperimentPlan;
  packet: string;
};

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function priorityRank(priority: ExperimentPriority) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function statusRank(status: ExperimentStatus) {
  if (status === "blocked") return 0;
  if (status === "ready") return 3;
  if (status === "learning") return 2;
  return 1;
}

function metric(label: string, current: number, target: number, detail: string, unit: ExperimentMetric["unit"] = "%"): ExperimentMetric {
  return { label, current: Math.round(current), target: Math.round(target), unit, detail };
}

function metricLabel(item: ExperimentMetric) {
  return `${item.label}: ${item.current}${item.unit} → target ${item.target}${item.unit}`;
}

function experimentStatus(blockers: string[], current: number, target: number, observedEvents: number): ExperimentStatus {
  if (blockers.length) return "blocked";
  if (observedEvents > 0 && current >= target) return "winner";
  if (observedEvents > 0) return "learning";
  return "ready";
}

function eventCount(events: AnalyticsEvent[], experience?: ExperienceType) {
  return experience ? events.filter((event) => event.metadata?.experience_type === experience).length : events.length;
}

function experienceEvents(events: AnalyticsEvent[], experience: ExperienceType) {
  return events.filter((event) => event.metadata?.experience_type === experience || (experience === "finder" && !event.metadata?.experience_type));
}

function hasProductUrls(products: Product[]) {
  const active = products.filter((product) => product.active);
  return active.length > 0 && active.every((product) => Boolean(product.product_url?.trim()));
}

function firstPublishedFinder(quizzes: Quiz[]) {
  return quizzes.find((quiz) => quiz.published) || quizzes[0];
}

function firstPublishedConfigurator(configurators: Configurator[]) {
  return configurators.find((configurator) => configurator.published) || configurators[0];
}

function addExperiment(experiments: ExperimentPlan[], experiment: ExperimentPlan) {
  if (!experiments.some((item) => item.id === experiment.id)) experiments.push(experiment);
}

function formatPacket(experiments: ExperimentPlan[], guardrails: ExperimentGuardrail[]) {
  return [
    "Sellentum experiment plan",
    "======================",
    "",
    "Guardrails",
    ...guardrails.map((guardrail) => `- [${guardrail.status}] ${guardrail.label}: ${guardrail.detail}`),
    "",
    ...experiments.slice(0, 5).flatMap((experiment, index) => [
      `${index + 1}. ${experiment.title} — ${experiment.status.toUpperCase()} / ${experiment.priority}`,
      `Hypothesis: ${experiment.hypothesis}`,
      `Evidence: ${experiment.evidence}`,
      `Audience: ${experiment.audience}`,
      `Control: ${experiment.control}`,
      `Variant: ${experiment.variant}`,
      `Primary metric: ${metricLabel(experiment.primaryMetric)}`,
      `Success: ${experiment.successCriteria.join(" ")}`,
      `Rollback: ${experiment.rollbackPlan}`,
      "",
    ]),
  ].join("\n");
}

export function buildExperimentPlanningReport({
  origin,
  products,
  quizzes,
  configurators,
  events,
  settings,
}: {
  origin: string;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
}): ExperimentPlanningReport {
  const snapshot = buildAnalyticsSnapshot(events);
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const attribution = buildAttributionReport(events);
  const discovery = buildDiscoveryGapReport(events, products);
  const channels = buildLaunchChannelReport({ origin, settings, finders: quizzes, configurators, events });
  const finder = firstPublishedFinder(quizzes);
  const configurator = firstPublishedConfigurator(configurators);
  const activeProducts = products.filter((product) => product.active);
  const startRate = stageRate(snapshot.started, snapshot.viewed);
  const completionRate = stageRate(snapshot.completed, snapshot.started);
  const clickRate = stageRate(snapshot.clicked, snapshot.completed);
  const searchEvents = experienceEvents(events, "search");
  const configuratorEvents = experienceEvents(events, "configurator");
  const experiments: ExperimentPlan[] = [];

  const measurementBlockers = [
    analyticsQuality.score < 55 ? `Analytics QA is ${analyticsQuality.score}%; fix telemetry before trusting uplift.` : "",
  ].filter(Boolean);
  const finderBlockers = [
    !finder ? "Publish or create a finder before testing finder/search experiments." : "",
    ...measurementBlockers,
  ].filter(Boolean);
  const configuratorBlockers = [
    !configurator ? "Create a configurator before testing PDP bundle experiments." : "",
    ...measurementBlockers,
  ].filter(Boolean);

  addExperiment(experiments, {
    id: "launcher-promise",
    title: "Test a sharper launcher promise",
    surface: "channel",
    priority: snapshot.viewed >= 3 && startRate < 55 ? "high" : "medium",
    status: experimentStatus(finderBlockers, startRate, 60, snapshot.viewed),
    owner: "Growth",
    hypothesis: "A benefit-led launcher label will turn more widget views into started guided journeys.",
    evidence: snapshot.viewed ? `${snapshot.started}/${snapshot.viewed} viewed sessions started (${pct(startRate)}).` : "No widget-view baseline yet; use Launch Channels to create the first measured placement.",
    audience: "Homepage and campaign visitors who have not chosen a category yet.",
    control: settings.button_text || "Find my match",
    variant: "Find the right product in 60 seconds",
    primaryMetric: metric("Start rate", startRate, 60, "quiz_start sessions divided by widget_view sessions"),
    secondaryMetrics: [
      metric("Completion rate", completionRate, 65, "quiz_complete sessions divided by quiz_start sessions"),
      metric("Analytics QA", analyticsQuality.score, 85, "event-contract quality before judging uplift"),
    ],
    setupSteps: [
      "Open Brand & embed and update the launcher label for one channelized snippet.",
      "Use Launch Channels to install the variant on the homepage or campaign placement.",
      "Keep one existing placement using the current launcher copy as the control.",
    ],
    successCriteria: [
      "Variant start rate beats control by at least 15 percentage points.",
      "Completion rate does not fall by more than 5 percentage points.",
      "Analytics QA remains above 85%.",
    ],
    rollbackPlan: "Restore the previous launcher label if starts improve but completions or clicks fall.",
    href: "/dashboard/channels",
    cta: "Open channels",
    blockers: finderBlockers,
    sampleSizeNote: "Treat this as directional until each launcher has at least 100 widget views.",
  });

  addExperiment(experiments, {
    id: "first-question-friction",
    title: "Test a lower-friction first question",
    surface: "finder",
    priority: snapshot.started >= 3 && completionRate < 65 ? "high" : "medium",
    status: experimentStatus(finderBlockers, completionRate, 70, snapshot.started),
    owner: "Merchandising",
    hypothesis: "Moving the most intuitive need-based question first will help more shoppers reach recommendations.",
    evidence: snapshot.started ? `${snapshot.completed}/${snapshot.started} started sessions completed (${pct(completionRate)}).` : "No started sessions yet; run a QA journey before judging question friction.",
    audience: "Shoppers who start the guided finder from homepage or category placements.",
    control: finder?.questions[0]?.title || "Current first question",
    variant: "Start with the strongest buyer-need question and move hard constraints later.",
    primaryMetric: metric("Completion rate", completionRate, 70, "quiz_complete sessions divided by quiz_start sessions"),
    secondaryMetrics: [
      metric("Buy click rate", clickRate, 25, "buy_click sessions divided by completed sessions"),
      metric("No-result paths", discovery.summary.zeroResultJourneys, 0, "journeys ending without results", "count"),
    ],
    setupSteps: [
      "Duplicate the current finder rules mentally in the builder and adjust only the first-question order/copy.",
      "Use Recommendation Lab to verify the same answer paths still return products.",
      "Publish the revised finder to one low-risk channel first.",
    ],
    successCriteria: [
      "Completion rate reaches 70% or improves by at least 15 percentage points.",
      "No-result paths remain at zero.",
      "Buy click rate does not decline.",
    ],
    rollbackPlan: "Restore the previous question order if completions rise but recommendation QA or buy clicks weaken.",
    href: "/dashboard/quizzes",
    cta: "Edit finder",
    blockers: finderBlockers,
    sampleSizeNote: "Wait for at least 50 started journeys before treating completion movement as meaningful.",
  });

  addExperiment(experiments, {
    id: "results-trust",
    title: "Test stronger result-card trust proof",
    surface: "finder",
    priority: snapshot.completed >= 3 && clickRate < 20 ? "high" : "medium",
    status: experimentStatus([...finderBlockers, !hasProductUrls(activeProducts) ? "Every active product needs a product URL before click-through tests are valid." : ""].filter(Boolean), clickRate, 25, snapshot.completed),
    owner: "Merchandising",
    hypothesis: "Clearer proof points and product hygiene will turn more completed journeys into product-page clicks.",
    evidence: snapshot.completed ? `${snapshot.clicked}/${snapshot.completed} completed sessions clicked Buy Now (${pct(clickRate)}).` : "No completed sessions yet; result-card trust cannot be judged.",
    audience: "Shoppers who complete a finder, advisor or search journey and see recommendations.",
    control: "Current recommendation cards and product metadata.",
    variant: "Prioritize richer images, product URLs, buyer-needs language and comparison proof for the top surfaced products.",
    primaryMetric: metric("Buy click rate", clickRate, 25, "buy_click sessions divided by completed sessions"),
    secondaryMetrics: [
      metric("Products surfaced", snapshot.product_recommended, Math.max(3, snapshot.product_recommended), "recommended product events", "count"),
      metric("Catalog score", activeProducts.length ? 100 : 0, 100, "active products with commerce-ready metadata"),
    ],
    setupSteps: [
      "Open Analytics and identify products with high recommendation volume but weak clicks.",
      "Update product images, product URLs, buyer needs and semantic text for those products.",
      "Use the public preview to confirm result cards still render cleanly.",
    ],
    successCriteria: [
      "Buy click rate reaches 25% or improves by at least 10 percentage points.",
      "Top recommended products all have product URLs and image URLs.",
      "Explanation grounding remains passing in Preflight.",
    ],
    rollbackPlan: "Undo product copy changes if recommendations become less grounded or click rate falls.",
    href: "/dashboard/products",
    cta: "Improve products",
    blockers: [...finderBlockers, !hasProductUrls(activeProducts) ? "Every active product needs a product URL before click-through tests are valid." : ""].filter(Boolean),
    sampleSizeNote: "Use at least 30 completed journeys before judging result-card click-through.",
  });

  addExperiment(experiments, {
    id: "inline-semantic-search",
    title: "Test inline semantic search on category pages",
    surface: "search",
    priority: discovery.summary.missingTermSignals || discovery.summary.zeroResultJourneys ? "high" : "medium",
    status: experimentStatus(finderBlockers, discovery.score, 82, eventCount(searchEvents, "search")),
    owner: "Catalog",
    hypothesis: "An inline search placement will capture shopper language that a fixed quiz misses, then reveal catalog vocabulary gaps.",
    evidence: `${discovery.score}% discovery score · ${discovery.summary.missingTermSignals} missing term signal${discovery.summary.missingTermSignals === 1 ? "" : "s"}.`,
    audience: "Collection-page shoppers who know the problem/outcome but not the product name.",
    control: "Standard category browsing and filters.",
    variant: "Inline Sellentum semantic search snippet with category placement attribution.",
    primaryMetric: metric("Discovery score", discovery.score, 82, "coverage of no-result, thin-result and missing-language signals"),
    secondaryMetrics: [
      metric("Missing terms", discovery.summary.missingTermSignals, 0, "uncovered shopper language signals", "count"),
      metric("Search events", searchEvents.length, 25, "events attributed to semantic search", "count"),
    ],
    setupSteps: [
      "Open Launch Channels and copy the category inline search snippet.",
      "Install it on one high-intent collection page.",
      "After traffic arrives, add missing terms to product tags, buyer needs or semantic text.",
    ],
    successCriteria: [
      "Search produces fewer zero-result journeys.",
      "At least five new shopper terms are either covered or intentionally rejected.",
      "Discovery score improves by 10 points.",
    ],
    rollbackPlan: "Remove the inline placement if it creates unhelpful queries without recoverable catalog improvements.",
    href: "/dashboard/channels",
    cta: "Copy search channel",
    blockers: finderBlockers,
    sampleSizeNote: "Collect at least 50 search submissions before prioritizing term-gap work.",
  });

  addExperiment(experiments, {
    id: "pdp-bundle-configurator",
    title: "Test PDP bundle configurator",
    surface: "configurator",
    priority: configurator ? "medium" : "high",
    status: experimentStatus(configuratorBlockers, stageRate(eventCount(configuratorEvents.filter((event) => event.event_type === "buy_click"), "configurator"), eventCount(configuratorEvents.filter((event) => event.event_type === "quiz_complete"), "configurator")), 20, configuratorEvents.length),
    owner: "Merchandising",
    hypothesis: "A product-linked configurator on PDPs will increase confidence for bundles and accessories.",
    evidence: configurator ? `${configurator.name} has ${configurator.steps.length} configurator step${configurator.steps.length === 1 ? "" : "s"} available.` : "No configurator is available yet.",
    audience: "PDP visitors comparing bundles, variants, accessories or compatibility choices.",
    control: "Standard PDP recommendations or static accessory modules.",
    variant: "Inline Sellentum configurator with PDP bundle placement attribution.",
    primaryMetric: metric("Configurator click rate", stageRate(eventCount(configuratorEvents.filter((event) => event.event_type === "buy_click"), "configurator"), eventCount(configuratorEvents.filter((event) => event.event_type === "quiz_complete"), "configurator")), 20, "configurator buy clicks divided by completed configurations"),
    secondaryMetrics: [
      metric("Configurator events", configuratorEvents.length, 25, "events attributed to configurator", "count"),
      metric("Install-ready channels", channels.summary.installReady, channels.summary.channels, "channel snippets without blockers", "count"),
    ],
    setupSteps: [
      "Open Configurators and confirm required steps, linked products and compatibility rules pass readiness.",
      "Open Launch Channels and copy the PDP bundle configurator snippet.",
      "Install on one product detail template before expanding site-wide.",
    ],
    successCriteria: [
      "Configurator buy-click rate reaches 20%.",
      "Compatibility guidance does not produce blocked checkout paths.",
      "PDP channel events include placement attribution.",
    ],
    rollbackPlan: "Switch the PDP placement back to the standard product CTA if bundle clicks or compatibility QA regress.",
    href: "/dashboard/configurators",
    cta: "Open configurator",
    blockers: configuratorBlockers,
    sampleSizeNote: "Use at least 25 completed configurator journeys before judging PDP bundle impact.",
  });

  addExperiment(experiments, {
    id: "channel-attribution-contract",
    title: "Test channelized attribution contract",
    surface: "measurement",
    priority: attribution.summary.attributionRate < 80 ? "critical" : "low",
    status: experimentStatus([], attribution.summary.attributionRate, 90, events.length),
    owner: "Developer",
    hypothesis: "Channelized snippets will make launch decisions safer by separating homepage, category, PDP and support traffic.",
    evidence: `${attribution.summary.attributionRate}% attribution rate across ${events.length} event${events.length === 1 ? "" : "s"}.`,
    audience: "Internal QA and storefront launch traffic.",
    control: "Generic embed snippets with inferred page context only.",
    variant: "Launch Channels snippets with explicit source, campaign and placement labels.",
    primaryMetric: metric("Attribution rate", attribution.summary.attributionRate, 90, "events with source/campaign/placement/page context"),
    secondaryMetrics: [
      metric("Install-ready channels", channels.summary.installReady, channels.summary.channels, "ready channel snippets", "count"),
      metric("Analytics QA", analyticsQuality.score, 85, "event-contract health"),
    ],
    setupSteps: [
      "Copy the Launch Channels packet.",
      "Install one labelled snippet per target placement.",
      "Complete one QA journey per placement and verify Analytics attribution.",
    ],
    successCriteria: [
      "Attribution rate reaches at least 90%.",
      "Every live placement has source, campaign and placement labels.",
      "Analytics QA remains above 85%.",
    ],
    rollbackPlan: "Re-copy the latest snippet or remove duplicate widget installs if event sequence quality drops.",
    href: "/dashboard/channels",
    cta: "Open channels",
    blockers: [],
    sampleSizeNote: "This is a QA experiment; one complete journey per channel is enough to validate instrumentation.",
  });

  const guardrails: ExperimentGuardrail[] = [
    {
      id: "analytics-quality",
      label: "Analytics trust",
      detail: `${analyticsQuality.score}% event-contract quality. Experiments should not be judged below 85%.`,
      status: analyticsQuality.score >= 85 ? "pass" : analyticsQuality.score >= 60 ? "warn" : "fail",
    },
    {
      id: "published-experience",
      label: "Published experience",
      detail: finder || configurator ? "At least one shopper-facing experience exists for launch testing." : "Create or publish a finder/configurator before running experiments.",
      status: finder || configurator ? "pass" : "fail",
    },
    {
      id: "deterministic-selection",
      label: "Deterministic product selection",
      detail: "Experiments should change copy, placement or rules; product selection remains rule/semantic-score based before AI explanations.",
      status: "pass",
    },
    {
      id: "sample-size",
      label: "Sample-size discipline",
      detail: snapshot.sessions >= 100 ? `${snapshot.sessions} sessions are enough for stronger reads.` : `${snapshot.sessions} sessions are directional; avoid overreacting to small samples.`,
      status: snapshot.sessions >= 100 ? "pass" : snapshot.sessions >= 10 ? "warn" : "warn",
    },
  ];

  const sortedExperiments = experiments.sort((a, b) => statusRank(b.status) - statusRank(a.status) || priorityRank(b.priority) - priorityRank(a.priority) || a.title.localeCompare(b.title));
  const ready = sortedExperiments.filter((experiment) => experiment.status === "ready").length;
  const learning = sortedExperiments.filter((experiment) => experiment.status === "learning").length;
  const blocked = sortedExperiments.filter((experiment) => experiment.status === "blocked").length;
  const winners = sortedExperiments.filter((experiment) => experiment.status === "winner").length;
  const score = Math.round(
    analyticsQuality.score * 0.35
    + (finder || configurator ? 15 : 0)
    + (channels.summary.installReady / Math.max(1, channels.summary.channels)) * 20
    + ((ready + learning + winners) / Math.max(1, sortedExperiments.length)) * 30,
  );
  const status: ExperimentPlanningReport["status"] = guardrails.some((guardrail) => guardrail.status === "fail") || blocked >= sortedExperiments.length / 2 ? "blocked" : learning || winners ? "learning" : "ready";
  const nextExperiment = sortedExperiments.find((experiment) => experiment.status === "ready" || experiment.status === "learning") || sortedExperiments[0];

  return {
    status,
    score,
    headline: status === "blocked" ? "Fix launch measurement before experimenting." : status === "learning" ? "Experiments are collecting directional signal." : "Ready to run the next controlled launch test.",
    summary: {
      experiments: sortedExperiments.length,
      ready,
      learning,
      blocked,
      winners,
      analyticsQualityScore: analyticsQuality.score,
      startRate,
      completionRate,
      clickRate,
    },
    experiments: sortedExperiments,
    guardrails,
    nextExperiment,
    packet: formatPacket(sortedExperiments, guardrails),
  };
}
