"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Clipboard, FlaskConical, Gauge, ListChecks, MousePointerClick, Rocket, ShieldCheck, Sparkles, Target, Trophy, Undo2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildExperimentPlanningReport, type ExperimentPriority, type ExperimentStatus } from "@/lib/experiments";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<ExperimentStatus, string> = {
  blocked: "bg-red-50 text-red-700",
  ready: "bg-lime/35 text-moss",
  learning: "bg-blue-50 text-blue-700",
  winner: "bg-ink text-lime",
};

const priorityTone: Record<ExperimentPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-lime/35 text-moss",
};

export default function ExperimentsPage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const report = useMemo(() => buildExperimentPlanningReport({ origin, products, quizzes, configurators, events, settings }), [origin, products, quizzes, configurators, events, settings]);
  const [selectedId, setSelectedId] = useState(report.nextExperiment?.id || "");
  const [copied, setCopied] = useState(false);
  const selected = report.experiments.find((experiment) => experiment.id === selectedId) || report.nextExperiment || report.experiments[0];

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (!selectedId && report.nextExperiment) setSelectedId(report.nextExperiment.id); }, [report.nextExperiment, selectedId]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Planning experiments…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Experiment planner</p>
          <h1 className="display mt-2 text-5xl">Turn launch data into controlled improvements.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Findly proposes safe post-launch tests from funnel rates, attribution quality, discovery gaps and channel readiness. Product selection stays deterministic; experiments change copy, placement, rules or catalog language.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/analytics" className="btn-secondary"><BarChart3 size={14} /> Analytics</Link>
          <Link href="/dashboard/channels" className="btn-primary"><Rocket size={14} className="text-lime" /> Channels</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><FlaskConical size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "blocked" ? "bg-red-500/20 text-red-100" : report.status === "learning" ? "bg-blue-400/20 text-blue-100" : "bg-lime text-ink")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <button onClick={copyPacket} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-xs font-extrabold text-ink">
            {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? "Packet copied" : "Copy experiment packet"}
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-6">
          {[
            [report.summary.experiments, "Experiments", FlaskConical],
            [report.summary.ready, "Ready", Target],
            [report.summary.learning, "Learning", Gauge],
            [report.summary.winners, "Winners", Trophy],
            [`${Math.round(report.summary.startRate)}%`, "Start rate", Sparkles],
            [`${Math.round(report.summary.clickRate)}%`, "Click rate", MousePointerClick],
          ].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof FlaskConical; return (
            <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
              <p className="display mt-5 text-4xl">{String(value)}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
            </article>
          ); })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[430px_1fr]">
        <aside className="space-y-3">
          {report.experiments.map((experiment) => {
            const active = experiment.id === selected.id;
            return (
              <button
                key={experiment.id}
                onClick={() => setSelectedId(experiment.id)}
                className={cn("w-full rounded-2xl border p-4 text-left transition", active ? "border-ink bg-ink text-white shadow-xl" : "border-black/[0.07] bg-white hover:-translate-y-0.5 hover:border-black/15")}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", active ? "bg-white/10 text-white/45" : statusTone[experiment.status])}>{experiment.status}</span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", active ? "bg-lime text-ink" : priorityTone[experiment.priority])}>{experiment.priority}</span>
                </div>
                <h2 className="mt-4 text-sm font-extrabold leading-5">{experiment.title}</h2>
                <p className={cn("mt-2 text-xs leading-5", active ? "text-white/55" : "text-black/45")}>{experiment.hypothesis}</p>
                <div className={cn("mt-4 rounded-xl p-3", active ? "bg-white/[0.06]" : "bg-canvas")}>
                  <p className={cn("text-xs font-extrabold uppercase tracking-wider", active ? "text-white/25" : "text-black/25")}>{experiment.primaryMetric.label}</p>
                  <p className="mt-1 text-xs font-extrabold">{experiment.primaryMetric.current}{experiment.primaryMetric.unit} → {experiment.primaryMetric.target}{experiment.primaryMetric.unit}</p>
                </div>
              </button>
            );
          })}
        </aside>

        <main className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="border-b border-black/[0.06] bg-[radial-gradient(circle_at_85%_10%,rgba(217,255,97,.75),transparent_30%),linear-gradient(135deg,#f8f8f4,#ffffff)] p-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className="flex gap-2">
                  <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[selected.status])}>{selected.status}</span>
                  <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", priorityTone[selected.priority])}>{selected.priority}</span>
                </div>
                <h2 className="display mt-5 text-4xl">{selected.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">{selected.hypothesis}</p>
              </div>
              <Link href={selected.href} className="btn-primary shrink-0">{selected.cta} <ArrowRight size={14} /></Link>
            </div>
          </div>

          <div className="grid gap-6 p-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><Target size={16} className="text-moss" /> Test design</h3>
                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                  {[
                    ["Audience", selected.audience],
                    ["Evidence", selected.evidence],
                    ["Control", selected.control],
                    ["Variant", selected.variant],
                  ].map(([label, detail]) => <div key={label} className="rounded-2xl bg-canvas p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-black/30">{label}</p><p className="mt-2 text-xs font-bold leading-5 text-black/55">{detail}</p></div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><BarChart3 size={16} className="text-moss" /> Metrics</h3>
                <div className="mt-5 grid gap-3 xl:grid-cols-3">
                  {[selected.primaryMetric, ...selected.secondaryMetrics].map((metricItem) => (
                    <div key={metricItem.label} className="rounded-2xl bg-canvas p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-black/30">{metricItem.label}</p>
                      <p className="display mt-3 text-3xl">{metricItem.current}{metricItem.unit}</p>
                      <p className="mt-1 text-xs font-bold text-moss">Target {metricItem.target}{metricItem.unit}</p>
                      <p className="mt-2 text-xs leading-4 text-black/40">{metricItem.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><ListChecks size={16} className="text-moss" /> Setup steps</h3>
                <div className="mt-4 space-y-2">
                  {selected.setupSteps.map((step, index) => (
                    <p key={step} className="flex gap-3 rounded-xl bg-canvas p-3 text-xs font-bold leading-5 text-black/50"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">{index + 1}</span>{step}</p>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] bg-ink p-5 text-white">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-lime" /> Experiment guardrails</h3>
                <div className="mt-4 space-y-2">
                  {report.guardrails.map((guardrail) => (
                    <div key={guardrail.id} className="rounded-xl bg-white/[0.06] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-extrabold">{guardrail.label}</p>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", guardrail.status === "pass" ? "bg-lime text-ink" : guardrail.status === "warn" ? "bg-amber-300/20 text-amber-100" : "bg-red-400/20 text-red-100")}>{guardrail.status}</span>
                      </div>
                      <p className="mt-1 text-xs leading-4 text-white/35">{guardrail.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><Trophy size={16} className="text-moss" /> Success criteria</h3>
                <div className="mt-4 space-y-2">
                  {selected.successCriteria.map((item) => <p key={item} className="flex gap-2 text-xs font-bold leading-5 text-black/45"><Check size={14} className="mt-0.5 shrink-0 text-moss" />{item}</p>)}
                </div>
                <div className="mt-5 rounded-2xl bg-canvas p-4">
                  <p className="flex items-center gap-2 text-xs font-extrabold"><Undo2 size={14} className="text-moss" /> Rollback</p>
                  <p className="mt-2 text-xs leading-4 text-black/45">{selected.rollbackPlan}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-5">
                <h3 className="text-sm font-extrabold">Sample-size note</h3>
                <p className="mt-2 text-xs leading-5 text-black/45">{selected.sampleSizeNote}</p>
                {selected.blockers.length ? <div className="mt-4 space-y-2">{selected.blockers.map((blocker) => <p key={blocker} className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-4 text-red-700">{blocker}</p>)}</div> : <p className="mt-4 rounded-xl bg-lime/15 p-3 text-xs font-bold leading-4 text-moss">No launch blockers detected for this experiment.</p>}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
