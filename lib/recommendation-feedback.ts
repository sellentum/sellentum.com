import { analyticsEventSessionId, buildAnalyticsSnapshot, stageRate } from "./analytics";
import type { AnalyticsEvent, ExperienceType, Product } from "@/lib/types";
import { getEventExperienceType } from "./utils";

export type RecommendationFeedbackStatus = "empty" | "collecting" | "healthy" | "needs-attention";
export type RecommendationFeedbackSentiment = "positive" | "negative";
export type FeedbackProductStatus = "healthy" | "watch" | "needs-attention";
export type FeedbackActionPriority = "critical" | "high" | "medium" | "low";

export type FeedbackProduct = {
  id: string;
  productId?: string;
  productName: string;
  category: string;
  status: FeedbackProductStatus;
  score: number;
  feedback: number;
  positive: number;
  negative: number;
  negativeRate: number;
  recommendations: number;
  buyClicks: number;
  feedbackRate: number;
  sources: ExperienceType[];
  reasons: string[];
  evidence: string;
  recommendation: string;
};

export type FeedbackTheme = {
  id: string;
  label: string;
  count: number;
  sentiment: RecommendationFeedbackSentiment;
  sources: ExperienceType[];
  products: string[];
  recommendation: string;
};

export type FeedbackCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  recommendation: string;
};

export type FeedbackAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: FeedbackActionPriority;
  href: string;
  label: string;
};

export type RecommendationFeedbackReport = {
  status: RecommendationFeedbackStatus;
  score: number;
  headline: string;
  summary: {
    sessions: number;
    recommendations: number;
    buyClicks: number;
    feedback: number;
    positive: number;
    negative: number;
    feedbackRate: number;
    negativeRate: number;
    productsWithFeedback: number;
    highRiskProducts: number;
    sources: number;
  };
  products: FeedbackProduct[];
  themes: FeedbackTheme[];
  checks: FeedbackCheck[];
  actions: FeedbackAction[];
  packet: string;
};

type ProductDraft = {
  productId?: string;
  productName: string;
  category: string;
  recommendations: number;
  buyClicks: number;
  feedback: number;
  positive: number;
  negative: number;
  sources: Set<ExperienceType>;
  reasons: Map<string, { label: string; count: number; sentiment: RecommendationFeedbackSentiment }>;
};

const positiveReasons: Record<string, string> = {
  helpful_match: "Helpful match",
  clear_explanation: "Clear explanation",
  right_budget: "Right budget",
  good_comparison: "Good comparison",
};

const negativeReasons: Record<string, string> = {
  not_right: "Not right",
  wrong_category: "Wrong category",
  weak_explanation: "Weak explanation",
  too_expensive: "Too expensive",
  missing_feature: "Missing feature",
  unavailable: "Unavailable",
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function idFrom(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "feedback";
}

function feedbackSentiment(event: AnalyticsEvent): RecommendationFeedbackSentiment {
  const value = normalize([
    text(event.metadata?.feedback),
    text(event.metadata?.feedback_sentiment),
    text(event.metadata?.sentiment),
  ].join(" "));
  return value.includes("negative") || value.includes("not") || value.includes("bad") ? "negative" : "positive";
}

function feedbackReason(event: AnalyticsEvent, sentiment: RecommendationFeedbackSentiment) {
  const value = text(event.metadata?.feedback_reason) || text(event.metadata?.reason) || (sentiment === "positive" ? "helpful_match" : "not_right");
  const clean = value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const key = idFrom(clean).replace(/-/g, "_");
  return sentiment === "positive" ? positiveReasons[key] || clean : negativeReasons[key] || clean;
}

function productNameForEvent(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return text(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || event.product_id || "Unknown product";
}

function categoryForEvent(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return event.product_id ? productsById.get(event.product_id)?.category || "Unknown category" : "Unknown category";
}

function productKey(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return event.product_id || normalize(productNameForEvent(event, productsById));
}

function getDraft(map: Map<string, ProductDraft>, event: AnalyticsEvent, productsById: Map<string, Product>) {
  const key = productKey(event, productsById);
  const product = event.product_id ? productsById.get(event.product_id) : undefined;
  const draft = map.get(key) || {
    productId: event.product_id,
    productName: product?.name || productNameForEvent(event, productsById),
    category: product?.category || categoryForEvent(event, productsById),
    recommendations: 0,
    buyClicks: 0,
    feedback: 0,
    positive: 0,
    negative: 0,
    sources: new Set<ExperienceType>(),
    reasons: new Map<string, { label: string; count: number; sentiment: RecommendationFeedbackSentiment }>(),
  };
  if (!draft.productId && event.product_id) draft.productId = event.product_id;
  map.set(key, draft);
  return draft;
}

function productStatus(negativeRate: number, feedback: number, recommendations: number): FeedbackProductStatus {
  if (feedback >= 2 && negativeRate >= 45) return "needs-attention";
  if (feedback >= 1 && negativeRate >= 25) return "watch";
  if (recommendations >= 4 && feedback === 0) return "watch";
  return "healthy";
}

function productRecommendation(status: FeedbackProductStatus, negativeReasons: string[], feedbackRate: number) {
  if (status === "needs-attention") {
    const reason = negativeReasons[0]?.toLowerCase() || "negative feedback";
    return `Review this product’s matching rules, explanation copy and catalog evidence because shoppers flagged ${reason}.`;
  }
  if (status === "watch") {
    return feedbackRate < 10 ? "Ask for more result-card feedback before making ranking changes." : "Monitor this product while collecting a few more sessions.";
  }
  return "Keep this product path live and reuse its proof points in finder/advisor copy.";
}

function buildProductRows(drafts: Map<string, ProductDraft>): FeedbackProduct[] {
  return [...drafts.entries()].map(([id, draft]) => {
    const negativeRate = Math.round(stageRate(draft.negative, draft.feedback));
    const feedbackRate = Math.round(stageRate(draft.feedback, draft.recommendations || draft.buyClicks || draft.feedback));
    const status = productStatus(negativeRate, draft.feedback, draft.recommendations);
    const reasons = [...draft.reasons.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5)
      .map((item) => item.label);
    const score = Math.max(0, Math.min(100, Math.round(
      72
      + draft.positive * 9
      + draft.buyClicks * 3
      - draft.negative * 18
      - negativeRate * 0.45
      - (draft.recommendations >= 4 && draft.feedback === 0 ? 12 : 0),
    )));
    return {
      id,
      productId: draft.productId,
      productName: draft.productName,
      category: draft.category,
      status,
      score,
      feedback: draft.feedback,
      positive: draft.positive,
      negative: draft.negative,
      negativeRate,
      recommendations: draft.recommendations,
      buyClicks: draft.buyClicks,
      feedbackRate,
      sources: [...draft.sources].sort(),
      reasons,
      evidence: `${draft.feedback} feedback event${draft.feedback === 1 ? "" : "s"} · ${draft.positive} helpful · ${draft.negative} not-right · ${draft.recommendations} recommendation${draft.recommendations === 1 ? "" : "s"}.`,
      recommendation: productRecommendation(status, reasons, feedbackRate),
    };
  }).sort((a, b) => {
    const riskOrder = { "needs-attention": 0, watch: 1, healthy: 2 };
    return riskOrder[a.status] - riskOrder[b.status] || b.negative - a.negative || b.feedback - a.feedback || b.recommendations - a.recommendations || a.productName.localeCompare(b.productName);
  }).slice(0, 8);
}

function buildThemes(feedbackEvents: AnalyticsEvent[], productsById: Map<string, Product>): FeedbackTheme[] {
  const themes = new Map<string, FeedbackTheme>();
  for (const event of feedbackEvents) {
    const sentiment = feedbackSentiment(event);
    const reason = feedbackReason(event, sentiment);
    const key = `${sentiment}:${idFrom(reason)}`;
    const existing = themes.get(key) || {
      id: key,
      label: reason,
      sentiment,
      count: 0,
      sources: [] as ExperienceType[],
      products: [] as string[],
      recommendation: "",
    };
    const source = getEventExperienceType(event);
    const productName = productNameForEvent(event, productsById);
    existing.count += 1;
    if (!existing.sources.includes(source)) existing.sources.push(source);
    if (productName && !existing.products.includes(productName)) existing.products.push(productName);
    themes.set(key, existing);
  }

  return [...themes.values()]
    .map((theme) => ({
      ...theme,
      sources: theme.sources.sort(),
      products: theme.products.sort().slice(0, 4),
      recommendation: theme.sentiment === "negative"
        ? `Inspect ${theme.products.slice(0, 2).join(", ") || "affected products"} for ${theme.label.toLowerCase()} friction.`
        : `Reuse the winning ${theme.label.toLowerCase()} proof in result cards and launch copy.`,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6);
}

function check(id: string, label: string, status: FeedbackCheck["status"], detail: string, recommendation: string): FeedbackCheck {
  return { id, label, status, detail, recommendation };
}

function buildChecks(events: AnalyticsEvent[], feedbackEvents: AnalyticsEvent[], products: FeedbackProduct[]): FeedbackCheck[] {
  const snapshot = buildAnalyticsSnapshot(events);
  const feedbackWithSession = feedbackEvents.filter((event) => text(event.metadata?.session_id)).length;
  const feedbackWithProduct = feedbackEvents.filter((event) => event.product_id || text(event.metadata?.product_name)).length;
  const riskProducts = products.filter((product) => product.status === "needs-attention").length;
  const feedbackRate = Math.round(stageRate(feedbackEvents.length, snapshot.product_recommended));
  return [
    check(
      "feedback-volume",
      "Feedback volume",
      feedbackEvents.length ? "pass" : snapshot.product_recommended ? "warn" : "fail",
      feedbackEvents.length ? `${feedbackEvents.length} recommendation feedback event${feedbackEvents.length === 1 ? "" : "s"} captured.` : "No recommendation feedback has been captured yet.",
      feedbackEvents.length ? "Keep the feedback prompt on result cards and compare by experience type." : "Open a customer experience, rate a result card and verify the event reaches Analytics.",
    ),
    check(
      "feedback-rate",
      "Feedback rate",
      feedbackRate >= 10 ? "pass" : feedbackEvents.length ? "warn" : "warn",
      `${feedbackRate}% of product recommendation events have feedback.`,
      feedbackRate >= 10 ? "Feedback sample is large enough for product-level triage." : "Collect more rating clicks before changing ranking rules.",
    ),
    check(
      "session-linkage",
      "Session linkage",
      feedbackEvents.length && feedbackWithSession === feedbackEvents.length ? "pass" : feedbackEvents.length ? "fail" : "warn",
      feedbackEvents.length ? `${feedbackWithSession}/${feedbackEvents.length} feedback events include session_id.` : "No feedback events to inspect.",
      "Recommendation feedback should include anonymous session metadata so journey context stays intact.",
    ),
    check(
      "product-attribution",
      "Product attribution",
      feedbackEvents.length && feedbackWithProduct === feedbackEvents.length ? "pass" : feedbackEvents.length ? "fail" : "warn",
      feedbackEvents.length ? `${feedbackWithProduct}/${feedbackEvents.length} feedback events include product identity.` : "No feedback events to inspect.",
      "Every feedback event should include product_id or product_name so merchants can tune the right result.",
    ),
    check(
      "risk-products",
      "Risk products",
      riskProducts ? "fail" : products.some((product) => product.status === "watch") ? "warn" : feedbackEvents.length ? "pass" : "warn",
      riskProducts ? `${riskProducts} product${riskProducts === 1 ? "" : "s"} have high negative feedback.` : "No high-risk product feedback cluster is currently present.",
      riskProducts ? "Prioritize the highest-risk product before changing global ranking logic." : "Keep monitoring negative feedback themes by product and source.",
    ),
  ];
}

function buildActions(report: Omit<RecommendationFeedbackReport, "packet" | "actions">): FeedbackAction[] {
  const actions: FeedbackAction[] = [];
  const riskiest = report.products.find((product) => product.status === "needs-attention");
  const watch = report.products.find((product) => product.status === "watch");
  const topPositive = report.products.find((product) => product.positive > 0 && product.status === "healthy");
  const feedbackCheck = report.checks.find((item) => item.id === "feedback-volume");
  const attributionCheck = report.checks.find((item) => item.id === "product-attribution" && item.status === "fail");

  if (!report.summary.feedback) {
    actions.push({
      id: "capture-first-feedback",
      title: "Capture the first result-card feedback event",
      detail: "Feedback Center needs a shopper rating before it can diagnose recommendation quality.",
      evidence: feedbackCheck?.detail || "0 feedback events captured.",
      priority: "high",
      href: "/dashboard/storefront-sandbox",
      label: "Run QA",
    });
  }

  if (riskiest) {
    actions.push({
      id: `repair-${riskiest.id}`,
      title: `Repair ${riskiest.productName} recommendation quality`,
      detail: riskiest.recommendation,
      evidence: riskiest.evidence,
      priority: "critical",
      href: "/dashboard/lab",
      label: "Debug match",
    });
  } else if (watch) {
    actions.push({
      id: `watch-${watch.id}`,
      title: `Watch ${watch.productName}`,
      detail: watch.recommendation,
      evidence: watch.evidence,
      priority: "medium",
      href: "/dashboard/analytics",
      label: "Review events",
    });
  }

  if (topPositive) {
    actions.push({
      id: `scale-${topPositive.id}`,
      title: `Reuse proof from ${topPositive.productName}`,
      detail: "Positive feedback indicates this product/explanation pairing is landing with shoppers.",
      evidence: topPositive.evidence,
      priority: "low",
      href: "/dashboard/merchandising",
      label: "Apply learning",
    });
  }

  if (attributionCheck) {
    actions.push({
      id: "repair-feedback-product-identity",
      title: "Repair feedback product identity",
      detail: "Feedback without product identity cannot be tied back to recommendation rules or catalog data.",
      evidence: attributionCheck.detail,
      priority: "high",
      href: "/dashboard/widget-studio",
      label: "Review event contract",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .slice(0, 5);
}

function buildPacket(report: Omit<RecommendationFeedbackReport, "packet">) {
  return [
    "Findly Recommendation Feedback packet",
    "=====================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Boundary",
    "- Shopper feedback does not select products; deterministic rules still choose and rank results.",
    "- Use negative feedback to tune catalog evidence, question mapping, explanations and recovery copy.",
    "",
    "Summary",
    `- Feedback: ${report.summary.feedback} · Positive: ${report.summary.positive} · Negative: ${report.summary.negative}`,
    `- Feedback rate: ${report.summary.feedbackRate}% · Negative rate: ${report.summary.negativeRate}%`,
    "",
    "Product feedback",
    ...report.products.map((product) => [
      `- ${product.productName} (${product.status}, ${product.score}%)`,
      `  Evidence: ${product.evidence}`,
      `  Next step: ${product.recommendation}`,
    ].join("\n")),
    "",
    "Feedback themes",
    ...report.themes.map((theme) => `- [${theme.sentiment.toUpperCase()}] ${theme.label}: ${theme.count} event${theme.count === 1 ? "" : "s"} · ${theme.recommendation}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildRecommendationFeedbackReport(events: AnalyticsEvent[], products: Product[] = []): RecommendationFeedbackReport {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const snapshot = buildAnalyticsSnapshot(events);
  const feedbackEvents = events.filter((event) => event.event_type === "recommendation_feedback");
  const drafts = new Map<string, ProductDraft>();

  for (const event of events) {
    if (event.event_type !== "product_recommended" && event.event_type !== "buy_click" && event.event_type !== "recommendation_feedback") continue;
    const draft = getDraft(drafts, event, productsById);
    draft.sources.add(getEventExperienceType(event));
    if (event.event_type === "product_recommended") draft.recommendations += 1;
    if (event.event_type === "buy_click") draft.buyClicks += 1;
    if (event.event_type === "recommendation_feedback") {
      const sentiment = feedbackSentiment(event);
      const reason = feedbackReason(event, sentiment);
      const reasonKey = `${sentiment}:${idFrom(reason)}`;
      draft.feedback += 1;
      if (sentiment === "positive") draft.positive += 1;
      else draft.negative += 1;
      const existing = draft.reasons.get(reasonKey) || { label: reason, count: 0, sentiment };
      existing.count += 1;
      draft.reasons.set(reasonKey, existing);
    }
  }

  const productRows = buildProductRows(drafts).filter((product) => product.feedback > 0 || product.recommendations > 0);
  const themes = buildThemes(feedbackEvents, productsById);
  const checks = buildChecks(events, feedbackEvents, productRows);
  const positive = feedbackEvents.filter((event) => feedbackSentiment(event) === "positive").length;
  const negative = feedbackEvents.length - positive;
  const feedbackRate = Math.round(stageRate(feedbackEvents.length, snapshot.product_recommended));
  const negativeRate = Math.round(stageRate(negative, feedbackEvents.length));
  const highRiskProducts = productRows.filter((product) => product.status === "needs-attention").length;
  const sources = new Set(feedbackEvents.map(getEventExperienceType)).size;
  const score = Math.max(0, Math.min(100, Math.round(
    50
    + Math.min(24, positive * 5)
    + Math.min(12, feedbackRate * 0.8)
    + (feedbackEvents.length ? 8 : 0)
    - negative * 8
    - highRiskProducts * 12
    - Math.max(0, negativeRate - 25) * 0.6,
  )));
  const status: RecommendationFeedbackStatus = !events.length || !snapshot.product_recommended
    ? "empty"
    : highRiskProducts || negativeRate >= 45
      ? "needs-attention"
      : feedbackEvents.length
        ? score >= 72 ? "healthy" : "collecting"
        : "collecting";
  const baseReport: Omit<RecommendationFeedbackReport, "packet" | "actions"> = {
    status,
    score,
    headline: status === "healthy"
      ? "Recommendation feedback is positive enough to reuse winning proof and keep monitoring."
      : status === "needs-attention"
        ? "Recommendation feedback is exposing product or explanation friction that needs triage."
        : status === "collecting"
          ? "Feedback capture is active; collect more ratings before making broad ranking changes."
          : "Feedback Center needs product recommendations before it can measure shopper quality.",
    summary: {
      sessions: new Set(events.map(analyticsEventSessionId)).size,
      recommendations: snapshot.product_recommended,
      buyClicks: snapshot.buy_click,
      feedback: feedbackEvents.length,
      positive,
      negative,
      feedbackRate,
      negativeRate,
      productsWithFeedback: new Set(feedbackEvents.map((event) => productKey(event, productsById))).size,
      highRiskProducts,
      sources,
    },
    products: productRows,
    themes,
    checks,
  };
  const reportWithActions = { ...baseReport, actions: buildActions(baseReport) };
  return { ...reportWithActions, packet: buildPacket(reportWithActions) };
}
