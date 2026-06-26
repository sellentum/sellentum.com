import type { Product } from "@/lib/types";

export type CatalogBenefit = {
  id: string;
  label: string;
  benefit: string;
  shopperQuestion: string;
  category: "comfort" | "performance" | "protection" | "convenience" | "confidence" | "value";
  sourceTerms: string[];
  productCount: number;
  productIds: string[];
  sampleProducts: string[];
};

export type CatalogBenefitReport = {
  activeProducts: number;
  productsWithBenefits: number;
  coverage: number;
  benefits: CatalogBenefit[];
  suggestedQuestion: {
    title: string;
    helperText: string;
    options: Array<{ label: string; benefit: string; productCount: number; matchTerms: string[] }>;
  };
  gaps: string[];
};

type BenefitRule = {
  id: string;
  terms: string[];
  label: string;
  benefit: string;
  shopperQuestion: string;
  category: CatalogBenefit["category"];
};

const benefitRules: BenefitRule[] = [
  { id: "wet-weather", terms: ["waterproof", "water resistant", "water-resistant", "water", "rain", "wet", "weatherproof"], label: "Wet-weather protection", benefit: "Keeps shoppers confident when conditions turn wet or unpredictable.", shopperQuestion: "Do you need protection from rain, spills or wet conditions?", category: "protection" },
  { id: "lightweight", terms: ["lightweight", "light", "low weight", "portable", "nimble"], label: "Lightweight feel", benefit: "Feels easier to carry, wear or use for longer sessions.", shopperQuestion: "Is a lighter, easier-to-handle product important?", category: "comfort" },
  { id: "comfort", terms: ["comfort", "comfortable", "cushion", "cushioning", "soft", "ergonomic"], label: "All-day comfort", benefit: "Reduces friction, fatigue or effort when shoppers use it for longer.", shopperQuestion: "Will comfort over long use matter most?", category: "comfort" },
  { id: "trail-grip", terms: ["trail", "grip", "traction", "outdoor", "hiking", "mud"], label: "Outdoor confidence", benefit: "Gives shoppers more control on uneven, slippery or demanding terrain.", shopperQuestion: "Will this be used outdoors or in tougher conditions?", category: "confidence" },
  { id: "speed", terms: ["speed", "fast", "race", "responsive", "performance", "quick"], label: "Faster performance", benefit: "Helps shoppers move faster or complete tasks with less delay.", shopperQuestion: "Are speed and responsiveness a priority?", category: "performance" },
  { id: "durability", terms: ["durable", "tough", "reinforced", "rugged", "long lasting", "heavy duty"], label: "Built to last", benefit: "Improves confidence that the product can handle repeat use.", shopperQuestion: "Does the product need to withstand frequent or demanding use?", category: "confidence" },
  { id: "compact", terms: ["compact", "small", "space saving", "foldable", "minimal"], label: "Space-saving fit", benefit: "Works better when shoppers have limited room or want less clutter.", shopperQuestion: "Is saving space or keeping the setup minimal important?", category: "convenience" },
  { id: "premium", terms: ["premium", "pro", "professional", "luxury", "advanced"], label: "Premium capability", benefit: "Fits shoppers who want higher-end materials, controls or finish.", shopperQuestion: "Are you shopping for a premium or professional-grade option?", category: "performance" },
  { id: "value", terms: ["value", "budget", "affordable", "starter", "entry", "basic"], label: "Best value", benefit: "Keeps the recommendation practical when price confidence matters.", shopperQuestion: "Would you prefer the strongest value over maximum features?", category: "value" },
  { id: "compatibility", terms: ["compatible", "compatibility", "fits", "kit", "bundle", "modular", "addon", "add-on"], label: "Compatible setup", benefit: "Helps shoppers avoid choosing parts or options that do not work together.", shopperQuestion: "Do you need Findly to keep selected parts compatible?", category: "confidence" },
];

const intentStopWords = new Set(["about", "after", "also", "and", "are", "can", "choosing", "does", "findly", "for", "from", "helps", "important", "into", "matter", "most", "need", "option", "product", "products", "shopping", "should", "that", "the", "this", "use", "when", "which", "with", "you", "your"]);

function normalise(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function productText(product: Product) {
  return normalise([
    product.name,
    product.category,
    product.description,
    product.features.join(" "),
    product.tags.join(" "),
    (product.buyer_needs || []).join(" "),
    product.search_text || "",
  ].join(" "));
}

function matchedTerms(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(normalise(term)));
}

function tokenise(value: string) {
  return normalise(value).match(/[a-z][a-z-]{2,}/g)?.filter((word) => !intentStopWords.has(word)) || [];
}

function ruleIntentVocabulary(rule: BenefitRule) {
  return [...new Set([
    ...rule.terms.flatMap(tokenise),
    ...tokenise(rule.label),
    ...tokenise(rule.benefit),
    ...tokenise(rule.shopperQuestion),
    rule.category,
  ])];
}

function benefitMatchesProduct(rule: BenefitRule, product: Product) {
  const text = productText(product);
  const matches = matchedTerms(text, rule.terms);
  if (matches.length) return matches;
  const buyerNeeds = (product.buyer_needs || []).map(normalise);
  return rule.terms.filter((term) => buyerNeeds.some((need) => need.includes(normalise(term))));
}

export function buildCatalogBenefitReport(products: Product[]): CatalogBenefitReport {
  const active = products.filter((product) => product.active);
  const productsWithBenefits = new Set<string>();

  const benefits = benefitRules.flatMap((rule) => {
    const matched = active.flatMap((product) => {
      const terms = benefitMatchesProduct(rule, product);
      return terms.length ? [{ product, terms }] : [];
    });
    if (!matched.length) return [];
    const sourceTerms = [...new Set(matched.flatMap((item) => item.terms.map((term) => normalise(term))))].slice(0, 6);
    matched.forEach((item) => productsWithBenefits.add(item.product.id));
    return [{
      id: rule.id,
      label: rule.label,
      benefit: rule.benefit,
      shopperQuestion: rule.shopperQuestion,
      category: rule.category,
      sourceTerms,
      productCount: matched.length,
      productIds: matched.map((item) => item.product.id),
      sampleProducts: matched.map((item) => item.product.name).slice(0, 3),
    }];
  }).sort((a, b) => b.productCount - a.productCount || a.label.localeCompare(b.label));

  const coverage = percentage(productsWithBenefits.size, active.length);
  const topBenefits = benefits.slice(0, 4);
  const gaps = [
    active.length < 2 ? "Add more active products before using benefit-led questions." : "",
    coverage < 60 ? "Run enrichment or add shopper-friendly tags/features so more products map to clear benefits." : "",
    benefits.length < 3 && active.length >= 3 ? "Add more benefit language such as comfort, durability, compatibility, protection or performance." : "",
  ].filter(Boolean);

  return {
    activeProducts: active.length,
    productsWithBenefits: productsWithBenefits.size,
    coverage,
    benefits,
    suggestedQuestion: {
      title: "Which benefit matters most to you?",
      helperText: "These options translate catalog specs into shopper-friendly outcomes.",
      options: topBenefits.map((benefit) => ({
        label: benefit.label,
        benefit: benefit.benefit,
        productCount: benefit.productCount,
        matchTerms: benefit.sourceTerms,
      })),
    },
    gaps,
  };
}

export function expandBenefitIntentTokens(value: string) {
  const query = normalise(value);
  const queryTokens = new Set(tokenise(value));
  return [...new Set(benefitRules.flatMap((rule) => {
    const vocabulary = ruleIntentVocabulary(rule);
    const phraseMatch = rule.terms.some((term) => query.includes(normalise(term))) || query.includes(normalise(rule.label));
    const tokenMatch = vocabulary.some((term) => queryTokens.has(term));
    return phraseMatch || tokenMatch ? rule.terms.flatMap(tokenise) : [];
  }))];
}
