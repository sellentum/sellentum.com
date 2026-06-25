import "server-only";

import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";

type MatchRow = { id: string; similarity: number };

export async function getSemanticProductCandidates({
  supabase,
  userId,
  query,
  maxBudget,
  limit = 30,
}: {
  supabase: SupabaseClient;
  userId: string;
  query: string;
  maxBudget: number | null;
  limit?: number;
}) {
  if (!process.env.OPENAI_API_KEY) return { products: [] as Product[], similarities: {} as Record<string, number>, source: "unavailable" as const };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
    dimensions: 1536,
  });

  const { data: matches, error } = await supabase.rpc("match_products", {
    query_embedding: embedding.data[0].embedding,
    workspace_user_id: userId,
    match_count: limit,
    max_price: maxBudget,
  });

  if (error || !matches?.length) return { products: [] as Product[], similarities: {} as Record<string, number>, source: "unavailable" as const };

  const rows = matches as MatchRow[];
  const ids = rows.map((row) => row.id);
  const similarities = Object.fromEntries(rows.map((row) => [row.id, row.similarity]));
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .in("id", ids);

  if (productsError || !products?.length) return { products: [] as Product[], similarities: {} as Record<string, number>, source: "unavailable" as const };

  const productById = new Map((products as Product[]).map((product) => [product.id, product]));
  return {
    products: ids.map((id) => productById.get(id)).filter((product): product is Product => Boolean(product)),
    similarities,
    source: "pgvector" as const,
  };
}
