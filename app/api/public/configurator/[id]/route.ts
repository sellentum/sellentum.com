import { NextResponse } from "next/server";
import { z } from "zod";
import { validateConfiguratorSelection } from "@/lib/configurator-engine";
import { buildConfiguratorSelectionGuidance } from "@/lib/configurator-guidance";
import { normalizeWidgetSettings } from "@/lib/public-experience";
import { linkedPublicConfiguratorProducts, toPublicConfigurator, toPublicConfiguratorValidationResult } from "@/lib/public-payload";
import { handlePublicError, publicRateLimit, readBoundedJson } from "@/lib/public-runtime-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Configurator, ConfiguratorStep, Product } from "@/lib/types";

type ConfiguratorRow = Omit<Configurator, "steps"> & { steps?: ConfiguratorStep[] };
type ConfiguratorLookup = {
  supabase: ReturnType<typeof createAdminClient>;
  configurator: Configurator | null;
  error: string | null;
  status?: number;
};

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

async function loadPublishedConfigurator(id: string): Promise<ConfiguratorLookup> {
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
    .limit(2);
  if (bySlug.error) return { supabase, configurator: null, error: bySlug.error.message };
  const slugMatches = (bySlug.data || []) as unknown as ConfiguratorRow[];
  if (slugMatches.length > 1) {
    return {
      supabase,
      configurator: null,
      error: "This configurator slug is used by more than one workspace. Use the stable configurator ID from the widget snippet.",
      status: 409,
    };
  }
  return { supabase, configurator: slugMatches[0] ? normalizeConfigurator(slugMatches[0]) : null, error: null };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limited = await publicRateLimit(request, "public-configurator-config", id, 120);
  if (limited) return limited;
  const { supabase, configurator, error, status } = await loadPublishedConfigurator(id);
  if (!supabase) return NextResponse.json({ error }, { status: 404 });
  if (error) return NextResponse.json({ error }, { status: status || 500 });
  if (!configurator) return NextResponse.json({ error: "Published configurator not found." }, { status: 404 });

  const [productsResult, settingsResult] = await Promise.all([
    supabase.from("products").select("*").eq("user_id", configurator.user_id).eq("active", true),
    supabase.from("widget_settings").select("*").eq("user_id", configurator.user_id).maybeSingle(),
  ]);

  return NextResponse.json({
    configurator: toPublicConfigurator(configurator),
    products: linkedPublicConfiguratorProducts(configurator, (productsResult.data || []) as Product[]),
    settings: normalizeWidgetSettings(settingsResult.data),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const limited = await publicRateLimit(request, "public-configurator", id, 40);
    if (limited) return limited;

    const parsed = validationSchema.safeParse(await readBoundedJson(request, 10_000));
    if (!parsed.success) return NextResponse.json({ error: "Invalid configurator selection." }, { status: 400 });

    const { supabase, configurator, error, status } = await loadPublishedConfigurator(id);
    if (!supabase) return NextResponse.json({ error }, { status: 404 });
    if (error) return NextResponse.json({ error: status === 409 ? error : "Could not load configurator." }, { status: status || 500 });
    if (!configurator) return NextResponse.json({ error: "Published configurator not found." }, { status: 404 });

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", configurator.user_id)
      .eq("active", true)
      .limit(200);

    if (productsError) return NextResponse.json({ error: "Could not load configurator products." }, { status: 500 });

    const result = validateConfiguratorSelection(configurator, (products || []) as Product[], parsed.data.selectedIds);
    const publicResult = toPublicConfiguratorValidationResult(result);
    return NextResponse.json({
      ...publicResult,
      compatibility_guidance: buildConfiguratorSelectionGuidance(configurator, parsed.data.selectedIds),
      experience: { id: configurator.id, name: configurator.name, slug: configurator.slug },
    }, { status: result.valid ? 200 : 400 });
  } catch (error) {
    console.error("Published configurator validation failed", error);
    return handlePublicError(error, "The configurator could not validate that bundle.");
  }
}
