"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Boxes, BrainCircuit, CheckCircle2, Clipboard, Code2, ExternalLink, Gauge, MessageCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildAdvisorStudioReport, type AdvisorScenarioStatus, type AdvisorStudioCheckStatus } from "@/lib/advisor-studio";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<AdvisorScenarioStatus, string> = {
  recommendations: "bg-lime/35 text-moss",
  clarifying: "bg-blue-50 text-blue-700",
  weak: "bg-amber-50 text-amber-700",
  "no-results": "bg-red-50 text-red-700",
};

const checkTone: Record<AdvisorStudioCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

function checkIcon(status: AdvisorStudioCheckStatus) {
  if (status === "pass") return CheckCircle2;
  if (status === "warn") return AlertTriangle;
  return ShieldCheck;
}

export default function AdvisorStudioPage() {
  const { ready, products, quizzes, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [prompt, setPrompt] = useState("I need something comfortable for long days under £150");
  const [copied, setCopied] = useState<"packet" | "snippet" | "">("");
  const report = useMemo(() => buildAdvisorStudioReport({ products, quizzes, events, settings, origin, focusPrompt: prompt }), [products, quizzes, events, settings, origin, prompt]);
  const scenario = report.activeScenario;
  const previewFinder = quizzes.find((quiz) => quiz.published) || quizzes[0];

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy(text: string, type: "packet" | "snippet") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Loading Advisor Studio…" />;

  if (!products.length) {
    return <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><Bot size={25} /></span>
        <h1 className="display mt-5 text-4xl">Advisor Studio needs catalog data.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Add products or upload a CSV, then test conversational prompts before embedding the advisor on your storefront.</p>
        <Link href="/dashboard/products" className="btn-primary mt-6"><Boxes size={15} /> Add products</Link>
      </div>
    </div>;
  }

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Advisor Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Test your conversational product advisor.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Simulate open-ended shopper requests, inspect parsed intent, prove recovery prompts, and copy the assistant widget packet before you place it on product, category or support pages.</p>
        </div>
        <div className="flex gap-3">
          <Link href={previewFinder ? `/assistant/${previewFinder.slug || previewFinder.id}` : "/dashboard/quizzes"} target={previewFinder ? "_blank" : undefined} className="btn-secondary"><ExternalLink size={14} /> Preview advisor</Link>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy advisor packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Bot size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "review" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.recommendationPrompts}</p><p className="mt-1 text-xs text-white/35">Recommend</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.clarifyingPrompts}</p><p className="mt-1 text-xs text-white/35">Clarify</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.weakPrompts + report.summary.noResultPrompts}</p><p className="mt-1 text-xs text-white/35">Tune</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.activeProducts, "Active products", Boxes],
            [report.summary.publishedFinders, "Published context", ShieldCheck],
            [report.summary.prompts, "Prompt tests", MessageCircle],
            [report.summary.observedAdvisorQueries, "Observed queries", Search],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Boxes;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
              </article>
            );
          })}
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-[30px] border border-black/[0.07] bg-ink text-white">
        <div className="grid gap-0 xl:grid-cols-[1fr_380px]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><BrainCircuit size={19} /></span>
              <div>
                <p className="text-sm font-extrabold">Conversation prompt</p>
                <p className="mt-0.5 text-xs text-white/35">This mirrors the deterministic intent and recovery checks behind the public advisor runtime.</p>
              </div>
            </div>
            <div className="mt-6 flex rounded-2xl border border-white/10 bg-white p-1.5 text-ink">
              <input value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none" placeholder="Try: I need a durable product for rainy weekends under £150" />
              <button className="btn-primary !px-5 !py-3 text-xs"><ArrowRight size={14} /> Test</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {report.scenarios.slice(0, 6).map((item) => (
                <button key={item.id} onClick={() => setPrompt(item.prompt)} className={cn("rounded-full border px-3 py-1.5 text-xs font-extrabold transition", prompt === item.prompt ? "border-lime bg-lime text-ink" : "border-white/10 bg-white/[0.06] text-white/55 hover:bg-white/10")}>{item.prompt}</button>
              ))}
            </div>
          </div>
          <aside className="border-t border-white/10 bg-white/[0.04] p-6 xl:border-l xl:border-t-0">
            <p className="flex items-center gap-2 text-xs font-extrabold"><Gauge size={15} className="text-lime" /> Parsed advisor intent</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{scenario.terms.length}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">Intent terms</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{scenario.maxBudget ? formatCurrency(scenario.maxBudget) : "—"}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">Budget</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {scenario.terms.slice(0, 12).map((term) => <span key={term} className="rounded-full bg-lime/15 px-2 py-1 text-xs font-extrabold text-lime">{term}</span>)}
              {!scenario.terms.length && <span className="text-xs font-bold text-white/35">Try a more specific shopper request.</span>}
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Advisor response QA</h2>
                <p className="mt-1 text-xs text-black/35">The Studio checks whether this prompt should recommend, clarify, or recover safely.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[scenario.status])}>{scenario.status}</span>
            </div>
            <div className="mt-5 rounded-2xl bg-canvas p-5">
              <p className="flex items-center gap-2 text-xs font-extrabold text-moss"><Bot size={15} /> Simulated advisor message</p>
              <p className="mt-3 text-lg font-extrabold leading-7 tracking-[-.035em]">{scenario.assistantMessage}</p>
            </div>

            {scenario.recovery.status !== "healthy" && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-extrabold">{scenario.recovery.primaryAction}</h3>
                    <p className="mt-1 text-xs leading-4 text-black/45">{scenario.recovery.summary}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold uppercase text-amber-700">{scenario.recovery.status}</span>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {scenario.recovery.suggestions.map((suggestion) => (
                    <button key={suggestion.id} onClick={() => suggestion.prompt && setPrompt(suggestion.prompt)} className="rounded-xl bg-white p-3 text-left">
                      <p className="text-xs font-extrabold">{suggestion.title}</p>
                      <p className="mt-1 text-xs leading-4 text-black/40">{suggestion.detail}</p>
                      {suggestion.prompt && <p className="mt-2 text-xs font-extrabold text-moss">Try: {suggestion.prompt}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Recommended products</h2>
            <p className="mt-1 text-xs text-black/35">Products stay deterministically ranked by catalog terms, buyer needs, features and budget eligibility before AI copy is generated.</p>
            <div className="mt-5 space-y-3">
              {scenario.results.map((result, index) => (
                <article key={result.product.id} className="grid gap-5 rounded-2xl border border-black/[0.07] p-4 xl:grid-cols-[260px_1fr]">
                  <div className="flex items-start gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-canvas">
                      {result.product.image_url ? <img src={result.product.image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles size={20} className="text-black/20" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-lime px-2 py-1 text-xs font-extrabold text-moss">#{index + 1}</span>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold", result.confidence === "strong" ? "bg-moss text-white" : result.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-black/5 text-black/35")}>{result.confidence}</span>
                      </div>
                      <h3 className="mt-2 truncate text-sm font-extrabold">{result.product.name}</h3>
                      <p className="mt-1 text-xs font-bold text-black/35">{result.product.category} · {formatCurrency(result.product.price)}</p>
                      {result.product.product_url && <a href={result.product.product_url} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Product URL <ExternalLink size={10} /></a>}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <p className="max-w-2xl text-xs font-bold leading-5 text-black/45">{result.explanation}</p>
                      <span className="shrink-0 rounded-full bg-canvas px-3 py-1.5 text-xs font-extrabold text-black/45">Score {result.score.toFixed(2)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {result.matchedSignals.slice(0, 8).map((signal) => <span key={`${result.product.id}-${signal.term}-${signal.source}`} className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/40">{signal.term} · {signal.source} +{signal.contribution.toFixed(1)}</span>)}
                    </div>
                  </div>
                </article>
              ))}
              {!scenario.results.length && <div className="rounded-2xl border border-dashed border-black/10 bg-canvas p-8 text-center"><p className="text-xs font-extrabold">No deterministic recommendations yet</p><p className="mt-1 text-xs text-black/35">Use the recovery prompts above or enrich the catalog terms behind this request.</p></div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Catalog term coverage</h2>
            <p className="mt-1 text-xs text-black/35">Every parsed shopper word should map to product copy, tags, buyer needs, features or semantic search text.</p>
            <div className="mt-5 grid gap-2 xl:grid-cols-2">
              {scenario.coverage.map((item) => (
                <div key={item.term} className={cn("rounded-xl border px-3 py-2", item.status === "covered" ? "border-lime/50 bg-lime/15" : item.status === "thin" ? "border-amber-200 bg-amber-50" : "border-red-100 bg-red-50")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold">{item.term}</p>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-extrabold uppercase", item.status === "covered" ? "bg-lime text-moss" : item.status === "thin" ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-600")}>{item.status}</span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-black/35">{item.productCount} active product{item.productCount === 1 ? "" : "s"} · {item.sources.length ? item.sources.join(", ") : "no matching field"}</p>
                </div>
              ))}
              {!scenario.coverage.length && <p className="rounded-xl bg-canvas px-3 py-5 text-center text-xs leading-4 text-black/35 xl:col-span-2">Enter a more specific shopper prompt to inspect catalog coverage.</p>}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Advisor readiness checks</h2>
            <div className="mt-4 space-y-3">
              {report.checks.map((check) => {
                const Icon = checkIcon(check.status);
                return (
                  <Link key={check.id} href={check.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                    <div className="flex items-start gap-3">
                      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", checkTone[check.status])}><Icon size={16} /></span>
                      <div>
                        <div className="flex items-center gap-2"><h3 className="text-xs font-extrabold">{check.label}</h3><span className={cn("rounded-full px-2 py-0.5 text-xs font-extrabold uppercase", checkTone[check.status])}>{check.status}</span></div>
                        <p className="mt-2 text-xs leading-4 text-black/45">{check.detail}</p>
                        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{check.evidence}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-lime" /> Assistant widget snippet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Use this modal advisor on support pages, product pages or category pages when shoppers need conversational help.</p>
            <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-black/25 p-3 text-xs leading-4 text-white/55">{report.snippet}</pre>
            <button onClick={() => copy(report.snippet, "snippet")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied === "snippet" ? "Snippet copied" : "Copy snippet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Advisor action queue</h2>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", action.priority === "critical" ? "bg-red-50 text-red-700" : action.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
