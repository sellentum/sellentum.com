"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { demoQuiz, demoSettings } from "@/lib/demo-data";
import { getSessionMetadata } from "@/lib/session";
import type { ProductSearchReport } from "@/lib/search-engine";
import { runSemanticProductSearch } from "@/lib/search-engine";
import { useStore } from "@/lib/store";
import type { Product, Quiz, WidgetSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type SearchData = {
  experience: Pick<Quiz, "id" | "name" | "slug">;
  products?: Product[];
  settings: WidgetSettings;
  catalog: { active_products: number };
};

type SearchEventType = "widget_view" | "quiz_start" | "product_recommended" | "buy_click";

const starterQueries = [
  "waterproof hiking shoes under £140",
  "lightweight pair for city travel",
  "soft everyday comfort",
];

function emptyReport(query: string, products: Product[] = []): ProductSearchReport {
  return runSemanticProductSearch({ query, products, limit: 6 });
}

export default function PublicSearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const [data, setData] = useState<SearchData | null>(null);
  const [query, setQuery] = useState(starterQueries[0]);
  const [report, setReport] = useState<ProductSearchReport>(() => emptyReport(starterQueries[0]));
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const viewed = useRef(false);

  useEffect(() => {
    if (!store.ready) return;
    const localQuiz = store.quizzes.find((quiz) => quiz.id === id || quiz.slug === id) || demoQuiz;
    const localData = { experience: { id: localQuiz.id, name: localQuiz.name, slug: localQuiz.slug }, products: store.products, settings: store.settings, catalog: { active_products: store.products.filter((product) => product.active).length } };
    if (store.mode === "demo" || localQuiz.id === id || localQuiz.slug === id) {
      setData(localData);
      setReport(runSemanticProductSearch({ query: starterQueries[0], products: store.products, limit: 6 }));
      setLoading(false);
      return;
    }
    fetch(`/api/public/search/${encodeURIComponent(id)}`).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || "Search experience not found.");
      return response.json();
    }).then((result) => setData({ ...result, settings: result.settings || demoSettings })).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id, store.ready, store.mode, store.quizzes, store.products, store.settings]);

  const track = useCallback(async (eventType: SearchEventType, productId?: string, extraMetadata: Record<string, unknown> = {}) => {
    if (!data) return;
    const metadata = { experience_type: "search", experience_id: data.experience.id, experience_name: data.experience.name, experience_slug: data.experience.slug, ...getSessionMetadata(), ...extraMetadata };
    if (store.mode === "demo") await store.recordEvent(eventType, data.experience.id, productId, metadata);
    else fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, quizId: data.experience.id, productId, metadata }) }).catch(() => undefined);
  }, [data, store]);

  useEffect(() => { if (!data || viewed.current) return; viewed.current = true; track("widget_view", undefined, { catalog_active_products: data.catalog.active_products }); }, [data, track]);

  async function submitSearch(nextQuery = query) {
    if (!data || !nextQuery.trim()) return;
    setQuery(nextQuery);
    setSearchError("");
    setSearching(true);
    try {
      const nextReport = store.mode === "demo" && data.products
        ? runSemanticProductSearch({ query: nextQuery, products: data.products, limit: 6 })
        : await fetch(`/api/public/search/${encodeURIComponent(data.experience.slug || data.experience.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: nextQuery, limit: 6 }),
        }).then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "Search failed.");
          return payload as ProductSearchReport;
        });
      setReport(nextReport);
      await track("quiz_start", undefined, { search_action: "search_submit", query: nextReport.query, terms: nextReport.intent.terms, max_budget: nextReport.intent.maxBudget, result_count: nextReport.results.length, explanation_source: nextReport.explanationSource || "deterministic" });
      await Promise.all(nextReport.results.slice(0, 3).map((result, index) => track("product_recommended", result.product.id, { query: nextReport.query, rank: index + 1, score: result.score, confidence: result.confidence, matched_signals: result.matchedSignals.map((signal) => signal.term), explanation_source: nextReport.explanationSource || "deterministic", product_name: result.product.name })));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  const accent = data?.settings.primary_color || "#22352a";
  const topResult = report.results[0];
  const maxScore = Math.max(1, ...report.results.map((result) => result.score));
  const suggestions = useMemo(() => report.suggestions.length ? report.suggestions : starterQueries, [report.suggestions]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#e8eadf]"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-moss" /><p className="mt-3 text-xs font-bold text-black/40">Preparing product search…</p></div></main>;
  if (error || !data) return <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/5"><Search size={21} /></span><h1 className="display mt-5 text-4xl">This search experience isn’t available.</h1><p className="mt-2 text-sm text-black/45">{error || "It may be unpublished or no longer exist."}</p><Link href="/" className="btn-primary mt-5">Visit Findly</Link></div></main>;

  return <main className="noise min-h-screen bg-[#e8eadf] p-3 sm:p-6 lg:p-10">
    <section className="relative mx-auto min-h-[calc(100vh-24px)] max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-soft sm:min-h-[calc(100vh-48px)] lg:min-h-[700px]">
      <div className="dot-grid absolute inset-0 opacity-30" />
      <header className="relative flex items-center justify-between border-b border-black/[0.06] bg-white/80 px-5 py-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2.5 text-sm font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: accent }}><Search size={14} /></span>{data.settings.brand_name}</div>
        <span className="hidden items-center gap-1.5 text-[10px] font-bold text-black/35 sm:flex"><ShieldCheck size={13} /> Deterministic catalog search</span>
      </header>

      <div className="relative grid gap-0 lg:grid-cols-[.9fr_1.1fr]">
        <aside className="flex flex-col justify-center bg-ink px-7 py-10 text-white sm:px-10 lg:min-h-[620px]">
          <p className="eyebrow text-lime">Product search</p>
          <h1 className="display mt-4 text-5xl leading-[.95] sm:text-6xl">Tell us what you need.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/45">Search by use case, feature, category or budget. Findly only ranks active catalog products and shows the signals behind each result.</p>

          <form onSubmit={(event) => { event.preventDefault(); submitSearch(); }} className="mt-7 rounded-2xl bg-white p-1.5 text-ink">
            <div className="flex">
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none" placeholder="e.g. waterproof hiking shoes under £140" />
              <button disabled={searching || !query.trim()} className="rounded-full px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50" style={{ background: accent }}>{searching ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}</button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((suggestion) => <button key={suggestion} onClick={() => submitSearch(suggestion)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-extrabold text-white/55 transition hover:bg-white/10">{suggestion}</button>)}
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{data.catalog.active_products}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/30">Active</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.intent.terms.length}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/30">Terms</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.results.length}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/30">Results</p></div>
          </div>
        </aside>

        <main className="max-h-[760px] overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-moss">Ranked matches</p>
              <h2 className="display mt-2 text-4xl">{topResult ? topResult.product.name : "Search the catalog"}</h2>
              <p className="mt-2 text-xs leading-5 text-black/45">{topResult ? topResult.explanation : "Use natural shopper language to find matching products."}</p>
            </div>
            {report.intent.maxBudget && <span className="shrink-0 rounded-full bg-lime/45 px-3 py-1.5 text-[9px] font-extrabold text-moss">Budget {formatCurrency(report.intent.maxBudget)}</span>}
          </div>

          {searchError && <p className="mt-5 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{searchError}</p>}

          <div className="mt-5 flex flex-wrap gap-1.5">
            {report.intent.coverage.slice(0, 10).map((item) => <span key={item.term} className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${item.status === "covered" ? "bg-lime/35 text-moss" : item.status === "thin" ? "bg-amber-50 text-amber-700" : "bg-canvas text-black/35"}`}>{item.term}</span>)}
          </div>

          <div className="mt-6 space-y-3">
            {report.results.map((result, index) => <article key={result.product.id} className="grid gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr]">
              <div className="relative h-28 overflow-hidden rounded-2xl bg-canvas">
                {result.product.image_url ? <img src={result.product.image_url} alt={result.product.name} className="h-full w-full object-cover" /> : <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black/20" />}
                <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-1 text-[8px] font-extrabold text-moss">#{index + 1}</span>
              </div>
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold">{result.product.name}</h3>
                    <p className="mt-1 text-[10px] font-bold text-black/35">{result.product.category} · {formatCurrency(result.product.price)}</p>
                  </div>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-[9px] font-extrabold text-black/40">{result.score.toFixed(1)}</span>
                </div>
                <p className="mt-3 text-[10px] leading-4 text-black/45">{result.explanation}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, result.score / maxScore * 100)}%` }} /></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.matchedSignals.slice(0, 5).map((signal) => <span key={`${result.product.id}-${signal.term}-${signal.source}`} className="rounded-full bg-black/[0.04] px-2 py-1 text-[8px] font-bold text-black/40">{signal.term} · +{signal.contribution.toFixed(1)}</span>)}
                </div>
                <a onClick={() => track("buy_click", result.product.id, { query: report.query, rank: index + 1, score: result.score, confidence: result.confidence, product_name: result.product.name })} href={result.product.product_url || "#"} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-extrabold text-white" style={{ background: accent }}>View product <ExternalLink size={11} /></a>
              </div>
            </article>)}

            {!report.results.length && <div className="grid min-h-[280px] place-items-center rounded-2xl border border-dashed border-black/10 bg-canvas/60 p-10 text-center">
              <div>
                <Search className="mx-auto text-black/25" />
                <h3 className="mt-4 text-sm font-extrabold">Start with a search</h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-black/40">Try a product use case, must-have feature, category or budget.</p>
              </div>
            </div>}
          </div>
        </main>
      </div>

      <footer className="relative flex items-center justify-between border-t border-black/[0.05] bg-white/80 px-5 py-3 text-[9px] font-bold text-black/25 sm:px-8"><span>Powered by <b className="text-black/45">findly</b></span><span>Only active catalog products are ranked</span></footer>
    </section>
  </main>;
}
