import "server-only";

import { explainRecommendation, fallbackRecommendationExplanation } from "@/lib/recommendation-explanations";
import type { FinderAnswer, Product, Recommendation, RecommendationOverride } from "@/lib/types";
import { recommendProducts } from "@/lib/utils";

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
      const { explanation } = await explainRecommendation({
        product: match.product,
        answers,
        matchedReasons: match.matchedReasons,
      });
      return { ...match, explanation };
    } catch {
      return { ...match, explanation: fallbackRecommendationExplanation(match.product, match.matchedReasons) };
    }
  }));

  return { recommendations: explained };
}
