import type { Configurator, Product } from "@/lib/types";

export type ConfiguratorReadinessSeverity = "pass" | "warning" | "blocker";

export type ConfiguratorReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  severity: ConfiguratorReadinessSeverity;
};

export type ConfiguratorReadinessReport = {
  score: number;
  canPublish: boolean;
  blockers: ConfiguratorReadinessCheck[];
  warnings: ConfiguratorReadinessCheck[];
  checks: ConfiguratorReadinessCheck[];
};

function check(id: string, label: string, detail: string, severity: ConfiguratorReadinessSeverity): ConfiguratorReadinessCheck {
  return { id, label, detail, severity };
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

export function analyzeConfiguratorReadiness(configurator: Configurator, products: Product[]): ConfiguratorReadinessReport {
  const active = activeProducts(products);
  const activeProductIds = new Set(active.map((product) => product.id));
  const steps = [...configurator.steps].sort((a, b) => a.position - b.position);
  const options = steps.flatMap((step) => step.options);
  const optionIds = new Set(options.map((option) => option.id));
  const linkedOptions = options.filter((option) => option.product_id);
  const unavailableLinkedOptions = linkedOptions.filter((option) => option.product_id && !activeProductIds.has(option.product_id));
  const staleCompatibilityRefs = options.flatMap((option) => option.incompatible_option_ids.filter((id) => !optionIds.has(id)).map((id) => ({ option, id })));
  const namelessOptions = options.filter((option) => !option.label.trim());
  const weakDescriptions = options.filter((option) => !option.description.trim());
  const invalidPrices = options.filter((option) => !Number.isFinite(option.price_delta));
  const negativePrices = options.filter((option) => Number.isFinite(option.price_delta) && option.price_delta < 0);
  const checks: ConfiguratorReadinessCheck[] = [];

  checks.push(check(
    "catalog",
    "Product catalog",
    active.length ? `${active.length} active product${active.length === 1 ? "" : "s"} can be linked to options.` : "Add at least one active product before publishing a product configurator.",
    active.length ? "pass" : "blocker",
  ));

  checks.push(check(
    "setup-copy",
    "Setup copy",
    configurator.title.trim() && configurator.subtitle.trim() ? "Public title and subtitle are ready." : "Add a public title and subtitle so shoppers understand the bundle.",
    configurator.title.trim() && configurator.subtitle.trim() ? "pass" : "warning",
  ));

  checks.push(check(
    "steps",
    "Configurator steps",
    steps.length ? `${steps.length} step${steps.length === 1 ? "" : "s"} configured.` : "Add at least one step.",
    steps.length ? "pass" : "blocker",
  ));

  const emptySteps = steps.filter((step) => !step.options.length);
  checks.push(check(
    "step-options",
    "Step options",
    emptySteps.length ? `${emptySteps.length} step${emptySteps.length === 1 ? "" : "s"} have no options.` : "Every step has at least one option.",
    emptySteps.length ? "blocker" : "pass",
  ));

  const requiredEmptySteps = steps.filter((step) => step.required && !step.options.length);
  checks.push(check(
    "required-steps",
    "Required path",
    requiredEmptySteps.length ? `${requiredEmptySteps.length} required step${requiredEmptySteps.length === 1 ? "" : "s"} cannot be completed.` : "Required steps can be completed.",
    requiredEmptySteps.length ? "blocker" : "pass",
  ));

  checks.push(check(
    "linked-products",
    "Linked products",
    linkedOptions.length ? `${linkedOptions.length} option${linkedOptions.length === 1 ? "" : "s"} link to products.` : "Link at least one option to an active product so the bundle can recommend something purchasable.",
    linkedOptions.length ? "pass" : "blocker",
  ));

  checks.push(check(
    "available-linked-products",
    "Available linked products",
    unavailableLinkedOptions.length ? `${unavailableLinkedOptions.length} linked option${unavailableLinkedOptions.length === 1 ? "" : "s"} point to inactive or missing products.` : "Linked products are active and available.",
    unavailableLinkedOptions.length ? "blocker" : "pass",
  ));

  checks.push(check(
    "option-labels",
    "Option labels",
    namelessOptions.length ? `${namelessOptions.length} option label${namelessOptions.length === 1 ? " is" : "s are"} blank.` : "All option labels are filled in.",
    namelessOptions.length ? "blocker" : "pass",
  ));

  if (invalidPrices.length) {
    checks.push(check("price-deltas", "Price deltas", `${invalidPrices.length} option${invalidPrices.length === 1 ? " has" : "s have"} invalid pricing.`, "blocker"));
  } else if (negativePrices.length) {
    checks.push(check("price-deltas", "Price deltas", `${negativePrices.length} option${negativePrices.length === 1 ? " uses" : "s use"} negative pricing. Confirm this is intentional.`, "warning"));
  } else {
    checks.push(check("price-deltas", "Price deltas", "Option pricing is valid.", "pass"));
  }

  checks.push(check(
    "compatibility",
    "Compatibility references",
    staleCompatibilityRefs.length ? `${staleCompatibilityRefs.length} compatibility reference${staleCompatibilityRefs.length === 1 ? "" : "s"} point to deleted options.` : "Compatibility references point to existing options.",
    staleCompatibilityRefs.length ? "blocker" : "pass",
  ));

  const hasCompatibilityRules = options.some((option) => option.incompatible_option_ids.length);
  checks.push(check(
    "compatibility-coverage",
    "Compatibility coverage",
    steps.length > 1 && !hasCompatibilityRules ? "No incompatibility rules are configured. Add them if any choices should not be combined." : "Compatibility rules are configured where needed.",
    steps.length > 1 && !hasCompatibilityRules ? "warning" : "pass",
  ));

  checks.push(check(
    "option-descriptions",
    "Option descriptions",
    weakDescriptions.length ? `${weakDescriptions.length} option${weakDescriptions.length === 1 ? " is" : "s are"} missing shopper-facing descriptions.` : "Options include shopper-facing descriptions.",
    weakDescriptions.length ? "warning" : "pass",
  ));

  const warnings = checks.filter((item) => item.severity === "warning");
  const blockers = checks.filter((item) => item.severity === "blocker");
  const passed = checks.filter((item) => item.severity === "pass").length;

  return {
    score: Math.round((passed / checks.length) * 100),
    canPublish: blockers.length === 0,
    blockers,
    warnings,
    checks,
  };
}
