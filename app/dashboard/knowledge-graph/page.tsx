"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, BrainCircuit, CheckCircle2, Clipboard, GitBranch, Layers3, LockKeyhole, Network, Search, ShieldCheck, Sparkles, Tags, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildSemanticKnowledgeGraphReport, type SemanticGraphActionPriority, type SemanticGraphLayerStatus, type SemanticGraphStatus } from "@/lib/semantic-knowledge-graph";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<SemanticGraphStatus, string> = {
  ready: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const layerTone: Record<SemanticGraphLayerStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<SemanticGraphActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

function LayerIcon({ status }: { status: SemanticGraphLayerStatus }) {
  if (status === "pass") return <CheckCircle2 size={16} />;
  if (status === "warn") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

function PriorityIcon({ priority }: { priority: SemanticGraphActionPriority }) {
  if (priority === "critical") return <LockKeyhole size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <AlertTriangle size={14} />;
  return <CheckCircle2 size={14} />;
}

const entityIcon = {
  product: Boxes,
  category: Layers3,
  signal: Network,
  benefit: Sparkles,
  term: Tags,
  rule: GitBranch,
  configurator: Wrench,
};

export default function KnowledgeGraphPage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildSemanticKnowledgeGraphReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Building semantic knowledge graph…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Semantic Knowledge Graph</p>
            <h1 className="display mt-3 text-5xl">Connect catalog facts, shopper language, rules and compatibility into one discovery graph.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Sellentum keeps the Zoovu-style knowledge graph practical for an MVP: ontology, benefits, vocabulary, finder rules, grounding evidence and configurator dependencies are visible before AI explains anything.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/ontology" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><Network size={14} /> Ontology</Link>
              <Link href="/dashboard/decision-graph" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><GitBranch size={14} /> Decision graph</Link>
              <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Graph copied" : "Copy graph packet"}</button>
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
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.readyLayers}</p><p className="mt-1 text-xs text-white/45">Ready</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.reviewLayers}</p><p className="mt-1 text-xs text-white/45">Review</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockedLayers}</p><p className="mt-1 text-xs text-white/45">Blocked</p></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-3">
          {[
            [report.summary.products, "Products", Boxes],
            [report.summary.entities, "Entities", BrainCircuit],
            [report.summary.edges, "Graph edges", Network],
            [report.summary.layers, "Layers", Layers3],
            [report.summary.weakLinks, "Weak links", AlertTriangle],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Boxes;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Semantic graph layers</h2><p className="mt-1 text-sm text-black/45">The layers that make product discovery explainable without enterprise graph infrastructure.</p></div><BrainCircuit className="text-moss" size={18} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.layers.map((layer) => (
              <Link key={layer.id} href={layer.href} className="rounded-2xl border border-black/[0.07] bg-canvas p-5 transition hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", layerTone[layer.status])}><LayerIcon status={layer.status} /></span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-black/40">{layer.score}%</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold tracking-[-.025em]">{layer.label}</h3>
                <p className="mt-2 text-sm leading-5 text-black/50">{layer.detail}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white p-3"><p className="text-lg font-extrabold">{layer.entities}</p><p className="mt-1 text-xs text-black/35">Entities</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-lg font-extrabold">{layer.edges}</p><p className="mt-1 text-xs text-black/35">Edges</p></div>
                </div>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/45">{layer.evidence}</p>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Graph action queue</h2><p className="mt-1 text-sm text-black/45">Weak semantic layers to review before launch.</p></div><Wrench className="text-moss" size={17} /></div>
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
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.025em]">Safe-AI graph boundary</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-white/45">This graph can ground prompts and explain recommendations, but deterministic rules still select products before AI writes any shopper-facing copy.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-sm font-extrabold text-ink">{copied ? "Copied" : "Copy graph packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Weak links</h2><p className="mt-1 text-sm text-black/45">The semantic gaps most likely to break guided-selling confidence.</p></div><AlertTriangle className="text-amber-600" size={18} /></div>
          <div className="mt-5 space-y-3">
            {report.weakLinks.map((link) => (
              <Link key={link.id} href={link.href} className="block rounded-2xl border border-black/[0.07] bg-canvas p-4 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", layerTone[link.status])}>{link.status}</span><h3 className="mt-3 text-sm font-extrabold">{link.label}</h3><p className="mt-1 text-xs font-bold text-black/35">{link.source}</p></div>
                  <ArrowRight size={13} className="text-black/25" />
                </div>
                <p className="mt-3 text-sm leading-5 text-black/50">{link.detail}</p>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/45">{link.action}</p>
              </Link>
            ))}
            {!report.weakLinks.length && <div className="rounded-2xl border border-lime/40 bg-lime/10 p-6 text-center"><CheckCircle2 className="mx-auto text-moss" size={22} /><p className="mt-3 text-sm font-extrabold">No major weak links detected</p><p className="mt-1 text-sm text-black/45">Keep the graph attached to production verification before launch.</p></div>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Connected entities</h2><p className="mt-1 text-sm text-black/45">Products, signals, benefits, terms, rules and configurator options with the most graph connections.</p></div><Search className="text-moss" size={18} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.entities.map((entity) => {
              const Icon = entityIcon[entity.type];
              return (
                <article key={entity.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-moss"><Icon size={16} /></span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", layerTone[entity.status])}>{entity.status}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold">{entity.label}</h3>
                  <p className="mt-2 text-sm leading-5 text-black/50">{entity.detail}</p>
                  <p className="mt-3 text-xs font-bold text-black/35">{entity.connections} connection{entity.connections === 1 ? "" : "s"} · {entity.type}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
