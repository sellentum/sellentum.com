import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { handlePublicError, publicRateLimit, readBoundedJson, sanitizeAnalyticsMetadata } from "@/lib/public-runtime-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsEvent, ExperienceType } from "@/lib/types";

const workspaceEventSchema = z.object({
  quizId: z.string().min(1).max(100),
  productId: z.string().min(1).max(100).optional(),
  eventType: z.enum(["widget_view", "quiz_start", "quiz_complete", "product_recommended", "buy_click", "recommendation_feedback"]),
  metadata: z.record(z.unknown()).optional(),
});

function requestedExperienceType(metadata?: Record<string, unknown>) {
  const value = metadata?.experience_type;
  return value === "assistant" || value === "configurator" || value === "search" || value === "finder" ? value : null;
}

export async function POST(request: Request) {
  try {
    const identity = await getWorkspaceIdentity();
    if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (identity.mode === "demo") return NextResponse.json({ accepted: true, persisted: false });

    const body = await readBoundedJson(request, 16_000);
    const parsed = workspaceEventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid workspace analytics event." }, { status: 400 });

    const limited = await publicRateLimit(request, "workspace-analytics-event", identity.userId, 300);
    if (limited) return limited;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "Workspace analytics service is not configured." }, { status: 503 });

    const requestedType = requestedExperienceType(parsed.data.metadata);
    const [{ data: quiz }, { data: configurator }] = await Promise.all([
      supabase.from("quizzes").select("id,user_id").eq("id", parsed.data.quizId).eq("user_id", identity.userId).maybeSingle(),
      supabase.from("configurators").select("id,user_id").eq("id", parsed.data.quizId).eq("user_id", identity.userId).maybeSingle(),
    ]);

    const useConfigurator = requestedType === "configurator" && Boolean(configurator);
    const experience = useConfigurator ? configurator : quiz || configurator;
    if (!experience) return NextResponse.json({ error: "Workspace experience not found." }, { status: 404 });

    const experienceType: ExperienceType = useConfigurator || (!quiz && configurator)
      ? "configurator"
      : requestedType === "assistant"
        ? "assistant"
        : requestedType === "search"
          ? "search"
          : "finder";

    if (parsed.data.productId) {
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("id", parsed.data.productId)
        .eq("user_id", identity.userId)
        .maybeSingle();
      if (!product) return NextResponse.json({ error: "Product does not belong to this workspace." }, { status: 400 });
    }

    const { data: event, error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: identity.userId,
        quiz_id: experience.id,
        product_id: parsed.data.productId || null,
        event_type: parsed.data.eventType,
        metadata: sanitizeAnalyticsMetadata({
          ...(parsed.data.metadata || {}),
          experience_id: experience.id,
          experience_type: experienceType,
          analytics_source: "authenticated_workspace",
        }),
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ accepted: true, persisted: true, event: event as AnalyticsEvent });
  } catch (error) {
    console.error("Workspace analytics event failed", error);
    return handlePublicError(error, "Could not record workspace analytics event.");
  }
}
