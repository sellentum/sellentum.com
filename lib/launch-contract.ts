import type { WidgetInstallReport, WidgetSnippetConfig } from "@/lib/widget-snippet";
import { widgetPathForExperience } from "@/lib/widget-snippet";

export type LaunchContractEvent = {
  event: "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click" | "recommendation_feedback";
  purpose: string;
  requiredMetadata: string[];
  optionalMetadata: string[];
};

export type LaunchContractCheck = {
  id: string;
  label: string;
  detail: string;
  owner: "merchant" | "developer" | "findly";
  status: "ready" | "review" | "blocked";
};

export type LaunchContract = {
  title: string;
  publicUrl: string;
  apiEndpoints: string[];
  dataAttributes: Array<{ name: string; value: string; purpose: string }>;
  events: LaunchContractEvent[];
  checks: LaunchContractCheck[];
  troubleshooting: string[];
  summary: string;
};

function cleanOrigin(origin: string) {
  return (origin || "https://your-findly-app.vercel.app").replace(/\/+$/, "");
}

function statusFromInstallSeverity(severity: WidgetInstallReport["checks"][number]["severity"]): LaunchContractCheck["status"] {
  if (severity === "blocker") return "blocked";
  if (severity === "warning") return "review";
  return "ready";
}

export function buildLaunchContract({
  config,
  installReport,
  publicUrl,
  activeProducts,
  enrichedPercent,
}: {
  config: WidgetSnippetConfig;
  installReport: WidgetInstallReport;
  publicUrl: string;
  activeProducts: number;
  enrichedPercent: number;
}): LaunchContract {
  const origin = cleanOrigin(config.origin);
  const path = widgetPathForExperience(config.experience);
  const experienceId = config.id || "YOUR_EXPERIENCE_ID";
  const checks: LaunchContractCheck[] = [
    ...installReport.checks.map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
      owner: item.id === "origin" || item.id === "id" ? "developer" as const : "merchant" as const,
      status: statusFromInstallSeverity(item.severity),
    })),
    {
      id: "catalog",
      label: "Active catalog",
      detail: activeProducts >= 2 ? `${activeProducts} active products are available to rank.` : "Add at least two active products before sending traffic.",
      owner: "merchant",
      status: activeProducts >= 2 ? "ready" : "blocked",
    },
    {
      id: "enrichment",
      label: "Discovery enrichment",
      detail: `${enrichedPercent}% of active products have enrichment, buyer needs or semantic search text.`,
      owner: "merchant",
      status: enrichedPercent >= 60 ? "ready" : enrichedPercent > 0 ? "review" : "review",
    },
  ];

  return {
    title: `${config.experience} launch contract`,
    publicUrl,
    apiEndpoints: [
      `${origin}/api/widget.js`,
      `${origin}/${path}/${encodeURIComponent(experienceId)}`,
      `${origin}/api/events`,
      `${origin}/api/public/${path}/${encodeURIComponent(experienceId)}`,
    ],
    dataAttributes: [
      { name: "data-experience", value: config.experience, purpose: "Chooses finder, advisor, search or configurator runtime." },
      { name: "data-mode", value: config.mode, purpose: "Controls modal launcher versus inline iframe." },
      { name: "data-id", value: experienceId, purpose: "Stable published experience identifier." },
      { name: "data-color", value: config.color, purpose: "Themes launcher and iframe chrome." },
      { name: "data-label", value: config.label, purpose: "Launcher CTA copy." },
      { name: "data-position", value: config.position, purpose: "Modal launcher side on the storefront." },
      { name: "data-height", value: config.height || "780px", purpose: "Inline iframe/modal frame height." },
      { name: "data-source", value: config.source || "auto storefront host", purpose: "Optional analytics source label; otherwise inferred from the storefront domain." },
      { name: "data-medium", value: config.medium || "embed", purpose: "Optional analytics medium label for campaign/source reporting." },
      { name: "data-campaign", value: config.campaign || "optional", purpose: "Optional analytics campaign label for launch attribution." },
      { name: "data-placement", value: config.placement || "optional", purpose: "Optional analytics placement label such as pdp-bottom or category-hero." },
    ],
    events: [
      {
        event: "widget_view",
        purpose: "Proves the script/frame loaded on the storefront.",
        requiredMetadata: ["experience_type", "experience_id", "session_id"],
        optionalMetadata: ["catalog_active_products", "findly_source", "findly_campaign", "findly_placement", "findly_page_url"],
      },
      {
        event: "quiz_start",
        purpose: "Captures shopper start/search/first interaction.",
        requiredMetadata: ["experience_type", "experience_id", "session_id"],
        optionalMetadata: ["query", "answers", "terms", "selected_options", "recovery_status", "findly_source", "findly_campaign", "findly_placement"],
      },
      {
        event: "quiz_complete",
        purpose: "Captures completed finder/advisor/configurator journeys.",
        requiredMetadata: ["experience_type", "experience_id", "session_id", "result_count"],
        optionalMetadata: ["answers", "query", "question_path", "server_validated", "recovery_primary_action"],
      },
      {
        event: "product_recommended",
        purpose: "Captures ranked product exposure.",
        requiredMetadata: ["experience_type", "experience_id", "session_id", "rank", "product_name"],
        optionalMetadata: ["score", "matched_reasons", "matched_signals", "confidence"],
      },
      {
        event: "buy_click",
        purpose: "Captures product CTA click-through intent.",
        requiredMetadata: ["experience_type", "experience_id", "session_id", "product_name"],
        optionalMetadata: ["rank", "score", "selected_option_names", "server_validated"],
      },
      {
        event: "recommendation_feedback",
        purpose: "Optional result-card quality signal from Helpful / Not right buttons.",
        requiredMetadata: ["experience_type", "experience_id", "session_id", "feedback", "product_name"],
        optionalMetadata: ["feedback_reason", "rank", "score", "matched_reasons", "matched_signals", "feedback_surface"],
      },
    ],
    checks,
    troubleshooting: [
      "If the launcher does not appear, confirm the script URL returns JavaScript and the data-id is not a placeholder.",
      "If the iframe is blank, open the public URL directly and confirm the experience is published.",
      "If analytics are missing, complete one full shopper journey and check that /api/events returns accepted:true.",
      "If recommendations are thin, run Launch Preflight and inspect discovery-gap analytics for missing terms or blocked paths.",
    ],
    summary: checks.some((item) => item.status === "blocked")
      ? "Resolve blocked launch checks before installing on a live storefront."
      : checks.some((item) => item.status === "review")
        ? "Ready for a controlled storefront test after reviewing warnings."
        : "Ready for live storefront installation.",
  };
}

export function formatLaunchContract(contract: LaunchContract) {
  return [
    `# ${contract.title}`,
    "",
    `Public URL: ${contract.publicUrl}`,
    `Summary: ${contract.summary}`,
    "",
    "## Runtime endpoints",
    ...contract.apiEndpoints.map((endpoint) => `- ${endpoint}`),
    "",
    "## Widget data attributes",
    ...contract.dataAttributes.map((item) => `- ${item.name}="${item.value}" — ${item.purpose}`),
    "",
    "## Analytics contract",
    ...contract.events.map((item) => `- ${item.event}: ${item.purpose} Required: ${item.requiredMetadata.join(", ")}. Optional: ${item.optionalMetadata.join(", ")}.`),
    "",
    "## Launch checks",
    ...contract.checks.map((item) => `- ${item.status.toUpperCase()} [${item.owner}] ${item.label}: ${item.detail}`),
    "",
    "## Troubleshooting",
    ...contract.troubleshooting.map((item) => `- ${item}`),
  ].join("\n");
}
