"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, Gauge, GitBranch, MousePointerClick, PackagePlus, ShieldCheck, ShoppingBag, Sparkles, Target, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildBundleStudioReport, type BundleActionPriority, type BundleCompatibilityStatus, type BundleOpportunityStatus, type BundleStudioStatus } from "@/lib/bundle-studio";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<BundleStudioStatus, string> = {
  empty: "bg-black/5 text-black/40",
  "needs-attention": "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  ready: "bg-lime/35 text-moss",
};

const opportunityTone: Record<BundleOpportunityStatus, string> = {
  risk: "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  ready: "bg-lime/25 text-moss",
};

const compatibilityTone: Record<BundleCompatibilityStatus, string> = {
  "needs-rules": "bg-red-50 text-red-700",
  open: "bg-amber-50 text-amber-700",
  guarded: "bg-lime/25 text-moss",
};

const priorityTone: Record<BundleActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function BundleStudioPage() {
  const { ready, products, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildBundleStudioReport({ products, configurators, events }), [products, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Building bundle attach opportunities…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Bundle & Attach Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Turn guided choices into compatible higher-value carts.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Use configurator anchors, paid add-ons, compatibility rules and real shopper telemetry to find the safest product bundles to promote across PDPs, collections and campaigns.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/configurators" className="btn-secondary"><PackagePlus size={14} /> Edit configurators</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy bundle packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ShoppingBag size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : report.status === "needs-attention" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.opportunities}</p><p className="mt-1 text-xs text-white/35">Offers</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{Math.round(report.summary.attachRate)}%</p><p className="mt-1 text-xs text-white/35">Attach</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{formatCurrency(report.summary.averageBundleValue).replace(".00", "")}</p><p className="mt-1 text-xs text-white/35">Avg value</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.publishedConfigurators, "Live builders", PackagePlus],
            [report.summary.anchorProducts, "Anchor products", Target],
            [report.summary.addOns, "Paid add-ons", ShoppingBag],
            [report.summary.compatibilityRules, "Guardrails", ShieldCheck],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof PackagePlus;
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
                <h2 className="text-sm font-extrabold">Attach opportunity map</h2>
                <p className="mt-1 text-xs text-black/35">Deterministic bundle candidates from product-linked configurator anchors, compatible paid extras and observed product demand.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.opportunities.map((opportunity) => (
                <article key={opportunity.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", opportunityTone[opportunity.status])}>{opportunity.status}</span>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", compatibilityTone[opportunity.compatibility])}>{opportunity.compatibility.replace("-", " ")}</span>
                      </div>
                      <h3 className="mt-4 text-sm font-extrabold leading-5">{opportunity.title}</h3>
                      <p className="mt-1 text-xs font-bold text-black/35">{opportunity.configuratorName}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-right">
                      <p className="text-xl font-extrabold">{formatCurrency(opportunity.estimatedLift)}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/30">Add-on value</p>
                    </div>
                  </div>
                  <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-xs font-bold leading-4 text-black/45">{opportunity.evidence}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {opportunity.addOns.map((addOn) => (
                      <span key={addOn.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/45">{addOn.label} · {formatCurrency(addOn.priceDelta)}</span>
                    ))}
                    {!opportunity.addOns.length && <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700">Needs paid extras</span>}
                  </div>
                  <Link href={opportunity.actionHref} className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{opportunity.nextStep}<ArrowRight size={10} /></Link>
                </article>
              ))}
              {!report.opportunities.length && (
                <div className="rounded-2xl bg-lime/15 p-5 text-xs font-bold leading-5 text-moss">No bundle candidates yet. Create a configurator with product-linked anchor choices and paid extras to unlock attach recommendations.</div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Attach telemetry</h2>
                <p className="mt-1 text-xs text-black/35">Early AOV signals from configurator completions, paid extras, buy clicks and assisted bundle value.</p>
              </div>
              <Gauge size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-4">
              {report.signals.map((signal) => (
                <div key={signal.id} className={cn("rounded-2xl p-4", signal.status === "healthy" ? "bg-lime/20 text-moss" : signal.status === "watch" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>
                  <p className="text-xs font-extrabold uppercase tracking-wider opacity-70">{signal.label}</p>
                  <p className="display mt-3 text-3xl">{signal.id === "attach-rate-signal" ? `${signal.count}%` : signal.id.includes("value") || signal.id.includes("click") ? formatCurrency(signal.value).replace(".00", "") : signal.count}</p>
                  <p className="mt-2 text-xs font-bold leading-4 opacity-70">{signal.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Compatibility guardrails</h2>
                <p className="mt-1 text-xs text-black/35">Bundle attach can increase order value only when impossible combinations are blocked before checkout.</p>
              </div>
              <ShieldCheck size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              <div className="rounded-2xl bg-canvas p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><ShieldCheck size={17} /></span>
                <p className="mt-5 text-xs font-extrabold">Rule coverage</p>
                <p className="mt-2 text-xs leading-4 text-black/40">{report.summary.compatibilityRules ? `${report.summary.compatibilityRules} incompatibility references protect the current bundle paths.` : "Add incompatibility references before promoting add-on bundles."}</p>
              </div>
              <div className="rounded-2xl bg-canvas p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><GitBranch size={17} /></span>
                <p className="mt-5 text-xs font-extrabold">Anchor coverage</p>
                <p className="mt-2 text-xs leading-4 text-black/40">{report.summary.anchorProducts} active product anchor{report.summary.anchorProducts === 1 ? "" : "s"} can become bundle starting points.</p>
              </div>
              <div className="rounded-2xl bg-canvas p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><MousePointerClick size={17} /></span>
                <p className="mt-5 text-xs font-extrabold">Checkout intent</p>
                <p className="mt-2 text-xs leading-4 text-black/40">{report.summary.bundleClicks ? `${report.summary.bundleClicks} configurator buy click${report.summary.bundleClicks === 1 ? "" : "s"} captured.` : "No configurator buy clicks yet; embed or QA the bundle path before scaling."}</p>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Wrench size={16} className="text-lime" /> AOV lift queue</h2>
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
              {!report.actions.length && <div className="rounded-2xl bg-lime/10 p-4 text-xs font-bold leading-5 text-lime">No urgent bundle actions. Keep watching attach rate as new traffic comes in.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 size={16} className="text-moss" /> Why this belongs in MVP</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">A Zoovu-style product finder is not only about choosing one SKU. Ecommerce teams also need safe attach logic: which accessory, kit, service or upgrade fits the selected product, and which choices should never be bundled together.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied ? "Packet copied" : "Copy bundle packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={16} className="text-moss" /> Safe AI boundary</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">Bundle selection stays deterministic: product anchors, add-ons and conflicts come from merchant-authored configurator data. AI can help phrase the explanation later, but it does not decide which products or extras are compatible.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-canvas p-3"><p className="text-lg font-extrabold">{report.summary.addOns}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/30">Merchant extras</p></div>
              <div className="rounded-2xl bg-canvas p-3"><p className="text-lg font-extrabold">{report.summary.compatibilityRules}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/30">Rule checks</p></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-moss" /> Next launch surface</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">Once the top bundle path is guarded, use Widget Studio to place it on a product detail page or collection page and compare attach telemetry against finder-only journeys.</p>
            <Link href="/dashboard/widget-studio" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open Widget Studio <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
