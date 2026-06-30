import { buildAnalyticsLaunchProofReport } from "@/lib/analytics-proof";
import { countAnalyticsEvents } from "@/lib/analytics";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import type { AnalyticsEvent, Product, Quiz, WidgetSettings } from "@/lib/types";
import { isWorkspaceOnboarded } from "@/lib/workspace-onboarding";

export type FirstLiveProofStatus = "needs-proof" | "in-progress" | "proven";
export type FirstLiveProofLaneStatus = "done" | "needs-proof" | "pending";
export type FirstLiveProofLaneOwner = "Founder" | "Founder + Sellentum" | "Sellentum";

export type FirstLiveProofLane = {
  id: string;
  title: string;
  detail: string;
  acceptance: string;
  evidence: string;
  owner: FirstLiveProofLaneOwner;
  status: FirstLiveProofLaneStatus;
  href: string;
  cta: string;
};

export type FirstLiveMerchantProof = {
  status: FirstLiveProofStatus;
  headline: string;
  summary: string;
  lanes: FirstLiveProofLane[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  nextLane: FirstLiveProofLane;
  founderTasks: FirstLiveProofLane[];
  packet: string;
};

export const firstLiveProofDefinition = [
  "Production auth is confirmed on https://www.sellentum.com, including signup, verification email, login and password reset.",
  "The catalog contains real active products with usable names, prices, images, categories, tags/features and product URLs.",
  "At least one published product finder passes readiness checks and uses deterministic rules for product selection.",
  "The widget snippet is installed on a real or staging storefront page and records a storefront widget_view event.",
  "One uninterrupted shopper QA session records widget_view, quiz_start, quiz_complete, product_recommended and buy_click.",
  "The launch proof packet is copied into the project record before calling the MVP proven.",
];

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function buildPacket(report: Omit<FirstLiveMerchantProof, "packet">) {
  return [
    "Sellentum first live merchant proof",
    "===================================",
    "",
    `Status: ${report.status}`,
    `Progress: ${report.completedCount}/${report.totalCount} proof lanes (${report.progressPercent}%)`,
    `Next lane: ${report.nextLane.title}`,
    "",
    "What counts as proven:",
    ...firstLiveProofDefinition.map((item) => `- ${item}`),
    "",
    "Proof lanes:",
    ...report.lanes.map((lane, index) => [
      `${index + 1}. [${lane.status.toUpperCase()}] ${lane.title}`,
      `   Owner: ${lane.owner}`,
      `   Acceptance: ${lane.acceptance}`,
      `   Evidence: ${lane.evidence}`,
      `   Where: ${lane.href}`,
    ].join("\n")),
  ].join("\n");
}

export function buildFirstLiveMerchantProof({
  settings,
  products,
  quizzes,
  events,
}: {
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
}): FirstLiveMerchantProof {
  const activeProducts = products.filter((product) => product.active);
  const readyFinders = quizzes.filter((quiz) => quiz.published && analyzeQuizReadiness(quiz, products).canPublish);
  const analyticsProof = buildAnalyticsLaunchProofReport(events);
  const widgetViews = countAnalyticsEvents(events, "widget_view");
  const buyClicks = countAnalyticsEvents(events, "buy_click");
  const brandReady = isWorkspaceOnboarded(settings) && Boolean(settings.widget_title.trim()) && Boolean(settings.button_text.trim());

  const lanes: FirstLiveProofLane[] = [
    {
      id: "platform",
      title: "Platform and backend are live",
      detail: "Vercel, Supabase, production env vars, core routes, schema and RLS checks have a passing verification path.",
      acceptance: "Production verification has 0 failures and Supabase schema/RLS verification passes locally.",
      evidence: "Latest verified baseline: schema/RLS passed 120 checks; production verifier passed 35 checks with 0 failures.",
      owner: "Sellentum",
      status: "done",
      href: "/dashboard/production",
      cta: "Review production proof",
    },
    {
      id: "auth",
      title: "Production account flow is manually confirmed",
      detail: "A real inbox completes signup, email verification, login, forgot password and reset password on the live domain.",
      acceptance: "Every email link returns to https://www.sellentum.com, not localhost or a Supabase-branded dead end.",
      evidence: "Manual confirmation is still required because this proof lives in your email inbox.",
      owner: "Founder",
      status: "needs-proof",
      href: "/dashboard/production",
      cta: "Run auth proof",
    },
    {
      id: "brand",
      title: "Workspace branding is real",
      detail: "The merchant-facing widget uses the real brand name, button copy, welcome message and primary color.",
      acceptance: "The storefront widget copy is suitable for a real shopper without demo wording.",
      evidence: brandReady ? `${settings.brand_name} has widget title and button copy configured.` : "Brand name, widget title or button copy still needs review.",
      owner: "Founder",
      status: brandReady ? "done" : "pending",
      href: "/dashboard/settings",
      cta: "Review brand",
    },
    {
      id: "catalog",
      title: "Real catalog is ready",
      detail: "The product catalog has enough active product data for deterministic matching and trustworthy recommendation explanations.",
      acceptance: "At least two active products have price, image, category, tags/features and working product URLs.",
      evidence: `${plural(activeProducts.length, "active product")} available.`,
      owner: "Founder + Sellentum",
      status: activeProducts.length >= 2 ? "done" : "pending",
      href: "/dashboard/products",
      cta: "Prepare catalog",
    },
    {
      id: "finder",
      title: "One real finder is published",
      detail: "A buyer-friendly guided question flow exists and passes readiness against the real catalog.",
      acceptance: "At least one published finder can select products with deterministic rules, not AI-only selection.",
      evidence: readyFinders.length ? `${plural(readyFinders.length, "ready finder")} published.` : "No published ready finder has been proven yet.",
      owner: "Founder + Sellentum",
      status: readyFinders.length ? "done" : "pending",
      href: "/dashboard/quizzes",
      cta: "Publish finder",
    },
    {
      id: "widget",
      title: "Widget is installed on a storefront",
      detail: "The copied widget snippet loads from a real or staging storefront page and records storefront attribution.",
      acceptance: "A storefront page produces at least one widget_view event with source/page attribution.",
      evidence: widgetViews ? `${plural(widgetViews, "widget view")} captured.` : "No storefront widget view has been captured yet.",
      owner: "Founder + Sellentum",
      status: widgetViews ? "done" : "pending",
      href: "/dashboard/launch",
      cta: "Install widget",
    },
    {
      id: "analytics",
      title: "One shopper journey is fully proven",
      detail: "The first QA session reaches recommendations and proves purchase intent tracking.",
      acceptance: "One uninterrupted session records widget_view, quiz_start, quiz_complete, product_recommended and buy_click.",
      evidence: analyticsProof.status === "proven" && buyClicks
        ? `${analyticsProof.summary.completeSessions} complete QA session${analyticsProof.summary.completeSessions === 1 ? "" : "s"} with ${plural(buyClicks, "buy click")}.`
        : analyticsProof.nextAction,
      owner: "Founder + Sellentum",
      status: analyticsProof.status === "proven" && buyClicks ? "done" : "pending",
      href: "/dashboard/analytics",
      cta: "Prove analytics",
    },
  ];

  const completedCount = lanes.filter((lane) => lane.status === "done").length;
  const totalCount = lanes.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const nextLane = lanes.find((lane) => lane.status === "needs-proof") || lanes.find((lane) => lane.status === "pending") || lanes[lanes.length - 1];
  const founderTasks = lanes.filter((lane) => lane.owner.includes("Founder") && lane.status !== "done");
  const status: FirstLiveProofStatus = completedCount === totalCount ? "proven" : lanes.some((lane) => lane.status === "needs-proof") ? "needs-proof" : "in-progress";
  const headline = status === "proven" ? "First live merchant proof is complete." : `Next proof: ${nextLane.title.toLowerCase()}.`;
  const summary = status === "proven"
    ? "Sellentum has the minimum production evidence needed to call the first merchant workflow proven."
    : "Use this as the single source of truth before calling the MVP production-proven. It ties account, catalog, finder, widget and analytics evidence together.";
  const reportWithoutPacket = {
    status,
    headline,
    summary,
    lanes,
    completedCount,
    totalCount,
    progressPercent,
    nextLane,
    founderTasks,
  };

  return {
    ...reportWithoutPacket,
    packet: buildPacket(reportWithoutPacket),
  };
}
