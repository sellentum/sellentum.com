import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { buildAiReadinessReport, type AiReadinessSourceAudit } from "@/lib/ai-readiness";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz } from "@/lib/demo-data";
import type { AnalyticsEvent, Configurator, Product, Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QuizRow = Omit<Quiz, "questions"> & {
  questions?: Array<Omit<Quiz["questions"][number], "options"> & {
    options?: Quiz["questions"][number]["options"];
    answer_options?: Quiz["questions"][number]["options"];
  }>;
};

type ConfiguratorRow = Omit<Configurator, "steps"> & {
  steps?: Array<Omit<Configurator["steps"][number], "options"> & {
    options?: Configurator["steps"][number]["options"];
  }>;
};

function readSource(pathname: string) {
  try {
    return readFileSync(join(process.cwd(), pathname), "utf8");
  } catch {
    return "";
  }
}

function buildSourceAudit(): AiReadinessSourceAudit {
  const catalogEnrich = readSource("app/api/catalog/enrich/route.ts");
  const quizGenerate = readSource("app/api/quizzes/generate/route.ts");
  const configuratorGenerate = readSource("app/api/configurators/generate/route.ts");
  const explainRoute = readSource("app/api/explain/route.ts");
  const recommendationExplanations = readSource("lib/recommendation-explanations.ts");
  const searchExplanations = readSource("lib/search-explanations.ts");
  const finderEngine = readSource("lib/finder-engine.ts");
  const semanticCandidates = readSource("lib/semantic-candidates.ts");
  const publicRuntimeGuard = readSource("lib/public-runtime-guard.ts");
  const schema = readSource("supabase/schema.sql");
  return {
    catalogRouteAuthenticated: catalogEnrich.includes("getWorkspaceIdentity"),
    catalogFallback: catalogEnrich.includes("fallbackEnrich"),
    catalogEmbeddings: catalogEnrich.includes("text-embedding-3-small") && catalogEnrich.includes("dimensions: 1536"),
    quizRouteAuthenticated: quizGenerate.includes("getWorkspaceIdentity"),
    quizFallback: quizGenerate.includes("buildOntologyQuizSuggestion"),
    configuratorRouteAuthenticated: configuratorGenerate.includes("getWorkspaceIdentity"),
    configuratorFallback: configuratorGenerate.includes("buildConfiguratorBlueprint"),
    recommendationFallback: recommendationExplanations.includes("fallbackRecommendationExplanation") && finderEngine.includes("fallbackRecommendationExplanation"),
    recommendationPromptGrounded: recommendationExplanations.includes("Use only the supplied facts"),
    searchFallback: searchExplanations.includes("fallbackExplanation") || searchExplanations.includes("withFallbacks"),
    searchPromptDeterministic: searchExplanations.includes("already selected deterministically"),
    finderSelectionDeterministic: finderEngine.includes("auditProductMatches") && finderEngine.indexOf("auditProductMatches") < finderEngine.indexOf("explainRecommendation"),
    semanticCandidates: semanticCandidates.includes("getSemanticProductCandidates") && semanticCandidates.includes("match_products"),
    pgvectorSchema: schema.includes("vector(1536)") && schema.includes("create or replace function public.match_products") && schema.includes("grant execute on function public.match_products"),
    explanationRateLimited: explainRoute.includes("publicRateLimit(request, \"explain\""),
    publicRuntimeGuardrails: publicRuntimeGuard.includes("readBoundedJson") && publicRuntimeGuard.includes("publicRateLimit") && publicRuntimeGuard.includes("handlePublicError"),
  };
}

function normalizeQuizzes(rows: QuizRow[]): Quiz[] {
  return rows.map((quiz) => ({
    ...quiz,
    recommendation_overrides: quiz.recommendation_overrides || [],
    questions: [...(quiz.questions || [])]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        ...question,
        options: [...(question.options || question.answer_options || [])]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({ ...option, next_question_id: option.next_question_id || null })),
      })),
  }));
}

function normalizeConfigurators(rows: ConfiguratorRow[]): Configurator[] {
  return rows.map((configurator) => ({
    ...configurator,
    steps: [...(configurator.steps || [])]
      .sort((a, b) => a.position - b.position)
      .map((step) => ({ ...step, options: [...(step.options || [])].sort((a, b) => a.position - b.position) })),
  }));
}

export async function GET() {
  const identity = await getWorkspaceIdentity();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const sourceAudit = buildSourceAudit();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (identity.mode === "demo") {
    return NextResponse.json(buildAiReadinessReport({
      mode: "demo",
      source: "server-api",
      openaiConfigured,
      openaiModel,
      products: demoProducts,
      quizzes: [demoQuiz],
      configurators: [demoConfigurator],
      events: demoEvents,
      sourceAudit,
    }));
  }

  const supabase = identity.supabase;
  const [productsResult, quizzesResult, configuratorsResult, eventsResult] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("quizzes").select("*, questions(*, answer_options(*))").order("created_at", { ascending: false }),
    supabase.from("configurators").select("*, steps:configurator_steps(*, options:configurator_options(*))").order("created_at", { ascending: false }),
    supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(3000),
  ]);
  const firstError = productsResult.error || quizzesResult.error || configuratorsResult.error || eventsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json(buildAiReadinessReport({
    mode: "supabase",
    source: "server-api",
    openaiConfigured,
    openaiModel,
    products: (productsResult.data || []) as Product[],
    quizzes: normalizeQuizzes((quizzesResult.data || []) as unknown as QuizRow[]),
    configurators: normalizeConfigurators((configuratorsResult.data || []) as unknown as ConfiguratorRow[]),
    events: (eventsResult.data || []) as AnalyticsEvent[],
    sourceAudit,
  }));
}
