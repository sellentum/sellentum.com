export type WidgetEmbedExperience = "finder" | "assistant" | "search" | "configurator";
export type WidgetEmbedMode = "modal" | "inline";
export type WidgetLauncherPosition = "left" | "right";

export type WidgetSnippetConfig = {
  origin: string;
  experience: WidgetEmbedExperience;
  mode: WidgetEmbedMode;
  id?: string;
  color: string;
  label: string;
  position: WidgetLauncherPosition;
  height?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  placement?: string;
  content?: string;
  term?: string;
};

export type WidgetInstallCheck = {
  id: string;
  label: string;
  detail: string;
  severity: "pass" | "warning" | "blocker";
};

export type WidgetInstallReport = {
  canInstall: boolean;
  targetPath: string;
  checks: WidgetInstallCheck[];
};

const experiences: WidgetEmbedExperience[] = ["finder", "assistant", "search", "configurator"];
const modes: WidgetEmbedMode[] = ["modal", "inline"];

export function widgetPathForExperience(experience: WidgetEmbedExperience) {
  return experience === "assistant" ? "assistant" : experience === "configurator" ? "configurator" : experience === "search" ? "search" : "finder";
}

export function widgetExperienceLabel(experience: WidgetEmbedExperience) {
  if (experience === "assistant") return "Conversational advisor";
  if (experience === "search") return "Semantic search";
  if (experience === "configurator") return "Visual configurator";
  return "Guided finder";
}

export function widgetPlaceholderForExperience(experience: WidgetEmbedExperience) {
  if (experience === "configurator") return "YOUR_CONFIGURATOR_ID";
  if (experience === "search") return "YOUR_PUBLISHED_FINDER_ID";
  return "YOUR_FINDER_ID";
}

function cleanOrigin(origin: string) {
  return (origin || "https://your-sellentum-app.vercel.app").replace(/\/+$/, "");
}

function check(id: string, label: string, detail: string, severity: WidgetInstallCheck["severity"]): WidgetInstallCheck {
  return { id, label, detail, severity };
}

function cleanAttribute(value?: string) {
  return (value || "").trim().replace(/"/g, "&quot;").slice(0, 160);
}

function optionalAttribute(name: string, value?: string) {
  const cleaned = cleanAttribute(value);
  return cleaned ? `\n  ${name}="${cleaned}"` : "";
}

export function buildWidgetSnippet(config: WidgetSnippetConfig) {
  const origin = cleanOrigin(config.origin);
  const id = config.id || widgetPlaceholderForExperience(config.experience);
  const height = config.height || "780px";
  return `<script
  src="${origin}/api/widget.js"
  data-experience="${config.experience}"
  data-mode="${config.mode}"
  data-id="${id}"
  data-color="${config.color}"
  data-label="${config.label}"
  data-position="${config.position}"
  data-height="${height}"
  data-medium="${cleanAttribute(config.medium || "embed")}"${optionalAttribute("data-source", config.source)}${optionalAttribute("data-campaign", config.campaign)}${optionalAttribute("data-placement", config.placement)}${optionalAttribute("data-content", config.content)}${optionalAttribute("data-term", config.term)}
  async
></script>`;
}

export function buildWidgetInstallReport(config: WidgetSnippetConfig): WidgetInstallReport {
  const origin = cleanOrigin(config.origin);
  const path = widgetPathForExperience(config.experience);
  const placeholder = widgetPlaceholderForExperience(config.experience);
  const targetPath = `/${path}/${encodeURIComponent(config.id || placeholder)}`;
  const hasRealId = Boolean(config.id && config.id !== placeholder && !config.id.startsWith("YOUR_"));
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const usesHttps = origin.startsWith("https://");
  const checks: WidgetInstallCheck[] = [
    experiences.includes(config.experience)
      ? check("experience", "Experience type", `${widgetExperienceLabel(config.experience)} will load from ${targetPath}.`, "pass")
      : check("experience", "Experience type", "Choose finder, advisor, search or configurator.", "blocker"),
    hasRealId
      ? check("id", "Published experience ID", `Using ${config.id}.`, "pass")
      : check("id", "Published experience ID", `Replace ${placeholder} by publishing/selecting an experience before installing.`, "blocker"),
    modes.includes(config.mode)
      ? check("mode", "Embed mode", config.mode === "modal" ? "Modal mode lazy-loads the iframe after shopper intent." : "Inline mode embeds the iframe directly in the page.", "pass")
      : check("mode", "Embed mode", "Use modal or inline.", "blocker"),
    usesHttps || isLocalhost
      ? check("origin", "Script origin", `${origin}/api/widget.js is a valid widget script origin.`, "pass")
      : check("origin", "Script origin", "Use your HTTPS production URL before installing on a live storefront.", "warning"),
    /^#[0-9a-f]{6}$/i.test(config.color)
      ? check("brand", "Brand colour", `${config.color} will theme the launcher and frame chrome.`, "pass")
      : check("brand", "Brand colour", "Use a 6-digit hex colour such as #22352a.", "warning"),
    config.label.trim()
      ? check("label", "Launcher label", `Button label: “${config.label.trim()}”.`, "pass")
      : check("label", "Launcher label", "Add clear launcher copy before installing.", "warning"),
    config.campaign || config.placement || config.source
      ? check("attribution", "Analytics attribution", `Traffic will be labelled${config.campaign ? ` as ${config.campaign}` : ""}${config.placement ? ` on ${config.placement}` : ""}.`, "pass")
      : check("attribution", "Analytics attribution", "No campaign labels set; Sellentum will infer page URL/source from the storefront.", "warning"),
  ];

  return { canInstall: checks.every((item) => item.severity !== "blocker"), targetPath, checks };
}
