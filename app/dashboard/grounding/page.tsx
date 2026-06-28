"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpenCheck, BrainCircuit, CheckCircle2, Clipboard, Database, FileText, LockKeyhole, Search, ShieldCheck, Sparkles, Tags, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildGroundingCenterReport, type GroundingActionPriority, type GroundingCenterStatus, type GroundingItemStatus } from "@/lib/grounding-center";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<GroundingCenterStatus, string> = {
  ready: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const itemTone: Record<GroundingItemStatus, string> = {
  grounded: "bg-lime/35 text-moss",
  review: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-700",
};

const priorityTone: Record<GroundingActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/45",
};

function StatusIcon({ status }: { status: GroundingItemStatus }) {
  if (status === "grounded") return <CheckCircle2 size={16} />;
  if (status === "review") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

function PriorityIcon({ priority }: { priority: GroundingActionPriority }) {
  if (priority === "critical") return <LockKeyhole size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <AlertTriangle size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function GroundingCenterPage() {
  const { ready, products, quizzes, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildGroundingCenterReport({ products, quizzes, events }), [products, quizzes, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Building AI-safe fact map…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Grounding Center</p>
            <h1 className="display mt-3 text-5xl">Make every AI explanation trace back to product facts.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Findly turns catalog descriptions, features, buyer needs, semantic text, benefit mappings, approved vocabulary and explanation audits into an AI-safe grounding map for each product.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/vocabulary" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><Tags size={14} /> Vocabulary</Link>
              <Link href="/dashboard/trust-center" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><ShieldCheck size={14} /> AI Trust</Link>
              <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Packet copied" : "Copy grounding packet"}</button>
            </div>
          </div>
          <div className="w-[370px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><BrainCircuit size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.groundedProducts}</p><p className="mt-1 text-xs text-white/45">Grounded</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.reviewProducts}</p><p className="mt-1 text-xs text-white/45">Review</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.missingProducts}</p><p className="mt-1 text-xs text-white/45">Missing</p></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-3">
          {[
            [report.summary.groundedFacts, "Grounded facts", Database],
            [report.summary.benefitMappings, "Benefit mappings", Sparkles],
            [report.summary.approvedTerms, "Approved terms", BookOpenCheck],
            [report.summary.explanationAudits, "Explanation audits", FileText],
            [report.summary.unsupportedTerms, "Unsupported terms", AlertTriangle],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Database;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold">Grounded product fact map</h2>
              <p className="mt-1 text-sm text-black/45">Product-by-product evidence Findly can safely use for advisor answers, semantic search explanations and result-card copy.</p>
            </div>
            <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-sm font-extrabold text-moss">Edit catalog <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.products.map((product) => (
              <article key={product.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", itemTone[product.status])}>{product.status}</span>
                    <h3 className="mt-4 text-xl font-extrabold tracking-[-.025em]">{product.productName}</h3>
                    <p className="mt-1 text-sm font-bold text-black/40">{product.category}</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-center"><span className="text-lg font-extrabold">{product.score}%</span></div>
                </div>
                <p className="mt-4 text-sm leading-6 text-black/50">{product.recommendation}</p>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    [product.evidenceCount, "Facts"],
                    [product.benefitCount, "Benefits"],
                    [product.approvedTermCount, "Terms"],
                    [product.auditCount, "Audits"],
                  ].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-white p-3"><p className="text-lg font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold text-black/35">{String(label)}</p></div>)}
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-black/35">AI guardrail</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-black/50">{product.guardrail}</p>
                </div>
                {product.sampleExplanation && <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-moss">Sample grounded explanation</p><p className="mt-2 text-sm font-bold leading-6 text-black/50">{product.sampleExplanation}</p></div>}
                {!!product.unsupportedTerms.length && <div className="mt-4 flex flex-wrap gap-1.5">{product.unsupportedTerms.map((term) => <span key={`${product.id}-${term}`} className="rounded-full bg-red-50 px-2 py-1 text-xs font-extrabold text-red-700">{term}</span>)}</div>}
              </article>
            ))}
            {!report.products.length && <div className="col-span-2 rounded-[24px] border border-dashed border-black/10 p-12 text-center"><Database className="mx-auto text-black/25" size={28} /><p className="mt-4 text-sm font-extrabold">No products to ground yet</p><p className="mt-2 text-sm text-black/45">Add active products before AI-safe fact maps can be generated.</p></div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Grounding action queue</h2><p className="mt-1 text-sm text-black/45">What to fix before AI copy can safely scale.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><PriorityIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{action.title}</span><span className="mt-1 block text-sm leading-5 text-black/45">{action.detail}</span><span className="mt-2 block text-xs font-bold text-black/35">{action.evidence}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><ShieldCheck size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.025em]">RAG grounding boundary</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-white/45">AI can explain only product facts, approved vocabulary, benefit mappings and audited recommendation evidence. Deterministic matching still selects products first.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-sm font-extrabold text-ink">{copied ? "Copied" : "Copy grounding packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Readiness checks</h2><p className="mt-1 text-sm text-black/45">The evidence layers that make AI-safe product discovery possible.</p></div><CheckCircle2 className="text-moss" size={17} /></div>
          <div className="mt-5 space-y-3">
            {report.checks.map((check) => (
              <article key={check.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", itemTone[check.status])}><StatusIcon status={check.status} /></span>
                  <div>
                    <h3 className="text-sm font-extrabold">{check.label}</h3>
                    <p className="mt-1 text-sm leading-5 text-black/45">{check.detail}</p>
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/40">{check.recommendation}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Approved evidence detail</h2><p className="mt-1 text-sm text-black/45">A compact view of the facts, terms and benefits that can enter AI-facing prompts.</p></div><Search className="text-moss" size={17} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.products.slice(0, 6).map((product) => (
              <article key={`${product.id}-facts`} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><h3 className="text-sm font-extrabold">{product.productName}</h3><p className="mt-1 text-sm text-black/40">{product.facts.filter((fact) => fact.status === "grounded").length} grounded facts</p></div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", itemTone[product.status])}>{product.status}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {product.facts.filter((fact) => fact.status === "grounded").slice(0, 4).map((fact) => <p key={fact.id} className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/45"><span className="text-moss">{fact.label}:</span> {fact.detail}</p>)}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {product.approvedTerms.slice(0, 5).map((term) => <span key={`${product.id}-${term}`} className="rounded-full bg-lime/25 px-2 py-1 text-xs font-extrabold text-moss">{term}</span>)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
