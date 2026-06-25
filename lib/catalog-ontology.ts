import type { Product } from "@/lib/types";

export type OntologySignalType = "category" | "buyer_need" | "tag" | "feature";

export type OntologySignal = {
  key: string;
  label: string;
  type: OntologySignalType;
  productCount: number;
  productIds: string[];
  sampleProducts: string[];
};

export type OntologyCluster = {
  category: string;
  productCount: number;
  averagePrice: number;
  needs: OntologySignal[];
  tags: OntologySignal[];
  features: OntologySignal[];
  products: Array<Pick<Product, "id" | "name" | "price" | "tags" | "features" | "buyer_needs">>;
};

export type SuggestedOntologyQuestion = {
  title: string;
  helperText: string;
  options: Array<{
    label: string;
    matchType: "category" | "tag" | "feature";
    matchValue: string;
    productCount: number;
  }>;
};

export type CatalogOntologyReport = {
  activeProducts: number;
  categoryClusters: OntologyCluster[];
  topSignals: OntologySignal[];
  orphanSignals: OntologySignal[];
  suggestedQuestions: SuggestedOntologyQuestion[];
  gaps: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function titleize(value: string) {
  const normalized = normalize(value);
  if (!normalized) return "Uncategorized";
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function signalLabel(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
}

function collectSignals(products: Product[], type: OntologySignalType, valuesForProduct: (product: Product) => string[]) {
  const map = new Map<string, { label: string; productIds: Set<string>; sampleProducts: Set<string> }>();
  for (const product of products) {
    for (const value of unique(valuesForProduct(product))) {
      const key = normalize(value);
      if (!key) continue;
      const existing = map.get(key) || { label: signalLabel(value), productIds: new Set<string>(), sampleProducts: new Set<string>() };
      existing.productIds.add(product.id);
      existing.sampleProducts.add(product.name);
      map.set(key, existing);
    }
  }
  return [...map.entries()]
    .map(([key, item]) => ({
      key,
      label: item.label || titleize(key),
      type,
      productCount: item.productIds.size,
      productIds: [...item.productIds],
      sampleProducts: [...item.sampleProducts].slice(0, 3),
    }))
    .sort((a, b) => b.productCount - a.productCount || a.label.localeCompare(b.label));
}

function topWithinCategory(clusterProducts: Product[], type: "buyer_need" | "tag" | "feature") {
  const valuesForProduct = type === "buyer_need"
    ? (product: Product) => product.buyer_needs?.length ? product.buyer_needs : product.tags
    : type === "tag"
      ? (product: Product) => product.tags
      : (product: Product) => product.features;
  return collectSignals(clusterProducts, type, valuesForProduct).slice(0, 6);
}

function suggestedQuestions(clusters: OntologyCluster[], topSignals: OntologySignal[]): SuggestedOntologyQuestion[] {
  const questions: SuggestedOntologyQuestion[] = [];
  if (clusters.length >= 2) {
    questions.push({
      title: "Which product area are you shopping for?",
      helperText: "Use this when categories reflect meaningful shopper choices.",
      options: clusters.slice(0, 4).map((cluster) => ({
        label: cluster.category,
        matchType: "category",
        matchValue: cluster.category,
        productCount: cluster.productCount,
      })),
    });
  }

  const needs = topSignals.filter((signal) => signal.type === "buyer_need" || signal.type === "tag").slice(0, 4);
  if (needs.length >= 2) {
    questions.push({
      title: "What matters most to the shopper?",
      helperText: "These options come from repeated buyer needs and tags in the active catalog.",
      options: needs.map((signal) => ({
        label: signal.label,
        matchType: "tag",
        matchValue: signal.key,
        productCount: signal.productCount,
      })),
    });
  }

  const features = topSignals.filter((signal) => signal.type === "feature").slice(0, 4);
  if (features.length >= 2) {
    questions.push({
      title: "Which feature should Findly prioritise?",
      helperText: "Useful when product specs map directly to shopper preferences.",
      options: features.map((signal) => ({
        label: signal.label,
        matchType: "feature",
        matchValue: signal.label,
        productCount: signal.productCount,
      })),
    });
  }

  return questions.slice(0, 3);
}

export function buildCatalogOntology(products: Product[]): CatalogOntologyReport {
  const active = products.filter((product) => product.active);
  const clustersByCategory = new Map<string, Product[]>();

  for (const product of active) {
    const category = titleize(product.category || "Uncategorized");
    clustersByCategory.set(category, [...(clustersByCategory.get(category) || []), product]);
  }

  const categoryClusters = [...clustersByCategory.entries()]
    .map(([category, clusterProducts]) => ({
      category,
      productCount: clusterProducts.length,
      averagePrice: clusterProducts.reduce((sum, product) => sum + product.price, 0) / Math.max(1, clusterProducts.length),
      needs: topWithinCategory(clusterProducts, "buyer_need"),
      tags: topWithinCategory(clusterProducts, "tag"),
      features: topWithinCategory(clusterProducts, "feature"),
      products: clusterProducts.map(({ id, name, price, tags, features, buyer_needs }) => ({ id, name, price, tags, features, buyer_needs })),
    }))
    .sort((a, b) => b.productCount - a.productCount || a.category.localeCompare(b.category));

  const categorySignals = collectSignals(active, "category", (product) => [product.category || "Uncategorized"]);
  const needSignals = collectSignals(active, "buyer_need", (product) => product.buyer_needs?.length ? product.buyer_needs : product.tags);
  const tagSignals = collectSignals(active, "tag", (product) => product.tags);
  const featureSignals = collectSignals(active, "feature", (product) => product.features);
  const topSignals = [...needSignals, ...tagSignals, ...featureSignals, ...categorySignals]
    .sort((a, b) => b.productCount - a.productCount || a.type.localeCompare(b.type) || a.label.localeCompare(b.label))
    .slice(0, 18);
  const orphanSignals = [...needSignals, ...tagSignals, ...featureSignals].filter((signal) => signal.productCount === 1).slice(0, 12);
  const gaps = [
    active.length < 2 ? "Add more active products so the ontology can compare alternatives." : "",
    categoryClusters.length < 2 && active.length >= 4 ? "Consider splitting broad catalog categories into shopper-meaningful groups." : "",
    needSignals.length < 3 ? "Run enrichment or add buyer needs so questions can use human intent instead of raw tags." : "",
    featureSignals.length < 3 ? "Add product features to improve recommendation explanations and comparison proof points." : "",
    orphanSignals.length > Math.max(3, active.length) ? "Several one-off signals may need normalization so rules do not become brittle." : "",
  ].filter(Boolean);

  return {
    activeProducts: active.length,
    categoryClusters,
    topSignals,
    orphanSignals,
    suggestedQuestions: suggestedQuestions(categoryClusters, topSignals),
    gaps,
  };
}
