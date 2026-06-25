import "server-only";

import OpenAI from "openai";
import type { ProductSearchReport, ProductSearchResult } from "@/lib/search-engine";

function fallbackExplanation(result: ProductSearchResult, query: string) {
  const product = result.product;
  const signals = result.matchedSignals
    .filter((signal) => signal.source !== "budget")
    .slice(0, 3)
    .map((signal) => signal.term);
  const budgetSignal = result.matchedSignals.find((signal) => signal.source === "budget");
  const signalCopy = signals.length ? signals.join(", ") : query || "your search";
  const budgetCopy = budgetSignal ? " and stays inside your budget" : "";
  return `${product.name} is a strong fit because its catalog data matches ${signalCopy}${budgetCopy}.`;
}

function withFallbacks(report: ProductSearchReport): ProductSearchReport {
  return {
    ...report,
    explanationSource: "fallback",
    results: report.results.map((result) => ({ ...result, explanation: fallbackExplanation(result, report.query) })),
  };
}

export async function explainSearchReport(report: ProductSearchReport): Promise<ProductSearchReport> {
  const fallbackReport = withFallbacks(report);
  if (!report.results.length || !process.env.OPENAI_API_KEY) return fallbackReport;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: "You write concise ecommerce search result explanations. The products were already selected deterministically. Return JSON only: {explanations:[{id,text}]}. Use only supplied product facts and matched signals. One warm sentence per product, 18-34 words. Do not mention AI, scores, algorithms, or unsupported claims.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query: report.query,
            intent: report.intent,
            results: report.results.slice(0, 6).map((result) => ({
              id: result.product.id,
              name: result.product.name,
              price: result.product.price,
              category: result.product.category,
              description: result.product.description,
              features: result.product.features,
              tags: result.product.tags,
              buyer_needs: result.product.buyer_needs || [],
              matchedSignals: result.matchedSignals.map((signal) => ({ term: signal.term, source: signal.source, detail: signal.detail })),
            })),
          }),
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message.content || "{}") as { explanations?: Array<{ id?: string; text?: string }> };
    const explanations = Array.isArray(parsed.explanations) ? parsed.explanations : [];

    return {
      ...fallbackReport,
      explanationSource: "openai",
      results: fallbackReport.results.map((result) => {
        const generated = explanations.find((item) => item.id === result.product.id)?.text?.trim();
        return { ...result, explanation: generated ? generated.slice(0, 320) : result.explanation };
      }),
    };
  } catch (error) {
    console.warn("Search explanation generation unavailable", error);
    return fallbackReport;
  }
}
