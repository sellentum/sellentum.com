import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import type { GeneratedQuizSuggestion, MatchType } from "@/lib/types";

const productSchema = z.object({
  name: z.string().min(1).max(180), price: z.number().nonnegative(), category: z.string().max(120),
  description: z.string().max(1500), features: z.array(z.string().max(120)).max(30), tags: z.array(z.string().max(120)).max(30),
  buyer_needs: z.array(z.string().max(120)).max(20).optional(),
});
const requestSchema = z.object({ products: z.array(productSchema).min(2).max(100), goal: z.string().max(500).optional() });
const suggestionSchema = z.object({
  name: z.string().max(120), welcome_title: z.string().max(180), welcome_message: z.string().max(400),
  questions: z.array(z.object({
    title: z.string().max(180), helper_text: z.string().max(300),
    options: z.array(z.object({ label: z.string().max(120), match_type: z.enum(["tag", "category", "feature", "budget_max", "none"]), match_value: z.string().max(120), weight: z.number().int().min(1).max(5) })).min(2).max(6),
  })).min(2).max(5),
});

function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

function options(values: string[], type: MatchType, limit = 4) {
  return unique(values).slice(0, limit).map((value) => ({ label: value, match_type: type, match_value: value, weight: type === "category" ? 5 : 3 }));
}

function fallbackSuggestion(products: z.infer<typeof productSchema>[]): GeneratedQuizSuggestion {
  const categories = unique(products.map((product) => product.category));
  const needs = unique(products.flatMap((product) => product.buyer_needs || product.tags));
  const features = unique(products.flatMap((product) => product.features));
  const prices = products.map((product) => product.price).sort((a, b) => a - b);
  const middle = Math.ceil(prices[Math.floor(prices.length * 0.6)] / 10) * 10;
  const high = Math.ceil(prices[prices.length - 1] / 10) * 10;
  const questions: GeneratedQuizSuggestion["questions"] = [];
  if (categories.length > 1) questions.push({ title: "What kind of product are you looking for?", helper_text: "Choose the closest category and we’ll narrow the catalog.", options: options(categories, "category") });
  if (needs.length > 1) questions.push({ title: "What are you hoping this product will help you do?", helper_text: "Pick the outcome that matters most.", options: options(needs, "tag") });
  if (features.length > 1) questions.push({ title: "Which quality matters most to you?", helper_text: "We’ll prioritise this in your final matches.", options: options(features, "feature") });
  questions.push({ title: "What is your comfortable budget?", helper_text: "We’ll only recommend products inside your range.", options: [
    { label: `Up to £${middle}`, match_type: "budget_max", match_value: String(middle), weight: 5 },
    ...(high !== middle ? [{ label: `Up to £${high}`, match_type: "budget_max" as const, match_value: String(high), weight: 5 }] : []),
    { label: "Show me the best match", match_type: "none", match_value: "", weight: 1 },
  ] });
  return { name: "AI-generated product finder", welcome_title: "Let’s find the right product for you.", welcome_message: `${Math.min(4, questions.length)} quick questions, then a focused set of recommendations based on what matters to you.`, questions: questions.slice(0, 4) };
}

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "At least two valid products are required." }, { status: 400 });
    let suggestion = fallbackSuggestion(parsed.data.products);
    let source: "rules" | "openai" = "rules";
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.25, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Design a concise ecommerce guided-selling quiz using only the supplied catalog values. Return JSON only with name, welcome_title, welcome_message, and 3-4 questions. Each question has title, helper_text, and 2-5 options. Every option uses match_type tag, category, feature, budget_max, or none; match_value must exactly equal a supplied catalog value except numeric budgets. Use weights 1, 3, or 5. Ask in plain buyer language, not technical database language." },
          { role: "user", content: JSON.stringify(parsed.data) },
        ],
      });
      const aiSuggestion = suggestionSchema.safeParse(JSON.parse(completion.choices[0]?.message.content || "{}"));
      if (aiSuggestion.success) { suggestion = aiSuggestion.data; source = "openai"; }
    }
    return NextResponse.json({ suggestion, source });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return NextResponse.json({ error: "Could not generate a product finder." }, { status: 500 });
  }
}
