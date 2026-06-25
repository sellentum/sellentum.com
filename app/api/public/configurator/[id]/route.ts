import { NextResponse } from "next/server";
import { z } from "zod";
import { validateConfiguratorSelection } from "@/lib/configurator-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Configurator, ConfiguratorStep, Product } from "@/lib/types";

type ConfiguratorRow = Omit<Configurator, "steps"> & { steps?: ConfiguratorStep[] };

const validationSchema = z.object({
  selectedIds: z.array(z.string().min(1).max(120)).max(80),
});

function normalizeConfigurator(configurator: ConfiguratorRow): Configurator {
  return {
    ...configurator,
    steps: (configurator.steps || [])
      .sort((a, b) => a.position - b.position)
      .map((step) => ({ ...step, options: [...(step.options || [])].sort((a, b) => a.position - b.position) })),
  };
}

async function loadPublishedConfigurator(id: string) {
  const supabase = createAdminClient();
  if (!supabase) return { supabase: null, configurator: null, error: "Configurator API is not configured." };

  const byId = await supabase
    .from("configurators")
    .select("*, steps:configurator_steps(*, options:configurator_options(*))")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (byId.error) return { supabase, configurator: null, error: byId.error.message };
  if (byId.data) return { supabase, configurator: normalizeConfigurator(byId.data as unknown as ConfiguratorRow), error: null };

  const bySlug = await supabase
    .from("configurators")
    .select("*, steps:configurator_steps(*, options:configurator_options(*))")
    .eq("slug", id)
    .eq("published", true)
    .maybeSingle();
  if (bySlug.error) return { supabase, configurator: null, error: bySlug.error.message };
  return { supabase, configurator: bySlug.data ? normalizeConfigurator(bySlug.data as unknown as ConfiguratorRow) : null, error: null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, configurator, error } = await loadPublishedConfigurator(id);
  if (!supabase) return NextResponse.json({ error }, { status: 404 });
  if (error || !configurator) return NextResponse.json({ error: "Published configurator not found." }, { status: 404 });

  const [productsResult, settingsResult] = await Promise.all([
    supabase.from("products").select("*").eq("user_id", configurator.user_id).eq("active", true),
    supabase.from("widget_settings").select("*").eq("user_id", configurator.user_id).maybeSingle(),
  ]);

  return NextResponse.json({
    configurator,
    products: productsResult.data || [],
    settings: settingsResult.data,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!checkRateLimit(`public-configurator:${ip}:${id}`, 40).allowed) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

    const parsed = validationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid configurator selection." }, { status: 400 });

    const { supabase, configurator, error } = await loadPublishedConfigurator(id);
    if (!supabase) return NextResponse.json({ error }, { status: 404 });
    if (error) return NextResponse.json({ error: "Could not load configurator." }, { status: 500 });
    if (!configurator) return NextResponse.json({ error: "Published configurator not found." }, { status: 404 });

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", configurator.user_id)
      .eq("active", true)
      .limit(200);

    if (productsError) return NextResponse.json({ error: "Could not load configurator products." }, { status: 500 });

    const result = validateConfiguratorSelection(configurator, (products || []) as Product[], parsed.data.selectedIds);
    return NextResponse.json({
      ...result,
      experience: { id: configurator.id, name: configurator.name, slug: configurator.slug },
    }, { status: result.valid ? 200 : 400 });
  } catch (error) {
    console.error("Published configurator validation failed", error);
    return NextResponse.json({ error: "The configurator could not validate that bundle." }, { status: 500 });
  }
}
