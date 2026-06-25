import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { buildOntologyQuizSuggestion, buildQuizGenerationOntologySummary } from "@/lib/quiz-generation";

const productSchema = z.object({
  id: z.string().max(120).optional(), name: z.string().min(1).max(180), price: z.number().nonnegative(), category: z.string().max(120),
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

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "At least two valid products are required." }, { status: 400 });
    const ontology = buildQuizGenerationOntologySummary(parsed.data.products);
    let suggestion = buildOntologyQuizSuggestion(parsed.data.products, parsed.data.goal);
    let source: "ontology" | "openai" = "ontology";
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.25, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Design a concise ecommerce guided-selling quiz using the supplied catalog ontology and product facts. Return JSON only with name, welcome_title, welcome_message, and 3-4 questions. Each question has title, helper_text, and 2-5 options. Every option uses match_type tag, category, feature, budget_max, or none; match_value must exactly equal a supplied ontology/catalog value except numeric budgets. Prefer repeated buyer needs, category clusters and product features; avoid brittle one-off signals unless necessary. Use weights 1, 3, or 5. Ask in plain buyer language, not technical database language." },
          { role: "user", content: JSON.stringify({ ...parsed.data, ontology }) },
        ],
      });
      const aiSuggestion = suggestionSchema.safeParse(JSON.parse(completion.choices[0]?.message.content || "{}"));
      if (aiSuggestion.success) { suggestion = aiSuggestion.data; source = "openai"; }
    }
    return NextResponse.json({ suggestion, source, ontology });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return NextResponse.json({ error: "Could not generate a product finder." }, { status: 500 });
  }
}
