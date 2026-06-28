import { buildZeroPartyInsights } from "./insights";
import type { AnalyticsEvent, Product, Quiz, RecommendationOverride, RecommendationOverrideAction } from "@/lib/types";

export type MerchandisingStudioStatus = "healthy" | "watch" | "needs-attention";
export type MerchandisingControlStatus = "active" | "draft" | "stale" | "protected";
export type MerchandisingActionPriority = "critical" | "high" | "medium" | "low";
export type MerchandisingLaneStatus = "win" | "watch" | "hidden" | "controlled";

export type MerchandisingControl = {
  id: string;
  finderId: string;
  finderName: string;
  finderPublished: boolean;
  productId: string;
  productName: string;
  productActive: boolean;
  action: RecommendationOverrideAction;
  weight: number;
  note: string;
  status: MerchandisingControlStatus;
  evidence: string;
};

export type MerchandisingLane = {
  id: string;
  productId?: string;
  productName: string;
  label: string;
  status: MerchandisingLaneStatus;
  recommended: number;
  clicks: number;
  clickRate: number;
  controls: string[];
  evidence: string;
  recommendation: string;
};

export type MerchandisingOpportunity = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  priority: MerchandisingActionPriority;
  href: string;
  label: string;
};

export type MerchandisingStudioReport = {
  status: MerchandisingStudioStatus;
  score: number;
  headline: string;
  summary: {
    products: number;
    activeProducts: number;
    finders: number;
    publishedFinders: number;
    controls: number;
    pins: number;
    boosts: number;
    exclusions: number;
    staleControls: number;
    productsWithDemand: number;
    invisibleProducts: number;
  };
  controls: MerchandisingControl[];
  lanes: MerchandisingLane[];
  opportunities: MerchandisingOpportunity[];
  guardrails: Array<{ label: string; detail: string; proof: string }>;
  packet: string;
};

type ProductDemand = {
  productId?: string;
  productName: string;
  recommended: number;
  clicks: number;
  clickRate: number;
};

function productName(product?: Product, fallback = "Missing product") {
  return product?.name || fallback;
}

function controlStatus(quiz: Quiz, product?: Product, override?: RecommendationOverride): MerchandisingControlStatus {
  if (!product || !product.active) return "stale";
  if (!quiz.published) return "draft";
  if (override?.action === "exclude") return "protected";
  return "active";
}

function controlEvidence(status: MerchandisingControlStatus, quiz: Quiz, product?: Product, override?: RecommendationOverride) {
  if (!product) return "This control references a product that no longer exists in the catalog.";
  if (!product.active) return `${product.name} is inactive, so this control cannot affect live recommendations.`;
  if (!quiz.published) return `${quiz.name} is still a draft, so this control has not reached shoppers.`;
  if (override?.action === "exclude") return `${product.name} is deliberately protected from this finder’s recommendation set.`;
  if (override?.action === "pin") return `${product.name} receives top-ranking priority after hard filters pass.`;
  return `${product.name} receives +${override?.weight || 0} deterministic merchandising point${override?.weight === 1 ? "" : "s"}.`;
}

function controlsForProduct(controls: MerchandisingControl[], productId?: string, productName?: string) {
  return controls.filter((control) => productId ? control.productId === productId : control.productName === productName);
}

function demandMap(events: AnalyticsEvent[], products: Product[]) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const map = new Map<string, ProductDemand>();

  for (const event of events) {
    if (event.event_type !== "product_recommended" && event.event_type !== "buy_click") continue;
    const metadataName = typeof event.metadata?.product_name === "string" ? event.metadata.product_name : "";
    const product = event.product_id ? productsById.get(event.product_id) : undefined;
    const name = product?.name || metadataName || event.product_id || "Unknown product";
    const key = event.product_id || name.toLowerCase();
    const existing = map.get(key) || { productId: event.product_id, productName: name, recommended: 0, clicks: 0, clickRate: 0 };
    if (event.event_type === "product_recommended") existing.recommended += 1;
    if (event.event_type === "buy_click") existing.clicks += 1;
    existing.clickRate = existing.recommended ? Math.round(existing.clicks / existing.recommended * 1000) / 10 : existing.clicks ? 100 : 0;
    map.set(key, existing);
  }

  return map;
}

function buildControls(quizzes: Quiz[], products: Product[]): MerchandisingControl[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return quizzes.flatMap((quiz) => (quiz.recommendation_overrides || []).map((override) => {
    const product = productsById.get(override.product_id);
    const status = controlStatus(quiz, product, override);
    return {
      id: override.id,
      finderId: quiz.id,
      finderName: quiz.name,
      finderPublished: quiz.published,
      productId: override.product_id,
      productName: productName(product, override.product_id || "Missing product"),
      productActive: Boolean(product?.active),
      action: override.action,
      weight: override.weight,
      note: override.note,
      status,
      evidence: controlEvidence(status, quiz, product, override),
    };
  })).sort((a, b) => {
    const statusRank: Record<MerchandisingControlStatus, number> = { stale: 0, draft: 1, protected: 2, active: 3 };
    return statusRank[a.status] - statusRank[b.status] || a.finderName.localeCompare(b.finderName) || a.productName.localeCompare(b.productName);
  });
}

function buildLanes(products: Product[], controls: MerchandisingControl[], demand: Map<string, ProductDemand>): MerchandisingLane[] {
  const activeProducts = products.filter((product) => product.active);
  const lanes: MerchandisingLane[] = [];

  for (const product of activeProducts) {
    const productDemand = demand.get(product.id) || demand.get(product.name.toLowerCase()) || { productId: product.id, productName: product.name, recommended: 0, clicks: 0, clickRate: 0 };
    const productControls = controlsForProduct(controls, product.id, product.name);
    const controlLabels = productControls.map((control) => `${control.action} in ${control.finderName}`);
    const hasControls = productControls.length > 0;
    const isWinner = productDemand.clicks > 0 && productDemand.clickRate >= 35;
    const isStalled = productDemand.recommended >= 2 && productDemand.clickRate < 20;
    const status: MerchandisingLaneStatus = isWinner ? "win" : isStalled ? "watch" : hasControls ? "controlled" : "hidden";
    const label = status === "win" ? "Winner" : status === "watch" ? "Stalled" : status === "controlled" ? "Controlled" : "Invisible";
    lanes.push({
      id: `lane-${product.id}`,
      productId: product.id,
      productName: product.name,
      label,
      status,
      recommended: productDemand.recommended,
      clicks: productDemand.clicks,
      clickRate: productDemand.clickRate,
      controls: controlLabels,
      evidence: productDemand.recommended
        ? `${product.name} was recommended ${productDemand.recommended} time${productDemand.recommended === 1 ? "" : "s"} with ${productDemand.clicks} buy click${productDemand.clicks === 1 ? "" : "s"}.`
        : `${product.name} has no recommendation demand yet in the current analytics sample.`,
      recommendation: status === "win"
        ? "Use a boost or launch placement to give this proven product more visibility."
        : status === "watch"
          ? "Improve result-card proof, product imagery or price framing before adding more ranking pressure."
          : status === "controlled"
            ? "Review whether this control still matches demand and launch priorities."
            : "Create a finder/search path or catalog language test so this product can be discovered.",
    });
  }

  return lanes.sort((a, b) => {
    const rank: Record<MerchandisingLaneStatus, number> = { win: 0, watch: 1, hidden: 2, controlled: 3 };
    return rank[a.status] - rank[b.status] || b.recommended - a.recommended || b.clicks - a.clicks || a.productName.localeCompare(b.productName);
  });
}

function hasPositiveControl(controls: MerchandisingControl[], productId?: string) {
  return controls.some((control) => control.productId === productId && (control.action === "boost" || control.action === "pin") && control.status !== "stale");
}

function buildOpportunities(controls: MerchandisingControl[], lanes: MerchandisingLane[], quizzes: Quiz[], products: Product[]): MerchandisingOpportunity[] {
  const actions: MerchandisingOpportunity[] = [];
  const stale = controls.filter((control) => control.status === "stale");
  const winnerWithoutControl = lanes.find((lane) => lane.status === "win" && !hasPositiveControl(controls, lane.productId));
  const stalled = lanes.find((lane) => lane.status === "watch");
  const invisible = lanes.find((lane) => lane.status === "hidden");
  const publishedFinders = quizzes.filter((quiz) => quiz.published);

  if (stale.length) {
    actions.push({
      id: "repair-stale-controls",
      title: "Repair stale merchandising controls",
      detail: `${stale.length} control${stale.length === 1 ? "" : "s"} reference missing or inactive products.`,
      evidence: stale.slice(0, 2).map((control) => `${control.action.toUpperCase()} ${control.productName} in ${control.finderName}`).join(" · "),
      recommendation: "Remove stale controls or reactivate the product before relying on release QA.",
      priority: "critical",
      href: "/dashboard/quizzes",
      label: "Open finders",
    });
  }

  if (!controls.length && products.length && publishedFinders.length) {
    actions.push({
      id: "add-first-control",
      title: "Add a first merchandising control",
      detail: "Published finders are live, but no pins, boosts or exclusions are configured yet.",
      evidence: `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"} and ${products.filter((product) => product.active).length} active product${products.filter((product) => product.active).length === 1 ? "" : "s"}.`,
      recommendation: "Start with a small boost for a proven product or an exclusion for a product that should not appear in this journey.",
      priority: "medium",
      href: "/dashboard/quizzes",
      label: "Add control",
    });
  }

  if (winnerWithoutControl) {
    actions.push({
      id: `boost-${winnerWithoutControl.productId || winnerWithoutControl.productName}`,
      title: `Promote ${winnerWithoutControl.productName}`,
      detail: "This product has positive buy-click evidence but no active boost or pin.",
      evidence: `${winnerWithoutControl.clickRate}% click rate from ${winnerWithoutControl.recommended} recommendation${winnerWithoutControl.recommended === 1 ? "" : "s"}.`,
      recommendation: "Add a conservative boost in the most relevant finder, then monitor click-through and result diversity.",
      priority: "high",
      href: "/dashboard/quizzes",
      label: "Tune finder",
    });
  }

  if (stalled) {
    actions.push({
      id: `fix-stalled-${stalled.productId || stalled.productName}`,
      title: `Improve ${stalled.productName} before boosting`,
      detail: "This product is being surfaced but shoppers are not clicking at a healthy rate.",
      evidence: `${stalled.recommended} recommendation${stalled.recommended === 1 ? "" : "s"} and ${stalled.clicks} buy click${stalled.clicks === 1 ? "" : "s"}.`,
      recommendation: "Review image, price, URL, result explanation and answer mapping before adding merchandising pressure.",
      priority: "high",
      href: "/dashboard/analytics",
      label: "Review demand",
    });
  }

  if (invisible) {
    actions.push({
      id: `surface-${invisible.productId || invisible.productName}`,
      title: `Create discovery coverage for ${invisible.productName}`,
      detail: "An active product has not appeared in recommendation demand yet.",
      evidence: invisible.evidence,
      recommendation: "Add buyer-need language, a finder answer rule or a search/advisor prompt test that gives this product a fair route to discovery.",
      priority: "medium",
      href: "/dashboard/products",
      label: "Improve catalog",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "merchandising-healthy",
      title: "Merchandising controls are aligned",
      detail: "Current controls do not show stale references or obvious demand conflicts.",
      evidence: `${controls.length} deterministic control${controls.length === 1 ? "" : "s"} across ${quizzes.length} finder${quizzes.length === 1 ? "" : "s"}.`,
      recommendation: "Keep monitoring Persona Studio, Analytics and Experiment Planner before making the next ranking change.",
      priority: "low",
      href: "/dashboard/experiments",
      label: "Plan test",
    });
  }

  const rank: Record<MerchandisingActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 5);
}

function buildPacket(report: Omit<MerchandisingStudioReport, "packet">) {
  return [
    "Sellentum merchandising packet",
    "===========================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Current controls",
    ...(report.controls.length ? report.controls.map((control) => `- [${control.status.toUpperCase()}] ${control.action.toUpperCase()} ${control.productName} in ${control.finderName}: ${control.evidence}`) : ["- No pins, boosts or exclusions configured yet."]),
    "",
    "Product lanes",
    ...report.lanes.slice(0, 8).map((lane) => `- [${lane.status.toUpperCase()}] ${lane.productName}: ${lane.evidence} Recommendation: ${lane.recommendation}`),
    "",
    "Open opportunities",
    ...report.opportunities.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildMerchandisingStudioReport({
  products,
  quizzes,
  events,
}: {
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
}): MerchandisingStudioReport {
  const insights = buildZeroPartyInsights(events, products);
  const controls = buildControls(quizzes, products);
  const demand = demandMap(events, products);
  const lanes = buildLanes(products, controls, demand);
  const opportunities = buildOpportunities(controls, lanes, quizzes, products);
  const staleControls = controls.filter((control) => control.status === "stale").length;
  const pins = controls.filter((control) => control.action === "pin").length;
  const boosts = controls.filter((control) => control.action === "boost").length;
  const exclusions = controls.filter((control) => control.action === "exclude").length;
  const invisibleProducts = lanes.filter((lane) => lane.status === "hidden").length;
  const activeProducts = products.filter((product) => product.active).length;
  const publishedFinders = quizzes.filter((quiz) => quiz.published).length;
  const winners = lanes.filter((lane) => lane.status === "win").length;
  const stalled = lanes.filter((lane) => lane.status === "watch").length;
  const score = Math.max(0, Math.min(100, Math.round(
    62
    + Math.min(16, controls.length * 4)
    + Math.min(12, insights.summary.productsWithDemand * 3)
    + Math.min(10, winners * 5)
    - staleControls * 18
    - stalled * 7
    - Math.min(18, invisibleProducts * 4),
  )));
  const status: MerchandisingStudioStatus = staleControls ? "needs-attention" : score >= 78 ? "healthy" : "watch";
  const baseReport: Omit<MerchandisingStudioReport, "packet"> = {
    status,
    score,
    headline: status === "healthy"
      ? "Merchandising controls are aligned with current recommendation demand."
      : status === "watch"
        ? "Merchandising controls are usable, but product visibility and demand need review."
        : "Merchandising controls need cleanup before launch decisions rely on them.",
    summary: {
      products: products.length,
      activeProducts,
      finders: quizzes.length,
      publishedFinders,
      controls: controls.length,
      pins,
      boosts,
      exclusions,
      staleControls,
      productsWithDemand: insights.summary.productsWithDemand,
      invisibleProducts,
    },
    controls,
    lanes,
    opportunities,
    guardrails: [
      {
        label: "Hard filters still win",
        detail: "Pins and boosts cannot revive inactive products or products blocked by hard budget eligibility.",
        proof: "Finder matching applies active-state and budget filters before merchandising controls affect rank.",
      },
      {
        label: "AI never chooses products",
        detail: "Merchandising changes adjust deterministic ranking, while AI explanation copy only runs after products are selected.",
        proof: "Controls are stored as pin, boost or exclude actions on finder configuration.",
      },
      {
        label: "Demand before pressure",
        detail: "Products with low click-through should get better proof and mapping before merchants add more ranking pressure.",
        proof: "Opportunity queue separates winners from stalled recommendation lanes.",
      },
      {
        label: "Review stale controls",
        detail: "Controls pointing at deleted or inactive products are release risks and should be removed or updated.",
        proof: `${staleControls} stale control${staleControls === 1 ? "" : "s"} detected in this workspace.`,
      },
    ],
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
