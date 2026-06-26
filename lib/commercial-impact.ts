import { analyticsEventSessionId, buildAnalyticsSnapshot, stageRate } from "./analytics";
import type { AnalyticsEvent, Product } from "./types";

export type CommercialImpactStatus = "empty" | "building" | "risk" | "healthy";
export type CommercialImpactPriority = "critical" | "high" | "medium" | "low";

export type CommercialImpactProduct = {
  productId: string;
  productName: string;
  price: number;
  recommended: number;
  clicks: number;
  clickRate: number;
  influencedRevenue: number;
  unclickedValue: number;
};

export type CommercialImpactAction = {
  id: string;
  priority: CommercialImpactPriority;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  actionHref: string;
  metric: string;
};

export type CommercialImpactReport = {
  status: CommercialImpactStatus;
  score: number;
  headline: string;
  confidence: string;
  summary: {
    sessions: number;
    recommendations: number;
    completions: number;
    buyClicks: number;
    clickThroughRate: number;
    completionRate: number;
    recommendedValue: number;
    influencedRevenue: number;
    unclickedRecommendedValue: number;
    averageClickedProductValue: number;
    productsWithDemand: number;
    demandCoverageRate: number;
  };
  topProducts: CommercialImpactProduct[];
  actions: CommercialImpactAction[];
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productForEvent(event: AnalyticsEvent, productsById: Map<string, Product>, productsByName: Map<string, Product>) {
  if (event.product_id && productsById.has(event.product_id)) return productsById.get(event.product_id) || null;
  const productName = text(event.metadata?.product_name);
  return productName ? productsByName.get(normalize(productName)) || null : null;
}

function eventCommercialValue(event: AnalyticsEvent, product: Product | null) {
  const configuratorTotal = numberValue(event.metadata?.total);
  if (configuratorTotal > 0) return configuratorTotal;
  return product?.price || 0;
}

function addAction(actions: CommercialImpactAction[], action: CommercialImpactAction) {
  actions.push(action);
}

const priorityRank: Record<CommercialImpactPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildCommercialImpactReport(events: AnalyticsEvent[], products: Product[]): CommercialImpactReport {
  const activeProducts = products.filter((product) => product.active);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const productsByName = new Map(products.map((product) => [normalize(product.name), product]));
  const snapshot = buildAnalyticsSnapshot(events);
  const productStats = new Map<string, CommercialImpactProduct>();
  const recommendedPairs = new Map<string, { product: Product | null; value: number }>();
  const clickPairs = new Map<string, { product: Product | null; value: number }>();

  const ensureProductStats = (product: Product) => {
    if (!productStats.has(product.id)) {
      productStats.set(product.id, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        recommended: 0,
        clicks: 0,
        clickRate: 0,
        influencedRevenue: 0,
        unclickedValue: 0,
      });
    }
    return productStats.get(product.id)!;
  };

  for (const event of events) {
    if (event.event_type !== "product_recommended" && event.event_type !== "buy_click") continue;
    const product = productForEvent(event, productsById, productsByName);
    const sessionId = analyticsEventSessionId(event);
    const productKey = product?.id || text(event.metadata?.product_name) || event.product_id || event.id;
    const pairKey = `${sessionId}:${productKey}`;
    const value = eventCommercialValue(event, product);

    if (event.event_type === "product_recommended" && !recommendedPairs.has(pairKey)) {
      recommendedPairs.set(pairKey, { product, value });
      if (product) ensureProductStats(product).recommended += 1;
    }

    if (event.event_type === "buy_click" && !clickPairs.has(pairKey)) {
      clickPairs.set(pairKey, { product, value });
      if (product) {
        const stats = ensureProductStats(product);
        stats.clicks += 1;
        stats.influencedRevenue += value;
      }
    }
  }

  const recommendedValue = [...recommendedPairs.values()].reduce((sum, item) => sum + item.value, 0);
  const influencedRevenue = [...clickPairs.values()].reduce((sum, item) => sum + item.value, 0);
  const unclickedRecommendedValue = [...recommendedPairs.entries()].reduce((sum, [key, item]) => sum + (clickPairs.has(key) ? 0 : item.value), 0);
  const unclickedProductSessions = Math.max(0, recommendedPairs.size - [...recommendedPairs.keys()].filter((key) => clickPairs.has(key)).length);

  const topProducts = [...productStats.values()].map((stats) => ({
    ...stats,
    clickRate: stageRate(stats.clicks, stats.recommended),
    unclickedValue: Math.max(0, stats.recommended - stats.clicks) * stats.price,
  })).sort((a, b) => b.influencedRevenue - a.influencedRevenue || b.clicks - a.clicks || b.recommended - a.recommended || a.productName.localeCompare(b.productName));

  const productsWithDemand = topProducts.filter((product) => product.recommended > 0 || product.clicks > 0).length;
  const clickThroughRate = stageRate(snapshot.clicked, snapshot.completed);
  const completionRate = stageRate(snapshot.completed, snapshot.started);
  const demandCoverageRate = activeProducts.length ? productsWithDemand / activeProducts.length * 100 : 0;
  const averageClickedProductValue = clickPairs.size ? influencedRevenue / clickPairs.size : 0;
  const actions: CommercialImpactAction[] = [];

  if (!events.length) {
    addAction(actions, {
      id: "capture-first-impact-session",
      priority: "critical",
      title: "Capture the first impact session",
      detail: "There are no analytics events in this filter, so Findly cannot estimate influenced product value yet.",
      evidence: "0 sessions, 0 recommendations and 0 buy clicks captured.",
      recommendation: "Open a published embed, complete a journey and click a product CTA to prove the full impact loop.",
      actionHref: "/dashboard/launch",
      metric: "0 sessions",
    });
  }

  if (snapshot.completed > 0 && snapshot.clicked === 0) {
    addAction(actions, {
      id: "recover-result-clicks",
      priority: "high",
      title: "Turn completed journeys into buy clicks",
      detail: "Shoppers are reaching recommendations, but no product CTA has been clicked in this filter.",
      evidence: `${snapshot.completed} completed journey${snapshot.completed === 1 ? "" : "s"} and 0 buy clicks.`,
      recommendation: "Review product URLs, result-card copy, imagery and CTA language before changing the recommendation model.",
      actionHref: "/dashboard/settings",
      metric: "0% click-through",
    });
  }

  if (snapshot.completed >= 3 && clickThroughRate < 25) {
    addAction(actions, {
      id: "improve-assisted-click-rate",
      priority: "high",
      title: "Improve assisted click-through",
      detail: "The result-to-buy-click rate is below the early MVP target for guided selling experiences.",
      evidence: `${Math.round(clickThroughRate)}% of completed journeys clicked through.`,
      recommendation: "Tighten explanation copy, show stronger product proof points and test a more direct button label.",
      actionHref: "/dashboard/lab",
      metric: `${Math.round(clickThroughRate)}% CTR`,
    });
  }

  if (unclickedRecommendedValue > influencedRevenue && unclickedRecommendedValue >= averageClickedProductValue) {
    addAction(actions, {
      id: "recover-unclicked-value",
      priority: influencedRevenue ? "medium" : "high",
      title: "Recover unclicked recommendation value",
      detail: "A meaningful amount of recommended catalog value is being surfaced without a matching product click.",
      evidence: `${unclickedProductSessions} recommended product-session${unclickedProductSessions === 1 ? "" : "s"} did not produce a buy click.`,
      recommendation: "Inspect the stalled product rows and improve price framing, product URLs, imagery and recommendation explanations.",
      actionHref: "/dashboard/products",
      metric: `${Math.round(unclickedRecommendedValue)} unclicked value`,
    });
  }

  const stalledProduct = topProducts.find((product) => product.recommended >= 2 && product.clicks === 0);
  if (stalledProduct) {
    addAction(actions, {
      id: `fix-stalled-${stalledProduct.productId}`,
      priority: "medium",
      title: `Fix stalled demand for ${stalledProduct.productName}`,
      detail: "This product is being recommended repeatedly without receiving buy-click intent.",
      evidence: `${stalledProduct.recommended} recommendations, 0 buy clicks and ${Math.round(stalledProduct.unclickedValue)} in surfaced value.`,
      recommendation: "Check its image, commerce URL, price positioning and whether the selected shopper answers truly justify this match.",
      actionHref: "/dashboard/products",
      metric: "0% product CTR",
    });
  }

  const winner = topProducts.find((product) => product.clicks > 0);
  if (winner) {
    addAction(actions, {
      id: `scale-winner-${winner.productId}`,
      priority: "low",
      title: `Scale the winning path for ${winner.productName}`,
      detail: "This product is producing measurable buy-click intent from guided discovery sessions.",
      evidence: `${winner.clicks} buy click${winner.clicks === 1 ? "" : "s"} and ${Math.round(winner.influencedRevenue)} in assisted value.`,
      recommendation: "Use its matched answers and search language in campaigns, PDP copy and additional finder branches.",
      actionHref: "/dashboard/analytics",
      metric: `${Math.round(winner.clickRate)}% product CTR`,
    });
  }

  if (activeProducts.length >= 3 && demandCoverageRate < 50 && snapshot.product_recommended > 0) {
    addAction(actions, {
      id: "expand-demand-coverage",
      priority: "medium",
      title: "Broaden catalog demand coverage",
      detail: "Only a small share of the active catalog is being surfaced or clicked in this analytics filter.",
      evidence: `${productsWithDemand}/${activeProducts.length} active products have recommendation or click evidence.`,
      recommendation: "Review quiz rules and semantic search terms so healthy products are not invisible to the guided experience.",
      actionHref: "/dashboard/lab",
      metric: `${Math.round(demandCoverageRate)}% coverage`,
    });
  }

  if (!actions.length) {
    addAction(actions, {
      id: "keep-measuring-commercial-loop",
      priority: "low",
      title: "Keep measuring the commercial loop",
      detail: "The selected filter has enough signal to estimate assisted product value without an urgent blocker.",
      evidence: `${snapshot.clicked} buy click${snapshot.clicked === 1 ? "" : "s"} from ${snapshot.completed} completed journey${snapshot.completed === 1 ? "" : "s"}.`,
      recommendation: "Compare experience filters weekly and use the highest-value paths to refine campaigns and catalog copy.",
      actionHref: "/dashboard/analytics",
      metric: `${Math.round(clickThroughRate)}% CTR`,
    });
  }

  const score = !events.length ? 0 : Math.max(0, Math.min(100, Math.round(
    (snapshot.clicked ? 25 : 0) +
    Math.min(30, clickThroughRate * 0.3) +
    Math.min(25, completionRate * 0.25) +
    Math.min(20, demandCoverageRate * 0.2),
  )));

  const status: CommercialImpactStatus = !events.length
    ? "empty"
    : snapshot.clicked === 0 || (snapshot.completed >= 3 && clickThroughRate < 15)
      ? "risk"
      : score >= 70
        ? "healthy"
        : "building";

  const headline = status === "empty"
    ? "No commercial signal has been captured yet."
    : status === "risk"
      ? "Commercial intent is leaking after recommendations."
      : status === "healthy"
        ? "Guided discovery is creating measurable buy intent."
        : "Commercial signal is building; keep tightening the loop.";

  return {
    status,
    score,
    headline,
    confidence: "Directional: based on Findly recommendation and buy-click events, not checkout-order attribution.",
    summary: {
      sessions: snapshot.sessions,
      recommendations: snapshot.product_recommended,
      completions: snapshot.quiz_complete,
      buyClicks: snapshot.buy_click,
      clickThroughRate,
      completionRate,
      recommendedValue,
      influencedRevenue,
      unclickedRecommendedValue,
      averageClickedProductValue,
      productsWithDemand,
      demandCoverageRate,
    },
    topProducts,
    actions: actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id)).slice(0, 6),
  };
}
