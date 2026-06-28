"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, Bot, BrainCircuit, CheckCircle2, Clipboard, Database, FileText, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { buildTrustCenterReport, type TrustActionPriority, type TrustCenterStatus, type TrustPillarStatus } from "@/lib/trust-center";
import { cn } from "@/lib/utils";

const statusTone: Record<TrustCenterStatus, string> = {
  trusted: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const pillarTone: Record<TrustPillarStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const actionTone: Record<TrustActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-orange-50 text-orange-700",
  low: "bg-lime/35 text-moss",
};

function statusIcon(status: TrustPillarStatus) {
  if (status === "pass") return CheckCircle2;
  if (status === "warn") return AlertTriangle;
  return LockKeyhole;
}

export default function TrustCenterPage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildTrustCenterReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Auditing AI trust guardrails…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">AI Trust Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Prove that AI explains recommendations safely.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">A merchant-facing audit layer for deterministic product selection, grounded explanation copy, approved vocabulary, analytics quality, public runtime guardrails and partner-safe data boundaries.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/preflight" className="btn-secondary"><FileText size={14} /> Open preflight</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Trust packet copied" : "Copy trust packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ShieldCheck size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.passing}</p><p className="mt-1 text-xs text-white/35">Pass</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.warnings}</p><p className="mt-1 text-xs text-white/35">Review</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockers}</p><p className="mt-1 text-xs text-white/35">Blockers</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.recommendationQaScore, "Recommendation QA", BrainCircuit],
            [report.summary.groundedRecommendations, "Grounded results", Bot],
            [report.summary.analyticsQualityScore, "Analytics quality", BarChart3],
            [report.summary.vocabularyScore, "Vocabulary score", Sparkles],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof ShieldCheck;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{typeof value === "number" ? `${value}${String(label).includes("score") || String(label).includes("QA") || String(label).includes("quality") ? "%" : ""}` : String(value)}</p>
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
                <h2 className="text-sm font-extrabold">Trust principles</h2>
                <p className="mt-1 text-xs text-black/35">The non-negotiable rules behind safe AI-assisted guided selling.</p>
              </div>
              <span className="rounded-full bg-lime/35 px-3 py-1.5 text-xs font-extrabold uppercase text-moss">Rules select. AI explains.</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.principles.map((principle) => (
                <article key={principle.label} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <h3 className="text-xs font-extrabold">{principle.label}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{principle.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/40">{principle.proof}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Trust pillars</h2>
            <p className="mt-1 text-xs text-black/35">Live audit of deterministic selection, grounded AI copy, runtime guardrails, analytics and data boundaries.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.pillars.map((pillar) => {
                const Icon = statusIcon(pillar.status);
                return (
                  <Link key={pillar.id} href={pillar.href} className="rounded-2xl border border-black/[0.07] p-4 transition hover:bg-canvas">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", pillarTone[pillar.status])}><Icon size={17} /></span>
                        <div><h3 className="text-xs font-extrabold">{pillar.label}</h3><p className="mt-1 text-xs font-extrabold uppercase text-black/30">{pillar.score}% · {pillar.status}</p></div>
                      </div>
                      <ArrowRight size={14} className="text-black/25" />
                    </div>
                    <p className="mt-3 text-xs leading-4 text-black/45">{pillar.detail}</p>
                    <div className="mt-3 space-y-1.5">
                      {pillar.evidence.map((item) => <p key={`${pillar.id}-${item}`} className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold leading-4 text-black/40">{item}</p>)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Runtime guardrails</h2>
                <p className="mt-1 text-xs text-black/35">What Sellentum allows AI and public embeds to do in this MVP.</p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/35 text-moss"><LockKeyhole size={17} /></span>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl bg-ink p-5 text-white">
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><Bot size={15} className="text-lime" /> AI boundary</h3>
                <div className="mt-4 space-y-2">
                  {report.aiBoundary.map((item) => <p key={item} className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold leading-4 text-white/55">{item}</p>)}
                </div>
              </article>
              <article className="rounded-2xl bg-[#f8f8f4] p-5">
                <h3 className="flex items-center gap-2 text-xs font-extrabold"><Database size={15} className="text-moss" /> Data boundary</h3>
                <div className="mt-4 space-y-2">
                  {report.dataBoundary.map((item) => <p key={item} className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{item}</p>)}
                </div>
              </article>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Trust action queue</h2>
            <p className="mt-1 text-xs text-black/35">Highest-priority fixes before the embed goes live.</p>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", actionTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Clipboard size={16} className="text-lime" /> Copyable trust packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Share this with a founder, agency partner or ecommerce manager before launch. It summarizes the current AI boundary, data boundary and launch blockers.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied ? "Copied" : "Copy trust packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Evidence snapshot</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.pillars}</p><p className="mt-1 text-xs font-bold text-black/30">Pillars</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.decisionGraphScore}%</p><p className="mt-1 text-xs font-bold text-black/30">Graph</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.analyticsQualityScore}%</p><p className="mt-1 text-xs font-bold text-black/30">Analytics</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.groundedRecommendations}</p><p className="mt-1 text-xs font-bold text-black/30">Grounded</p></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
