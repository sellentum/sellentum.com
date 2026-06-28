"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Ban, BarChart3, Clipboard, EyeOff, GitBranch, MousePointerClick, Pin, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildMerchandisingStudioReport, type MerchandisingActionPriority, type MerchandisingControlStatus, type MerchandisingLaneStatus, type MerchandisingStudioStatus } from "@/lib/merchandising-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<MerchandisingStudioStatus, string> = {
  healthy: "bg-lime text-moss",
  watch: "bg-amber-100 text-amber-800",
  "needs-attention": "bg-red-100 text-red-700",
};

const controlTone: Record<MerchandisingControlStatus, string> = {
  active: "bg-lime/35 text-moss",
  draft: "bg-blue-50 text-blue-700",
  stale: "bg-red-50 text-red-700",
  protected: "bg-ink text-white",
};

const laneTone: Record<MerchandisingLaneStatus, string> = {
  win: "bg-lime/35 text-moss",
  watch: "bg-amber-50 text-amber-700",
  hidden: "bg-black/5 text-black/45",
  controlled: "bg-blue-50 text-blue-700",
};

const priorityTone: Record<MerchandisingActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-lime/35 text-moss",
};

function actionIcon(action: string) {
  if (action === "pin") return Pin;
  if (action === "exclude") return Ban;
  return TrendingUp;
}

function laneIcon(status: MerchandisingLaneStatus) {
  if (status === "win") return Trophy;
  if (status === "watch") return AlertTriangle;
  if (status === "hidden") return EyeOff;
  return SlidersHorizontal;
}

export default function MerchandisingStudioPage() {
  const { ready, products, quizzes, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildMerchandisingStudioReport({ products, quizzes, events }), [products, quizzes, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Auditing merchandising controls…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Merchandising Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Tune deterministic recommendations without black-box AI.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Audit finder pins, boosts and exclusions against product demand, buy-click evidence, stale controls and products that need better discovery coverage.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/quizzes" className="btn-secondary"><GitBranch size={14} /> Finder rules</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Copied" : "Copy merchandising packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><SlidersHorizontal size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.controls}</p><p className="mt-1 text-xs text-white/35">Controls</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.productsWithDemand}</p><p className="mt-1 text-xs text-white/35">Demand</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.staleControls}</p><p className="mt-1 text-xs text-white/35">Stale</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.pins, "Pins", Pin],
            [report.summary.boosts, "Boosts", TrendingUp],
            [report.summary.exclusions, "Exclusions", Ban],
            [report.summary.invisibleProducts, "Invisible products", EyeOff],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Pin;
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
                <h2 className="text-sm font-extrabold">Current controls</h2>
                <p className="mt-1 text-xs text-black/35">All finder-level pins, boosts and exclusions in one deterministic control board.</p>
              </div>
              <Link href="/dashboard/quizzes" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Edit in finder builder <ArrowRight size={12} /></Link>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.controls.map((control) => {
                const Icon = actionIcon(control.action);
                return (
                  <article key={control.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><Icon size={17} /></span>
                        <div>
                          <h3 className="text-xs font-extrabold">{control.action.toUpperCase()} · {control.productName}</h3>
                          <p className="mt-1 text-xs font-bold text-black/35">{control.finderName} · {control.action === "exclude" ? "Hard exclusion" : control.action === "pin" ? "Top priority" : `+${control.weight} points`}</p>
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", controlTone[control.status])}>{control.status}</span>
                    </div>
                    <p className="mt-3 text-xs leading-4 text-black/45">{control.evidence}</p>
                    {control.note && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/40">Note: {control.note}</p>}
                  </article>
                );
              })}
              {!report.controls.length && <div className="col-span-full rounded-2xl border border-dashed border-black/10 p-10 text-center">
                <SlidersHorizontal className="mx-auto text-black/20" size={26} />
                <h3 className="mt-4 text-sm font-extrabold">No merchandising controls yet</h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-black/40">Open a product finder and add a conservative boost, pin or exclusion when demand evidence supports it.</p>
              </div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Product demand lanes</h2>
            <p className="mt-1 text-xs text-black/35">Where each active product sits based on recommendations, buy clicks and controls.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.lanes.map((lane) => {
                const Icon = laneIcon(lane.status);
                return (
                  <article key={lane.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><Icon size={17} /></span>
                        <div>
                          <h3 className="text-xs font-extrabold">{lane.productName}</h3>
                          <p className="mt-1 text-xs font-bold text-black/35">{lane.recommended} recommended · {lane.clicks} clicks · {lane.clickRate}% CTR</p>
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", laneTone[lane.status])}>{lane.label}</span>
                    </div>
                    <p className="mt-3 text-xs leading-4 text-black/45">{lane.evidence}</p>
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{lane.recommendation}</p>
                    {lane.controls.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{lane.controls.map((control) => <span key={`${lane.id}-${control}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{control}</span>)}</div>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Merchant override contract</h2>
            <p className="mt-1 text-xs text-black/35">The guardrails that keep merchandising controls safe and explainable.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.guardrails.map((guardrail) => (
                <article key={guardrail.label} className="rounded-2xl bg-canvas p-4">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={14} className="text-moss" /> {guardrail.label}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{guardrail.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/40">{guardrail.proof}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Opportunity queue</h2>
            <div className="mt-4 space-y-3">
              {report.opportunities.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[item.priority])}>{item.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{item.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{item.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{item.evidence}</p>
                  <p className="mt-3 text-xs font-bold leading-4 text-moss">{item.recommendation}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{item.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Clipboard size={16} className="text-lime" /> Merchandising packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Copy this before changing pins, boosts, exclusions or product-launch placement.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied ? "Copied" : "Copy merchandising packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Demand proof</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-canvas p-4"><Sparkles className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.publishedFinders}</p><p className="mt-1 text-xs font-bold text-black/30">Live finders</p></div>
              <div className="rounded-2xl bg-canvas p-4"><BarChart3 className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.productsWithDemand}</p><p className="mt-1 text-xs font-bold text-black/30">Demand products</p></div>
              <div className="rounded-2xl bg-canvas p-4"><MousePointerClick className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.lanes.reduce((sum, lane) => sum + lane.clicks, 0)}</p><p className="mt-1 text-xs font-bold text-black/30">Buy clicks</p></div>
              <div className="rounded-2xl bg-canvas p-4"><Target className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.opportunities.length}</p><p className="mt-1 text-xs font-bold text-black/30">Actions</p></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Related workspaces</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/lab", label: "Recommendation lab", detail: "Replay how controls affect ranking.", icon: SlidersHorizontal },
                { href: "/dashboard/personas", label: "Persona Studio", detail: "Use segments before changing pressure.", icon: Target },
                { href: "/dashboard/experiments", label: "Experiment planner", detail: "Wrap changes in safe tests.", icon: Trophy },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                  <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-xs leading-4 text-black/40">{item.detail}</span></span>
                </Link>;
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
