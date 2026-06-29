import "server-only";

import { explainRecommendation, fallbackRecommendationExplanation, type ExplanationProduct } from "@/lib/recommendation-explanations";
import { buildRecommendationRecoveryReport } from "@/lib/recommendation-recovery";
import type { FinderAnswer, Product, Recommendation, RecommendationOverride } from "@/lib/types";
import { auditProductMatches } from "@/lib/utils";

type FinderRecommendationMatch = Pick<Recommendation, "product" | "score" | "matchedReasons">;

export async function runFinderRecommendations({
  products,
  answers,
  limit = 3,
  overrides = [],
  semanticScoresByProductId,
  semanticSource,
  getExplanationReasons,
  getExplanationProduct,
}: {
  products: Product[];
  answers: FinderAnswer[];
  limit?: number;
  overrides?: RecommendationOverride[];
  semanticScoresByProductId?: Record<string, number>;
  semanticSource?: "pgvector";
  getExplanationReasons?: (match: FinderRecommendationMatch) => string[];
  getExplanationProduct?: (product: Product) => ExplanationProduct;
}) {
  const audits = auditProductMatches(products, answers, { overrides, semanticScoresByProductId, semanticSource });
  const recommendations = audits
    .filter((match) => match.eligible)
    .slice(0, limit)
    .map(({ product, score, matchedReasons }) => ({ product, score, matchedReasons }));
  const recovery = buildRecommendationRecoveryReport({ products, answers, audits, recommendedCount: recommendations.length });
  const explained = await Promise.all(recommendations.map(async (match): Promise<Recommendation> => {
    const explanationReasons = getExplanationReasons ? getExplanationReasons(match) : match.matchedReasons;
    const explanationProduct = getExplanationProduct ? getExplanationProduct(match.product) : match.product;
    try {
      const { explanation } = await explainRecommendation({
        product: explanationProduct,
        answers,
        matchedReasons: explanationReasons,
      });
      return { ...match, explanation };
    } catch {
      return { ...match, explanation: fallbackRecommendationExplanation(explanationProduct, explanationReasons) };
    }
  }));

  return { recommendations: explained, recovery };
}
