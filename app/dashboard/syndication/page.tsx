"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Clipboard, Code2, ExternalLink, Handshake, Megaphone, MousePointerClick, ShieldCheck, Store, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildSyndicationReport, type SyndicationPlacement, type SyndicationStatus } from "@/lib/syndication";
import { useStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

const statusTone: Record<SyndicationStatus, string> = {
  live: "bg-lime text-ink",
  learning: "bg-lime/35 text-moss",
  ready: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const partnerIcon: Record<SyndicationPlacement["partnerType"], typeof Store> = {
  Retailer: Store,
  Marketplace: Megaphone,
  Affiliate: UsersRound,
  Support: ShieldCheck,
  Sales: Handshake,
};

export default function SyndicationPage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [copied, setCopied] = useState("");
  const report = useMemo(() => buildSyndicationReport({ origin, settings, products, quizzes, configurators, events }), [origin, settings, products, quizzes, configurators, events]);
  const [activeId, setActiveId] = useState("");
  const activePlacement = report.placements.find((placement) => placement.id === activeId) || report.recommendedPlacement || report.placements[0];

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    if (!activeId && report.recommendedPlacement?.id) setActiveId(report.recommendedPlacement.id);
  }, [activeId, report.recommendedPlacement?.id]);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Preparing syndication packages…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Partner syndication</p>
          <h1 className="display mt-2 text-5xl">Package Findly for retailer and partner sites.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Create partner-safe snippets, attribution labels, QA checks and data-policy notes so the same product finder can travel beyond your owned storefront.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/channels" className="btn-secondary"><Megaphone size={14} /> Launch channels</Link>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy syndication packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Handshake size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">Partner readiness across {report.summary.placements} syndication packages.</p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{report.summary.installReady}</p><p className="mt-1 text-[9px] text-white/35">Ready</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-4"><p className="text-2xl font-extrabold">{report.summary.activePartners}</p><p className="mt-1 text-[9px] text-white/35">Active</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.totalViews, "Partner views", Store],
            [report.summary.totalClicks, "Buy clicks", MousePointerClick],
            [formatCurrency(report.summary.assistedValue), "Assisted value", Handshake],
            [report.summary.blockedPlacements, "Blocked", AlertTriangle],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Store;
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

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Partner packages</h2>
                <p className="mt-1 text-xs text-black/35">Each package has a dedicated snippet, campaign label, QA checklist and partner data boundary.</p>
              </div>
              <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-[9px] font-extrabold text-black/35">data-medium=&quot;syndication&quot;</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.placements.map((placement) => {
                const Icon = partnerIcon[placement.partnerType];
                return (
                  <button key={placement.id} onClick={() => setActiveId(placement.id)} className={cn("rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", activePlacement?.id === placement.id ? "border-ink bg-ink text-white shadow-sm" : "border-black/[0.07] bg-canvas text-ink")}>
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", activePlacement?.id === placement.id ? "bg-lime text-ink" : "bg-white text-moss")}><Icon size={18} /></span>
                      <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", statusTone[placement.status])}>{placement.status}</span>
                    </div>
                    <h3 className="mt-4 text-xs font-extrabold">{placement.name}</h3>
                    <p className={cn("mt-2 text-[10px] leading-4", activePlacement?.id === placement.id ? "text-white/45" : "text-black/40")}>{placement.objective}</p>
                    <p className={cn("mt-3 text-[8px] font-extrabold uppercase tracking-wider", activePlacement?.id === placement.id ? "text-lime" : "text-black/30")}>{placement.partnerType} · {placement.experience} · {placement.mode}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {activePlacement && (
            <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-moss">{activePlacement.partnerType}</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-.045em]">{activePlacement.name}</h2>
                  <p className="mt-2 text-xs leading-5 text-black/45">{activePlacement.audience}</p>
                </div>
                <Link href={activePlacement.publicUrl} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-3 py-2 text-[10px] font-extrabold text-black/45">Open runtime <ExternalLink size={11} /></Link>
              </div>
              <div className="mt-5 grid gap-3 xl:grid-cols-4">
                {[
                  [activePlacement.metrics.views, "Views"],
                  [activePlacement.metrics.completions, "Done"],
                  [activePlacement.metrics.clickRate + "%", "Click rate"],
                  [formatCurrency(activePlacement.metrics.clickValue), "Click value"],
                ].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p></div>)}
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#10180f]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div><p className="text-xs font-extrabold text-white">Partner snippet</p><p className="mt-0.5 text-[9px] font-bold text-white/35">{activePlacement.campaign} · {activePlacement.placement}</p></div>
                  <button onClick={() => copy(activePlacement.snippet, activePlacement.id)} className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-2 text-[10px] font-extrabold text-ink"><Clipboard size={12} /> {copied === activePlacement.id ? "Snippet copied" : "Copy snippet"}</button>
                </div>
                <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-words p-5 text-[10px] leading-5 text-lime/80">{activePlacement.snippet}</pre>
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-5">
          {activePlacement && (
            <>
              <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
                <h2 className="text-sm font-extrabold">Next partner action</h2>
                <div className="mt-4 rounded-2xl bg-canvas p-4">
                  <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", activePlacement.nextAction.priority === "critical" ? "bg-red-50 text-red-700" : activePlacement.nextAction.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{activePlacement.nextAction.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{activePlacement.nextAction.title}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-black/45">{activePlacement.nextAction.detail}</p>
                  <Link href={activePlacement.nextAction.href} className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-moss">{activePlacement.nextAction.label} <ArrowRight size={10} /></Link>
                </div>
              </section>

              <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
                <h2 className="text-sm font-extrabold">Partner acceptance criteria</h2>
                <div className="mt-4 space-y-2">
                  {activePlacement.acceptanceCriteria.map((item) => <p key={item} className="flex gap-2 text-[10px] font-bold leading-4 text-black/45"><Check size={13} className="mt-0.5 shrink-0 text-moss" />{item}</p>)}
                </div>
              </section>

              <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
                <h2 className="text-sm font-extrabold">Syndication QA</h2>
                <div className="mt-4 space-y-2">
                  {activePlacement.qa.map((item) => (
                    <div key={item.id} className={cn("rounded-xl p-3", item.status === "pass" ? "bg-lime/20" : item.status === "warn" ? "bg-amber-50" : "bg-red-50")}>
                      <p className="text-[10px] font-extrabold">{item.label}</p>
                      <p className="mt-1 text-[9px] font-bold leading-4 text-black/40">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-lime" /> Data policy</h2>
                <div className="mt-4 space-y-2">
                  {activePlacement.dataPolicy.map((item) => <p key={item} className="flex gap-2 text-[10px] font-bold leading-4 text-white/50"><Check size={13} className="mt-0.5 shrink-0 text-lime" />{item}</p>)}
                </div>
              </section>
            </>
          )}

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Governance checks</h2>
            <div className="mt-4 space-y-2">
              {report.governance.map((item) => (
                <div key={item.id} className={cn("rounded-xl p-3", item.status === "pass" ? "bg-lime/20" : item.status === "warn" ? "bg-amber-50" : "bg-red-50")}>
                  <p className="text-[10px] font-extrabold">{item.label}</p>
                  <p className="mt-1 text-[9px] font-bold leading-4 text-black/40">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
