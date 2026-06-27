"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clipboard, ExternalLink, MessageCircle, MousePointerClick, PackagePlus, Search, Sparkles, Tags, Target, Trophy, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildPersonaStudioReport, type PersonaActionPriority, type PersonaConfidence, type PersonaSignalStatus, type PersonaStudioStatus } from "@/lib/persona-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<PersonaStudioStatus, string> = {
  empty: "bg-black/5 text-black/45",
  learning: "bg-amber-100 text-amber-800",
  actionable: "bg-lime text-moss",
};

const confidenceTone: Record<PersonaConfidence, string> = {
  low: "bg-black/5 text-black/40",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-lime/35 text-moss",
};

const matrixTone: Record<PersonaSignalStatus, string> = {
  missing: "bg-red-50 text-red-700",
  thin: "bg-amber-50 text-amber-700",
  healthy: "bg-lime/35 text-moss",
};

const priorityTone: Record<PersonaActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-lime/35 text-moss",
};

function experienceIcon(experience: string) {
  if (experience === "assistant") return MessageCircle;
  if (experience === "search") return Search;
  if (experience === "configurator") return PackagePlus;
  return Sparkles;
}

export default function PersonaStudioPage() {
  const { ready, events, products } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildPersonaStudioReport(events, products), [events, products]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Mapping shopper personas…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Shopper Persona Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Turn zero-party discovery signals into launchable buyer segments.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Findly reads finder answers, search/advisor language, configurator choices, recommendations and buy clicks, then turns them into deterministic persona plans merchants can actually act on.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/analytics" className="btn-secondary"><BarChart3 size={14} /> Analytics</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Copied" : "Copy persona packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><UsersRound size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.personas}</p><p className="mt-1 text-[8px] text-white/35">Personas</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.highConfidence}</p><p className="mt-1 text-[8px] text-white/35">High conf.</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.journeySessions}</p><p className="mt-1 text-[8px] text-white/35">Sessions</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.explicitSignals, "Zero-party signals", Tags],
            [report.summary.personaSessions, "Persona clusters", UsersRound],
            [`${report.summary.averageConversionRate}%`, "Avg persona CVR", Trophy],
            [report.actions.length, "Open actions", Target],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Tags;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}</p>
                <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
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
                <h2 className="text-sm font-extrabold">Buyer segment board</h2>
                <p className="mt-1 text-xs text-black/35">Ranked persona clusters from deterministic event and catalog evidence.</p>
              </div>
              <Link href="/dashboard/decision-graph" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open graph <ArrowRight size={12} /></Link>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {report.personas.map((persona) => {
                const Icon = experienceIcon(persona.recommendedExperience);
                return (
                  <article key={persona.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-moss">{persona.segment}</p>
                        <h3 className="mt-2 text-xl font-extrabold tracking-[-.045em]">{persona.name}</h3>
                        <p className="mt-2 text-[10px] leading-4 text-black/45">{persona.description}</p>
                      </div>
                      <span className={cn("rounded-full px-3 py-1.5 text-[8px] font-extrabold uppercase", confidenceTone[persona.confidence])}>{persona.confidence}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                      {[
                        [persona.score, "Score"],
                        [persona.audienceSize, "Sessions"],
                        [persona.signalCount, "Signals"],
                        [`${persona.conversionRate}%`, "CVR"],
                      ].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-white p-3"><p className="text-lg font-extrabold">{String(value)}</p><p className="mt-1 text-[8px] text-black/30">{String(label)}</p></div>)}
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-4">
                      <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-moss"><Icon size={13} /> Recommended play</p>
                      <p className="mt-2 text-[10px] leading-4 text-black/50">{persona.launchAngle}</p>
                      <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-[9px] font-bold leading-4 text-black/40">{persona.evidence}</p>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/30">Top signals</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[...persona.intentSignals, ...persona.answerSignals, ...persona.querySignals].slice(0, 7).map((signal) => <span key={`${persona.id}-${signal}`} className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{signal}</span>)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/30">Product affinities</p>
                        <div className="mt-2 space-y-1.5">
                          {persona.productAffinities.slice(0, 3).map((product) => (
                            <div key={`${persona.id}-${product.productName}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[9px] font-bold text-black/45">
                              <span className="truncate">{product.productName}</span>
                              <span className="shrink-0 text-moss">{product.clicks} clicks</span>
                            </div>
                          ))}
                          {!persona.productAffinities.length && <p className="rounded-xl bg-white px-3 py-2 text-[9px] font-bold text-black/35">No product affinity yet.</p>}
                        </div>
                      </div>
                    </div>

                    <Link href={persona.recommendedExperience === "configurator" ? "/dashboard/configurators" : persona.recommendedExperience === "assistant" ? "/dashboard/advisor" : persona.recommendedExperience === "search" ? "/dashboard/search" : "/dashboard/quizzes"} className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-moss">
                      {persona.nextStep} <ArrowRight size={12} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Persona signal matrix</h2>
            <p className="mt-1 text-xs text-black/35">The evidence Findly uses to separate real buyer intent from noisy traffic.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-5">
              {report.signalMatrix.map((row) => (
                <article key={row.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", matrixTone[row.status])}>{row.status}</span>
                    {row.status === "healthy" ? <CheckCircle2 size={14} className="text-moss" /> : <AlertTriangle size={14} className="text-amber-600" />}
                  </div>
                  <p className="display mt-5 text-3xl">{row.count}</p>
                  <h3 className="mt-1 text-xs font-extrabold leading-4">{row.label}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-black/45">{row.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.examples.map((example) => <span key={`${row.id}-${example}`} className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{example}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Persona action queue</h2>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[9px] font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Clipboard size={16} className="text-lime" /> Persona handoff packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Share this before changing quiz copy, paid landing pages or merchandising boosts.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied ? "Copied" : "Copy persona packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Related workspaces</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/analytics", label: "Analytics", detail: "Inspect events, journeys and demand.", icon: BarChart3 },
                { href: "/dashboard/vocabulary", label: "Vocabulary Studio", detail: "Approve shopper language and synonyms.", icon: MessageCircle },
                { href: "/dashboard/experiments", label: "Experiment planner", detail: "Turn segments into controlled tests.", icon: Target },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                  <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-black/40">{item.detail}</span></span>
                </Link>;
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Persona proof</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-canvas p-4"><UsersRound className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.personas}</p><p className="mt-1 text-[8px] font-bold text-black/30">Segments</p></div>
              <div className="rounded-2xl bg-canvas p-4"><Tags className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.explicitSignals}</p><p className="mt-1 text-[8px] font-bold text-black/30">Signals</p></div>
              <div className="rounded-2xl bg-canvas p-4"><MousePointerClick className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.averageConversionRate}%</p><p className="mt-1 text-[8px] font-bold text-black/30">Avg CVR</p></div>
              <div className="rounded-2xl bg-canvas p-4"><ExternalLink className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.actions.length}</p><p className="mt-1 text-[8px] font-bold text-black/30">Actions</p></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
