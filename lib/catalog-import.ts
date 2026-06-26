import type { ProductInput } from "@/lib/types";

type CsvRow = Record<string, string | undefined>;
type ImportField = "name" | "price" | "image_url" | "category" | "description" | "features" | "tags" | "buyer_needs" | "search_text" | "product_url" | "active";

export type CatalogImportPreviewRow = {
  rowNumber: number;
  product?: ProductInput;
  status: "valid" | "invalid";
  issues: string[];
  warnings: string[];
  sourceName: string;
};

export type CatalogImportResult = {
  rows: CatalogImportPreviewRow[];
  products: ProductInput[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
};

const headerAliases = {
  name: ["name", "product name", "product_name", "title", "product title"],
  price: ["price", "amount", "product price", "product_price", "sale price"],
  image_url: ["image_url", "image url", "image", "image src", "image_src", "photo", "thumbnail"],
  category: ["category", "product category", "product_category", "type", "product type", "product_type", "collection"],
  description: ["description", "body", "body_html", "details", "summary"],
  features: ["features", "feature", "attributes", "attribute", "specs", "specifications"],
  tags: ["tags", "tag", "keywords", "labels"],
  buyer_needs: ["buyer_needs", "buyer needs", "needs", "use cases", "use_cases", "benefits", "customer benefits"],
  search_text: ["search_text", "search text", "semantic text", "semantic_search_text", "discovery text"],
  product_url: ["product_url", "product url", "url", "link", "product link", "handle"],
  active: ["active", "available", "published", "status", "enabled"],
} satisfies Record<ImportField, string[]>;

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function getCell(row: CsvRow, field: ImportField) {
  const normalizedRow = new Map(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value ?? ""]));
  for (const alias of headerAliases[field]) {
    const value = normalizedRow.get(alias);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parsePrice(value: string) {
  const normalized = value.replace(/[£$€,\s]/g, "");
  const price = Number(normalized);
  return Number.isFinite(price) ? price : Number.NaN;
}

function parseList(value: string) {
  return [...new Set(value.split(/[|,;]/).map((item) => item.trim()).filter(Boolean))];
}

function parseActive(value: string) {
  if (!value) return true;
  return !["0", "false", "no", "inactive", "archived", "draft", "disabled", "unpublished"].includes(value.toLowerCase().trim());
}

function normalizeUrl(value: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return value.includes(".") ? `https://${value}` : value;
}

export function normalizeCatalogImportRows(data: CsvRow[]): CatalogImportResult {
  const seen = new Set<string>();
  const rows = data.map<CatalogImportPreviewRow>((row, index) => {
    const name = getCell(row, "name");
    const category = getCell(row, "category");
    const rawPrice = getCell(row, "price");
    const price = parsePrice(rawPrice);
    const description = getCell(row, "description");
    const features = parseList(getCell(row, "features"));
    const tags = parseList(getCell(row, "tags"));
    const buyerNeeds = parseList(getCell(row, "buyer_needs"));
    const searchText = getCell(row, "search_text");
    const productUrl = normalizeUrl(getCell(row, "product_url"));
    const imageUrl = normalizeUrl(getCell(row, "image_url"));
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!name) issues.push("Missing product name.");
    if (!category) issues.push("Missing category.");
    if (!rawPrice) issues.push("Missing price.");
    else if (!Number.isFinite(price) || price < 0) issues.push("Price must be a valid non-negative number.");

    const duplicateKey = `${name.toLowerCase()}::${category.toLowerCase()}`;
    if (name && category) {
      if (seen.has(duplicateKey)) warnings.push("Possible duplicate name/category in this file.");
      seen.add(duplicateKey);
    }
    if (!description) warnings.push("No description; AI enrichment and explanations will be weaker.");
    if (!features.length && !tags.length && !buyerNeeds.length) warnings.push("No tags, features or buyer needs; rule-based matching will be weaker.");
    if (!productUrl) warnings.push("No product URL; Buy Now clicks will have nowhere useful to go.");
    if (!imageUrl) warnings.push("No image URL; recommendation cards will look less polished.");

    const product: ProductInput = {
      name,
      price: Number.isFinite(price) ? price : 0,
      image_url: imageUrl,
      category,
      description,
      features,
      tags,
      buyer_needs: buyerNeeds,
      search_text: searchText,
      product_url: productUrl,
      active: parseActive(getCell(row, "active")),
    };

    return {
      rowNumber: index + 2,
      product: issues.length ? undefined : product,
      status: issues.length ? "invalid" : "valid",
      issues,
      warnings,
      sourceName: name || `Row ${index + 2}`,
    };
  });
  const products = rows.flatMap((row) => row.product ? [row.product] : []);
  return {
    rows,
    products,
    summary: {
      total: rows.length,
      valid: products.length,
      invalid: rows.filter((row) => row.status === "invalid").length,
      warnings: rows.filter((row) => row.warnings.length).length,
    },
  };
}
