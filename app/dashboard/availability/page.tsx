"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, ExternalLink, ImageIcon, Link2, PackageCheck, PackageX, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildAvailabilityGuardReport, type AvailabilityActionPriority, type AvailabilityCheckStatus, type AvailabilityProductStatus, type AvailabilityStatus } from "@/lib/availability-guard";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<AvailabilityStatus, string> = {
  empty: "bg-black/5 text-black/40",
  "needs-attention": "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  ready: "bg-lime/35 text-moss",
};

const productTone: Record<AvailabilityProductStatus, string> = {
  ready: "bg-lime/25 text-moss",
  "missing-url": "bg-amber-50 text-amber-700",
  "missing-media": "bg-amber-50 text-amber-700",
  inactive: "bg-black/5 text-black/45",
  "demand-blocked": "bg-red-50 text-red-700",
};

const checkTone: Record<AvailabilityCheckStatus, string> = {
  pass: "bg-lime/25 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<AvailabilityActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function AvailabilityGuardPage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildAvailabilityGuardReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Checking catalog availability guardrails…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Availability Guard Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Keep unavailable products out of every recommendation path.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Prove that active products, Buy Now URLs, merchandising overrides, configurator links and analytics product references are safe before Findly recommends anything to shoppers.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/products" className="btn-secondary"><PackageCheck size={14} /> Edit products</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy availability packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ShieldCheck size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : report.status === "needs-attention" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.activeProducts}</p><p className="mt-1 text-xs text-white/35">Active</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{Math.round(report.summary.commerceUrlCoverage)}%</p><p className="mt-1 text-xs text-white/35">Buy URLs</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.staleReferences}</p><p className="mt-1 text-xs text-white/35">Stale refs</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.unavailableDemandProducts, "Unavailable demand", PackageX],
            [report.summary.missingCommerceUrls, "Missing URLs", Link2],
            [report.summary.missingImages, "Missing images", ImageIcon],
            [formatCurrency(report.summary.assistedValue).replace(".00", ""), "Assisted value", Sparkles],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof PackageX;
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
                <h2 className="text-sm font-extrabold">Product availability map</h2>
                <p className="mt-1 text-xs text-black/35">Active state, checkout URL coverage, imagery and current product demand in one guardrail view.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.summary.totalProducts} products</span>
            </div>

            <div className="mt-5 space-y-3">
              {report.products.map((product) => (
                <article key={product.productId} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold">{product.productName}</h3>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", productTone[product.status])}>{product.status.replace("-", " ")}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/35">{product.category} · {formatCurrency(product.price)}</p>
                      <p className="mt-3 max-w-3xl text-xs font-bold leading-4 text-moss">{product.action}</p>
                    </div>
                    <div className="grid w-[190px] shrink-0 grid-cols-3 gap-1.5 text-center">
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{product.recommended}</b><i className="not-italic text-xs text-black/35">Recs</i></span>
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{product.clicks}</b><i className="not-italic text-xs text-black/35">Clicks</i></span>
                      <span className="rounded-xl bg-white p-2"><b className="block text-xs">{Math.round(product.clickRate)}%</b><i className="not-italic text-xs text-black/35">CTR</i></span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.blockers.length ? product.blockers.map((blocker) => <span key={blocker} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/45">{blocker}</span>) : <span className="rounded-full bg-lime/25 px-3 py-1.5 text-xs font-extrabold text-moss">Ready for recommendations</span>}
                    {product.productUrl && <a href={product.productUrl} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-moss">Open URL <ExternalLink size={10} /></a>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Runtime reference audit</h2>
                <p className="mt-1 text-xs text-black/35">Finder overrides, configurator product links and analytics product events must resolve to active catalog records.</p>
              </div>
              <PackageCheck size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.references.slice(0, 8).map((reference) => (
                <Link key={reference.id} href={reference.actionHref} className={cn("rounded-2xl p-4 transition hover:-translate-y-0.5", checkTone[reference.status])}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold">{reference.label}</p>
                      <p className="mt-1 text-xs font-extrabold uppercase tracking-wider opacity-60">{reference.source}</p>
                    </div>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-extrabold uppercase opacity-80">{reference.status}</span>
                  </div>
                  <p className="mt-3 text-xs font-bold leading-4 opacity-75">{reference.evidence}</p>
                </Link>
              ))}
              {!report.references.length && <div className="rounded-2xl bg-lime/15 p-5 text-xs font-bold leading-5 text-moss">No product references outside the catalog were found yet.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Availability guardrail checks</h2>
                <p className="mt-1 text-xs text-black/35">Proof that public runtimes have safe product records to recommend and send to checkout.</p>
              </div>
              <CheckCircle2 size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.checks.map((check) => (
                <div key={check.id} className={cn("rounded-2xl p-4", checkTone[check.status])}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xs font-extrabold">{check.label}</h3>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-extrabold uppercase opacity-80">{check.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-4 opacity-70">{check.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold leading-4 opacity-80">{check.evidence}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Wrench size={16} className="text-lime" /> Availability action queue</h2>
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
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Safe AI boundary</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">OpenAI can explain why an already-selected product fits, but Findly’s runtime should never let AI choose unavailable products. Active status, product URLs and runtime references are checked before launch.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied ? "Packet copied" : "Copy availability packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-moss" /> Why this matters</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">Zoovu-style RAG works because product suggestions are constrained to validated catalog records. This page gives merchants the same confidence for the MVP: unavailable products stay out, stale launch references get surfaced, and Buy Now handoff remains intact.</p>
            <Link href="/dashboard/release-center" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Gate through Release Center <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
