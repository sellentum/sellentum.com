import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";

const productSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  price: z.number().nonnegative(),
  category: z.string().max(120),
  description: z.string().max(2000),
  features: z.array(z.string().max(120)).max(30),
  tags: z.array(z.string().max(120)).max(30),
});

const requestSchema = z.object({ products: z.array(productSchema).min(1).max(100) });
const enrichedSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    normalized_category: z.string().max(120),
    features: z.array(z.string().max(120)).max(12),
    tags: z.array(z.string().max(80)).max(12),
    buyer_needs: z.array(z.string().max(120)).max(12),
    search_text: z.string().max(3000),
  })),
});

const stopWords = new Set(["with", "from", "that", "this", "your", "into", "made", "built", "product", "and", "the", "for", "are", "you", "our", "its"]);

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fallbackEnrich(products: z.infer<typeof productSchema>[]) {
  return products.map((product) => {
    const source = `${product.description} ${product.features.join(" ")} ${product.tags.join(" ")}`.toLowerCase();
    const words = source.match(/[a-z][a-z-]{2,}/g) || [];
    const frequency = words.reduce<Record<string, number>>((map, word) => {
      if (!stopWords.has(word)) map[word] = (map[word] || 0) + 1;
      return map;
    }, {});
    const keywords = Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
    const buyerNeeds = [
      source.includes("trail") || source.includes("outdoor") ? "outdoor use" : null,
      source.includes("light") ? "lightweight comfort" : null,
      source.includes("water") ? "wet-weather protection" : null,
      source.includes("comfort") || source.includes("cushion") ? "all-day comfort" : null,
      source.includes("speed") || source.includes("race") ? "faster performance" : null,
    ].filter((value): value is string => Boolean(value));
    return {
      id: product.id,
      normalized_category: titleCase(product.category.trim() || "General"),
      features: [...new Set([...product.features, ...keywords.slice(0, 4).map(titleCase)])].slice(0, 10),
      tags: [...new Set([...product.tags.map((tag) => tag.toLowerCase()), ...keywords.slice(0, 6)])].slice(0, 10),
      buyer_needs: buyerNeeds.length ? buyerNeeds : keywords.slice(0, 3).map((word) => `${word} preference`),
      search_text: `${product.name}. ${product.category}. ${product.description}. Features: ${product.features.join(", ")}. Tags: ${product.tags.join(", ")}. Best for: ${buyerNeeds.join(", ")}.`,
    };
  });
}

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid catalog enrichment request." }, { status: 400 });

    let enriched = fallbackEnrich(parsed.data.products);
    let source: "rules" | "openai" = "rules";
    let embeddings: number[][] | null = null;

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a catalog enrichment engine. Normalize each product for guided selling. Return JSON only: {products:[{id,normalized_category,features,tags,buyer_needs,search_text}]}. Preserve factual truth, never invent specifications, use concise buyer-friendly phrases, and return every supplied product id exactly once." },
          { role: "user", content: JSON.stringify(parsed.data.products) },
        ],
      });
      const aiParsed = enrichedSchema.safeParse(JSON.parse(completion.choices[0]?.message.content || "{}"));
      if (aiParsed.success && aiParsed.data.products.length === parsed.data.products.length) {
        enriched = aiParsed.data.products;
        source = "openai";
      }
      const embeddingResult = await openai.embeddings.create({ model: "text-embedding-3-small", input: enriched.map((product) => product.search_text), dimensions: 1536 });
      embeddings = embeddingResult.data.map((item) => item.embedding);
    }

    const enrichedAt = new Date().toISOString();
    if (identity.mode === "supabase" && identity.supabase) {
      await Promise.all(enriched.map((product, index) => identity.supabase!.from("products").update({
        category: product.normalized_category,
        features: product.features,
        tags: product.tags,
        buyer_needs: product.buyer_needs,
        search_text: product.search_text,
        enrichment_status: "enriched",
        enriched_at: enrichedAt,
        ...(embeddings ? { embedding: embeddings[index] } : {}),
      }).eq("id", product.id).eq("user_id", identity.userId)));
    }

    return NextResponse.json({ products: enriched, source, enriched_at: enrichedAt });
  } catch (error) {
    console.error("Catalog enrichment failed", error);
    return NextResponse.json({ error: "Catalog enrichment failed. Please try again." }, { status: 500 });
  }
}
