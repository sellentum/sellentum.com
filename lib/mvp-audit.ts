import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type MvpAuditStatus = "done" | "review" | "pending";
export type MvpAuditArea =
  | "marketing"
  | "auth"
  | "catalog"
  | "builder"
  | "recommendations"
  | "ai"
  | "runtime"
  | "analytics"
  | "deployment"
  | "design";

export type MvpAuditRequirement = {
  id: string;
  area: MvpAuditArea;
  label: string;
  status: MvpAuditStatus;
  detail: string;
  evidence: string;
  href: string;
  nextTask: string;
};

export type MvpAuditAction = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  label: string;
};

export type MvpAuditReport = {
  status: MvpAuditStatus;
  score: number;
  headline: string;
  summary: {
    requirements: number;
    done: number;
    review: number;
    pending: number;
    activeProducts: number;
    publishedFinders: number;
    publishedConfigurators: number;
    requiredAnalyticsEvents: number;
    coveredAnalyticsEvents: number;
  };
  requirements: MvpAuditRequirement[];
  doneTasks: MvpAuditRequirement[];
  pendingTasks: MvpAuditRequirement[];
  actions: MvpAuditAction[];
  packet: string;
};

const requiredAnalyticsEvents: AnalyticsEvent["event_type"][] = [
  "widget_view",
  "quiz_start",
  "quiz_complete",
  "product_recommended",
  "buy_click",
];

function statusScore(status: MvpAuditStatus) {
  if (status === "done") return 100;
  if (status === "review") return 62;
  return 0;
}

function eventCoverage(events: AnalyticsEvent[]) {
  return requiredAnalyticsEvents.filter((eventType) => events.some((event) => event.event_type === eventType)).length;
}

function requirement(
  id: string,
  area: MvpAuditArea,
  label: string,
  status: MvpAuditStatus,
  detail: string,
  evidence: string,
  href: string,
  nextTask: string,
): MvpAuditRequirement {
  return { id, area, label, status, detail, evidence, href, nextTask };
}

function overallStatus(requirements: MvpAuditRequirement[]): MvpAuditStatus {
  if (requirements.some((item) => item.status === "pending")) return "pending";
  if (requirements.some((item) => item.status === "review")) return "review";
  return "done";
}

function buildActions(requirements: MvpAuditRequirement[]): MvpAuditAction[] {
  const priorityByStatus: Record<MvpAuditStatus, MvpAuditAction["priority"]> = {
    pending: "critical",
    review: "high",
    done: "low",
  };
  const actions = requirements
    .filter((item) => item.status !== "done")
    .map((item) => ({
      id: `audit-${item.id}`,
      priority: priorityByStatus[item.status],
      title: item.status === "pending" ? `Finish ${item.label}` : `Verify ${item.label}`,
      detail: item.nextTask,
      href: item.href,
      label: item.status === "pending" ? "Finish task" : "Verify",
    }));

  if (!actions.length) {
    actions.push({
      id: "audit-production-signoff",
      priority: "low",
      title: "Run final production sign-off",
      detail: "All tracked MVP requirements are done. Run the production URL smoke test and export the verification packet before declaring the full build complete.",
      href: "/dashboard/production",
      label: "Open production",
    });
  }

  return actions.slice(0, 8);
}

function buildPacket(report: Omit<MvpAuditReport, "packet">) {
  return [
    "Findly MVP Completion Audit",
    "===========================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Done",
    ...report.doneTasks.map((item) => `- [DONE] ${item.label}: ${item.evidence}`),
    "",
    "Pending / needs verification",
    ...report.pendingTasks.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.nextTask}`),
    "",
    "Important completion boundary",
    "- The full Zoovu-like objective is not complete until the deployed production URL, Supabase tenant, OpenAI configuration, public runtimes, widget install and analytics telemetry have all been verified against real deployment evidence.",
    "- Demo-mode evidence can prove the MVP flow locally, but it cannot prove production launch completion.",
  ].join("\n");
}

export function buildMvpAuditReport({
  mode,
  products,
  quizzes,
  configurators,
  events,
  settings,
  origin = "http://localhost:3000",
  openaiConfigured = false,
}: {
  mode: "demo" | "supabase";
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  origin?: string;
  openaiConfigured?: boolean;
}): MvpAuditReport {
  const activeProducts = products.filter((product) => product.active);
  const enrichedProducts = products.filter((product) => product.enrichment_status === "enriched" || product.search_text || product.buyer_needs?.length);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const quizWithRules = quizzes.find((quiz) => quiz.questions.some((question) => question.options.some((option) => option.match_type !== "none" && option.match_value)));
  const quizWithBranching = quizzes.find((quiz) => quiz.questions.some((question) => question.options.some((option) => option.next_question_id)));
  const configuratorWithRules = configurators.find((configurator) => configurator.steps.some((step) => step.options.some((option) => option.product_id || option.incompatible_option_ids.length)));
  const coveredEvents = eventCoverage(events);
  const localOrigin = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(origin);

  const requirements: MvpAuditRequirement[] = [
    requirement(
      "marketing-site",
      "marketing",
      "Premium SaaS marketing coverage",
      "done",
      "Landing, platform, industries and resources pages explain the AI/ecommerce product discovery story.",
      "Routes: /, /platform, /platform/[slug], /industries and /resources.",
      "/platform",
      "Keep adding proof/content as new product capabilities are shipped.",
    ),
    requirement(
      "auth-dashboard",
      "auth",
      "Authentication and protected dashboard",
      mode === "supabase" ? "done" : "review",
      "Login, signup, logout and protected dashboard routes exist; local demo mode is active when Supabase credentials are absent.",
      mode === "supabase" ? "Current workspace is using Supabase mode." : "Demo mode proves flow locally; production still needs Supabase credentials.",
      "/login",
      "Verify Supabase email/password auth and RLS with a production tenant before final sign-off.",
    ),
    requirement(
      "catalog-management",
      "catalog",
      "Product catalog CRUD and CSV import",
      activeProducts.length ? "done" : "pending",
      "Merchants can add, edit, delete and CSV-import products with name, price, image URL, category, description, features, tags, buyer needs, search text and product URL.",
      `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"} currently available.`,
      "/dashboard/products",
      "Add or import a real merchant catalog with active products and Buy Now URLs.",
    ),
    requirement(
      "catalog-enrichment",
      "catalog",
      "AI-assisted catalog enrichment",
      enrichedProducts.length ? "done" : "review",
      "Catalog enrichment supports buyer needs, normalized attributes, semantic text and optional embeddings.",
      `${enrichedProducts.length}/${products.length} products have enrichment-style discovery fields.`,
      "/dashboard/catalog-pipeline",
      "Run enrichment on a real catalog and verify OpenAI/embedding configuration in Supabase mode.",
    ),
    requirement(
      "quiz-builder",
      "builder",
      "Guided-selling quiz builder",
      quizWithRules ? "done" : quizzes.length ? "review" : "pending",
      "Merchants can create questions, answer options, weighted rule mappings and optional branching.",
      quizWithRules ? `${quizWithRules.name} contains answer-level matching rules.` : `${quizzes.length} finder draft${quizzes.length === 1 ? "" : "s"} found.`,
      "/dashboard/quizzes",
      "Create or publish a finder with mapped tag/category/feature/budget answer rules.",
    ),
    requirement(
      "visual-flow",
      "builder",
      "Visual flow and branch governance",
      quizWithBranching ? "done" : "review",
      "Flow Studio audits question paths, answer routes, branch skips and deterministic route QA.",
      quizWithBranching ? `${quizWithBranching.name} includes answer-level branching.` : "Flow Studio exists; current finder can still add branch logic if needed.",
      "/dashboard/flow-studio",
      "Use Flow Studio to verify branch paths for a production finder.",
    ),
    requirement(
      "customer-finder",
      "runtime",
      "Customer-facing product finder",
      publishedFinders.length ? "done" : quizzes.length ? "review" : "pending",
      "Published finder runtime gives shoppers a guided journey, 1–3 recommendations, explanations and Buy Now CTAs.",
      `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"} available.`,
      "/finder/quiz_footwear",
      "Publish the merchant finder and run a full desktop shopper QA path.",
    ),
    requirement(
      "recommendation-engine",
      "recommendations",
      "Deterministic recommendation engine",
      activeProducts.length && quizWithRules ? "done" : "review",
      "Rules, budget constraints, buyer-profile signals, merchandising controls and stable tie-breakers select products before AI explains.",
      activeProducts.length && quizWithRules ? "Active products and mapped answer rules are present." : "Recommendation runtime exists; current workspace needs stronger catalog/rule evidence.",
      "/dashboard/lab",
      "Run scenario coverage and fix any no-result or thin-result paths.",
    ),
    requirement(
      "ai-explanations",
      "ai",
      "Grounded AI explanations",
      openaiConfigured ? "done" : "review",
      "OpenAI can generate enrichment, quiz drafts and product explanations; deterministic fallback copy works without a key.",
      openaiConfigured ? "OpenAI is configured for richer production explanations." : "Fallback explanations are available; production OpenAI key still needs verification.",
      "/dashboard/grounding",
      "Set OPENAI_API_KEY in production and rerun explanation grounding/preflight.",
    ),
    requirement(
      "semantic-advisor-search",
      "ai",
      "Semantic search and conversational advisor",
      "done",
      "Search and advisor runtimes parse natural language, apply budget/intent constraints and rank active catalog products.",
      "Routes: /dashboard/search, /dashboard/advisor, /search/[id], /assistant/[id].",
      "/dashboard/advisor",
      "QA real merchant prompts and missing shopper-language coverage.",
    ),
    requirement(
      "configurator-workflows",
      "builder",
      "Configurator workflows",
      configuratorWithRules ? "done" : configurators.length ? "review" : "pending",
      "Visual configurators support steps, options, product-linked pricing and compatibility rules.",
      configuratorWithRules ? "Configurator has product links or compatibility rules." : `${configurators.length} configurator draft${configurators.length === 1 ? "" : "s"} found.`,
      "/dashboard/configurators",
      "Publish and QA the configurator if bundles/compatibility are part of the launch.",
    ),
    requirement(
      "embeddable-widget",
      "runtime",
      "Embeddable widget",
      publishedFinders.length || publishedConfigurators.length ? "done" : "review",
      "Widget Studio generates modal and inline snippets for finder, advisor, search and configurator experiences.",
      `${settings.brand_name} settings are available; ${publishedFinders.length + publishedConfigurators.length} published experience${publishedFinders.length + publishedConfigurators.length === 1 ? "" : "s"} can be embedded.`,
      "/dashboard/widget-studio",
      "Copy the production snippet into a staging storefront and verify widget_view telemetry.",
    ),
    requirement(
      "analytics-events",
      "analytics",
      "Analytics event tracking",
      coveredEvents === requiredAnalyticsEvents.length ? "done" : coveredEvents >= 3 ? "review" : "pending",
      "Findly tracks widget views, starts, completions, recommended products, buy clicks and feedback.",
      `${coveredEvents}/${requiredAnalyticsEvents.length} required event types are present in this workspace.`,
      "/dashboard/analytics",
      "Generate a full QA session with every required event and source attribution.",
    ),
    requirement(
      "brand-settings",
      "design",
      "Brand and widget settings",
      settings.brand_name && settings.primary_color && settings.button_text ? "done" : "review",
      "Business owners can configure brand name, primary color, button text, widget title and welcome message.",
      `${settings.brand_name || "Brand"} settings are loaded.`,
      "/dashboard/settings",
      "Confirm production brand copy and colors before installing snippets.",
    ),
    requirement(
      "typography",
      "design",
      "Desktop typography guardrails",
      "done",
      "The app uses a simple Helvetica/Poppins/SF Pro stack, 16px base, readable line/word spacing and standard source text scales.",
      "Smoke coverage blocks tiny arbitrary app/component text classes.",
      "/",
      "Keep future UI on text-xs/text-sm/text-base scales unless a deliberate design exception is added.",
    ),
    requirement(
      "supabase-schema",
      "deployment",
      "Supabase/Postgres structure",
      mode === "supabase" ? "done" : "review",
      "Schema covers profiles, products, quizzes, questions, answer options, recommendation rules, analytics events, widget settings and configurators with RLS.",
      mode === "supabase" ? "Current workspace is connected to Supabase." : "Supabase schema exists; current local session is demo mode.",
      "/dashboard/production",
      "Run supabase/schema.sql in the production project and verify RLS-backed tenant data.",
    ),
    requirement(
      "production-verification",
      "deployment",
      "Production verification",
      !localOrigin && mode === "supabase" ? "review" : "pending",
      "Production Verification Center packages Vercel commands, route/API contracts, desktop QA scenarios and final smoke-test requirements.",
      localOrigin ? "Local origin detected; deployed Vercel URL is not proven in this workspace." : "Non-local origin detected; deployment still needs final smoke proof.",
      "/dashboard/production",
      "Deploy to Vercel, set production env vars, and run SMOKE_BASE_URL against the deployed URL.",
    ),
  ];

  const done = requirements.filter((item) => item.status === "done");
  const review = requirements.filter((item) => item.status === "review");
  const pending = requirements.filter((item) => item.status === "pending");
  const score = Math.round(requirements.reduce((sum, item) => sum + statusScore(item.status), 0) / Math.max(1, requirements.length));
  const status = overallStatus(requirements);
  const baseReport: Omit<MvpAuditReport, "packet"> = {
    status,
    score,
    headline: status === "done"
      ? "Every tracked MVP requirement has evidence; run production sign-off before declaring the full objective complete."
      : status === "review"
        ? "The MVP is broadly built, but a few launch requirements still need production evidence."
        : "Important MVP requirements still need completion or stronger production proof.",
    summary: {
      requirements: requirements.length,
      done: done.length,
      review: review.length,
      pending: pending.length,
      activeProducts: activeProducts.length,
      publishedFinders: publishedFinders.length,
      publishedConfigurators: publishedConfigurators.length,
      requiredAnalyticsEvents: requiredAnalyticsEvents.length,
      coveredAnalyticsEvents: coveredEvents,
    },
    requirements,
    doneTasks: done,
    pendingTasks: [...pending, ...review],
    actions: buildActions(requirements),
  };

  return { ...baseReport, packet: buildPacket(baseReport) };
}
