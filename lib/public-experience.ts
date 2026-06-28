import type { WidgetSettings } from "@/lib/types";
import { normalizeAllowedDomains } from "./domain-allowlist";

export type PublicExperienceKind = "finder" | "assistant" | "search" | "configurator";

export type PublicExperienceCopy = {
  brandName: string;
  accentColor: string;
  ctaLabel: string;
  widgetTitle: string;
  welcomeMessage: string;
  eyebrow: string;
  title: string;
  description: string;
  trustLabel: string;
  assistantGreeting: string;
  inputPlaceholder: string;
};

const fallbackSettings: WidgetSettings = {
  user_id: "public",
  brand_name: "Your brand",
  primary_color: "#22352a",
  button_text: "Find my match",
  widget_title: "Your personal product guide",
  welcome_message: "Answer a few questions and we’ll find your best match.",
  launcher_position: "bottom-right",
  allowed_domains: [],
};

const kindDefaults: Record<PublicExperienceKind, Pick<PublicExperienceCopy, "eyebrow" | "title" | "description" | "trustLabel" | "assistantGreeting" | "inputPlaceholder">> = {
  finder: {
    eyebrow: "Guided product finder",
    title: "Let’s find your perfect match",
    description: "Answer a few quick questions and we’ll narrow the catalog to the products that fit.",
    trustLabel: "Recommendations you can trust",
    assistantGreeting: "Answer a few quick questions and I’ll help narrow down the best products for you.",
    inputPlaceholder: "Choose an answer to continue…",
  },
  assistant: {
    eyebrow: "Conversational discovery",
    title: "What can I help you find?",
    description: "Describe your goal, must-have features, or budget. The advisor ranks only real products from this catalog.",
    trustLabel: "Catalog-grounded",
    assistantGreeting: "Tell me what you’re looking for in your own words. A use case, must-have feature, and budget are a great place to start.",
    inputPlaceholder: "Describe the product you need…",
  },
  search: {
    eyebrow: "Product search",
    title: "Tell us what you need.",
    description: "Search by use case, feature, category, or budget. Results are ranked from active catalog products with visible matching signals.",
    trustLabel: "Deterministic catalog search",
    assistantGreeting: "Search the catalog using natural shopper language.",
    inputPlaceholder: "e.g. durable everyday option under £100",
  },
  configurator: {
    eyebrow: "Visual configurator",
    title: "Build your ideal bundle",
    description: "Choose the options that fit your needs and we’ll keep the setup compatible.",
    trustLabel: "Compatible choices only",
    assistantGreeting: "Build a compatible product bundle step by step.",
    inputPlaceholder: "Choose an option to continue…",
  },
};

function cleanText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanHexColor(value: unknown) {
  const candidate = cleanText(value, fallbackSettings.primary_color);
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallbackSettings.primary_color;
}

export function normalizeWidgetSettings(settings?: Partial<WidgetSettings> | null): WidgetSettings {
  return {
    user_id: cleanText(settings?.user_id, fallbackSettings.user_id),
    brand_name: cleanText(settings?.brand_name, fallbackSettings.brand_name),
    primary_color: cleanHexColor(settings?.primary_color),
    button_text: cleanText(settings?.button_text, fallbackSettings.button_text),
    widget_title: cleanText(settings?.widget_title, fallbackSettings.widget_title),
    welcome_message: cleanText(settings?.welcome_message, fallbackSettings.welcome_message),
    launcher_position: settings?.launcher_position === "bottom-left" ? "bottom-left" : "bottom-right",
    allowed_domains: normalizeAllowedDomains(settings?.allowed_domains),
  };
}

export function buildPublicExperienceCopy(
  kind: PublicExperienceKind,
  settingsInput?: Partial<WidgetSettings> | null,
  experience?: { title?: string | null; description?: string | null },
): PublicExperienceCopy {
  const settings = normalizeWidgetSettings(settingsInput);
  const defaults = kindDefaults[kind];
  const widgetTitle = cleanText(settings.widget_title, defaults.title);
  const welcomeMessage = cleanText(settings.welcome_message, defaults.description);
  const title = cleanText(experience?.title, widgetTitle);
  const description = cleanText(experience?.description, welcomeMessage);

  return {
    brandName: settings.brand_name,
    accentColor: settings.primary_color,
    ctaLabel: settings.button_text,
    widgetTitle,
    welcomeMessage,
    eyebrow: kind === "finder" ? widgetTitle : defaults.eyebrow,
    title,
    description,
    trustLabel: defaults.trustLabel,
    assistantGreeting: kind === "assistant" ? welcomeMessage : defaults.assistantGreeting,
    inputPlaceholder: defaults.inputPlaceholder,
  };
}
