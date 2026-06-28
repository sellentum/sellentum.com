"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Clipboard, GitBranch, LayoutTemplate, Map, Plus, Route, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildFlowStudioReport, type FlowStudioItemStatus, type FlowStudioNode, type FlowStudioStatus } from "@/lib/flow-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<FlowStudioItemStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const reportTone: Record<FlowStudioStatus, string> = {
  ready: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const nodeIcon: Record<FlowStudioNode["type"], typeof Sparkles> = {
  welcome: Sparkles,
  question: GitBranch,
  result: ShieldCheck,
};

export default function FlowStudioPage() {
  const { ready, quizzes, products } = useStore();
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [copied, setCopied] = useState(false);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId) || quizzes.find((quiz) => quiz.published) || quizzes[0];
  const report = useMemo(() => selectedQuiz ? buildFlowStudioReport({ quiz: selectedQuiz, products }) : undefined, [selectedQuiz, products]);

  async function copyPacket() {
    if (!report) return;
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Preparing visual flow studio…" />;

  if (!selectedQuiz || !report) {
    return (
      <div className="grid min-h-[620px] place-items-center rounded-[32px] border border-dashed border-black/10 bg-white/50 p-10 text-center">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><LayoutTemplate size={26} /></span>
          <h1 className="display mt-6 text-4xl">Create a finder before opening Flow Studio.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Flow Studio visualizes finder questions, answer branches, route QA and launch blockers once a guided-selling flow exists.</p>
          <Link href="/dashboard/quizzes" className="btn-primary mt-6"><Plus size={15} /> Create product finder</Link>
        </div>
      </div>
    );
  }

  const questionNodes = report.nodes.filter((node) => node.type === "question");

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Flow Studio</p>
          <h1 className="display mt-2 text-5xl">Visualize every finder branch before shoppers see it.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Inspect the no-code guided-selling canvas, answer route map, product coverage and deterministic route QA for each product finder.</p>
        </div>
        <div className="flex gap-3">
          <select className="field min-w-[260px] !bg-white !py-3 text-xs font-extrabold" value={selectedQuiz.id} onChange={(event) => setSelectedQuizId(event.target.value)}>
            {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.name}</option>)}
          </select>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Flow packet copied" : "Copy flow packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Route size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", reportTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">{selectedQuiz.name} · {report.summary.questions} questions · {report.summary.answers} answer routes.</p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{report.summary.branchingAnswers}</p><p className="mt-1 text-xs text-white/35">Branches</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{report.summary.productCoverageRate}%</p><p className="mt-1 text-xs text-white/35">Product coverage</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.answers, "Answer routes", GitBranch],
            [report.summary.passingRoutes, "Passing QA", Check],
            [report.summary.noMatchAnswers, "No-match answers", AlertTriangle],
            [report.summary.invalidBranches, "Invalid branches", Map],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof GitBranch;
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
                <h2 className="text-sm font-extrabold">Visual flow canvas</h2>
                <p className="mt-1 text-xs text-black/35">A desktop map of the shopper path from welcome screen to deterministic recommendations.</p>
              </div>
              <Link href="/dashboard/quizzes" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Edit in builder <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-6 overflow-x-auto rounded-[24px] border border-black/[0.07] bg-[#f4f5ef] p-5">
              <div className="flex min-w-[980px] items-center gap-5">
                {report.nodes.map((node) => {
                  const Icon = nodeIcon[node.type];
                  return (
                    <article key={node.id} className={cn("w-[220px] shrink-0 rounded-2xl border bg-white p-4 shadow-sm", node.type === "result" ? "border-lime/50" : "border-black/[0.07]")}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={17} /></span>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", statusTone[node.status])}>{node.status}</span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-xs font-extrabold leading-5">{node.label}</h3>
                      <p className="mt-2 line-clamp-3 text-xs leading-4 text-black/40">{node.detail}</p>
                      {node.type === "question" && <div className="mt-4 grid grid-cols-3 gap-1 text-center"><span className="rounded-xl bg-canvas p-2"><b className="block text-xs">{node.stats.options}</b><i className="not-italic text-xs text-black/35">Options</i></span><span className="rounded-xl bg-canvas p-2"><b className="block text-xs">{node.stats.branchingOptions}</b><i className="not-italic text-xs text-black/35">Branches</i></span><span className="rounded-xl bg-canvas p-2"><b className="block text-xs">{node.stats.unmatchedOptions}</b><i className="not-italic text-xs text-black/35">Risks</i></span></div>}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Answer route map</h2>
            <p className="mt-1 text-xs text-black/35">Every answer edge, rule coverage and branch target in one inspectable list.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.edges.filter((edge) => edge.answerId).map((edge) => (
                <article key={edge.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{edge.label}</h3><p className="mt-1 text-xs font-bold text-black/30">{edge.matchType} · weight {edge.weight}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", statusTone[edge.status])}>{edge.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{edge.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/35">{edge.productMatches} matches</span>
                    {edge.skippedQuestions.map((question) => <span key={question} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-700">Skips {question}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Route QA</h2>
            <p className="mt-1 text-xs text-black/35">Simulated shopper paths show whether branch routes still recommend usable products.</p>
            <div className="mt-5 space-y-3">
              {report.routes.map((route) => (
                <article key={route.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{route.label}</h3><p className="mt-1 text-xs leading-4 text-black/40">{route.detail}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", statusTone[route.status])}>{route.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 xl:grid-cols-3">
                    {route.topProducts.map((product) => <div key={product.id} className="rounded-xl bg-canvas p-3"><p className="truncate text-xs font-extrabold">{product.name}</p><p className="mt-1 text-xs font-bold text-black/35">{product.price} · score {product.score}</p></div>)}
                    {!route.topProducts.length && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-4 text-red-700">No eligible products for this route.</p>}
                  </div>
                  <p className="mt-3 rounded-xl bg-lime/10 p-3 text-xs font-bold leading-4 text-black/45">{route.recommendation}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Flow action queue</h2>
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
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Route size={16} className="text-lime" /> Route coverage</h2>
            <div className="mt-5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{report.summary.routeScenarios}</p><p className="mt-1 text-xs text-white/35">Scenarios</p></div>
              <div className="rounded-xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{report.summary.passingRoutes}</p><p className="mt-1 text-xs text-white/35">Passing</p></div>
            </div>
            <p className="mt-4 text-xs font-bold leading-5 text-white/45">Flow Studio uses the same branch resolver and deterministic product matcher as the customer-facing finder runtime.</p>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Question inventory</h2>
            <div className="mt-4 space-y-2">
              {questionNodes.map((node, index) => (
                <div key={node.id} className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-black/30">Question {index + 1}</p>
                  <h3 className="mt-1 text-xs font-extrabold leading-5">{node.label}</h3>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                    <span className="rounded-lg bg-white p-2"><b className="block text-xs">{node.stats.options}</b><i className="not-italic text-xs text-black/35">Opt</i></span>
                    <span className="rounded-lg bg-white p-2"><b className="block text-xs">{node.stats.matchedOptions}</b><i className="not-italic text-xs text-black/35">Match</i></span>
                    <span className="rounded-lg bg-white p-2"><b className="block text-xs">{node.stats.branchingOptions}</b><i className="not-italic text-xs text-black/35">Branch</i></span>
                    <span className="rounded-lg bg-white p-2"><b className="block text-xs">{node.stats.unmatchedOptions}</b><i className="not-italic text-xs text-black/35">Risk</i></span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
