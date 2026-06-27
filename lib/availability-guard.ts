import { buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildCommercialImpactReport } from "./commercial-impact";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "./types";
import { formatCurrency } from "./utils";

export type AvailabilityStatus = "empty" | "needs-attention" | "watch" | "ready";
export type AvailabilityProductStatus = "ready" | "missing-url" | "missing-media" | "inactive" | "demand-blocked";
export type AvailabilityCheckStatus = "pass" | "warn" | "fail";
export type AvailabilityActionPriority = "critical" | "high" | "medium" | "low";

export type AvailabilityProduct = {
  productId: string;
  productName: string;
  category: string;
  price: number;
  active: boolean;
  productUrl: string;
  imageUrl: string;
  recommended: number;
  clicks: number;
  clickRate: number;
  status: AvailabilityProductStatus;
  blockers: string[];
  action: string;
};

export type AvailabilityReference = {
  id: string;
  source: "finder override" | "configurator option" | "analytics event";
  label: string;
  productId?: string;
  productName?: string;
  status: AvailabilityCheckStatus;
  evidence: string;
  actionHref: string;
};

export type AvailabilityCheck = {
  id: string;
  label: string;
  status: AvailabilityCheckStatus;
  detail: string;
  evidence: string;
};

export type AvailabilityAction = {
  id: string;
  priority: AvailabilityActionPriority;
  title: string;
  detail: string;
  evidence: string;
  actionHref: string;
  actionLabel: string;
};

export type AvailabilityGuardReport = {
  status: AvailabilityStatus;
  score: number;
  headline: string;
  summary: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    commerceUrlCoverage: number;
    imageCoverage: number;
    unavailableDemandProducts: number;
    missingCommerceUrls: number;
    missingImages: number;
    staleReferences: number;
    configuratorLinkIssues: number;
    overrideIssues: number;
    orphanAnalyticsEvents: number;
    recommendations: number;
    buyClicks: number;
    assistedValue: number;
    clickRate: number;
  };
  products: AvailabilityProduct[];
  references: AvailabilityReference[];
  checks: AvailabilityCheck[];
  actions: AvailabilityAction[];
  packet: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productDemand(events: AnalyticsEvent[], products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const byName = new Map(products.map((product) => [normalize(product.name), product]));
  const demand = new Map<string, { recommended: number; clicks: number }>();
  const orphanEvents: AvailabilityReference[] = [];

  const productForEvent = (event: AnalyticsEvent) => {
    if (event.product_id && byId.has(event.product_id)) return byId.get(event.product_id);
    const productName = text(event.metadata?.product_name);
    return productName ? byName.get(normalize(productName)) : undefined;
  };

  for (const event of events) {
    if (event.event_type !== "product_recommended" && event.event_type !== "buy_click") continue;
    const product = productForEvent(event);
    if (!product) {
      orphanEvents.push({
        id: `event-${event.id}`,
        source: "analytics event",
        label: event.event_type,
        productId: event.product_id,
        productName: text(event.metadata?.product_name) || undefined,
        status: "fail",
        evidence: event.product_id ? `Event points at unknown product_id ${event.product_id}.` : "Event has no resolvable product identity.",
        actionHref: "/dashboard/analytics",
      });
      continue;
    }
    const current = demand.get(product.id) || { recommended: 0, clicks: 0 };
    if (event.event_type === "product_recommended") current.recommended += 1;
    if (event.event_type === "buy_click") current.clicks += 1;
    demand.set(product.id, current);
  }

  return { demand, orphanEvents };
}

function productStatus(product: Product, recommended: number, clicks: number): AvailabilityProductStatus {
  if (!product.active && (recommended || clicks)) return "demand-blocked";
  if (!product.active) return "inactive";
  if (!product.product_url) return "missing-url";
  if (!product.image_url) return "missing-media";
  return "ready";
}

function productBlockers(product: Product, status: AvailabilityProductStatus, recommended: number, clicks: number) {
  const blockers: string[] = [];
  if (!product.active) blockers.push("Inactive/unavailable");
  if (!product.product_url) blockers.push("Missing Buy Now URL");
  if (!product.image_url) blockers.push("Missing product image");
  if (status === "demand-blocked") blockers.push(`${recommended + clicks} demand event${recommended + clicks === 1 ? "" : "s"} still reference this unavailable product`);
  return blockers;
}

function buildProducts(products: Product[], events: AnalyticsEvent[]) {
  const { demand, orphanEvents } = productDemand(events, products);
  const rows = products.map((product) => {
    const stats = demand.get(product.id) || { recommended: 0, clicks: 0 };
    const status = productStatus(product, stats.recommended, stats.clicks);
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      price: product.price,
      active: product.active,
      productUrl: product.product_url,
      imageUrl: product.image_url,
      recommended: stats.recommended,
      clicks: stats.clicks,
      clickRate: stageRate(stats.clicks, stats.recommended),
      status,
      blockers: productBlockers(product, status, stats.recommended, stats.clicks),
      action: status === "ready"
        ? "Keep available for guided-selling runtime."
        : status === "missing-url"
          ? "Add a commerce URL before promoting this product."
          : status === "missing-media"
            ? "Add product imagery before scaling recommendations."
            : status === "demand-blocked"
              ? "Reactivate the product or remove stale demand paths immediately."
              : "Keep inactive products excluded from public recommendations.",
    } satisfies AvailabilityProduct;
  });
  return {
    products: rows.sort((a, b) => Number(a.status !== "ready") - Number(b.status !== "ready") || b.recommended + b.clicks - (a.recommended + a.clicks) || a.productName.localeCompare(b.productName)),
    orphanEvents,
  };
}

function buildReferences(products: Product[], quizzes: Quiz[], configurators: Configurator[], orphanEvents: AvailabilityReference[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const references: AvailabilityReference[] = [...orphanEvents];

  for (const quiz of quizzes) {
    for (const override of quiz.recommendation_overrides || []) {
      const product = byId.get(override.product_id);
      const status: AvailabilityCheckStatus = product?.active ? "pass" : "fail";
      references.push({
        id: `override-${quiz.id}-${override.id}`,
        source: "finder override",
        label: `${quiz.name} · ${override.action}`,
        productId: override.product_id,
        productName: product?.name,
        status,
        evidence: product ? product.active ? `${product.name} is active for this ${override.action} override.` : `${product.name} is inactive but still used by a ${override.action} override.` : `Override points at missing product ${override.product_id}.`,
        actionHref: "/dashboard/merchandising",
      });
    }
  }

  for (const configurator of configurators) {
    for (const step of configurator.steps) {
      for (const option of step.options.filter((item) => item.product_id)) {
        const product = byId.get(option.product_id || "");
        const status: AvailabilityCheckStatus = product?.active ? "pass" : "fail";
        references.push({
          id: `config-${configurator.id}-${option.id}`,
          source: "configurator option",
          label: `${configurator.name} · ${option.label}`,
          productId: option.product_id,
          productName: product?.name,
          status,
          evidence: product ? product.active ? `${option.label} links to active product ${product.name}.` : `${option.label} links to inactive product ${product.name}.` : `${option.label} points at missing product ${option.product_id}.`,
          actionHref: "/dashboard/configurators",
        });
      }
    }
  }

  return references.sort((a, b) => a.status.localeCompare(b.status) || a.source.localeCompare(b.source) || a.label.localeCompare(b.label));
}

function score(summary: AvailabilityGuardReport["summary"]) {
  if (!summary.totalProducts) return 0;
  return Math.max(0, Math.min(100, Math.round(
    35 +
    summary.commerceUrlCoverage * 0.22 +
    summary.imageCoverage * 0.12 +
    Math.min(15, summary.activeProducts * 4) +
    (summary.unavailableDemandProducts ? -25 : 8) -
    summary.staleReferences * 12 -
    summary.configuratorLinkIssues * 10 -
    summary.overrideIssues * 8 -
    summary.orphanAnalyticsEvents * 8,
  )));
}

function status(summary: AvailabilityGuardReport["summary"], scoreValue: number): AvailabilityStatus {
  if (!summary.totalProducts) return "empty";
  if (summary.unavailableDemandProducts || summary.staleReferences || summary.configuratorLinkIssues || summary.overrideIssues) return "needs-attention";
  if (scoreValue >= 84 && summary.commerceUrlCoverage >= 90) return "ready";
  return "watch";
}

function headline(reportStatus: AvailabilityStatus) {
  if (reportStatus === "empty") return "Import products before proving availability guardrails.";
  if (reportStatus === "needs-attention") return "Unavailable products or stale references could leak into guided-selling workflows.";
  if (reportStatus === "watch") return "Availability is usable, but Buy Now URLs, imagery or telemetry references need tightening.";
  return "Active catalog, checkout URLs and runtime references are ready for safe recommendations.";
}

function buildChecks(summary: AvailabilityGuardReport["summary"]): AvailabilityCheck[] {
  return [
    {
      id: "active-catalog",
      label: "Active catalog",
      status: summary.activeProducts >= 2 ? "pass" : summary.activeProducts ? "warn" : "fail",
      detail: summary.activeProducts >= 2 ? "Findly has enough active products to compare and recommend." : "Findly needs at least two active products for useful recommendations.",
      evidence: `${summary.activeProducts}/${summary.totalProducts} product${summary.totalProducts === 1 ? "" : "s"} active.`,
    },
    {
      id: "commerce-url-coverage",
      label: "Buy Now URL coverage",
      status: summary.missingCommerceUrls ? "warn" : "pass",
      detail: summary.missingCommerceUrls ? "Some active products can be recommended but cannot send shoppers to checkout." : "Every active product has a commerce URL.",
      evidence: `${Math.round(summary.commerceUrlCoverage)}% URL coverage; ${summary.missingCommerceUrls} missing.`,
    },
    {
      id: "unavailable-demand",
      label: "Unavailable demand",
      status: summary.unavailableDemandProducts ? "fail" : "pass",
      detail: summary.unavailableDemandProducts ? "Analytics still shows demand for products that are currently inactive." : "No current demand events point at inactive products.",
      evidence: `${summary.unavailableDemandProducts} unavailable product${summary.unavailableDemandProducts === 1 ? "" : "s"} with recommendation/click demand.`,
    },
    {
      id: "runtime-references",
      label: "Runtime references",
      status: summary.staleReferences || summary.configuratorLinkIssues || summary.overrideIssues ? "fail" : "pass",
      detail: "Finder overrides and configurator product links must resolve to active catalog products.",
      evidence: `${summary.staleReferences} stale references, ${summary.configuratorLinkIssues} configurator issue${summary.configuratorLinkIssues === 1 ? "" : "s"}, ${summary.overrideIssues} override issue${summary.overrideIssues === 1 ? "" : "s"}.`,
    },
    {
      id: "analytics-attribution",
      label: "Product event attribution",
      status: summary.orphanAnalyticsEvents ? "warn" : "pass",
      detail: summary.orphanAnalyticsEvents ? "Some analytics product events cannot be tied back to a current catalog item." : "Product recommendation and click events resolve to catalog records.",
      evidence: `${summary.orphanAnalyticsEvents} orphan product event${summary.orphanAnalyticsEvents === 1 ? "" : "s"}.`,
    },
  ];
}

function buildActions(report: Omit<AvailabilityGuardReport, "actions" | "packet" | "headline" | "status" | "score">): AvailabilityAction[] {
  const actions: AvailabilityAction[] = [];
  if (!report.summary.totalProducts) {
    actions.push({
      id: "import-products",
      priority: "critical",
      title: "Import products before launch",
      detail: "Availability guardrails need catalog records before public finders, search or configurators can recommend safely.",
      evidence: "0 products in catalog.",
      actionHref: "/dashboard/products",
      actionLabel: "Import catalog",
    });
  }
  if (report.summary.unavailableDemandProducts) {
    actions.push({
      id: "resolve-unavailable-demand",
      priority: "critical",
      title: "Resolve demand for unavailable products",
      detail: "Products with current recommendation or click demand are inactive, which can confuse merchants and stale launch plans.",
      evidence: `${report.summary.unavailableDemandProducts} unavailable product${report.summary.unavailableDemandProducts === 1 ? "" : "s"} with demand.`,
      actionHref: "/dashboard/products",
      actionLabel: "Review availability",
    });
  }
  if (report.summary.configuratorLinkIssues) {
    actions.push({
      id: "repair-configurator-links",
      priority: "high",
      title: "Repair configurator product links",
      detail: "Configurator options should only point at active products before shoppers build bundles.",
      evidence: `${report.summary.configuratorLinkIssues} configurator product link issue${report.summary.configuratorLinkIssues === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Open configurators",
    });
  }
  if (report.summary.overrideIssues) {
    actions.push({
      id: "repair-override-links",
      priority: "high",
      title: "Repair merchandising override links",
      detail: "Pins, boosts and exclusions should not reference inactive or missing products.",
      evidence: `${report.summary.overrideIssues} override issue${report.summary.overrideIssues === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/merchandising",
      actionLabel: "Open merchandising",
    });
  }
  if (report.summary.missingCommerceUrls) {
    actions.push({
      id: "add-buy-urls",
      priority: "medium",
      title: "Add missing Buy Now URLs",
      detail: "Recommendations need direct commerce URLs so shoppers can act on product guidance.",
      evidence: `${report.summary.missingCommerceUrls} active product${report.summary.missingCommerceUrls === 1 ? "" : "s"} missing product_url.`,
      actionHref: "/dashboard/products",
      actionLabel: "Edit products",
    });
  }
  if (report.summary.orphanAnalyticsEvents) {
    actions.push({
      id: "clean-orphan-product-events",
      priority: "low",
      title: "Clean product event attribution",
      detail: "Analytics product events should resolve to current catalog records for reliable demand analysis.",
      evidence: `${report.summary.orphanAnalyticsEvents} orphan product event${report.summary.orphanAnalyticsEvents === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/analytics",
      actionLabel: "Inspect analytics",
    });
  }
  if (!actions.length) {
    actions.push({
      id: "keep-availability-qa",
      priority: "low",
      title: "Keep availability QA in the launch checklist",
      detail: "Rerun this guard after catalog imports, seasonal launches or product URL changes.",
      evidence: "No urgent availability blockers detected.",
      actionHref: "/dashboard/preflight",
      actionLabel: "Open preflight",
    });
  }
  return actions.slice(0, 5);
}

function buildPacket(report: Omit<AvailabilityGuardReport, "packet">) {
  return [
    "Findly Availability Guard packet",
    "",
    `Status: ${report.status} · Score: ${report.score}%`,
    `Headline: ${report.headline}`,
    "",
    "Availability summary",
    `- Active products: ${report.summary.activeProducts}/${report.summary.totalProducts}`,
    `- Commerce URL coverage: ${Math.round(report.summary.commerceUrlCoverage)}%`,
    `- Image coverage: ${Math.round(report.summary.imageCoverage)}%`,
    `- Unavailable demand products: ${report.summary.unavailableDemandProducts}`,
    `- Runtime stale references: ${report.summary.staleReferences}`,
    `- Assisted value: ${formatCurrency(report.summary.assistedValue)}`,
    "",
    "Guardrail checks",
    ...report.checks.map((check) => `- [${check.status}] ${check.label}: ${check.evidence}`),
    "",
    "Top product rows",
    ...report.products.slice(0, 6).map((product, index) => `${index + 1}. [${product.status}] ${product.productName}: ${product.blockers.join(", ") || "Ready"}`),
    "",
    "Action queue",
    ...report.actions.map((action, index) => `${index + 1}. [${action.priority}] ${action.title}: ${action.detail}`),
  ].join("\n");
}

export function buildAvailabilityGuardReport({ products, quizzes, configurators, events }: { products: Product[]; quizzes: Quiz[]; configurators: Configurator[]; events: AnalyticsEvent[] }): AvailabilityGuardReport {
  const { products: productRows, orphanEvents } = buildProducts(products, events);
  const references = buildReferences(products, quizzes, configurators, orphanEvents);
  const activeProducts = products.filter((product) => product.active);
  const snapshot = buildAnalyticsSnapshot(events);
  const commercial = buildCommercialImpactReport(events, products);
  const unavailableDemandProducts = productRows.filter((product) => product.status === "demand-blocked").length;
  const missingCommerceUrls = activeProducts.filter((product) => !product.product_url).length;
  const missingImages = activeProducts.filter((product) => !product.image_url).length;
  const failedReferences = references.filter((reference) => reference.status === "fail");
  const configuratorLinkIssues = failedReferences.filter((reference) => reference.source === "configurator option").length;
  const overrideIssues = failedReferences.filter((reference) => reference.source === "finder override").length;
  const orphanAnalyticsEvents = failedReferences.filter((reference) => reference.source === "analytics event").length;
  const summary = {
    totalProducts: products.length,
    activeProducts: activeProducts.length,
    inactiveProducts: products.length - activeProducts.length,
    commerceUrlCoverage: stageRate(activeProducts.length - missingCommerceUrls, activeProducts.length),
    imageCoverage: stageRate(activeProducts.length - missingImages, activeProducts.length),
    unavailableDemandProducts,
    missingCommerceUrls,
    missingImages,
    staleReferences: failedReferences.length,
    configuratorLinkIssues,
    overrideIssues,
    orphanAnalyticsEvents,
    recommendations: snapshot.product_recommended,
    buyClicks: snapshot.buy_click,
    assistedValue: commercial.summary.influencedRevenue,
    clickRate: stageRate(snapshot.clicked, snapshot.completed || snapshot.product_recommended),
  };
  const scoreValue = score(summary);
  const reportStatus = status(summary, scoreValue);
  const partial = {
    status: reportStatus,
    score: scoreValue,
    headline: headline(reportStatus),
    summary,
    products: productRows,
    references,
    checks: buildChecks(summary),
  };
  const actions = buildActions(partial);
  return {
    ...partial,
    actions,
    packet: buildPacket({ ...partial, actions }),
  };
}
