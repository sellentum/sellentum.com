import { NextResponse } from "next/server";
import { z } from "zod";
import { publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import { explainRecommendation, fallbackRecommendationExplanation } from "@/lib/recommendation-explanations";

const schema = z.object({
  product: z.object({ name: z.string().max(120), description: z.string().max(1000), category: z.string().max(120), features: z.array(z.string().max(100)).max(20), tags: z.array(z.string().max(100)).max(20) }),
  answers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(300) })).min(1).max(20),
  matchedReasons: z.array(z.string().max(200)).max(20),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof schema> | null = null;
  try {
    const limited = await publicRateLimit(request, "explain", "recommendation", 30);
    if (limited) return limited;

    const parsed = schema.safeParse(await readBoundedJson(request, 24_000));
    if (!parsed.success) return NextResponse.json({ error: "Invalid recommendation request." }, { status: 400 });
    payload = parsed.data;
    const { product, answers, matchedReasons } = payload;
    return NextResponse.json(await explainRecommendation({ product, answers, matchedReasons }));
  } catch (error) {
    console.error("Explanation generation failed", error);
    if (payload) return NextResponse.json({ explanation: fallbackRecommendationExplanation(payload.product, payload.matchedReasons), source: "fallback" });
    return NextResponse.json({ error: "Could not generate an explanation." }, { status: 500 });
  }
}
