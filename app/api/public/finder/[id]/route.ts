import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveFinderAnswerPath } from "@/lib/finder-flow";
import { runFinderRecommendations } from "@/lib/finder-engine";
import { normalizeWidgetSettings } from "@/lib/public-experience";
import { toPublicProduct } from "@/lib/public-payload";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import type { RecommendationRecovery } from "@/lib/recommendation-recovery";
import { getSemanticProductCandidates } from "@/lib/semantic-candidates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnswerOption, FinderAnswer, Product, Question, Quiz, Recommendation } from "@/lib/types";
import { buildFinderBuyerProfile, getSelectedBudgetCeiling } from "@/lib/utils";

type QuestionRow = Omit<Question, "options"> & { answer_options?: AnswerOption[]; options?: AnswerOption[] };
type QuizRow = Omit<Quiz, "questions"> & { questions?: QuestionRow[] };
type PublicAnswerOption = Pick<AnswerOption, "id" | "label" | "next_question_id" | "position">;
type PublicQuestion = Pick<Question, "id" | "title" | "helper_text" | "position"> & { options: PublicAnswerOption[] };
type PublicQuiz = Pick<Quiz, "id" | "name" | "slug" | "welcome_title" | "welcome_message"> & {
  recommendation_overrides: [];
  questions: PublicQuestion[];
};
type PublicFinderAnswer = Pick<FinderAnswer, "questionId" | "question" | "optionId" | "answer">;
type FinderLookup = {
  supabase: ReturnType<typeof createAdminClient>;
  quiz: Quiz | null;
  error: string | null;
  status?: number;
};

const recommendationSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1).max(120),
    optionId: z.string().min(1).max(120),
  })).min(1).max(30),
});

function normalizeQuiz(quiz: QuizRow): Quiz {
  return {
    ...quiz,
    recommendation_overrides: quiz.recommendation_overrides || [],
    questions: (quiz.questions || [])
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        ...question,
        options: (question.answer_options || question.options || []).sort((a, b) => a.position - b.position),
        answer_options: undefined,
      })),
  };
}

function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    id: quiz.id,
    name: quiz.name,
    slug: quiz.slug,
    welcome_title: quiz.welcome_title,
    welcome_message: quiz.welcome_message,
    recommendation_overrides: [],
    questions: quiz.questions.map((question) => ({
      id: question.id,
      title: question.title,
      helper_text: question.helper_text,
      position: question.position,
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        next_question_id: option.next_question_id || null,
        position: option.position,
      })),
    })),
  };
}

function toPublicFinderAnswer(answer: FinderAnswer): PublicFinderAnswer {
  return {
    questionId: answer.questionId,
    question: answer.question,
    optionId: answer.optionId,
    answer: answer.answer,
  };
}

function normalizePublicReason(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function toPublicMatchedReasons(matchedReasons: string[], answers: FinderAnswer[], withAnswerFallback = false) {
  const answerLabels = new Set(answers.map((answer) => normalizePublicReason(answer.answer)).filter(Boolean));
  const directReasons = matchedReasons
    .filter((reason) => answerLabels.has(normalizePublicReason(reason)))
    .slice(0, 4);
  if (directReasons.length || !withAnswerFallback) return directReasons;
  return answers.map((answer) => answer.answer).filter(Boolean).slice(0, 3);
}

function toPublicRecommendation(recommendation: Recommendation, answers: FinderAnswer[]): Recommendation {
  return {
    product: toPublicProduct(recommendation.product),
    score: 0,
    matchedReasons: toPublicMatchedReasons(recommendation.matchedReasons, answers),
    explanation: recommendation.explanation,
  };
}

function publicBlockerReason(reason: string) {
  if (reason === "Above selected budget" || reason.includes("Above the selected")) return "Above selected budget";
  return "Current answer path is too narrow";
}

function toPublicRecovery(recovery: RecommendationRecovery | null | undefined, answers: FinderAnswer[]): RecommendationRecovery | null {
  if (!recovery) return null;
  const answerLabels = new Set(answers.map((answer) => normalizePublicReason(answer.answer)).filter(Boolean));
  const blockerCounts = new Map<string, number>();
  for (const blocker of recovery.blockers) {
    const reason = publicBlockerReason(blocker.reason);
    blockerCounts.set(reason, (blockerCounts.get(reason) || 0) + blocker.count);
  }

  return {
    status: recovery.status,
    summary: recovery.status === "no-results"
      ? "No product passed this exact answer path. Try broadening one preference or widening the budget."
      : recovery.summary,
    primaryAction: recovery.primaryAction,
    suggestions: recovery.suggestions.slice(0, 3).map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      detail: suggestion.id.startsWith("unmatched-")
        ? "No active product currently matches that preference exactly. Try a broader answer."
        : suggestion.detail,
      answer: suggestion.answer,
    })),
    blockers: [...blockerCounts.entries()].map(([reason, count]) => ({ reason, count, productNames: [] })),
    closestProducts: recovery.closestProducts
      .filter((product) => !product.blockedReason || product.blockedReason.includes("Above the selected"))
      .slice(0, 3)
      .map((product) => ({
        productId: product.productId,
        name: product.name,
        category: product.category,
        price: product.price,
        score: 0,
        blockedReason: product.blockedReason ? "Above selected budget" : undefined,
        strongestSignals: product.strongestSignals.filter((signal) => answerLabels.has(normalizePublicReason(signal))).slice(0, 3),
      })),
  };
}

async function loadPublishedFinder(id: string): Promise<FinderLookup> {
  const supabase = createAdminClient();
  if (!supabase) return { supabase: null, quiz: null, error: "Finder service is not configured." };

  const byId = await supabase.from("quizzes").select("*, questions(*, answer_options(*))").eq("id", id).eq("published", true).maybeSingle();
  if (byId.error) return { supabase, quiz: null, error: byId.error.message };
  if (byId.data) return { supabase, quiz: normalizeQuiz(byId.data as unknown as QuizRow), error: null };

  const bySlug = await supabase.from("quizzes").select("*, questions(*, answer_options(*))").eq("slug", id).eq("published", true).limit(2);
  if (bySlug.error) return { supabase, quiz: null, error: bySlug.error.message };
  const slugMatches = (bySlug.data || []) as unknown as QuizRow[];
  if (slugMatches.length > 1) {
    return {
      supabase,
      quiz: null,
      error: "This finder slug is used by more than one workspace. Use the stable finder ID from the widget snippet.",
      status: 409,
    };
  }
  return { supabase, quiz: slugMatches[0] ? normalizeQuiz(slugMatches[0]) : null, error: null };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const limited = await publicRateLimit(request, "public-finder-config", id, 120);
  if (limited) return limited;
  const { supabase, quiz, error, status } = await loadPublishedFinder(id);
  if (!supabase) return NextResponse.json({ error }, { status: 503 });
  if (error) return NextResponse.json({ error }, { status: status || 500 });
  if (!quiz) return NextResponse.json({ error: "Published finder not found." }, { status: 404 });
  const publicQuiz = toPublicQuiz(quiz);

  const [{ count }, { data: settings }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", quiz.user_id).eq("active", true),
    supabase.from("widget_settings").select("*").eq("user_id", quiz.user_id).maybeSingle(),
  ]);

  return NextResponse.json({ quiz: publicQuiz, products: [], catalog: { active_products: count || 0 }, settings: normalizeWidgetSettings(settings) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const limited = await publicRateLimit(request, "public-finder", id, 40);
    if (limited) return limited;

    const parsed = recommendationSchema.safeParse(await readBoundedJson(request, 10_000));
    if (!parsed.success) return NextResponse.json({ error: "Invalid finder answers." }, { status: 400 });

    const { supabase, quiz, error, status } = await loadPublishedFinder(id);
    if (!supabase) return NextResponse.json({ error }, { status: 503 });
    if (error) return NextResponse.json({ error: status === 409 ? error : "Could not load finder." }, { status: status || 500 });
    if (!quiz) return NextResponse.json({ error: "Published finder not found." }, { status: 404 });

    const answerPath = resolveFinderAnswerPath(quiz, parsed.data.answers);
    if (!answerPath.valid) return NextResponse.json({ error: answerPath.error || "Selected answers do not belong to this finder." }, { status: 400 });
    if (!answerPath.completed) return NextResponse.json({ error: "The selected answer path is incomplete." }, { status: 400 });
    const answers = answerPath.answers;

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", quiz.user_id)
      .eq("active", true)
      .limit(200);

    if (productsError) return NextResponse.json({ error: "Could not load finder catalog." }, { status: 500 });

    let semanticScoresByProductId: Record<string, number> | undefined;
    let semanticSource: "pgvector" | undefined;
    const buyerProfile = buildFinderBuyerProfile(answers);
    if (buyerProfile) {
      try {
        const semanticCandidates = await getSemanticProductCandidates({
          supabase,
          userId: quiz.user_id,
          query: buyerProfile,
          maxBudget: getSelectedBudgetCeiling(answers),
          limit: 40,
        });
        if (semanticCandidates.source === "pgvector") {
          semanticScoresByProductId = semanticCandidates.similarities;
          semanticSource = "pgvector";
        }
      } catch (error) {
        console.warn("Published finder semantic matching unavailable", error);
      }
    }

    const result = await runFinderRecommendations({
      products: (products || []) as Product[],
      answers,
      limit: 3,
      overrides: quiz.recommendation_overrides || [],
      semanticScoresByProductId,
      semanticSource,
      getExplanationReasons: (recommendation) => toPublicMatchedReasons(recommendation.matchedReasons, answers, true),
      getExplanationProduct: (product) => ({
        name: product.name,
        description: product.description,
        category: product.category,
        features: product.features || [],
        tags: [],
      }),
    });

    return NextResponse.json({
      recommendations: result.recommendations.map((recommendation) => toPublicRecommendation(recommendation, answers)),
      recovery: toPublicRecovery(result.recovery, answers),
      answers: answers.map(toPublicFinderAnswer),
      experience: { id: quiz.id, name: quiz.name, slug: quiz.slug },
      retrieval: { source: semanticSource || "catalog_scan", question_path: answerPath.visitedQuestionIds },
    });
  } catch (error) {
    console.error("Published finder recommendation failed", error);
    return handlePublicError(error, "The finder could not generate recommendations.");
  }
}
