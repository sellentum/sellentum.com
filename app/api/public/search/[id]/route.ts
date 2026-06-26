import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeWidgetSettings } from "@/lib/public-experience";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import { explainSearchReport } from "@/lib/search-explanations";
import { runSemanticProductSearch } from "@/lib/search-engine";
import { buildSearchRecoveryReport } from "@/lib/search-recovery";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product, Quiz } from "@/lib/types";

const searchSchema = z.object({
  query: z.string().min(1).max(300),
  limit: z.number().int().min(1).max(12).optional(),
});

async function loadPublishedSearchContext(id: string) {
  const supabase = createAdminClient();
  if (!supabase) return { supabase: null, quiz: null, error: "Search service is not configured." };

  const byId = await supabase.from("quizzes").select("id,user_id,name,slug,published").eq("id", id).eq("published", true).maybeSingle();
  if (byId.error) return { supabase, quiz: null, error: byId.error.message };
  if (byId.data) return { supabase, quiz: byId.data as Pick<Quiz, "id" | "user_id" | "name" | "slug" | "published">, error: null };

  const bySlug = await supabase.from("quizzes").select("id,user_id,name,slug,published").eq("slug", id).eq("published", true).maybeSingle();
  if (bySlug.error) return { supabase, quiz: null, error: bySlug.error.message };
  return { supabase, quiz: bySlug.data as Pick<Quiz, "id" | "user_id" | "name" | "slug" | "published"> | null, error: null };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const limited = publicRateLimit(request, "public-search-config", id, 120);
  if (limited) return limited;
  const { supabase, quiz, error } = await loadPublishedSearchContext(id);
  if (!supabase) return NextResponse.json({ error }, { status: 503 });
  if (error || !quiz) return NextResponse.json({ error: "Published search experience not found." }, { status: 404 });

  const [{ count }, { data: settings }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", quiz.user_id).eq("active", true),
    supabase.from("widget_settings").select("*").eq("user_id", quiz.user_id).maybeSingle(),
  ]);

  return NextResponse.json({
    experience: { id: quiz.id, name: quiz.name, slug: quiz.slug },
    catalog: { active_products: count || 0 },
    settings: normalizeWidgetSettings(settings),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const limited = publicRateLimit(request, "public-search", id, 40);
    if (limited) return limited;

    const parsed = searchSchema.safeParse(await readBoundedJson(request, 8_000));
    if (!parsed.success) return NextResponse.json({ error: "Enter a product search query." }, { status: 400 });

    const { supabase, quiz, error } = await loadPublishedSearchContext(id);
    if (!supabase) return NextResponse.json({ error }, { status: 503 });
    if (error) return NextResponse.json({ error: "Could not load search experience." }, { status: 500 });
    if (!quiz) return NextResponse.json({ error: "Published search experience not found." }, { status: 404 });

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", quiz.user_id)
      .eq("active", true)
      .limit(200);

    if (productsError) return NextResponse.json({ error: "Could not load search catalog." }, { status: 500 });

    const report = await explainSearchReport(runSemanticProductSearch({
      query: parsed.data.query,
      products: (products || []) as Product[],
      limit: parsed.data.limit || 6,
    }));

    return NextResponse.json({
      ...report,
      recovery: buildSearchRecoveryReport(report),
      experience: { id: quiz.id, name: quiz.name, slug: quiz.slug },
      retrieval: { source: "catalog_scan", candidate_count: products?.length || 0, explanation_source: report.explanationSource || "fallback" },
    });
  } catch (error) {
    console.error("Published semantic search failed", error);
    return handlePublicError(error, "The product search could not complete.");
  }
}
