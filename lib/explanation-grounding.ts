import { answerToFinderAnswer, buildFinderQuestionPath, defaultFinderSelections, orderedFinderQuestions } from "./finder-flow";
import type { Product, Quiz } from "@/lib/types";
import { auditProductMatches } from "./utils";

export type ExplanationGroundingStatus = "pass" | "warn" | "fail";
export type ExplanationGroundingPriority = "critical" | "high" | "medium" | "low";

export type ExplanationGroundingAudit = {
  id: string;
  quizName: string;
  scenarioLabel: string;
  productId: string;
  productName: string;
  status: ExplanationGroundingStatus;
  sampleExplanation: string;
  matchedReasons: string[];
  supportedTerms: string[];
  unsupportedTerms: string[];
  riskyTerms: string[];
  factCount: number;
  detail: string;
};

export type ExplanationGroundingAction = {
  id: string;
  priority: ExplanationGroundingPriority;
  title: string;
  detail: string;
  evidence: string;
  recommendation: string;
  actionHref: string;
};

export type ExplanationGroundingReport = {
  status: ExplanationGroundingStatus;
  score: number;
  headline: string;
  sourceMode: "openai" | "fallback";
  summary: {
    scenarios: number;
    auditedRecommendations: number;
    groundedRecommendations: number;
    warnings: number;
    blockers: number;
    factCoverageRate: number;
    averageSupportedTerms: number;
  };
  audits: ExplanationGroundingAudit[];
  actions: ExplanationGroundingAction[];
};

type ScenarioSeed = {
  id: string;
  label: string;
  selections: Record<string, string>;
};

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "based", "be", "because", "by", "for", "from", "has", "in", "is", "it", "its", "of", "on", "or", "our", "that", "the", "this", "to", "with", "you", "your",
]);

const genericExplanationWords = new Set([
  "available", "backed", "balances", "catalog", "choice", "chosen", "copy", "customer", "details", "deterministic", "especially", "explains", "fact", "facts", "fit", "fits", "grounded", "helps", "match", "matched", "preference", "preferences", "prioritised", "product", "recommended", "result", "shared", "shopper", "strong", "supports", "using", "well",
]);

const riskyClaimWords = new Set(["always", "certified", "cure", "cures", "guaranteed", "medical", "never", "official", "perfect", "safest"]);

const priorityRank: Record<ExplanationGroundingPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function tokenize(value: string) {
  return (value.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [])
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter((word) => word && !stopWords.has(word));
}

function productFactStrings(product: Product) {
  return [
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...(product.features || []),
    ...(product.tags || []),
    ...(product.buyer_needs || []),
  ].filter(Boolean);
}

function productFactCount(product: Product) {
  return [
    product.category,
    product.description,
    product.features?.length ? "features" : "",
    product.tags?.length ? "tags" : "",
    product.buyer_needs?.length ? "buyer-needs" : "",
    product.search_text,
  ].filter(Boolean).length;
}

function allowedTerms(product: Product, matchedReasons: string[]) {
  return new Set([
    ...productFactStrings(product).flatMap(tokenize),
    ...matchedReasons.flatMap(tokenize),
    ...genericExplanationWords,
  ]);
}

function sampleGroundedExplanation(product: Product, matchedReasons: string[]) {
  const reason = matchedReasons.find((item) => !item.toLowerCase().startsWith("buyer profile:")) || (product.buyer_needs || [])[0] || product.tags[0] || product.category || "your preferences";
  const proof = product.features[0] || product.description.split(/[.!?]/)[0] || product.category;
  if (reason && proof) return `${product.name} is a strong match for ${reason.toLowerCase()}, with ${proof.toLowerCase()} grounded in the catalog facts.`;
  if (reason) return `${product.name} fits your preference for ${reason.toLowerCase()} using the available product facts.`;
  return `${product.name} is recommended from deterministic product matching and available catalog facts.`;
}

function scenarioSeeds(quiz: Quiz, maxScenarios: number): ScenarioSeed[] {
  const questions = orderedFinderQuestions(quiz);
  const defaults = defaultFinderSelections(quiz);
  const seeds: ScenarioSeed[] = [{ id: "default", label: "Default shopper path", selections: defaults }];
  const firstQuestion = questions[0];

  for (const option of firstQuestion?.options.slice(0, 5) || []) {
    seeds.push({
      id: `start-${option.id}`,
      label: `Starts with “${option.label}”`,
      selections: { ...defaults, [firstQuestion.id]: option.id },
    });
  }

  const seen = new Set<string>();
  return seeds.filter((seed) => {
    const key = JSON.stringify(seed.selections);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, Math.max(1, maxScenarios));
}

function auditStatus({ unsupportedTerms, riskyTerms, factCount, matchedReasons }: Pick<ExplanationGroundingAudit, "unsupportedTerms" | "riskyTerms" | "factCount" | "matchedReasons">): ExplanationGroundingStatus {
  if (riskyTerms.length) return "fail";
  if (factCount < 2) return "fail";
  if (factCount < 4 || !matchedReasons.length || unsupportedTerms.length > 3) return "warn";
  return "pass";
}

function auditDetail(status: ExplanationGroundingStatus, factCount: number, unsupportedTerms: string[], riskyTerms: string[]) {
  if (status === "fail" && riskyTerms.length) return `Risky claim language detected: ${riskyTerms.join(", ")}.`;
  if (status === "fail") return `Only ${factCount} product fact group${factCount === 1 ? "" : "s"} are available to ground match copy.`;
  if (unsupportedTerms.length) return `Review unsupported terms before launch: ${unsupportedTerms.slice(0, 4).join(", ")}.`;
  if (factCount < 4) return "Explanation copy is safe, but the product has thin fact coverage.";
  return "Explanation copy is grounded in catalog facts and selected answer reasons.";
}

function buildAudit(quiz: Quiz, seed: ScenarioSeed, product: Product, matchedReasons: string[], index: number): ExplanationGroundingAudit {
  const sampleExplanation = sampleGroundedExplanation(product, matchedReasons);
  const allowed = allowedTerms(product, matchedReasons);
  const explanationTerms = [...new Set(tokenize(sampleExplanation))];
  const unsupportedTerms = explanationTerms.filter((term) => !allowed.has(term) && !term.includes(product.name.toLowerCase()));
  const riskyTerms = explanationTerms.filter((term) => riskyClaimWords.has(term));
  const factCount = productFactCount(product);
  const status = auditStatus({ unsupportedTerms, riskyTerms, factCount, matchedReasons });

  return {
    id: `${quiz.id}:${seed.id}:${product.id}:${index}`,
    quizName: quiz.name,
    scenarioLabel: seed.label,
    productId: product.id,
    productName: product.name,
    status,
    sampleExplanation,
    matchedReasons,
    supportedTerms: explanationTerms.filter((term) => allowed.has(term)),
    unsupportedTerms,
    riskyTerms,
    factCount,
    detail: auditDetail(status, factCount, unsupportedTerms, riskyTerms),
  };
}

function addAction(actions: ExplanationGroundingAction[], action: ExplanationGroundingAction) {
  actions.push(action);
}

export function buildExplanationGroundingReport({
  products,
  quizzes,
  openaiConfigured = false,
  maxScenarios = 6,
}: {
  products: Product[];
  quizzes: Quiz[];
  openaiConfigured?: boolean;
  maxScenarios?: number;
}): ExplanationGroundingReport {
  const activeProducts = products.filter((product) => product.active);
  const publishedQuizzes = quizzes.filter((quiz) => quiz.published && quiz.questions.length);
  const checkableQuizzes = publishedQuizzes.length ? publishedQuizzes : quizzes.filter((quiz) => quiz.questions.length);
  const audits = checkableQuizzes.flatMap((quiz) => scenarioSeeds(quiz, maxScenarios).flatMap((seed) => {
    const path = buildFinderQuestionPath(quiz, seed.selections, true);
    const answers = path.flatMap((step) => step.selectedOption ? [answerToFinderAnswer(step.question, step.selectedOption)] : []);
    const matches = auditProductMatches(activeProducts, answers, { overrides: quiz.recommendation_overrides || [] }).filter((audit) => audit.eligible).slice(0, 3);
    return matches.map((match, index) => buildAudit(quiz, seed, match.product, match.matchedReasons, index));
  }));

  const blockers = audits.filter((audit) => audit.status === "fail").length;
  const warnings = audits.filter((audit) => audit.status === "warn").length;
  const groundedRecommendations = audits.filter((audit) => audit.status === "pass").length;
  const factReadyProducts = activeProducts.filter((product) => productFactCount(product) >= 4).length;
  const factCoverageRate = activeProducts.length ? factReadyProducts / activeProducts.length * 100 : 0;
  const averageSupportedTerms = audits.length ? Math.round(audits.reduce((sum, audit) => sum + audit.supportedTerms.length, 0) / audits.length * 10) / 10 : 0;
  const actions: ExplanationGroundingAction[] = [];

  if (!audits.length) {
    addAction(actions, {
      id: "create-explanation-scenarios",
      priority: "critical",
      title: "Create recommendation paths to audit explanation copy",
      detail: "Findly needs at least one launchable finder path and eligible product before it can audit result-card explanations.",
      evidence: "0 explanation recommendations were audited.",
      recommendation: "Publish a finder, add active products and rerun preflight.",
      actionHref: "/dashboard/quizzes",
    });
  }

  if (blockers) {
    addAction(actions, {
      id: "remove-risky-explanation-copy",
      priority: "critical",
      title: "Remove risky or unsupported explanation copy",
      detail: "One or more explanation samples either use risky certainty language or lack enough product facts to support the claim.",
      evidence: `${blockers} explanation audit${blockers === 1 ? "" : "s"} failed.`,
      recommendation: "Strengthen product facts and keep AI/fallback explanations constrained to catalog evidence.",
      actionHref: "/dashboard/products",
    });
  }

  if (factCoverageRate < 80) {
    addAction(actions, {
      id: "strengthen-product-facts",
      priority: blockers ? "high" : "medium",
      title: "Strengthen product facts for grounded explanations",
      detail: "Some active products do not have enough descriptions, features, buyer needs or semantic text to support high-confidence recommendation copy.",
      evidence: `${Math.round(factCoverageRate)}% of active products have strong explanation fact coverage.`,
      recommendation: "Run catalog enrichment and add missing buyer-needs, features, descriptions and semantic search text.",
      actionHref: "/dashboard/products",
    });
  }

  if (warnings) {
    addAction(actions, {
      id: "review-thin-explanation-copy",
      priority: "medium",
      title: "Review thin explanation samples",
      detail: "Some explanation samples are safe but have thin support, missing matched reasons or unsupported generic terms.",
      evidence: `${warnings} explanation audit${warnings === 1 ? "" : "s"} need review.`,
      recommendation: "Use the lab trace to improve answer labels and product facts for those scenarios.",
      actionHref: "/dashboard/lab",
    });
  }

  if (!openaiConfigured) {
    addAction(actions, {
      id: "approve-fallback-explanations",
      priority: "low",
      title: "Approve deterministic fallback explanations",
      detail: "OpenAI is not configured, so Findly will use safe deterministic explanation copy.",
      evidence: "OPENAI_API_KEY is not available to the preflight runtime.",
      recommendation: "Either add OpenAI for richer copy or approve the fallback copy style before launch.",
      actionHref: "/dashboard/preflight",
    });
  }

  if (!actions.length) {
    addAction(actions, {
      id: "keep-grounding-checks-in-preflight",
      priority: "low",
      title: "Keep explanation grounding in launch checks",
      detail: "The current finder, catalog and explanation copy have enough grounding evidence for launch.",
      evidence: `${groundedRecommendations}/${audits.length} audited recommendations passed.`,
      recommendation: "Rerun preflight after catalog imports, answer-rule changes or prompt/model updates.",
      actionHref: "/dashboard/preflight",
    });
  }

  const score = audits.length ? Math.max(0, Math.min(100, Math.round(
    groundedRecommendations / audits.length * 55 +
    Math.min(25, factCoverageRate * 0.25) +
    Math.min(20, averageSupportedTerms * 4),
  ))) : 0;
  const status: ExplanationGroundingStatus = blockers || !audits.length ? "fail" : warnings || factCoverageRate < 80 ? "warn" : "pass";
  const headline = status === "pass"
    ? "Explanation copy is grounded for launch."
    : status === "warn"
      ? "Explanation copy is safe, but some product facts are thin."
      : "Explanation grounding needs attention before launch.";

  return {
    status,
    score,
    headline,
    sourceMode: openaiConfigured ? "openai" : "fallback",
    summary: {
      scenarios: checkableQuizzes.reduce((sum, quiz) => sum + scenarioSeeds(quiz, maxScenarios).length, 0),
      auditedRecommendations: audits.length,
      groundedRecommendations,
      warnings,
      blockers,
      factCoverageRate,
      averageSupportedTerms,
    },
    audits,
    actions: actions.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.id.localeCompare(b.id)).slice(0, 6),
  };
}
