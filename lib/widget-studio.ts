import { buildExperienceRegistry, type ExperienceRegistrySurface } from "./experience-registry";
import { buildLaunchExperienceCards, type LaunchExperienceCard } from "./experience-launch";
import { buildWidgetInstallReport, buildWidgetSnippet, type WidgetEmbedMode, type WidgetInstallReport, type WidgetSnippetConfig } from "./widget-snippet";
import type { AnalyticsEvent, Configurator, Quiz, WidgetSettings } from "@/lib/types";

export type WidgetStudioStatus = "ready" | "watch" | "blocked";
export type WidgetStudioCheckStatus = "pass" | "warn" | "fail";
export type WidgetStudioActionPriority = "critical" | "high" | "medium" | "low";

export type WidgetStudioCheck = {
  id: string;
  label: string;
  detail: string;
  status: WidgetStudioCheckStatus;
};

export type WidgetStudioAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
  label: string;
  priority: WidgetStudioActionPriority;
};

export type WidgetStudioExperience = {
  id: string;
  experience: LaunchExperienceCard["experience"];
  label: string;
  name: string;
  purpose: string;
  source: LaunchExperienceCard["source"];
  sourceId?: string;
  readiness: WidgetStudioStatus;
  readinessLabel: string;
  publicUrl: string;
  targetPath: string;
  launcherLabel: string;
  bestPlacement: string;
  modalSnippet: string;
  inlineSnippet: string;
  modalInstall: WidgetInstallReport;
  inlineInstall: WidgetInstallReport;
  metrics: ExperienceRegistrySurface["metrics"];
  qa: WidgetStudioCheck[];
};

export type WidgetStudioContractField = {
  attribute: string;
  required: boolean;
  example: string;
  detail: string;
};

export type WidgetStudioEventContract = {
  event: string;
  when: string;
  requiredMetadata: string[];
};

export type WidgetStudioReport = {
  status: WidgetStudioStatus;
  score: number;
  summary: {
    experiences: number;
    installable: number;
    blocked: number;
    modalSnippets: number;
    inlineSnippets: number;
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    totalClicks: number;
  };
  recommendedExperience?: WidgetStudioExperience;
  experiences: WidgetStudioExperience[];
  installContract: WidgetStudioContractField[];
  eventContract: WidgetStudioEventContract[];
  qaChecks: WidgetStudioCheck[];
  actions: WidgetStudioAction[];
  packet: string;
};

const placementGuidance: Record<LaunchExperienceCard["experience"], string> = {
  finder: "Homepage hero, buying-guide pages and category pages where shoppers need a clear path.",
  assistant: "Support pages, comparison guides and high-consideration pages where shoppers ask open-ended questions.",
  search: "Collection and category pages where shoppers know the outcome they want but not the exact SKU.",
  configurator: "PDPs, kit pages and bundle pages where compatibility or add-on choice matters.",
};

const installContract: WidgetStudioContractField[] = [
  { attribute: "src", required: true, example: "https://your-findly-app.vercel.app/api/widget.js", detail: "Loads the framework-independent Findly storefront widget script." },
  { attribute: "data-experience", required: true, example: "finder | assistant | search | configurator", detail: "Chooses which customer-facing runtime opens in the iframe." },
  { attribute: "data-mode", required: true, example: "modal | inline", detail: "Modal lazy-loads after shopper intent; inline renders the iframe where the snippet is placed." },
  { attribute: "data-id", required: true, example: "quiz_footwear", detail: "Published finder or configurator ID/slug used as the catalog context." },
  { attribute: "data-color", required: true, example: "#22352a", detail: "Themes the launcher, frame chrome and primary storefront affordances." },
  { attribute: "data-label", required: true, example: "Find my match", detail: "Sets the modal launcher CTA or inline frame label." },
  { attribute: "data-position", required: false, example: "right | left", detail: "Controls the floating launcher position for modal installs." },
  { attribute: "data-height", required: false, example: "780px", detail: "Controls iframe height for inline installs and modal frame sizing." },
  { attribute: "data-source / data-campaign / data-placement", required: false, example: "homepage / spring-launch / hero", detail: "Adds attribution labels so Analytics can compare launch surfaces." },
];

const eventContract: WidgetStudioEventContract[] = [
  { event: "widget_view", when: "The storefront snippet renders or the modal launcher becomes visible.", requiredMetadata: ["experience_type", "experience_id", "session_id", "findly_page_url"] },
  { event: "quiz_start", when: "A shopper begins the finder, advisor, search or configurator journey.", requiredMetadata: ["experience_type", "experience_id", "session_id"] },
  { event: "quiz_complete", when: "A shopper reaches recommendations, search results or bundle review.", requiredMetadata: ["experience_type", "experience_id", "session_id", "result_count"] },
  { event: "product_recommended", when: "A ranked product card is shown to the shopper.", requiredMetadata: ["experience_type", "experience_id", "session_id", "rank", "product_name"] },
  { event: "buy_click", when: "The shopper clicks a product, checkout or buy button from Findly.", requiredMetadata: ["experience_type", "experience_id", "session_id", "product_name"] },
  { event: "recommendation_feedback", when: "A shopper marks a recommended product Helpful or Not right.", requiredMetadata: ["experience_type", "experience_id", "session_id", "feedback", "product_name"] },
];

function cleanOrigin(origin: string) {
  return (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
}

function check(id: string, label: string, detail: string, status: WidgetStudioCheckStatus): WidgetStudioCheck {
  return { id, label, detail, status };
}

function checkStatusFromSeverity(severity: WidgetInstallReport["checks"][number]["severity"]): WidgetStudioCheckStatus {
  if (severity === "pass") return "pass";
  if (severity === "warning") return "warn";
  return "fail";
}

function readinessLabel(status: WidgetStudioStatus) {
  if (status === "ready") return "Install ready";
  if (status === "watch") return "Ready, needs QA traffic";
  return "Blocked";
}

function statusScore(status: WidgetStudioStatus) {
  if (status === "ready") return 100;
  if (status === "watch") return 70;
  return 15;
}

function checkScore(status: WidgetStudioCheckStatus) {
  if (status === "pass") return 100;
  if (status === "warn") return 55;
  return 0;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function snippetConfig(card: LaunchExperienceCard, settings: WidgetSettings, origin: string, mode: WidgetEmbedMode): WidgetSnippetConfig {
  return {
    origin,
    experience: card.experience,
    mode,
    id: card.id,
    color: settings.primary_color,
    label: card.launcherLabel,
    position: settings.launcher_position === "bottom-left" ? "left" : "right",
    medium: mode === "inline" ? "embed-inline" : "embed-modal",
    campaign: "findly-widget-studio",
    placement: `${card.experience}-${mode}`,
    source: "widget-studio",
  };
}

function metricsFallback(): ExperienceRegistrySurface["metrics"] {
  return { sessions: 0, views: 0, starts: 0, completions: 0, recommendations: 0, clicks: 0, startRate: 0, completionRate: 0, clickRate: 0 };
}

function surfaceForCard(card: LaunchExperienceCard, surfaces: ExperienceRegistrySurface[]) {
  return surfaces.find((surface) => surface.experience === card.experience && surface.sourceId === card.sourceId)
    || surfaces.find((surface) => surface.experience === card.experience);
}

function qaForExperience(card: LaunchExperienceCard, modalInstall: WidgetInstallReport, inlineInstall: WidgetInstallReport, metrics: ExperienceRegistrySurface["metrics"]): WidgetStudioCheck[] {
  const modalBlocker = modalInstall.checks.find((item) => item.severity === "blocker");
  const inlineBlocker = inlineInstall.checks.find((item) => item.severity === "blocker");
  const strongestModalSeverity = modalBlocker?.severity || modalInstall.checks.find((item) => item.severity === "warning")?.severity || "pass";
  const strongestInlineSeverity = inlineBlocker?.severity || inlineInstall.checks.find((item) => item.severity === "warning")?.severity || "pass";

  return [
    check("publish-state", "Published experience", card.status === "ready" ? `${card.name || card.label} is published and has a stable public URL.` : card.statusLabel, card.status === "ready" ? "pass" : "fail"),
    check("modal-install", "Modal install", modalBlocker?.detail || "Modal launcher has the required script, experience, ID and branding attributes.", checkStatusFromSeverity(strongestModalSeverity)),
    check("inline-install", "Inline install", inlineBlocker?.detail || "Inline iframe install has the required script, experience, ID and branding attributes.", checkStatusFromSeverity(strongestInlineSeverity)),
    check("telemetry", "Telemetry proof", metrics.views ? `${metrics.views} views, ${metrics.starts} starts, ${metrics.completions} completions and ${metrics.clicks} clicks captured.` : "No storefront telemetry yet. Run the Storefront QA sandbox after install.", metrics.views ? "pass" : "warn"),
  ];
}

function readinessFor(card: LaunchExperienceCard, modalInstall: WidgetInstallReport, inlineInstall: WidgetInstallReport, metrics: ExperienceRegistrySurface["metrics"]): WidgetStudioStatus {
  if (card.status !== "ready" || !modalInstall.canInstall || !inlineInstall.canInstall) return "blocked";
  if (metrics.views || metrics.starts || metrics.completions || metrics.clicks) return "ready";
  return "watch";
}

function buildExperience(card: LaunchExperienceCard, settings: WidgetSettings, origin: string, surfaces: ExperienceRegistrySurface[]): WidgetStudioExperience {
  const modalConfig = snippetConfig(card, settings, origin, "modal");
  const inlineConfig = snippetConfig(card, settings, origin, "inline");
  const modalInstall = buildWidgetInstallReport(modalConfig);
  const inlineInstall = buildWidgetInstallReport(inlineConfig);
  const metrics = surfaceForCard(card, surfaces)?.metrics || metricsFallback();
  const readiness = readinessFor(card, modalInstall, inlineInstall, metrics);

  return {
    id: `${card.experience}:${card.sourceId || "missing"}`,
    experience: card.experience,
    label: card.label,
    name: card.name || card.statusLabel,
    purpose: card.purpose,
    source: card.source,
    sourceId: card.sourceId,
    readiness,
    readinessLabel: readinessLabel(readiness),
    publicUrl: card.publicUrl,
    targetPath: card.targetPath,
    launcherLabel: card.launcherLabel,
    bestPlacement: placementGuidance[card.experience],
    modalSnippet: buildWidgetSnippet(modalConfig),
    inlineSnippet: buildWidgetSnippet(inlineConfig),
    modalInstall,
    inlineInstall,
    metrics,
    qa: qaForExperience(card, modalInstall, inlineInstall, metrics),
  };
}

function qaChecksFor(experiences: WidgetStudioExperience[], settings: WidgetSettings): WidgetStudioCheck[] {
  const blocked = experiences.filter((experience) => experience.readiness === "blocked");
  const installable = experiences.filter((experience) => experience.readiness !== "blocked");
  const modalSnippets = experiences.filter((experience) => experience.modalSnippet.includes('data-mode="modal"'));
  const inlineSnippets = experiences.filter((experience) => experience.inlineSnippet.includes('data-mode="inline"'));
  const hasAttribution = experiences.every((experience) => experience.modalSnippet.includes("data-campaign") && experience.modalSnippet.includes("data-placement") && experience.modalSnippet.includes("data-source"));
  const hasBrand = Boolean(settings.brand_name.trim() && /^#[0-9a-f]{6}$/i.test(settings.primary_color) && settings.button_text.trim());
  const telemetryViews = experiences.reduce((sum, experience) => sum + experience.metrics.views, 0);

  return [
    check("experience-selection", "Experience selection", installable.length ? `${installable.length} customer-facing surfaces have real published IDs.` : "Publish a finder or configurator before copying production snippets.", installable.length ? "pass" : "fail"),
    check("modal-inline", "Modal and inline modes", modalSnippets.length === experiences.length && inlineSnippets.length === experiences.length ? "Every surface has both modal and inline snippets generated from the same contract." : "One or more surfaces is missing a modal or inline snippet.", modalSnippets.length === experiences.length && inlineSnippets.length === experiences.length ? "pass" : "fail"),
    check("attribution", "Attribution labels", hasAttribution ? "Widget Studio stamps source, campaign and placement labels into every generated snippet." : "Add campaign/source/placement labels before comparing launches.", hasAttribution ? "pass" : "warn"),
    check("branding", "Brand contract", hasBrand ? `${settings.brand_name} has brand colour ${settings.primary_color} and CTA “${settings.button_text}”.` : "Complete brand name, primary colour and button text in settings.", hasBrand ? "pass" : "warn"),
    check("runtime-routes", "Public routes", blocked.length === experiences.length ? "No public route can be installed until an experience is published." : "Finder, advisor, search and configurator routes are addressable from the widget script.", blocked.length === experiences.length ? "fail" : "pass"),
    check("storefront-qa", "Storefront QA", telemetryViews ? `${telemetryViews} widget views captured across embedded surfaces.` : "Run staging QA to prove widget view, start, completion, recommendation and buy-click events.", telemetryViews ? "pass" : "warn"),
  ];
}

function actionQueue(experiences: WidgetStudioExperience[], qaChecks: WidgetStudioCheck[]): WidgetStudioAction[] {
  const actions: WidgetStudioAction[] = [];
  const installable = experiences.filter((experience) => experience.readiness !== "blocked");
  const blocked = experiences.filter((experience) => experience.readiness === "blocked");
  const hasTelemetry = experiences.some((experience) => experience.metrics.views || experience.metrics.starts || experience.metrics.completions || experience.metrics.clicks);
  const hasCriticalQa = qaChecks.some((checkItem) => checkItem.status === "fail");

  if (!installable.length) {
    actions.push({
      id: "publish-first-experience",
      title: "Publish a finder or configurator",
      detail: "Widget Studio needs at least one published customer-facing experience before production snippets can be installed.",
      href: "/dashboard/launch",
      label: "Open Launch Studio",
      priority: "critical",
    });
  }

  if (blocked.length) {
    actions.push({
      id: "repair-blocked-snippets",
      title: "Resolve blocked embed surfaces",
      detail: `${blocked.length} surfaces still have placeholder IDs, draft sources or missing publish state.`,
      href: "/dashboard/experiences",
      label: "Open registry",
      priority: hasCriticalQa ? "high" : "medium",
    });
  }

  if (installable.length && !hasTelemetry) {
    actions.push({
      id: "run-storefront-qa",
      title: "Run a staging storefront QA pass",
      detail: "Install the modal snippet on a staging page and verify widget_view, start, completion, recommendation and buy-click telemetry.",
      href: "/dashboard/storefront-sandbox",
      label: "Run QA",
      priority: "high",
    });
  }

  if (installable.length) {
    actions.push({
      id: "copy-install-packet",
      title: "Copy the implementation packet",
      detail: "Send the recommended modal and inline snippets, install contract and analytics event contract to your theme developer.",
      href: "/dashboard/widget-studio",
      label: "Copy packet",
      priority: "medium",
    });
  }

  actions.push({
    id: "monitor-runtime",
    title: "Monitor runtime operations after install",
    detail: "Confirm public endpoints, guardrails, analytics quality and release gates stay healthy once storefront traffic starts.",
    href: "/dashboard/operations",
    label: "Runtime Ops",
    priority: hasTelemetry ? "low" : "medium",
  });

  return actions.slice(0, 5);
}

function packetFor(report: Omit<WidgetStudioReport, "packet">) {
  const recommended = report.recommendedExperience;
  return [
    "Findly Widget Studio packet",
    "===========================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    `Experiences: ${report.summary.experiences} · Installable: ${report.summary.installable} · Blocked: ${report.summary.blocked}`,
    `Telemetry: ${report.summary.totalViews} views · ${report.summary.totalStarts} starts · ${report.summary.totalCompletions} completions · ${report.summary.totalClicks} clicks`,
    "",
    "Recommended install",
    recommended ? `${recommended.label}: ${recommended.name}\nPublic URL: ${recommended.publicUrl}\nBest placement: ${recommended.bestPlacement}` : "No installable experience yet.",
    "",
    "Modal snippet",
    recommended?.modalSnippet || "Publish an experience to generate a modal snippet.",
    "",
    "Inline snippet",
    recommended?.inlineSnippet || "Publish an experience to generate an inline snippet.",
    "",
    "Install contract",
    ...report.installContract.map((field) => `- ${field.attribute}${field.required ? " (required)" : ""}: ${field.detail}`),
    "",
    "Analytics event contract",
    ...report.eventContract.map((event) => `- ${event.event}: ${event.requiredMetadata.join(", ")}`),
    "",
    "QA checklist",
    ...report.qaChecks.map((item) => `- [${item.status.toUpperCase()}] ${item.label}: ${item.detail}`),
    "",
    "Action queue",
    ...report.actions.map((action) => `- ${action.title}: ${action.detail}`),
  ].join("\n");
}

export function buildWidgetStudioReport({
  origin,
  settings,
  quizzes,
  configurators,
  events = [],
}: {
  origin: string;
  settings: WidgetSettings;
  quizzes: Quiz[];
  configurators: Configurator[];
  events?: AnalyticsEvent[];
}): WidgetStudioReport {
  const clean = cleanOrigin(origin);
  const launchCards = buildLaunchExperienceCards({ origin: clean, settings, finders: quizzes, configurators, mode: "modal" });
  const registry = buildExperienceRegistry({ origin: clean, settings, quizzes, configurators, events });
  const experiences = launchCards.map((card) => buildExperience(card, settings, clean, registry.surfaces));
  const qaChecks = qaChecksFor(experiences, settings);
  const actions = actionQueue(experiences, qaChecks);
  const recommendedExperience = experiences
    .filter((experience) => experience.readiness !== "blocked")
    .sort((a, b) => statusScore(b.readiness) - statusScore(a.readiness) || b.metrics.clicks - a.metrics.clicks || b.metrics.completions - a.metrics.completions)[0];
  const status: WidgetStudioStatus = experiences.some((experience) => experience.readiness === "ready")
    ? "ready"
    : experiences.some((experience) => experience.readiness === "watch")
      ? "watch"
      : "blocked";
  const score = Math.round((average(experiences.map((experience) => statusScore(experience.readiness))) * 0.62) + (average(qaChecks.map((item) => checkScore(item.status))) * 0.38));
  const baseReport: Omit<WidgetStudioReport, "packet"> = {
    status,
    score,
    summary: {
      experiences: experiences.length,
      installable: experiences.filter((experience) => experience.readiness !== "blocked").length,
      blocked: experiences.filter((experience) => experience.readiness === "blocked").length,
      modalSnippets: experiences.filter((experience) => experience.modalSnippet.includes('data-mode="modal"')).length,
      inlineSnippets: experiences.filter((experience) => experience.inlineSnippet.includes('data-mode="inline"')).length,
      totalViews: registry.summary.totalViews,
      totalStarts: registry.summary.totalStarts,
      totalCompletions: registry.summary.totalCompletions,
      totalClicks: registry.summary.totalClicks,
    },
    recommendedExperience,
    experiences,
    installContract,
    eventContract,
    qaChecks,
    actions,
  };

  return { ...baseReport, packet: packetFor(baseReport) };
}
