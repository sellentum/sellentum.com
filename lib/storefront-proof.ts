export type StorefrontProofEvent = {
  event: "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click";
  proof: string;
};

export type StorefrontProofStep = {
  id: string;
  label: string;
  owner: "Founder" | "Codex" | "Founder + Codex";
  detail: string;
  evidence: string;
};

export const storefrontProofEvents: StorefrontProofEvent[] = [
  { event: "widget_view", proof: "Widget launcher or inline iframe loaded on the storefront page." },
  { event: "quiz_start", proof: "Shopper opened the experience and answered/started the first step." },
  { event: "quiz_complete", proof: "Shopper reached the result/review state." },
  { event: "product_recommended", proof: "At least one product recommendation was emitted." },
  { event: "buy_click", proof: "Shopper clicked Buy Now and the product URL opened." },
];

export const storefrontProofSteps: StorefrontProofStep[] = [
  {
    id: "staging-page",
    label: "Choose a staging or real product page",
    owner: "Founder",
    detail: "Use a public HTTPS storefront page that Sellentum can scan from the server.",
    evidence: "A URL such as https://store.example.com/products/example-product.",
  },
  {
    id: "install-snippet",
    label: "Install the Widget Studio snippet",
    owner: "Founder + Codex",
    detail: "Paste the modal or inline script from Widget Studio and preserve data-experience, data-mode, data-id and attribution labels.",
    evidence: "Storefront HTML contains /api/widget.js with a published experience ID.",
  },
  {
    id: "scan-page",
    label: "Run Storefront Install Scanner",
    owner: "Codex",
    detail: "Scan the page and confirm script, ID, mode, attribution, HTTPS and origin checks pass.",
    evidence: "Install scan packet shows installed or no critical blockers.",
  },
  {
    id: "complete-journey",
    label: "Complete one shopper journey",
    owner: "Founder + Codex",
    detail: "Open the widget as a shopper, answer the questions and reach recommendations.",
    evidence: "The result cards appear with product image, title, price, explanation and Buy Now.",
  },
  {
    id: "prove-analytics",
    label: "Verify analytics events",
    owner: "Codex",
    detail: "Confirm the five launch-critical events are visible with source, campaign, placement and page URL metadata.",
    evidence: storefrontProofEvents.map((event) => event.event).join(", "),
  },
];

export function buildStorefrontProofPacket({
  storefrontUrl,
  appOrigin,
  experienceId,
}: {
  storefrontUrl?: string;
  appOrigin?: string;
  experienceId?: string;
}) {
  return [
    "Sellentum storefront proof packet",
    "================================",
    "",
    `Storefront URL: ${storefrontUrl?.trim() || "[paste staging/real storefront URL]"}`,
    `Sellentum app origin: ${appOrigin?.trim() || "[paste Sellentum app URL]"}`,
    `Published experience ID: ${experienceId?.trim() || "[paste finder/configurator ID]"}`,
    "",
    "Manual proof steps",
    ...storefrontProofSteps.map((step, index) => `${index + 1}. ${step.label} (${step.owner}) — ${step.evidence}`),
    "",
    "Required analytics events",
    ...storefrontProofEvents.map((event) => `- ${event.event}: ${event.proof}`),
    "",
    "Done when",
    "- Storefront scanner has no critical blockers.",
    "- A shopper can complete one full widget journey.",
    "- Recommendations render correctly.",
    "- Buy Now opens the product URL.",
    "- Analytics contains the five launch-critical events with attribution metadata.",
  ].join("\n");
}
