import type { WidgetSettings } from "@/lib/types";

export const DEFAULT_WORKSPACE_BRAND = "Your brand";

export function createDefaultWorkspaceSettings(userId: string): WidgetSettings {
  return {
    user_id: userId,
    brand_name: DEFAULT_WORKSPACE_BRAND,
    primary_color: "#22352a",
    button_text: "Find my match",
    widget_title: "Your personal product guide",
    welcome_message: "Answer a few questions and we’ll find your best match.",
    launcher_position: "bottom-right",
  };
}

export function isWorkspaceOnboarded(settings: WidgetSettings) {
  const brandName = settings.brand_name.trim();
  return Boolean(brandName && brandName.toLowerCase() !== DEFAULT_WORKSPACE_BRAND.toLowerCase());
}
