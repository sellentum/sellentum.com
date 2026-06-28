import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz, demoSettings } from "@/lib/demo-data";
import { buildWorkspaceHealthReport } from "@/lib/workspace-health";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

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

function schemaSql() {
  try {
    return readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");
  } catch {
    return "";
  }
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

  if (identity.mode === "demo") {
    return NextResponse.json(buildWorkspaceHealthReport({
      mode: "demo",
      source: "server-api",
      products: demoProducts,
      quizzes: [demoQuiz],
      configurators: [demoConfigurator],
      events: demoEvents,
      settings: demoSettings,
      schemaSql: schemaSql(),
    }));
  }

  const supabase = identity.supabase;
  const [productsResult, quizzesResult, configuratorsResult, eventsResult, settingsResult] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("quizzes").select("*, questions(*, answer_options(*))").order("created_at", { ascending: false }),
    supabase.from("configurators").select("*, steps:configurator_steps(*, options:configurator_options(*))").order("created_at", { ascending: false }),
    supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(3000),
    supabase.from("widget_settings").select("*").maybeSingle(),
  ]);
  const firstError = productsResult.error || quizzesResult.error || configuratorsResult.error || eventsResult.error || settingsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json(buildWorkspaceHealthReport({
    mode: "supabase",
    source: "server-api",
    products: (productsResult.data || []) as Product[],
    quizzes: normalizeQuizzes((quizzesResult.data || []) as unknown as QuizRow[]),
    configurators: normalizeConfigurators((configuratorsResult.data || []) as unknown as ConfiguratorRow[]),
    events: (eventsResult.data || []) as AnalyticsEvent[],
    settings: (settingsResult.data as WidgetSettings | null) || { ...demoSettings, user_id: identity.userId },
    schemaSql: schemaSql(),
  }));
}
