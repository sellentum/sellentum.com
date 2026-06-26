import "server-only";

import OpenAI from "openai";
import type { FinderAnswer, Product } from "@/lib/types";

export type ExplanationProduct = Pick<Product, "name" | "description" | "category" | "features" | "tags">;

export function fallbackRecommendationExplanation(product: ExplanationProduct, matchedReasons: string[]) {
  const reasons = matchedReasons.slice(0, 2).join(" and ").toLowerCase();
  const feature = product.features[0]?.toLowerCase();
  if (reasons && feature) return `A strong match for your preference for ${reasons}, with ${feature} to make it especially well suited.`;
  if (reasons) return `This fits what you told us about ${reasons}, while balancing the qualities you prioritised.`;
  return `${product.name} is a versatile match based on the needs and preferences you shared.`;
}

export async function explainRecommendation({
  product,
  answers,
  matchedReasons,
}: {
  product: ExplanationProduct;
  answers: Array<Pick<FinderAnswer, "question" | "answer">>;
  matchedReasons: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { explanation: fallbackRecommendationExplanation(product, matchedReasons), source: "fallback" as const };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.35,
    max_tokens: 90,
    messages: [
      { role: "system", content: "You write concise ecommerce product-match explanations. Use only the supplied facts. Write one warm sentence, 18-32 words. Do not mention scores, rules, AI, or claim certainty." },
      { role: "user", content: JSON.stringify({ product, shopperAnswers: answers.map(({ question, answer }) => ({ question, answer })), matchedReasons }) },
    ],
  });

  return {
    explanation: completion.choices[0]?.message.content?.trim() || fallbackRecommendationExplanation(product, matchedReasons),
    source: "openai" as const,
  };
}
