import { NextResponse } from "next/server";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz, demoSettings } from "@/lib/demo-data";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

type CheckStatus = "pass" | "warn" | "fail";

type PreflightCheck = {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

type QuizRow = Omit<Quiz, "questions"> & {
  questions?: Array<Omit<Quiz["questions"][number], "options"> & {
    options?: Quiz["questions"][number]["options"];
    answer_options?: Quiz["questions"][number]["options"];
  }>;
};

function statusRank(status: CheckStatus) {
  return status === "fail" ? 2 : status === "warn" ? 1 : 0;
}

function worstStatus(checks: PreflightCheck[]): CheckStatus {
  return checks.reduce<CheckStatus>((worst, check) => statusRank(check.status) > statusRank(worst) ? check.status : worst, "pass");
}

function check(id: string, label: string, description: string, status: CheckStatus, detail: string, actionHref?: string, actionLabel?: string): PreflightCheck {
  return { id, label, description, status, detail, actionHref, actionLabel };
}

function percent(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function hasIntentMetadata(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return Array.isArray(metadata.answers) || typeof metadata.query === "string" || Array.isArray(metadata.selected_option_names);
}

function hasSessionMetadata(event: AnalyticsEvent) {
  return typeof event.metadata?.session_id === "string" && event.metadata.session_id.length > 0;
}

function publishedFinderReady(quiz: Quiz) {
  return quiz.published && quiz.questions.length > 0 && quiz.questions.every((question) => question.options.length >= 2);
}

function publishedConfiguratorReady(configurator: Configurator) {
  return configurator.published && configurator.steps.length > 0 && configurator.steps.every((step) => step.options.length > 0);
}

function buildPreflight({ products, quizzes, configurators, events, settings, mode, origin }: {
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  mode: "demo" | "supabase";
  origin: string;
}) {
  const activeProducts = products.filter((product) => product.active);
  const structuredProducts = activeProducts.filter((product) => product.category && product.description && (product.features.length || product.tags.length));
  const enrichedProducts = activeProducts.filter((product) => product.enrichment_status === "enriched" || product.search_text || product.buyer_needs?.length);
  const productsWithUrls = activeProducts.filter((product) => product.product_url);
  const productsWithImages = activeProducts.filter((product) => product.image_url);
  const readyFinders = quizzes.filter(publishedFinderReady);
  const readyConfigurators = configurators.filter(publishedConfiguratorReady);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const widgetViews = events.filter((event) => event.event_type === "widget_view").length;
  const completions = events.filter((event) => event.event_type === "quiz_complete").length;
  const recommendations = events.filter((event) => event.event_type === "product_recommended").length;
  const intentEvents = events.filter(hasIntentMetadata).length;
  const sessionEvents = events.filter(hasSessionMetadata).length;
  const sessions = new Set(events.filter(hasSessionMetadata).map((event) => event.metadata!.session_id as string)).size;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  const sections = [
    {
      id: "environment",
      label: "Environment",
      description: "Deployment keys and runtime services.",
      checks: [
        check("app-url", "App URL", "Used to generate embeddable snippets and public links.", appUrl.startsWith("http") ? "pass" : "fail", appUrl || "NEXT_PUBLIC_APP_URL is missing.", "/dashboard/settings", "Review embed"),
        check("supabase-client", "Supabase client keys", "Auth and workspace data need the public URL and anon key.", process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "pass" : mode === "demo" ? "warn" : "fail", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase browser client is configured." : "Running without Supabase keys; demo mode only.", undefined, undefined),
        check("supabase-service", "Service-role key", "Public finder/configurator reads and analytics validation use server-only service access.", process.env.SUPABASE_SERVICE_ROLE_KEY ? "pass" : mode === "demo" ? "warn" : "fail", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Server routes can validate published experiences." : "Missing SUPABASE_SERVICE_ROLE_KEY; public APIs will be demo/local only.", undefined, undefined),
        check("openai", "OpenAI key", "Enables richer catalog enrichment, quiz generation, semantic advisor search and match copy.", process.env.OPENAI_API_KEY ? "pass" : "warn", process.env.OPENAI_API_KEY ? `OpenAI enabled with ${process.env.OPENAI_MODEL || "gpt-4o-mini"}.` : "No OPENAI_API_KEY; deterministic fallbacks will run.", "/dashboard/products", "Enrich catalog"),
      ],
    },
    {
      id: "catalog",
      label: "Catalog intelligence",
      description: "Products must carry enough clean data to power reliable recommendations.",
      checks: [
        check("active-products", "Active products", "A finder needs at least two active products to make a meaningful recommendation.", activeProducts.length >= 2 ? "pass" : "fail", `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"} available.`, "/dashboard/products", "Add products"),
        check("structured-products", "Structured recommendation signals", "Products should have categories, descriptions, tags or features.", percent(structuredProducts.length, activeProducts.length) >= 80 ? "pass" : structuredProducts.length ? "warn" : "fail", `${percent(structuredProducts.length, activeProducts.length)}% of active products have useful matching fields.`, "/dashboard/products", "Review catalog"),
        check("enrichment", "AI/discovery enrichment", "Search text, buyer needs and normalized tags improve advisor quality.", enrichedProducts.length ? "pass" : "warn", enrichedProducts.length ? `${enrichedProducts.length} active product${enrichedProducts.length === 1 ? "" : "s"} enriched or discovery-ready.` : "No enriched products yet; deterministic matching still works.", "/dashboard/products", "Run AI enrich"),
        check("semantic-runtime", "Semantic candidate retrieval", "Published advisors can use enriched catalog text and stored embeddings to retrieve better candidates before deterministic ranking.", process.env.OPENAI_API_KEY && enrichedProducts.length ? "pass" : enrichedProducts.length ? "warn" : "warn", process.env.OPENAI_API_KEY && enrichedProducts.length ? "OpenAI and enriched products are available for pgvector-backed advisor retrieval." : enrichedProducts.length ? "Products are enriched, but OPENAI_API_KEY is missing so advisor retrieval uses rules/fallbacks." : "Run catalog enrichment with an OpenAI key to activate semantic candidate retrieval.", "/dashboard/products", "Prepare semantic catalog"),
        check("commerce-links", "Product links and images", "Recommendation cards should send shoppers to a product page with visual context.", percent(productsWithUrls.length, activeProducts.length) >= 80 && percent(productsWithImages.length, activeProducts.length) >= 80 ? "pass" : "warn", `${productsWithUrls.length}/${activeProducts.length} have URLs · ${productsWithImages.length}/${activeProducts.length} have images.`, "/dashboard/products", "Fill product media"),
      ],
    },
    {
      id: "experiences",
      label: "Product discovery experiences",
      description: "At least one published experience should be ready to embed.",
      checks: [
        check("published-finder", "Published finder", "Guided selling needs a published quiz with questions and answer rules.", readyFinders.length ? "pass" : publishedFinders.length ? "warn" : "fail", readyFinders.length ? `${readyFinders.length} finder${readyFinders.length === 1 ? "" : "s"} ready.` : `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"}, but structure needs review.`, "/dashboard/quizzes", "Open finder builder"),
        check("advisor", "Conversational advisor", "The advisor reuses a published finder and active catalog as its public entrypoint.", readyFinders.length && activeProducts.length >= 2 ? "pass" : "warn", readyFinders.length && activeProducts.length >= 2 ? "Advisor can run against the active catalog." : "Publish a finder and keep at least two active products for advisor mode.", "/dashboard/settings", "Copy advisor embed"),
        check("configurator", "Visual configurator", "Compatibility workflows need a published configurator with steps and options.", readyConfigurators.length ? "pass" : publishedConfigurators.length ? "warn" : "warn", readyConfigurators.length ? `${readyConfigurators.length} configurator${readyConfigurators.length === 1 ? "" : "s"} ready.` : "No ready configurator yet; optional for the MVP but useful for complex products.", "/dashboard/configurators", "Build configurator"),
      ],
    },
    {
      id: "embed-analytics",
      label: "Embed and measurement",
      description: "The installed widget should be brand-safe and measurable.",
      checks: [
        check("settings", "Brand settings", "Widget copy and colour should look intentional on a storefront.", settings.brand_name && settings.button_text && /^#[0-9a-f]{6}$/i.test(settings.primary_color) ? "pass" : "warn", `${settings.brand_name || "Unnamed brand"} · ${settings.button_text || "Missing button text"} · ${settings.primary_color}`, "/dashboard/settings", "Edit brand settings"),
        check("widget-script", "Widget script", "The copy-paste embed can launch finder, advisor, or configurator in an iframe modal.", readyFinders.length || readyConfigurators.length ? "pass" : "fail", readyFinders.length || readyConfigurators.length ? "At least one embeddable experience is available." : "Publish a finder or configurator before copying the script.", "/dashboard/settings", "Copy snippet"),
        check("event-volume", "Analytics events", "Views, starts, completions, recommendations and clicks prove the loop is measurable.", events.length ? "pass" : "warn", `${events.length} event${events.length === 1 ? "" : "s"} captured · ${widgetViews} views · ${completions} completions · ${recommendations} recommendations.`, "/dashboard/analytics", "Open analytics"),
        check("session-events", "Session tracking", "Anonymous session IDs let analytics group events into shopper journeys.", sessionEvents ? "pass" : "warn", sessionEvents ? `${sessionEvents} event${sessionEvents === 1 ? "" : "s"} grouped into ${sessions} session${sessions === 1 ? "" : "s"}.` : "No session metadata captured yet; run a fresh widget journey.", "/dashboard/analytics", "Review sessions"),
        check("intent-events", "Intent metadata", "Selected answers, advisor queries and configurator choices power zero-party insights.", intentEvents ? "pass" : "warn", intentEvents ? `${intentEvents} event${intentEvents === 1 ? "" : "s"} include shopper-intent metadata.` : "No answer/query/selection metadata captured yet.", "/dashboard/analytics", "Review intent"),
      ],
    },
  ].map((section) => ({ ...section, status: worstStatus(section.checks) }));

  const checks = sections.flatMap((section) => section.checks);
  const overall = worstStatus(checks);

  return {
    mode,
    generated_at: new Date().toISOString(),
    origin,
    app_url: appUrl,
    overall,
    summary: {
      products: products.length,
      active_products: activeProducts.length,
      published_finders: publishedFinders.length,
      ready_finders: readyFinders.length,
      published_configurators: publishedConfigurators.length,
      ready_configurators: readyConfigurators.length,
      analytics_events: events.length,
      sessions,
      session_events: sessionEvents,
      intent_events: intentEvents,
    },
    sections,
  };
}

export async function GET(request: Request) {
  const identity = await getWorkspaceIdentity();
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const origin = new URL(request.url).origin;

  if (identity.mode === "demo") {
    return NextResponse.json(buildPreflight({
      products: demoProducts,
      quizzes: [demoQuiz],
      configurators: [demoConfigurator],
      events: demoEvents,
      settings: demoSettings,
      mode: "demo",
      origin,
    }));
  }

  const [productsResult, quizzesResult, configuratorsResult, eventsResult, settingsResult] = await Promise.all([
    identity.supabase.from("products").select("*"),
    identity.supabase.from("quizzes").select("*, questions(*, answer_options(*))"),
    identity.supabase.from("configurators").select("*, steps:configurator_steps(*, options:configurator_options(*))"),
    identity.supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(2000),
    identity.supabase.from("widget_settings").select("*").maybeSingle(),
  ]);

  const error = productsResult.error || quizzesResult.error || configuratorsResult.error || eventsResult.error || settingsResult.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const quizzes = ((quizzesResult.data || []) as unknown as QuizRow[]).map((quiz) => ({
    ...quiz,
    recommendation_overrides: quiz.recommendation_overrides || [],
    questions: (quiz.questions || []).map((question) => ({ ...question, options: question.options || question.answer_options || [] })),
  }));
  const configurators = ((configuratorsResult.data || []) as unknown as Configurator[]).map((configurator) => ({
    ...configurator,
    steps: configurator.steps || [],
  }));

  return NextResponse.json(buildPreflight({
    products: (productsResult.data || []) as Product[],
    quizzes,
    configurators,
    events: (eventsResult.data || []) as AnalyticsEvent[],
    settings: (settingsResult.data as WidgetSettings | null) || demoSettings,
    mode: "supabase",
    origin,
  }));
}
