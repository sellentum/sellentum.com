import { NextResponse } from "next/server";
import { z } from "zod";
import { runAdvisorSearch } from "@/lib/assistant-engine";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import type { Product } from "@/lib/types";

const productSchema = z.object({
  id: z.string().min(1).max(120),
  user_id: z.string().default("public-runtime"),
  name: z.string().min(1).max(180),
  price: z.number().nonnegative(),
  image_url: z.string().max(2000),
  category: z.string().max(120),
  description: z.string().max(2000),
  features: z.array(z.string().max(120)).max(30),
  tags: z.array(z.string().max(120)).max(30),
  product_url: z.string().max(2000),
  active: z.boolean(),
  search_text: z.string().max(4000).optional(),
  buyer_needs: z.array(z.string().max(120)).max(20).optional(),
  enrichment_status: z.enum(["pending", "enriched", "failed"]).optional(),
  enriched_at: z.string().optional(),
  created_at: z.string().default(""),
  updated_at: z.string().default(""),
});

const requestSchema = z.object({
  query: z.string().min(2).max(500),
  products: z.array(productSchema).min(1).max(100),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(700) })).max(8).optional(),
});

export async function POST(request: Request) {
  try {
    const limited = await publicRateLimit(request, "assistant", "demo", 25);
    if (limited) return limited;
    const parsed = requestSchema.safeParse(await readBoundedJson(request, 80_000));
    if (!parsed.success) return NextResponse.json({ error: "Tell us what you need in a little more detail." }, { status: 400 });
    const result = await runAdvisorSearch({ query: parsed.data.query, products: parsed.data.products as Product[], history: parsed.data.history || [] });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Conversational discovery failed", error);
    return handlePublicError(error, "The product advisor could not complete that search.");
  }
}
