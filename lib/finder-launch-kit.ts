import type { Product, Quiz } from "@/lib/types";

export type FinderLaunchKitCard = {
  title: string;
  detail: string;
  evidence: string;
  status: "ready" | "needs-work";
};

export type FinderLaunchKit = {
  status: "ready" | "blocked";
  headline: string;
  summary: string;
  cards: FinderLaunchKitCard[];
  suggestedQuestions: Array<{
    title: string;
    purpose: string;
    exampleOptions: string[];
  }>;
  packet: string;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function topValues(values: string[], fallback: string[], limit = 5) {
  const counts = new Map<string, number>();
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([value]) => value);
  return unique([...ranked, ...fallback]).slice(0, limit);
}

function budgetOptions(products: Product[]) {
  const prices = products.map((product) => product.price).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  if (!prices.length) return ["Under £50", "Under £100", "Best fit over price"];
  const low = prices[Math.floor(prices.length * 0.33)] || prices[0];
  const mid = prices[Math.floor(prices.length * 0.66)] || prices.at(-1) || low;
  return unique([
    `Under £${Math.ceil(low / 10) * 10}`,
    `Under £${Math.ceil(mid / 10) * 10}`,
    "Best fit over price",
  ]);
}

function buildPacket(kit: Omit<FinderLaunchKit, "packet">) {
  return [
    "Sellentum first finder brief",
    "============================",
    "",
    `Status: ${kit.status}`,
    kit.headline,
    kit.summary,
    "",
    "Readiness",
    ...kit.cards.map((card) => `- [${card.status.toUpperCase()}] ${card.title}: ${card.evidence}`),
    "",
    "Suggested first-finder question plan",
    ...kit.suggestedQuestions.map((question, index) => [
      `${index + 1}. ${question.title}`,
      `   Purpose: ${question.purpose}`,
      `   Example answers: ${question.exampleOptions.join(" | ")}`,
    ].join("\n")),
    "",
    "First finder proof path",
    "1. Draft from real catalog signals: use catalog categories, tags, features and buyer needs before editing copy.",
    "2. Check answer coverage: every important answer should reach active products or be intentionally preference-only.",
    "3. Publish, preview, then embed: run readiness, test likely paths and use the published finder ID for the widget.",
    "",
    "Build rules",
    "- Every important answer should map to a tag, category, feature or budget rule.",
    "- Avoid using AI to choose products; use deterministic matching and let AI explain the selected products.",
    "- Publish only after answer coverage and recommendation QA show no dead ends.",
    "",
    "Done when",
    "- The finder has 2–4 clear buyer questions with shopper-friendly wording.",
    "- Each answer reaches at least one active product or is intentionally preference-only.",
    "- Preview returns 1–3 sensible recommendations.",
    "- The widget snippet can use the published finder ID.",
  ].join("\n");
}

export function buildFinderLaunchKit({ products, quizzes }: { products: Product[]; quizzes: Quiz[] }): FinderLaunchKit {
  const activeProducts = products.filter((product) => product.active);
  const categorySignals = unique(activeProducts.map((product) => product.category));
  const buyerNeedSignals = unique(activeProducts.flatMap((product) => product.buyer_needs || []));
  const featureAndTagSignals = unique(activeProducts.flatMap((product) => [...product.features, ...product.tags]));
  const categories = topValues(categorySignals, ["Everyday use", "Gift", "Premium"]);
  const buyerNeeds = topValues(buyerNeedSignals, ["Comfort", "Best value", "Premium quality"]);
  const featureSignals = topValues(featureAndTagSignals, ["Easy to use", "Durable", "Lightweight"]);
  const publishedFinders = quizzes.filter((quiz) => quiz.published);
  const answerRules = quizzes.flatMap((quiz) => quiz.questions.flatMap((question) => question.options)).filter((option) => option.match_type !== "none" && option.match_value.trim());

  const cards: FinderLaunchKitCard[] = [
    {
      title: "Catalog has enough choice",
      detail: "A useful guided-selling flow needs enough active products to compare and rank.",
      evidence: `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"} available; aim for 8–20 for the first serious launch.`,
      status: activeProducts.length >= 2 ? "ready" : "needs-work",
    },
    {
      title: "Question language is available",
      detail: "Categories, buyer needs, features and tags become natural buyer questions.",
      evidence: `${categorySignals.length} category signal${categorySignals.length === 1 ? "" : "s"}, ${buyerNeedSignals.length} buyer-need signal${buyerNeedSignals.length === 1 ? "" : "s"}, ${featureAndTagSignals.length} feature/tag signal${featureAndTagSignals.length === 1 ? "" : "s"}.`,
      status: categorySignals.length + buyerNeedSignals.length + featureAndTagSignals.length >= 6 ? "ready" : "needs-work",
    },
    {
      title: "Answer rules can be deterministic",
      detail: "Answers should connect to tags, categories, features or budget so product selection stays reliable.",
      evidence: answerRules.length ? `${answerRules.length} answer rule${answerRules.length === 1 ? "" : "s"} already configured.` : "No answer rules configured yet.",
      status: answerRules.length ? "ready" : "needs-work",
    },
    {
      title: "Published finder proof",
      detail: "Publishing creates the customer-facing finder and widget context.",
      evidence: publishedFinders.length ? `${publishedFinders.length} published finder${publishedFinders.length === 1 ? "" : "s"} available.` : "No published finder yet.",
      status: publishedFinders.length ? "ready" : "needs-work",
    },
  ];

  const suggestedQuestions = [
    {
      title: "What are you shopping for?",
      purpose: "Route shoppers toward the right product family or use case.",
      exampleOptions: categories,
    },
    {
      title: "What matters most to you?",
      purpose: "Capture outcome language that maps to buyer_needs, features and tags.",
      exampleOptions: buyerNeeds,
    },
    {
      title: "Which features should we prioritize?",
      purpose: "Add concrete deterministic matching signals before ranking products.",
      exampleOptions: featureSignals,
    },
    {
      title: "What budget should we stay within?",
      purpose: "Use budget as an eligibility rule so recommendations respect price constraints.",
      exampleOptions: budgetOptions(activeProducts),
    },
  ];

  const status = activeProducts.length >= 2 ? "ready" : "blocked";
  const kit: Omit<FinderLaunchKit, "packet"> = {
    status,
    headline: status === "ready" ? "Your first finder can be drafted from the catalog." : "Add at least two active products before building the finder.",
    summary: status === "ready"
      ? "Use this kit to keep the first guided-selling flow short, deterministic and ready for widget proof."
      : "The finder builder is available, but recommendations need real active products before the flow can be trusted.",
    cards,
    suggestedQuestions,
  };

  return { ...kit, packet: buildPacket(kit) };
}
