import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateStorefrontDomainAllowlist } from "@/lib/domain-allowlist";
import { handlePublicError, publicRateLimit, readBoundedJson, sanitizeAnalyticsMetadata } from "@/lib/public-runtime-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ExperienceType } from "@/lib/types";

const eventSchema = z.object({
  quizId: z.string().min(1).max(100),
  productId: z.string().max(100).optional(),
  eventType: z.enum(["widget_view", "quiz_start", "quiz_complete", "product_recommended", "buy_click", "recommendation_feedback"]),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 16_000);
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    const limited = publicRateLimit(request, "analytics-event", parsed.data.quizId, 120);
    if (limited) return limited;

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
    const experienceType: ExperienceType = useConfigurator || (!quiz && configurator) ? "configurator" : requestedType === "assistant" ? "assistant" : requestedType === "search" ? "search" : "finder";
    const { data: settings } = await supabase.from("widget_settings").select("*").eq("user_id", experience.user_id).maybeSingle();
    const originDecision = evaluateStorefrontDomainAllowlist({
      allowedDomains: (settings as { allowed_domains?: unknown } | null)?.allowed_domains,
      request,
      metadata: parsed.data.metadata,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
    if (!originDecision.allowed) {
      return NextResponse.json({
        error: "This storefront is not approved for this Sellentum workspace.",
        detail: originDecision.reason,
      }, { status: 403 });
    }
    if (parsed.data.productId) {
      const { data: product } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("user_id", experience.user_id).maybeSingle();
      if (!product) return NextResponse.json({ error: "Product does not belong to this experience." }, { status: 400 });
    }
    const { error } = await supabase.from("analytics_events").insert({
      user_id: experience.user_id,
      quiz_id: experience.id,
      product_id: parsed.data.productId || null,
      event_type: parsed.data.eventType,
      metadata: sanitizeAnalyticsMetadata({ ...(parsed.data.metadata || {}), experience_type: experienceType }),
    });
    if (error) throw error;
    return NextResponse.json({ accepted: true, persisted: true });
  } catch (error) {
    console.error("Analytics event failed", error);
    return handlePublicError(error, "Could not record event.");
  }
}
