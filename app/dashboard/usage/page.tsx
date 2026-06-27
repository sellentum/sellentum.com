"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, CreditCard, Gauge, LockKeyhole, RadioTower, Rocket, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildUsageCenterReport, type BillingReadinessCheck, type UsageActionPriority, type UsageCenterStatus, type UsageMeterStatus } from "@/lib/usage-metering";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<UsageCenterStatus, string> = {
  empty: "bg-black/5 text-black/40",
  ready: "bg-lime/35 text-moss",
  watch: "bg-amber-50 text-amber-700",
  "needs-upgrade": "bg-red-50 text-red-700",
};

const meterTone: Record<UsageMeterStatus, string> = {
  healthy: "bg-lime/25 text-moss",
  watch: "bg-amber-50 text-amber-700",
  over: "bg-red-50 text-red-700",
};

const checkTone: Record<BillingReadinessCheck["status"], string> = {
  pass: "bg-lime/25 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<UsageActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function UsageCenterPage() {
  const { ready, settings, products, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildUsageCenterReport({ origin, settings, products, quizzes, configurators, events }), [origin, settings, products, quizzes, configurators, events]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Preparing usage and plan meters…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Usage & Plan Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Show SaaS plan fit without turning on billing yet.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Meter shopper sessions, guided interactions, catalog scale, published experiences and AI-assist credits so Findly can explain future pricing while keeping Stripe safely in placeholder mode for the MVP.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/analytics" className="btn-secondary"><Gauge size={14} /> Usage analytics</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy billing packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><CreditCard size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : report.status === "needs-upgrade" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.sessions}</p><p className="mt-1 text-[8px] text-white/35">Sessions</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.publishedExperiences}</p><p className="mt-1 text-[8px] text-white/35">Surfaces</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.recommendedPlan.name}</p><p className="mt-1 text-[8px] text-white/35">Plan fit</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.interactions, "Interactions", Zap],
            [report.summary.aiCredits, "AI credits", Sparkles],
            [report.summary.activeProducts, "Products", ShieldCheck],
            [formatCurrency(report.summary.assistedValue).replace(".00", ""), "Assisted value", TrendingUp],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Zap;
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Current 30-day usage meters</h2>
                <p className="mt-1 text-xs text-black/35">Starter placeholder limits are deliberately visible so a merchant can understand what will eventually drive pricing.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", statusTone[report.status])}>{report.currentPlan.name} placeholder</span>
            </div>

            <div className="mt-5 space-y-3">
              {report.meters.map((meter) => (
                <article key={meter.id} className="rounded-[22px] border border-black/[0.07] bg-canvas p-5">
                  <div className="flex items-center justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-extrabold">{meter.label}</h3>
                        <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", meterTone[meter.status])}>{meter.status}</span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-black/35">{meter.detail}</p>
                    </div>
                    <p className="shrink-0 text-right text-xs font-extrabold text-black/40"><span className="display block text-3xl text-ink">{Math.round(meter.percent)}%</span>{meter.used.toLocaleString("en-GB")} / {meter.limit.toLocaleString("en-GB")}</p>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                    <div className={cn("h-full rounded-full", meter.status === "over" ? "bg-red-500" : meter.status === "watch" ? "bg-amber-400" : "bg-moss")} style={{ width: `${Math.min(100, meter.percent)}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Plan comparison placeholder</h2>
                <p className="mt-1 text-xs text-black/35">Plan cards are product-ready copy and limits, not active Stripe billing.</p>
              </div>
              <CreditCard size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {report.plans.map((plan) => {
                const selected = report.recommendedPlan.id === plan.id;
                return (
                  <article key={plan.id} className={cn("rounded-2xl border p-5", selected ? "border-ink bg-ink text-white" : "border-black/[0.07] bg-canvas")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn("text-xs font-extrabold", selected ? "text-lime" : "text-moss")}>{plan.name}</p>
                        <p className="display mt-2 text-3xl">{plan.priceLabel}</p>
                      </div>
                      {selected && <span className="rounded-full bg-lime px-2.5 py-1 text-[8px] font-extrabold uppercase text-ink">Recommended</span>}
                    </div>
                    <p className={cn("mt-3 text-[10px] leading-4", selected ? "text-white/45" : "text-black/40")}>{plan.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] font-bold">
                      <span className={cn("rounded-xl px-3 py-2", selected ? "bg-white/[0.06] text-white/55" : "bg-white text-black/40")}>{plan.limits.sessions.toLocaleString("en-GB")} sessions</span>
                      <span className={cn("rounded-xl px-3 py-2", selected ? "bg-white/[0.06] text-white/55" : "bg-white text-black/40")}>{plan.limits.products.toLocaleString("en-GB")} products</span>
                      <span className={cn("rounded-xl px-3 py-2", selected ? "bg-white/[0.06] text-white/55" : "bg-white text-black/40")}>{plan.limits.experiences} surfaces</span>
                      <span className={cn("rounded-xl px-3 py-2", selected ? "bg-white/[0.06] text-white/55" : "bg-white text-black/40")}>{plan.limits.aiCredits.toLocaleString("en-GB")} credits</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {plan.includes.slice(0, 3).map((item) => <p key={item} className={cn("flex gap-2 text-[9px] font-bold leading-4", selected ? "text-white/45" : "text-black/40")}><CheckCircle2 size={12} className={cn("mt-0.5 shrink-0", selected ? "text-lime" : "text-moss")} />{item}</p>)}
                    </div>
                    <code className={cn("mt-4 block truncate rounded-xl px-3 py-2 text-[9px] font-bold", selected ? "bg-white/[0.06] text-white/35" : "bg-white text-black/35")}>{plan.stripePlaceholder}</code>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Billing readiness checks</h2>
                <p className="mt-1 text-xs text-black/35">The current evidence needed before real subscriptions are added later.</p>
              </div>
              <LockKeyhole size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.checks.map((check) => (
                <div key={check.id} className={cn("rounded-2xl p-4", checkTone[check.status])}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xs font-extrabold">{check.label}</h3>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-[8px] font-extrabold uppercase opacity-80">{check.status}</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-4 opacity-70">{check.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[9px] font-bold leading-4 opacity-80">{check.evidence}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Rocket size={16} className="text-lime" /> Plan-fit action queue</h2>
            <div className="mt-4 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.actionHref} className="block rounded-2xl bg-white/[0.06] p-4 transition hover:bg-white/[0.1]">
                  <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-1 text-[10px] leading-4 text-white/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-[9px] font-bold leading-4 text-white/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-extrabold text-lime">{action.actionLabel}<ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Stripe boundary</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">This is intentionally not full billing. The MVP can show pricing drivers, plan fit and placeholder price IDs, but it does not create checkout sessions, collect cards, create subscriptions or mutate billing state.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied ? "Packet copied" : "Copy billing packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><RadioTower size={16} className="text-moss" /> Conversion value context</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-canvas p-3"><p className="text-lg font-extrabold">{Math.round(report.summary.completionRate)}%</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-black/30">Completion rate</p></div>
              <div className="rounded-2xl bg-canvas p-3"><p className="text-lg font-extrabold">{Math.round(report.summary.clickRate)}%</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-black/30">Click rate</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-black/45">Usage pricing should stay connected to customer value: sessions, completions, buy-clicks and assisted product value are shown beside the plan meters.</p>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-moss" /> Future billing steps</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">When the MVP is ready for paid users, add authenticated checkout, webhook-backed subscription state, customer portal links and RLS-protected billing tables as a deliberate separate phase.</p>
            <Link href="/dashboard/release-center" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Gate through Release Center <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
