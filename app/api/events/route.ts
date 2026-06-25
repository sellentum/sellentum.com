import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExperienceType } from "@/lib/types";

const eventSchema = z.object({
  quizId: z.string().min(1).max(100),
  productId: z.string().max(100).optional(),
  eventType: z.enum(["widget_view", "quiz_start", "quiz_complete", "product_recommended", "buy_click"]),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ accepted: true, persisted: false });
    const requestedType = parsed.data.metadata?.experience_type;
    const [{ data: quiz }, { data: configurator }] = await Promise.all([
      supabase.from("quizzes").select("id,user_id,published").eq("id", parsed.data.quizId).eq("published", true).maybeSingle(),
      supabase.from("configurators").select("id,user_id,published").eq("id", parsed.data.quizId).eq("published", true).maybeSingle(),
    ]);
    const useConfigurator = requestedType === "configurator" && Boolean(configurator);
    const experience = useConfigurator ? configurator : quiz || configurator;
    if (!experience) return NextResponse.json({ error: "Published experience not found." }, { status: 404 });
    const experienceType: ExperienceType = useConfigurator || (!quiz && configurator) ? "configurator" : requestedType === "assistant" ? "assistant" : "finder";
    if (parsed.data.productId) {
      const { data: product } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("user_id", experience.user_id).maybeSingle();
      if (!product) return NextResponse.json({ error: "Product does not belong to this experience." }, { status: 400 });
    }
    const { error } = await supabase.from("analytics_events").insert({
      user_id: experience.user_id,
      quiz_id: experience.id,
      product_id: parsed.data.productId || null,
      event_type: parsed.data.eventType,
      metadata: { ...(parsed.data.metadata || {}), experience_type: experienceType },
    });
    if (error) throw error;
    return NextResponse.json({ accepted: true, persisted: true });
  } catch (error) {
    console.error("Analytics event failed", error);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }
}
