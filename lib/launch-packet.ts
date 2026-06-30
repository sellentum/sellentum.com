import type { Quiz, WidgetSettings } from "@/lib/types";
import type { WidgetInstallReport } from "@/lib/widget-snippet";

export type LaunchPacketInput = {
  origin: string;
  publicUrl: string;
  widgetExperience: string;
  embedSnippet: string;
  installReport: WidgetInstallReport;
  settings: WidgetSettings;
  experienceName?: string;
  experienceStatus?: string;
  stableEmbedId?: string;
  sourceLabel?: string;
  finder?: Pick<Quiz, "id" | "name" | "slug" | "published" | "questions">;
  activeProducts: number;
  enrichedPercent: number;
};

function cleanOrigin(origin: string) {
  return (origin || "https://your-sellentum-app.vercel.app").replace(/\/+$/, "");
}

function readinessLabel(report: WidgetInstallReport) {
  const blockers = report.checks.filter((check) => check.severity === "blocker").length;
  const warnings = report.checks.filter((check) => check.severity === "warning").length;
  if (blockers) return `${blockers} blocker${blockers === 1 ? "" : "s"} to resolve`;
  if (warnings) return `Ready with ${warnings} warning${warnings === 1 ? "" : "s"}`;
  return "Ready to install";
}

export function buildLaunchPacket(input: LaunchPacketInput) {
  const origin = cleanOrigin(input.origin);
  const sourceLabel = input.sourceLabel || "Finder";
  const experienceName = input.experienceName || input.finder?.name || "Unselected experience";
  const experienceStatus = input.experienceStatus || (input.finder?.published ? "Published" : input.finder ? "Draft / not yet published" : "Not selected");
  const stableEmbedId = input.stableEmbedId || input.finder?.id || "YOUR_EXPERIENCE_ID";
  const checks = input.installReport.checks.map((check) => {
    const icon = check.severity === "pass" ? "PASS" : check.severity === "warning" ? "WARN" : "BLOCK";
    return `- ${icon}: ${check.label} — ${check.detail}`;
  }).join("\n");

  return [
    "Sellentum storefront launch handoff",
    "===================================",
    "",
    `Brand: ${input.settings.brand_name || "Your brand"}`,
    `Experience: ${input.widgetExperience}`,
    `${sourceLabel}: ${experienceName}`,
    `${sourceLabel} status: ${experienceStatus}`,
    `Stable embed ID: ${stableEmbedId}`,
    `Preview URL: ${input.publicUrl}`,
    `Widget script origin: ${origin}/api/widget.js`,
    `Install readiness: ${readinessLabel(input.installReport)}`,
    "",
    "Catalog snapshot",
    "----------------",
    `Active products: ${input.activeProducts}`,
    `Discovery enrichment: ${input.enrichedPercent}%`,
    `Finder questions: ${input.finder?.questions.length || 0}`,
    "",
    "Widget settings",
    "---------------",
    `Launcher button: ${input.settings.button_text || "Find my match"}`,
    `Primary colour: ${input.settings.primary_color}`,
    `Launcher position: ${input.settings.launcher_position}`,
    `Widget title: ${input.settings.widget_title}`,
    `Welcome message: ${input.settings.welcome_message}`,
    "",
    "Embed snippet",
    "-------------",
    input.embedSnippet,
    "",
    "Install checks",
    "--------------",
    checks,
    "",
    "Analytics events tracked",
    "------------------------",
    "- widget_view — widget script/frame loaded",
    "- quiz_start — shopper started the guided experience",
    "- quiz_complete — shopper reached recommendations",
    "- product_recommended — product appeared in the recommendation set",
    "- buy_click — shopper clicked a product CTA",
    "",
    "Storefront install notes",
    "------------------------",
    "1. Paste the script once before the storefront closing </body> tag.",
    "2. Keep the stable embed ID in the snippet and preview URL; slugs are workspace-local labels only.",
    "3. Run Sellentum Preflight after deployment and confirm widget_view, quiz_start and buy_click events appear in Analytics.",
  ].join("\n");
}
