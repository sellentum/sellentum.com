import "server-only";

import OpenAI from "openai";
import type { ConversationalMatch, Product } from "@/lib/types";

export type AdvisorHistoryItem = { role: "user" | "assistant"; content: string };
export type AdvisorResult = {
  assistantMessage: string;
  status: "clarifying" | "recommendations";
  source: "hybrid" | "pgvector" | "rules";
  intent: { maxBudget: number | null; terms: string[] };
  clarifyingOptions?: string[];
  matches: ConversationalMatch[];
};

const synonyms: Record<string, string[]> = {
  trail: ["outdoor", "hiking", "grip"],
  hiking: ["trail", "outdoor", "grip"],
  city: ["everyday", "travel", "commute"],
  comfortable: ["comfort", "cushion", "soft"],
  comfort: ["cushion", "soft", "stable"],
  light: ["lightweight", "nimble"],
  waterproof: ["water", "rain", "weather"],
  fast: ["speed", "race", "responsive"],
  running: ["runner", "road", "trail"],
  wet: ["water", "rain", "weather"],
};

const stopWords = new Set(["what", "which", "with", "that", "this", "have", "need", "want", "looking", "product", "something", "show", "find", "under", "than", "from", "about", "would", "could", "please", "some", "the", "and", "for", "are", "you", "your"]);
const vagueWords = new Set(["item", "thing", "stuff", "option", "product", "shoe", "pair", "one", "help", "choose", "recommend", "recommendation"]);

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildAdvisorIntentText(query: string, history: AdvisorHistoryItem[] = []) {
  const priorUserMessages = history.filter((item) => item.role === "user").slice(-2).map((item) => item.content);
  return [...priorUserMessages, query].join(". ");
}

export function extractAdvisorTokens(value: string) {
  const base = (value.toLowerCase().match(/[a-z][a-z-]{1,}/g) || [])
    .map((word) => word.endsWith("ies") && word.length > 4 ? `${word.slice(0, -3)}y` : word.endsWith("s") && !word.endsWith("ss") && word.length > 3 ? word.slice(0, -1) : word)
    .filter((word) => !stopWords.has(word));
  return [...new Set(base.flatMap((word) => [word, ...(synonyms[word] || [])]))];
}

export function extractBudget(query: string) {
  const match = query.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of)?)\s*[£$€]?\s*(\d+(?:\.\d+)?)/i) || query.match(/[£$€]\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function shouldClarify(query: string, tokens: string[], maxBudget: number | null, history: AdvisorHistoryItem[]) {
  const rawWordCount = (query.match(/[a-z0-9£$€]+/gi) || []).length;
  const meaningfulTokens = tokens.filter((term) => !vagueWords.has(term));
  const alreadyAsked = history.some((item) => item.role === "assistant" && item.content.toLowerCase().includes("to narrow"));
  if (alreadyAsked && meaningfulTokens.length > 0) return false;
  if (meaningfulTokens.length === 0) return true;
  return rawWordCount <= 2 && meaningfulTokens.length < 2 && maxBudget === null;
}

function clarifyingOptions(products: Product[]) {
  const active = products.filter((product) => product.active);
  const needs = unique(active.flatMap((product) => product.buyer_needs || product.tags)).slice(0, 4);
  const categories = unique(active.map((product) => product.category)).slice(0, 3);
  const features = unique(active.flatMap((product) => product.features)).slice(0, 4);
  return (needs.length ? needs : categories.length ? categories : features).slice(0, 4);
}

function cosine(a: number[], b: number[]) {
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    aa += a[index] ** 2;
    bb += b[index] ** 2;
  }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb) || 1);
}

function fallbackExplanation(product: Product, signals: string[]) {
  const reason = signals.slice(0, 2).join(" and ");
  return reason ? `${product.name} stands out because it matches your preference for ${reason.toLowerCase()}.` : `${product.name} is the closest overall match to what you described.`;
}

function productSearchText(product: Product) {
  return product.search_text || `${product.name}. ${product.category}. ${product.description}. ${product.features.join(", ")}. ${product.tags.join(", ")}. ${(product.buyer_needs || []).join(", ")}`;
}

export async function runAdvisorSearch({ query, products, history = [], semanticScoresByProductId, semanticSource }: { query: string; products: Product[]; history?: AdvisorHistoryItem[]; semanticScoresByProductId?: Record<string, number>; semanticSource?: "pgvector" }): Promise<AdvisorResult> {
  const intentText = buildAdvisorIntentText(query, history);
  const queryTokens = extractAdvisorTokens(intentText);
  const maxBudget = extractBudget(intentText);
  const eligible = products.filter((product) => product.active && (maxBudget === null || product.price <= maxBudget));

  if (!eligible.length) {
    return {
      assistantMessage: `I couldn’t find an active product inside${maxBudget ? ` your £${maxBudget} budget` : " those requirements"}. Try broadening one detail.`,
      status: "recommendations",
      source: "rules",
      intent: { maxBudget, terms: queryTokens },
      matches: [],
    };
  }

  if (shouldClarify(query, queryTokens, maxBudget, history)) {
    const options = clarifyingOptions(eligible);
    const optionCopy = options.length ? ` You can answer with one of these: ${options.slice(0, 3).join(", ")}.` : "";
    return {
      assistantMessage: `To narrow this down, what matters most: the use case, a must-have feature, or your comfortable budget?${optionCopy}`,
      status: "clarifying",
      source: "rules",
      intent: { maxBudget, terms: queryTokens },
      clarifyingOptions: options,
      matches: [],
    };
  }

  let semanticScores: number[] | null = semanticScoresByProductId ? eligible.map((product) => semanticScoresByProductId[product.id] || 0) : null;
  let source: "hybrid" | "pgvector" | "rules" = semanticScoresByProductId ? semanticSource || "hybrid" : "rules";
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  if (openai && !semanticScores) {
    const embedded = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: [intentText, ...eligible.map(productSearchText)],
      dimensions: 1536,
    });
    semanticScores = embedded.data.slice(1).map((item) => cosine(embedded.data[0].embedding, item.embedding));
    source = "hybrid";
  }

  const corpus = eligible.map((product) => `${product.name} ${product.category} ${product.description} ${product.features.join(" ")} ${product.tags.join(" ")} ${(product.buyer_needs || []).join(" ")}`.toLowerCase());
  const documentFrequency = Object.fromEntries(queryTokens.map((term) => [term, corpus.filter((text) => text.includes(term)).length]));
  const ranked = eligible.map((product, index) => {
    const text = corpus[index];
    const signalScores = queryTokens.filter((term) => text.includes(term)).map((term) => {
      const specificity = Math.log((eligible.length + 1) / ((documentFrequency[term] || 0) + 1)) + 0.5;
      const fieldWeight = product.tags.some((tag) => tag.toLowerCase().includes(term)) ? 3 : product.features.some((feature) => feature.toLowerCase().includes(term)) ? 2 : 1;
      return { term, contribution: specificity * fieldWeight };
    });
    const lexicalScore = signalScores.reduce((score, signal) => score + signal.contribution, 0);
    const matchedSignals = signalScores.sort((a, b) => b.contribution - a.contribution).slice(0, 6).map((signal) => signal.term);
    const semanticScore = semanticScores ? semanticScores[index] * 8 : 0;
    const budgetBonus = maxBudget ? Math.max(0, 1 - product.price / maxBudget) : 0;
    return { product, score: lexicalScore + semanticScore + budgetBonus, matchedSignals };
  }).sort((a, b) => b.score - a.score || a.product.price - b.product.price || a.product.name.localeCompare(b.product.name)).slice(0, 3);

  let explanations = ranked.map((match) => fallbackExplanation(match.product, match.matchedSignals));
  let assistantMessage = `I found ${ranked.length} strong match${ranked.length === 1 ? "" : "es"} based on ${ranked[0].matchedSignals.slice(0, 2).join(" and ") || "the needs you described"}.`;

  if (openai) {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 350,
      messages: [
        { role: "system", content: "You are a concise ecommerce product advisor. The products were selected deterministically. Return JSON only: {assistantMessage, explanations:[{id,text}]}. Use only supplied facts. Explain each match in one warm sentence. Do not invent specifications or say AI." },
        { role: "user", content: JSON.stringify({ query: intentText, latestMessage: query, history, matches: ranked.map(({ product, matchedSignals }) => ({ id: product.id, name: product.name, price: product.price, category: product.category, description: product.description, features: product.features, tags: product.tags, matchedSignals })) }) },
      ],
    });
    const generated = JSON.parse(completion.choices[0]?.message.content || "{}");
    if (typeof generated.assistantMessage === "string") assistantMessage = generated.assistantMessage.slice(0, 600);
    if (Array.isArray(generated.explanations)) explanations = ranked.map((match, index) => generated.explanations.find((item: { id?: string; text?: string }) => item.id === match.product.id)?.text || explanations[index]);
  }

  return {
    assistantMessage,
    status: "recommendations",
    source,
    intent: { maxBudget, terms: queryTokens },
    matches: ranked.map((match, index) => ({ product: match.product, score: Number(match.score.toFixed(4)), matchedSignals: match.matchedSignals, explanation: explanations[index] })),
  };
}
