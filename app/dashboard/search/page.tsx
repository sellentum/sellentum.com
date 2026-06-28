"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Boxes, BrainCircuit, ExternalLink, Gauge, Search, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { runSemanticProductSearch } from "@/lib/search-engine";
import { buildSearchRecoveryReport } from "@/lib/search-recovery";
import { buildSearchTuningReport } from "@/lib/search-tuning";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

const starterQueries = [
  "waterproof hiking shoes under £140",
  "lightweight city travel shoe",
  "comfortable everyday pair for long days",
  "responsive running shoe for faster road sessions",
];

export default function SearchLabPage() {
  const { ready, products } = useStore();
  const [query, setQuery] = useState(starterQueries[0]);
  const report = useMemo(() => runSemanticProductSearch({ query, products, limit: 6 }), [query, products]);
  const recovery = useMemo(() => buildSearchRecoveryReport(report), [report]);
  const tuning = useMemo(() => buildSearchTuningReport(report), [report]);
  const winner = report.results[0];

  if (!ready) return <LoadingState label="Loading semantic search lab…" />;

  if (!products.length) {
    return <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><Search size={25} /></span>
        <h1 className="display mt-5 text-4xl">Search needs catalog data.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Add products or upload a CSV, then use this lab to test natural-language search before embedding discovery experiences.</p>
        <Link href="/dashboard/products" className="btn-primary mt-6"><Boxes size={15} /> Add products</Link>
      </div>
    </div>;
  }

  return <div className="animate-rise">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-moss">Semantic search</p>
        <h1 className="display mt-2 text-5xl">Search like a shopper thinks.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Type natural intent, budgets, use cases or must-have features. Sellentum ranks active products deterministically from enriched catalog language, not AI guesswork.</p>
      </div>
      <Link href="/dashboard/products" className="btn-secondary self-start"><Boxes size={14} /> Manage catalog</Link>
    </div>

    <section className="mt-8 overflow-hidden rounded-[30px] border border-black/[0.07] bg-ink text-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[1fr_380px]">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Search size={19} /></span>
            <div>
              <p className="text-sm font-extrabold">Search query</p>
              <p className="mt-0.5 text-xs text-white/35">Backed by the same deterministic product signals as the advisor.</p>
            </div>
          </div>
          <div className="mt-6 flex rounded-2xl border border-white/10 bg-white p-1.5 text-ink">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none" placeholder="Try: durable waterproof option under £150" />
            <button className="btn-primary !px-5 !py-3 text-xs"><ArrowRight size={14} /> Rank</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {starterQueries.map((item) => <button key={item} onClick={() => setQuery(item)} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${query === item ? "border-lime bg-lime text-ink" : "border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/10"}`}>{item}</button>)}
          </div>
        </div>
        <aside className="border-t border-white/10 bg-white/[0.04] p-6 xl:border-l xl:border-t-0">
          <p className="flex items-center gap-2 text-xs font-extrabold"><BrainCircuit size={15} className="text-lime" /> Parsed intent</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/[0.06] p-4">
              <p className="text-2xl font-extrabold">{report.intent.terms.length}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">Intent terms</p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] p-4">
              <p className="text-2xl font-extrabold">{report.intent.maxBudget ? formatCurrency(report.intent.maxBudget) : "—"}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">Budget ceiling</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {report.intent.terms.slice(0, 12).map((term) => <span key={term} className="rounded-full bg-lime/15 px-2 py-1 text-xs font-extrabold text-lime">{term}</span>)}
            {!report.intent.terms.length && <span className="text-xs font-bold text-white/35">Add more specific product language to see intent terms.</span>}
          </div>
        </aside>
      </div>
    </section>

    <div className="mt-5 grid gap-4 lg:grid-cols-4">
      {[
        [report.activeProducts, "Active products", Boxes],
        [report.eligibleProducts, "Eligible after budget", ShieldCheck],
        [report.results.length, "Ranked results", Sparkles],
        [winner ? winner.score.toFixed(1) : "0.0", "Top score", Gauge],
      ].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof Boxes; return <div key={String(label)} className="rounded-2xl border border-black/[0.07] bg-white p-4">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={17} /></span>
        <p className="display mt-5 text-4xl">{String(value)}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
      </div>; })}
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
      <main className="space-y-3">
        {recovery.status !== "healthy" && <section className="rounded-[26px] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow text-amber-700">Search recovery</p>
              <h2 className="mt-2 text-xl font-extrabold tracking-[-.04em]">{recovery.primaryAction}</h2>
              <p className="mt-2 text-xs leading-5 text-black/45">{recovery.summary}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${recovery.status === "no-results" ? "bg-red-100 text-red-700" : "bg-white text-amber-700"}`}>{recovery.status}</span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {recovery.suggestions.map((suggestion) => (
              <button key={suggestion.id} onClick={() => suggestion.query && setQuery(suggestion.query)} className="rounded-2xl bg-white p-3 text-left">
                <p className="text-xs font-extrabold">{suggestion.title}</p>
                <p className="mt-1 text-xs leading-4 text-black/40">{suggestion.detail}</p>
                {suggestion.query && <p className="mt-2 text-xs font-extrabold text-moss">Try: {suggestion.query}</p>}
              </button>
            ))}
          </div>
          {recovery.nearMisses.length ? <div className="mt-4 rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold">Closest catalog options</p>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {recovery.nearMisses.map((item) => (
                <div key={item.productId} className="rounded-xl border border-black/[0.06] p-3">
                  <p className="truncate text-xs font-extrabold">{item.productName}</p>
                  <p className="mt-1 text-xs font-bold text-black/35">{item.category} · {formatCurrency(item.price)}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-3 text-black/40">{item.reason}</p>
                </div>
              ))}
            </div>
          </div> : null}
        </section>}

        {report.results.map((result, index) => <article key={result.product.id} className="grid gap-5 rounded-[26px] border border-black/[0.07] bg-white p-5 shadow-sm xl:grid-cols-[280px_1fr]">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-canvas">
              {result.product.image_url ? <img src={result.product.image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles size={20} className="text-black/20" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-lime px-2 py-1 text-xs font-extrabold text-moss">#{index + 1}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${result.confidence === "strong" ? "bg-moss text-white" : result.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-black/5 text-black/35"}`}>{result.confidence}</span>
              </div>
              <h2 className="mt-2 truncate text-sm font-extrabold">{result.product.name}</h2>
              <p className="mt-1 text-xs font-bold text-black/35">{result.product.category} · {formatCurrency(result.product.price)}</p>
              {result.product.product_url && <a href={result.product.product_url} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Product URL <ExternalLink size={10} /></a>}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="max-w-2xl text-xs font-bold leading-5 text-black/45">{result.explanation}</p>
              <span className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-xs font-extrabold text-black/45">Score {result.score.toFixed(2)}</span>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {result.matchedSignals.slice(0, 6).map((signal) => <div key={`${result.product.id}-${signal.term}-${signal.source}`} className="rounded-2xl border border-black/[0.06] bg-canvas/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">{signal.term}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">+{signal.contribution.toFixed(1)}</span>
                </div>
                <p className="mt-1 text-xs font-bold leading-4 text-black/35">{signal.source} · {signal.detail}</p>
              </div>)}
            </div>
          </div>
        </article>)}

        {!report.results.length && <div className="grid min-h-[300px] place-items-center rounded-[26px] border border-dashed border-black/10 bg-white/50 p-10 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-canvas text-black/35"><Search size={20} /></span>
            <h2 className="mt-4 text-sm font-extrabold">No ranked products yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-black/40">Try a product use case, category, feature, tag or budget. The engine only ranks active catalog products.</p>
          </div>
        </div>}
      </main>

      <aside className="space-y-5">
        <section className="rounded-[26px] border border-black/[0.07] bg-ink p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold"><WandSparkles size={14} className="text-lime" /> Search tuning plan</p>
              <p className="mt-2 text-xs leading-5 text-white/45">{tuning.summary}</p>
            </div>
            <span className="display text-4xl text-lime">{tuning.score}</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.06] p-2.5"><p className="text-sm font-extrabold">{tuning.counts.covered}</p><p className="mt-0.5 text-xs font-bold text-white/30">Covered</p></div>
            <div className="rounded-xl bg-white/[0.06] p-2.5"><p className="text-sm font-extrabold">{tuning.counts.thin}</p><p className="mt-0.5 text-xs font-bold text-white/30">Thin</p></div>
            <div className="rounded-xl bg-white/[0.06] p-2.5"><p className="text-sm font-extrabold">{tuning.counts.missing}</p><p className="mt-0.5 text-xs font-bold text-white/30">Missing</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {tuning.opportunities.map((item) => (
              <div key={item.title} className={`rounded-2xl border p-3 ${item.severity === "good" ? "border-lime/30 bg-lime/10" : item.severity === "critical" ? "border-red-300/25 bg-red-300/10" : "border-amber-200/25 bg-amber-200/10"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold leading-4">{item.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold uppercase ${item.severity === "good" ? "bg-lime text-moss" : item.severity === "critical" ? "bg-red-300 text-red-950" : "bg-amber-200 text-amber-950"}`}>{item.severity}</span>
                </div>
                <p className="mt-1.5 text-xs leading-4 text-white/45">{item.detail}</p>
                <p className="mt-1.5 text-xs leading-4 font-bold text-lime">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><BrainCircuit size={14} className="text-moss" /> Catalog term coverage</p>
          <p className="mt-2 text-xs leading-5 text-black/40">See whether each parsed shopper term exists in active product fields. Missing terms are catalog-enrichment opportunities.</p>
          <div className="mt-4 space-y-2">
            {report.intent.coverage.length ? report.intent.coverage.slice(0, 10).map((item) => (
              <div key={item.term} className={`rounded-xl border px-3 py-2 ${item.status === "covered" ? "border-lime/50 bg-lime/15" : item.status === "thin" ? "border-amber-200 bg-amber-50" : "border-red-100 bg-red-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold">{item.term}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold uppercase ${item.status === "covered" ? "bg-lime text-moss" : item.status === "thin" ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-600"}`}>{item.status}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-black/35">{item.productCount} active product{item.productCount === 1 ? "" : "s"} · {item.sources.length ? item.sources.join(", ") : "no matching field"}</p>
              </div>
            )) : <p className="rounded-xl bg-canvas px-3 py-5 text-center text-xs leading-4 text-black/35">Enter a more specific shopper query to inspect catalog coverage.</p>}
          </div>
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><WandSparkles size={14} className="text-moss" /> Search suggestions</p>
          <p className="mt-2 text-xs leading-5 text-black/40">Generated from active product tags, buyer needs, features and categories.</p>
          <div className="mt-4 space-y-2">
            {report.suggestions.map((suggestion) => <button key={suggestion} onClick={() => setQuery(suggestion)} className="w-full rounded-xl bg-canvas px-3 py-2.5 text-left text-xs font-extrabold text-black/55 hover:bg-lime/25">{suggestion}</button>)}
          </div>
        </section>

        <section className="rounded-[26px] border border-black/[0.07] bg-ink p-5 text-white">
          <p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={14} className="text-lime" /> Service endpoint</p>
          <p className="mt-2 text-xs leading-5 text-white/45">This lab mirrors the authenticated search service at <span className="font-extrabold text-lime">POST /api/search</span>. The endpoint returns parsed intent, eligibility counts, ranked products and explainable scoring signals.</p>
          <pre className="mt-4 overflow-hidden rounded-2xl bg-black/25 p-3 text-xs leading-4 text-white/55">{`{
  "query": "${query.slice(0, 42)}",
  "limit": 6
}`}</pre>
        </section>
      </aside>
    </div>
  </div>;
}
