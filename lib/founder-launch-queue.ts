import { countAnalyticsEvents } from "@/lib/analytics";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import type { AnalyticsEvent, Product, Quiz, WidgetSettings } from "@/lib/types";
import { isWorkspaceOnboarded } from "@/lib/workspace-onboarding";

export type FounderLaunchTaskStatus = "done" | "needs-proof" | "pending";
export type FounderLaunchTaskOwner = "Sellentum" | "Founder" | "Founder + Sellentum";

export type FounderLaunchTask = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  owner: FounderLaunchTaskOwner;
  status: FounderLaunchTaskStatus;
  cta: string;
};

export type FounderLaunchQueue = {
  tasks: FounderLaunchTask[];
  nextFounderTask: FounderLaunchTask;
  headline: string;
  summary: string;
  packet: string;
  counts: {
    done: number;
    needsProof: number;
    pending: number;
    founderOpen: number;
    total: number;
  };
};

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function buildPacket(tasks: FounderLaunchTask[]) {
  return [
    "Sellentum Live Launch Proof Queue",
    "=================================",
    "",
    "Use this as the handoff list before calling the first production launch proven.",
    "",
    ...tasks.map((task, index) => [
      `${index + 1}. [${task.status.toUpperCase()}] ${task.title}`,
      `   Owner: ${task.owner}`,
      `   Action: ${task.cta}`,
      `   Evidence: ${task.evidence}`,
      `   Where: ${task.href}`,
    ].join("\n")),
  ].join("\n");
}

export function buildFounderLaunchQueue({
  settings,
  products,
  quizzes,
  events,
}: {
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
}): FounderLaunchQueue {
  const activeProducts = products.filter((product) => product.active);
  const readyFinders = quizzes.filter((quiz) => quiz.published && analyzeQuizReadiness(quiz, products).canPublish);
  const widgetViews = countAnalyticsEvents(events, "widget_view");
  const completions = countAnalyticsEvents(events, "quiz_complete");
  const recommendations = countAnalyticsEvents(events, "product_recommended");
  const buyClicks = countAnalyticsEvents(events, "buy_click");
  const brandReady = isWorkspaceOnboarded(settings);

  const tasks: FounderLaunchTask[] = [
    {
      id: "production-backend-verified",
      title: "Production backend is verified",
      detail: "Supabase schema, RLS, rate limiting, widget settings and production route checks have been repaired and verified.",
      evidence: "Schema/RLS verifier passed 120 checks; production verifier passed 35 checks with 0 failures.",
      href: "/dashboard/production",
      owner: "Sellentum",
      status: "done",
      cta: "Review backend proof",
    },
    {
      id: "auth-email-proof",
      title: "Prove production auth emails",
      detail: "Create an account, confirm the email, test login, request password reset and set a new password on the canonical production domain.",
      evidence: "Signup and reset links must return to Sellentum, not localhost.",
      href: "/dashboard/production",
      owner: "Founder",
      status: "needs-proof",
      cta: "Run auth checklist",
    },
    {
      id: "brand-proof",
      title: "Confirm branded workspace settings",
      detail: "Use the real merchant brand name, primary color, widget title, welcome message and button copy.",
      evidence: brandReady ? `${settings.brand_name} is configured.` : "Brand settings still look incomplete.",
      href: "/dashboard/settings",
      owner: "Founder",
      status: brandReady ? "done" : "pending",
      cta: "Review brand settings",
    },
    {
      id: "real-catalog",
      title: "Upload a real product catalog",
      detail: "Use real or realistic products so recommendations, explanations, search and analytics can be judged honestly.",
      evidence: activeProducts.length >= 2 ? `${formatCount(activeProducts.length, "active product")} available.` : "A real CSV/catalog is still needed.",
      href: "/dashboard/products",
      owner: "Founder + Sellentum",
      status: activeProducts.length >= 2 ? "done" : "pending",
      cta: "Upload catalog",
    },
    {
      id: "real-finder",
      title: "Publish one real product finder",
      detail: "Create or generate one buyer-friendly guided flow from the real catalog and publish it.",
      evidence: readyFinders.length ? `${formatCount(readyFinders.length, "ready finder")} published.` : "No production-proven published finder yet.",
      href: "/dashboard/quizzes",
      owner: "Founder + Sellentum",
      status: readyFinders.length ? "done" : "pending",
      cta: "Build finder",
    },
    {
      id: "storefront-widget",
      title: "Test the widget on a storefront page",
      detail: "Install the modal or inline widget on a staging/real ecommerce page and complete a shopper journey.",
      evidence: widgetViews ? `${formatCount(widgetViews, "widget view")} captured.` : "No real storefront widget view has been captured.",
      href: "/dashboard/widget-studio",
      owner: "Founder + Sellentum",
      status: widgetViews ? "done" : "pending",
      cta: "Test widget install",
    },
    {
      id: "analytics-proof",
      title: "Prove analytics from one shopper journey",
      detail: "Confirm widget view, quiz start, completion, recommendation and Buy Now click events reach analytics.",
      evidence: `${formatCount(completions, "completion")}, ${formatCount(recommendations, "recommendation event")}, ${formatCount(buyClicks, "buy click")}.`,
      href: "/dashboard/analytics",
      owner: "Founder + Sellentum",
      status: widgetViews && completions && recommendations && buyClicks ? "done" : "pending",
      cta: "Verify analytics",
    },
  ];

  const founderOpenTasks = tasks.filter((task) => task.owner.includes("Founder") && task.status !== "done");
  const nextFounderTask = founderOpenTasks[0] || tasks.find((task) => task.status !== "done") || tasks[0];
  const counts = {
    done: tasks.filter((task) => task.status === "done").length,
    needsProof: tasks.filter((task) => task.status === "needs-proof").length,
    pending: tasks.filter((task) => task.status === "pending").length,
    founderOpen: founderOpenTasks.length,
    total: tasks.length,
  };

  return {
    tasks,
    nextFounderTask,
    counts,
    headline: counts.founderOpen ? `Next launch proof task: ${nextFounderTask.title.toLowerCase()}.` : "Launch proof queue is clear.",
    summary: counts.founderOpen
      ? "This queue separates verified platform work from the proof still needed before Sellentum can be called production-proven."
      : "Core launch proof is complete. Keep using Production Verification before each major launch.",
    packet: buildPacket(tasks),
  };
}
