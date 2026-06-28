"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpenCheck, Clipboard, FileText, MessageCircle, Search, ShieldCheck, Sparkles, Tags } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildVocabularyStudioReport, type VocabularyStudioItemStatus, type VocabularyStudioStatus } from "@/lib/vocabulary-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const itemTone: Record<VocabularyStudioItemStatus, string> = {
  approved: "bg-lime/35 text-moss",
  review: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-700",
};

const statusTone: Record<VocabularyStudioStatus, string> = {
  ready: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

export default function VocabularyPage() {
  const { ready, products, quizzes, events } = useStore();
  const [copied, setCopied] = useState<"packet" | "glossary" | "">("");
  const report = useMemo(() => buildVocabularyStudioReport({ products, quizzes, events }), [products, quizzes, events]);

  async function copy(text: string, type: "packet" | "glossary") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Reviewing vocabulary coverage…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Vocabulary Studio</p>
          <h1 className="display mt-2 text-5xl">Approve the language Findly can safely use.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Review shopper terms, synonyms, unsupported queries and product-level semantic fields before they power search, advisor answers, quiz options and AI explanations.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => copy(report.glossary, "glossary")} className="btn-secondary"><BookOpenCheck size={14} /> {copied === "glossary" ? "Glossary copied" : "Copy glossary"}</button>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy vocabulary packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Tags size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">Discovery vocabulary readiness across catalog, quiz, benefit and shopper analytics language.</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.approvedTerms}</p><p className="mt-1 text-xs text-white/35">Approved</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.reviewTerms}</p><p className="mt-1 text-xs text-white/35">Review</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.missingTerms}</p><p className="mt-1 text-xs text-white/35">Missing</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.terms, "Terms", MessageCircle],
            [report.summary.synonymClusters, "Synonym clusters", Sparkles],
            [`${report.summary.benefitCoverage}%`, "Benefit coverage", ShieldCheck],
            [report.summary.productTasks, "Product tasks", FileText],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof MessageCircle;
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Approved discovery dictionary</h2>
                <p className="mt-1 text-xs text-black/35">Terms Findly can use for semantic search, advisor interpretation, finder options and grounded explanation evidence.</p>
              </div>
              <Link href="/dashboard/ontology" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open ontology <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.terms.slice(0, 12).map((term) => (
                <article key={term.term} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{term.label}</h3><p className="mt-1 text-xs font-bold text-black/30">{term.sourceLabel}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", itemTone[term.status])}>{term.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{term.reviewNote}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/35">{term.productCount} direct</span>
                    <span className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/35">{term.semanticProductCount} semantic</span>
                    {term.canonicalSignal && <span className="rounded-full bg-lime/25 px-2 py-1 text-xs font-extrabold text-moss">{term.canonicalSignal.label}</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Unsupported shopper language</h2>
            <p className="mt-1 text-xs text-black/35">Observed or suggested terms that should be approved, rejected, or added to product facts before launch.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.unsupportedTerms.map((term) => (
                <article key={term.term} className="rounded-2xl bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold text-red-800">{term.label}</h3><p className="mt-1 text-xs font-bold text-red-700/60">{term.exampleQueries[0] || "No query sample"}</p></div>
                    <AlertTriangle size={15} className="text-red-600" />
                  </div>
                  <p className="mt-3 text-xs font-bold leading-4 text-red-700">{term.reviewNote}</p>
                </article>
              ))}
              {!report.unsupportedTerms.length && <p className="rounded-2xl bg-lime/15 p-5 text-xs font-extrabold text-moss">No unsupported shopper terms detected in the current workspace.</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Synonym review clusters</h2>
            <p className="mt-1 text-xs text-black/35">Approve only the synonyms that are true for the mapped products; don’t let AI or search imply unsupported product claims.</p>
            <div className="mt-5 space-y-3">
              {report.synonymClusters.slice(0, 8).map((cluster) => (
                <article key={cluster.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{cluster.anchor}</h3><p className="mt-1 text-xs leading-4 text-black/40">{cluster.recommendation}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", itemTone[cluster.status])}>{cluster.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cluster.synonyms.map((synonym) => <span key={`${cluster.id}-${synonym.term}`} className={cn("rounded-full px-2 py-1 text-xs font-extrabold", itemTone[synonym.status])}>{synonym.term} · {synonym.productCount}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Vocabulary action queue</h2>
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

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Search size={16} className="text-lime" /> Product language tasks</h2>
            <div className="mt-4 space-y-2">
              {report.productTasks.slice(0, 5).map((task) => (
                <article key={task.productId} className="rounded-2xl bg-white/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{task.productName}</h3><p className="mt-1 text-xs font-bold text-white/35">{task.missingFields.join(", ") || "Review language"}</p></div>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", itemTone[task.status])}>{task.score}%</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs font-bold leading-4 text-white/45">{task.suggestedSearchText}</p>
                </article>
              ))}
              {!report.productTasks.length && <p className="rounded-2xl bg-lime/10 p-4 text-xs font-bold leading-4 text-lime">All products have enough semantic language for launch QA.</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Governance checks</h2>
            <div className="mt-4 space-y-2">
              {report.governance.map((item) => (
                <div key={item.id} className={cn("rounded-xl p-3", item.status === "pass" ? "bg-lime/20" : item.status === "warn" ? "bg-amber-50" : "bg-red-50")}>
                  <p className="text-xs font-extrabold">{item.label}</p>
                  <p className="mt-1 text-xs font-bold leading-4 text-black/40">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Quiz opportunities</h2>
            <div className="mt-4 space-y-2">
              {report.quizOpportunities.map((item) => (
                <article key={item.id} className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold">{item.title}</p>
                  <p className="mt-2 text-xs leading-4 text-black/45">{item.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{item.suggestedQuestion}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{item.suggestedOptions.map((option) => <span key={`${item.id}-${option}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{option}</span>)}</div>
                </article>
              ))}
              {!report.quizOpportunities.length && <p className="rounded-2xl bg-canvas p-4 text-xs font-bold leading-4 text-black/35">No vocabulary-driven quiz updates needed right now.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
