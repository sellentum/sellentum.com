"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, FileText, Mail, Megaphone, MessageCircle, Search, ShieldCheck, ShoppingBag, Sparkles, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildContentStudioReport, type ContentActionPriority, type ContentAssetStatus, type ContentStudioStatus, type ContentSurface } from "@/lib/content-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<ContentStudioStatus, string> = {
  empty: "bg-white/[0.08] text-white/55",
  draft: "bg-amber-300/15 text-amber-100",
  ready: "bg-lime text-ink",
  "needs-attention": "bg-red-400/15 text-red-100",
};

const assetTone: Record<ContentAssetStatus, string> = {
  draft: "bg-black/[0.04] text-black/35",
  review: "bg-amber-50 text-amber-700",
  ready: "bg-lime/40 text-moss",
};

const priorityTone: Record<ContentActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

const surfaceLabel: Record<ContentSurface, string> = {
  pdp: "PDP",
  collection: "Collection",
  email: "Email",
  support: "Support",
  comparison: "Comparison",
};

function SurfaceIcon({ surface }: { surface: ContentSurface }) {
  if (surface === "pdp") return <ShoppingBag size={15} />;
  if (surface === "collection") return <Search size={15} />;
  if (surface === "email") return <Mail size={15} />;
  if (surface === "support") return <MessageCircle size={15} />;
  return <FileText size={15} />;
}

function PriorityIcon({ priority }: { priority: ContentActionPriority }) {
  if (priority === "critical") return <AlertTriangle size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <Sparkles size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function SalesContentStudioPage() {
  const { ready, products, events, settings } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildContentStudioReport({ products, events }), [products, events]);
  if (!ready) return <LoadingState label="Building grounded content assets…" />;

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Sales Content Studio</p>
            <h1 className="display mt-3 text-5xl">Turn product-discovery intelligence into grounded sales content.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Findly packages catalog proof, zero-party intent, recommendation demand and shopper feedback into PDP, collection, email and support copy blocks for {settings.brand_name}. Product selection stays deterministic; Content Studio only packages proof and messaging.</p>
          </div>
          <div className="w-[360px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><FileText size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white/45">{report.headline}</p>
            <button onClick={copyPacket} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Copied packet" : "Copy content packet"}</button>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-8 gap-3">
          {[
            [report.summary.activeProducts, "Active products", ShoppingBag],
            [report.summary.assets, "Assets", FileText],
            [report.summary.readyAssets, "Ready", CheckCircle2],
            [report.summary.reviewAssets, "Review", Wrench],
            [report.summary.intentSignals, "Intent signals", Sparkles],
            [report.summary.feedbackEvents, "Feedback", MessageCircle],
            [report.summary.queryThemes, "Query themes", Search],
            [report.summary.demandProducts, "Demand products", Megaphone],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof FileText;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/35">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.28fr_.72fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Grounded content assets</h2><p className="mt-1 text-xs text-black/35">Copy blocks generated from catalog facts, shopper intent, demand and feedback evidence.</p></div>
            <Link href="/dashboard/products" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">Improve catalog proof <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.assets.map((asset) => (
              <article key={asset.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", assetTone[asset.status])}>{asset.status}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/35"><SurfaceIcon surface={asset.surface} /> {surfaceLabel[asset.surface]}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold tracking-[-.045em]">{asset.title}</h3>
                    <p className="mt-1 text-xs font-bold text-black/35">{asset.productName} · {asset.category}</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-center"><span className="text-lg font-extrabold">{asset.score}%</span></div>
                </div>
                <div className="mt-5 rounded-2xl bg-white p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-moss">{asset.blocks.eyebrow}</p>
                  <h4 className="mt-2 text-sm font-extrabold leading-5">{asset.blocks.headline}</h4>
                  <p className="mt-2 text-xs font-bold leading-4 text-black/45">{asset.blocks.body}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {asset.blocks.bullets.slice(0, 4).map((bullet) => <span key={`${asset.id}-${bullet}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{bullet}</span>)}
                </div>
                <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-4">
                  <p className="text-xs font-extrabold text-black/30">Evidence</p>
                  <p className="mt-2 text-xs font-bold leading-4 text-black/45">{asset.evidence}</p>
                  <p className="mt-3 text-xs font-bold leading-4 text-black/30">{asset.guardrail}</p>
                </div>
              </article>
            ))}
            {!report.assets.length && <div className="col-span-2 rounded-[24px] border border-dashed border-black/10 p-12 text-center"><FileText className="mx-auto text-black/25" size={28} /><p className="mt-4 text-sm font-extrabold">No content assets yet</p><p className="mt-2 text-xs text-black/40">Add active products with descriptions, features, tags and product URLs to generate grounded sales copy.</p></div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Action queue</h2><p className="mt-1 text-xs text-black/35">What to repair, review or stage next.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><PriorityIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{action.title}</span><span className="mt-1 block text-xs leading-4 text-black/40">{action.detail}</span><span className="mt-2 block text-xs font-bold text-black/30">{action.evidence}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><ShieldCheck size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.045em]">Grounding boundary</h2>
            <p className="mt-3 text-xs font-bold leading-5 text-white/45">Use only listed product facts, customer answers, recommendation events and feedback signals. Content Studio does not invent claims and does not choose products; deterministic recommendation logic still owns selection.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-lime">{copied ? "Packet copied" : "Copy grounding packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Launch plays</h2><p className="mt-1 text-xs text-black/35">Where the strongest grounded copy should go first.</p></div><Megaphone className="text-moss" size={17} /></div>
          <div className="mt-5 space-y-3">
            {report.plays.map((play) => (
              <article key={play.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[play.priority])}>{play.priority}</span><h3 className="mt-3 text-sm font-extrabold">{play.title}</h3><p className="mt-1 text-xs leading-4 text-black/45">{play.detail}</p></div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/35">{play.channel}</span>
                </div>
                <p className="mt-3 rounded-xl bg-white p-3 text-xs font-bold leading-4 text-black/40">{play.evidence}</p>
                <p className="mt-3 text-xs font-extrabold text-moss">{play.nextStep}</p>
              </article>
            ))}
            {!report.plays.length && <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center"><p className="text-xs font-extrabold">No launch plays yet</p><p className="mt-1 text-xs text-black/35">Create recommendation demand or feedback events to prioritize content placements.</p></div>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Readiness checks</h2><p className="mt-1 text-xs text-black/35">Whether copy can safely move into a staging storefront or campaign.</p></div><CheckCircle2 className="text-moss" size={17} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.checks.map((check) => (
              <article key={check.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", check.status === "pass" ? "bg-lime/35 text-moss" : check.status === "warn" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>{check.status}</span>
                <h3 className="mt-4 text-xs font-extrabold">{check.label}</h3>
                <p className="mt-2 text-xs leading-4 text-black/45">{check.detail}</p>
                <p className="mt-3 rounded-xl bg-white p-3 text-xs font-bold leading-4 text-black/40">{check.recommendation}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
