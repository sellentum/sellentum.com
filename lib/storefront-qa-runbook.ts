import type { LaunchContract } from "@/lib/launch-contract";

export type StorefrontQaStep = {
  id: string;
  title: string;
  owner: "merchant" | "developer" | "findly";
  expectedOutcome: string;
  checks: string[];
};

export type StorefrontQaRunbook = {
  title: string;
  status: "ready" | "review" | "blocked";
  summary: string;
  estimatedMinutes: number;
  previewUrl: string;
  scriptUrl: string;
  analyticsEvents: string[];
  steps: StorefrontQaStep[];
  acceptanceCriteria: string[];
  rollbackPlan: string[];
  embedSnippet: string;
};

function statusFromContract(contract: LaunchContract): StorefrontQaRunbook["status"] {
  if (contract.checks.some((check) => check.status === "blocked")) return "blocked";
  if (contract.checks.some((check) => check.status === "review")) return "review";
  return "ready";
}

function firstEndpoint(contract: LaunchContract, token: string) {
  return contract.apiEndpoints.find((endpoint) => endpoint.includes(token)) || token;
}

export function buildStorefrontQaRunbook({
  contract,
  embedSnippet,
  experienceLabel,
  experienceName,
}: {
  contract: LaunchContract;
  embedSnippet: string;
  experienceLabel: string;
  experienceName: string;
}): StorefrontQaRunbook {
  const status = statusFromContract(contract);
  const scriptUrl = firstEndpoint(contract, "/api/widget.js");
  const publicApiUrl = firstEndpoint(contract, "/api/public/");
  const analyticsUrl = firstEndpoint(contract, "/api/events");
  const analyticsEvents = contract.events.map((event) => event.event);
  const blockedChecks = contract.checks.filter((check) => check.status === "blocked");
  const reviewChecks = contract.checks.filter((check) => check.status === "review");

  return {
    title: `${experienceLabel} storefront QA runbook`,
    status,
    summary: blockedChecks.length
      ? `Do not launch yet. ${blockedChecks.length} blocker${blockedChecks.length === 1 ? "" : "s"} must be fixed before storefront traffic.`
      : reviewChecks.length
        ? `Ready for a controlled QA pass after reviewing ${reviewChecks.length} warning${reviewChecks.length === 1 ? "" : "s"}.`
        : "Ready for storefront QA and launch.",
    estimatedMinutes: status === "blocked" ? 20 : 15,
    previewUrl: contract.publicUrl,
    scriptUrl,
    analyticsEvents,
    embedSnippet,
    steps: [
      {
        id: "preview-runtime",
        title: "Open the public preview",
        owner: "merchant",
        expectedOutcome: `${experienceName || experienceLabel} loads with the correct brand copy and no placeholder state.`,
        checks: [
          `Open ${contract.publicUrl}.`,
          `Confirm ${publicApiUrl} returns published experience data through the app, not browser-supplied products.`,
          "Confirm product cards, buttons and explanations use real catalog data.",
        ],
      },
      {
        id: "install-snippet",
        title: "Install the widget snippet on a staging storefront",
        owner: "developer",
        expectedOutcome: "The launcher or inline frame appears once and inherits the merchant brand settings.",
        checks: [
          "Paste the snippet before the closing </body> tag or into the test page section.",
          `Confirm ${scriptUrl} returns JavaScript with a 200 response.`,
          "Check the widget data attributes against the launch contract, especially data-experience and data-id.",
        ],
      },
      {
        id: "shopper-journey",
        title: "Complete one shopper journey",
        owner: "merchant",
        expectedOutcome: "A shopper can start the experience, complete it and see 1–3 deterministic recommendations.",
        checks: [
          "Start the widget from the launcher or inline frame.",
          "Answer enough questions or provide a natural-language query to reach products.",
          "Confirm every recommendation has an image/title, price, explanation and Buy Now CTA.",
        ],
      },
      {
        id: "analytics-loop",
        title: "Verify analytics events",
        owner: "merchant",
        expectedOutcome: `${analyticsEvents.join(", ")} events are accepted and visible in the dashboard.`,
        checks: [
          "Complete a full journey and click at least one Buy Now button.",
          `Confirm ${analyticsUrl} accepts widget telemetry with accepted:true.`,
          "Open Analytics and confirm the session appears in funnel, product demand and journey replay views.",
        ],
      },
      {
        id: "recovery-and-fallbacks",
        title: "Test failure and recovery paths",
        owner: "findly",
        expectedOutcome: "Weak paths give recovery guidance instead of blank states or AI-only product selection.",
        checks: [
          "Try a too-low budget or a missing shopper term.",
          "Confirm closest catalog options or safe refinement prompts appear.",
          "Confirm recommended products remain deterministic and within active catalog constraints.",
        ],
      },
    ],
    acceptanceCriteria: [
      "The storefront has exactly one Findly widget instance for the selected experience.",
      "The public preview URL loads without requiring merchant dashboard authentication.",
      "The selected journey returns catalog-backed recommendations or a clear deterministic recovery state.",
      "All five analytics events can be produced during a manual QA session.",
      "Buy Now opens the product URL for at least one recommended product.",
      "No browser console errors block the widget, iframe or analytics request.",
    ],
    rollbackPlan: [
      "Remove the Findly script from the storefront theme or tag manager.",
      "Revert to the previous published experience ID if one existed.",
      "Keep the dashboard experience unpublished until preflight and manual QA pass.",
      "Re-run Launch Studio after catalog, question or embed settings are changed.",
    ],
  };
}

export function formatStorefrontQaRunbook(runbook: StorefrontQaRunbook) {
  return [
    `# ${runbook.title}`,
    "",
    `Status: ${runbook.status.toUpperCase()}`,
    `Estimated QA time: ${runbook.estimatedMinutes} minutes`,
    `Summary: ${runbook.summary}`,
    `Preview URL: ${runbook.previewUrl}`,
    `Widget script: ${runbook.scriptUrl}`,
    "",
    "## Embed snippet",
    runbook.embedSnippet,
    "",
    "## Manual QA steps",
    ...runbook.steps.flatMap((step, index) => [
      `${index + 1}. ${step.title} (${step.owner})`,
      `   Expected: ${step.expectedOutcome}`,
      ...step.checks.map((check) => `   - ${check}`),
    ]),
    "",
    "## Analytics events to verify",
    ...runbook.analyticsEvents.map((event) => `- ${event}`),
    "",
    "## Acceptance criteria",
    ...runbook.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## Rollback plan",
    ...runbook.rollbackPlan.map((item) => `- ${item}`),
  ].join("\n");
}
