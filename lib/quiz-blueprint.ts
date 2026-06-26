import { buildOntologyQuizSuggestion, buildQuizGenerationOntologySummary } from "./quiz-generation";
import { getAnswerOptionCoverage } from "./rule-coverage";
import type { MatchType, Product } from "@/lib/types";

export type QuizBlueprintOption = {
  label: string;
  matchType: MatchType;
  matchValue: string;
  weight: number;
  productCount: number;
  sampleProducts: string[];
  status: "matched" | "empty" | "preference";
};

export type QuizBlueprintQuestion = {
  title: string;
  helperText: string;
  options: QuizBlueprintOption[];
  coverageSummary: string;
};

export type QuizBlueprintReport = {
  score: number;
  status: "blocked" | "needs-review" | "ready";
  source: "ontology" | "fallback";
  activeProducts: number;
  questions: QuizBlueprintQuestion[];
  topSignals: string[];
  risks: string[];
  canGenerate: boolean;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildQuizBlueprint(products: Product[], goal = ""): QuizBlueprintReport {
  const activeProducts = products.filter((product) => product.active);
  const suggestion = buildOntologyQuizSuggestion(activeProducts, goal);
  const summary = buildQuizGenerationOntologySummary(activeProducts);
  const topSignals = summary.topSignals.slice(0, 8).map((signal) => signal.label);

  const questions = suggestion.questions.map((question) => {
    const options = question.options.map((option) => {
      const coverage = getAnswerOptionCoverage({ match_type: option.match_type, match_value: option.match_value }, activeProducts);
      return {
        label: option.label,
        matchType: option.match_type,
        matchValue: option.match_value,
        weight: option.weight,
        productCount: coverage.count,
        sampleProducts: coverage.productNames,
        status: coverage.status,
      };
    });
    const matched = options.filter((option) => option.status === "matched").length;
    const preference = options.filter((option) => option.status === "preference").length;
    const coverageSummary = matched
      ? `${matched}/${options.length} answer options map to catalog products`
      : preference
        ? "Preference-led question; other answers will drive product selection"
        : "No options map to active products yet";

    return {
      title: question.title,
      helperText: question.helper_text,
      options,
      coverageSummary,
    };
  });

  const emptyOptions = questions.flatMap((question) => question.options).filter((option) => option.status === "empty").length;
  const narrowOptions = questions.flatMap((question) => question.options).filter((option) => option.status === "matched" && option.productCount === 1).length;
  const risks = [
    activeProducts.length < 2 ? "Add at least two active products before generating a useful finder." : "",
    ...summary.gaps,
    emptyOptions ? `${emptyOptions} planned answer option${emptyOptions === 1 ? "" : "s"} do not currently match active products.` : "",
    narrowOptions >= 3 ? "Several options match only one product; review whether tags/features need normalization." : "",
    questions.length < 3 ? "The blueprint has fewer than three questions, so the generated finder may feel shallow." : "",
  ].filter(Boolean);

  const score = clampScore(100
    - (activeProducts.length < 2 ? 45 : 0)
    - Math.min(30, summary.gaps.length * 8)
    - Math.min(25, emptyOptions * 6)
    - Math.min(15, narrowOptions * 2)
    - (questions.length < 3 ? 10 : 0));
  const canGenerate = activeProducts.length >= 2 && questions.length > 0;
  const status = !canGenerate ? "blocked" : score >= 78 ? "ready" : "needs-review";

  return {
    score,
    status,
    source: summary.suggestedQuestions.length ? "ontology" : "fallback",
    activeProducts: activeProducts.length,
    questions,
    topSignals,
    risks,
    canGenerate,
  };
}
