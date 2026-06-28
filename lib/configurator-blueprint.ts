import { buildCatalogBenefitReport } from "./catalog-benefits";
import type { Product } from "@/lib/types";

export type ConfiguratorBlueprintProduct = Pick<Product, "id" | "name" | "price" | "image_url" | "category" | "description" | "features" | "tags"> & {
  active?: boolean;
  buyer_needs?: string[];
  search_text?: string;
};

export type ConfiguratorBlueprintStatus = "ready" | "needs-review" | "blocked";
export type ConfiguratorBlueprintSource = "catalog" | "openai";

export type ConfiguratorBlueprintOption = {
  key: string;
  label: string;
  description: string;
  image_url: string;
  price_delta: number;
  product_id?: string;
  tags: string[];
  incompatible_option_keys: string[];
};

export type ConfiguratorBlueprintStep = {
  key: string;
  title: string;
  helper_text: string;
  selection_type: "single" | "multi";
  required: boolean;
  options: ConfiguratorBlueprintOption[];
};

export type ConfiguratorBlueprintSuggestion = {
  name: string;
  title: string;
  subtitle: string;
  hero_image_url: string;
  base_price: number;
  steps: ConfiguratorBlueprintStep[];
};

export type ConfiguratorBlueprintReport = {
  status: ConfiguratorBlueprintStatus;
  score: number;
  canGenerate: boolean;
  source: ConfiguratorBlueprintSource;
  activeProducts: number;
  linkedProducts: number;
  compatibilityRules: number;
  optionCount: number;
  topSignals: string[];
  risks: string[];
  suggestion: ConfiguratorBlueprintSuggestion;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56);
}

function titleize(value: string) {
  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function productKey(product: ConfiguratorBlueprintProduct) {
  return `product-${normalize(product.id || product.name)}`;
}

function signalKey(value: string) {
  return `signal-${normalize(value)}`;
}

function addonKey(value: string) {
  return `addon-${normalize(value)}`;
}

function productCorpus(product: ConfiguratorBlueprintProduct) {
  return [
    product.name,
    product.category,
    product.description,
    product.features.join(" "),
    product.tags.join(" "),
    (product.buyer_needs || []).join(" "),
    product.search_text || "",
  ].join(" ").toLowerCase();
}

function signalMatchesProduct(signal: string, product: ConfiguratorBlueprintProduct) {
  const normalized = signal.toLowerCase();
  return productCorpus(product).includes(normalized)
    || normalized.split(/\s+/).filter(Boolean).some((token) => token.length > 3 && productCorpus(product).includes(token));
}

function rankedProducts(products: ConfiguratorBlueprintProduct[]) {
  return products
    .filter((product) => product.active !== false)
    .sort((a, b) => {
      const aSignals = a.features.length + a.tags.length + (a.buyer_needs || []).length + (a.description ? 1 : 0) + (a.image_url ? 1 : 0);
      const bSignals = b.features.length + b.tags.length + (b.buyer_needs || []).length + (b.description ? 1 : 0) + (b.image_url ? 1 : 0);
      return bSignals - aSignals || a.price - b.price || a.name.localeCompare(b.name);
    });
}

function topSignals(products: ConfiguratorBlueprintProduct[]) {
  const counts = new Map<string, { label: string; count: number }>();
  for (const product of products) {
    for (const signal of unique([...(product.buyer_needs || []), ...product.tags, ...product.features, product.category])) {
      const key = signal.toLowerCase();
      const existing = counts.get(key) || { label: titleize(signal), count: 0 };
      existing.count += 1;
      counts.set(key, existing);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((item) => item.label)
    .slice(0, 8);
}

function mainProductStep(products: ConfiguratorBlueprintProduct[]): ConfiguratorBlueprintStep {
  return {
    key: "main-product",
    title: "Choose the product that anchors your setup",
    helper_text: "Start with the item the rest of the configuration should support.",
    selection_type: "single",
    required: true,
    options: products.slice(0, 5).map((product) => ({
      key: productKey(product),
      label: product.name,
      description: product.description || `${product.name} from ${product.category || "the catalog"}.`,
      image_url: product.image_url || "",
      price_delta: product.price,
      product_id: product.id,
      tags: unique([product.category, ...(product.buyer_needs || []), ...product.tags, ...product.features]).slice(0, 8),
      incompatible_option_keys: [],
    })),
  };
}

function shopperPriorityStep(products: ConfiguratorBlueprintProduct[], signals: string[]): ConfiguratorBlueprintStep | null {
  const options = signals.slice(0, 5).flatMap((signal) => {
    const matching = products.filter((product) => signalMatchesProduct(signal, product));
    if (!matching.length) return [];
    const incompatible = products
      .filter((product) => !matching.some((match) => match.id === product.id))
      .map(productKey);
    return [{
      key: signalKey(signal),
      label: signal,
      description: `Prioritises products and bundle choices that support ${signal.toLowerCase()}.`,
      image_url: "",
      price_delta: 0,
      tags: [signal],
      incompatible_option_keys: incompatible,
    }];
  });

  if (options.length < 2) return null;
  return {
    key: "shopper-priority",
    title: "What should this setup prioritise?",
    helper_text: "Sellentum keeps choices compatible with the priority you select.",
    selection_type: "single",
    required: true,
    options,
  };
}

function addonStep(products: ConfiguratorBlueprintProduct[], signals: string[]): ConfiguratorBlueprintStep | null {
  const now = new Date().toISOString();
  const benefitProducts: Product[] = products.map((product) => ({
    ...product,
    user_id: "blueprint",
    product_url: "",
    active: product.active ?? true,
    created_at: now,
    updated_at: now,
  }));
  const benefits = buildCatalogBenefitReport(benefitProducts).benefits.map((benefit) => benefit.label);
  const optionLabels = unique([...benefits, ...signals]).slice(0, 4);
  if (optionLabels.length < 2) return null;
  return {
    key: "finish-the-bundle",
    title: "Add finishing preferences",
    helper_text: "Optional refinements tailor the final bundle without changing the anchor product.",
    selection_type: "multi",
    required: false,
    options: optionLabels.map((label) => ({
      key: addonKey(label),
      label,
      description: `Adds ${label.toLowerCase()} as a shopper-facing preference in the configured bundle.`,
      image_url: "",
      price_delta: 0,
      tags: [label],
      incompatible_option_keys: [],
    })),
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildConfiguratorBlueprint(products: ConfiguratorBlueprintProduct[], goal = "", source: ConfiguratorBlueprintSource = "catalog"): ConfiguratorBlueprintReport {
  const active = rankedProducts(products);
  const signals = topSignals(active);
  const category = active[0]?.category || "Product";
  const steps = [
    active.length ? mainProductStep(active) : null,
    shopperPriorityStep(active, signals),
    addonStep(active, signals),
  ].filter((step): step is ConfiguratorBlueprintStep => Boolean(step));
  const compatibilityRules = steps.flatMap((step) => step.options).reduce((sum, option) => sum + option.incompatible_option_keys.length, 0);
  const linkedProducts = new Set(steps.flatMap((step) => step.options.flatMap((option) => option.product_id ? [option.product_id] : []))).size;
  const optionCount = steps.reduce((sum, step) => sum + step.options.length, 0);
  const risks = [
    active.length < 2 ? "Add at least two active products before generating a useful configurator." : "",
    linkedProducts < Math.min(2, active.length) ? "Generated configurator links too few products for a meaningful configured result." : "",
    steps.length < 2 ? "Catalog signals are thin, so the configurator only has a main-product step." : "",
    !compatibilityRules && steps.length > 1 ? "No compatibility guardrails were inferred; review whether any choices should block each other." : "",
  ].filter(Boolean);
  const score = clampScore(100
    - (active.length < 2 ? 45 : 0)
    - (linkedProducts < Math.min(2, active.length) ? 20 : 0)
    - (steps.length < 2 ? 18 : 0)
    - (!compatibilityRules && steps.length > 1 ? 10 : 0));
  const canGenerate = active.length >= 2 && steps.length > 0;
  const status: ConfiguratorBlueprintStatus = !canGenerate ? "blocked" : score >= 78 ? "ready" : "needs-review";
  const goalHint = goal.trim() ? ` Tuned for: ${goal.trim().slice(0, 110)}` : "";

  return {
    status,
    score,
    canGenerate,
    source,
    activeProducts: active.length,
    linkedProducts,
    compatibilityRules,
    optionCount,
    topSignals: signals,
    risks,
    suggestion: {
      name: `${category} configurator`,
      title: `Build your ideal ${category.toLowerCase()} setup`,
      subtitle: `Choose a product, match it to your priorities, and keep the final bundle compatible.${goalHint}`,
      hero_image_url: active.find((product) => product.image_url)?.image_url || "",
      base_price: 0,
      steps,
    },
  };
}
