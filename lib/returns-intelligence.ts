import { stageRate } from "./analytics";
import { buildCommercialImpactReport } from "./commercial-impact";
import { buildConfiguratorQaReport } from "./configurator-qa";
import { buildDiscoveryGapReport } from "./discovery-gaps";
import { buildZeroPartyInsights } from "./insights";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export type ReturnsIntelligenceStatus = "empty" | "needs-attention" | "watch" | "ready";
export type ReturnsRiskLevel = "low" | "medium" | "high";
export type ReturnsActionPriority = "critical" | "high" | "medium" | "low";

export type ReturnRiskDriver = {
  id: string;
  label: string;
  detail: string;
  severity: ReturnsRiskLevel;
};

export type ReturnRiskProduct = {
  productId: string;
  productName: string;
  category: string;
  price: number;
  riskLevel: ReturnsRiskLevel;
  riskScore: number;
  recommended: number;
  clicks: number;
  clickRate: number;
  drivers: ReturnRiskDriver[];
  preventionPlay: string;
};

export type FitFrictionSignal = {
  id: string;
  label: string;
  detail: string;
  count: number;
  severity: ReturnsRiskLevel;
  source: "catalog" | "analytics" | "configurator" | "finder";
  actionHref: string;
};

export type FitQuestionGap = {
  id: string;
  title: string;
  detail: string;
  suggestedQuestion: string;
  answerOptions: string[];
  severity: ReturnsActionPriority;
  actionHref: string;
};

export type SupportScript = {
  id: string;
  label: string;
  audience: "shopper" | "support" | "merchant";
  script: string;
};

export type ReturnsIntelligenceAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  priority: ReturnsActionPriority;
  actionHref: string;
  actionLabel: string;
};

export type ReturnsIntelligenceReport = {
  status: ReturnsIntelligenceStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    productsAtRisk: number;
    highRiskProducts: number;
    zeroResultJourneys: number;
    thinResultJourneys: number;
    stalledProducts: number;
    compatibilityGuardrails: number;
    assistedClickRate: number;
  };
  products: ReturnRiskProduct[];
  frictionSignals: FitFrictionSignal[];
  questionGaps: FitQuestionGap[];
  scripts: SupportScript[];
  actions: ReturnsIntelligenceAction[];
  packet: string;
};

type ProductStats = {
  recommended: number;
  clicks: number;
};

const fitTokens = [
  "fit", "size", "sizing", "width", "wide", "narrow", "dimension", "height", "length", "weight", "compatible", "compatibility", "material", "skin", "routine", "condition", "indoor", "outdoor", "budget", "support", "stable", "water", "wash", "voltage", "capacity",
];

const priorityRank: Record<ReturnsActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const severityScore: Record<ReturnsRiskLevel, number> = { low: 8, medium: 18, high: 32 };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function productText(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" "));
}

function hasFitLanguage(product: Product) {
  const source = productText(product);
  return fitTokens.some((token) => source.includes(token));
}

function riskLevel(score: number): ReturnsRiskLevel {
  if (score >= 70) return "high";
  if (score >= 38) return "medium";
  return "low";
}

function addDriver(drivers: ReturnRiskDriver[], id: string, label: string, detail: string, severity: ReturnsRiskLevel) {
  drivers.push({ id, label, detail, severity });
}

function productNameForEvent(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return text(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || "";
}

function normalizedProductKey(event: AnalyticsEvent, productsById: Map<string, Product>) {
  if (event.product_id) return event.product_id;
  const productName = productNameForEvent(event, productsById);
  return productName ? normalize(productName) : "";
}

function productStats(events: AnalyticsEvent[], products: Product[]) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const productsByName = new Map(products.map((product) => [normalize(product.name), product]));
  const stats = new Map<string, ProductStats>();

  for (const event of events) {
    if (event.event_type !== "product_recommended" && event.event_type !== "buy_click") continue;
    const key = normalizedProductKey(event, productsById);
    const product = productsById.get(key) || productsByName.get(key);
    const productId = product?.id || key;
    if (!productId) continue;
    const current = stats.get(productId) || { recommended: 0, clicks: 0 };
    if (event.event_type === "product_recommended") current.recommended += 1;
    if (event.event_type === "buy_click") current.clicks += 1;
    stats.set(productId, current);
  }

  return stats;
}

function productCompatibilityMentions(product: Product, configurators: Configurator[]) {
  return configurators.flatMap((configurator) => configurator.steps.flatMap((step) => step.options))
    .filter((option) => option.product_id === product.id && option.incompatible_option_ids.length > 0)
    .length;
}

function productRisk(product: Product, stats: ProductStats, configurators: Configurator[], categoryCount: number): ReturnRiskProduct {
  const drivers: ReturnRiskDriver[] = [];
  const clickRate = stageRate(stats.clicks, stats.recommended);
  const compatibilityMentions = productCompatibilityMentions(product, configurators);

  if (!product.image_url) addDriver(drivers, "missing-image", "Missing product image", "Shoppers cannot verify the product visually before clicking through.", "medium");
  if (!product.product_url) addDriver(drivers, "missing-url", "Missing product URL", "Buy-click handoff can fail or send shoppers to the wrong destination.", "high");
  if (!product.buyer_needs?.length) addDriver(drivers, "missing-buyer-needs", "No buyer-needs language", "The product lacks shopper-outcome language that helps prevent wrong-fit recommendations.", "medium");
  if (!hasFitLanguage(product)) addDriver(drivers, "thin-fit-language", "Thin fit/compatibility language", "The product copy does not clearly describe fit, constraints, compatibility or usage conditions.", "medium");
  if (categoryCount <= 1) addDriver(drivers, "single-category-option", "Limited category alternatives", "This category has only one active option, so shoppers may get a recommendation without enough comparison context.", "low");
  if (stats.recommended >= 2 && clickRate < 20) addDriver(drivers, "stalled-recommendations", "Surfaced but not clicked", `${product.name} was recommended ${stats.recommended} times with ${Math.round(clickRate)}% buy-click rate.`, "high");
  if (compatibilityMentions) addDriver(drivers, "compatibility-sensitive", "Compatibility-sensitive choice", `${compatibilityMentions} configurator option${compatibilityMentions === 1 ? "" : "s"} reference incompatibility rules for this product.`, "medium");

  const riskScore = Math.min(100, Math.round(drivers.reduce((sum, driver) => sum + severityScore[driver.severity], 0)));
  const level = riskLevel(riskScore);
  const preventionPlay = drivers.some((driver) => driver.id === "stalled-recommendations")
    ? "Replay the journeys that surfaced this product, then tighten explanation proof points and result-card CTA copy before changing ranking rules."
    : drivers.some((driver) => driver.id === "thin-fit-language" || driver.id === "missing-buyer-needs")
      ? "Add buyer-needs, fit constraints and plain-language usage context to the product record before the next launch."
      : drivers.some((driver) => driver.id === "compatibility-sensitive")
        ? "Expose compatibility warnings in the configurator and add a finder question that catches the constraint earlier."
        : "Keep collecting recommendation and buy-click signals; no urgent return-prevention blocker is visible.";

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    riskLevel: level,
    riskScore,
    recommended: stats.recommended,
    clicks: stats.clicks,
    clickRate,
    drivers,
    preventionPlay,
  };
}

function questionText(quizzes: Quiz[]) {
  return normalize(quizzes.flatMap((quiz) => [
    quiz.name,
    quiz.welcome_title,
    quiz.welcome_message,
    ...quiz.questions.flatMap((question) => [question.title, question.helper_text, ...question.options.map((option) => option.label)]),
  ]).join(" "));
}

function buildQuestionGaps(products: Product[], quizzes: Quiz[], reportProducts: ReturnRiskProduct[]): FitQuestionGap[] {
  const source = questionText(quizzes);
  const activeProducts = products.filter((product) => product.active);
  const gaps: FitQuestionGap[] = [];
  const topCategory = [...new Set(activeProducts.map((product) => product.category).filter(Boolean))][0] || "your products";
  const topRisk = reportProducts.find((product) => product.riskLevel === "high" || product.riskLevel === "medium");

  if (!/budget|price|spend/.test(source)) {
    gaps.push({
      id: "budget-guardrail",
      title: "Budget guardrail question",
      detail: "Budget mismatch is a common wrong-fit path, and the current finder copy does not clearly catch it.",
      suggestedQuestion: "What budget range should we stay within?",
      answerOptions: ["Under your entry price", "Mid-range value", "Best fit even if it costs more"],
      severity: "high",
      actionHref: "/dashboard/quizzes",
    });
  }

  if (!/fit|size|width|compatible|compatibility|dimension|skin|routine|condition/.test(source)) {
    gaps.push({
      id: "fit-constraint",
      title: "Fit and constraint question",
      detail: "The finder should catch the constraint most likely to cause regret before recommending a product.",
      suggestedQuestion: `Any fit, compatibility or usage constraints for ${topCategory}?`,
      answerOptions: ["I need the safest compatible option", "I want everyday versatility", "I know my specs and want performance"],
      severity: topRisk ? "high" : "medium",
      actionHref: "/dashboard/flow-studio",
    });
  }

  if (!/compare|tradeoff|priority|matters most|most important/.test(source)) {
    gaps.push({
      id: "tradeoff-question",
      title: "Tradeoff confidence question",
      detail: "Return-prone shoppers often need help choosing between similar products, not just a single top match.",
      suggestedQuestion: "Which tradeoff matters most?",
      answerOptions: ["Lowest risk choice", "Most comfortable/useful", "Highest performance"],
      severity: "medium",
      actionHref: "/dashboard/quizzes",
    });
  }

  if (!activeProducts.some((product) => product.buyer_needs?.length)) {
    gaps.push({
      id: "catalog-outcomes",
      title: "Catalog outcome language",
      detail: "No active products contain buyer-needs fields, so Sellentum has weaker language for preventing expectation mismatch.",
      suggestedQuestion: "What outcome should this product help you achieve?",
      answerOptions: ["Confidence and ease", "Performance", "Budget-safe choice"],
      severity: "critical",
      actionHref: "/dashboard/catalog-pipeline",
    });
  }

  return gaps.slice(0, 4);
}

function buildFrictionSignals({
  products,
  quizzes,
  configurators,
  events,
  reportProducts,
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  reportProducts: ReturnRiskProduct[];
}): FitFrictionSignal[] {
  const discovery = buildDiscoveryGapReport(events, products);
  const configuratorQa = buildConfiguratorQaReport(configurators, products);
  const signals: FitFrictionSignal[] = [];
  const activeProducts = products.filter((product) => product.active);
  const missingFitLanguage = activeProducts.filter((product) => !hasFitLanguage(product)).length;
  const missingBuyerNeeds = activeProducts.filter((product) => !product.buyer_needs?.length).length;
  const highRiskProducts = reportProducts.filter((product) => product.riskLevel === "high").length;
  const compatibilityGuardrails = configuratorQa.summary.compatibilityGuardrails;
  const finderHasBranching = quizzes.some((quiz) => quiz.questions.some((question) => question.options.some((option) => option.next_question_id)));

  if (discovery.summary.zeroResultJourneys) {
    signals.push({
      id: "zero-result-friction",
      label: "No-result journeys",
      detail: "No-result paths are high regret risk because shoppers either leave or choose without guidance.",
      count: discovery.summary.zeroResultJourneys,
      severity: "high",
      source: "analytics",
      actionHref: "/dashboard/lab",
    });
  }

  if (discovery.summary.thinResultJourneys) {
    signals.push({
      id: "thin-result-friction",
      label: "Thin recommendation sets",
      detail: "Fewer than three options can reduce shopper confidence and increase wrong-fit choice.",
      count: discovery.summary.thinResultJourneys,
      severity: "medium",
      source: "analytics",
      actionHref: "/dashboard/lab",
    });
  }

  if (missingFitLanguage) {
    signals.push({
      id: "missing-fit-language",
      label: "Products missing fit language",
      detail: "Product records without fit, constraint or compatibility copy weaken AI explanations and shopper confidence.",
      count: missingFitLanguage,
      severity: missingFitLanguage > activeProducts.length / 2 ? "high" : "medium",
      source: "catalog",
      actionHref: "/dashboard/attributes",
    });
  }

  if (missingBuyerNeeds) {
    signals.push({
      id: "missing-buyer-needs",
      label: "Products missing buyer needs",
      detail: "Buyer-needs fields translate specs into outcomes, which helps prevent expectation mismatch.",
      count: missingBuyerNeeds,
      severity: missingBuyerNeeds > activeProducts.length / 2 ? "high" : "medium",
      source: "catalog",
      actionHref: "/dashboard/catalog-pipeline",
    });
  }

  if (compatibilityGuardrails) {
    signals.push({
      id: "compatibility-guardrails",
      label: "Compatibility guardrails",
      detail: "Configurator incompatibility rules are valuable return-prevention evidence; keep them visible in shopper copy.",
      count: compatibilityGuardrails,
      severity: configuratorQa.summary.failedGuardrails ? "high" : "low",
      source: "configurator",
      actionHref: "/dashboard/configurators",
    });
  }

  if (!finderHasBranching && quizzes.length) {
    signals.push({
      id: "flat-finder-path",
      label: "Flat finder path",
      detail: "Conditional branching can route constrained shoppers away from irrelevant questions and reduce bad-fit recommendations.",
      count: quizzes.length,
      severity: "medium",
      source: "finder",
      actionHref: "/dashboard/flow-studio",
    });
  }

  if (highRiskProducts) {
    signals.push({
      id: "high-risk-products",
      label: "High-risk product records",
      detail: "These products combine catalog gaps, low click-through or compatibility sensitivity.",
      count: highRiskProducts,
      severity: "high",
      source: "catalog",
      actionHref: "/dashboard/products",
    });
  }

  return signals.sort((a, b) => severityScore[b.severity] - severityScore[a.severity] || b.count - a.count).slice(0, 8);
}

function buildScripts(reportProducts: ReturnRiskProduct[], questionGaps: FitQuestionGap[]): SupportScript[] {
  const topRisk = reportProducts[0];
  const topGap = questionGaps[0];
  return [
    {
      id: "result-explanation",
      label: "Recommendation confidence copy",
      audience: "shopper",
      script: topRisk
        ? `Before buying ${topRisk.productName}, confirm the shopper's main constraint is covered: ${topRisk.drivers[0]?.label || "fit and usage context"}. Show the reason, the tradeoff and a safer alternative if unsure.`
        : "Show the matched answer, the product fact supporting it, and one tradeoff so shoppers understand why the product fits.",
    },
    {
      id: "support-triage",
      label: "Support triage prompt",
      audience: "support",
      script: topGap
        ? `If a shopper is unsure, ask: “${topGap.suggestedQuestion}” Then map the answer back to the finder before recommending a product manually.`
        : "Ask for budget, usage context and must-have constraints before recommending outside the guided experience.",
    },
    {
      id: "merchant-review",
      label: "Merchant review note",
      audience: "merchant",
      script: topRisk
        ? `${topRisk.productName} should be reviewed before the next campaign: ${topRisk.preventionPlay}`
        : "Review stalled recommendations weekly, then improve product facts and explanations before changing deterministic ranking rules.",
    },
  ];
}

function buildActions({
  products,
  frictionSignals,
  questionGaps,
  reportProducts,
  events,
}: {
  products: Product[];
  frictionSignals: FitFrictionSignal[];
  questionGaps: FitQuestionGap[];
  reportProducts: ReturnRiskProduct[];
  events: AnalyticsEvent[];
}): ReturnsIntelligenceAction[] {
  const actions: ReturnsIntelligenceAction[] = [];
  const activeProducts = products.filter((product) => product.active);
  const topSignal = frictionSignals[0];
  const topGap = questionGaps[0];
  const highRiskProduct = reportProducts.find((product) => product.riskLevel === "high");
  const mediumRiskProduct = reportProducts.find((product) => product.riskLevel === "medium");

  if (!activeProducts.length) {
    actions.push({
      id: "import-catalog",
      title: "Import products before return-risk analysis",
      detail: "Returns & Fit Intelligence needs active products before it can find prevention gaps.",
      evidence: "0 active products in the workspace.",
      recommendation: "Upload a CSV or install a starter kit, then rerun catalog enrichment.",
      priority: "critical",
      actionHref: "/dashboard/products",
      actionLabel: "Add products",
    });
  }

  if (!events.length) {
    actions.push({
      id: "capture-fit-telemetry",
      title: "Capture shopper telemetry",
      detail: "No widget sessions are available, so product risk is based only on catalog structure.",
      evidence: "0 analytics events in the current workspace.",
      recommendation: "Open a public preview, complete a finder/search/advisor/configurator journey and click a product CTA.",
      priority: "high",
      actionHref: "/dashboard/widget-studio",
      actionLabel: "Install widget",
    });
  }

  if (highRiskProduct || mediumRiskProduct) {
    const product = highRiskProduct || mediumRiskProduct!;
    actions.push({
      id: `fix-risk-${product.productId}`,
      title: `Reduce wrong-fit risk for ${product.productName}`,
      detail: product.preventionPlay,
      evidence: `${product.riskScore}% risk score from ${product.drivers.length} driver${product.drivers.length === 1 ? "" : "s"}.`,
      recommendation: "Improve the product record, then replay likely shopper paths in Recommendation Lab.",
      priority: product.riskLevel === "high" ? "critical" : "high",
      actionHref: "/dashboard/products",
      actionLabel: "Review product",
    });
  }

  if (topGap) {
    actions.push({
      id: `add-${topGap.id}`,
      title: topGap.title,
      detail: topGap.detail,
      evidence: `Suggested finder question: “${topGap.suggestedQuestion}”.`,
      recommendation: "Add this to the finder or branching flow so constrained shoppers are caught before recommendation.",
      priority: topGap.severity,
      actionHref: topGap.actionHref,
      actionLabel: "Add guardrail",
    });
  }

  if (topSignal) {
    actions.push({
      id: `resolve-${topSignal.id}`,
      title: `Resolve ${topSignal.label.toLowerCase()}`,
      detail: topSignal.detail,
      evidence: `${topSignal.count} signal${topSignal.count === 1 ? "" : "s"} from ${topSignal.source}.`,
      recommendation: "Use the linked workbench to improve the underlying catalog, flow or compatibility rule.",
      priority: topSignal.severity === "high" ? "high" : "medium",
      actionHref: topSignal.actionHref,
      actionLabel: "Open workbench",
    });
  }

  actions.push({
    id: "review-support-script",
    title: "Give support a pre-purchase triage script",
    detail: "Support teams should ask the same constraint questions as the guided experience so manual advice stays consistent.",
    evidence: "Support-safe scripts are generated from the current top product risk and question gaps.",
    recommendation: "Copy the return-prevention packet into your support or ecommerce launch notes.",
    priority: "low",
    actionHref: "/dashboard/returns",
    actionLabel: "Copy packet",
  });

  return actions
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
    .slice(0, 6);
}

function headlineFor(status: ReturnsIntelligenceStatus, score: number) {
  if (status === "empty") return "Import products to start preventing wrong-fit purchases.";
  if (status === "needs-attention") return "Fix high-risk fit gaps before sending more traffic.";
  if (status === "watch") return "Some fit signals need attention before the next campaign.";
  return `Return-prevention readiness is strong at ${score}%.`;
}

function packetFor(report: Omit<ReturnsIntelligenceReport, "packet">) {
  return [
    "Sellentum Returns & Fit Intelligence packet",
    "========================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Active products: ${report.summary.activeProducts} · At-risk products: ${report.summary.productsAtRisk} · High-risk products: ${report.summary.highRiskProducts}`,
    `Signals: ${report.summary.zeroResultJourneys} no-result journeys · ${report.summary.thinResultJourneys} thin journeys · ${report.summary.stalledProducts} stalled products · ${Math.round(report.summary.assistedClickRate)}% assisted click rate`,
    "",
    "Top product risks",
    ...(report.products.slice(0, 5).map((product) => [
      `- [${product.riskLevel.toUpperCase()}] ${product.productName} (${product.riskScore}%)`,
      `  Evidence: ${product.recommended} recommendations · ${product.clicks} clicks · ${Math.round(product.clickRate)}% CTR`,
      `  Play: ${product.preventionPlay}`,
    ].join("\n")) || ["No product risks detected."]),
    "",
    "Fit friction signals",
    ...(report.frictionSignals.map((signal) => `- [${signal.severity.toUpperCase()}] ${signal.label}: ${signal.detail}`) || ["No fit friction signals detected."]),
    "",
    "Question guardrails",
    ...(report.questionGaps.map((gap) => `- ${gap.suggestedQuestion} (${gap.answerOptions.join(" / ")})`) || ["No question gaps detected."]),
    "",
    "Support scripts",
    ...report.scripts.map((script) => `- ${script.label}: ${script.script}`),
    "",
    "Action queue",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.recommendation}`),
  ].join("\n");
}

export function buildReturnsIntelligenceReport({
  products,
  quizzes,
  configurators,
  events = [],
}: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events?: AnalyticsEvent[];
}): ReturnsIntelligenceReport {
  const activeProducts = products.filter((product) => product.active);
  const stats = productStats(events, activeProducts);
  const categoryCounts = activeProducts.reduce((map, product) => map.set(product.category, (map.get(product.category) || 0) + 1), new Map<string, number>());
  const commercial = buildCommercialImpactReport(events, activeProducts);
  const discovery = buildDiscoveryGapReport(events, activeProducts);
  const zeroParty = buildZeroPartyInsights(events, activeProducts);
  const configuratorQa = buildConfiguratorQaReport(configurators, activeProducts);

  const productsAtRisk = activeProducts.map((product) => productRisk(product, stats.get(product.id) || { recommended: 0, clicks: 0 }, configurators, categoryCounts.get(product.category) || 0))
    .sort((a, b) => b.riskScore - a.riskScore || b.recommended - a.recommended || b.clicks - a.clicks || a.productName.localeCompare(b.productName));
  const frictionSignals = buildFrictionSignals({ products: activeProducts, quizzes, configurators, events, reportProducts: productsAtRisk });
  const questionGaps = buildQuestionGaps(activeProducts, quizzes, productsAtRisk);
  const scripts = buildScripts(productsAtRisk, questionGaps);
  const stalledProducts = productsAtRisk.filter((product) => product.recommended >= 2 && product.clickRate < 20).length;
  const highRiskProducts = productsAtRisk.filter((product) => product.riskLevel === "high").length;
  const atRisk = productsAtRisk.filter((product) => product.riskLevel !== "low").length;
  const score = activeProducts.length ? Math.max(0, Math.min(100, Math.round(
    100
    - (highRiskProducts * 18)
    - ((atRisk - highRiskProducts) * 8)
    - (discovery.summary.zeroResultJourneys * 10)
    - (discovery.summary.thinResultJourneys * 5)
    - (questionGaps.filter((gap) => gap.severity === "critical" || gap.severity === "high").length * 8)
    + Math.min(12, zeroParty.summary.explicitSignals * 2)
    + Math.min(8, configuratorQa.summary.compatibilityGuardrails * 2)
  ))) : 0;

  const status: ReturnsIntelligenceStatus = !activeProducts.length
    ? "empty"
    : highRiskProducts || discovery.summary.zeroResultJourneys >= 2
      ? "needs-attention"
      : atRisk || questionGaps.length || stalledProducts
        ? "watch"
        : "ready";

  const baseReport: Omit<ReturnsIntelligenceReport, "packet"> = {
    status,
    score,
    headline: headlineFor(status, score),
    summary: {
      activeProducts: activeProducts.length,
      productsAtRisk: atRisk,
      highRiskProducts,
      zeroResultJourneys: discovery.summary.zeroResultJourneys,
      thinResultJourneys: discovery.summary.thinResultJourneys,
      stalledProducts,
      compatibilityGuardrails: configuratorQa.summary.compatibilityGuardrails,
      assistedClickRate: commercial.summary.clickThroughRate,
    },
    products: productsAtRisk,
    frictionSignals,
    questionGaps,
    scripts,
    actions: buildActions({ products: activeProducts, frictionSignals, questionGaps, reportProducts: productsAtRisk, events }),
  };

  return { ...baseReport, packet: packetFor(baseReport) };
}
