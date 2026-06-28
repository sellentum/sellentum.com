"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, Gauge, GitBranch, HeartPulse, MessageCircle, MousePointerClick, PackageCheck, ShieldAlert, Sparkles, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildReturnsIntelligenceReport, type ReturnsActionPriority, type ReturnsIntelligenceStatus, type ReturnsRiskLevel } from "@/lib/returns-intelligence";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<ReturnsIntelligenceStatus, string> = {
  empty: "bg-black/5 text-black/40",
  "needs-attention": "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  ready: "bg-lime/35 text-moss",
};

const riskTone: Record<ReturnsRiskLevel, string> = {
  low: "bg-lime/25 text-moss",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

const priorityTone: Record<ReturnsActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function ReturnsIntelligencePage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildReturnsIntelligenceReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Reading fit and return-prevention signals…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Returns & Fit Intelligence</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Prevent wrong-fit purchases before they become returns.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Use catalog gaps, no-result paths, thin recommendations, compatibility rules and stalled product clicks to find where shoppers need stronger guidance before checkout.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/lab" className="btn-secondary"><Gauge size={14} /> Recommendation Lab</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy fit packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><HeartPulse size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : report.status === "needs-attention" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.productsAtRisk}</p><p className="mt-1 text-xs text-white/35">At risk</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.zeroResultJourneys}</p><p className="mt-1 text-xs text-white/35">No result</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{Math.round(report.summary.assistedClickRate)}%</p><p className="mt-1 text-xs text-white/35">Click rate</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.activeProducts, "Active products", PackageCheck],
            [report.summary.highRiskProducts, "High risk", AlertTriangle],
            [report.summary.thinResultJourneys, "Thin journeys", GitBranch],
            [report.summary.compatibilityGuardrails, "Guardrails", ShieldAlert],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof PackageCheck;
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Product return-risk map</h2>
                <p className="mt-1 text-xs text-black/35">A deterministic risk proxy from catalog completeness, recommendation friction, click behavior and compatibility sensitivity.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
            </div>

            <div className="mt-5 space-y-3">
              {report.products.slice(0, 6).map((product) => (
                <article key={product.productId} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold">{product.productName}</h3>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", riskTone[product.riskLevel])}>{product.riskLevel} risk · {product.riskScore}%</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/35">{product.category} · {formatCurrency(product.price)}</p>
                      <p className="mt-3 max-w-3xl text-xs font-bold leading-4 text-moss">{product.preventionPlay}</p>
                    </div>
                    <div className="grid w-[170px] shrink-0 grid-cols-3 gap-1.5 text-center">
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{product.recommended}</b><i className="not-italic text-xs text-black/35">Recs</i></span>
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{product.clicks}</b><i className="not-italic text-xs text-black/35">Clicks</i></span>
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{Math.round(product.clickRate)}%</b><i className="not-italic text-xs text-black/35">CTR</i></span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 xl:grid-cols-3">
                    {product.drivers.length ? product.drivers.slice(0, 3).map((driver) => (
                      <div key={`${product.productId}-${driver.id}`} className={cn("rounded-2xl p-3", riskTone[driver.severity])}>
                        <p className="text-xs font-extrabold">{driver.label}</p>
                        <p className="mt-1 text-xs leading-4 opacity-70">{driver.detail}</p>
                      </div>
                    )) : <div className="rounded-2xl bg-lime/15 p-3 text-xs font-bold leading-4 text-moss">No urgent fit-risk drivers detected for this product.</div>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Pre-purchase question guardrails</h2>
                <p className="mt-1 text-xs text-black/35">Questions Sellentum should ask earlier to prevent expectation mismatch.</p>
              </div>
              <Link href="/dashboard/flow-studio" className="text-xs font-extrabold text-moss">Open Flow Studio</Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {report.questionGaps.map((gap) => (
                <Link key={gap.id} href={gap.actionHref} className="rounded-2xl bg-canvas p-4 transition hover:-translate-y-0.5 hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", gap.severity === "critical" || gap.severity === "high" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>{gap.severity}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{gap.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/40">{gap.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/55">{gap.suggestedQuestion}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{gap.answerOptions.map((option) => <span key={option} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-black/40">{option}</span>)}</div>
                </Link>
              ))}
              {!report.questionGaps.length && <div className="rounded-2xl bg-lime/15 p-5 text-xs font-bold leading-5 text-moss">Finder questions already cover the main return-prevention guardrails.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Fit friction signals</h2>
                <p className="mt-1 text-xs text-black/35">Where the catalog, finder, analytics or configurator suggests shopper uncertainty.</p>
              </div>
              <Sparkles size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.frictionSignals.map((signal) => (
                <Link key={signal.id} href={signal.actionHref} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", riskTone[signal.severity])}>{signal.severity === "high" ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold">{signal.label}</span>
                    <span className="mt-1 block text-xs leading-4 text-black/40">{signal.detail}</span>
                    <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-extrabold uppercase text-black/35">{signal.count} · {signal.source}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Wrench size={16} className="text-lime" /> Return-prevention queue</h2>
            <div className="mt-4 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.actionHref} className="block rounded-2xl bg-white/[0.06] p-4 transition hover:bg-white/[0.1]">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-1 text-xs leading-4 text-white/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold leading-4 text-white/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">{action.actionLabel}<ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><MessageCircle size={16} className="text-moss" /> Support-safe scripts</h2>
            <div className="mt-4 space-y-2">
              {report.scripts.map((script) => (
                <div key={script.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold">{script.label}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold uppercase text-black/35">{script.audience}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-4 text-black/45">{script.script}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><MousePointerClick size={16} className="text-moss" /> Why this matters</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">Zoovu-style guided selling is valuable because it reduces choice paralysis and wrong-fit buying. This MVP does that without enterprise return feeds by catching risk before checkout: better questions, clearer product facts, compatibility guardrails and stronger explanations.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied ? "Packet copied" : "Copy fit packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
