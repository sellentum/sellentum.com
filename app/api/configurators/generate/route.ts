import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { buildConfiguratorBlueprint } from "@/lib/configurator-blueprint";

const productSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  price: z.number().nonnegative(),
  image_url: z.string().max(1000).optional().default(""),
  category: z.string().max(120),
  description: z.string().max(1500),
  features: z.array(z.string().max(120)).max(30),
  tags: z.array(z.string().max(120)).max(30),
  buyer_needs: z.array(z.string().max(120)).max(20).optional().default([]),
  search_text: z.string().max(2000).optional().default(""),
  active: z.boolean().optional().default(true),
});

const optionSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  description: z.string().max(400),
  image_url: z.string().max(1000).optional().default(""),
  price_delta: z.number().nonnegative().max(100000).default(0),
  product_id: z.string().max(120).optional(),
  tags: z.array(z.string().max(80)).max(12).default([]),
  incompatible_option_keys: z.array(z.string().max(80)).max(40).default([]),
});

const suggestionSchema = z.object({
  name: z.string().min(1).max(120),
  title: z.string().min(1).max(180),
  subtitle: z.string().max(500),
  hero_image_url: z.string().max(1000).default(""),
  base_price: z.number().nonnegative().max(100000).default(0),
  steps: z.array(z.object({
    key: z.string().min(1).max(80),
    title: z.string().min(1).max(180),
    helper_text: z.string().max(300),
    selection_type: z.enum(["single", "multi"]),
    required: z.boolean(),
    options: z.array(optionSchema).min(1).max(8),
  })).min(1).max(5),
});

const requestSchema = z.object({
  products: z.array(productSchema).min(2).max(100),
  goal: z.string().max(500).optional().default(""),
});

function activeProducts(products: z.infer<typeof productSchema>[]) {
  return products.filter((product) => product.active);
}

function validGeneratedSuggestion(suggestion: z.infer<typeof suggestionSchema>, productIds: Set<string>) {
  const optionKeys = new Set<string>();
  let linkedProducts = 0;
  for (const step of suggestion.steps) {
    if (!step.options.length) return false;
    for (const option of step.options) {
      if (optionKeys.has(option.key)) return false;
      optionKeys.add(option.key);
      if (option.product_id && !productIds.has(option.product_id)) return false;
      if (option.product_id) linkedProducts += 1;
      if (option.incompatible_option_keys.includes(option.key)) return false;
    }
  }
  return linkedProducts > 0 && suggestion.steps.every((step) => step.options.every((option) => option.incompatible_option_keys.every((key) => optionKeys.has(key))));
}

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "At least two valid products are required." }, { status: 400 });

    const products = activeProducts(parsed.data.products);
    let blueprint = buildConfiguratorBlueprint(products, parsed.data.goal);
    let source: "catalog" | "openai" = "catalog";

    if (process.env.OPENAI_API_KEY && blueprint.canGenerate) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Design a concise ecommerce visual configurator from the supplied products and deterministic blueprint. Return JSON only with {name,title,subtitle,hero_image_url,base_price,steps}. Preserve factual truth. Do not invent product IDs. Every option needs a stable key, label, description, price_delta, tags, incompatible_option_keys, and optional product_id. Use product_id only for real purchasable anchor product options. Use incompatible_option_keys to block options that should not combine. Keep 2-4 steps and at least one product-linked step.",
          },
          {
            role: "user",
            content: JSON.stringify({
              goal: parsed.data.goal,
              products,
              deterministicBlueprint: blueprint.suggestion,
              guardrails: blueprint.risks,
            }),
          },
        ],
      });
      const generated = suggestionSchema.safeParse(JSON.parse(completion.choices[0]?.message.content || "{}"));
      const productIds = new Set(products.map((product) => product.id));
      if (generated.success && validGeneratedSuggestion(generated.data, productIds)) {
        source = "openai";
        blueprint = {
          ...buildConfiguratorBlueprint(products, parsed.data.goal, "openai"),
          source,
          suggestion: generated.data,
          linkedProducts: new Set(generated.data.steps.flatMap((step) => step.options.flatMap((option) => option.product_id ? [option.product_id] : []))).size,
          compatibilityRules: generated.data.steps.flatMap((step) => step.options).reduce((sum, option) => sum + option.incompatible_option_keys.length, 0),
          optionCount: generated.data.steps.reduce((sum, step) => sum + step.options.length, 0),
        };
      }
    }

    return NextResponse.json({ blueprint, suggestion: blueprint.suggestion, source });
  } catch (error) {
    console.error("Configurator generation failed", error);
    return NextResponse.json({ error: "Could not generate a configurator." }, { status: 500 });
  }
}
