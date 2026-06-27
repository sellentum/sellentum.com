import { buildConfiguratorQaReport } from "./configurator-qa";
import type { Configurator, ConfiguratorOption, ConfiguratorStep, Product } from "./types";

export type CompatibilityMatrixStatus = "empty" | "needs-attention" | "watch" | "ready";
export type CompatibilityRuleStatus = "pass" | "warn" | "fail";
export type CompatibilityActionPriority = "critical" | "high" | "medium" | "low";

export type CompatibilityOptionNode = {
  id: string;
  label: string;
  stepTitle: string;
  configuratorName: string;
  productName?: string;
  activeProduct: boolean;
  priceDelta: number;
  tags: string[];
  ruleCount: number;
};

export type CompatibilityMatrixRule = {
  id: string;
  configuratorId: string;
  configuratorName: string;
  sourceOptionId: string;
  sourceOptionLabel: string;
  sourceStepTitle: string;
  sourceProductName?: string;
  targetOptionId: string;
  targetOptionLabel: string;
  targetStepTitle?: string;
  targetProductName?: string;
  reciprocal: boolean;
  status: CompatibilityRuleStatus;
  evidence: string;
  shopperMessage: string;
};

export type CompatibilityMatrixCheck = {
  id: string;
  label: string;
  status: CompatibilityRuleStatus;
  detail: string;
  evidence: string;
};

export type CompatibilityMatrixAction = {
  id: string;
  priority: CompatibilityActionPriority;
  title: string;
  detail: string;
  evidence: string;
  actionHref: string;
  actionLabel: string;
};

export type CompatibilityMatrixReport = {
  status: CompatibilityMatrixStatus;
  score: number;
  headline: string;
  summary: {
    configurators: number;
    publishedConfigurators: number;
    options: number;
    productLinkedOptions: number;
    inactiveProductLinks: number;
    compatibilityRules: number;
    blockedPairs: number;
    reciprocalRules: number;
    oneWayRules: number;
    staleRules: number;
    guardedSteps: number;
    unguardedMultiOptionSteps: number;
    qaScore: number;
    failedQaGuardrails: number;
  };
  options: CompatibilityOptionNode[];
  rules: CompatibilityMatrixRule[];
  checks: CompatibilityMatrixCheck[];
  actions: CompatibilityMatrixAction[];
  packet: string;
};

type OptionRow = {
  configurator: Configurator;
  step: ConfiguratorStep;
  option: ConfiguratorOption;
  product?: Product;
};

function optionRows(configurators: Configurator[], products: Product[]) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return configurators.flatMap((configurator) => configurator.steps.flatMap((step) => step.options.map((option) => ({
    configurator,
    step,
    option,
    product: option.product_id ? productsById.get(option.product_id) : undefined,
  } satisfies OptionRow))));
}

function rowKey(configuratorId: string, optionId: string) {
  return `${configuratorId}:${optionId}`;
}

function pairKey(configuratorId: string, a: string, b: string) {
  return `${configuratorId}:${[a, b].sort().join("<>")}`;
}

function buildRules(rows: OptionRow[]): CompatibilityMatrixRule[] {
  const rowById = new Map(rows.map((row) => [rowKey(row.configurator.id, row.option.id), row]));
  return rows.flatMap((row) => row.option.incompatible_option_ids.map((targetId) => {
    const target = rowById.get(rowKey(row.configurator.id, targetId));
    const reciprocal = Boolean(target?.option.incompatible_option_ids.includes(row.option.id));
    const stale = !target;
    const status: CompatibilityRuleStatus = stale ? "fail" : reciprocal ? "pass" : "warn";
    return {
      id: `rule-${row.configurator.id}-${row.option.id}-${targetId}`,
      configuratorId: row.configurator.id,
      configuratorName: row.configurator.name,
      sourceOptionId: row.option.id,
      sourceOptionLabel: row.option.label,
      sourceStepTitle: row.step.title,
      sourceProductName: row.product?.name,
      targetOptionId: targetId,
      targetOptionLabel: target?.option.label || targetId,
      targetStepTitle: target?.step.title,
      targetProductName: target?.product?.name,
      reciprocal,
      status,
      evidence: stale
        ? `${row.option.label} points at missing option ${targetId}.`
        : reciprocal
          ? `${row.option.label} and ${target.option.label} block each other.`
          : `${row.option.label} blocks ${target.option.label}, but the reverse reference is not explicitly stored.`,
      shopperMessage: stale
        ? "This rule cannot protect shoppers until the missing option reference is repaired."
        : `If a shopper chooses ${row.option.label}, Findly should prevent ${target.option.label} from entering the same bundle.`,
    } satisfies CompatibilityMatrixRule;
  }));
}

function buildOptions(rows: OptionRow[]): CompatibilityOptionNode[] {
  return rows.map((row) => ({
    id: row.option.id,
    label: row.option.label,
    stepTitle: row.step.title,
    configuratorName: row.configurator.name,
    productName: row.product?.name,
    activeProduct: row.option.product_id ? Boolean(row.product?.active) : true,
    priceDelta: row.option.price_delta,
    tags: row.option.tags,
    ruleCount: row.option.incompatible_option_ids.length,
  })).sort((a, b) => b.ruleCount - a.ruleCount || a.configuratorName.localeCompare(b.configuratorName) || a.label.localeCompare(b.label));
}

function guardedStepCount(configurators: Configurator[]) {
  return configurators.reduce((sum, configurator) => sum + configurator.steps.filter((step) => step.options.some((option) => option.incompatible_option_ids.length)).length, 0);
}

function unguardedMultiOptionSteps(configurators: Configurator[]) {
  return configurators.flatMap((configurator) => configurator.steps
    .filter((step) => step.options.length > 1 && step.options.every((option) => !option.incompatible_option_ids.length))
    .map((step) => `${configurator.name} · ${step.title}`));
}

function buildChecks(summary: CompatibilityMatrixReport["summary"], qaStatus: CompatibilityRuleStatus): CompatibilityMatrixCheck[] {
  return [
    {
      id: "rule-coverage",
      label: "Compatibility rule coverage",
      status: summary.compatibilityRules ? "pass" : "warn",
      detail: summary.compatibilityRules ? "At least one incompatibility rule is available for public runtime validation." : "No compatibility rules are available to test yet.",
      evidence: `${summary.compatibilityRules} rule reference${summary.compatibilityRules === 1 ? "" : "s"} across ${summary.configurators} configurator${summary.configurators === 1 ? "" : "s"}.`,
    },
    {
      id: "stale-references",
      label: "Stale option references",
      status: summary.staleRules ? "fail" : "pass",
      detail: summary.staleRules ? "Some compatibility rules point at deleted or unknown options." : "Every compatibility reference points at a known option.",
      evidence: `${summary.staleRules} stale reference${summary.staleRules === 1 ? "" : "s"}.`,
    },
    {
      id: "product-links",
      label: "Linked product availability",
      status: summary.inactiveProductLinks ? "fail" : summary.productLinkedOptions ? "pass" : "warn",
      detail: summary.inactiveProductLinks ? "Some product-linked configurator options point at inactive or missing products." : "Product-linked options are available for bundle totals and checkout handoff.",
      evidence: `${summary.productLinkedOptions} product-linked option${summary.productLinkedOptions === 1 ? "" : "s"}; ${summary.inactiveProductLinks} unavailable.`,
    },
    {
      id: "reciprocal-review",
      label: "Readable two-way matrix",
      status: summary.oneWayRules ? "warn" : summary.compatibilityRules ? "pass" : "warn",
      detail: summary.oneWayRules ? "One-way rules are enforced by runtime validation, but two-way references are easier for merchants to audit." : "Compatibility references are stored as a readable two-way matrix where rules exist.",
      evidence: `${summary.reciprocalRules} reciprocal references, ${summary.oneWayRules} one-way references.`,
    },
    {
      id: "path-qa",
      label: "Configurator path QA",
      status: qaStatus,
      detail: qaStatus === "fail" ? "Configurator QA found a guardrail failure." : "Configurator QA can validate blocked pairs and completion paths.",
      evidence: `${summary.qaScore}% QA score; ${summary.failedQaGuardrails} failed guardrail scenario${summary.failedQaGuardrails === 1 ? "" : "s"}.`,
    },
  ];
}

function score(summary: CompatibilityMatrixReport["summary"]) {
  if (!summary.configurators) return 0;
  return Math.max(0, Math.min(100, Math.round(
    30 +
    Math.min(15, summary.publishedConfigurators * 15) +
    Math.min(20, summary.blockedPairs * 5) +
    Math.min(15, summary.productLinkedOptions * 4) +
    Math.min(10, summary.guardedSteps * 3) +
    Math.min(10, summary.qaScore / 10) -
    summary.staleRules * 20 -
    summary.inactiveProductLinks * 18 -
    summary.oneWayRules * 2 -
    summary.failedQaGuardrails * 25,
  )));
}

function reportStatus(summary: CompatibilityMatrixReport["summary"], scoreValue: number): CompatibilityMatrixStatus {
  if (!summary.configurators) return "empty";
  if (summary.staleRules || summary.inactiveProductLinks || summary.failedQaGuardrails) return "needs-attention";
  if (scoreValue >= 82 && summary.compatibilityRules) return "ready";
  return "watch";
}

function headline(status: CompatibilityMatrixStatus, summary: CompatibilityMatrixReport["summary"]) {
  if (status === "empty") return "Create a configurator before building a compatibility matrix.";
  if (status === "needs-attention") return "Compatibility rules exist, but stale references or product-link issues need repair before launch.";
  if (status === "watch") return "Compatibility coverage is usable; add more explicit blocked pairs before scaling complex bundles.";
  return `${summary.blockedPairs} blocked product-choice pair${summary.blockedPairs === 1 ? "" : "s"} are ready for shopper-safe configurator launch.`;
}

function buildActions(report: Omit<CompatibilityMatrixReport, "actions" | "packet" | "headline" | "status" | "score">): CompatibilityMatrixAction[] {
  const actions: CompatibilityMatrixAction[] = [];
  if (!report.summary.configurators) {
    actions.push({
      id: "create-configurator",
      priority: "critical",
      title: "Create a configurator to define dependencies",
      detail: "Compatibility matrices are built from configurator options and incompatibility references.",
      evidence: "0 configurators found.",
      actionHref: "/dashboard/configurators",
      actionLabel: "Create configurator",
    });
  }
  if (report.summary.staleRules) {
    actions.push({
      id: "repair-stale-rules",
      priority: "critical",
      title: "Repair stale compatibility references",
      detail: "Rules pointing at deleted options cannot protect shoppers from impossible carts.",
      evidence: `${report.summary.staleRules} stale rule reference${report.summary.staleRules === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Review rules",
    });
  }
  if (report.summary.inactiveProductLinks) {
    actions.push({
      id: "repair-product-links",
      priority: "high",
      title: "Fix unavailable product links",
      detail: "Product-linked options need active catalog products so totals, explanations and checkout URLs stay reliable.",
      evidence: `${report.summary.inactiveProductLinks} unavailable product link${report.summary.inactiveProductLinks === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/products",
      actionLabel: "Review products",
    });
  }
  if (!report.summary.compatibilityRules && report.summary.options > 2) {
    actions.push({
      id: "add-first-guardrail",
      priority: "high",
      title: "Add the first compatibility guardrail",
      detail: "Multi-option configurators are easier to trust when at least one impossible pairing is modeled and tested.",
      evidence: `${report.summary.options} options, 0 compatibility rules.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Add guardrail",
    });
  }
  if (report.summary.oneWayRules) {
    actions.push({
      id: "mirror-one-way-rules",
      priority: "medium",
      title: "Mirror one-way rules for merchant readability",
      detail: "Runtime validation enforces either direction, but explicit two-way rules make the matrix easier to audit.",
      evidence: `${report.summary.oneWayRules} one-way reference${report.summary.oneWayRules === 1 ? "" : "s"}.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Mirror rules",
    });
  }
  if (report.summary.unguardedMultiOptionSteps) {
    actions.push({
      id: "review-unguarded-steps",
      priority: "low",
      title: "Review unguarded option groups",
      detail: "Some multi-option steps may be safe as-is, but they should be reviewed for dependency gaps before B2B launches.",
      evidence: `${report.summary.unguardedMultiOptionSteps} multi-option step${report.summary.unguardedMultiOptionSteps === 1 ? "" : "s"} have no rules.`,
      actionHref: "/dashboard/compatibility",
      actionLabel: "Inspect matrix",
    });
  }
  return actions.slice(0, 5);
}

function buildPacket(report: Omit<CompatibilityMatrixReport, "packet">) {
  return [
    "Findly Compatibility Matrix packet",
    "",
    `Status: ${report.status} · Score: ${report.score}%`,
    `Headline: ${report.headline}`,
    "",
    "Summary",
    `- Configurators: ${report.summary.publishedConfigurators}/${report.summary.configurators} published`,
    `- Options: ${report.summary.options}`,
    `- Product-linked options: ${report.summary.productLinkedOptions}`,
    `- Compatibility rules: ${report.summary.compatibilityRules}`,
    `- Unique blocked pairs: ${report.summary.blockedPairs}`,
    `- Stale references: ${report.summary.staleRules}`,
    `- Failed QA guardrails: ${report.summary.failedQaGuardrails}`,
    "",
    "Matrix rows",
    ...report.rules.slice(0, 8).map((rule, index) => `${index + 1}. [${rule.status}] ${rule.sourceOptionLabel} blocks ${rule.targetOptionLabel} — ${rule.evidence}`),
    "",
    "Action queue",
    ...report.actions.map((action, index) => `${index + 1}. [${action.priority}] ${action.title}: ${action.detail}`),
  ].join("\n");
}

export function buildCompatibilityMatrixReport({ products, configurators }: { products: Product[]; configurators: Configurator[] }): CompatibilityMatrixReport {
  const rows = optionRows(configurators, products);
  const options = buildOptions(rows);
  const rules = buildRules(rows);
  const qa = buildConfiguratorQaReport(configurators, products);
  const uniquePairs = new Set(rules.filter((rule) => rule.status !== "fail").map((rule) => pairKey(rule.configuratorId, rule.sourceOptionId, rule.targetOptionId)));
  const inactiveProductLinks = options.filter((option) => !option.activeProduct).length;
  const staleRules = rules.filter((rule) => rule.status === "fail").length;
  const oneWayRules = rules.filter((rule) => rule.status === "warn").length;
  const reciprocalRules = rules.filter((rule) => rule.reciprocal).length;
  const unguarded = unguardedMultiOptionSteps(configurators);
  const summary = {
    configurators: configurators.length,
    publishedConfigurators: configurators.filter((configurator) => configurator.published).length,
    options: rows.length,
    productLinkedOptions: rows.filter((row) => row.option.product_id).length,
    inactiveProductLinks,
    compatibilityRules: rules.length,
    blockedPairs: uniquePairs.size,
    reciprocalRules,
    oneWayRules,
    staleRules,
    guardedSteps: guardedStepCount(configurators),
    unguardedMultiOptionSteps: unguarded.length,
    qaScore: qa.score,
    failedQaGuardrails: qa.summary.failedGuardrails,
  };
  const scoreValue = score(summary);
  const status = reportStatus(summary, scoreValue);
  const checks = buildChecks(summary, qa.status === "fail" ? "fail" : qa.status === "warn" ? "warn" : "pass");
  const partial = {
    status,
    score: scoreValue,
    headline: headline(status, summary),
    summary,
    options,
    rules: rules.sort((a, b) => a.status.localeCompare(b.status) || a.configuratorName.localeCompare(b.configuratorName) || a.sourceOptionLabel.localeCompare(b.sourceOptionLabel)),
    checks,
  };
  const actions = buildActions(partial);
  return {
    ...partial,
    actions,
    packet: buildPacket({ ...partial, actions }),
  };
}
