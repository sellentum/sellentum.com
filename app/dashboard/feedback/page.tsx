"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clipboard, MessageCircleWarning, MousePointerClick, Sparkles, Target, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildRecommendationFeedbackReport, type FeedbackActionPriority, type FeedbackProductStatus, type RecommendationFeedbackStatus } from "@/lib/recommendation-feedback";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<RecommendationFeedbackStatus, string> = {
  empty: "bg-white/[0.08] text-white/55",
  collecting: "bg-amber-300/15 text-amber-100",
  healthy: "bg-lime text-ink",
  "needs-attention": "bg-red-400/15 text-red-100",
};

const productTone: Record<FeedbackProductStatus, string> = {
  healthy: "bg-lime/35 text-moss",
  watch: "bg-amber-50 text-amber-700",
  "needs-attention": "bg-red-50 text-red-700",
};

const priorityTone: Record<FeedbackActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-lime/35 text-moss",
};

function ActionIcon({ priority }: { priority: FeedbackActionPriority }) {
  if (priority === "critical") return <AlertTriangle size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <Target size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function RecommendationFeedbackPage() {
  const { ready, events, products } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildRecommendationFeedbackReport(events, products), [events, products]);
  if (!ready) return <LoadingState label="Reading recommendation feedback…" />;

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
            <p className="eyebrow text-lime">Recommendation Feedback Center</p>
            <h1 className="display mt-3 text-5xl">Close the loop between shopper reactions and recommendation quality.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Sellentum captures quick result-card feedback from finder, advisor, search and configurator experiences, then turns it into deterministic product risks, explanation fixes and optimization actions.</p>
          </div>
          <div className="w-[360px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ThumbsUp size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white/45">{report.headline}</p>
            <button onClick={copyPacket} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Copied packet" : "Copy feedback packet"}</button>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-8 gap-3">
          {[
            [report.summary.recommendations, "Recommendations", Sparkles],
            [report.summary.buyClicks, "Buy clicks", MousePointerClick],
            [report.summary.feedback, "Feedback", BarChart3],
            [report.summary.positive, "Helpful", ThumbsUp],
            [report.summary.negative, "Not right", ThumbsDown],
            [`${report.summary.feedbackRate}%`, "Feedback rate", Target],
            [`${report.summary.negativeRate}%`, "Negative rate", MessageCircleWarning],
            [report.summary.highRiskProducts, "Risk products", AlertTriangle],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Sparkles;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/35">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Product feedback lanes</h2><p className="mt-1 text-xs text-black/35">Product-level result quality from explicit shopper feedback.</p></div>
            <Link href="/dashboard/lab" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">Debug matches <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.products.map((product) => (
              <article key={product.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", productTone[product.status])}>{product.status.replace("-", " ")}</span>
                    <h3 className="mt-4 text-xl font-extrabold tracking-[-.045em]">{product.productName}</h3>
                    <p className="mt-1 text-xs font-bold text-black/35">{product.category}</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-center"><span className="text-lg font-extrabold">{product.score}%</span></div>
                </div>
                <div className="mt-5 grid grid-cols-5 gap-2 text-center">
                  {[
                    [product.feedback, "Feedback"],
                    [product.positive, "Helpful"],
                    [product.negative, "Not right"],
                    [`${product.feedbackRate}%`, "Rate"],
                    [`${product.negativeRate}%`, "Neg"],
                  ].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-white p-3"><p className="text-lg font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold text-black/30">{String(label)}</p></div>)}
                </div>
                <p className="mt-4 rounded-2xl bg-white p-4 text-xs font-bold leading-4 text-black/45">{product.recommendation}</p>
                <p className="mt-3 text-xs leading-4 text-black/40">{product.evidence}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {product.reasons.map((reason) => <span key={`${product.id}-${reason}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{reason}</span>)}
                  {!product.reasons.length && <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/30">No explicit reason yet</span>}
                </div>
              </article>
            ))}
            {!report.products.length && <div className="col-span-2 rounded-[24px] border border-dashed border-black/10 p-12 text-center"><ThumbsUp className="mx-auto text-black/25" size={28} /><p className="mt-4 text-sm font-extrabold">No product feedback yet</p><p className="mt-2 text-xs text-black/40">Run a storefront QA journey, view recommendations and click Helpful or Not right on a result card.</p></div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Action queue</h2><p className="mt-1 text-xs text-black/35">What to fix or scale next.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><ActionIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{action.title}</span><span className="mt-1 block text-xs leading-4 text-black/40">{action.detail}</span><span className="mt-2 block text-xs font-bold text-black/30">{action.evidence}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Sparkles size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.045em]">Feedback boundary</h2>
            <p className="mt-3 text-xs font-bold leading-5 text-white/45">Feedback never selects products. It shows where deterministic rules, product facts, explanations or recovery copy need merchant review.</p>
            <Link href="/dashboard/trust-center" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-lime">Review AI trust boundary <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Feedback themes</h2><p className="mt-1 text-xs text-black/35">Repeated reasons shoppers marked results helpful or not right.</p></div><MessageCircleWarning className="text-moss" size={17} /></div>
          <div className="mt-5 space-y-3">
            {report.themes.map((theme) => (
              <article key={theme.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", theme.sentiment === "negative" ? "bg-red-50 text-red-700" : "bg-lime/35 text-moss")}>{theme.sentiment}</span><h3 className="mt-3 text-sm font-extrabold">{theme.label}</h3><p className="mt-1 text-xs leading-4 text-black/45">{theme.recommendation}</p></div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/35">{theme.count} events</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">{theme.products.map((product) => <span key={`${theme.id}-${product}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{product}</span>)}</div>
              </article>
            ))}
            {!report.themes.length && <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center"><p className="text-xs font-extrabold">No themes yet</p><p className="mt-1 text-xs text-black/35">Themes appear after shoppers rate result cards.</p></div>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Readiness checks</h2><p className="mt-1 text-xs text-black/35">Whether feedback is usable for optimization.</p></div><CheckCircle2 className="text-moss" size={17} /></div>
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
