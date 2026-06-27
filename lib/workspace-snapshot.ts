import { buildDecisionGraph } from "./decision-graph";
import { buildLaunchChannelReport } from "./launch-channels";
import { buildReleaseCandidate } from "./release-center";
import type { AnalyticsEvent, Configurator, Product, Quiz, WidgetSettings } from "@/lib/types";

export type WorkspaceSnapshotStatus = "portable" | "review" | "blocked";
export type WorkspaceSnapshotCheckStatus = "pass" | "warn" | "fail";

export type WorkspaceSnapshotCheck = {
  id: string;
  label: string;
  detail: string;
  status: WorkspaceSnapshotCheckStatus;
  href: string;
  action: string;
};

export type WorkspaceSnapshotSection = {
  id: string;
  label: string;
  count: number;
  detail: string;
  status: WorkspaceSnapshotCheckStatus;
};

export type WorkspaceExportFile = {
  id: "json" | "products" | "analytics" | "handoff";
  label: string;
  filename: string;
  format: "json" | "csv" | "markdown";
  bytes: number;
  description: string;
};

export type WorkspaceSnapshotArchive = {
  version: "findly-workspace-snapshot-v1";
  snapshot_id: string;
  generated_at: string;
  origin: string;
  brand: Omit<WidgetSettings, "user_id">;
  products: Array<Omit<Product, "user_id" | "created_at">>;
  quizzes: Array<Omit<Quiz, "user_id" | "created_at">>;
  configurators: Array<Omit<Configurator, "user_id" | "created_at">>;
  analytics: {
    total_events: number;
    counts: Record<string, number>;
    recent_events: Array<{
      id: string;
      event_type: AnalyticsEvent["event_type"];
      quiz_id: string;
      product_id?: string;
      created_at: string;
      metadata: Record<string, unknown>;
    }>;
  };
  release: {
    id: string;
    decision: string;
    score: number;
    summary: ReturnType<typeof buildReleaseCandidate>["summary"];
    gates: Array<Pick<ReturnType<typeof buildReleaseCandidate>["gates"][number], "id" | "label" | "status" | "detail">>;
    rollback_plan: string[];
  };
  decision_graph: {
    status: string;
    score: number;
    summary: ReturnType<typeof buildDecisionGraph>["summary"];
    actions: Array<Pick<ReturnType<typeof buildDecisionGraph>["actions"][number], "title" | "detail" | "severity" | "href">>;
  };
  launch_channels: {
    status: string;
    score: number;
    summary: ReturnType<typeof buildLaunchChannelReport>["summary"];
    channels: Array<{
      id: string;
      name: string;
      placement: string;
      experience: string;
      status: string;
      public_url: string;
      snippet: string;
    }>;
  };
};

export type WorkspaceSnapshot = {
  id: string;
  generatedAt: string;
  status: WorkspaceSnapshotStatus;
  score: number;
  summary: {
    products: number;
    activeProducts: number;
    finders: number;
    publishedFinders: number;
    configurators: number;
    publishedConfigurators: number;
    analyticsEvents: number;
    readyChannels: number;
    releaseScore: number;
    decisionGraphScore: number;
  };
  checks: WorkspaceSnapshotCheck[];
  sections: WorkspaceSnapshotSection[];
  restorePlan: string[];
  archive: WorkspaceSnapshotArchive;
  json: string;
  productCsv: string;
  analyticsCsv: string;
  handoff: string;
  exportFiles: WorkspaceExportFile[];
};

const allowedMetadataKeys = [
  "experience_type",
  "experience_id",
  "experience_name",
  "experience_slug",
  "findly_source",
  "findly_medium",
  "findly_campaign",
  "findly_placement",
  "findly_content",
  "findly_term",
  "page_url",
  "page_title",
  "referrer",
  "query",
  "terms",
  "answer_summary",
  "matched_signals",
  "product_name",
  "search_action",
  "advisor_status",
  "recovery_status",
];

function cleanOrigin(origin: string) {
  return (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "workspace";
}

function snapshotId(brandName: string, date: Date) {
  return `snapshot-${slugify(brandName)}-${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
}

function scoreForStatus(status: WorkspaceSnapshotCheckStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 62;
  return 0;
}

function statusFromChecks(checks: WorkspaceSnapshotCheck[], score: number): WorkspaceSnapshotStatus {
  if (checks.some((check) => check.status === "fail")) return "blocked";
  if (score >= 86 && checks.filter((check) => check.status === "warn").length <= 2) return "portable";
  return "review";
}

function check(id: string, label: string, detail: string, status: WorkspaceSnapshotCheckStatus, href: string, action: string): WorkspaceSnapshotCheck {
  return { id, label, detail, status, href, action };
}

function csvCell(value: unknown) {
  const raw = Array.isArray(value) ? value.join("|") : value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(raw.trim()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, "\"\"")}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(",");
}

function productCsv(products: Product[]) {
  const header = ["id", "name", "price", "active", "category", "description", "features", "tags", "buyer_needs", "image_url", "product_url", "updated_at"];
  return [
    csvRow(header),
    ...products.map((product) => csvRow([
      product.id,
      product.name,
      product.price,
      product.active,
      product.category,
      product.description,
      product.features,
      product.tags,
      product.buyer_needs || [],
      product.image_url,
      product.product_url,
      product.updated_at,
    ])),
  ].join("\n");
}

function safeMetadata(metadata?: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  if (!metadata) return safe;
  for (const key of allowedMetadataKeys) {
    const value = metadata[key];
    if (value == null) continue;
    if (Array.isArray(value)) safe[key] = value.filter((item) => ["string", "number", "boolean"].includes(typeof item)).slice(0, 12);
    else if (["string", "number", "boolean"].includes(typeof value)) safe[key] = value;
  }
  return safe;
}

function analyticsCsv(events: AnalyticsEvent[]) {
  const header = ["id", "event_type", "quiz_id", "product_id", "experience_type", "findly_source", "findly_campaign", "findly_placement", "created_at"];
  return [
    csvRow(header),
    ...events.map((event) => csvRow([
      event.id,
      event.event_type,
      event.quiz_id,
      event.product_id || "",
      typeof event.metadata?.experience_type === "string" ? event.metadata.experience_type : "",
      typeof event.metadata?.findly_source === "string" ? event.metadata.findly_source : "",
      typeof event.metadata?.findly_campaign === "string" ? event.metadata.findly_campaign : "",
      typeof event.metadata?.findly_placement === "string" ? event.metadata.findly_placement : "",
      event.created_at,
    ])),
  ].join("\n");
}

function eventCounts(events: AnalyticsEvent[]) {
  return events.reduce<Record<string, number>>((counts, event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    return counts;
  }, {});
}

function publicBrand(settings: WidgetSettings): Omit<WidgetSettings, "user_id"> {
  return {
    brand_name: settings.brand_name,
    primary_color: settings.primary_color,
    button_text: settings.button_text,
    widget_title: settings.widget_title,
    welcome_message: settings.welcome_message,
    launcher_position: settings.launcher_position,
  };
}

function publicProducts(products: Product[]): WorkspaceSnapshotArchive["products"] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.image_url,
    category: product.category,
    description: product.description,
    features: product.features,
    tags: product.tags,
    product_url: product.product_url,
    active: product.active,
    search_text: product.search_text,
    buyer_needs: product.buyer_needs,
    enrichment_status: product.enrichment_status,
    enriched_at: product.enriched_at,
    updated_at: product.updated_at,
  }));
}

function publicQuizzes(quizzes: Quiz[]): WorkspaceSnapshotArchive["quizzes"] {
  return quizzes.map((quiz) => ({
    id: quiz.id,
    name: quiz.name,
    slug: quiz.slug,
    welcome_title: quiz.welcome_title,
    welcome_message: quiz.welcome_message,
    published: quiz.published,
    recommendation_overrides: quiz.recommendation_overrides,
    questions: quiz.questions,
    updated_at: quiz.updated_at,
  }));
}

function publicConfigurators(configurators: Configurator[]): WorkspaceSnapshotArchive["configurators"] {
  return configurators.map((configurator) => ({
    id: configurator.id,
    name: configurator.name,
    slug: configurator.slug,
    title: configurator.title,
    subtitle: configurator.subtitle,
    hero_image_url: configurator.hero_image_url,
    base_price: configurator.base_price,
    published: configurator.published,
    steps: configurator.steps,
    updated_at: configurator.updated_at,
  }));
}

function formatHandoff({
  archive,
  restorePlan,
}: {
  archive: WorkspaceSnapshotArchive;
  restorePlan: string[];
}) {
  return [
    `Findly workspace snapshot: ${archive.brand.brand_name}`,
    "========================================",
    "",
    `Snapshot ID: ${archive.snapshot_id}`,
    `Generated: ${archive.generated_at}`,
    `App origin: ${archive.origin}`,
    "",
    "Summary",
    `- Products: ${archive.products.length} total / ${archive.products.filter((product) => product.active).length} active`,
    `- Finders: ${archive.quizzes.length} total / ${archive.quizzes.filter((quiz) => quiz.published).length} published`,
    `- Configurators: ${archive.configurators.length} total / ${archive.configurators.filter((configurator) => configurator.published).length} published`,
    `- Analytics events exported: ${archive.analytics.total_events}`,
    `- Release decision: ${archive.release.decision.toUpperCase()} (${archive.release.score}%)`,
    `- Decision graph: ${archive.decision_graph.status} (${archive.decision_graph.score}%)`,
    `- Launch channels ready: ${archive.launch_channels.summary.installReady}/${archive.launch_channels.summary.channels}`,
    "",
    "Developer handoff links",
    `- Dashboard: ${archive.origin}/dashboard`,
    `- Products: ${archive.origin}/dashboard/products`,
    `- Product finders: ${archive.origin}/dashboard/quizzes`,
    `- Configurators: ${archive.origin}/dashboard/configurators`,
    `- Release Center: ${archive.origin}/dashboard/release-center`,
    `- Storefront QA: ${archive.origin}/dashboard/storefront-sandbox`,
    "",
    "Install-ready channel snippets",
    ...archive.launch_channels.channels.map((channel) => [
      `- ${channel.name} (${channel.status})`,
      `  Placement: ${channel.placement}`,
      `  Public URL: ${channel.public_url}`,
      `  Snippet: ${channel.snippet.replace(/\s+/g, " ").trim()}`,
    ].join("\n")),
    "",
    "Release gates",
    ...archive.release.gates.map((gate) => `- [${gate.status.toUpperCase()}] ${gate.label}: ${gate.detail}`),
    "",
    "Restore plan",
    ...restorePlan.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

export function buildWorkspaceSnapshot({
  origin,
  products,
  quizzes,
  configurators,
  events,
  settings,
  generatedAt = new Date(),
}: {
  origin: string;
  products: Product[];
  quizzes: Quiz[];
  configurators: Configurator[];
  events: AnalyticsEvent[];
  settings: WidgetSettings;
  generatedAt?: Date;
}): WorkspaceSnapshot {
  const safeOrigin = cleanOrigin(origin);
  const id = snapshotId(settings.brand_name || "Findly", generatedAt);
  const release = buildReleaseCandidate({ origin: safeOrigin, products, quizzes, configurators, events, settings, generatedAt });
  const decisionGraph = buildDecisionGraph({ products, quizzes, configurators, events });
  const launchChannels = buildLaunchChannelReport({ origin: safeOrigin, settings, finders: quizzes, configurators, events });
  const activeProducts = products.filter((product) => product.active);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const publishedConfigurators = configurators.filter((configurator) => configurator.published);
  const missingUrls = activeProducts.filter((product) => !product.product_url).length;
  const missingImages = activeProducts.filter((product) => !product.image_url).length;
  const productExport = productCsv(products);
  const eventExport = analyticsCsv(events);

  const checks = [
    check(
      "catalog",
      "Portable catalog",
      `${activeProducts.length} active products are included in product CSV and JSON archive.`,
      activeProducts.length >= 3 ? "pass" : activeProducts.length ? "warn" : "fail",
      "/dashboard/products",
      "Review products",
    ),
    check(
      "commerce-links",
      "Commerce links and images",
      missingUrls || missingImages ? `${missingUrls} active products are missing buy URLs and ${missingImages} are missing image URLs.` : "Every active product has storefront URL and image URL coverage.",
      missingUrls ? "warn" : missingImages ? "warn" : "pass",
      "/dashboard/products",
      "Fill commerce fields",
    ),
    check(
      "finders",
      "Published product finder",
      publishedFinders.length ? `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"} included with questions, branching and answer rules.` : "No published finder is included in the archive.",
      publishedFinders.length ? "pass" : quizzes.length ? "warn" : "fail",
      "/dashboard/quizzes",
      "Publish finder",
    ),
    check(
      "configurators",
      "Configurator coverage",
      publishedConfigurators.length ? `${publishedConfigurators.length} published configurator${publishedConfigurators.length === 1 ? "" : "s"} included for PDP/bundle handoff.` : "No published configurator yet; this is optional unless PDP bundles are part of launch.",
      publishedConfigurators.length ? "pass" : configurators.length ? "warn" : "warn",
      "/dashboard/configurators",
      "Review configurators",
    ),
    check(
      "settings",
      "Brand settings",
      settings.brand_name && settings.primary_color && settings.button_text ? `${settings.brand_name} widget settings are included without user IDs or environment secrets.` : "Brand settings are incomplete.",
      settings.brand_name && settings.primary_color && settings.button_text ? "pass" : "warn",
      "/dashboard/settings",
      "Update brand settings",
    ),
    check(
      "release",
      "Release decision",
      `${release.decision.toUpperCase()} release candidate at ${release.score}% with rollback steps included.`,
      release.decision === "go" ? "pass" : release.decision === "review" ? "warn" : "fail",
      "/dashboard/release-center",
      "Open release center",
    ),
    check(
      "channels",
      "Install snippets",
      `${launchChannels.summary.installReady}/${launchChannels.summary.channels} launch channels are install-ready and copied into the handoff packet.`,
      launchChannels.summary.blockedChannels ? "fail" : launchChannels.summary.installReady === launchChannels.summary.channels ? "pass" : "warn",
      "/dashboard/channels",
      "Open launch channels",
    ),
    check(
      "analytics",
      "Redacted analytics proof",
      events.length ? `${events.length} analytics events summarized; recent metadata is allowlisted for safe sharing.` : "No analytics events yet; export still works, but launch proof is thin.",
      events.length ? "pass" : "warn",
      "/dashboard/analytics",
      "Review analytics",
    ),
  ];
  const score = Math.round(checks.reduce((sum, item) => sum + scoreForStatus(item.status), 0) / Math.max(1, checks.length));
  const status = statusFromChecks(checks, score);
  const restorePlan = [
    "Use the product CSV to recreate the active catalog through Products → Upload CSV.",
    "Use the JSON archive as the source of truth for quizzes, answer rules, configurators, settings and release metadata during developer-assisted restore.",
    "Reinstall the copied channel snippets only after the restored finder/configurator IDs are verified in the target environment.",
    "Run Launch Preflight, Storefront QA Sandbox and Release Center before routing production traffic to a restored workspace.",
    "Keep the previous snapshot until analytics confirms widget_view, quiz_start, quiz_complete, product_recommended and buy_click events are flowing again.",
  ];

  const archive: WorkspaceSnapshotArchive = {
    version: "findly-workspace-snapshot-v1",
    snapshot_id: id,
    generated_at: generatedAt.toISOString(),
    origin: safeOrigin,
    brand: publicBrand(settings),
    products: publicProducts(products),
    quizzes: publicQuizzes(quizzes),
    configurators: publicConfigurators(configurators),
    analytics: {
      total_events: events.length,
      counts: eventCounts(events),
      recent_events: events
        .slice()
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, 50)
        .map((event) => ({
          id: event.id,
          event_type: event.event_type,
          quiz_id: event.quiz_id,
          product_id: event.product_id,
          created_at: event.created_at,
          metadata: safeMetadata(event.metadata),
        })),
    },
    release: {
      id: release.id,
      decision: release.decision,
      score: release.score,
      summary: release.summary,
      gates: release.gates.map((gate) => ({ id: gate.id, label: gate.label, status: gate.status, detail: gate.detail })),
      rollback_plan: release.rollbackPlan,
    },
    decision_graph: {
      status: decisionGraph.status,
      score: decisionGraph.score,
      summary: decisionGraph.summary,
      actions: decisionGraph.actions.slice(0, 8).map((action) => ({ title: action.title, detail: action.detail, severity: action.severity, href: action.href })),
    },
    launch_channels: {
      status: launchChannels.status,
      score: launchChannels.score,
      summary: launchChannels.summary,
      channels: launchChannels.channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        placement: channel.placement,
        experience: channel.experience,
        status: channel.status,
        public_url: channel.publicUrl,
        snippet: channel.snippet,
      })),
    },
  };
  const json = JSON.stringify(archive, null, 2);
  const handoff = formatHandoff({ archive, restorePlan });

  return {
    id,
    generatedAt: generatedAt.toISOString(),
    status,
    score,
    summary: {
      products: products.length,
      activeProducts: activeProducts.length,
      finders: quizzes.length,
      publishedFinders: publishedFinders.length,
      configurators: configurators.length,
      publishedConfigurators: publishedConfigurators.length,
      analyticsEvents: events.length,
      readyChannels: launchChannels.summary.installReady,
      releaseScore: release.score,
      decisionGraphScore: decisionGraph.score,
    },
    checks,
    sections: [
      { id: "products", label: "Products", count: products.length, detail: `${activeProducts.length} active products; CSV includes commerce links, features, tags and buyer needs.`, status: activeProducts.length ? "pass" : "fail" },
      { id: "finders", label: "Product finders", count: quizzes.length, detail: `${publishedFinders.length} published finders with questions, answers, branches and merchandising overrides.`, status: publishedFinders.length ? "pass" : quizzes.length ? "warn" : "fail" },
      { id: "configurators", label: "Configurators", count: configurators.length, detail: `${publishedConfigurators.length} published configurators with product-linked options and compatibility rules.`, status: publishedConfigurators.length ? "pass" : configurators.length ? "warn" : "warn" },
      { id: "analytics", label: "Analytics proof", count: events.length, detail: "Event counts and recent allowlisted metadata are included for QA and support.", status: events.length ? "pass" : "warn" },
      { id: "release", label: "Release state", count: release.gates.length, detail: `${release.decision.toUpperCase()} candidate, rollback plan and release gates included.`, status: release.decision === "go" ? "pass" : release.decision === "review" ? "warn" : "fail" },
      { id: "channels", label: "Install channels", count: launchChannels.summary.channels, detail: `${launchChannels.summary.installReady} snippets ready for storefront handoff.`, status: launchChannels.summary.blockedChannels ? "fail" : "pass" },
    ],
    restorePlan,
    archive,
    json,
    productCsv: productExport,
    analyticsCsv: eventExport,
    handoff,
    exportFiles: [
      { id: "json", label: "JSON archive", filename: `${id}.json`, format: "json", bytes: json.length, description: "Developer-readable workspace archive with products, finders, configurators, settings, redacted analytics and launch state." },
      { id: "products", label: "Product CSV", filename: `${id}-products.csv`, format: "csv", bytes: productExport.length, description: "Merchant-friendly catalog backup that can be re-uploaded through the product CSV importer." },
      { id: "analytics", label: "Analytics CSV", filename: `${id}-analytics.csv`, format: "csv", bytes: eventExport.length, description: "Safe launch-proof export for event counts, attribution labels and QA review." },
      { id: "handoff", label: "Handoff notes", filename: `${id}-handoff.md`, format: "markdown", bytes: handoff.length, description: "Copyable developer/support packet with links, snippets, release gates and restore instructions." },
    ],
  };
}
