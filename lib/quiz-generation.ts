import { buildCatalogOntology } from "./catalog-ontology";
import type { GeneratedQuizSuggestion, MatchType, Product } from "@/lib/types";

export type QuizGenerationProduct = Pick<Product, "name" | "price" | "category" | "description" | "features" | "tags"> & {
  id?: string;
  buyer_needs?: string[];
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function asOntologyProducts(products: QuizGenerationProduct[]): Product[] {
  const now = new Date().toISOString();
  return products.map((product, index) => ({
    id: product.id || `generation_product_${index}`,
    user_id: "generation",
    name: product.name,
    price: product.price,
    image_url: "",
    category: product.category,
    description: product.description,
    features: product.features,
    tags: product.tags,
    product_url: "",
    active: true,
    buyer_needs: product.buyer_needs || [],
    created_at: now,
    updated_at: now,
  }));
}

function rawOptions(values: string[], type: MatchType, limit = 4) {
  return unique(values).slice(0, limit).map((value) => ({ label: value, match_type: type, match_value: value, weight: type === "category" ? 5 : 3 }));
}

function budgetQuestion(products: QuizGenerationProduct[]): GeneratedQuizSuggestion["questions"][number] {
  const prices = products.map((product) => product.price).filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b);
  const fallback = prices[0] || 100;
  const middle = Math.ceil((prices[Math.floor(prices.length * 0.6)] || fallback) / 10) * 10;
  const high = Math.ceil((prices[prices.length - 1] || middle) / 10) * 10;
  return {
    title: "What is your comfortable budget?",
    helper_text: "We’ll only recommend products inside your range.",
    options: [
      { label: `Up to £${middle}`, match_type: "budget_max", match_value: String(middle), weight: 5 },
      ...(high !== middle ? [{ label: `Up to £${high}`, match_type: "budget_max" as const, match_value: String(high), weight: 5 }] : []),
      { label: "Show me the best match", match_type: "none", match_value: "", weight: 1 },
    ],
  };
}

function preferenceQuestion(): GeneratedQuizSuggestion["questions"][number] {
  return {
    title: "What kind of recommendation would feel most useful?",
    helper_text: "This keeps the flow helpful even when a catalog has thin attribute data.",
    options: [
      { label: "Best overall fit", match_type: "none", match_value: "", weight: 1 },
      { label: "Best value", match_type: "none", match_value: "", weight: 1 },
      { label: "Most feature-rich option", match_type: "none", match_value: "", weight: 1 },
    ],
  };
}

function questionKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildQuizGenerationOntologySummary(products: QuizGenerationProduct[]) {
  const ontology = buildCatalogOntology(asOntologyProducts(products));
  return {
    activeProducts: ontology.activeProducts,
    categoryClusters: ontology.categoryClusters.slice(0, 8).map((cluster) => ({
      category: cluster.category,
      productCount: cluster.productCount,
      needs: cluster.needs.slice(0, 5).map((signal) => signal.label),
      tags: cluster.tags.slice(0, 5).map((signal) => signal.label),
      features: cluster.features.slice(0, 5).map((signal) => signal.label),
    })),
    topSignals: ontology.topSignals.slice(0, 16).map((signal) => ({ type: signal.type, label: signal.label, key: signal.key, productCount: signal.productCount })),
    suggestedQuestions: ontology.suggestedQuestions,
    gaps: ontology.gaps,
  };
}

export function buildOntologyQuizSuggestion(products: QuizGenerationProduct[], goal = ""): GeneratedQuizSuggestion {
  const ontology = buildCatalogOntology(asOntologyProducts(products));
  const rawCategories = unique(products.map((product) => product.category));
  const rawNeeds = unique(products.flatMap((product) => product.buyer_needs?.length ? product.buyer_needs : product.tags));
  const rawFeatures = unique(products.flatMap((product) => product.features));
  const questions: GeneratedQuizSuggestion["questions"] = [];
  const seenQuestions = new Set<string>();

  for (const suggested of ontology.suggestedQuestions) {
    const options = suggested.options
      .filter((option) => option.productCount > 0)
      .slice(0, 5)
      .map((option) => ({
        label: option.label,
        match_type: option.matchType,
        match_value: option.matchValue,
        weight: option.matchType === "category" ? 5 : 3,
      }));
    if (options.length < 2) continue;
    const key = questionKey(suggested.title);
    if (seenQuestions.has(key)) continue;
    seenQuestions.add(key);
    questions.push({ title: suggested.title, helper_text: suggested.helperText, options });
  }

  if (questions.length < 3 && rawCategories.length > 1 && !seenQuestions.has("what kind of product are you looking for")) {
    questions.push({ title: "What kind of product are you looking for?", helper_text: "Choose the closest category and we’ll narrow the catalog.", options: rawOptions(rawCategories, "category") });
  }
  if (questions.length < 3 && rawNeeds.length > 1 && !seenQuestions.has("what are you hoping this product will help you do")) {
    questions.push({ title: "What are you hoping this product will help you do?", helper_text: "Pick the outcome that matters most.", options: rawOptions(rawNeeds, "tag") });
  }
  if (questions.length < 3 && rawFeatures.length > 1 && !seenQuestions.has("which quality matters most to you")) {
    questions.push({ title: "Which quality matters most to you?", helper_text: "We’ll prioritise this in your final matches.", options: rawOptions(rawFeatures, "feature") });
  }

  if (!questions.length) questions.push(preferenceQuestion());
  questions.push(budgetQuestion(products));
  if (questions.length < 2) questions.unshift(preferenceQuestion());

  const primaryCategory = ontology.categoryClusters[0]?.category;
  const goalHint = goal.trim() ? ` Tuned for: ${goal.trim().slice(0, 120)}` : "";

  return {
    name: primaryCategory ? `${primaryCategory} finder` : "Ontology-guided product finder",
    welcome_title: "Let’s find the right product for you.",
    welcome_message: `${Math.min(4, questions.length)} quick questions based on this catalog’s categories, needs and product signals.${goalHint}`,
    questions: questions.slice(0, 4),
  };
}
