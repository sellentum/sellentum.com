import { buildFounderLaunchQueue, type FounderLaunchTask, type FounderLaunchTaskOwner } from "@/lib/founder-launch-queue";
import { buildMerchantLaunchPlan, type MerchantLaunchStep } from "@/lib/merchant-launch-plan";
import type { AnalyticsEvent, Product, Quiz, WidgetSettings } from "@/lib/types";

export type MerchantNextActionPriority = "critical" | "high" | "medium" | "complete";

export type MerchantNextActionSupport = {
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export type MerchantNextAction = {
  id: string;
  title: string;
  detail: string;
  why: string;
  proof: string;
  href: string;
  cta: string;
  owner: FounderLaunchTaskOwner | "Sellentum";
  priority: MerchantNextActionPriority;
  stage: "production-proof" | "first-launch" | "optimization";
  packet: string;
  supportActions: MerchantNextActionSupport[];
};

function priorityForFounderTask(task: FounderLaunchTask): MerchantNextActionPriority {
  if (task.status === "needs-proof") return "high";
  return "medium";
}

function firstLaunchAction(step: MerchantLaunchStep): MerchantNextAction {
  const action: Omit<MerchantNextAction, "packet"> = {
    id: `first-launch-${step.id}`,
    title: step.title,
    detail: step.detail,
    why: "This is the simplest path to prove Sellentum with one real catalog, one real product finder and one real storefront journey before touching advanced modules.",
    proof: step.evidence,
    href: step.href,
    cta: step.cta,
    owner: "Founder + Sellentum",
    priority: "medium",
    stage: "first-launch",
    supportActions: [
      { title: "Open launch checklist", detail: "Use the guided launch workspace when you need snippets, QA and handoff packets.", href: "/dashboard/launch", cta: "Open Launch Studio" },
      { title: "Check production gates", detail: "Keep Supabase, auth, runtime and smoke-test proof visible while launching.", href: "/dashboard/production", cta: "Open Production Center" },
    ],
  };
  return { ...action, packet: buildPacket(action) };
}

function founderProofAction(task: FounderLaunchTask): MerchantNextAction {
  const action: Omit<MerchantNextAction, "packet"> = {
    id: `founder-proof-${task.id}`,
    title: task.title,
    detail: task.detail,
    why: "This founder-side proof turns shipped code into real production evidence instead of a local/demo assumption.",
    proof: task.evidence,
    href: task.href,
    cta: task.cta,
    owner: task.owner,
    priority: priorityForFounderTask(task),
    stage: "production-proof",
    supportActions: [
      { title: "Copy launch proof queue", detail: "Share the complete handoff list for production proof.", href: "/dashboard", cta: "Use dashboard queue" },
      { title: "Open production center", detail: "Review backend proof, auth checklist and production verification commands.", href: "/dashboard/production", cta: "Open Production Center" },
    ],
  };
  return { ...action, packet: buildPacket(action) };
}

function optimizationAction(): MerchantNextAction {
  const action: Omit<MerchantNextAction, "packet"> = {
    id: "optimization-loop",
    title: "Optimize the proven shopper journey",
    detail: "Use real analytics, product demand, discovery gaps and feedback to improve conversion instead of adding random features.",
    why: "Once the launch loop is proven, Sellentum should behave like a serious SaaS: measure, improve, retest and document the decision.",
    proof: "Core launch tasks are clear; continue with analytics, experiments and merchandising improvements.",
    href: "/dashboard/analytics",
    cta: "Open analytics",
    owner: "Sellentum",
    priority: "complete",
    stage: "optimization",
    supportActions: [
      { title: "Plan experiments", detail: "Turn funnel and attribution signals into controlled optimization tests.", href: "/dashboard/experiments", cta: "Open Experiments" },
      { title: "Tune merchandising", detail: "Use product demand and low-click paths to improve deterministic ranking controls.", href: "/dashboard/merchandising", cta: "Open Merchandising" },
    ],
  };
  return { ...action, packet: buildPacket(action) };
}

function buildPacket(action: Omit<MerchantNextAction, "packet">) {
  return [
    "Sellentum next best action brief",
    "================================",
    "",
    `Stage: ${action.stage}`,
    `Priority: ${action.priority}`,
    `Owner: ${action.owner}`,
    "",
    `Action: ${action.title}`,
    `Detail: ${action.detail}`,
    `Why now: ${action.why}`,
    `Proof needed: ${action.proof}`,
    `Where: ${action.href}`,
    "",
    "Support actions:",
    ...action.supportActions.map((item) => `- ${item.title}: ${item.detail} (${item.href})`),
  ].join("\n");
}

export function buildMerchantNextAction({
  settings,
  products,
  quizzes,
  events,
}: {
  settings: WidgetSettings;
  products: Product[];
  quizzes: Quiz[];
  events: AnalyticsEvent[];
}): MerchantNextAction {
  const launchPlan = buildMerchantLaunchPlan({ settings, products, quizzes, events });
  const founderQueue = buildFounderLaunchQueue({ settings, products, quizzes, events });
  const proofTask = founderQueue.tasks.find((task) => task.status === "needs-proof") || founderQueue.tasks.find((task) => task.owner.includes("Founder") && task.status !== "done");

  if (proofTask) return founderProofAction(proofTask);
  if (launchPlan.completedCount < launchPlan.totalCount) return firstLaunchAction(launchPlan.currentStep);
  return optimizationAction();
}
