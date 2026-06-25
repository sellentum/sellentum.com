import { NextResponse } from "next/server";
import { demoConfigurator, demoEvents, demoProducts, demoQuiz, demoSettings } from "@/lib/demo-data";
import { getWorkspaceIdentity } from "@/lib/api-auth";
import { analyzeCatalogIntelligence, type CatalogIntelligenceSeverity } from "@/lib/catalog-intelligence";
import { analyzeConfiguratorReadiness } from "@/lib/configurator-readiness";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
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

function catalogStatus(severity: CatalogIntelligenceSeverity): CheckStatus {
  return severity === "blocker" ? "fail" : severity === "warning" ? "warn" : "pass";
}

function catalogDescription(id: string) {
  if (id === "catalog-size") return "A meaningful discovery experience needs enough active products to compare.";
  if (id === "core-copy") return "Descriptions help AI explanations, semantic search and shopper confidence.";
  if (id === "matching-signals") return "Tags, features and buyer needs are the structured signals behind deterministic ranking.";
  if (id === "enrichment") return "Enriched buyer needs and search text improve semantic and conversational discovery.";
  if (id === "semantic-text") return "Searchable language lets shopper intent map back to product facts.";
  if (id === "commerce-assets") return "Result cards need product images and links for conversion.";
  if (id === "taxonomy") return "Clear categories help comparison, filtering and generated questions.";
  return "Catalog intelligence diagnostic.";
}

function catalogActionLabel(id: string) {
  if (id === "enrichment" || id === "semantic-text") return "Run AI enrich";
  if (id === "commerce-assets") return "Fill product media";
  return "Review catalog";
}

function hasIntentMetadata(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return Array.isArray(metadata.answers) || typeof metadata.query === "string" || Array.isArray(metadata.selected_option_names);
}

function hasSessionMetadata(event: AnalyticsEvent) {
  return typeof event.metadata?.session_id === "string" && event.metadata.session_id.length > 0;
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
  const catalogIntelligence = analyzeCatalogIntelligence(products);
  const finderReadiness = quizzes.map((quiz) => ({ quiz, report: analyzeQuizReadiness(quiz, products) }));
  const configuratorReadiness = configurators.map((configurator) => ({ configurator, report: analyzeConfiguratorReadiness(configurator, products) }));
  const readyFinders = finderReadiness.filter(({ quiz, report }) => quiz.published && report.canPublish);
  const readyConfigurators = configuratorReadiness.filter(({ configurator, report }) => configurator.published && report.canPublish);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const blockedPublishedFinders = finderReadiness.filter(({ quiz, report }) => quiz.published && !report.canPublish);
  const blockedPublishedConfigurators = configuratorReadiness.filter(({ configurator, report }) => configurator.published && !report.canPublish);
  const finderWarnings = finderReadiness.filter(({ quiz, report }) => quiz.published && report.warnings.length);
  const configuratorWarnings = configuratorReadiness.filter(({ configurator, report }) => configurator.published && report.warnings.length);
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
        ...catalogIntelligence.checks.map((item) => check(`catalog-${item.id}`, item.label, catalogDescription(item.id), catalogStatus(item.severity), item.detail, "/dashboard/products", catalogActionLabel(item.id))),
        check("semantic-runtime", "Semantic candidate retrieval", "Published advisors can use enriched catalog text and stored embeddings to retrieve better candidates before deterministic ranking.", process.env.OPENAI_API_KEY && catalogIntelligence.enrichedProducts ? "pass" : catalogIntelligence.enrichedProducts ? "warn" : "warn", process.env.OPENAI_API_KEY && catalogIntelligence.enrichedProducts ? "OpenAI and enriched products are available for pgvector-backed advisor retrieval." : catalogIntelligence.enrichedProducts ? "Products are enriched, but OPENAI_API_KEY is missing so advisor retrieval uses rules/fallbacks." : "Run catalog enrichment with an OpenAI key to activate semantic candidate retrieval.", "/dashboard/products", "Prepare semantic catalog"),
      ],
    },
    {
      id: "experiences",
      label: "Product discovery experiences",
      description: "At least one published experience should be ready to embed.",
      checks: [
        check("published-finder", "Published finder", "Guided selling needs a published quiz with questions and answer rules.", readyFinders.length ? "pass" : publishedFinders.length ? "warn" : "fail", readyFinders.length ? `${readyFinders.length} finder${readyFinders.length === 1 ? "" : "s"} ready.` : `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"}, but structure needs review.`, "/dashboard/quizzes", "Open finder builder"),
        check("finder-readiness", "Finder readiness diagnostics", "Published finders should pass the same launch checks shown in the builder.", blockedPublishedFinders.length ? "fail" : finderWarnings.length ? "warn" : readyFinders.length ? "pass" : "fail", blockedPublishedFinders.length ? `${blockedPublishedFinders.length} published finder${blockedPublishedFinders.length === 1 ? "" : "s"} have blockers.` : finderWarnings.length ? `${finderWarnings.length} published finder${finderWarnings.length === 1 ? "" : "s"} have warnings.` : readyFinders.length ? "Published finder checks pass." : "No launch-ready finder is published.", "/dashboard/quizzes", "Review readiness"),
        check("advisor", "Conversational advisor", "The advisor reuses a launch-ready published finder and active catalog as its public entrypoint.", readyFinders.length && activeProducts.length >= 2 ? "pass" : "warn", readyFinders.length && activeProducts.length >= 2 ? "Advisor can run against the active catalog." : "Publish a readiness-checked finder and keep at least two active products for advisor mode.", "/dashboard/settings", "Copy advisor embed"),
        check("configurator", "Visual configurator", "Compatibility workflows need a published configurator with steps and options.", readyConfigurators.length ? "pass" : publishedConfigurators.length ? "warn" : "warn", readyConfigurators.length ? `${readyConfigurators.length} configurator${readyConfigurators.length === 1 ? "" : "s"} ready.` : "No ready configurator yet; optional for the MVP but useful for complex products.", "/dashboard/configurators", "Build configurator"),
        check("configurator-readiness", "Configurator readiness diagnostics", "Published configurators should pass linked-product, pricing and compatibility checks.", blockedPublishedConfigurators.length ? "fail" : configuratorWarnings.length ? "warn" : readyConfigurators.length ? "pass" : "warn", blockedPublishedConfigurators.length ? `${blockedPublishedConfigurators.length} published configurator${blockedPublishedConfigurators.length === 1 ? "" : "s"} have blockers.` : configuratorWarnings.length ? `${configuratorWarnings.length} published configurator${configuratorWarnings.length === 1 ? "" : "s"} have warnings.` : readyConfigurators.length ? "Published configurator checks pass." : "No launch-ready configurator is published yet.", "/dashboard/configurators", "Review readiness"),
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
      catalog_intelligence_score: catalogIntelligence.score,
      catalog_intelligence_blockers: catalogIntelligence.blockers.length,
      catalog_intelligence_warnings: catalogIntelligence.warnings.length,
      published_finders: publishedFinders.length,
      ready_finders: readyFinders.length,
      published_configurators: publishedConfigurators.length,
      ready_configurators: readyConfigurators.length,
      finder_readiness_blockers: blockedPublishedFinders.length,
      finder_readiness_warnings: finderWarnings.length,
      configurator_readiness_blockers: blockedPublishedConfigurators.length,
      configurator_readiness_warnings: configuratorWarnings.length,
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
