import "server-only";

import OpenAI from "openai";
import type { FinderAnswer, Product, Recommendation, RecommendationOverride } from "@/lib/types";
import { recommendProducts } from "@/lib/utils";

function fallbackExplanation(product: Product, matchedReasons: string[]) {
  const reasons = matchedReasons.slice(0, 2).join(" and ").toLowerCase();
  const feature = product.features[0]?.toLowerCase();
  if (reasons && feature) return `A strong match for your preference for ${reasons}, with ${feature} to make it especially well suited.`;
  if (reasons) return `This fits what you told us about ${reasons}, while balancing the qualities you prioritised.`;
  return `${product.name} is a versatile match based on the needs and preferences you shared.`;
}

async function explainRecommendation(product: Product, answers: FinderAnswer[], matchedReasons: string[]) {
  if (!process.env.OPENAI_API_KEY) return { explanation: fallbackExplanation(product, matchedReasons), source: "fallback" as const };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 90,
    messages: [
      { role: "system", content: "You write concise ecommerce product-match explanations. Use only the supplied facts. Write one warm sentence, 18-32 words. Do not mention scores, rules, AI, or claim certainty." },
      { role: "user", content: JSON.stringify({ product: { name: product.name, description: product.description, category: product.category, features: product.features, tags: product.tags }, shopperAnswers: answers.map(({ question, answer }) => ({ question, answer })), matchedReasons }) },
    ],
  });

  return { explanation: completion.choices[0]?.message.content?.trim() || fallbackExplanation(product, matchedReasons), source: "openai" as const };
}

export async function runFinderRecommendations({
  products,
  answers,
  limit = 3,
  overrides = [],
  semanticScoresByProductId,
  semanticSource,
}: {
  products: Product[];
  answers: FinderAnswer[];
  limit?: number;
  overrides?: RecommendationOverride[];
  semanticScoresByProductId?: Record<string, number>;
  semanticSource?: "pgvector";
}) {
  const recommendations = recommendProducts(products, answers, limit, { overrides, semanticScoresByProductId, semanticSource });
  const explained = await Promise.all(recommendations.map(async (match): Promise<Recommendation> => {
    try {
      const { explanation } = await explainRecommendation(match.product, answers, match.matchedReasons);
      return { ...match, explanation };
    } catch {
      return { ...match, explanation: fallbackExplanation(match.product, match.matchedReasons) };
    }
  }));

  return { recommendations: explained };
}
