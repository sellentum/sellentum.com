import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdvisorIntentText, extractBudget, runAdvisorSearch } from "@/lib/assistant-engine";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import { getSemanticProductCandidates } from "@/lib/semantic-candidates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product, Quiz } from "@/lib/types";

const requestSchema = z.object({
  query: z.string().min(2).max(500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(8).optional(),
});

async function loadPublishedQuiz(id: string) {
  const supabase = createAdminClient();
  if (!supabase) return { supabase: null, quiz: null, error: "Advisor service is not configured." };

  const byId = await supabase.from("quizzes").select("id,user_id,name,slug,published").eq("id", id).eq("published", true).maybeSingle();
  if (byId.error) return { supabase, quiz: null, error: byId.error.message };
  if (byId.data) return { supabase, quiz: byId.data as Pick<Quiz, "id" | "user_id" | "name" | "slug" | "published">, error: null };

  const bySlug = await supabase.from("quizzes").select("id,user_id,name,slug,published").eq("slug", id).eq("published", true).maybeSingle();
  if (bySlug.error) return { supabase, quiz: null, error: bySlug.error.message };
  return { supabase, quiz: bySlug.data as Pick<Quiz, "id" | "user_id" | "name" | "slug" | "published"> | null, error: null };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const limited = publicRateLimit(request, "public-advisor", id, 25);
    if (limited) return limited;

    const parsed = requestSchema.safeParse(await readBoundedJson(request, 12_000));
    if (!parsed.success) return NextResponse.json({ error: "Tell us what you need in a little more detail." }, { status: 400 });

    const { supabase, quiz, error } = await loadPublishedQuiz(id);
    if (!supabase) return NextResponse.json({ error }, { status: 503 });
    if (error) return NextResponse.json({ error: "Could not load advisor." }, { status: 500 });
    if (!quiz) return NextResponse.json({ error: "Published advisor not found." }, { status: 404 });

    const intentText = buildAdvisorIntentText(parsed.data.query, parsed.data.history || []);
    const semanticCandidates = await getSemanticProductCandidates({
      supabase,
      userId: quiz.user_id,
      query: intentText,
      maxBudget: extractBudget(intentText),
      limit: 30,
    });

    let products = semanticCandidates.products;
    if (!products.length) {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", quiz.user_id)
        .eq("active", true)
        .limit(100);

      if (productsError) return NextResponse.json({ error: "Could not load advisor catalog." }, { status: 500 });
      products = (data || []) as Product[];
    }

    const result = await runAdvisorSearch({
      query: parsed.data.query,
      products,
      history: parsed.data.history || [],
      semanticScoresByProductId: semanticCandidates.source === "pgvector" ? semanticCandidates.similarities : undefined,
      semanticSource: semanticCandidates.source === "pgvector" ? "pgvector" : undefined,
    });

    return NextResponse.json({
      ...result,
      experience: { id: quiz.id, name: quiz.name, slug: quiz.slug },
      retrieval: { source: semanticCandidates.source === "pgvector" ? "pgvector" : "catalog_scan", candidate_count: products.length },
    });
  } catch (error) {
    console.error("Published advisor failed", error);
    return handlePublicError(error, "The product advisor could not complete that search.");
  }
}
