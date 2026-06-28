import { buildAnalyticsSnapshot, stageRate } from "./analytics";
import { buildCommercialImpactReport } from "./commercial-impact";
import { buildConfiguratorQaReport } from "./configurator-qa";
import { buildZeroPartyInsights } from "./insights";
import type { AnalyticsEvent, Configurator, ConfiguratorOption, Product } from "./types";
import { flattenConfiguratorOptions, formatCurrency, optionConflictsWithSelection, uniqueValues } from "./utils";

export type BundleStudioStatus = "empty" | "needs-attention" | "watch" | "ready";
export type BundleOpportunityStatus = "risk" | "watch" | "ready";
export type BundleCompatibilityStatus = "needs-rules" | "open" | "guarded";
export type BundleActionPriority = "critical" | "high" | "medium" | "low";
export type BundleAttachSignalStatus = "risk" | "watch" | "healthy";

export type BundleAddOn = {
  id: string;
  label: string;
  priceDelta: number;
  tags: string[];
};

export type BundleOpportunity = {
  id: string;
  title: string;
  anchorProductId?: string;
  anchorProductName: string;
  configuratorName: string;
  addOns: BundleAddOn[];
  estimatedLift: number;
  compatibility: BundleCompatibilityStatus;
  status: BundleOpportunityStatus;
  evidence: string;
  nextStep: string;
  actionHref: string;
};

export type BundleAttachSignal = {
  id: string;
  label: string;
  count: number;
  value: number;
  detail: string;
  status: BundleAttachSignalStatus;
};

export type BundleStudioAction = {
  id: string;
  priority: BundleActionPriority;
  title: string;
  detail: string;
  evidence: string;
  actionHref: string;
  actionLabel: string;
};

export type BundleStudioReport = {
  status: BundleStudioStatus;
  score: number;
  headline: string;
  summary: {
    configurators: number;
    publishedConfigurators: number;
    anchorProducts: number;
    addOns: number;
    compatibilityRules: number;
    bundleCompletions: number;
    bundleClicks: number;
    averageBundleValue: number;
    attachRate: number;
    assistedBundleValue: number;
    opportunities: number;
  };
  opportunities: BundleOpportunity[];
  signals: BundleAttachSignal[];
  actions: BundleStudioAction[];
  packet: string;
};

type ConfiguratorOptionRow = {
  configurator: Configurator;
  option: ConfiguratorOption;
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^0-9.-]+/g, "")) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()) : [];
}

function isConfiguratorEvent(event: AnalyticsEvent) {
  return event.metadata?.experience_type === "configurator" || event.quiz_id.startsWith("config_");
}

function activeProductMap(products: Product[]) {
  return new Map(products.filter((product) => product.active).map((product) => [product.id, product]));
}

function allOptionRows(configurators: Configurator[]): ConfiguratorOptionRow[] {
  return configurators.flatMap((configurator) => flattenConfiguratorOptions(configurator).map((option) => ({ configurator, option })));
}

function compatibilityRules(configurators: Configurator[]) {
  return configurators.reduce((sum, configurator) => sum + flattenConfiguratorOptions(configurator).reduce((count, option) => count + option.incompatible_option_ids.length, 0), 0);
}

function commonTags(a: string[], b: string[]) {
  const bSet = new Set(b.map((tag) => tag.toLowerCase()));
  return a.filter((tag) => bSet.has(tag.toLowerCase())).length;
}

function uniqueSelectedBundleEvents(events: AnalyticsEvent[]) {
  return events.filter((event) => isConfiguratorEvent(event) && (event.event_type === "quiz_complete" || event.event_type === "buy_click"));
}

function eventHasAddOn(event: AnalyticsEvent, addOnLabels: Set<string>) {
  const selectedNames = stringArray(event.metadata?.selected_option_names);
  return selectedNames.some((name) => addOnLabels.has(name));
}

function totalValue(events: AnalyticsEvent[]) {
  return events.reduce((sum, event) => sum + numberValue(event.metadata?.total), 0);
}

function productDemandById(events: AnalyticsEvent[], products: Product[]) {
  const insights = buildZeroPartyInsights(events, products);
  const productsByName = new Map(products.map((product) => [product.name.toLowerCase(), product.id]));
  const demand = new Map<string, { recommended: number; clicks: number; clickRate: number }>();
  for (const item of insights.productDemand) {
    const productId = item.productId || productsByName.get(item.productName.toLowerCase());
    if (!productId) continue;
    demand.set(productId, { recommended: item.recommended, clicks: item.clicks, clickRate: item.clickRate });
  }
  return demand;
}

function compatibleAddOns(configurator: Configurator, anchor: ConfiguratorOption, addOns: ConfiguratorOption[]) {
  return addOns
    .filter((option) => option.id !== anchor.id && option.price_delta > 0 && !optionConflictsWithSelection(option, [anchor.id], configurator))
    .sort((a, b) => commonTags(b.tags, anchor.tags) - commonTags(a.tags, anchor.tags) || b.price_delta - a.price_delta || a.label.localeCompare(b.label));
}

function buildOpportunityStatus(addOns: ConfiguratorOption[], compatibility: BundleCompatibilityStatus): BundleOpportunityStatus {
  if (!addOns.length || compatibility === "needs-rules") return "risk";
  if (addOns.length < 2 || compatibility === "open") return "watch";
  return "ready";
}

function compatibilityStatus(configurator: Configurator, anchor: ConfiguratorOption, addOns: ConfiguratorOption[]): BundleCompatibilityStatus {
  const hasAnyRules = flattenConfiguratorOptions(configurator).some((option) => option.incompatible_option_ids.length);
  if (!hasAnyRules) return "needs-rules";
  const guarded = addOns.some((option) => option.incompatible_option_ids.length || anchor.incompatible_option_ids.includes(option.id));
  return guarded ? "guarded" : "open";
}

function buildOpportunities(configurators: Configurator[], products: Product[], events: AnalyticsEvent[]): BundleOpportunity[] {
  const productsById = activeProductMap(products);
  const demand = productDemandById(events, products);
  const rows = allOptionRows(configurators);
  const addOnRows = rows.filter(({ option }) => option.price_delta > 0 && !option.product_id);
  const addOnsByConfigurator = new Map(configurators.map((configurator) => [configurator.id, addOnRows.filter((row) => row.configurator.id === configurator.id).map((row) => row.option)]));

  return rows
    .filter(({ option }) => option.product_id && productsById.has(option.product_id))
    .map(({ configurator, option }) => {
      const product = productsById.get(option.product_id || "");
      const addOns = compatibleAddOns(configurator, option, addOnsByConfigurator.get(configurator.id) || []).slice(0, 3);
      const compatibility = compatibilityStatus(configurator, option, addOns);
      const attachValue = addOns.reduce((sum, addOn) => sum + addOn.price_delta, 0);
      const productDemand = option.product_id ? demand.get(option.product_id) : undefined;
      const status = buildOpportunityStatus(addOns, compatibility);
      const selectedTags = uniqueValues([...option.tags, ...addOns.flatMap((addOn) => addOn.tags)]).slice(0, 4);
      return {
        id: `bundle-${configurator.id}-${option.id}`,
        title: `Attach ${addOns[0]?.label || "the strongest add-on"} to ${product?.name || option.label}`,
        anchorProductId: product?.id,
        anchorProductName: product?.name || option.label,
        configuratorName: configurator.name,
        addOns: addOns.map((addOn) => ({ id: addOn.id, label: addOn.label, priceDelta: addOn.price_delta, tags: addOn.tags })),
        estimatedLift: attachValue,
        compatibility,
        status,
        evidence: `${productDemand?.recommended || 0} recommendation${productDemand?.recommended === 1 ? "" : "s"}, ${productDemand?.clicks || 0} buy click${productDemand?.clicks === 1 ? "" : "s"} and ${selectedTags.length ? selectedTags.join(", ") : "catalog"} signals support this bundle.`,
        nextStep: status === "risk" ? "Add compatible paid extras or guardrails before promoting this bundle." : "Promote this as a ready PDP or collection-page bundle path.",
        actionHref: "/dashboard/configurators",
      };
    })
    .sort((a, b) => b.status.localeCompare(a.status) || b.estimatedLift - a.estimatedLift || a.anchorProductName.localeCompare(b.anchorProductName))
    .slice(0, 6);
}

function buildSignals(input: {
  bundleCompletions: number;
  bundleClicks: number;
  averageBundleValue: number;
  attachRate: number;
  assistedBundleValue: number;
  compatibilityRuleCount: number;
}): BundleAttachSignal[] {
  return [
    {
      id: "bundle-completion-signal",
      label: "Configurator completions",
      count: input.bundleCompletions,
      value: input.averageBundleValue,
      detail: input.bundleCompletions ? `${formatCurrency(input.averageBundleValue)} average completed bundle value.` : "No completed configurator bundles captured yet.",
      status: input.bundleCompletions ? "healthy" : "risk",
    },
    {
      id: "attach-rate-signal",
      label: "Paid attach rate",
      count: Math.round(input.attachRate),
      value: input.attachRate,
      detail: `${Math.round(input.attachRate)}% of completed/clicked configurator journeys included a paid extra.`,
      status: input.attachRate >= 60 ? "healthy" : input.attachRate >= 30 ? "watch" : "risk",
    },
    {
      id: "bundle-click-signal",
      label: "Bundle buy clicks",
      count: input.bundleClicks,
      value: input.assistedBundleValue,
      detail: `${formatCurrency(input.assistedBundleValue)} in assisted configurator click value.`,
      status: input.bundleClicks ? "healthy" : "watch",
    },
    {
      id: "compatibility-signal",
      label: "Compatibility guardrails",
      count: input.compatibilityRuleCount,
      value: input.compatibilityRuleCount,
      detail: input.compatibilityRuleCount ? `${input.compatibilityRuleCount} incompatibility references protect bundle quality.` : "No incompatibility rules are protecting bundle choices.",
      status: input.compatibilityRuleCount ? "healthy" : "risk",
    },
  ];
}

function buildActions(report: Omit<BundleStudioReport, "actions" | "packet" | "headline" | "status" | "score">, configurators: Configurator[]): BundleStudioAction[] {
  const actions: BundleStudioAction[] = [];
  if (!report.summary.configurators) {
    actions.push({
      id: "create-configurator-bundle",
      priority: "critical",
      title: "Create the first bundle configurator",
      detail: "Bundle Studio needs at least one visual configurator with product-linked anchor choices and paid add-ons.",
      evidence: "0 configurators found in this workspace.",
      actionHref: "/dashboard/configurators",
      actionLabel: "Create configurator",
    });
  }

  if (report.summary.configurators > 0 && !report.summary.publishedConfigurators) {
    actions.push({
      id: "publish-bundle-builder",
      priority: "high",
      title: "Publish a bundle builder",
      detail: "Draft configurators cannot collect storefront attach signals until they are published and embedded.",
      evidence: `${configurators.length} configurator${configurators.length === 1 ? "" : "s"} exist, 0 are published.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Review publish checks",
    });
  }

  if (!report.summary.addOns) {
    actions.push({
      id: "add-paid-extras",
      priority: "high",
      title: "Add paid extras to raise order value",
      detail: "Product-linked anchor choices are strongest when shoppers can attach compatible accessories, care kits, services or upgrades.",
      evidence: "No paid non-anchor configurator options were detected.",
      actionHref: "/dashboard/configurators",
      actionLabel: "Add extras",
    });
  }

  if (!report.summary.compatibilityRules) {
    actions.push({
      id: "add-compatibility-rules",
      priority: "high",
      title: "Protect bundles with compatibility rules",
      detail: "Bundle attach recommendations need guardrails so shoppers cannot build impossible or poor-fit carts.",
      evidence: "0 incompatibility references found across configurator options.",
      actionHref: "/dashboard/configurators",
      actionLabel: "Add guardrails",
    });
  }

  if (report.summary.bundleCompletions > 0 && report.summary.attachRate < 50) {
    actions.push({
      id: "improve-attach-rate",
      priority: "medium",
      title: "Improve paid attach rate",
      detail: "Shoppers are completing bundles, but too few journeys include a paid extra.",
      evidence: `${Math.round(report.summary.attachRate)}% paid attach rate across configurator completions/clicks.`,
      actionHref: "/dashboard/configurators",
      actionLabel: "Tune add-ons",
    });
  }

  const topOpportunity = report.opportunities[0];
  if (topOpportunity) {
    actions.push({
      id: "launch-top-bundle",
      priority: topOpportunity.status === "ready" ? "low" : "medium",
      title: `Launch ${topOpportunity.anchorProductName} bundle path`,
      detail: topOpportunity.nextStep,
      evidence: `${topOpportunity.addOns.length} compatible paid add-on${topOpportunity.addOns.length === 1 ? "" : "s"} worth ${formatCurrency(topOpportunity.estimatedLift)}.`,
      actionHref: topOpportunity.actionHref,
      actionLabel: "Open configurator",
    });
  }

  if (report.summary.publishedConfigurators > 0 && !report.summary.bundleCompletions) {
    actions.push({
      id: "capture-bundle-telemetry",
      priority: "medium",
      title: "Capture bundle telemetry",
      detail: "A published configurator exists, but Sellentum has not seen completed configurator journeys in this analytics window.",
      evidence: "0 completed configurator journeys.",
      actionHref: "/dashboard/widget-studio",
      actionLabel: "Check widget install",
    });
  }

  return actions.slice(0, 5);
}

function scoreReport(summary: BundleStudioReport["summary"], qaScore: number) {
  if (!summary.configurators) return 0;
  return Math.min(100, Math.round(
    15 +
    Math.min(20, summary.publishedConfigurators * 20) +
    Math.min(20, summary.anchorProducts * 7) +
    Math.min(15, summary.addOns * 4) +
    (summary.compatibilityRules ? 15 : 0) +
    (summary.bundleCompletions ? 8 : 0) +
    (summary.bundleClicks ? 4 : 0) +
    Math.min(3, qaScore / 35),
  ));
}

function reportStatus(score: number, summary: BundleStudioReport["summary"]): BundleStudioStatus {
  if (!summary.configurators) return "empty";
  if (score >= 82) return "ready";
  if (score >= 62) return "watch";
  return "needs-attention";
}

function headline(status: BundleStudioStatus, summary: BundleStudioReport["summary"]) {
  if (status === "empty") return "Create a configurator to turn single-product recommendations into guided bundles.";
  if (status === "needs-attention") return "Bundle logic exists, but it needs stronger add-ons, publishing or compatibility guardrails before promotion.";
  if (status === "watch") return "Bundle foundations are live; tune attach offers and telemetry before scaling across storefront placements.";
  return `${summary.opportunities} bundle opportunities are ready to increase guided-selling order value.`;
}

function buildPacket(report: Omit<BundleStudioReport, "packet">) {
  const lines = [
    "Sellentum Bundle & Attach Studio packet",
    "",
    `Status: ${report.status} · Score: ${report.score}%`,
    `Headline: ${report.headline}`,
    "",
    "Summary",
    `- Configurators: ${report.summary.publishedConfigurators}/${report.summary.configurators} published`,
    `- Anchor products: ${report.summary.anchorProducts}`,
    `- Paid add-ons: ${report.summary.addOns}`,
    `- Compatibility guardrails: ${report.summary.compatibilityRules}`,
    `- Bundle completions: ${report.summary.bundleCompletions}`,
    `- Paid attach rate: ${Math.round(report.summary.attachRate)}%`,
    `- Average bundle value: ${formatCurrency(report.summary.averageBundleValue)}`,
    `- Assisted bundle value: ${formatCurrency(report.summary.assistedBundleValue)}`,
    "",
    "Top opportunities",
    ...report.opportunities.slice(0, 4).map((item, index) => `${index + 1}. ${item.title} — ${formatCurrency(item.estimatedLift)} add-on value · ${item.compatibility}. ${item.evidence}`),
    "",
    "Action queue",
    ...report.actions.slice(0, 4).map((item, index) => `${index + 1}. [${item.priority}] ${item.title}: ${item.detail}`),
  ];
  return lines.join("\n");
}

export function buildBundleStudioReport(input: { products: Product[]; configurators: Configurator[]; events: AnalyticsEvent[] }): BundleStudioReport {
  const productsById = activeProductMap(input.products);
  const optionRows = allOptionRows(input.configurators);
  const anchorOptions = optionRows.filter(({ option }) => option.product_id && productsById.has(option.product_id));
  const addOnOptions = optionRows.filter(({ option }) => option.price_delta > 0 && !option.product_id);
  const configEvents = input.events.filter(isConfiguratorEvent);
  const snapshot = buildAnalyticsSnapshot(configEvents);
  const selectedBundleEvents = uniqueSelectedBundleEvents(configEvents);
  const addOnLabels = new Set(addOnOptions.map(({ option }) => option.label));
  const attachedEvents = selectedBundleEvents.filter((event) => eventHasAddOn(event, addOnLabels));
  const valueEvents = configEvents.filter((event) => event.event_type === "quiz_complete" || event.event_type === "buy_click").filter((event) => numberValue(event.metadata?.total) > 0);
  const clickValueEvents = configEvents.filter((event) => event.event_type === "buy_click" && numberValue(event.metadata?.total) > 0);
  const commercialImpact = buildCommercialImpactReport(configEvents, input.products);
  const qa = buildConfiguratorQaReport(input.configurators, input.products);
  const opportunities = buildOpportunities(input.configurators, input.products, input.events);
  const summary = {
    configurators: input.configurators.length,
    publishedConfigurators: input.configurators.filter((configurator) => configurator.published).length,
    anchorProducts: uniqueValues(anchorOptions.map(({ option }) => option.product_id || "")).length,
    addOns: addOnOptions.length,
    compatibilityRules: compatibilityRules(input.configurators),
    bundleCompletions: snapshot.completed,
    bundleClicks: snapshot.clicked,
    averageBundleValue: valueEvents.length ? totalValue(valueEvents) / valueEvents.length : qa.summary.averageBundleValue,
    attachRate: stageRate(attachedEvents.length, selectedBundleEvents.length),
    assistedBundleValue: totalValue(clickValueEvents) || commercialImpact.summary.influencedRevenue,
    opportunities: opportunities.length,
  };
  const signals = buildSignals({
    bundleCompletions: summary.bundleCompletions,
    bundleClicks: summary.bundleClicks,
    averageBundleValue: summary.averageBundleValue,
    attachRate: summary.attachRate,
    assistedBundleValue: summary.assistedBundleValue,
    compatibilityRuleCount: summary.compatibilityRules,
  });
  const score = scoreReport(summary, qa.score);
  const status = reportStatus(score, summary);
  const partial = {
    status,
    score,
    headline: headline(status, summary),
    summary,
    opportunities,
    signals,
  };
  const actions = buildActions(partial, input.configurators);
  return {
    ...partial,
    actions,
    packet: buildPacket({ ...partial, actions }),
  };
}
