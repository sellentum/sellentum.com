export type CatalogCsvColumn = {
  key: string;
  label: string;
  required: boolean;
  example: string;
  purpose: string;
};

export const catalogCsvColumns: CatalogCsvColumn[] = [
  { key: "name", label: "Product name", required: true, example: "Terra Trail Runner", purpose: "Shown in result cards and used for duplicate detection." },
  { key: "price", label: "Price", required: true, example: "128", purpose: "Powers budget matching and result-card pricing." },
  { key: "category", label: "Category", required: true, example: "Running shoes", purpose: "Creates broad matching groups and question ideas." },
  { key: "description", label: "Description", required: false, example: "Cushioned trail shoe for wet weekend runs.", purpose: "Grounds AI explanations and shopper confidence." },
  { key: "features", label: "Features", required: false, example: "High cushioning|Trail grip|Water resistant", purpose: "Structured signals for deterministic matching." },
  { key: "tags", label: "Tags", required: false, example: "trail|outdoors|rain", purpose: "Fast rule-based matching and finder answer links." },
  { key: "buyer_needs", label: "Buyer needs", required: false, example: "wet-weather protection|outdoor confidence", purpose: "Maps shopper outcome language to products." },
  { key: "search_text", label: "Search text", required: false, example: "Rain-ready trail shoe for mixed terrain.", purpose: "Improves advisor/search matching and AI grounding." },
  { key: "image_url", label: "Image URL", required: false, example: "https://example.com/terra.jpg", purpose: "Makes recommendation cards look production-ready." },
  { key: "product_url", label: "Product URL", required: false, example: "https://store.example/terra", purpose: "Powers Buy Now buttons and click analytics." },
  { key: "active", label: "Active", required: false, example: "true", purpose: "Controls whether a product can be recommended." },
];

export const catalogIntakeChecklist = [
  "Export only live or launch-candidate products first; archived products can wait.",
  "Use one row per sellable product or variant you want Sellentum to recommend.",
  "Keep price numeric and avoid currency symbols when possible.",
  "Add shopper-friendly buyer needs such as “sensitive skin”, “small space” or “trail grip”.",
  "Add product URLs before widget testing so Buy Now clicks can be proven.",
  "Use image URLs from a public CDN/storefront path so result cards render outside your admin.",
];

const sampleRows: Array<Record<string, string>> = [
  {
    name: "Terra Trail Runner",
    price: "128",
    image_url: "https://example.com/images/terra-trail.jpg",
    category: "Running shoes",
    description: "Cushioned trail runner for wet paths, park loops and weekend hikes.",
    features: "High cushioning|Trail grip|Water resistant",
    tags: "trail|outdoors|rain",
    buyer_needs: "wet-weather protection|outdoor confidence|soft landing",
    search_text: "Rain-ready trail shoe for mixed terrain, grip and comfort.",
    product_url: "https://store.example/products/terra-trail-runner",
    active: "true",
  },
  {
    name: "Aero Tempo Trainer",
    price: "96",
    image_url: "https://example.com/images/aero-tempo.jpg",
    category: "Running shoes",
    description: "Light everyday trainer for gym sessions, quick walks and short road runs.",
    features: "Lightweight|Breathable upper|Flexible sole",
    tags: "road|gym|daily",
    buyer_needs: "lightweight feel|daily comfort|versatile training",
    search_text: "Light running shoe for daily workouts, gym and road training.",
    product_url: "https://store.example/products/aero-tempo-trainer",
    active: "true",
  },
  {
    name: "CloudForm Recovery Slide",
    price: "42",
    image_url: "https://example.com/images/cloudform-slide.jpg",
    category: "Recovery footwear",
    description: "Soft recovery slide for post-run comfort and home wear.",
    features: "Soft foam|Easy slip-on|Arch support",
    tags: "recovery|comfort|home",
    buyer_needs: "post-run recovery|easy comfort|arch support",
    search_text: "Comfortable recovery sandal for tired feet after training.",
    product_url: "https://store.example/products/cloudform-recovery-slide",
    active: "true",
  },
];

function escapeCsv(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCatalogCsvTemplate() {
  const headers = catalogCsvColumns.map((column) => column.key);
  return [
    headers.join(","),
    ...sampleRows.map((row) => headers.map((header) => escapeCsv(row[header] || "")).join(",")),
  ].join("\n");
}

export function buildCatalogIntakePacket() {
  const required = catalogCsvColumns.filter((column) => column.required).map((column) => column.key).join(", ");
  const recommended = catalogCsvColumns.filter((column) => !column.required).map((column) => column.key).join(", ");
  return [
    "Sellentum catalog intake packet",
    "===============================",
    "",
    `Required columns: ${required}`,
    `Recommended columns: ${recommended}`,
    "",
    "Checklist",
    ...catalogIntakeChecklist.map((item) => `- ${item}`),
    "",
    "CSV template",
    buildCatalogCsvTemplate(),
  ].join("\n");
}
