import type { Product } from "@/lib/types";

export type CatalogIntelligenceSeverity = "pass" | "warning" | "blocker";

export type CatalogIntelligenceCheck = {
  id: string;
  label: string;
  detail: string;
  severity: CatalogIntelligenceSeverity;
  affectedCount: number;
};

export type CatalogIntelligenceReport = {
  score: number;
  readinessLabel: string;
  activeProducts: number;
  discoveryReadyProducts: number;
  enrichedProducts: number;
  categoryCount: number;
  coverage: {
    descriptions: number;
    matchingSignals: number;
    enrichment: number;
    searchText: number;
    images: number;
    productUrls: number;
  };
  checks: CatalogIntelligenceCheck[];
  blockers: CatalogIntelligenceCheck[];
  warnings: CatalogIntelligenceCheck[];
  suggestedActions: string[];
};

function percentage(value: number, total: number) {
  return total ? Math.round(value / total * 100) : 0;
}

function check(id: string, label: string, detail: string, severity: CatalogIntelligenceSeverity, affectedCount: number): CatalogIntelligenceCheck {
  return { id, label, detail, severity, affectedCount };
}

function hasMatchingSignals(product: Product) {
  return Boolean(product.category.trim() && (product.features.length || product.tags.length || product.buyer_needs?.length));
}

function hasEnrichment(product: Product) {
  return Boolean(product.enrichment_status === "enriched" || product.search_text?.trim() || product.buyer_needs?.length);
}

function hasSearchText(product: Product) {
  return Boolean(product.search_text?.trim() || product.description.trim() || product.features.length || product.tags.length || product.buyer_needs?.length);
}

function actionForCheck(checkId: string) {
  if (checkId === "catalog-size") return "Add at least two active products before launch.";
  if (checkId === "core-copy") return "Fill product descriptions for thin rows.";
  if (checkId === "matching-signals") return "Add tags, features or buyer needs to weak products.";
  if (checkId === "enrichment") return "Run AI enrich to normalize categories and buyer needs.";
  if (checkId === "commerce-assets") return "Add product URLs and images before embedding.";
  if (checkId === "taxonomy") return "Review categories so shoppers can compare meaningful groups.";
  return "";
}

export function analyzeCatalogIntelligence(products: Product[]): CatalogIntelligenceReport {
  const active = products.filter((product) => product.active);
  const total = active.length;
  const withDescriptions = active.filter((product) => product.description.trim());
  const withSignals = active.filter(hasMatchingSignals);
  const enriched = active.filter(hasEnrichment);
  const withSearchText = active.filter(hasSearchText);
  const withImages = active.filter((product) => product.image_url.trim());
  const withUrls = active.filter((product) => product.product_url.trim());
  const categories = new Set(active.map((product) => product.category.trim().toLowerCase()).filter(Boolean));
  const discoveryReadyProducts = active.filter((product) => product.description.trim() && hasMatchingSignals(product) && hasSearchText(product)).length;

  const checks: CatalogIntelligenceCheck[] = [];

  checks.push(check(
    "catalog-size",
    "Active catalog size",
    total >= 2 ? `${total} active products are available for discovery.` : "Add at least two active products so Findly can rank alternatives.",
    total >= 2 ? "pass" : "blocker",
    Math.max(0, 2 - total),
  ));

  const descriptionCoverage = percentage(withDescriptions.length, total);
  checks.push(check(
    "core-copy",
    "Product descriptions",
    descriptionCoverage >= 80 ? `${descriptionCoverage}% of active products have descriptions.` : `${total - withDescriptions.length} active product${total - withDescriptions.length === 1 ? "" : "s"} need stronger descriptions.`,
    descriptionCoverage >= 80 ? "pass" : withDescriptions.length ? "warning" : "blocker",
    total - withDescriptions.length,
  ));

  const signalCoverage = percentage(withSignals.length, total);
  checks.push(check(
    "matching-signals",
    "Recommendation signals",
    signalCoverage >= 80 ? `${signalCoverage}% of active products have category plus tags, features or buyer needs.` : `${total - withSignals.length} active product${total - withSignals.length === 1 ? "" : "s"} are missing useful matching signals.`,
    signalCoverage >= 80 ? "pass" : withSignals.length ? "warning" : "blocker",
    total - withSignals.length,
  ));

  const enrichmentCoverage = percentage(enriched.length, total);
  checks.push(check(
    "enrichment",
    "AI enrichment coverage",
    enrichmentCoverage >= 80 ? `${enrichmentCoverage}% of active products are enriched or discovery-ready.` : enriched.length ? `${enrichmentCoverage}% of active products have enrichment signals.` : "No active products have buyer-needs/search-text enrichment yet.",
    enrichmentCoverage >= 80 ? "pass" : "warning",
    total - enriched.length,
  ));

  const searchTextCoverage = percentage(withSearchText.length, total);
  checks.push(check(
    "semantic-text",
    "Semantic search text",
    searchTextCoverage >= 90 ? `${searchTextCoverage}% of active products can be searched semantically.` : `${total - withSearchText.length} active product${total - withSearchText.length === 1 ? "" : "s"} need searchable language.`,
    searchTextCoverage >= 90 ? "pass" : withSearchText.length ? "warning" : "blocker",
    total - withSearchText.length,
  ));

  const commerceCoverage = Math.min(percentage(withImages.length, total), percentage(withUrls.length, total));
  checks.push(check(
    "commerce-assets",
    "Images and product URLs",
    commerceCoverage >= 80 ? `${withImages.length}/${total} have images and ${withUrls.length}/${total} have product URLs.` : `Images: ${withImages.length}/${total}. Product URLs: ${withUrls.length}/${total}.`,
    commerceCoverage >= 80 ? "pass" : "warning",
    Math.max(total - withImages.length, total - withUrls.length),
  ));

  checks.push(check(
    "taxonomy",
    "Category taxonomy",
    categories.size >= 2 || total < 4 ? `${categories.size} categor${categories.size === 1 ? "y" : "ies"} across the active catalog.` : "Catalog has enough products but only one category; semantic discovery may feel flat.",
    categories.size >= 2 || total < 4 ? "pass" : "warning",
    categories.size >= 2 ? 0 : total,
  ));

  const blockers = checks.filter((item) => item.severity === "blocker");
  const warnings = checks.filter((item) => item.severity === "warning");
  const passed = checks.filter((item) => item.severity === "pass").length;
  const score = Math.round((passed / checks.length) * 100);
  const suggestedActions = [...blockers, ...warnings].map((item) => actionForCheck(item.id)).filter(Boolean).slice(0, 4);

  return {
    score,
    readinessLabel: blockers.length ? "Blocked" : warnings.length ? "Needs enrichment" : "Discovery-ready",
    activeProducts: total,
    discoveryReadyProducts,
    enrichedProducts: enriched.length,
    categoryCount: categories.size,
    coverage: {
      descriptions: descriptionCoverage,
      matchingSignals: signalCoverage,
      enrichment: enrichmentCoverage,
      searchText: searchTextCoverage,
      images: percentage(withImages.length, total),
      productUrls: percentage(withUrls.length, total),
    },
    checks,
    blockers,
    warnings,
    suggestedActions,
  };
}
