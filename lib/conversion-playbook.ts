import { buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildAnalyticsQualityReport } from "./analytics-quality";
import { analyzeCatalogIntelligence } from "./catalog-intelligence";
import { buildDiscoveryGapReport } from "./discovery-gaps";
import { buildZeroPartyInsights } from "./insights";
import { buildRecommendationQaReport } from "./recommendation-qa";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type ConversionPlaybookPriority = "critical" | "high" | "medium" | "low";
export type ConversionPlaybookImpact = "measurement" | "conversion" | "discovery" | "catalog" | "recommendation";

export type ConversionPlaybookAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  priority: ConversionPlaybookPriority;
  impact: ConversionPlaybookImpact;
  metricLabel: string;
  metricValue: string;
  href: string;
  cta: string;
};

export type ConversionPlaybook = {
  status: "ready" | "watch" | "blocked";
  score: number;
  headline: string;
  summary: {
    sessions: number;
    startRate: number;
    completionRate: number;
    clickRate: number;
    analyticsQualityScore: number;
    discoveryScore: number;
    catalogScore: number;
    recommendationQaScore: number;
  };
  actions: ConversionPlaybookAction[];
};

function priorityRank(priority: ConversionPlaybookPriority) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function addAction(actions: ConversionPlaybookAction[], action: ConversionPlaybookAction) {
  if (!actions.some((item) => item.id === action.id)) actions.push(action);
}

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function scoreFromRate(value: number, target: number) {
  return Math.max(0, Math.min(100, Math.round(value / target * 100)));
}

export function buildConversionPlaybook({
  products,
  quizzes,
  configurators,
  events,
  settings,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
}): ConversionPlaybook {
  const snapshot = buildAnalyticsSnapshot(events);
  const analyticsQuality = buildAnalyticsQualityReport(events);
  const discovery = buildDiscoveryGapReport(events, products);
  const zeroParty = buildZeroPartyInsights(events, products);
  const catalog = analyzeCatalogIntelligence(products);
  const recommendationQa = buildRecommendationQaReport(quizzes, products);
  const startRate = stageRate(snapshot.started, snapshot.viewed);
  const completionRate = stageRate(snapshot.completed, snapshot.started);
  const clickRate = stageRate(snapshot.clicked, snapshot.completed);
  const actions: ConversionPlaybookAction[] = [];
  const activeProducts = products.filter((product) => product.active).length;
  const publishedFinders = quizzes.filter((quiz) => quiz.published).length;
  const publishedConfigurators = configurators.filter((configurator) => configurator.published).length;

  if (analyticsQuality.score < 85) {
    addAction(actions, {
      id: "fix-measurement",
      title: "Trust the measurement before tuning",
      detail: "Conversion optimization needs clean event order, session IDs, result counts and product attribution.",
      evidence: `${analyticsQuality.score}% Analytics QA · ${analyticsQuality.summary.missingRequiredMetadata + analyticsQuality.summary.sequenceIssues + analyticsQuality.summary.productEventsWithoutProduct} telemetry issue${analyticsQuality.summary.missingRequiredMetadata + analyticsQuality.summary.sequenceIssues + analyticsQuality.summary.productEventsWithoutProduct === 1 ? "" : "s"}.`,
      recommendation: "Run the storefront QA runbook, then rerun Preflight before judging shopper behaviour.",
      priority: analyticsQuality.score < 65 ? "critical" : "high",
      impact: "measurement",
      metricLabel: "Analytics QA",
      metricValue: pct(analyticsQuality.score),
      href: "/dashboard/preflight",
      cta: "Run preflight",
    });
  }

  if (!snapshot.widget_view) {
    addAction(actions, {
      id: "generate-first-session",
      title: "Create the first live shopper session",
      detail: "The dashboard cannot detect conversion bottlenecks until a widget view, start, completion and click have happened.",
      evidence: "No widget views captured in the selected workspace data.",
      recommendation: "Open Launch Studio, preview the selected experience and complete one manual QA journey.",
      priority: "critical",
      impact: "measurement",
      metricLabel: "Widget views",
      metricValue: "0",
      href: "/dashboard/launch",
      cta: "Open Launch Studio",
    });
  }

  if (snapshot.viewed >= 3 && startRate < 55) {
    addAction(actions, {
      id: "improve-start-rate",
      title: "Make the first click more inviting",
      detail: "Shoppers are seeing the widget, but too few are starting the guided experience.",
      evidence: `${snapshot.started}/${snapshot.viewed} viewed sessions started · ${pct(startRate)} start rate.`,
      recommendation: "Test a more specific launcher label, welcome headline and first-question promise in Settings.",
      priority: "high",
      impact: "conversion",
      metricLabel: "Start rate",
      metricValue: pct(startRate),
      href: "/dashboard/settings",
      cta: "Tune widget copy",
    });
  }

  if (snapshot.started >= 3 && completionRate < 65) {
    addAction(actions, {
      id: "improve-completion-rate",
      title: "Shorten or clarify the journey",
      detail: "Started sessions are dropping before a result, which usually points to too much friction or confusing answer paths.",
      evidence: `${snapshot.completed}/${snapshot.started} started sessions completed · ${pct(completionRate)} completion rate.`,
      recommendation: "Use the Recommendation Lab to inspect paths, then reduce question friction or move hard constraints earlier.",
      priority: "high",
      impact: "conversion",
      metricLabel: "Completion rate",
      metricValue: pct(completionRate),
      href: "/dashboard/lab",
      cta: "Inspect paths",
    });
  }

  if (snapshot.completed >= 3 && clickRate < 20) {
    addAction(actions, {
      id: "improve-result-clicks",
      title: "Make recommended products easier to trust",
      detail: "Shoppers are reaching results but not clicking through to product pages.",
      evidence: `${snapshot.clicked}/${snapshot.completed} completed sessions clicked Buy Now · ${pct(clickRate)} click rate.`,
      recommendation: "Review product imagery, product URLs, pricing confidence and the top recommendation explanations.",
      priority: "high",
      impact: "conversion",
      metricLabel: "Buy click rate",
      metricValue: pct(clickRate),
      href: "/dashboard/products",
      cta: "Review products",
    });
  }

  if (recommendationQa.status === "fail") {
    addAction(actions, {
      id: "fix-recommendation-qa",
      title: "Fix no-result recommendation paths",
      detail: "Some synthetic shopper paths cannot return eligible products, which can create dead ends in the live widget.",
      evidence: `${recommendationQa.blockers.length} blocker${recommendationQa.blockers.length === 1 ? "" : "s"} · ${recommendationQa.score}% QA score.`,
      recommendation: "Replay failing scenarios in the lab and loosen brittle rules or add better mapped products.",
      priority: "critical",
      impact: "recommendation",
      metricLabel: "QA score",
      metricValue: pct(recommendationQa.score),
      href: "/dashboard/lab",
      cta: "Debug QA",
    });
  } else if (recommendationQa.status === "warn") {
    addAction(actions, {
      id: "deepen-recommendations",
      title: "Increase recommendation depth",
      detail: "Thin result sets leave shoppers without enough comparison confidence.",
      evidence: `${recommendationQa.warnings.length} thin scenario${recommendationQa.warnings.length === 1 ? "" : "s"} detected.`,
      recommendation: "Add alternate products, broaden mappings or make one hard constraint preference-only.",
      priority: "medium",
      impact: "recommendation",
      metricLabel: "QA score",
      metricValue: pct(recommendationQa.score),
      href: "/dashboard/quizzes",
      cta: "Tune rules",
    });
  }

  const topDiscoveryAction = discovery.actions[0];
  if (topDiscoveryAction) {
    addAction(actions, {
      id: `discovery-${topDiscoveryAction.id}`,
      title: topDiscoveryAction.title,
      detail: topDiscoveryAction.detail,
      evidence: topDiscoveryAction.evidence,
      recommendation: topDiscoveryAction.recommendation,
      priority: topDiscoveryAction.severity === "critical" ? "high" : topDiscoveryAction.severity === "watch" ? "medium" : "low",
      impact: "discovery",
      metricLabel: "Discovery score",
      metricValue: String(discovery.score),
      href: topDiscoveryAction.actionHref,
      cta: topDiscoveryAction.actionLabel,
    });
  }

  const stalledProduct = zeroParty.productDemand.find((item) => item.recommended >= 2 && item.clickRate < 20);
  if (stalledProduct) {
    addAction(actions, {
      id: `stalled-${stalledProduct.productId || stalledProduct.productName}`,
      title: `Improve ${stalledProduct.productName} click-through`,
      detail: "This product appears in recommendations but is not earning enough shopper clicks.",
      evidence: `${stalledProduct.recommended} recommendations · ${stalledProduct.clicks} clicks · ${pct(stalledProduct.clickRate)} click rate.`,
      recommendation: "Review image, description, price framing, product URL and whether the match explanation is convincing.",
      priority: "medium",
      impact: "conversion",
      metricLabel: "Product CTR",
      metricValue: pct(stalledProduct.clickRate),
      href: "/dashboard/products",
      cta: "Review product",
    });
  }

  const winner = zeroParty.productDemand.find((item) => item.clicks > 0 && item.clickRate >= 40);
  if (winner) {
    addAction(actions, {
      id: `winner-${winner.productId || winner.productName}`,
      title: `Double down on ${winner.productName}`,
      detail: "A product with strong click-through is giving you useful merchandising signal.",
      evidence: `${winner.productName} converts from recommendations at ${pct(winner.clickRate)}.`,
      recommendation: "Reuse its winning signals in quiz answer copy, collection copy or similar product tags.",
      priority: "low",
      impact: "conversion",
      metricLabel: "Winner CTR",
      metricValue: pct(winner.clickRate),
      href: "/dashboard/analytics",
      cta: "View demand",
    });
  }

  if (catalog.score < 80 || activeProducts < 3) {
    addAction(actions, {
      id: "strengthen-catalog",
      title: "Strengthen the recommendation catalog",
      detail: "A richer catalog gives the finder, advisor and search surfaces more reliable options to compare.",
      evidence: `${activeProducts} active products · ${catalog.score}% catalog score.`,
      recommendation: "Add products, buyer needs, semantic search text, images and product URLs before scaling traffic.",
      priority: activeProducts < 2 ? "critical" : "medium",
      impact: "catalog",
      metricLabel: "Catalog score",
      metricValue: pct(catalog.score),
      href: "/dashboard/products",
      cta: "Improve catalog",
    });
  }

  if (!publishedFinders && !publishedConfigurators) {
    addAction(actions, {
      id: "publish-experience",
      title: "Publish one discovery experience",
      detail: "Optimization starts after shoppers can use a finder, advisor, search surface or configurator.",
      evidence: "No published finder or configurator is available.",
      recommendation: "Use Launch Studio to generate and publish a finder from the active catalog.",
      priority: "critical",
      impact: "discovery",
      metricLabel: "Published",
      metricValue: "0",
      href: "/dashboard/launch",
      cta: "Launch finder",
    });
  }

  if (!actions.length) {
    addAction(actions, {
      id: "next-optimization-loop",
      title: "Run the next optimization loop",
      detail: "Core launch signals look healthy. The next win is to compare experience types and repeat the strongest path.",
      evidence: `${snapshot.sessions} sessions · ${pct(clickRate)} buy-click rate · ${settings.brand_name} branding active.`,
      recommendation: "Compare finder, advisor, search and configurator filters in Analytics, then turn the strongest intent into better catalog copy.",
      priority: "low",
      impact: "conversion",
      metricLabel: "Buy click rate",
      metricValue: pct(clickRate),
      href: "/dashboard/analytics",
      cta: "Compare channels",
    });
  }

  const funnelScore = Math.round((scoreFromRate(startRate, 65) + scoreFromRate(completionRate, 75) + scoreFromRate(clickRate, 25)) / 3);
  const score = Math.round((
    analyticsQuality.score +
    discovery.score +
    catalog.score +
    recommendationQa.score +
    funnelScore
  ) / 5);

  return {
    status: actions.some((action) => action.priority === "critical") ? "blocked" : actions.some((action) => action.priority === "high") ? "watch" : "ready",
    score,
    headline: score >= 85 ? "Optimization loop is healthy" : score >= 65 ? "Good base with clear tuning opportunities" : "Fix launch blockers before scaling traffic",
    summary: {
      sessions: snapshot.sessions,
      startRate: Math.round(startRate),
      completionRate: Math.round(completionRate),
      clickRate: Math.round(clickRate),
      analyticsQualityScore: analyticsQuality.score,
      discoveryScore: discovery.score,
      catalogScore: catalog.score,
      recommendationQaScore: recommendationQa.score,
    },
    actions: actions
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.title.localeCompare(b.title))
      .slice(0, 6),
  };
}
