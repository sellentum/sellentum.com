import type { Configurator, ConfiguratorOption, Product } from "@/lib/types";
import { describeConfiguratorSelection, flattenConfiguratorOptions, formatCurrency, getConfiguratorProgress, getConfiguratorTotal, optionConflictsWithSelection, updateConfiguratorSelection, uniqueValues } from "@/lib/utils";

export type ConfiguratorQaStatus = "pass" | "warn" | "fail";
export type ConfiguratorQaScenarioKind = "completion" | "compatibility";
export type ConfiguratorQaPriority = "critical" | "high" | "medium" | "low";

export type ConfiguratorQaScenario = {
  id: string;
  configuratorId: string;
  configuratorName: string;
  kind: ConfiguratorQaScenarioKind;
  label: string;
  status: ConfiguratorQaStatus;
  selectedOptionIds: string[];
  selectedOptions: string[];
  selectedProducts: string[];
  total: number;
  progress: number;
  errors: string[];
  blockedOptions: number;
  detail: string;
  recommendation: string;
};

export type ConfiguratorQaAction = {
  id: string;
  title: string;
  detail: string;
  priority: ConfiguratorQaPriority;
  evidence: string;
  actionHref: string;
  actionLabel: string;
};

export type ConfiguratorQaReport = {
  status: ConfiguratorQaStatus;
  score: number;
  headline: string;
  scenarios: ConfiguratorQaScenario[];
  blockers: ConfiguratorQaScenario[];
  warnings: ConfiguratorQaScenario[];
  actions: ConfiguratorQaAction[];
  summary: {
    configuratorsChecked: number;
    scenariosChecked: number;
    completionScenarios: number;
    passingScenarios: number;
    invalidCompletionScenarios: number;
    warningScenarios: number;
    compatibilityGuardrails: number;
    failedGuardrails: number;
    averageBundleValue: number;
    productLinkedScenarioRate: number;
  };
};

type CompletionSeed = {
  id: string;
  label: string;
  forceStepId?: string;
  forceOptionId?: string;
};

type ValidationResult = {
  selectedIds: string[];
  selectedOptions: ConfiguratorOption[];
  selectedProducts: Product[];
  total: number;
  progress: number;
  blockedOptions: number;
  errors: string[];
};

function orderedSteps(configurator: Configurator) {
  return [...configurator.steps].sort((a, b) => a.position - b.position);
}

function activeProducts(products: Product[]) {
  return products.filter((product) => product.active);
}

function optionById(configurator: Configurator) {
  return new Map(flattenConfiguratorOptions(configurator).map((option) => [option.id, option] as const));
}

function stepIdByOption(configurator: Configurator) {
  return new Map(flattenConfiguratorOptions(configurator).map((option) => [option.id, option.step_id] as const));
}

function productById(products: Product[]) {
  return new Map(activeProducts(products).map((product) => [product.id, product] as const));
}

function firstCompatibleOption(configurator: Configurator, options: ConfiguratorOption[], selectedIds: string[]) {
  return options.find((option) => !optionConflictsWithSelection(option, selectedIds, configurator)) || options[0];
}

function buildCompletionSelection(configurator: Configurator, seed: CompletionSeed) {
  let selectedIds: string[] = [];

  for (const step of orderedSteps(configurator)) {
    if (!step.options.length) continue;
    const forcedOption = seed.forceStepId === step.id
      ? step.options.find((option) => option.id === seed.forceOptionId)
      : undefined;
    const option = forcedOption || firstCompatibleOption(configurator, step.options, selectedIds);
    if (!option) continue;
    if (!step.required && !forcedOption && selectedIds.length) {
      const compatible = firstCompatibleOption(configurator, step.options, selectedIds);
      if (!compatible || optionConflictsWithSelection(compatible, selectedIds, configurator)) continue;
      selectedIds = updateConfiguratorSelection(configurator, selectedIds, step.id, compatible.id);
      continue;
    }
    selectedIds = updateConfiguratorSelection(configurator, selectedIds, step.id, option.id);
  }

  return selectedIds;
}

function validateSelection(configurator: Configurator, products: Product[], selectedIds: string[]): ValidationResult {
  const ids = uniqueValues(selectedIds);
  const optionsById = optionById(configurator);
  const productsById = productById(products);
  const selectedOptions = ids.map((id) => optionsById.get(id)).filter((option): option is ConfiguratorOption => Boolean(option));
  const errors: string[] = [];
  const unknownIds = ids.filter((id) => !optionsById.has(id));
  if (unknownIds.length) errors.push(`Unknown option${unknownIds.length === 1 ? "" : "s"}: ${unknownIds.join(", ")}.`);

  for (const step of orderedSteps(configurator)) {
    const stepOptionIds = new Set(step.options.map((option) => option.id));
    const stepSelected = selectedOptions.filter((option) => stepOptionIds.has(option.id));
    if (step.required && !stepSelected.length) errors.push(`Required step "${step.title}" is incomplete.`);
    if (step.selection_type === "single" && stepSelected.length > 1) errors.push(`Step "${step.title}" allows only one option.`);
  }

  const conflicts = selectedOptions.filter((option) => optionConflictsWithSelection(option, ids, configurator));
  if (conflicts.length) errors.push(`Incompatible options selected: ${uniqueValues(conflicts.map((option) => option.label)).join(", ")}.`);

  const unavailableProducts = selectedOptions
    .filter((option) => option.product_id && !productsById.has(option.product_id))
    .map((option) => option.label);
  if (unavailableProducts.length) errors.push(`Linked product unavailable for: ${unavailableProducts.join(", ")}.`);

  const selectedProducts = selectedOptions
    .map((option) => option.product_id ? productsById.get(option.product_id) : undefined)
    .filter((product): product is Product => Boolean(product));
  const blockedOptions = flattenConfiguratorOptions(configurator)
    .filter((option) => !ids.includes(option.id) && optionConflictsWithSelection(option, ids, configurator))
    .length;

  return {
    selectedIds: ids,
    selectedOptions,
    selectedProducts,
    total: getConfiguratorTotal(configurator, ids),
    progress: getConfiguratorProgress(configurator, ids),
    blockedOptions,
    errors,
  };
}

function completionSeeds(configurator: Configurator, maxScenarios: number): CompletionSeed[] {
  const firstRequired = orderedSteps(configurator).find((step) => step.required && step.options.length) || orderedSteps(configurator).find((step) => step.options.length);
  const seeds: CompletionSeed[] = [{ id: "default", label: "Default complete path" }];

  for (const option of firstRequired?.options || []) {
    seeds.push({
      id: `starts-${option.id}`,
      label: `Starts with “${option.label}”`,
      forceStepId: firstRequired?.id,
      forceOptionId: option.id,
    });
  }

  return seeds.slice(0, Math.max(1, maxScenarios));
}

function scenarioStatus(kind: ConfiguratorQaScenarioKind, validation: ValidationResult, expectedConflict = false): ConfiguratorQaStatus {
  if (kind === "compatibility") return expectedConflict && validation.errors.some((error) => error.includes("Incompatible options")) ? "pass" : "fail";
  if (validation.errors.length || validation.progress < 100) return "fail";
  if (!validation.selectedProducts.length) return "warn";
  return "pass";
}

function completionCopy(status: ConfiguratorQaStatus, validation: ValidationResult) {
  if (status === "fail") {
    return {
      detail: validation.errors[0] || `Required progress reached only ${validation.progress}%.`,
      recommendation: "Fix required-step coverage, compatibility choices or linked product availability before embedding this configurator.",
    };
  }

  if (status === "warn") {
    return {
      detail: "The path can complete but does not select an active linked product.",
      recommendation: "Link at least one selected option to an active purchasable product so the final bundle can convert.",
    };
  }

  return {
    detail: `Completes all required steps with ${validation.selectedProducts.length} linked product${validation.selectedProducts.length === 1 ? "" : "s"} and a ${formatCurrency(validation.total)} bundle value.`,
    recommendation: "Keep this path in the QA suite when changing options, products or compatibility rules.",
  };
}

function conflictCopy(status: ConfiguratorQaStatus, validation: ValidationResult) {
  if (status === "pass") {
    return {
      detail: validation.errors.find((error) => error.includes("Incompatible options")) || "The incompatible pair is blocked.",
      recommendation: "Compatibility guardrail works for this blocked pair.",
    };
  }

  return {
    detail: "An incompatible pair was accepted as a valid bundle.",
    recommendation: "Review incompatibility references so conflicting options cannot be submitted through the public runtime.",
  };
}

function analyzeCompletionScenario(configurator: Configurator, products: Product[], seed: CompletionSeed): ConfiguratorQaScenario {
  const selectedIds = buildCompletionSelection(configurator, seed);
  const validation = validateSelection(configurator, products, selectedIds);
  const status = scenarioStatus("completion", validation);
  const copy = completionCopy(status, validation);
  const summary = describeConfiguratorSelection(configurator, validation.selectedIds);

  return {
    id: `${configurator.id}:${seed.id}`,
    configuratorId: configurator.id,
    configuratorName: configurator.name,
    kind: "completion",
    label: seed.label,
    status,
    selectedOptionIds: validation.selectedIds,
    selectedOptions: summary.names,
    selectedProducts: validation.selectedProducts.map((product) => product.name),
    total: validation.total,
    progress: validation.progress,
    errors: validation.errors,
    blockedOptions: validation.blockedOptions,
    detail: copy.detail,
    recommendation: copy.recommendation,
  };
}

function conflictPairs(configurator: Configurator, maxPairs: number) {
  const optionSteps = stepIdByOption(configurator);
  const options = flattenConfiguratorOptions(configurator);
  const seen = new Set<string>();
  return options.flatMap((option) => option.incompatible_option_ids.flatMap((blockedId) => {
    const blocked = options.find((item) => item.id === blockedId);
    if (!blocked || optionSteps.get(option.id) === optionSteps.get(blocked.id)) return [];
    const key = [option.id, blocked.id].sort().join(":");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ option, blocked }];
  })).slice(0, maxPairs);
}

function analyzeConflictScenario(configurator: Configurator, products: Product[], option: ConfiguratorOption, blocked: ConfiguratorOption): ConfiguratorQaScenario {
  const validation = validateSelection(configurator, products, [option.id, blocked.id]);
  const status = scenarioStatus("compatibility", validation, true);
  const copy = conflictCopy(status, validation);

  return {
    id: `${configurator.id}:conflict-${option.id}-${blocked.id}`,
    configuratorId: configurator.id,
    configuratorName: configurator.name,
    kind: "compatibility",
    label: `Blocks “${option.label}” with “${blocked.label}”`,
    status,
    selectedOptionIds: validation.selectedIds,
    selectedOptions: validation.selectedOptions.map((item) => item.label),
    selectedProducts: validation.selectedProducts.map((product) => product.name),
    total: validation.total,
    progress: validation.progress,
    errors: validation.errors,
    blockedOptions: validation.blockedOptions,
    detail: copy.detail,
    recommendation: copy.recommendation,
  };
}

function checkableConfigurators(configurators: Configurator[]) {
  const published = configurators.filter((configurator) => configurator.published);
  return (published.length ? published : configurators).filter((configurator) => configurator.steps.length);
}

function actionPriority(action: ConfiguratorQaAction) {
  if (action.priority === "critical") return 4;
  if (action.priority === "high") return 3;
  if (action.priority === "medium") return 2;
  return 1;
}

function buildActions(report: Omit<ConfiguratorQaReport, "actions" | "headline">): ConfiguratorQaAction[] {
  const actions: ConfiguratorQaAction[] = [];
  const firstBlocker = report.blockers[0];
  const firstWarning = report.warnings[0];

  if (!report.summary.scenariosChecked) {
    actions.push({
      id: "create-configurator-qa",
      title: "Create a testable configurator",
      detail: "Configurator path QA needs at least one configurator with steps and options.",
      priority: "critical",
      evidence: `${report.summary.configuratorsChecked} configurator${report.summary.configuratorsChecked === 1 ? "" : "s"} checked.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Build configurator",
    });
  }

  if (report.summary.invalidCompletionScenarios) {
    actions.push({
      id: "fix-configurator-completion",
      title: "Fix invalid configurator paths",
      detail: "At least one simulated shopper path cannot complete all required steps or selects an unavailable linked product.",
      priority: "critical",
      evidence: firstBlocker ? `${firstBlocker.configuratorName} · ${firstBlocker.label}: ${firstBlocker.detail}` : `${report.summary.invalidCompletionScenarios} invalid path${report.summary.invalidCompletionScenarios === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Fix paths",
    });
  }

  if (report.summary.failedGuardrails) {
    actions.push({
      id: "fix-configurator-guardrails",
      title: "Fix compatibility guardrails",
      detail: "An incompatible option pair was accepted by the deterministic validation model.",
      priority: "critical",
      evidence: firstBlocker ? `${firstBlocker.configuratorName} · ${firstBlocker.label}` : `${report.summary.failedGuardrails} failed guardrail${report.summary.failedGuardrails === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Review compatibility",
    });
  }

  if (report.summary.productLinkedScenarioRate < 80 && report.summary.completionScenarios) {
    actions.push({
      id: "link-configurator-products",
      title: "Link products to completed bundles",
      detail: "Some completed configurator paths do not lead to an active purchasable product.",
      priority: "medium",
      evidence: `${report.summary.productLinkedScenarioRate}% of completion paths include active linked products.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Link products",
    });
  }

  if (!report.summary.compatibilityGuardrails && report.summary.completionScenarios > 1) {
    actions.push({
      id: "add-configurator-compatibility",
      title: "Add compatibility guardrails if choices can conflict",
      detail: "The QA suite found no cross-step incompatibility pairs to test.",
      priority: "low",
      evidence: `${report.summary.completionScenarios} completion paths, 0 compatibility guardrails.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Review rules",
    });
  }

  if (firstWarning && !actions.some((action) => action.id === "link-configurator-products")) {
    actions.push({
      id: "review-configurator-warning",
      title: "Review configurator QA warning",
      detail: firstWarning.recommendation,
      priority: "low",
      evidence: `${firstWarning.configuratorName} · ${firstWarning.label}: ${firstWarning.detail}`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Review QA",
    });
  }

  return actions.sort((a, b) => actionPriority(b) - actionPriority(a) || a.title.localeCompare(b.title)).slice(0, 5);
}

export function buildConfiguratorQaReport(configurators: Configurator[], products: Product[], maxScenariosPerConfigurator = 6): ConfiguratorQaReport {
  const checkable = checkableConfigurators(configurators);
  const scenarios = checkable.flatMap((configurator) => {
    const completion = completionSeeds(configurator, maxScenariosPerConfigurator)
      .map((seed) => analyzeCompletionScenario(configurator, products, seed));
    const conflicts = conflictPairs(configurator, Math.max(1, Math.floor(maxScenariosPerConfigurator / 2)))
      .map(({ option, blocked }) => analyzeConflictScenario(configurator, products, option, blocked));
    return [...completion, ...conflicts];
  });
  const blockers = scenarios.filter((scenario) => scenario.status === "fail");
  const warnings = scenarios.filter((scenario) => scenario.status === "warn");
  const passingScenarios = scenarios.filter((scenario) => scenario.status === "pass").length;
  const completionScenarios = scenarios.filter((scenario) => scenario.kind === "completion");
  const invalidCompletionScenarios = completionScenarios.filter((scenario) => scenario.status === "fail").length;
  const compatibilityScenarios = scenarios.filter((scenario) => scenario.kind === "compatibility");
  const failedGuardrails = compatibilityScenarios.filter((scenario) => scenario.status === "fail").length;
  const productLinkedScenarioRate = completionScenarios.length
    ? Math.round(completionScenarios.filter((scenario) => scenario.selectedProducts.length).length / completionScenarios.length * 100)
    : 0;
  const averageBundleValue = completionScenarios.length
    ? Math.round(completionScenarios.reduce((sum, scenario) => sum + scenario.total, 0) / completionScenarios.length)
    : 0;
  const score = scenarios.length ? Math.round(passingScenarios / scenarios.length * 100) : 0;
  const missingCompatibilityWarning = !compatibilityScenarios.length && completionScenarios.length > 1;
  const status: ConfiguratorQaStatus = !scenarios.length || blockers.length ? "fail" : warnings.length || missingCompatibilityWarning ? "warn" : "pass";
  const partial = {
    status,
    score,
    scenarios,
    blockers,
    warnings,
    summary: {
      configuratorsChecked: checkable.length,
      scenariosChecked: scenarios.length,
      completionScenarios: completionScenarios.length,
      passingScenarios,
      invalidCompletionScenarios,
      warningScenarios: warnings.length,
      compatibilityGuardrails: compatibilityScenarios.length,
      failedGuardrails,
      averageBundleValue,
      productLinkedScenarioRate,
    },
  };
  const headline = status === "pass"
    ? "Configurator paths complete and compatibility guardrails are working."
    : status === "warn"
      ? "Configurator paths are usable, but need a compatibility or product-link review."
      : "Configurator QA found a path or guardrail that can block launch.";

  return {
    ...partial,
    headline,
    actions: buildActions(partial),
  };
}
