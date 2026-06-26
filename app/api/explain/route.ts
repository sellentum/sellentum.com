import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { explainRecommendation, fallbackRecommendationExplanation } from "@/lib/recommendation-explanations";

const schema = z.object({
  product: z.object({ name: z.string().max(120), description: z.string().max(1000), category: z.string().max(120), features: z.array(z.string().max(100)).max(20), tags: z.array(z.string().max(100)).max(20) }),
  answers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(300) })).min(1).max(20),
  matchedReasons: z.array(z.string().max(200)).max(20),
});

export async function POST(request: Request) {
  let payload: z.infer<typeof schema> | null = null;
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`explain:${ip}`, 30).allowed) return NextResponse.json({ error: "Too many explanation requests. Please try again shortly." }, { status: 429 });

    const parsed = schema.safeParse(await request.json());
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
