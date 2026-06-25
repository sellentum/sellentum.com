import "server-only";

import type { Configurator, ConfiguratorOption, Product } from "@/lib/types";
import { describeConfiguratorSelection, getConfiguratorProgress, getConfiguratorTotal, optionConflictsWithSelection, uniqueValues } from "@/lib/utils";

export type ConfiguratorValidationResult = {
  valid: boolean;
  errors: string[];
  selectedIds: string[];
  selectedOptions: ConfiguratorOption[];
  selectedProducts: Product[];
  primaryProduct?: Product;
  selectedOptionNames: string[];
  selectedTags: string[];
  total: number;
  progress: number;
  explanation: string;
};

export function validateConfiguratorSelection(configurator: Configurator, products: Product[], selectedIds: string[]): ConfiguratorValidationResult {
  const errors: string[] = [];
  const uniqueSelectedIds = uniqueValues(selectedIds);
  const optionById = new Map(configurator.steps.flatMap((step) => step.options.map((option) => [option.id, option] as const)));
  const productById = new Map(products.filter((product) => product.active).map((product) => [product.id, product] as const));

  const selectedOptions = uniqueSelectedIds.map((id) => optionById.get(id)).filter((option): option is ConfiguratorOption => Boolean(option));
  const unknownIds = uniqueSelectedIds.filter((id) => !optionById.has(id));
  if (unknownIds.length) errors.push(`Unknown option${unknownIds.length === 1 ? "" : "s"}: ${unknownIds.join(", ")}.`);

  for (const step of configurator.steps) {
    const stepSelected = selectedOptions.filter((option) => step.options.some((stepOption) => stepOption.id === option.id));
    if (step.required && stepSelected.length === 0) errors.push(`Required step "${step.title}" is incomplete.`);
    if (step.selection_type === "single" && stepSelected.length > 1) errors.push(`Step "${step.title}" allows only one option.`);
  }

  const conflicts = selectedOptions.filter((option) => optionConflictsWithSelection(option, uniqueSelectedIds, configurator));
  if (conflicts.length) errors.push(`Incompatible options selected: ${uniqueValues(conflicts.map((option) => option.label)).join(", ")}.`);

  const unavailableLinkedProducts = selectedOptions
    .filter((option) => option.product_id && !productById.has(option.product_id))
    .map((option) => option.label);
  if (unavailableLinkedProducts.length) errors.push(`Linked product unavailable for: ${unavailableLinkedProducts.join(", ")}.`);

  const selectedProducts = selectedOptions
    .map((option) => option.product_id ? productById.get(option.product_id) : undefined)
    .filter((product): product is Product => Boolean(product));
  const primaryProduct = selectedProducts[0];
  const summary = describeConfiguratorSelection(configurator, uniqueSelectedIds);
  const selectedTags = summary.tags;
  const explanation = primaryProduct
    ? `${primaryProduct.name} is the anchor product. The bundle is tuned around ${selectedTags.slice(0, 4).join(", ") || "the options selected"} and every choice has been checked against compatibility rules.`
    : "This bundle has been checked against compatibility rules, but no active product is linked to the current selection.";

  return {
    valid: errors.length === 0,
    errors,
    selectedIds: uniqueSelectedIds,
    selectedOptions,
    selectedProducts,
    primaryProduct,
    selectedOptionNames: summary.names,
    selectedTags,
    total: getConfiguratorTotal(configurator, uniqueSelectedIds),
    progress: getConfiguratorProgress(configurator, uniqueSelectedIds),
    explanation,
  };
}
