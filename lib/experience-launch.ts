import type { Configurator, Quiz, WidgetSettings } from "@/lib/types";
import { buildWidgetInstallReport, buildWidgetSnippet, widgetExperienceLabel, widgetPathForExperience, type WidgetEmbedExperience, type WidgetEmbedMode } from "@/lib/widget-snippet";

export type LaunchExperienceCard = {
  experience: WidgetEmbedExperience;
  label: string;
  purpose: string;
  mode: WidgetEmbedMode;
  id?: string;
  slug?: string;
  name?: string;
  status: "ready" | "draft" | "missing";
  statusLabel: string;
  publicUrl: string;
  targetPath: string;
  launcherLabel: string;
  snippet: string;
  installReport: ReturnType<typeof buildWidgetInstallReport>;
  source: "finder" | "configurator";
  sourceId?: string;
};

export type LaunchExperienceInput = {
  origin: string;
  settings: WidgetSettings;
  finders: Quiz[];
  configurators: Configurator[];
  mode?: WidgetEmbedMode;
  preferredFinderId?: string;
  preferredConfiguratorId?: string;
};

const experiencePurpose: Record<WidgetEmbedExperience, string> = {
  finder: "Step-by-step guided selling quiz for shoppers who want help choosing.",
  assistant: "Conversational advisor that accepts natural-language shopper needs.",
  search: "Semantic search box for shoppers who already know roughly what they want.",
  configurator: "Visual bundle builder with option compatibility and live pricing.",
};

function cleanOrigin(origin: string) {
  return (origin || "https://your-sellentum-app.vercel.app").replace(/\/+$/, "");
}

function preferredPublishedFinder(finders: Quiz[], preferredId?: string) {
  return finders.find((finder) => finder.id === preferredId && finder.published)
    || finders.find((finder) => finder.published)
    || finders.find((finder) => finder.id === preferredId)
    || finders[0];
}

function preferredPublishedConfigurator(configurators: Configurator[], preferredId?: string) {
  return configurators.find((configurator) => configurator.id === preferredId && configurator.published)
    || configurators.find((configurator) => configurator.published)
    || configurators.find((configurator) => configurator.id === preferredId)
    || configurators[0];
}

function launcherLabel(experience: WidgetEmbedExperience, settings: WidgetSettings) {
  if (experience === "assistant") return "Ask an advisor";
  if (experience === "search") return "Search products";
  if (experience === "configurator") return "Build my kit";
  return settings.button_text || "Find my match";
}

function statusForExperience(experience: WidgetEmbedExperience, source?: Pick<Quiz | Configurator, "published">) {
  if (!source) return { status: "missing" as const, label: experience === "configurator" ? "No configurator yet" : "No published finder context" };
  if (!source.published) return { status: "draft" as const, label: "Draft selected" };
  return { status: "ready" as const, label: "Ready to embed" };
}

function buildCard(input: LaunchExperienceInput, experience: WidgetEmbedExperience): LaunchExperienceCard {
  const origin = cleanOrigin(input.origin);
  const mode = input.mode || "modal";
  const position = input.settings.launcher_position === "bottom-left" ? "left" : "right";
  const source = experience === "configurator"
    ? preferredPublishedConfigurator(input.configurators, input.preferredConfiguratorId)
    : preferredPublishedFinder(input.finders, input.preferredFinderId);
  const status = statusForExperience(experience, source);
  const path = widgetPathForExperience(experience);
  const id = source?.id;
  const slug = source?.slug;
  const urlId = id || (experience === "configurator" ? "YOUR_CONFIGURATOR_ID" : "YOUR_FINDER_ID");
  const label = launcherLabel(experience, input.settings);
  const snippet = buildWidgetSnippet({
    origin,
    experience,
    mode,
    id,
    color: input.settings.primary_color,
    label,
    position,
    medium: "embed",
    campaign: "sellentum-launch",
    placement: `${experience}-launcher`,
  });
  const installReport = buildWidgetInstallReport({
    origin,
    experience,
    mode,
    id,
    color: input.settings.primary_color,
    label,
    position,
    medium: "embed",
    campaign: "sellentum-launch",
    placement: `${experience}-launcher`,
  });

  return {
    experience,
    label: widgetExperienceLabel(experience),
    purpose: experiencePurpose[experience],
    mode,
    id,
    slug,
    name: source?.name,
    status: status.status,
    statusLabel: status.label,
    publicUrl: `${origin}/${path}/${encodeURIComponent(urlId)}`,
    targetPath: installReport.targetPath,
    launcherLabel: label,
    snippet,
    installReport,
    source: experience === "configurator" ? "configurator" : "finder",
    sourceId: id,
  };
}

export function buildLaunchExperienceCards(input: LaunchExperienceInput): LaunchExperienceCard[] {
  return (["finder", "assistant", "search", "configurator"] as WidgetEmbedExperience[]).map((experience) => buildCard(input, experience));
}
