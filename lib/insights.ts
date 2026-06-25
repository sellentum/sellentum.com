import type { AnalyticsEvent, ExperienceType, Product } from "@/lib/types";

export type InsightCount = {
  label: string;
  detail?: string;
  count: number;
  sources: ExperienceType[];
  products: string[];
};

export type ProductDemandInsight = {
  productId?: string;
  productName: string;
  recommended: number;
  clicks: number;
  clickRate: number;
  sources: ExperienceType[];
  lastSeen: string;
};

export type IntentOpportunity = {
  title: string;
  detail: string;
  recommendation: string;
  severity: "info" | "watch" | "win";
};

export type HighIntentMoment = {
  id: string;
  type: ExperienceType;
  eventType: AnalyticsEvent["event_type"];
  productName: string;
  summary: string;
  date: string;
};

export type ZeroPartyInsightReport = {
  answers: InsightCount[];
  queryThemes: InsightCount[];
  catalogSignals: InsightCount[];
  productDemand: ProductDemandInsight[];
  opportunities: IntentOpportunity[];
  recent: HighIntentMoment[];
  summary: {
    explicitSignals: number;
    uniqueSignals: number;
    productsWithDemand: number;
  };
};

const experienceValues = new Set(["finder", "assistant", "configurator", "search"]);

const intentStopWords = new Set([
  "about", "after", "also", "best", "brand", "brands", "buy", "can", "could", "find", "for", "from", "give", "good", "have", "help", "into", "like", "looking", "match", "me", "need", "please", "product", "products", "recommend", "show", "some", "something", "that", "the", "them", "this", "under", "want", "what", "when", "where", "which", "with", "would", "your",
]);

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(textValue).filter(Boolean) : [];
}

function eventExperience(event: Pick<AnalyticsEvent, "metadata" | "quiz_id">): ExperienceType {
  const value = textValue(event.metadata?.experience_type);
  if (experienceValues.has(value)) return value as ExperienceType;
  return event.quiz_id.startsWith("config_") ? "configurator" : "finder";
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return normalizeLabel(value).toLowerCase();
}

function tokeniseIntent(value: string) {
  const tokens = value
    .toLowerCase()
    .match(/[a-z][a-z-]{2,}/g) || [];
  return [...new Set(tokens
    .map((word) => word.endsWith("ies") && word.length > 4 ? `${word.slice(0, -3)}y` : word.endsWith("s") && !word.endsWith("ss") && word.length > 4 ? word.slice(0, -1) : word)
    .filter((word) => !intentStopWords.has(word)))];
}

function answerItems(metadata?: Record<string, unknown>) {
  const answers = metadata?.answers;
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const answer = textValue(entry.answer);
    if (!answer) return [];
    return [{ answer, question: textValue(entry.question) || "Finder question" }];
  });
}

function addInsight(
  map: Map<string, InsightCount>,
  label: string,
  source: ExperienceType,
  detail?: string,
  productName?: string,
) {
  const cleanLabel = normalizeLabel(label);
  if (!cleanLabel) return;
  const key = normalizeKey(cleanLabel);
  const existing = map.get(key) || { label: cleanLabel, detail, count: 0, sources: [], products: [] };
  existing.count += 1;
  if (!existing.detail && detail) existing.detail = detail;
  if (!existing.sources.includes(source)) existing.sources.push(source);
  if (productName && !existing.products.includes(productName)) existing.products.push(productName);
  map.set(key, existing);
}

function topInsights(map: Map<string, InsightCount>, limit = 6) {
  return [...map.values()]
    .map((item) => ({ ...item, sources: item.sources.sort(), products: item.products.sort() }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function productNameForEvent(event: AnalyticsEvent, productsById: Map<string, Product>) {
  return textValue(event.metadata?.product_name) || (event.product_id ? productsById.get(event.product_id)?.name : "") || "";
}

function productDemandKey(event: AnalyticsEvent, productName: string) {
  return event.product_id || normalizeKey(productName);
}

function buildOpportunities(report: Omit<ZeroPartyInsightReport, "opportunities">): IntentOpportunity[] {
  const opportunities: IntentOpportunity[] = [];
  const topAnswer = report.answers[0];
  const topTheme = report.queryThemes[0];
  const stalledProduct = report.productDemand.find((item) => item.recommended >= 2 && item.clickRate < 20);
  const winner = report.productDemand.find((item) => item.clicks > 0 && item.clickRate >= 40);

  if (!report.summary.explicitSignals) {
    opportunities.push({
      title: "Capture more shopper intent",
      detail: "No answer, query or matched-signal patterns are available for this filter yet.",
      recommendation: "Open a published finder/search preview, complete a few journeys, then use this hub to tune rules and catalog language.",
      severity: "info",
    });
  }

  if (topAnswer && topAnswer.count >= 2) {
    opportunities.push({
      title: `Make “${topAnswer.label}” a stronger path`,
      detail: `${topAnswer.count} shopper signals mention this answer${topAnswer.detail ? ` from ${topAnswer.detail}` : ""}.`,
      recommendation: "Check whether the answer maps to enough active products, then consider a merchandising boost for the strongest match.",
      severity: "watch",
    });
  }

  if (topTheme && topTheme.count >= 2) {
    opportunities.push({
      title: `Lean into “${topTheme.label}” demand`,
      detail: `${topTheme.count} query or semantic signals point at this theme across ${topTheme.sources.join(", ")}.`,
      recommendation: "Add the phrase to relevant product tags, buyer needs or search text, then validate it in Search Lab.",
      severity: "info",
    });
  }

  if (stalledProduct) {
    opportunities.push({
      title: `Improve ${stalledProduct.productName} conversion`,
      detail: `${stalledProduct.productName} was surfaced ${stalledProduct.recommended} times with a ${Math.round(stalledProduct.clickRate)}% buy-click rate.`,
      recommendation: "Review its image, product URL, price positioning and recommendation explanation before changing ranking logic.",
      severity: "watch",
    });
  }

  if (winner) {
    opportunities.push({
      title: `Double down on ${winner.productName}`,
      detail: `${winner.productName} is converting at ${Math.round(winner.clickRate)}% from recommendation to buy click.`,
      recommendation: "Use the winning signals in quiz copy, landing-page messaging or similar product tags.",
      severity: "win",
    });
  }

  return opportunities.slice(0, 4);
}

export function buildZeroPartyInsights(events: AnalyticsEvent[], products: Product[] = []): ZeroPartyInsightReport {
  const answers = new Map<string, InsightCount>();
  const queryThemes = new Map<string, InsightCount>();
  const catalogSignals = new Map<string, InsightCount>();
  const productsById = new Map(products.map((product) => [product.id, product]));
  const demand = new Map<string, ProductDemandInsight>();

  for (const event of events) {
    const metadata = event.metadata || {};
    const source = eventExperience(event);
    const productName = productNameForEvent(event, productsById);

    for (const answer of answerItems(metadata)) addInsight(answers, answer.answer, source, answer.question, productName);
    for (const label of stringArray(metadata.answer_summary)) addInsight(answers, label, source, "Answer summary", productName);
    for (const label of stringArray(metadata.selected_option_names)) addInsight(answers, label, source, "Configurator option", productName);

    const query = textValue(metadata.query);
    for (const term of stringArray(metadata.terms)) addInsight(queryThemes, term, source, "Parsed shopper query", productName);
    for (const term of tokeniseIntent(query)) addInsight(queryThemes, term, source, query, productName);

    for (const signal of [
      ...stringArray(metadata.matched_reasons),
      ...stringArray(metadata.matched_signals),
      ...stringArray(metadata.selected_tags),
      ...stringArray(metadata.semantic_terms),
    ]) addInsight(catalogSignals, signal, source, "Matched catalog signal", productName);

    if ((event.event_type === "product_recommended" || event.event_type === "buy_click") && (event.product_id || productName)) {
      const key = productDemandKey(event, productName);
      const existing = demand.get(key) || {
        productId: event.product_id,
        productName: productName || event.product_id || "Unknown product",
        recommended: 0,
        clicks: 0,
        clickRate: 0,
        sources: [],
        lastSeen: event.created_at,
      };
      if (event.event_type === "product_recommended") existing.recommended += 1;
      if (event.event_type === "buy_click") existing.clicks += 1;
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (new Date(event.created_at).getTime() > new Date(existing.lastSeen).getTime()) existing.lastSeen = event.created_at;
      existing.clickRate = existing.recommended ? existing.clicks / existing.recommended * 100 : existing.clicks ? 100 : 0;
      demand.set(key, existing);
    }
  }

  const productDemand = [...demand.values()]
    .map((item) => ({ ...item, sources: item.sources.sort(), clickRate: Math.round(item.clickRate * 10) / 10 }))
    .sort((a, b) => b.recommended - a.recommended || b.clicks - a.clicks || b.clickRate - a.clickRate || a.productName.localeCompare(b.productName))
    .slice(0, 6);

  const recent = events
    .filter((event) => ["quiz_complete", "product_recommended", "buy_click"].includes(event.event_type))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((event) => {
      const metadata = event.metadata || {};
      const query = textValue(metadata.query);
      const productName = productNameForEvent(event, productsById);
      const answerSummary = [
        ...answerItems(metadata).map((item) => item.answer),
        ...stringArray(metadata.selected_option_names),
      ];
      const summary = query || answerSummary.slice(0, 2).join(", ") || productName || "Shopper intent captured";
      return {
        id: event.id,
        type: eventExperience(event),
        eventType: event.event_type,
        productName,
        summary,
        date: new Date(event.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      };
    });

  const baseReport = {
    answers: topInsights(answers),
    queryThemes: topInsights(queryThemes),
    catalogSignals: topInsights(catalogSignals),
    productDemand,
    recent,
    summary: {
      explicitSignals: [...answers.values(), ...queryThemes.values(), ...catalogSignals.values()].reduce((sum, item) => sum + item.count, 0),
      uniqueSignals: answers.size + queryThemes.size + catalogSignals.size,
      productsWithDemand: productDemand.length,
    },
  };

  return {
    ...baseReport,
    opportunities: buildOpportunities(baseReport),
  };
}
