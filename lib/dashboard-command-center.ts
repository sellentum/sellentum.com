import { buildAnalyticsSnapshot, buildAnalyticsTrends, countAnalyticsEvents, getAnalyticsPeriods } from "@/lib/analytics";
import { analyzeCatalogIntelligence } from "@/lib/catalog-intelligence";
import { analyzeConfiguratorReadiness } from "@/lib/configurator-readiness";
import { buildDiscoveryGapReport } from "@/lib/discovery-gaps";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import { buildRecommendationQaReport } from "@/lib/recommendation-qa";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type CommandCenterAction = {
  id: string;
  title: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
  href: string;
  label: string;
};

export type CommandCenterMilestone = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export type CommandCenterDay = {
  label: string;
  starts: number;
  completions: number;
  views: number;
};

export type CommandCenterExperienceMix = {
  finder: number;
  assistant: number;
  search: number;
  configurator: number;
};

export type DashboardCommandCenter = {
  snapshot: ReturnType<typeof buildAnalyticsSnapshot>;
  trends: ReturnType<typeof buildAnalyticsTrends>;
  catalogScore: number;
  catalogLabel: string;
  launchScore: number;
  launchLabel: string;
  discoveryScore: number;
  discoveryStatus: ReturnType<typeof buildDiscoveryGapReport>["status"];
  performance: CommandCenterDay[];
  maxPerformance: number;
  experienceMix: CommandCenterExperienceMix;
  milestones: CommandCenterMilestone[];
  actions: CommandCenterAction[];
  summary: {
    products: number;
    activeProducts: number;
    publishedFinders: number;
    readyFinders: number;
    publishedConfigurators: number;
    readyConfigurators: number;
    recommendationQaScore: number;
    discoveryGapSignals: number;
  };
};

function priorityRank(priority: CommandCenterAction["priority"]) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function addAction(actions: CommandCenterAction[], action: CommandCenterAction) {
  if (!actions.some((item) => item.id === action.id)) actions.push(action);
}

function buildPerformance(events: AnalyticsEvent[], days: number, referenceDate = new Date()): CommandCenterDay[] {
  return Array.from({ length: days }, (_, reverseIndex) => {
    const offset = days - 1 - reverseIndex;
    const day = new Date(referenceDate);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayEvents = events.filter((event) => {
      const date = new Date(event.created_at);
      return date >= day && date < next;
    });
    return {
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      views: countAnalyticsEvents(dayEvents, "widget_view"),
      starts: countAnalyticsEvents(dayEvents, "quiz_start"),
      completions: countAnalyticsEvents(dayEvents, "quiz_complete"),
    };
  });
}

export function buildDashboardCommandCenter({
  products,
  quizzes,
  configurators,
  events,
  settings,
  days = 14,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  days?: number;
}): DashboardCommandCenter {
  const periods = getAnalyticsPeriods(events, days);
  const snapshot = buildAnalyticsSnapshot(periods.current);
  const trends = buildAnalyticsTrends(periods.current, periods.previous);
  const catalog = analyzeCatalogIntelligence(products);
  const discovery = buildDiscoveryGapReport(periods.current, products);
  const finderReadiness = quizzes.map((quiz) => ({ quiz, report: analyzeQuizReadiness(quiz, products) }));
  const configuratorReadiness = configurators.map((configurator) => ({ configurator, report: analyzeConfiguratorReadiness(configurator, products) }));
  const recommendationQa = buildRecommendationQaReport(quizzes, products);
  const activeProducts = products.filter((product) => product.active).length;
  const publishedFinders = quizzes.filter((quiz) => quiz.published).length;
  const readyFinders = finderReadiness.filter(({ quiz, report }) => quiz.published && report.canPublish).length;
  const publishedConfigurators = configurators.filter((configurator) => configurator.published).length;
  const readyConfigurators = configuratorReadiness.filter(({ configurator, report }) => configurator.published && report.canPublish).length;
  const finderBlockers = finderReadiness.filter(({ quiz, report }) => quiz.published && !report.canPublish).length;
  const configuratorBlockers = configuratorReadiness.filter(({ configurator, report }) => configurator.published && !report.canPublish).length;
  const analyticsCoverage = snapshot.widget_view && snapshot.quiz_start && snapshot.quiz_complete ? 100 : snapshot.widget_view || snapshot.quiz_start || snapshot.quiz_complete ? 65 : 25;
  const launchScore = Math.round((
    catalog.score +
    (readyFinders ? 100 : publishedFinders ? 65 : 20) +
    Math.max(0, recommendationQa.score) +
    analyticsCoverage +
    (settings.brand_name && settings.button_text && /^#[0-9a-f]{6}$/i.test(settings.primary_color) ? 100 : 65)
  ) / 5);

  const performance = buildPerformance(periods.current, days);
  const maxPerformance = Math.max(1, ...performance.map((day) => Math.max(day.views, day.starts, day.completions)));
  const actions: CommandCenterAction[] = [];

  if (!products.length || activeProducts < 2) {
    addAction(actions, {
      id: "catalog-products",
      title: "Add more active products",
      detail: activeProducts ? "Sellentum needs at least two active products to compare and recommend reliably." : "Your catalog is empty, so no discovery experience can return real products yet.",
      priority: "critical",
      href: "/dashboard/products",
      label: "Add products",
    });
  }

  if (catalog.blockers.length || catalog.warnings.length) {
    const first = catalog.blockers[0] || catalog.warnings[0];
    addAction(actions, {
      id: "catalog-intelligence",
      title: first?.label || "Improve catalog intelligence",
      detail: first?.detail || "Structured tags, buyer needs, descriptions and commerce assets make recommendations more reliable.",
      priority: catalog.blockers.length ? "high" : "medium",
      href: "/dashboard/products",
      label: "Review catalog",
    });
  }

  if (!publishedFinders) {
    addAction(actions, {
      id: "publish-finder",
      title: "Publish a guided product finder",
      detail: "The finder is the core launch experience and also powers advisor/search context.",
      priority: "critical",
      href: "/dashboard/launch",
      label: "Launch finder",
    });
  } else if (finderBlockers) {
    addAction(actions, {
      id: "fix-finder-readiness",
      title: "Fix published finder blockers",
      detail: `${finderBlockers} published finder${finderBlockers === 1 ? "" : "s"} cannot pass readiness checks.`,
      priority: "critical",
      href: "/dashboard/quizzes",
      label: "Fix finder",
    });
  }

  if (recommendationQa.status === "fail") {
    addAction(actions, {
      id: "recommendation-qa",
      title: "Debug failing recommendation paths",
      detail: `${recommendationQa.blockers.length} synthetic path${recommendationQa.blockers.length === 1 ? "" : "s"} returned no eligible products.`,
      priority: "critical",
      href: "/dashboard/lab",
      label: "Open lab",
    });
  } else if (recommendationQa.status === "warn") {
    addAction(actions, {
      id: "recommendation-depth",
      title: "Improve recommendation depth",
      detail: `${recommendationQa.warnings.length} checked path${recommendationQa.warnings.length === 1 ? "" : "s"} had a thin recommendation set.`,
      priority: "medium",
      href: "/dashboard/lab",
      label: "Review paths",
    });
  }

  for (const action of discovery.actions.slice(0, 2)) {
    addAction(actions, {
      id: `discovery-${action.id}`,
      title: action.title,
      detail: action.detail,
      priority: action.severity === "critical" ? "high" : action.severity === "watch" ? "medium" : "low",
      href: action.actionHref,
      label: action.actionLabel,
    });
  }

  if (!snapshot.widget_view) {
    addAction(actions, {
      id: "install-widget",
      title: "Run an embedded widget session",
      detail: "No widget views were captured in the selected launch window, so analytics cannot prove the storefront loop yet.",
      priority: "medium",
      href: "/dashboard/settings",
      label: "Copy embed",
    });
  }

  if (configuratorBlockers) {
    addAction(actions, {
      id: "configurator-readiness",
      title: "Fix configurator readiness",
      detail: `${configuratorBlockers} published configurator${configuratorBlockers === 1 ? "" : "s"} have compatibility or linked-product blockers.`,
      priority: "medium",
      href: "/dashboard/configurators",
      label: "Fix configurator",
    });
  }

  const milestones: CommandCenterMilestone[] = [
    { id: "products", label: "Add active products", done: activeProducts >= 2, href: "/dashboard/products" },
    { id: "enrich", label: "Enrich catalog signals", done: catalog.enrichedProducts > 0 || catalog.score >= 80, href: "/dashboard/products" },
    { id: "publish", label: "Publish a finder", done: readyFinders > 0, href: "/dashboard/launch" },
    { id: "qa", label: "Pass recommendation QA", done: recommendationQa.status !== "fail" && recommendationQa.summary.scenariosChecked > 0, href: "/dashboard/preflight" },
    { id: "analytics", label: "Capture live analytics", done: snapshot.widget_view > 0 && snapshot.quiz_complete > 0, href: "/dashboard/analytics" },
  ];

  const assistantEvents = periods.current.filter((event) => event.metadata?.experience_type === "assistant").length;
  const searchEvents = periods.current.filter((event) => event.metadata?.experience_type === "search").length;
  const configuratorEvents = periods.current.filter((event) => event.metadata?.experience_type === "configurator").length;
  const finderEvents = periods.current.length - assistantEvents - searchEvents - configuratorEvents;

  return {
    snapshot,
    trends,
    catalogScore: catalog.score,
    catalogLabel: catalog.readinessLabel,
    launchScore,
    launchLabel: launchScore >= 85 ? "Launch ready" : launchScore >= 65 ? "Almost there" : "Needs setup",
    discoveryScore: discovery.score,
    discoveryStatus: discovery.status,
    performance,
    maxPerformance,
    experienceMix: {
      finder: Math.max(0, finderEvents),
      assistant: assistantEvents,
      search: searchEvents,
      configurator: configuratorEvents,
    },
    milestones,
    actions: actions
      .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.title.localeCompare(b.title))
      .slice(0, 5),
    summary: {
      products: products.length,
      activeProducts,
      publishedFinders,
      readyFinders,
      publishedConfigurators,
      readyConfigurators,
      recommendationQaScore: recommendationQa.score,
      discoveryGapSignals: discovery.summary.totalGapSignals,
    },
  };
}
