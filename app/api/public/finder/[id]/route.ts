import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveFinderAnswerPath } from "@/lib/finder-flow";
import { runFinderRecommendations } from "@/lib/finder-engine";
import { normalizeWidgetSettings } from "@/lib/public-experience";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import { getSemanticProductCandidates } from "@/lib/semantic-candidates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnswerOption, Product, Question, Quiz } from "@/lib/types";
import { buildFinderBuyerProfile, getSelectedBudgetCeiling } from "@/lib/utils";

type QuestionRow = Omit<Question, "options"> & { answer_options?: AnswerOption[]; options?: AnswerOption[] };
type QuizRow = Omit<Quiz, "questions"> & { questions?: QuestionRow[] };
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
  const publicQuiz = { ...quiz, recommendation_overrides: [] };

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
    });

    return NextResponse.json({
      recommendations: result.recommendations,
      recovery: result.recovery,
      answers,
      experience: { id: quiz.id, name: quiz.name, slug: quiz.slug },
      retrieval: { source: semanticSource || "catalog_scan", buyer_profile: buyerProfile, question_path: answerPath.visitedQuestionIds },
    });
  } catch (error) {
    console.error("Published finder recommendation failed", error);
    return handlePublicError(error, "The finder could not generate recommendations.");
  }
}
