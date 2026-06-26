"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, Boxes, Check, ChevronDown, Download, FileSpreadsheet, ImageIcon, LoaderCircle, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Sparkles, Tags, Trash2, Upload } from "lucide-react";
import { Modal } from "@/components/modal";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { analyzeCatalogIntelligence } from "@/lib/catalog-intelligence";
import { normalizeCatalogImportRows, type CatalogImportResult } from "@/lib/catalog-import";
import type { Product, ProductInput } from "@/lib/types";
import { formatCurrency, uniqueValues } from "@/lib/utils";

const blankProduct: ProductInput = { name: "", price: 0, image_url: "", category: "", description: "", features: [], tags: [], buyer_needs: [], search_text: "", product_url: "", active: true };

function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { saveProduct } = useStore();
  const [form, setForm] = useState<ProductInput>(product ? {
    name: product.name, price: product.price, image_url: product.image_url, category: product.category, description: product.description,
    features: product.features, tags: product.tags, buyer_needs: product.buyer_needs || [], search_text: product.search_text || "",
    product_url: product.product_url, active: product.active, enrichment_status: product.enrichment_status, enriched_at: product.enriched_at,
  } : blankProduct);
  const [featureText, setFeatureText] = useState(product?.features.join(", ") || "");
  const [tagText, setTagText] = useState(product?.tags.join(", ") || "");
  const [buyerNeedText, setBuyerNeedText] = useState(product?.buyer_needs?.join(", ") || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof ProductInput, value: ProductInput[keyof ProductInput]) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try { await saveProduct({ ...form, features: uniqueValues(featureText.split(",")), tags: uniqueValues(tagText.split(",")), buyer_needs: uniqueValues(buyerNeedText.split(",")), search_text: form.search_text?.trim() || "" }, product?.id); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not save product."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit}>
    <div className="grid gap-5 p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Product name *</label><input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Terra Trail Runner" required /></div><div><label className="label">Price *</label><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-black/35">£</span><input className="field pl-7" type="number" min="0" step="0.01" value={form.price || ""} onChange={(e) => update("price", Number(e.target.value))} required /></div></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Category *</label><input className="field" value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Running shoes" required /></div><div><label className="label">Product URL</label><input className="field" type="url" value={form.product_url} onChange={(e) => update("product_url", e.target.value)} placeholder="https://store.com/product" /></div></div>
      <div><label className="label">Image URL</label><div className="flex gap-3"><div className="grid h-[46px] w-[46px] shrink-0 place-items-center overflow-hidden rounded-xl border border-black/10 bg-canvas">{form.image_url ? <img src={form.image_url} className="h-full w-full object-cover" alt="Product preview" /> : <ImageIcon size={17} className="text-black/25" />}</div><input className="field" type="url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} placeholder="https://images.example.com/product.jpg" /></div></div>
      <div><label className="label">Description</label><textarea className="field min-h-24 resize-y" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What should customers know about this product?" /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Features</label><input className="field" value={featureText} onChange={(e) => setFeatureText(e.target.value)} placeholder="Lightweight, Water resistant" /><p className="mt-1 text-[10px] text-black/30">Separate values with commas</p></div><div><label className="label">Tags</label><input className="field" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="trail, outdoors, premium" /><p className="mt-1 text-[10px] text-black/30">Used by your recommendation rules</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Buyer needs</label><input className="field" value={buyerNeedText} onChange={(e) => setBuyerNeedText(e.target.value)} placeholder="wet-weather protection, all-day comfort" /><p className="mt-1 text-[10px] text-black/30">Shopper-friendly outcomes used by search, advisor and quiz generation</p></div><div><label className="label">Semantic search text</label><textarea className="field min-h-[86px] resize-y" value={form.search_text || ""} onChange={(e) => update("search_text", e.target.value)} placeholder="Extra discovery language, synonyms, use cases or benefit copy" /></div></div>
      <label className="flex items-center justify-between rounded-xl border border-black/[0.07] p-3.5"><span><span className="block text-xs font-extrabold">Available for recommendations</span><span className="mt-0.5 block text-[10px] text-black/35">Inactive products stay in your catalog but are never suggested.</span></span><input type="checkbox" className="h-4 w-4 accent-ink" checked={form.active} onChange={(e) => update("active", e.target.checked)} /></label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    </div>
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-black/[0.07] bg-white px-5 py-4 sm:px-7"><button type="button" onClick={onClose} className="btn-secondary !px-4 !py-2.5">Cancel</button><button className="btn-primary !px-4 !py-2.5" disabled={saving}>{saving && <LoaderCircle size={15} className="animate-spin" />}{product ? "Save changes" : "Add product"}</button></div>
  </form>;
}

function CsvImport({ onClose }: { onClose: () => void }) {
  const { importProducts } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<CatalogImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  function choose(file?: File) {
    if (!file) return;
    setError(""); setFileName(file.name); setResult(null);
    if (file.size > 5 * 1024 * 1024) { setError("CSV is larger than 5 MB. Split it into a smaller import file."); return; }
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data, errors }) => {
        if (errors.length) { setError(errors[0].message); return; }
        const normalized = normalizeCatalogImportRows(data);
        if (!normalized.summary.valid) setError("No valid products found. Review the row-level issues below.");
        setResult(normalized);
      },
      error: (parseError) => setError(parseError.message),
    });
  }
  async function upload() { if (!result?.products.length) return; setLoading(true); try { await importProducts(result.products); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "Import failed."); } finally { setLoading(false); } }
  const template = "name,price,image_url,category,description,features,tags,buyer_needs,search_text,product_url,active\nExample Product,99,https://example.com/image.jpg,Category,A short description,Feature one|Feature two,tag-one|tag-two,wet-weather protection|all-day comfort,Extra discovery language and shopper-use cases,https://example.com/product,true";
  return <div className="p-5 sm:p-7"><div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files[0]); }} className="cursor-pointer rounded-2xl border-2 border-dashed border-black/10 bg-canvas p-10 text-center transition hover:border-moss/40"><input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => choose(e.target.files?.[0])} /><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-moss shadow-sm"><FileSpreadsheet size={21} /></span><p className="mt-4 text-sm font-extrabold">Drop your CSV here, or click to browse</p><p className="mt-1 text-xs text-black/35">Required: name, price and category · Max 5 MB</p></div>
    <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="findly-product-template.csv" className="mt-4 flex items-center justify-center gap-2 text-xs font-extrabold text-moss"><Download size={14} /> Download CSV template</a>
    {fileName && <div className="mt-5 rounded-xl border border-black/[0.07] p-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime/40"><FileSpreadsheet size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{fileName}</span><span className="text-[10px] text-black/35">{result ? `${result.summary.valid} valid · ${result.summary.invalid} invalid · ${result.summary.warnings} with warnings` : "Parsing catalog…"}</span></span>{result?.summary.valid ? <Check size={16} className="text-moss" /> : null}</div></div>}
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    {result && <div className="mt-5 max-h-[320px] overflow-y-auto rounded-2xl border border-black/[0.07]">
      <table className="w-full min-w-[620px] text-left">
        <thead><tr className="border-b border-black/[0.06] bg-canvas text-[9px] font-extrabold uppercase tracking-wider text-black/35"><th className="px-4 py-3">Row</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Notes</th></tr></thead>
        <tbody>
          {result.rows.slice(0, 25).map((row) => <tr key={row.rowNumber} className="border-b border-black/[0.05] last:border-0">
            <td className="px-4 py-3 text-[10px] font-extrabold text-black/35">{row.rowNumber}</td>
            <td className="px-4 py-3"><p className="text-xs font-extrabold">{row.product?.name || row.sourceName}</p><p className="mt-0.5 text-[9px] text-black/35">{row.product ? `${row.product.category} · ${formatCurrency(row.product.price)}` : "Not importable yet"}</p></td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${row.status === "valid" ? "bg-lime/35 text-moss" : "bg-red-50 text-red-600"}`}>{row.status === "valid" ? "Valid" : "Fix required"}</span></td>
            <td className="px-4 py-3"><div className="space-y-1">{[...row.issues, ...row.warnings].slice(0, 3).map((note) => <p key={note} className={`text-[9px] font-bold leading-4 ${row.issues.includes(note) ? "text-red-600" : "text-black/35"}`}>{note}</p>)}</div></td>
          </tr>)}
        </tbody>
      </table>
      {result.rows.length > 25 && <p className="border-t border-black/[0.06] bg-canvas px-4 py-3 text-[10px] font-bold text-black/35">Showing first 25 of {result.rows.length} parsed rows.</p>}
    </div>}
    <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="btn-secondary !px-4 !py-2.5">Cancel</button><button onClick={upload} disabled={!result?.products.length || loading} className="btn-primary !px-4 !py-2.5">{loading && <LoaderCircle className="animate-spin" size={15} />} Import {result?.products.length || ""} products</button></div>
  </div>;
}

function CatalogEnrichment({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const { saveProduct } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ count: number; source: string } | null>(null);

  async function enrich() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/catalog/enrich", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: products.map(({ id, name, price, category, description, features, tags }) => ({ id, name, price, category, description, features, tags })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not enrich the catalog.");
      for (const enriched of payload.products as Array<{ id: string; normalized_category: string; features: string[]; tags: string[]; buyer_needs: string[]; search_text: string }>) {
        const original = products.find((product) => product.id === enriched.id);
        if (!original) continue;
        await saveProduct({
          name: original.name, price: original.price, image_url: original.image_url, category: enriched.normalized_category,
          description: original.description, features: enriched.features, tags: enriched.tags, product_url: original.product_url, active: original.active,
          search_text: enriched.search_text, buyer_needs: enriched.buyer_needs, enrichment_status: "enriched", enriched_at: payload.enriched_at,
        }, original.id);
      }
      setResult({ count: payload.products.length, source: payload.source });
    } catch (err) { setError(err instanceof Error ? err.message : "Catalog enrichment failed."); }
    finally { setLoading(false); }
  }

  return <div className="p-5 sm:p-7"><div className="rounded-2xl bg-[linear-gradient(135deg,#edf2df,#fff1e6)] p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lime"><Sparkles size={20} /></span><h3 className="mt-5 text-xl font-extrabold tracking-[-.04em]">Make your catalog discovery-ready</h3><p className="mt-2 text-xs leading-5 text-black/50">Findly normalizes categories, extracts buyer-friendly features, adds intent tags and creates semantic search text. With an OpenAI key, it also stores vector embeddings for conversational discovery.</p><div className="mt-5 grid gap-2 sm:grid-cols-3">{[[products.length, "products"], [new Set(products.map((p) => p.category)).size, "categories"], [products.filter((p) => p.enrichment_status === "enriched").length, "already enriched"]].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-white/70 p-3"><p className="text-lg font-extrabold">{value}</p><p className="text-[9px] font-bold text-black/35">{label}</p></div>)}</div></div>
    {result && <div className="mt-5 flex items-center gap-3 rounded-xl bg-lime/30 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-lime"><Check size={15} /></span><div><p className="text-xs font-extrabold">{result.count} products are discovery-ready</p><p className="mt-0.5 text-[9px] text-black/40">Enriched using {result.source === "openai" ? "OpenAI and vector embeddings" : "the deterministic local enrichment engine"}.</p></div></div>}
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="btn-secondary !px-4 !py-2.5">{result ? "Done" : "Cancel"}</button>{!result && <button onClick={enrich} disabled={loading || !products.length} className="btn-primary !px-4 !py-2.5">{loading ? <LoaderCircle className="animate-spin" size={15} /> : <Sparkles size={15} className="text-lime" />} Enrich {products.length} products</button>}</div>
  </div>;
}

export default function ProductsPage() {
  const { ready, products, deleteProduct, error: storeError } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const categories = uniqueValues(products.map((p) => p.category));
  const intelligence = useMemo(() => analyzeCatalogIntelligence(products), [products]);
  const filtered = useMemo(() => products.filter((product) => (category === "All categories" || product.category === category) && `${product.name} ${product.category} ${product.tags.join(" ")} ${(product.buyer_needs || []).join(" ")} ${product.search_text || ""}`.toLowerCase().includes(query.toLowerCase())), [products, category, query]);
  if (!ready) return <LoadingState label="Loading your catalog…" />;
  return <div className="animate-rise">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-moss">Catalog</p><h1 className="display mt-2 text-4xl sm:text-5xl">Products</h1><p className="mt-2 text-sm text-black/45">Give your finders a thoughtful, structured product catalog.</p></div><div className="flex gap-2"><button onClick={() => setEnrichOpen(true)} disabled={!products.length} className="btn-secondary !px-4 !py-2.5"><Sparkles size={15} className="text-moss" /> AI enrich</button><button onClick={() => setImportOpen(true)} className="btn-secondary !px-4 !py-2.5"><Upload size={15} /> Import CSV</button><button onClick={() => setEditing(null)} className="btn-primary !px-4 !py-2.5"><Plus size={16} /> Add product</button></div></div>
    {storeError && <p className="mt-5 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{storeError}</p>}
    <section className="mt-8 grid gap-5 xl:grid-cols-[380px_1fr]">
      <div className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
        <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ShieldCheck size={21} /></span><span className={`rounded-full px-3 py-1 text-[9px] font-extrabold ${intelligence.blockers.length ? "bg-red-400/15 text-red-100" : intelligence.warnings.length ? "bg-amber-300/20 text-amber-100" : "bg-lime text-ink"}`}>{intelligence.readinessLabel}</span></div>
        <p className="display mt-7 text-5xl">{intelligence.score}%</p>
        <p className="mt-1 text-xs font-bold text-white/35">Catalog intelligence score</p>
        <p className="mt-4 text-xs leading-5 text-white/45">Measures whether your catalog has enough structured data, enrichment, media and commerce links for reliable semantic discovery.</p>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-xl font-extrabold">{intelligence.activeProducts}</p><p className="mt-1 text-[8px] text-white/35">Active</p></div>
          <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-xl font-extrabold">{intelligence.discoveryReadyProducts}</p><p className="mt-1 text-[8px] text-white/35">Ready</p></div>
          <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-xl font-extrabold">{intelligence.enrichedProducts}</p><p className="mt-1 text-[8px] text-white/35">Enriched</p></div>
        </div>
      </div>
      <div className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-extrabold"><Tags size={16} className="text-moss" /> Discovery readiness</h2><p className="mt-1 text-[10px] leading-4 text-black/35">The same catalog health model feeds Launch Preflight.</p></div><button onClick={() => setEnrichOpen(true)} disabled={!products.length} className="btn-secondary !px-3 !py-2 text-[10px]"><Sparkles size={12} /> Enrich</button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[["Descriptions", intelligence.coverage.descriptions], ["Signals", intelligence.coverage.matchingSignals], ["Search text", intelligence.coverage.searchText], ["Enrichment", intelligence.coverage.enrichment], ["Images", intelligence.coverage.images], ["Product URLs", intelligence.coverage.productUrls]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-canvas p-3"><div className="flex items-center justify-between text-[9px] font-extrabold text-black/35"><span>{String(label)}</span><span>{String(value)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-lime" style={{ width: `${value}%` }} /></div></div>)}
        </div>
        <div className="mt-5 grid gap-2 lg:grid-cols-2">
          {intelligence.checks.slice(0, 4).map((item) => <div key={item.id} className={`rounded-2xl border p-3 ${item.severity === "pass" ? "border-lime/40 bg-lime/10" : item.severity === "warning" ? "border-amber-100 bg-amber-50" : "border-red-100 bg-red-50"}`}><p className="flex items-center gap-2 text-[10px] font-extrabold">{item.severity === "pass" ? <Check size={12} className="text-moss" /> : <AlertTriangle size={12} className={item.severity === "warning" ? "text-amber-600" : "text-red-600"} />}{item.label}</p><p className="mt-1 text-[9px] font-bold leading-4 text-black/45">{item.detail}</p></div>)}
        </div>
      </div>
    </section>
    <div className="mt-8 rounded-2xl border border-black/[0.07] bg-white">
      <div className="flex flex-col gap-3 border-b border-black/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" size={15} /><input className="field !py-2.5 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" /></div><div className="relative"><select value={category} onChange={(e) => setCategory(e.target.value)} className="appearance-none rounded-xl border border-black/10 bg-white py-2.5 pl-3 pr-9 text-xs font-bold"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/30" size={13} /></div></div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-black/[0.06] text-[9px] font-extrabold uppercase tracking-wider text-black/30"><th className="px-5 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Match data</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id} className="border-b border-black/[0.05] last:border-0 hover:bg-canvas/50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eef0eb]">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={16} className="text-black/25" />}</div><div className="min-w-0"><p className="max-w-[220px] truncate text-xs font-extrabold">{product.name}</p><p className="mt-1 max-w-[220px] truncate text-[10px] text-black/35">{product.description || "No description"}</p></div></div></td><td className="px-4 py-3.5 text-xs font-semibold text-black/55">{product.category}</td><td className="px-4 py-3.5 text-xs font-extrabold">{formatCurrency(product.price)}</td><td className="px-4 py-3.5"><div className="flex max-w-[190px] flex-wrap gap-1">{[...(product.buyer_needs || []), ...product.tags, ...product.features].slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-black/[0.05] px-1.5 py-1 text-[9px] font-bold text-black/45">{tag}</span>)}{(product.buyer_needs || []).length + product.tags.length + product.features.length > 2 && <span className="rounded-md bg-black/[0.05] px-1.5 py-1 text-[9px] font-bold text-black/35">+{(product.buyer_needs || []).length + product.tags.length + product.features.length - 2}</span>}</div></td><td className="px-4 py-3.5"><div className="flex flex-col items-start gap-1"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-extrabold ${product.active ? "bg-lime/35 text-moss" : "bg-black/5 text-black/35"}`}><i className={`h-1.5 w-1.5 rounded-full ${product.active ? "bg-moss" : "bg-black/30"}`} />{product.active ? "Active" : "Inactive"}</span>{product.enrichment_status === "enriched" && <span className="inline-flex items-center gap-1 text-[8px] font-extrabold text-moss"><Sparkles size={9} /> AI-ready</span>}</div></td><td className="relative px-5 py-3.5 text-right"><button onClick={() => setMenu(menu === product.id ? null : product.id)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5"><MoreHorizontal size={16} /></button>{menu === product.id && <div className="absolute right-6 top-11 z-20 w-36 rounded-xl border border-black/10 bg-white p-1.5 text-left shadow-xl"><button onClick={() => { setEditing(product); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold hover:bg-canvas"><Pencil size={13} /> Edit</button><button onClick={async () => { if (confirm(`Delete ${product.name}?`)) await deleteProduct(product.id); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={13} /> Delete</button></div>}</td></tr>)}</tbody></table></div> : <div className="px-5 py-20 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-canvas text-black/25"><Boxes size={22} /></span><h3 className="mt-4 text-sm font-extrabold">{products.length ? "No matching products" : "Your catalog is waiting"}</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-black/35">{products.length ? "Try another search or category." : "Add a product manually or import your existing catalog from a CSV file."}</p>{!products.length && <button onClick={() => setEditing(null)} className="btn-primary mt-5 !px-4 !py-2.5"><Plus size={15} /> Add first product</button>}</div>}
      <div className="flex items-center justify-between border-t border-black/[0.06] px-5 py-3 text-[10px] font-bold text-black/35"><span>Showing {filtered.length} of {products.length} products</span><span>{products.filter((p) => p.active).length} recommendation-ready</span></div>
    </div>
    <Modal open={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? "Edit product" : "Add a product"} description="Add the product details your recommendation logic can use.">{editing !== undefined && <ProductForm product={editing || undefined} onClose={() => setEditing(undefined)} />}</Modal>
    <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import products from CSV" description="Upload a structured catalog and review it before importing."><CsvImport onClose={() => setImportOpen(false)} /></Modal>
    <Modal open={enrichOpen} onClose={() => setEnrichOpen(false)} title="AI catalog enrichment" description="Normalize product data and prepare it for semantic discovery."><CatalogEnrichment products={products} onClose={() => setEnrichOpen(false)} /></Modal>
  </div>;
}
