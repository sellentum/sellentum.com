import "server-only";

import { explainRecommendation, fallbackRecommendationExplanation } from "@/lib/recommendation-explanations";
import { buildRecommendationRecoveryReport } from "@/lib/recommendation-recovery";
import type { FinderAnswer, Product, Recommendation, RecommendationOverride } from "@/lib/types";
import { auditProductMatches } from "@/lib/utils";

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
  const audits = auditProductMatches(products, answers, { overrides, semanticScoresByProductId, semanticSource });
  const recommendations = audits
    .filter((match) => match.eligible)
    .slice(0, limit)
    .map(({ product, score, matchedReasons }) => ({ product, score, matchedReasons }));
  const recovery = buildRecommendationRecoveryReport({ products, answers, audits, recommendedCount: recommendations.length });
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

  return { recommendations: explained, recovery };
}
