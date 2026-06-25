import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const schema = z.object({
  product: z.object({ name: z.string().max(120), description: z.string().max(1000), category: z.string().max(120), features: z.array(z.string().max(100)).max(20), tags: z.array(z.string().max(100)).max(20) }),
  answers: z.array(z.object({ question: z.string().max(300), answer: z.string().max(300) })).min(1).max(20),
  matchedReasons: z.array(z.string().max(200)).max(20),
});

function fallback(product: z.infer<typeof schema>["product"], matchedReasons: string[]) {
  const reasons = matchedReasons.slice(0, 2).join(" and ").toLowerCase();
  const feature = product.features[0]?.toLowerCase();
  if (reasons && feature) return `A strong match for your preference for ${reasons}, with ${feature} to make it especially well suited.`;
  if (reasons) return `This fits what you told us about ${reasons}, while balancing the qualities you prioritised.`;
  return `${product.name} is a versatile match based on the needs and preferences you shared.`;
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid recommendation request." }, { status: 400 });
    const { product, answers, matchedReasons } = parsed.data;
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ explanation: fallback(product, matchedReasons), source: "fallback" });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 90,
      messages: [
        { role: "system", content: "You write concise ecommerce product-match explanations. Use only the supplied facts. Write one warm sentence, 18-32 words. Do not mention scores, rules, AI, or claim certainty." },
        { role: "user", content: JSON.stringify({ product, shopperAnswers: answers, matchedReasons }) },
      ],
    });
    return NextResponse.json({ explanation: completion.choices[0]?.message.content?.trim() || fallback(product, matchedReasons), source: "openai" });
  } catch (error) {
    console.error("Explanation generation failed", error);
    return NextResponse.json({ error: "Could not generate an explanation." }, { status: 500 });
  }
}
