"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, ClipboardCheck, Gauge, LockKeyhole, MonitorCheck, Rocket, ShieldCheck, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildMvpAuditReport, type MvpAuditAction, type MvpAuditArea, type MvpAuditStatus } from "@/lib/mvp-audit";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<MvpAuditStatus, string> = {
  done: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  pending: "bg-red-500/20 text-red-100",
};

const itemTone: Record<MvpAuditStatus, string> = {
  done: "bg-lime/35 text-moss",
  review: "bg-amber-50 text-amber-700",
  pending: "bg-red-50 text-red-700",
};

const areaLabel: Record<MvpAuditArea, string> = {
  marketing: "Marketing",
  auth: "Auth",
  catalog: "Catalog",
  builder: "Builder",
  recommendations: "Recommendations",
  ai: "AI",
  runtime: "Runtime",
  analytics: "Analytics",
  deployment: "Deployment",
  design: "Design",
};

const priorityTone: Record<MvpAuditAction["priority"], string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

function StatusIcon({ status }: { status: MvpAuditStatus }) {
  if (status === "done") return <CheckCircle2 size={16} />;
  if (status === "review") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

function PriorityIcon({ priority }: { priority: MvpAuditAction["priority"] }) {
  if (priority === "critical") return <LockKeyhole size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <AlertTriangle size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function MvpAuditPage() {
  const { ready, mode, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("http://localhost:3000");
  const [copied, setCopied] = useState(false);
  const report = useMemo(
    () => buildMvpAuditReport({ mode, products, quizzes, configurators, events, settings, origin }),
    [mode, products, quizzes, configurators, events, settings, origin],
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Auditing MVP completion evidence…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">MVP Completion Audit</p>
            <h1 className="display mt-3 text-5xl">Know exactly what is done, what needs proof, and what is still pending.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Findly maps the original Zoovu-like MVP scope to current workspace evidence so we do not confuse local progress with production completion.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/production" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><MonitorCheck size={14} /> Production proof</Link>
              <Link href="/dashboard/release-center" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><Rocket size={14} /> Release Center</Link>
              <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Audit copied" : "Copy audit packet"}</button>
            </div>
          </div>
          <div className="w-[370px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ClipboardCheck size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.done}</p><p className="mt-1 text-xs text-white/45">Done</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.review}</p><p className="mt-1 text-xs text-white/45">Review</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.pending}</p><p className="mt-1 text-xs text-white/45">Pending</p></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-5 gap-3">
          {[
            [report.summary.requirements, "Requirements", ClipboardCheck],
            [report.summary.activeProducts, "Active products", ShieldCheck],
            [report.summary.publishedFinders, "Live finders", Rocket],
            [report.summary.publishedConfigurators, "Live configs", Wrench],
            [`${report.summary.coveredAnalyticsEvents}/${report.summary.requiredAnalyticsEvents}`, "Event proof", Gauge],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof ClipboardCheck;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Done tasks</h2><p className="mt-1 text-sm text-black/45">Requirements with current evidence strong enough to treat as built for this stage.</p></div>
            <CheckCircle2 className="text-moss" size={18} />
          </div>
          <div className="mt-5 space-y-2">
            {report.doneTasks.map((item) => (
              <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", itemTone[item.status])}><StatusIcon status={item.status} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{item.label}</span><span className="mt-1 block text-sm leading-5 text-black/45">{item.detail}</span><span className="mt-2 block text-xs font-bold text-moss">{item.evidence}</span></span>
                <ArrowRight size={13} className="mt-2 text-black/25" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Pending and needs verification</h2><p className="mt-1 text-sm text-black/45">Items we should not call complete until this evidence is stronger.</p></div>
            <AlertTriangle className="text-amber-600" size={18} />
          </div>
          <div className="mt-5 space-y-2">
            {report.pendingTasks.map((item) => (
              <Link key={item.id} href={item.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", itemTone[item.status])}><StatusIcon status={item.status} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{item.label}</span><span className="mt-1 block text-sm leading-5 text-black/45">{item.nextTask}</span><span className="mt-2 block text-xs font-bold text-black/35">{item.evidence}</span></span>
                <ArrowRight size={13} className="mt-2 text-black/25" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Requirement evidence matrix</h2><p className="mt-1 text-sm text-black/45">Original MVP scope grouped by area, status, evidence and next task.</p></div><ClipboardCheck className="text-moss" size={18} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.requirements.map((item) => (
              <article key={item.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold uppercase text-black/45">{areaLabel[item.area]}</span>
                    <h3 className="mt-3 text-sm font-extrabold">{item.label}</h3>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", itemTone[item.status])}><StatusIcon status={item.status} />{item.status}</span>
                </div>
                <p className="mt-3 text-sm leading-5 text-black/50">{item.detail}</p>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/45">{item.evidence}</p>
                <p className="mt-3 text-xs font-bold leading-5 text-black/35">Next: {item.nextTask}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Next action queue</h2><p className="mt-1 text-sm text-black/45">Highest-priority follow-up tasks from the audit.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><PriorityIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{action.title}</span><span className="mt-1 block text-sm leading-5 text-black/45">{action.detail}</span><span className="mt-2 block text-xs font-bold uppercase text-black/35">{action.priority}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><LockKeyhole size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.025em]">Completion boundary</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-white/45">Do not call the full objective done until the deployed production URL, Supabase tenant, OpenAI key, public runtimes, widget install and analytics events are verified with production evidence.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-sm font-extrabold text-ink">{copied ? "Copied" : "Copy audit packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
