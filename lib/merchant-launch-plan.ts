import { countAnalyticsEvents } from "@/lib/analytics";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import type { AnalyticsEvent, Product, Quiz, WidgetSettings } from "@/lib/types";
import { isWorkspaceOnboarded } from "@/lib/workspace-onboarding";

export type MerchantLaunchStepStatus = "done" | "current" | "locked";

export type MerchantLaunchStep = {
  id: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  status: MerchantLaunchStepStatus;
  evidence: string;
};

export type MerchantLaunchPlan = {
  steps: MerchantLaunchStep[];
  currentStep: MerchantLaunchStep;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  headline: string;
  summary: string;
};

function withStatuses(steps: Array<Omit<MerchantLaunchStep, "status"> & { done: boolean }>): MerchantLaunchStep[] {
  const firstOpenIndex = steps.findIndex((step) => !step.done);
  return steps.map(({ done, ...step }, index) => ({
    ...step,
    status: done ? "done" : index === firstOpenIndex ? "current" : "locked",
  }));
}

export function buildMerchantLaunchPlan({
  settings,
  products,
  quizzes,
  events,
}: {
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
}): MerchantLaunchPlan {
  const brandReady = isWorkspaceOnboarded(settings) && Boolean(settings.button_text.trim()) && Boolean(settings.widget_title.trim()) && /^#[0-9a-f]{6}$/i.test(settings.primary_color);
  const activeProducts = products.filter((product) => product.active);
  const catalogReady = activeProducts.length >= 2;
  const readyFinders = quizzes.filter((quiz) => quiz.published && analyzeQuizReadiness(quiz, products).canPublish);
  const finderReady = readyFinders.length > 0;
  const widgetViews = countAnalyticsEvents(events, "widget_view");
  const completions = countAnalyticsEvents(events, "quiz_complete");
  const recommendations = countAnalyticsEvents(events, "product_recommended");
  const buyClicks = countAnalyticsEvents(events, "buy_click");
  const widgetReady = widgetViews > 0;
  const productionProofReady = widgetViews > 0 && completions > 0 && recommendations > 0 && buyClicks > 0;

  const steps = withStatuses([
    {
      id: "brand",
      title: "Set up brand",
      detail: "Add store name, colors, widget title and shopper-facing button copy.",
      href: "/dashboard/settings",
      cta: "Edit brand",
      evidence: brandReady ? `${settings.brand_name} is configured.` : "Brand setup is incomplete.",
      done: brandReady,
    },
    {
      id: "catalog",
      title: "Add real products",
      detail: "Upload or create enough active products for Sellentum to compare choices.",
      href: "/dashboard/products",
      cta: "Add products",
      evidence: `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"} available.`,
      done: catalogReady,
    },
    {
      id: "finder",
      title: "Publish first finder",
      detail: "Create a guided question flow that passes catalog and recommendation readiness.",
      href: "/dashboard/quizzes",
      cta: "Build finder",
      evidence: finderReady ? `${readyFinders.length} published finder${readyFinders.length === 1 ? "" : "s"} ready.` : "No published ready finder yet.",
      done: finderReady,
    },
    {
      id: "widget",
      title: "Install widget",
      detail: "Place the embed on a storefront page and confirm the widget loads for shoppers.",
      href: "/dashboard/launch",
      cta: "Get embed",
      evidence: widgetReady ? `${widgetViews} widget view${widgetViews === 1 ? "" : "s"} captured.` : "No production widget view captured yet.",
      done: widgetReady,
    },
    {
      id: "proof",
      title: "Prove one shopper journey",
      detail: "Capture a completed guided session with recommendations and buy-click evidence.",
      href: "/dashboard/analytics",
      cta: "View analytics",
      evidence: productionProofReady
        ? `${completions} completion${completions === 1 ? "" : "s"}, ${recommendations} recommendation event${recommendations === 1 ? "" : "s"}, ${buyClicks} buy click${buyClicks === 1 ? "" : "s"}.`
        : "Waiting for a completed widget journey.",
      done: productionProofReady,
    },
  ]);

  const completedCount = steps.filter((step) => step.status === "done").length;
  const currentStep = steps.find((step) => step.status === "current") || steps[steps.length - 1];
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return {
    steps,
    currentStep,
    completedCount,
    totalCount: steps.length,
    progressPercent,
    headline: completedCount === steps.length ? "Launch loop proven." : `Next: ${currentStep.title.toLowerCase()}.`,
    summary: completedCount === steps.length
      ? "The core merchant journey has production evidence. Keep improving catalog quality, recommendations and conversion."
      : "Follow this path before touching advanced studios. It keeps setup focused on the first real product-finder launch.",
  };
}
