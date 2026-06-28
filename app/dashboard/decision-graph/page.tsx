"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, BrainCircuit, CheckCircle2, GitBranch, MessageCircle, Network, PackagePlus, Search, ShieldCheck, Sparkles, Workflow, XCircle } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildDecisionGraph, type DecisionGraphStatus } from "@/lib/decision-graph";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const laneIcons = {
  catalog: Boxes,
  finder: GitBranch,
  configurator: PackagePlus,
  language: MessageCircle,
};

const statusTone: Record<DecisionGraphStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const nodeTone = {
  product: "bg-blue-50 text-blue-700",
  signal: "bg-lime/35 text-moss",
  question: "bg-purple-50 text-purple-700",
  answer: "bg-peach/50 text-ink",
  configurator: "bg-ink text-lime",
  option: "bg-canvas text-black/55",
  shopper_term: "bg-amber-50 text-amber-700",
};

export default function DecisionGraphPage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const report = useMemo(() => buildDecisionGraph({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  if (!ready) return <LoadingState label="Building decision graph…" />;

  if (!products.length) {
    return <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><Workflow size={25} /></span>
        <h1 className="display mt-5 text-4xl">Your decision graph starts with products.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Add or import products, then Sellentum will connect catalog facts to finder rules, shopper language and configurator compatibility.</p>
        <Link href="/dashboard/products" className="btn-primary mt-6"><Boxes size={15} /> Add products</Link>
      </div>
    </div>;
  }

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Decision graph</p>
          <h1 className="display mt-2 text-5xl">Prove every recommendation path.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">A Zoovu-style trust layer for Sellentum: catalog signals, answer rules, configurator links and shopper language are mapped into one deterministic graph before AI writes a single explanation.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/ontology" className="btn-secondary self-start"><Network size={14} /> Ontology map</Link>
          <Link href="/dashboard/preflight" className="btn-primary self-start"><ShieldCheck size={14} className="text-lime" /> Run preflight</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Workflow size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "healthy" ? "bg-lime text-ink" : report.status === "blocked" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/55")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">Graph confidence across catalog structure, finder rules, configurator links and observed shopper language.</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {[
              [report.summary.products, "Products"],
              [report.summary.signals, "Signals"],
              [report.summary.edges, "Edges"],
              [report.summary.unresolvedLanguageTerms, "Unresolved terms"],
            ].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-white/[0.07] p-4"><p className="text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold text-white/35">{String(label)}</p></div>)}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {report.lanes.map((lane) => {
            const LaneIcon = laneIcons[lane.id];
            return (
              <article key={lane.id} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><LaneIcon size={18} /></span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", lane.status === "ready" ? "bg-lime/35 text-moss" : lane.status === "blocked" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{lane.status}</span>
                </div>
                <p className="display mt-5 text-4xl">{lane.score}%</p>
                <h2 className="mt-2 text-xs font-extrabold">{lane.label}</h2>
                <p className="mt-2 text-xs leading-4 text-black/40">{lane.detail}</p>
              </article>
            );
          })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><BrainCircuit size={16} className="text-moss" /> Graph hotspots</h2>
                <p className="mt-1 text-xs text-black/35">Signals and shopper terms with the most influence or launch risk.</p>
              </div>
              <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-extrabold text-black/35">{report.nodes.length} nodes · {report.edges.length} relationships</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.hotspots.map((node) => (
                <article key={node.id} className="rounded-2xl border border-black/[0.07] bg-canvas/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", nodeTone[node.type])}>{node.type.replace("_", " ")}</span>
                      <h3 className="mt-3 text-sm font-extrabold">{node.label}</h3>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", statusTone[node.status])}>{node.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-4 text-black/40">{node.detail}</p>
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-black/25">Weight {node.weight}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><GitBranch size={16} className="text-moss" /> Finder rule coverage</h2>
                <p className="mt-1 text-xs text-black/35">Every answer rule should map to active catalog facts or a valid hard budget constraint.</p>
              </div>
              <Link href="/dashboard/quizzes" className="text-xs font-extrabold text-moss">Open builder <ArrowRight size={12} className="inline" /></Link>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.06]">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-canvas text-xs font-extrabold uppercase tracking-wider text-black/30"><tr><th className="px-4 py-3">Question</th><th className="px-4 py-3">Answer rule</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody>
                  {report.ruleAudits.slice(0, 12).map((audit) => (
                    <tr key={audit.id} className="border-t border-black/[0.05]">
                      <td className="px-4 py-3"><p className="text-xs font-extrabold">{audit.questionTitle}</p><p className="mt-1 text-xs text-black/35">{audit.quizName}</p></td>
                      <td className="px-4 py-3"><p className="text-xs font-bold">{audit.answerLabel}</p><p className="mt-1 text-xs text-black/35">{audit.matchType}:{audit.matchValue || "preference"}</p></td>
                      <td className="px-4 py-3"><p className="max-w-[280px] truncate text-xs font-bold text-black/45">{audit.linkedProducts.slice(0, 3).join(", ") || audit.detail}</p></td>
                      <td className="px-4 py-3"><span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", statusTone[audit.status])}>{audit.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><PackagePlus size={16} className="text-moss" /> Configurator compatibility graph</h2>
                <p className="mt-1 text-xs text-black/35">Product-linked options prove price, recommendation and buy-click attribution; incompatibilities prove guardrails.</p>
              </div>
              <Link href="/dashboard/configurators" className="text-xs font-extrabold text-moss">Open configurators <ArrowRight size={12} className="inline" /></Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.configuratorAudits.slice(0, 8).map((audit) => (
                <article key={audit.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-extrabold">{audit.optionLabel}</p><p className="mt-1 text-xs text-black/35">{audit.configuratorName}</p></div>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", statusTone[audit.status])}>{audit.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{audit.detail}</p>
                  {audit.incompatibleOptions.length ? <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/40">Conflicts: {audit.incompatibleOptions.slice(0, 3).join(", ")}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-amber-600" /> Graph action queue</h2>
            <p className="mt-1 text-xs leading-5 text-black/35">Prioritized fixes from broken graph relationships and unresolved shopper language.</p>
            <div className="mt-5 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl border border-black/[0.07] bg-canvas/70 p-4 transition hover:bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", action.severity === "critical" || action.severity === "high" ? "bg-red-50 text-red-700" : action.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{action.severity}</span>
                    <span className="text-xs font-extrabold text-moss">{action.label}</span>
                  </div>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/40">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Search size={16} className="text-lime" /> Shopper language links</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Observed search/advisor terms should resolve to product copy, buyer needs, tags or features.</p>
            <div className="mt-5 space-y-2">
              {report.termAudits.slice(0, 8).map((audit) => (
                <div key={audit.term} className="rounded-2xl bg-white/[0.06] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold">{audit.term}</p>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", audit.status === "pass" ? "bg-lime text-ink" : audit.status === "warn" ? "bg-amber-300/20 text-amber-100" : "bg-red-400/20 text-red-100")}>{audit.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-4 text-white/35">{audit.detail}</p>
                  {audit.examples[0] ? <p className="mt-2 text-xs font-bold text-white/25">“{audit.examples[0]}”</p> : null}
                </div>
              ))}
              {!report.termAudits.length && <p className="rounded-2xl bg-white/[0.06] p-4 text-xs font-bold leading-5 text-white/40">No observed shopper terms yet. Run Search Lab or publish an embed to collect language.</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={16} className="text-moss" /> Why this is safe AI</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Products are selected first", "Sellentum ranks active products through rules, signals, budgets and compatibility before AI writes copy."],
                ["AI cannot invent graph edges", "Missing shopper terms and broken rules are flagged as actions instead of patched by generated text."],
                ["Merchants can inspect proof", "Every answer rule, option link and observed language gap points back to a builder or catalog action."],
              ].map(([title, detail], index) => (
                <div key={title} className="flex gap-3 rounded-2xl bg-canvas p-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-ink">{index === 1 ? <XCircle size={11} /> : <CheckCircle2 size={11} />}</span>
                  <div><p className="text-xs font-extrabold">{title}</p><p className="mt-1 text-xs leading-4 text-black/40">{detail}</p></div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
