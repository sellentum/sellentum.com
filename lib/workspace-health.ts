import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type WorkspaceHealthStatus = "ready" | "review" | "blocked";
export type WorkspaceHealthCheckStatus = "pass" | "warn" | "fail";
export type WorkspaceHealthArea = "persistence" | "schema" | "catalog" | "experiences" | "analytics" | "runtime" | "settings";

export type WorkspaceHealthCheck = {
  id: string;
  area: WorkspaceHealthArea;
  label: string;
  status: WorkspaceHealthCheckStatus;
  detail: string;
  evidence: string;
  href: string;
};

export type WorkspaceHealthAction = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
};

export type WorkspaceSchemaContract = {
  table: string;
  purpose: string;
  requiredColumns: string[];
  status: WorkspaceHealthCheckStatus;
  missingColumns: string[];
};

export type WorkspaceHealthReport = {
  status: WorkspaceHealthStatus;
  score: number;
  headline: string;
  generatedAt: string;
  source: "client-store" | "server-api";
  mode: "demo" | "supabase";
  summary: {
    products: number;
    activeProducts: number;
    finders: number;
    publishedFinders: number;
    configurators: number;
    publishedConfigurators: number;
    events: number;
    schemaTables: number;
    passingChecks: number;
    warningChecks: number;
    failingChecks: number;
  };
  checks: WorkspaceHealthCheck[];
  schemaContracts: WorkspaceSchemaContract[];
  actions: WorkspaceHealthAction[];
  packet: string;
};

export const expectedWorkspaceSchema: Array<Omit<WorkspaceSchemaContract, "status" | "missingColumns">> = [
  { table: "profiles", purpose: "Workspace owner profile and company metadata.", requiredColumns: ["id", "full_name", "company_name", "created_at", "updated_at"] },
  { table: "products", purpose: "Product truth layer for finder, advisor, search and configurator matching.", requiredColumns: ["id", "user_id", "name", "price", "image_url", "category", "description", "features", "tags", "product_url", "active", "buyer_needs", "search_text", "enrichment_status", "embedding"] },
  { table: "quizzes", purpose: "Guided product-finder experiences and merchandising overrides.", requiredColumns: ["id", "user_id", "name", "slug", "welcome_title", "welcome_message", "published", "recommendation_overrides"] },
  { table: "questions", purpose: "Ordered guided-selling questions.", requiredColumns: ["id", "quiz_id", "user_id", "title", "helper_text", "position"] },
  { table: "answer_options", purpose: "Answer-level deterministic recommendation signals and branch routes.", requiredColumns: ["id", "question_id", "user_id", "label", "match_type", "match_value", "weight", "next_question_id", "position"] },
  { table: "recommendation_rules", purpose: "Future-safe compound rule storage for deterministic matching.", requiredColumns: ["id", "user_id", "quiz_id", "answer_option_id", "rule_type", "operator", "value", "weight"] },
  { table: "configurators", purpose: "Visual bundle/configurator roots.", requiredColumns: ["id", "user_id", "name", "slug", "title", "subtitle", "base_price", "published"] },
  { table: "configurator_steps", purpose: "Ordered configurator questions and selection rules.", requiredColumns: ["id", "configurator_id", "user_id", "title", "selection_type", "required", "position"] },
  { table: "configurator_options", purpose: "Product-linked configurator choices, price deltas and incompatibilities.", requiredColumns: ["id", "step_id", "user_id", "label", "price_delta", "product_id", "tags", "incompatible_option_ids", "position"] },
  { table: "analytics_events", purpose: "Widget, journey, recommendation, feedback and buy-click telemetry.", requiredColumns: ["id", "user_id", "quiz_id", "product_id", "event_type", "metadata", "created_at"] },
  { table: "widget_settings", purpose: "Brand, colour, CTA and widget copy shared by public runtimes.", requiredColumns: ["user_id", "brand_name", "primary_color", "button_text", "widget_title", "welcome_message", "launcher_position"] },
];

const expectedWorkspaceFunctions = [
  { name: "save_quiz_with_children", purpose: "Atomic product-finder saves with questions and answer options." },
  { name: "save_configurator_with_children", purpose: "Atomic configurator saves with steps and options." },
];

function check(id: string, area: WorkspaceHealthArea, label: string, status: WorkspaceHealthCheckStatus, detail: string, evidence: string, href: string): WorkspaceHealthCheck {
  return { id, area, label, status, detail, evidence, href };
}

function scoreFor(status: WorkspaceHealthCheckStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 58;
  return 0;
}

function priorityFor(status: WorkspaceHealthCheckStatus, index: number): WorkspaceHealthAction["priority"] {
  if (status === "fail") return index < 2 ? "critical" : "high";
  if (status === "warn") return "medium";
  return "low";
}

function hasValue(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function eventHasSession(event: AnalyticsEvent) {
  return typeof event.metadata?.session_id === "string" && event.metadata.session_id.length > 0;
}

function eventHasExperience(event: AnalyticsEvent) {
  return hasValue(event.metadata?.experience_id) || hasValue(event.metadata?.experience_type) || hasValue(event.quiz_id);
}

function eventHasAttribution(event: AnalyticsEvent) {
  const metadata = event.metadata || {};
  return hasValue(metadata.sellentum_source) || hasValue(metadata.sellentum_campaign) || hasValue(metadata.sellentum_placement) || hasValue(metadata.sellentum_page_url) || hasValue(metadata.utm_source);
}

function normalizeSchemaSql(schemaSql = "") {
  return schemaSql.toLowerCase().replace(/\s+/g, " ");
}

export function auditWorkspaceSchema(schemaSql?: string): WorkspaceSchemaContract[] {
  const normalized = normalizeSchemaSql(schemaSql);
  return expectedWorkspaceSchema.map((contract) => {
    if (!normalized) return { ...contract, status: "warn" as const, missingColumns: [] };
    const tablePattern = new RegExp(`create table if not exists public\\.${contract.table}\\s*\\((.*?)\\);`, "is");
    const tableSql = schemaSql?.match(tablePattern)?.[1]?.toLowerCase() || "";
    const missingColumns = contract.requiredColumns.filter((column) => !new RegExp(`\\b${column}\\b`, "i").test(tableSql));
    return { ...contract, status: missingColumns.length ? "fail" as const : "pass" as const, missingColumns };
  });
}

function buildPacket(report: Omit<WorkspaceHealthReport, "packet">) {
  const failed = report.checks.filter((item) => item.status === "fail");
  const warnings = report.checks.filter((item) => item.status === "warn");
  return [
    "Sellentum Workspace Data Contract packet",
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    `Mode: ${report.mode}`,
    `Status: ${report.status} (${report.score}%)`,
    `Workspace: ${report.summary.activeProducts}/${report.summary.products} active products · ${report.summary.publishedFinders}/${report.summary.finders} published finders · ${report.summary.publishedConfigurators}/${report.summary.configurators} published configurators · ${report.summary.events} events`,
    "",
    "Contract checks:",
    ...report.checks.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),
    "",
    "Supabase table contract:",
    ...report.schemaContracts.map((item) => `- [${item.status.toUpperCase()}] ${item.table}: ${item.missingColumns.length ? `missing ${item.missingColumns.join(", ")}` : item.purpose}`),
    "",
    "Next actions:",
    ...(report.actions.length ? report.actions.map((item) => `- [${item.priority.toUpperCase()}] ${item.title}: ${item.detail}`) : ["- No blocking data-contract actions remain for this workspace snapshot."]),
    "",
    failed.length ? `Blocked by: ${failed.map((item) => item.label).join(", ")}` : warnings.length ? `Needs review: ${warnings.map((item) => item.label).join(", ")}` : "All required data-contract checks passed for this snapshot.",
  ].join("\n");
}

export function buildWorkspaceHealthReport({ mode, source = "client-store", products, quizzes, configurators, events, settings, schemaSql }: {
  mode: "demo" | "supabase";
  source?: "client-store" | "server-api";
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  schemaSql?: string;
}): WorkspaceHealthReport {
  const generatedAt = new Date().toISOString();
  const activeProducts = products.filter((product) => product.active);
  const enrichedProducts = products.filter((product) => product.enrichment_status === "enriched" || hasValue(product.search_text) || (product.buyer_needs || []).length);
  const productsWithCommerce = activeProducts.filter((product) => hasValue(product.product_url) && hasValue(product.image_url));
  const productsWithRules = new Set<string>();
  quizzes.forEach((quiz) => quiz.questions.forEach((question) => question.options.forEach((option) => {
    if (option.match_type !== "none" && option.match_value) products.forEach((product) => {
      const value = option.match_value.toLowerCase();
      if (option.match_type === "category" && product.category.toLowerCase() === value) productsWithRules.add(product.id);
      if (option.match_type === "tag" && product.tags.some((tag) => tag.toLowerCase() === value)) productsWithRules.add(product.id);
      if (option.match_type === "feature" && product.features.some((feature) => feature.toLowerCase() === value)) productsWithRules.add(product.id);
      if (option.match_type === "budget_max" && product.price <= Number(option.match_value)) productsWithRules.add(product.id);
    });
  })));
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const finderWithRules = publishedFinders.filter((quiz) => quiz.questions.some((question) => question.options.some((option) => option.match_type !== "none" && option.match_value)));
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const configuratorsWithProductLinks = publishedConfigurators.filter((configurator) => configurator.steps.some((step) => step.options.some((option) => hasValue(option.product_id))));
  const sessionEvents = events.filter(eventHasSession);
  const attributedEvents = events.filter(eventHasAttribution);
  const eventsWithExperience = events.filter(eventHasExperience);
  const recommendedEvents = events.filter((event) => event.event_type === "product_recommended");
  const buyClicks = events.filter((event) => event.event_type === "buy_click");
  const schemaContracts = auditWorkspaceSchema(schemaSql);
  const schemaPasses = schemaContracts.filter((item) => item.status === "pass").length;
  const normalizedSchemaSql = normalizeSchemaSql(schemaSql);
  const missingFunctions = expectedWorkspaceFunctions.filter((item) => !normalizedSchemaSql.includes(`function public.${item.name}`));
  const expectedEvents = ["widget_view", "quiz_start", "quiz_complete", "product_recommended", "buy_click"];
  const observedEventTypes = new Set(events.map((event) => event.event_type));

  const checks = [
    check("mode", "persistence", "Persistence mode", mode === "supabase" ? "pass" : "warn", mode === "supabase" ? "Supabase-backed workspace data is active." : "Demo mode is active; useful for testing, but production proof still needs Supabase.", mode, "/dashboard/production"),
    check("server-source", "persistence", "Server API contract", source === "server-api" ? "pass" : "warn", source === "server-api" ? "Health was generated by an authenticated server route." : "Health was generated from the browser store until the server route responds.", source, "/dashboard/data-contract"),
    check("schema", "schema", "Supabase table coverage", schemaContracts.some((item) => item.status === "fail") ? "fail" : schemaContracts.every((item) => item.status === "pass") ? "pass" : "warn", `${schemaPasses}/${schemaContracts.length} required table contracts are proven from schema SQL.`, schemaContracts.filter((item) => item.status !== "pass").map((item) => item.table).join(", ") || "All expected tables and columns found.", "/dashboard/production"),
    check("transactional-saves", "schema", "Transactional builder saves", !normalizedSchemaSql ? "warn" : missingFunctions.length ? "fail" : "pass", !normalizedSchemaSql ? "Schema SQL was not available to prove transactional builder RPCs." : missingFunctions.length ? `Missing ${missingFunctions.map((item) => item.name).join(", ")}.` : "Finder and configurator nested saves are backed by atomic Supabase RPC functions.", expectedWorkspaceFunctions.map((item) => `${item.name}: ${item.purpose}`).join(" "), "/dashboard/data-contract"),
    check("catalog-size", "catalog", "Active product catalog", activeProducts.length >= 3 ? "pass" : activeProducts.length ? "warn" : "fail", activeProducts.length >= 3 ? `${activeProducts.length} active products can power comparison and ranking.` : activeProducts.length ? "Add more active products so recommendations can compare alternatives." : "No active products are available for recommendations.", `${activeProducts.length}/${products.length} active`, "/dashboard/products"),
    check("catalog-commerce", "catalog", "Commerce-ready product cards", activeProducts.length && productsWithCommerce.length === activeProducts.length ? "pass" : productsWithCommerce.length ? "warn" : "fail", `${productsWithCommerce.length}/${activeProducts.length} active products have image and Buy Now URL coverage.`, "Requires image_url and product_url.", "/dashboard/availability"),
    check("catalog-enrichment", "catalog", "Discovery language coverage", activeProducts.length && enrichedProducts.length / Math.max(1, activeProducts.length) >= 0.75 ? "pass" : enrichedProducts.length ? "warn" : "fail", `${enrichedProducts.length}/${activeProducts.length} active products include enrichment, buyer needs or semantic search text.`, "Powers advisor, semantic search and grounded explanations.", "/dashboard/catalog-pipeline"),
    check("rule-coverage", "experiences", "Deterministic rule coverage", productsWithRules.size >= Math.min(3, activeProducts.length) ? "pass" : productsWithRules.size ? "warn" : "fail", `${productsWithRules.size} product${productsWithRules.size === 1 ? "" : "s"} are reachable through finder answer rules.`, "Rules select products before AI explains.", "/dashboard/lab"),
    check("published-finder", "experiences", "Published product finder", finderWithRules.length ? "pass" : publishedFinders.length ? "warn" : "fail", finderWithRules.length ? `${finderWithRules.length} published finder${finderWithRules.length === 1 ? "" : "s"} include deterministic answer rules.` : publishedFinders.length ? "Published finder exists, but answer-rule coverage needs review." : "No product finder is published yet.", `${publishedFinders.length}/${quizzes.length} finders published.`, "/dashboard/quizzes"),
    check("published-configurator", "experiences", "Published configurator workflow", configuratorsWithProductLinks.length ? "pass" : publishedConfigurators.length ? "warn" : "warn", configuratorsWithProductLinks.length ? `${configuratorsWithProductLinks.length} published configurator${configuratorsWithProductLinks.length === 1 ? "" : "s"} include product-linked options.` : "Configurator coverage is optional for the smallest MVP, but needed for complex bundle workflows.", `${publishedConfigurators.length}/${configurators.length} configurators published.`, "/dashboard/configurators"),
    check("settings", "settings", "Brand and widget settings", settings.brand_name && settings.primary_color && settings.button_text && settings.widget_title ? "pass" : "fail", settings.brand_name ? `${settings.brand_name} has widget copy and CTA settings.` : "Brand and widget copy settings are incomplete.", "Shared by finder, advisor, search and configurator embeds.", "/dashboard/settings"),
    check("analytics-events", "analytics", "Analytics event coverage", expectedEvents.every((type) => observedEventTypes.has(type as AnalyticsEvent["event_type"])) ? "pass" : observedEventTypes.size >= 3 ? "warn" : "fail", `${observedEventTypes.size}/${expectedEvents.length} core event types observed.`, Array.from(observedEventTypes).join(", ") || "No analytics events found.", "/dashboard/analytics"),
    check("analytics-session", "analytics", "Session and experience linkage", events.length && sessionEvents.length / events.length >= 0.75 && eventsWithExperience.length / events.length >= 0.95 ? "pass" : events.length ? "warn" : "fail", `${sessionEvents.length}/${events.length} events have session IDs; ${eventsWithExperience.length}/${events.length} have experience linkage.`, "Required for journey replay and funnel diagnosis.", "/dashboard/analytics"),
    check("analytics-attribution", "analytics", "Widget attribution labels", events.length && attributedEvents.length / events.length >= 0.35 ? "pass" : attributedEvents.length ? "warn" : "warn", `${attributedEvents.length}/${events.length} events include campaign, placement, source or page attribution.`, "Required to compare storefront placements.", "/dashboard/channels"),
    check("runtime-signals", "runtime", "Recommendation and conversion telemetry", recommendedEvents.length && buyClicks.length ? "pass" : recommendedEvents.length ? "warn" : "fail", `${recommendedEvents.length} recommendation event${recommendedEvents.length === 1 ? "" : "s"} and ${buyClicks.length} buy click${buyClicks.length === 1 ? "" : "s"} recorded.`, "Proves public runtime result cards and Buy Now tracking.", "/dashboard/storefront-sandbox"),
  ];

  const score = Math.round(checks.reduce((sum, item) => sum + scoreFor(item.status), 0) / checks.length);
  const failingChecks = checks.filter((item) => item.status === "fail");
  const warningChecks = checks.filter((item) => item.status === "warn");
  const status: WorkspaceHealthStatus = failingChecks.length ? "blocked" : warningChecks.length ? "review" : "ready";
  const actions = [...failingChecks, ...warningChecks].slice(0, 7).map((item, index) => ({
    id: `action-${item.id}`,
    priority: priorityFor(item.status, index),
    title: item.status === "fail" ? `Fix ${item.label}` : `Review ${item.label}`,
    detail: item.detail,
    href: item.href,
  }));
  const reportWithoutPacket = {
    status,
    score,
    headline: status === "ready" ? "Workspace data, schema and runtime evidence are aligned for launch testing." : status === "review" ? "The workspace is usable, but a few data-contract proofs still need review." : "The workspace has blocking data-contract gaps before production launch.",
    generatedAt,
    source,
    mode,
    summary: {
      products: products.length,
      activeProducts: activeProducts.length,
      finders: quizzes.length,
      publishedFinders: publishedFinders.length,
      configurators: configurators.length,
      publishedConfigurators: publishedConfigurators.length,
      events: events.length,
      schemaTables: schemaContracts.length,
      passingChecks: checks.filter((item) => item.status === "pass").length,
      warningChecks: warningChecks.length,
      failingChecks: failingChecks.length,
    },
    checks,
    schemaContracts,
    actions,
  };
  return { ...reportWithoutPacket, packet: buildPacket(reportWithoutPacket) };
}
