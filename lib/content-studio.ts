import { buildAnalyticsSnapshot } from "./analytics";
import { buildDiscoveryGapReport } from "./discovery-gaps";
import { buildZeroPartyInsights, type InsightCount, type ProductDemandInsight } from "./insights";
import { buildRecommendationFeedbackReport, type FeedbackProduct } from "./recommendation-feedback";
import type { AnalyticsEvent, Product } from "@/lib/types";
import { formatCurrency } from "./utils";

export type ContentStudioStatus = "empty" | "draft" | "ready" | "needs-attention";
export type ContentAssetStatus = "draft" | "review" | "ready";
export type ContentSurface = "pdp" | "collection" | "email" | "support" | "comparison";
export type ContentActionPriority = "critical" | "high" | "medium" | "low";

export type ContentAsset = {
  id: string;
  surface: ContentSurface;
  status: ContentAssetStatus;
  score: number;
  title: string;
  productId?: string;
  productName: string;
  category: string;
  audienceIntent: string;
  sourceSignals: string[];
  destination: string;
  evidence: string;
  guardrail: string;
  blocks: {
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
    faq: Array<{ question: string; answer: string }>;
    cta: string;
  };
};

export type ContentPlay = {
  id: string;
  title: string;
  channel: "homepage" | "collection" | "email" | "support" | "pdp";
  priority: ContentActionPriority;
  detail: string;
  evidence: string;
  assets: string[];
  nextStep: string;
};

export type ContentCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  recommendation: string;
};

export type ContentAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: ContentActionPriority;
  href: string;
  label: string;
};

export type ContentStudioReport = {
  status: ContentStudioStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    assets: number;
    readyAssets: number;
    reviewAssets: number;
    intentSignals: number;
    feedbackEvents: number;
    queryThemes: number;
    demandProducts: number;
    contentGaps: number;
  };
  assets: ContentAsset[];
  plays: ContentPlay[];
  checks: ContentCheck[];
  actions: ContentAction[];
  packet: string;
};

type ProductSignal = {
  product: Product;
  demand?: ProductDemandInsight;
  feedback?: FeedbackProduct;
  answerSignals: InsightCount[];
  querySignals: InsightCount[];
  gapCount: number;
  score: number;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£$.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function idFrom(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "content";
}

function cleanSentence(value: string, fallback: string, max = 180) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  const clipped = clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
  return clipped.endsWith(".") || clipped.endsWith("!") || clipped.endsWith("?") ? clipped : `${clipped}.`;
}

function productSignals(product: Product) {
  return [
    ...(product.buyer_needs || []),
    ...product.features,
    ...product.tags,
    product.category,
  ].map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function productHaystack(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...productSignals(product),
  ].join(" "));
}

function insightMatchesProduct(insight: InsightCount, product: Product) {
  const haystack = productHaystack(product);
  const label = normalize(insight.label);
  return insight.products.includes(product.name) || (label && haystack.includes(label));
}

function evidenceList(items: string[], limit = 4) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function topIntent(signal: ProductSignal) {
  const answer = signal.answerSignals[0]?.label;
  const query = signal.querySignals[0]?.label;
  const need = signal.product.buyer_needs?.[0];
  const tag = signal.product.tags[0];
  return answer || query || need || tag || signal.product.category;
}

function surfaceFor(signal: ProductSignal): ContentSurface {
  if (signal.feedback?.status === "needs-attention") return "support";
  if (signal.demand?.clicks) return "pdp";
  if (signal.querySignals.length) return "collection";
  if (signal.answerSignals.length) return "comparison";
  return "email";
}

function destinationFor(surface: ContentSurface) {
  if (surface === "pdp") return "Product detail page result block";
  if (surface === "collection") return "Collection buying guide module";
  if (surface === "email") return "Campaign email product block";
  if (surface === "support") return "Support/advisor recovery snippet";
  return "Comparison table or finder result card";
}

function statusFor(product: Product, signal: ProductSignal): ContentAssetStatus {
  if (!product.active || !product.product_url || !product.description || productSignals(product).length < 2) return "draft";
  if (signal.feedback?.status === "needs-attention" || signal.gapCount > 0 || !product.image_url) return "review";
  return "ready";
}

function scoreForAsset(status: ContentAssetStatus, signal: ProductSignal) {
  const base = status === "ready" ? 72 : status === "review" ? 54 : 34;
  return Math.max(0, Math.min(100, Math.round(
    base
    + Math.min(12, (signal.demand?.recommended || 0) * 2)
    + Math.min(10, (signal.demand?.clicks || 0) * 5)
    + Math.min(8, (signal.feedback?.positive || 0) * 4)
    - Math.min(18, (signal.feedback?.negative || 0) * 6)
    - signal.gapCount * 5,
  )));
}

function buildAsset(signal: ProductSignal): ContentAsset {
  const product = signal.product;
  const surface = surfaceFor(signal);
  const intent = topIntent(signal);
  const proof = evidenceList([
    ...(product.buyer_needs || []),
    ...product.features,
    ...product.tags,
  ], 5);
  const status = statusFor(product, signal);
  const score = scoreForAsset(status, signal);
  const demandEvidence = signal.demand ? `${signal.demand.recommended} recommendation${signal.demand.recommended === 1 ? "" : "s"} and ${signal.demand.clicks} buy click${signal.demand.clicks === 1 ? "" : "s"}` : "No product-demand events yet";
  const feedbackEvidence = signal.feedback?.feedback ? `${signal.feedback.positive} helpful / ${signal.feedback.negative} not-right feedback` : "No shopper feedback yet";
  const firstProof = proof[0] || product.category;
  const secondProof = proof[1] || "catalog-backed fit";
  const price = formatCurrency(product.price);
  const headline = surface === "support"
    ? `Is ${product.name} still right for ${intent}?`
    : `${product.name} for ${intent}`;
  const body = cleanSentence(
    `${product.description} Findly should position it around ${firstProof.toLowerCase()} and ${secondProof.toLowerCase()} for shoppers comparing ${product.category.toLowerCase()} at ${price}`,
    `${product.name} is a ${product.category.toLowerCase()} option with catalog-backed proof for ${intent}.`,
    260,
  );

  return {
    id: `${surface}-${idFrom(product.id || product.name)}`,
    surface,
    status,
    score,
    title: headline,
    productId: product.id,
    productName: product.name,
    category: product.category,
    audienceIntent: intent,
    sourceSignals: evidenceList([
      ...signal.answerSignals.map((item) => item.label),
      ...signal.querySignals.map((item) => item.label),
      ...(signal.feedback?.reasons || []),
      ...(signal.demand ? [signal.demand.clicks ? "buy-click demand" : "recommendation exposure"] : []),
    ], 6),
    destination: destinationFor(surface),
    evidence: `${demandEvidence}; ${feedbackEvidence}; ${proof.length} catalog proof point${proof.length === 1 ? "" : "s"}.`,
    guardrail: "Use only listed product facts and shopper signals; do not invent materials, guarantees, certifications, stock status or discounts.",
    blocks: {
      eyebrow: surface === "support" ? "Need a better fit?" : surface === "email" ? "Recommended by Findly" : "Guided pick",
      headline,
      body,
      bullets: proof.length ? proof.map((item) => cleanSentence(item, item, 90)) : [cleanSentence(product.category, product.category, 90)],
      faq: [
        {
          question: `Who is ${product.name} best for?`,
          answer: cleanSentence(`${product.name} is best for shoppers prioritising ${intent} with proof points like ${proof.slice(0, 2).join(" and ") || product.category}`, `${product.name} is best for shoppers looking for ${intent}.`, 180),
        },
        {
          question: "Why did Findly recommend it?",
          answer: cleanSentence(`It matched catalog evidence from ${proof.slice(0, 3).join(", ") || product.category} and shopper signals from ${signal.answerSignals[0]?.label || signal.querySignals[0]?.label || "the current journey"}`, "It matched the shopper's selected needs against catalog facts.", 180),
        },
      ],
      cta: product.product_url ? `Shop ${product.name}` : `Review ${product.name}`,
    },
  };
}

function buildSignals(products: Product[], events: AnalyticsEvent[]): ProductSignal[] {
  const insights = buildZeroPartyInsights(events, products);
  const feedback = buildRecommendationFeedbackReport(events, products);
  const gaps = buildDiscoveryGapReport(events, products);
  const demandByProduct = new Map(insights.productDemand.map((item) => [item.productId || normalize(item.productName), item]));
  const feedbackByProduct = new Map(feedback.products.map((item) => [item.productId || normalize(item.productName), item]));
  const gapCounts = new Map<string, number>();
  gaps.productGaps.forEach((item) => {
    const count = item.recommended >= 2 && item.clickRate < 20 ? 1 : 0;
    if (item.productId) gapCounts.set(item.productId, count);
    gapCounts.set(normalize(item.productName), count);
  });

  return products
    .filter((product) => product.active)
    .map((product) => {
      const demand = demandByProduct.get(product.id) || demandByProduct.get(normalize(product.name));
      const productFeedback = feedbackByProduct.get(product.id) || feedbackByProduct.get(normalize(product.name));
      const answerSignals = insights.answers.filter((item) => insightMatchesProduct(item, product)).slice(0, 4);
      const querySignals = insights.queryThemes.filter((item) => insightMatchesProduct(item, product)).slice(0, 4);
      const gapCount = gapCounts.get(product.id) || gapCounts.get(normalize(product.name)) || 0;
      const completeness = [
        product.description,
        product.product_url,
        product.image_url,
        product.features.length ? "features" : "",
        product.tags.length ? "tags" : "",
        product.buyer_needs?.length ? "buyer needs" : "",
      ].filter(Boolean).length;
      const score = Math.round(
        completeness * 8
        + (demand?.recommended || 0) * 5
        + (demand?.clicks || 0) * 14
        + answerSignals.reduce((sum, item) => sum + item.count, 0) * 3
        + querySignals.reduce((sum, item) => sum + item.count, 0) * 3
        + (productFeedback?.positive || 0) * 8
        - (productFeedback?.negative || 0) * 10
        - gapCount * 6,
      );
      return { product, demand, feedback: productFeedback, answerSignals, querySignals, gapCount, score };
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}

function check(id: string, label: string, status: ContentCheck["status"], detail: string, recommendation: string): ContentCheck {
  return { id, label, status, detail, recommendation };
}

function buildChecks(products: Product[], events: AnalyticsEvent[], assets: ContentAsset[]): ContentCheck[] {
  const snapshot = buildAnalyticsSnapshot(events);
  const readyAssets = assets.filter((asset) => asset.status === "ready").length;
  const reviewAssets = assets.filter((asset) => asset.status === "review").length;
  const activeProducts = products.filter((product) => product.active).length;
  const proofReadyProducts = products.filter((product) => product.active && product.description && product.product_url && productSignals(product).length >= 2).length;
  return [
    check(
      "catalog-proof",
      "Catalog proof coverage",
      activeProducts && proofReadyProducts / activeProducts >= 0.7 ? "pass" : proofReadyProducts ? "warn" : "fail",
      `${proofReadyProducts}/${activeProducts} active product${activeProducts === 1 ? "" : "s"} have enough description, URL and proof signals for grounded content.`,
      "Add features, tags, buyer needs and product URLs before generating live buying-guide copy.",
    ),
    check(
      "intent-source",
      "Shopper intent source",
      snapshot.product_recommended || snapshot.buy_click ? "pass" : events.length ? "warn" : "fail",
      snapshot.product_recommended || snapshot.buy_click ? `${snapshot.product_recommended} recommendation and ${snapshot.buy_click} buy-click events inform content priority.` : "No recommendation or buy-click demand is available yet.",
      "Run finder/advisor/search journeys so content is prioritized from real shopper demand.",
    ),
    check(
      "feedback-loop",
      "Feedback loop",
      events.some((event) => event.event_type === "recommendation_feedback") ? "pass" : "warn",
      events.some((event) => event.event_type === "recommendation_feedback") ? "Recommendation feedback is available for claim repair and proof reuse." : "No result-card feedback is available yet.",
      "Collect Helpful / Not right ratings to identify weak explanations before publishing content.",
    ),
    check(
      "asset-readiness",
      "Asset readiness",
      readyAssets ? "pass" : reviewAssets ? "warn" : "fail",
      `${readyAssets} ready asset${readyAssets === 1 ? "" : "s"} and ${reviewAssets} review asset${reviewAssets === 1 ? "" : "s"} generated.`,
      readyAssets ? "Copy the strongest assets into a staging PDP, collection or email block." : "Improve catalog proof and feedback quality before publishing generated copy.",
    ),
  ];
}

function buildPlays(assets: ContentAsset[]): ContentPlay[] {
  const ready = assets.filter((asset) => asset.status === "ready");
  const review = assets.filter((asset) => asset.status === "review");
  const topPdp = ready.find((asset) => asset.surface === "pdp") || ready[0] || assets[0];
  const topCollection = assets.find((asset) => asset.surface === "collection" || asset.surface === "comparison");
  const supportAsset = review.find((asset) => asset.surface === "support") || assets.find((asset) => asset.status === "review");
  const plays: ContentPlay[] = [];
  if (topPdp) {
    plays.push({
      id: "pdp-proof-block",
      title: "Publish a PDP guided-proof block",
      channel: "pdp",
      priority: "high",
      detail: `Use ${topPdp.productName} copy on its product detail page to explain why Findly recommends it.`,
      evidence: topPdp.evidence,
      assets: [topPdp.title],
      nextStep: "Paste the headline, proof bullets and FAQ under the product description in staging.",
    });
  }
  if (topCollection) {
    plays.push({
      id: "collection-buying-guide",
      title: "Create a collection buying-guide module",
      channel: "collection",
      priority: "medium",
      detail: `Use shopper intent around ${topCollection.audienceIntent} to make the collection page easier to choose from.`,
      evidence: topCollection.evidence,
      assets: [topCollection.title],
      nextStep: "Pair this copy with an inline finder/search embed on the collection page.",
    });
  }
  if (supportAsset) {
    plays.push({
      id: "support-recovery-copy",
      title: "Repair support/advisor recovery copy",
      channel: "support",
      priority: supportAsset.status === "review" ? "high" : "medium",
      detail: `Use ${supportAsset.productName} guardrails to clarify when the recommendation is or is not a fit.`,
      evidence: supportAsset.evidence,
      assets: [supportAsset.title],
      nextStep: "Review the copy before publishing because this asset has feedback or catalog-risk flags.",
    });
  }
  return plays.slice(0, 4);
}

function buildActions(report: Omit<ContentStudioReport, "packet" | "actions">): ContentAction[] {
  const actions: ContentAction[] = [];
  const firstFail = report.checks.find((item) => item.status === "fail");
  const reviewAsset = report.assets.find((asset) => asset.status === "review");
  const readyAsset = report.assets.find((asset) => asset.status === "ready");

  if (firstFail) {
    actions.push({
      id: `fix-${firstFail.id}`,
      title: firstFail.label,
      detail: firstFail.recommendation,
      evidence: firstFail.detail,
      priority: "critical",
      href: firstFail.id === "catalog-proof" ? "/dashboard/products" : "/dashboard/storefront-sandbox",
      label: "Fix blocker",
    });
  }

  if (reviewAsset) {
    actions.push({
      id: `review-${reviewAsset.id}`,
      title: `Review ${reviewAsset.productName} copy before publishing`,
      detail: reviewAsset.guardrail,
      evidence: reviewAsset.evidence,
      priority: "high",
      href: "/dashboard/feedback",
      label: "Review feedback",
    });
  }

  if (readyAsset) {
    actions.push({
      id: `publish-${readyAsset.id}`,
      title: `Publish ${readyAsset.productName} guided-proof copy`,
      detail: `Use the ${readyAsset.destination.toLowerCase()} block in a staging storefront slot.`,
      evidence: readyAsset.evidence,
      priority: "medium",
      href: "/dashboard/widget-studio",
      label: "Stage content",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .slice(0, 5);
}

function buildPacket(report: Omit<ContentStudioReport, "packet">) {
  return [
    "Findly Sales Content Studio packet",
    "==================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Grounding boundary",
    "- Every copy block is grounded in catalog facts, shopper intent, recommendation demand or feedback events.",
    "- Do not publish claims about stock, certifications, discounts, materials or performance unless they are present in product data.",
    "- Product selection remains deterministic; Content Studio only packages proof and messaging.",
    "",
    "Content assets",
    ...report.assets.map((asset) => [
      `- ${asset.title} (${asset.surface}, ${asset.status}, ${asset.score}%)`,
      `  Destination: ${asset.destination}`,
      `  Headline: ${asset.blocks.headline}`,
      `  Proof: ${asset.blocks.bullets.join(" | ")}`,
      `  Evidence: ${asset.evidence}`,
      `  Guardrail: ${asset.guardrail}`,
    ].join("\n")),
    "",
    "Launch plays",
    ...report.plays.map((play) => `- [${play.priority.toUpperCase()}] ${play.title}: ${play.nextStep}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildContentStudioReport({ products, events }: { products: Product[]; events: AnalyticsEvent[] }): ContentStudioReport {
  const signals = buildSignals(products, events);
  const assets = signals.slice(0, 8).map(buildAsset);
  const checks = buildChecks(products, events, assets);
  const plays = buildPlays(assets);
  const insights = buildZeroPartyInsights(events, products);
  const feedback = buildRecommendationFeedbackReport(events, products);
  const readyAssets = assets.filter((asset) => asset.status === "ready").length;
  const reviewAssets = assets.filter((asset) => asset.status === "review").length;
  const failedChecks = checks.filter((item) => item.status === "fail").length;
  const warnChecks = checks.filter((item) => item.status === "warn").length;
  const score = Math.max(0, Math.min(100, Math.round(
    readyAssets * 13
    + reviewAssets * 7
    + Math.min(20, insights.summary.explicitSignals * 0.7)
    + Math.min(15, feedback.summary.feedback * 3)
    + Math.min(12, plays.length * 4)
    - failedChecks * 14
    - warnChecks * 4,
  )));
  const status: ContentStudioStatus = !products.filter((product) => product.active).length
    ? "empty"
    : failedChecks
      ? "needs-attention"
      : readyAssets >= 2 && score >= 70
        ? "ready"
        : "draft";
  const baseReport: Omit<ContentStudioReport, "packet" | "actions"> = {
    status,
    score,
    headline: status === "ready"
      ? "Grounded sales content is ready for staging across PDP, collection and campaign surfaces."
      : status === "needs-attention"
        ? "Content assets need catalog proof or feedback review before publishing."
        : status === "draft"
          ? "Content drafts are available; collect more intent and feedback before scaling."
          : "Sales Content Studio needs active products before it can generate grounded buying-guide copy.",
    summary: {
      activeProducts: products.filter((product) => product.active).length,
      assets: assets.length,
      readyAssets,
      reviewAssets,
      intentSignals: insights.summary.explicitSignals,
      feedbackEvents: feedback.summary.feedback,
      queryThemes: insights.queryThemes.length,
      demandProducts: insights.productDemand.length,
      contentGaps: checks.filter((item) => item.status !== "pass").length,
    },
    assets,
    plays,
    checks,
  };
  const withActions = { ...baseReport, actions: buildActions(baseReport) };
  return { ...withActions, packet: buildPacket(withActions) };
}
