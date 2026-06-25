import type { AnswerOption, Product } from "@/lib/types";

export type RuleCoverageStatus = "matched" | "empty" | "preference";

export type AnswerOptionRuleCoverage = {
  status: RuleCoverageStatus;
  count: number;
  productNames: string[];
  detail: string;
};

type RuleCoverageInput = Pick<AnswerOption, "match_type" | "match_value">;

const matchTypeLabels: Record<RuleCoverageInput["match_type"], string> = {
  tag: "tag",
  category: "category",
  feature: "feature",
  budget_max: "maximum price",
  none: "preference",
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

export function ruleMatchesProduct(rule: RuleCoverageInput, product: Product) {
  if (!product.active) return false;
  if (rule.match_type === "none") return true;

  const value = normalize(rule.match_value);
  if (!value) return false;

  if (rule.match_type === "budget_max") {
    const budget = Number(value);
    return Number.isFinite(budget) && budget > 0 && product.price <= budget;
  }

  if (rule.match_type === "category") {
    return normalize(product.category) === value;
  }

  if (rule.match_type === "tag") {
    return [...product.tags, ...(product.buyer_needs || [])].some((tag) => normalize(tag) === value);
  }

  return product.features.some((feature) => {
    const normalizedFeature = normalize(feature);
    return normalizedFeature.includes(value) || value.includes(normalizedFeature);
  });
}

export function getAnswerOptionCoverage(rule: RuleCoverageInput, products: Product[]): AnswerOptionRuleCoverage {
  const active = activeProducts(products);

  if (rule.match_type === "none") {
    return {
      status: "preference",
      count: active.length,
      productNames: [],
      detail: "Preference-only answer; it keeps all active products eligible and lets other answers drive ranking.",
    };
  }

  if (!rule.match_value.trim()) {
    return {
      status: "empty",
      count: 0,
      productNames: [],
      detail: "Add a match value so this answer can influence recommendations.",
    };
  }

  const matches = active.filter((product) => ruleMatchesProduct(rule, product));
  const productNames = matches.slice(0, 3).map((product) => product.name);

  if (!matches.length) {
    return {
      status: "empty",
      count: 0,
      productNames,
      detail: `No active products match this ${matchTypeLabels[rule.match_type]} rule yet.`,
    };
  }

  const sample = productNames.length ? ` Sample: ${productNames.join(", ")}${matches.length > productNames.length ? "…" : "."}` : "";

  return {
    status: "matched",
    count: matches.length,
    productNames,
    detail: `Matches ${matches.length} active product${matches.length === 1 ? "" : "s"}.${sample}`,
  };
}
