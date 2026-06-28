import { buildZeroPartyInsights } from "./insights";
import { buildShopperJourneyReport } from "./journey-insights";
import type { AnalyticsEvent, ExperienceType, Product } from "@/lib/types";
import { getEventExperienceType } from "./utils";

export type PersonaStudioStatus = "empty" | "learning" | "actionable";
export type PersonaConfidence = "low" | "medium" | "high";
export type PersonaActionPriority = "critical" | "high" | "medium" | "low";
export type PersonaSignalStatus = "missing" | "thin" | "healthy";

export type PersonaProductAffinity = {
  productId?: string;
  productName: string;
  recommendations: number;
  clicks: number;
  score: number;
};

export type ShopperPersona = {
  id: string;
  name: string;
  segment: string;
  description: string;
  confidence: PersonaConfidence;
  score: number;
  audienceSize: number;
  signalCount: number;
  conversionRate: number;
  sources: ExperienceType[];
  intentSignals: string[];
  answerSignals: string[];
  querySignals: string[];
  productAffinities: PersonaProductAffinity[];
  averageBudget?: number;
  recommendedExperience: ExperienceType;
  launchAngle: string;
  nextStep: string;
  evidence: string;
};

export type PersonaSignalMatrixRow = {
  id: string;
  label: string;
  count: number;
  status: PersonaSignalStatus;
  detail: string;
  examples: string[];
};

export type PersonaStudioAction = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  priority: PersonaActionPriority;
  href: string;
  label: string;
};

export type PersonaStudioReport = {
  status: PersonaStudioStatus;
  score: number;
  headline: string;
  summary: {
    personas: number;
    highConfidence: number;
    explicitSignals: number;
    journeySessions: number;
    personaSessions: number;
    averageConversionRate: number;
  };
  personas: ShopperPersona[];
  signalMatrix: PersonaSignalMatrixRow[];
  actions: PersonaStudioAction[];
  packet: string;
};

type PersonaBlueprint = {
  id: string;
  name: string;
  segment: string;
  description: string;
  keywords: string[];
  recommendedExperience: ExperienceType;
  launchAngle: string;
  nextStep: string;
};

type PersonaDraft = {
  blueprint: PersonaBlueprint;
  weightedSignals: number;
  rawSignals: number;
  sessions: Set<string>;
  sources: Set<ExperienceType>;
  answers: Map<string, number>;
  queries: Map<string, number>;
  intentSignals: Map<string, number>;
  productAffinities: Map<string, PersonaProductAffinity>;
  budgets: number[];
  catalogMatches: number;
  recommendations: number;
  clicks: number;
};

const personaBlueprints: PersonaBlueprint[] = [
  {
    id: "trail-confidence",
    name: "Trail confidence buyers",
    segment: "Outdoor performance",
    description: "Shoppers who want grip, wet-weather confidence and dependable comfort for trails or mixed outdoor surfaces.",
    keywords: ["trail", "outdoor", "outdoors", "wet", "water", "waterproof", "water-ready", "mud", "grip", "terrain", "all-terrain", "weekend", "long-distance"],
    recommendedExperience: "configurator",
    launchAngle: "Build a “weekend trail kit” path that starts with terrain, then adds weather and comfort choices.",
    nextStep: "Open Configurators and make the trail/wet-weather bundle the cleanest product-linked path.",
  },
  {
    id: "comfort-fit",
    name: "Comfort-first fit seekers",
    segment: "Fit and daily comfort",
    description: "Shoppers who care about cushioning, stability, walking comfort and softer choices for long days.",
    keywords: ["comfort", "comfortable", "cushion", "cushioning", "soft", "stable", "stability", "walking", "walker", "wide", "wide-fit", "all-day"],
    recommendedExperience: "finder",
    launchAngle: "Lead with feel-underfoot questions and explain the comfort proof points on each result card.",
    nextStep: "Open Flow Studio and ensure comfort answers map to at least three active products or safe alternatives.",
  },
  {
    id: "speed-road",
    name: "Speed and road runners",
    segment: "Performance buying intent",
    description: "Buyers looking for responsiveness, race-day feel, tempo training or road-running performance.",
    keywords: ["speed", "faster", "fast", "race", "racing", "road", "tempo", "responsive", "performance", "energy", "return", "lightweight"],
    recommendedExperience: "assistant",
    launchAngle: "Use the advisor to capture goal-led prompts like “faster road running” and route them to performance evidence.",
    nextStep: "Open Advisor Studio and test prompts around racing, responsiveness and lightweight performance.",
  },
  {
    id: "city-travel",
    name: "City travel minimalists",
    segment: "Everyday versatility",
    description: "Shoppers who want lightweight, breathable and easy everyday products for commuting, travel or city use.",
    keywords: ["city", "travel", "commute", "commutes", "everyday", "daily", "breathable", "flexible", "minimal", "minimalist", "light", "lightweight"],
    recommendedExperience: "search",
    launchAngle: "Create a low-friction search or finder placement for everyday travel use cases.",
    nextStep: "Open Search Lab and validate city, travel, commute and everyday phrases against catalog coverage.",
  },
  {
    id: "budget-sensible",
    name: "Budget-sensitive deciders",
    segment: "Price confidence",
    description: "Shoppers who need clear price ceilings, value framing and safer alternatives when a preferred product is over budget.",
    keywords: ["budget", "under", "price", "value", "affordable", "cheap", "cost", "ceiling", "range"],
    recommendedExperience: "finder",
    launchAngle: "Move budget earlier in the path and frame recommendations around best-fit within range.",
    nextStep: "Open Product Finders and confirm budget_max answers are hard constraints with recovery copy.",
  },
];

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9£$.-]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return [...new Set((normalize(value).match(/[a-z][a-z-]{2,}/g) || []).map((word) => {
    if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith("s") && !word.endsWith("ss") && word.length > 4) return word.slice(0, -1);
    return word;
  }))];
}

function answerSignals(metadata?: Record<string, unknown>) {
  const answers = metadata?.answers;
  const fromAnswers = Array.isArray(answers)
    ? answers.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      return [text(entry.answer), text(entry.match_value)].filter(Boolean);
    })
    : [];
  return [...fromAnswers, ...stringArray(metadata?.answer_summary), ...stringArray(metadata?.selected_option_names)];
}

function querySignals(metadata?: Record<string, unknown>) {
  return [text(metadata?.query), ...stringArray(metadata?.terms)].filter(Boolean);
}

function catalogSignals(metadata?: Record<string, unknown>) {
  return [
    ...stringArray(metadata?.matched_reasons),
    ...stringArray(metadata?.matched_signals),
    ...stringArray(metadata?.selected_tags),
    ...stringArray(metadata?.semantic_terms),
  ];
}

function productText(product?: Product) {
  if (!product) return "";
  return [
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" ");
}

function eventSignalText(event: AnalyticsEvent, product?: Product) {
  const metadata = event.metadata || {};
  return [
    ...answerSignals(metadata),
    ...querySignals(metadata),
    ...catalogSignals(metadata),
    text(metadata.product_name),
    text(metadata.experience_name),
    productText(product),
  ].join(" ");
}

function matchesBlueprint(value: string, blueprint: PersonaBlueprint) {
  const normalized = normalize(value);
  if (!normalized) return false;
  const tokens = new Set(tokenize(normalized));
  return blueprint.keywords.some((keyword) => {
    const cleanKeyword = normalize(keyword);
    return normalized.includes(cleanKeyword) || tokenize(cleanKeyword).some((token) => tokens.has(token));
  });
}

function sessionId(event: AnalyticsEvent) {
  return text(event.metadata?.session_id) || event.id;
}

function eventWeight(event: AnalyticsEvent) {
  if (event.event_type === "buy_click") return 6;
  if (event.event_type === "quiz_complete") return 4;
  if (event.event_type === "product_recommended") return 3;
  if (event.event_type === "quiz_start") return 2;
  return 1;
}

function addCount(map: Map<string, number>, label: string, amount = 1) {
  const clean = label.replace(/\s+/g, " ").trim();
  if (!clean) return;
  map.set(clean, (map.get(clean) || 0) + amount);
}

function topCounts(map: Map<string, number>, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

function addProductAffinity(draft: PersonaDraft, product: Product | undefined, event: AnalyticsEvent | null, amount: number) {
  const productName = product?.name || text(event?.metadata?.product_name) || event?.product_id || "";
  if (!productName) return;
  const key = product?.id || event?.product_id || normalize(productName);
  const existing = draft.productAffinities.get(key) || {
    productId: product?.id || event?.product_id,
    productName,
    recommendations: 0,
    clicks: 0,
    score: 0,
  };
  if (event?.event_type === "product_recommended") existing.recommendations += 1;
  if (event?.event_type === "buy_click") existing.clicks += 1;
  existing.score += amount;
  draft.productAffinities.set(key, existing);
}

function confidenceFor(draft: PersonaDraft): PersonaConfidence {
  if (draft.weightedSignals >= 28 && draft.sessions.size >= 3 && draft.sources.size >= 2) return "high";
  if (draft.weightedSignals >= 10 || draft.catalogMatches >= 2 || draft.sessions.size >= 2) return "medium";
  return "low";
}

function personaScore(draft: PersonaDraft) {
  return Math.min(100, Math.round(
    draft.weightedSignals * 3
    + draft.sessions.size * 6
    + draft.sources.size * 8
    + draft.catalogMatches * 5
    + draft.clicks * 6,
  ));
}

function statusFromSignals(count: number): PersonaSignalStatus {
  if (count >= 8) return "healthy";
  if (count > 0) return "thin";
  return "missing";
}

function signalRow(id: string, label: string, count: number, detail: string, examples: string[]): PersonaSignalMatrixRow {
  return { id, label, count, status: statusFromSignals(count), detail, examples: examples.slice(0, 4) };
}

function conversionRate(draft: PersonaDraft) {
  return draft.recommendations ? Math.round(draft.clicks / draft.recommendations * 1000) / 10 : draft.clicks ? 100 : 0;
}

function budgetAverage(draft: PersonaDraft) {
  if (!draft.budgets.length) return undefined;
  return Math.round(draft.budgets.reduce((sum, item) => sum + item, 0) / draft.budgets.length);
}

function buildPacket(report: Omit<PersonaStudioReport, "packet">) {
  return [
    "Sellentum Shopper Persona packet",
    "==============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Persona segments",
    ...report.personas.map((persona) => [
      `- ${persona.name} (${persona.confidence}, ${persona.score}%)`,
      `  Evidence: ${persona.evidence}`,
      `  Launch angle: ${persona.launchAngle}`,
      `  Next step: ${persona.nextStep}`,
    ].join("\n")),
    "",
    "Signal matrix",
    ...report.signalMatrix.map((row) => `- [${row.status.toUpperCase()}] ${row.label}: ${row.count} signal${row.count === 1 ? "" : "s"} · ${row.detail}`),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

function buildActions(personas: ShopperPersona[], signalMatrix: PersonaSignalMatrixRow[], explicitSignals: number): PersonaStudioAction[] {
  const actions: PersonaStudioAction[] = [];
  const topPersona = personas[0];
  const lowConversionPersona = personas.find((persona) => persona.signalCount >= 6 && persona.conversionRate < 20);
  const missingRows = signalMatrix.filter((row) => row.status === "missing");
  const thinRows = signalMatrix.filter((row) => row.status === "thin");

  if (!explicitSignals) {
    actions.push({
      id: "capture-intent-signals",
      title: "Capture zero-party shopper signals",
      detail: "Persona Studio needs answer, query, recommendation or buy-click metadata before it can prioritize live segments.",
      evidence: "No explicit analytics signals were available in the selected workspace.",
      priority: "high",
      href: "/dashboard/storefront-sandbox",
      label: "Run QA journey",
    });
  }

  if (topPersona) {
    actions.push({
      id: `activate-${topPersona.id}`,
      title: `Activate ${topPersona.name}`,
      detail: topPersona.launchAngle,
      evidence: `${topPersona.signalCount} weighted signal${topPersona.signalCount === 1 ? "" : "s"} across ${topPersona.sources.join(", ")} with ${topPersona.audienceSize} session${topPersona.audienceSize === 1 ? "" : "s"}.`,
      priority: topPersona.confidence === "high" ? "high" : "medium",
      href: topPersona.recommendedExperience === "configurator" ? "/dashboard/configurators" : topPersona.recommendedExperience === "assistant" ? "/dashboard/advisor" : topPersona.recommendedExperience === "search" ? "/dashboard/search" : "/dashboard/quizzes",
      label: "Open builder",
    });
  }

  if (lowConversionPersona) {
    actions.push({
      id: `improve-${lowConversionPersona.id}-conversion`,
      title: `Improve conversion proof for ${lowConversionPersona.name}`,
      detail: "This persona has enough intent to warrant better result-card proof, product imagery, price framing or CTA copy.",
      evidence: `${lowConversionPersona.conversionRate}% recommendation-to-buy-click rate from ${lowConversionPersona.productAffinities.length} product affinity cluster${lowConversionPersona.productAffinities.length === 1 ? "" : "s"}.`,
      priority: "high",
      href: "/dashboard/analytics",
      label: "Review demand",
    });
  }

  if (missingRows.length || thinRows.length) {
    const row = [...missingRows, ...thinRows][0]!;
    actions.push({
      id: `deepen-${row.id}`,
      title: `Deepen ${row.label.toLowerCase()} evidence`,
      detail: "A Zoovu-like guided-selling engine needs enough zero-party evidence to distinguish buyer types from random traffic.",
      evidence: `${row.label} is ${row.status} with ${row.count} captured signal${row.count === 1 ? "" : "s"}.`,
      priority: row.status === "missing" ? "high" : "medium",
      href: "/dashboard/analytics",
      label: "Review analytics",
    });
  }

  return actions
    .filter((action, index, list) => list.findIndex((item) => item.id === action.id) === index)
    .slice(0, 5);
}

export function buildPersonaStudioReport(events: AnalyticsEvent[], products: Product[] = []): PersonaStudioReport {
  const insights = buildZeroPartyInsights(events, products);
  const journeys = buildShopperJourneyReport(events, products);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const drafts = new Map<string, PersonaDraft>(personaBlueprints.map((blueprint) => [blueprint.id, {
    blueprint,
    weightedSignals: 0,
    rawSignals: 0,
    sessions: new Set<string>(),
    sources: new Set<ExperienceType>(),
    answers: new Map<string, number>(),
    queries: new Map<string, number>(),
    intentSignals: new Map<string, number>(),
    productAffinities: new Map<string, PersonaProductAffinity>(),
    budgets: [],
    catalogMatches: 0,
    recommendations: 0,
    clicks: 0,
  }]));

  for (const product of products.filter((item) => item.active)) {
    const signalText = productText(product);
    for (const draft of drafts.values()) {
      if (!matchesBlueprint(signalText, draft.blueprint)) continue;
      draft.catalogMatches += 1;
      draft.weightedSignals += 1;
      addProductAffinity(draft, product, null, 1);
      for (const tag of [...product.tags, ...product.features, ...(product.buyer_needs || [])]) {
        if (matchesBlueprint(tag, draft.blueprint)) addCount(draft.intentSignals, tag, 1);
      }
    }
  }

  for (const event of events) {
    const product = event.product_id ? productsById.get(event.product_id) : undefined;
    const signalText = eventSignalText(event, product);
    const weight = eventWeight(event);
    const source = getEventExperienceType(event);
    const metadata = event.metadata || {};
    const budget = numberValue(metadata.max_budget);

    for (const draft of drafts.values()) {
      if (!matchesBlueprint(signalText, draft.blueprint) && !(budget !== null && draft.blueprint.id === "budget-sensible")) continue;
      draft.weightedSignals += weight;
      draft.rawSignals += 1;
      draft.sessions.add(sessionId(event));
      draft.sources.add(source);
      if (budget !== null) draft.budgets.push(budget);
      if (event.event_type === "product_recommended") draft.recommendations += 1;
      if (event.event_type === "buy_click") draft.clicks += 1;
      for (const answer of answerSignals(metadata)) addCount(draft.answers, answer, weight);
      for (const query of querySignals(metadata)) addCount(draft.queries, query, weight);
      for (const signal of catalogSignals(metadata)) addCount(draft.intentSignals, signal, weight);
      if (product || text(metadata.product_name)) addProductAffinity(draft, product, event, weight);
    }
  }

  const personas = [...drafts.values()]
    .map((draft): ShopperPersona => {
      const confidence = confidenceFor(draft);
      const score = personaScore(draft);
      const sources = [...draft.sources].sort();
      const productAffinities = [...draft.productAffinities.values()]
        .sort((a, b) => b.score - a.score || b.clicks - a.clicks || b.recommendations - a.recommendations || a.productName.localeCompare(b.productName))
        .slice(0, 4);
      const signalCount = Math.round(draft.weightedSignals);
      const audienceSize = draft.sessions.size;
      const catalogEvidence = draft.catalogMatches ? `${draft.catalogMatches} active catalog product${draft.catalogMatches === 1 ? "" : "s"}` : "No active catalog products";
      const sourceEvidence = sources.length ? sources.join(", ") : "catalog only";
      return {
        id: draft.blueprint.id,
        name: draft.blueprint.name,
        segment: draft.blueprint.segment,
        description: draft.blueprint.description,
        confidence,
        score,
        audienceSize,
        signalCount,
        conversionRate: conversionRate(draft),
        sources,
        intentSignals: topCounts(draft.intentSignals, 6),
        answerSignals: topCounts(draft.answers, 4),
        querySignals: topCounts(draft.queries, 4),
        productAffinities,
        averageBudget: budgetAverage(draft),
        recommendedExperience: draft.blueprint.recommendedExperience,
        launchAngle: draft.blueprint.launchAngle,
        nextStep: draft.blueprint.nextStep,
        evidence: `${signalCount} weighted signal${signalCount === 1 ? "" : "s"} from ${sourceEvidence}; ${catalogEvidence} support this segment.`,
      };
    })
    .filter((persona) => persona.score > 0 || persona.productAffinities.length > 0)
    .sort((a, b) => b.score - a.score || b.audienceSize - a.audienceSize || a.name.localeCompare(b.name))
    .slice(0, 5);

  const finderAnswerCount = insights.answers.reduce((sum, item) => sum + item.count, 0);
  const queryCount = insights.queryThemes.reduce((sum, item) => sum + item.count, 0);
  const configuratorCount = events.filter((event) => stringArray(event.metadata?.selected_option_names).length > 0).length;
  const recommendationCount = events.filter((event) => event.event_type === "product_recommended").length;
  const buyClickCount = events.filter((event) => event.event_type === "buy_click").length;
  const signalMatrix = [
    signalRow("finder-answers", "Finder answers", finderAnswerCount, "Selected answers reveal explicit shopper preferences and constraints.", insights.answers.map((item) => item.label)),
    signalRow("query-language", "Search and advisor language", queryCount, "Natural-language prompts reveal vocabulary that catalog tags may miss.", insights.queryThemes.map((item) => item.label)),
    signalRow("configurator-selections", "Configurator selections", configuratorCount, "Bundle choices expose compatibility-sensitive buying situations.", insights.answers.filter((item) => item.detail === "Configurator option").map((item) => item.label)),
    signalRow("recommendations", "Recommended products", recommendationCount, "Surfaced products show which catalog items each persona sees.", insights.productDemand.map((item) => item.productName)),
    signalRow("buy-clicks", "Buy clicks", buyClickCount, "Buy-click intent proves which persona/product pairings deserve more promotion.", insights.productDemand.filter((item) => item.clicks).map((item) => item.productName)),
  ];

  const explicitSignals = insights.summary.explicitSignals;
  const personaSessions = personas.reduce((sum, persona) => sum + persona.audienceSize, 0);
  const highConfidence = personas.filter((persona) => persona.confidence === "high").length;
  const averageConversionRate = personas.length ? Math.round(personas.reduce((sum, persona) => sum + persona.conversionRate, 0) / personas.length) : 0;
  const healthyRows = signalMatrix.filter((row) => row.status === "healthy").length;
  const score = Math.min(100, Math.round(
    personas.reduce((sum, persona) => sum + persona.score, 0) / Math.max(1, personas.length) * 0.58
    + healthyRows / signalMatrix.length * 24
    + Math.min(18, journeys.summary.sessions * 1.5),
  ));
  const status: PersonaStudioStatus = !events.length ? "empty" : score >= 72 && highConfidence > 0 ? "actionable" : "learning";
  const baseReport: Omit<PersonaStudioReport, "packet"> = {
    status,
    score,
    headline: status === "actionable"
      ? "Persona evidence is strong enough to guide launch messaging and experience design."
      : status === "learning"
        ? "Persona evidence is forming; capture a few more journeys before making big merchandising bets."
        : "Persona Studio needs live or QA journey signals before it can identify buyer segments.",
    summary: {
      personas: personas.length,
      highConfidence,
      explicitSignals,
      journeySessions: journeys.summary.sessions,
      personaSessions,
      averageConversionRate,
    },
    personas,
    signalMatrix,
    actions: buildActions(personas, signalMatrix, explicitSignals),
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
