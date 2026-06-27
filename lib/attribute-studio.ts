import { buildCatalogBenefitReport } from "./catalog-benefits";
import { analyzeCatalogIntelligence } from "./catalog-intelligence";
import type { Product } from "@/lib/types";

export type AttributeStudioStatus = "ready" | "review" | "blocked";
export type AttributeKind = "category" | "benefit" | "material" | "measurement" | "price_band" | "compatibility" | "catalog_signal";
export type AttributeStudioItemStatus = "approved" | "review" | "missing";
export type AttributeActionPriority = "critical" | "high" | "medium" | "low";

export type NormalizedAttribute = {
  id: string;
  kind: AttributeKind;
  label: string;
  canonicalValue: string;
  aliases: string[];
  productCount: number;
  productIds: string[];
  sampleProducts: string[];
  confidence: number;
  status: AttributeStudioItemStatus;
  shopperBenefit: string;
  suggestedQuestion: string;
};

export type AttributeConflictGroup = {
  id: string;
  label: string;
  status: "pass" | "warn";
  canonicalValue: string;
  variants: Array<{ value: string; productCount: number; sampleProducts: string[] }>;
  recommendation: string;
};

export type AttributeProductTask = {
  productId: string;
  productName: string;
  score: number;
  status: AttributeStudioItemStatus;
  normalizedAttributes: string[];
  missingFields: string[];
  suggestedTags: string[];
  suggestedBuyerNeeds: string[];
  suggestedSearchText: string;
};

export type AttributeStudioAction = {
  id: string;
  priority: AttributeActionPriority;
  title: string;
  detail: string;
  evidence: string;
  href: string;
  label: string;
};

export type AttributeStudioReport = {
  status: AttributeStudioStatus;
  score: number;
  headline: string;
  summary: {
    activeProducts: number;
    normalizedAttributes: number;
    approvedAttributes: number;
    reviewAttributes: number;
    missingProductTasks: number;
    conflictGroups: number;
    benefitCoverage: number;
    catalogScore: number;
  };
  attributes: NormalizedAttribute[];
  conflictGroups: AttributeConflictGroup[];
  productTasks: AttributeProductTask[];
  actions: AttributeStudioAction[];
  glossary: string;
  packet: string;
};

type AttributeSeed = {
  kind: AttributeKind;
  canonicalValue: string;
  label: string;
  alias: string;
  product: Product;
  shopperBenefit: string;
  suggestedQuestion: string;
};

type Rule = {
  id: string;
  kind: AttributeKind;
  label: string;
  canonicalValue: string;
  aliases: string[];
  shopperBenefit: string;
  suggestedQuestion: string;
};

const rules: Rule[] = [
  {
    id: "water-resistance",
    kind: "benefit",
    label: "Water resistance",
    canonicalValue: "wet-weather protection",
    aliases: ["waterproof", "water resistant", "water-resistant", "rain", "wet", "weatherproof"],
    shopperBenefit: "Keeps shoppers confident around rain, spills or unpredictable conditions.",
    suggestedQuestion: "Do you need protection from wet conditions?",
  },
  {
    id: "lightweight",
    kind: "benefit",
    label: "Lightweight portability",
    canonicalValue: "lightweight feel",
    aliases: ["lightweight", "light", "portable", "nimble", "low weight"],
    shopperBenefit: "Feels easier to carry, wear or use for longer sessions.",
    suggestedQuestion: "Is a lighter product important?",
  },
  {
    id: "comfort",
    kind: "benefit",
    label: "Long-use comfort",
    canonicalValue: "all-day comfort",
    aliases: ["comfort", "comfortable", "cushion", "cushioning", "soft", "ergonomic", "stable"],
    shopperBenefit: "Reduces fatigue or friction when shoppers use the product for longer.",
    suggestedQuestion: "Will comfort over long use matter most?",
  },
  {
    id: "traction",
    kind: "benefit",
    label: "Terrain traction",
    canonicalValue: "outdoor grip",
    aliases: ["trail", "grip", "traction", "outdoor", "outdoors", "hiking", "mud"],
    shopperBenefit: "Gives shoppers more control in demanding or uneven conditions.",
    suggestedQuestion: "Will this be used outdoors or on tougher surfaces?",
  },
  {
    id: "speed",
    kind: "benefit",
    label: "Fast performance",
    canonicalValue: "responsive performance",
    aliases: ["speed", "fast", "race", "responsive", "performance", "quick"],
    shopperBenefit: "Helps shoppers move faster or complete tasks with less delay.",
    suggestedQuestion: "Are speed and responsiveness a priority?",
  },
  {
    id: "durability",
    kind: "benefit",
    label: "Durability",
    canonicalValue: "built to last",
    aliases: ["durable", "tough", "reinforced", "rugged", "long lasting", "heavy duty"],
    shopperBenefit: "Improves confidence for repeat use or demanding environments.",
    suggestedQuestion: "Does the product need to withstand frequent use?",
  },
  {
    id: "compact",
    kind: "benefit",
    label: "Compact footprint",
    canonicalValue: "space-saving fit",
    aliases: ["compact", "small", "space saving", "foldable", "minimal"],
    shopperBenefit: "Works better when shoppers have limited room or want less clutter.",
    suggestedQuestion: "Is saving space or keeping the setup minimal important?",
  },
  {
    id: "compatibility",
    kind: "compatibility",
    label: "Compatibility",
    canonicalValue: "compatible setup",
    aliases: ["compatible", "compatibility", "fits", "kit", "bundle", "modular", "addon", "add-on"],
    shopperBenefit: "Helps shoppers avoid choosing parts or options that do not work together.",
    suggestedQuestion: "Do you need Findly to keep selected parts compatible?",
  },
  {
    id: "premium",
    kind: "benefit",
    label: "Premium capability",
    canonicalValue: "premium capability",
    aliases: ["premium", "pro", "professional", "luxury", "advanced"],
    shopperBenefit: "Fits shoppers who want higher-end materials, controls or finish.",
    suggestedQuestion: "Are you shopping for a premium or professional-grade option?",
  },
];

const materialAliases: Record<string, string[]> = {
  mesh: ["mesh", "knit", "woven"],
  rubber: ["rubber", "grip rubber", "outsole"],
  foam: ["foam", "eva", "midsole"],
  leather: ["leather", "suede"],
  metal: ["steel", "aluminum", "aluminium", "metal", "alloy"],
  wood: ["wood", "oak", "walnut"],
  glass: ["glass", "ceramic"],
  cotton: ["cotton", "canvas", "fabric"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9.£$€ ]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleize(value: string) {
  const normalized = normalize(value);
  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Untitled";
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function productText(product: Product) {
  return normalize([
    product.name,
    product.category,
    product.description,
    product.search_text || "",
    ...product.features,
    ...product.tags,
    ...(product.buyer_needs || []),
  ].join(" "));
}

function priceBand(product: Product): AttributeSeed {
  const canonicalValue = product.price <= 100 ? "entry price band" : product.price <= 180 ? "mid-market price band" : "premium price band";
  return {
    kind: "price_band",
    canonicalValue,
    label: titleize(canonicalValue),
    alias: canonicalValue,
    product,
    shopperBenefit: product.price <= 100 ? "Keeps recommendations value-conscious." : product.price <= 180 ? "Balances price and capability for mainstream shoppers." : "Frames higher-priced options as premium choices.",
    suggestedQuestion: "What budget range feels comfortable?",
  };
}

function measurementSeeds(product: Product): AttributeSeed[] {
  const text = productText(product);
  const matches = text.match(/\b\d+(?:\.\d+)?\s?(?:mm|cm|m|in|inch|inches|kg|g|lb|lbs|w|watts|mah|gb|tb)\b/g) || [];
  return unique(matches).slice(0, 6).map((match) => ({
    kind: "measurement",
    canonicalValue: normalize(match).replace(/\binches?\b/g, "in").replace(/\bwatts?\b/g, "w"),
    label: `Measurement ${match.toUpperCase()}`,
    alias: match,
    product,
    shopperBenefit: "Turns technical specs into comparable product facts.",
    suggestedQuestion: "Do any size, capacity or power limits matter?",
  }));
}

function materialSeeds(product: Product): AttributeSeed[] {
  const text = productText(product);
  return Object.entries(materialAliases).flatMap(([material, aliases]) => {
    const matches = aliases.filter((alias) => text.includes(normalize(alias)));
    return matches.map((alias) => ({
      kind: "material" as const,
      canonicalValue: `${material} material`,
      label: `${titleize(material)} material`,
      alias,
      product,
      shopperBenefit: "Makes material and build-quality differences visible to shoppers.",
      suggestedQuestion: "Do materials or finish matter for this choice?",
    }));
  });
}

function categorySeed(product: Product): AttributeSeed {
  const category = product.category.trim() || "Uncategorized";
  return {
    kind: "category",
    canonicalValue: normalize(category),
    label: titleize(category),
    alias: category,
    product,
    shopperBenefit: "Groups similar products so shoppers compare the right set.",
    suggestedQuestion: `Are you looking for ${category.toLowerCase()}?`,
  };
}

function ruleSeeds(product: Product): AttributeSeed[] {
  const text = productText(product);
  return rules.flatMap((rule) => {
    const matches = rule.aliases.filter((alias) => text.includes(normalize(alias)));
    return matches.map((alias) => ({
      kind: rule.kind,
      canonicalValue: rule.canonicalValue,
      label: rule.label,
      alias,
      product,
      shopperBenefit: rule.shopperBenefit,
      suggestedQuestion: rule.suggestedQuestion,
    }));
  });
}

function tagSeeds(product: Product): AttributeSeed[] {
  return unique([...product.tags, ...(product.buyer_needs || [])]).slice(0, 10).map((signal) => ({
    kind: "catalog_signal",
    canonicalValue: normalize(signal),
    label: titleize(signal),
    alias: signal,
    product,
    shopperBenefit: "Preserves merchant-provided discovery language for rules, search and explanations.",
    suggestedQuestion: `Does ${signal.toLowerCase()} matter to the shopper?`,
  }));
}

function attributeSeeds(product: Product): AttributeSeed[] {
  return [
    categorySeed(product),
    priceBand(product),
    ...ruleSeeds(product),
    ...materialSeeds(product),
    ...measurementSeeds(product),
    ...tagSeeds(product),
  ];
}

function statusForAttribute(productCount: number, aliases: string[], activeProducts: number): AttributeStudioItemStatus {
  if (!productCount) return "missing";
  if (productCount >= 2 || activeProducts <= 2) return aliases.length > 3 ? "review" : "approved";
  return "review";
}

function buildAttributes(products: Product[]) {
  const active = products.filter((product) => product.active);
  const groups = new Map<string, AttributeSeed[]>();
  for (const product of active) {
    for (const seed of attributeSeeds(product)) {
      const key = `${seed.kind}:${seed.canonicalValue}`;
      groups.set(key, [...(groups.get(key) || []), seed]);
    }
  }

  return [...groups.entries()].map(([id, seeds]) => {
    const productIds = unique(seeds.map((seed) => seed.product.id));
    const aliases = unique(seeds.map((seed) => seed.alias)).sort((a, b) => a.localeCompare(b));
    const productCount = productIds.length;
    const confidence = Math.min(100, Math.round(productCount / Math.max(1, active.length) * 70 + Math.min(30, aliases.length * 8)));
    return {
      id,
      kind: seeds[0]!.kind,
      label: seeds[0]!.label,
      canonicalValue: seeds[0]!.canonicalValue,
      aliases,
      productCount,
      productIds,
      sampleProducts: unique(seeds.map((seed) => seed.product.name)).slice(0, 4),
      confidence,
      status: statusForAttribute(productCount, aliases, active.length),
      shopperBenefit: seeds[0]!.shopperBenefit,
      suggestedQuestion: seeds[0]!.suggestedQuestion,
    } satisfies NormalizedAttribute;
  }).sort((a, b) => b.productCount - a.productCount || b.confidence - a.confidence || a.label.localeCompare(b.label));
}

function conflictGroups(attributes: NormalizedAttribute[]): AttributeConflictGroup[] {
  return attributes
    .filter((attribute) => attribute.aliases.length > 1 && attribute.kind !== "category" && attribute.kind !== "price_band")
    .slice(0, 10)
    .map((attribute) => ({
      id: `conflict-${attribute.id}`,
      label: attribute.label,
      status: attribute.aliases.length > 3 ? "warn" : "pass",
      canonicalValue: attribute.canonicalValue,
      variants: attribute.aliases.map((alias) => ({
        value: alias,
        productCount: attribute.productCount,
        sampleProducts: attribute.sampleProducts.slice(0, 2),
      })),
      recommendation: attribute.aliases.length > 3
        ? `Normalize these variants into “${attribute.canonicalValue}” before using them in rules, search or AI explanations.`
        : `Variants already map cleanly to “${attribute.canonicalValue}”.`,
    }));
}

function productTasks(products: Product[], attributes: NormalizedAttribute[], benefitCoverage: number): AttributeProductTask[] {
  const attributesByProduct = new Map<string, NormalizedAttribute[]>();
  for (const attribute of attributes) {
    for (const productId of attribute.productIds) {
      attributesByProduct.set(productId, [...(attributesByProduct.get(productId) || []), attribute]);
    }
  }

  return products.filter((product) => product.active).map((product) => {
    const productAttributes = attributesByProduct.get(product.id) || [];
    const normalizedAttributes = productAttributes.map((attribute) => attribute.label).slice(0, 8);
    const missingFields = [
      product.features.length ? "" : "features",
      product.tags.length ? "" : "tags",
      (product.buyer_needs || []).length ? "" : "buyer needs",
      product.search_text?.trim() ? "" : "semantic search text",
    ].filter(Boolean);
    const benefitAttributes = productAttributes.filter((attribute) => attribute.kind === "benefit" || attribute.kind === "compatibility");
    if (!benefitAttributes.length) missingFields.push("shopper benefit mapping");
    const score = Math.max(0, Math.min(100, Math.round(
      Math.min(45, productAttributes.length * 7)
      + (missingFields.includes("features") ? 0 : 12)
      + (missingFields.includes("tags") ? 0 : 12)
      + (missingFields.includes("buyer needs") ? 0 : 14)
      + (missingFields.includes("semantic search text") ? 0 : 12)
      + Math.min(5, benefitCoverage / 20),
    )));
    const suggestedTags = unique(productAttributes.filter((attribute) => attribute.kind !== "price_band").map((attribute) => attribute.canonicalValue)).slice(0, 5);
    const suggestedBuyerNeeds = unique(benefitAttributes.map((attribute) => attribute.canonicalValue)).slice(0, 4);
    const suggestedSearchText = unique([
      product.name,
      product.category,
      ...suggestedBuyerNeeds,
      ...suggestedTags.slice(0, 4),
      product.description.split(/[.!?]/)[0] || "",
    ]).join(" · ");
    const status: AttributeStudioItemStatus = score >= 82 ? "approved" : score >= 58 ? "review" : "missing";
    return {
      productId: product.id,
      productName: product.name,
      score,
      status,
      normalizedAttributes,
      missingFields,
      suggestedTags,
      suggestedBuyerNeeds,
      suggestedSearchText,
    };
  }).filter((task) => task.status !== "approved" || task.missingFields.length).sort((a, b) => a.score - b.score || a.productName.localeCompare(b.productName)).slice(0, 10);
}

function statusFromScore(score: number, activeProducts: number): AttributeStudioStatus {
  if (activeProducts < 2 || score < 45) return "blocked";
  if (score >= 82) return "ready";
  return "review";
}

function buildActions(report: Omit<AttributeStudioReport, "actions" | "packet" | "glossary">): AttributeStudioAction[] {
  const actions: AttributeStudioAction[] = [];
  if (report.summary.activeProducts < 2) {
    actions.push({
      id: "add-catalog-depth",
      priority: "critical",
      title: "Add more active products",
      detail: "Attribute normalization only becomes useful when Findly can compare alternatives.",
      evidence: `${report.summary.activeProducts} active product${report.summary.activeProducts === 1 ? "" : "s"} available.`,
      href: "/dashboard/products",
      label: "Add products",
    });
  }

  const weakTasks = report.productTasks.filter((task) => task.status === "missing").length;
  if (weakTasks) {
    actions.push({
      id: "fill-normalization-backlog",
      priority: "high",
      title: "Fill missing normalized product fields",
      detail: "Some products do not have enough features, tags, buyer needs or search text to power guided selling reliably.",
      evidence: `${weakTasks} product${weakTasks === 1 ? "" : "s"} need critical attribute enrichment.`,
      href: "/dashboard/products",
      label: "Update products",
    });
  }

  const conflictCount = report.conflictGroups.filter((group) => group.status === "warn").length;
  if (conflictCount) {
    actions.push({
      id: "normalize-attribute-variants",
      priority: "medium",
      title: "Normalize attribute variants",
      detail: "Multiple raw phrases map to the same canonical meaning. Approving one canonical value improves search, rules and explanation consistency.",
      evidence: `${conflictCount} attribute group${conflictCount === 1 ? "" : "s"} need review.`,
      href: "/dashboard/attributes",
      label: "Review variants",
    });
  }

  if (report.summary.benefitCoverage < 70 && report.summary.activeProducts >= 2) {
    actions.push({
      id: "improve-benefit-coverage",
      priority: "medium",
      title: "Map more specs to shopper benefits",
      detail: "Zoovu-like discovery works best when technical attributes become human outcomes such as comfort, protection, value or compatibility.",
      evidence: `${report.summary.benefitCoverage}% of products currently map to benefits.`,
      href: "/dashboard/ontology",
      label: "Open ontology",
    });
  }

  if (!actions.length) {
    actions.push({
      id: "attribute-studio-ready",
      priority: "low",
      title: "Use the attribute glossary in finder and advisor QA",
      detail: "Normalized catalog language is strong enough to support quiz rules, semantic search, advisor prompts and AI explanations.",
      evidence: `Attribute Studio score is ${report.score}%.`,
      href: "/dashboard/lab",
      label: "Run lab",
    });
  }

  const rank: Record<AttributeActionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return actions.sort((a, b) => rank[a.priority] - rank[b.priority] || a.title.localeCompare(b.title)).slice(0, 6);
}

function glossary(report: Omit<AttributeStudioReport, "actions" | "packet" | "glossary">) {
  return [
    "Findly normalized attribute glossary",
    "====================================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    "",
    ...report.attributes.map((attribute) => [
      `${attribute.label} — ${attribute.status.toUpperCase()}`,
      `Canonical value: ${attribute.canonicalValue}`,
      `Kind: ${attribute.kind}`,
      `Aliases: ${attribute.aliases.join(", ") || "none"}`,
      `Products: ${attribute.sampleProducts.join(", ") || "none"}`,
      `Benefit: ${attribute.shopperBenefit}`,
      "",
    ].join("\n")),
  ].join("\n");
}

function packet(report: Omit<AttributeStudioReport, "packet">) {
  return [
    "Findly Attribute Studio packet",
    "==============================",
    "",
    `Status: ${report.status.toUpperCase()} · Score: ${report.score}%`,
    report.headline,
    "",
    "Summary",
    `- Active products: ${report.summary.activeProducts}`,
    `- Normalized attributes: ${report.summary.normalizedAttributes}`,
    `- Benefit coverage: ${report.summary.benefitCoverage}%`,
    `- Conflict groups: ${report.summary.conflictGroups}`,
    "",
    "Top normalized attributes",
    ...report.attributes.slice(0, 12).map((attribute) => `- [${attribute.status.toUpperCase()}] ${attribute.label}: ${attribute.canonicalValue} (${attribute.productCount} products)`),
    "",
    "Variant groups",
    ...(report.conflictGroups.length ? report.conflictGroups.map((group) => `- [${group.status.toUpperCase()}] ${group.label}: ${group.variants.map((variant) => variant.value).join(", ")}`) : ["- None"]),
    "",
    "Product cleanup tasks",
    ...(report.productTasks.length ? report.productTasks.map((task) => `- ${task.productName}: ${task.missingFields.join(", ") || "Review normalized language"}`) : ["- None"]),
    "",
    "Open actions",
    ...report.actions.map((action) => `- [${action.priority.toUpperCase()}] ${action.title}: ${action.evidence}`),
  ].join("\n");
}

export function buildAttributeStudioReport(products: Product[]): AttributeStudioReport {
  const active = products.filter((product) => product.active);
  const catalog = analyzeCatalogIntelligence(products);
  const benefits = buildCatalogBenefitReport(products);
  const attributes = buildAttributes(products);
  const conflicts = conflictGroups(attributes);
  const tasks = productTasks(products, attributes, benefits.coverage);
  const approvedAttributes = attributes.filter((attribute) => attribute.status === "approved").length;
  const reviewAttributes = attributes.filter((attribute) => attribute.status === "review").length;
  const attributeCoverage = active.length ? Math.min(100, Math.round(attributes.filter((attribute) => attribute.kind !== "price_band").length / active.length * 22)) : 0;
  const taskScore = active.length ? Math.round((active.length - tasks.filter((task) => task.status === "missing").length) / active.length * 100) : 0;
  const score = Math.max(0, Math.min(100, Math.round(
    catalog.score * 0.28
    + benefits.coverage * 0.22
    + attributeCoverage * 0.28
    + taskScore * 0.22,
  )));
  const status = statusFromScore(score, active.length);
  const baseReport: Omit<AttributeStudioReport, "actions" | "packet" | "glossary"> = {
    status,
    score,
    headline: status === "ready"
      ? "Catalog attributes are normalized enough for guided selling."
      : status === "review"
        ? "Catalog attributes are usable, but cleanup will improve matching and explanations."
        : "Catalog attributes need cleanup before reliable product discovery.",
    summary: {
      activeProducts: active.length,
      normalizedAttributes: attributes.length,
      approvedAttributes,
      reviewAttributes,
      missingProductTasks: tasks.filter((task) => task.status === "missing").length,
      conflictGroups: conflicts.length,
      benefitCoverage: benefits.coverage,
      catalogScore: catalog.score,
    },
    attributes,
    conflictGroups: conflicts,
    productTasks: tasks,
  };
  const withActions = { ...baseReport, actions: buildActions(baseReport) };
  const withGlossary = { ...withActions, glossary: glossary(withActions) };
  return { ...withGlossary, packet: packet(withGlossary) };
}
