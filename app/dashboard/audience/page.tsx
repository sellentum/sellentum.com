"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clipboard, Database, Download, Fingerprint, Mail, Megaphone, MousePointerClick, ShieldCheck, Sparkles, Target, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildAudienceCaptureReport, type AudienceActionPriority, type AudienceCaptureStatus, type AudienceCheckStatus, type AudienceExportSensitivity, type AudienceSegmentStatus } from "@/lib/audience-capture";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<AudienceCaptureStatus, string> = {
  empty: "bg-white/[0.08] text-white/55",
  learning: "bg-amber-300/15 text-amber-100",
  ready: "bg-lime text-ink",
  "needs-attention": "bg-red-400/15 text-red-100",
};

const segmentTone: Record<AudienceSegmentStatus, string> = {
  draft: "bg-black/[0.04] text-black/35",
  learning: "bg-amber-50 text-amber-700",
  ready: "bg-lime/40 text-moss",
};

const priorityTone: Record<AudienceActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

const checkTone: Record<AudienceCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const fieldTone: Record<AudienceExportSensitivity, string> = {
  anonymous: "bg-black/[0.04] text-black/35",
  intent: "bg-lime/35 text-moss",
  commercial: "bg-peach/60 text-ink",
  consent: "bg-ink text-white",
};

function PriorityIcon({ priority }: { priority: AudienceActionPriority }) {
  if (priority === "critical") return <AlertTriangle size={14} />;
  if (priority === "high") return <Target size={14} />;
  if (priority === "medium") return <Sparkles size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function AudienceCapturePage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildAudienceCaptureReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);
  if (!ready) return <LoadingState label="Building audience segments…" />;

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
            <p className="eyebrow text-lime">Audience Capture Center</p>
            <h1 className="display mt-3 text-5xl">Turn guided-selling sessions into safe zero-party audiences.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Findly reads answers, searches, advisor prompts, configurator choices, recommendations and buy clicks, then turns them into anonymous segments, capture prompts and export-ready handoff packets for {settings.brand_name}.</p>
          </div>
          <div className="w-[360px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><UsersRound size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white/45">{report.headline}</p>
            <button onClick={copyPacket} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Copied packet" : "Copy audience packet"}</button>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-8 gap-3">
          {[
            [report.summary.sessions, "Sessions", Fingerprint],
            [report.summary.explicitSignals, "Intent signals", Sparkles],
            [report.summary.highIntentSessions, "High-intent", MousePointerClick],
            [report.summary.attributedSessions, "Attributed", Megaphone],
            [report.summary.captureReadySegments, "Ready segments", UsersRound],
            [report.summary.captureMoments, "Moments", Mail],
            [`${report.summary.completionRate}%`, "Completion", BarChart3],
            [`${report.summary.clickRate}%`, "Click rate", Target],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof UsersRound;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/35">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold">Audience segments</h2>
              <p className="mt-1 text-xs text-black/35">Deterministic segments from explicit shopper behaviour, not black-box personalization.</p>
            </div>
            <Link href="/dashboard/personas" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">Compare personas <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.segments.map((segment) => (
              <article key={segment.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={cn("rounded-full px-3 py-1.5 text-[8px] font-extrabold uppercase", segmentTone[segment.status])}>{segment.status}</span>
                    <h3 className="mt-4 text-xl font-extrabold tracking-[-.045em]">{segment.name}</h3>
                    <p className="mt-2 text-[10px] leading-4 text-black/45">{segment.description}</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-center">
                    <span className="text-lg font-extrabold">{segment.score}%</span>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                  {[
                    [segment.size, "Sessions"],
                    [segment.signalCount, "Signals"],
                    [`${segment.conversionRate}%`, "CVR"],
                    [segment.sources.length, "Sources"],
                  ].map(([value, label]) => <div key={String(label)} className="rounded-xl bg-white p-3"><p className="text-lg font-extrabold">{String(value)}</p><p className="mt-1 text-[8px] font-bold text-black/30">{String(label)}</p></div>)}
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/30">Capture prompt</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-ink">{segment.capturePrompt}</p>
                </div>
                <p className="mt-4 text-[10px] leading-4 text-black/45">{segment.evidence}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {segment.signals.slice(0, 5).map((signal) => <span key={`${segment.id}-${signal}`} className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{signal}</span>)}
                </div>
                <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-3">
                  <p className="text-[9px] font-extrabold text-black/35">Export filter</p>
                  <code className="mt-2 block text-[10px] font-bold leading-4 text-moss">{segment.exportFilter}</code>
                </div>
              </article>
            ))}
            {!report.segments.length && <div className="col-span-2 rounded-[24px] border border-dashed border-black/10 p-12 text-center"><UsersRound className="mx-auto text-black/25" size={28} /><p className="mt-4 text-sm font-extrabold">No audience segments yet</p><p className="mt-2 text-xs text-black/40">Run a QA journey or publish a finder to collect answer, recommendation and buy-click signals.</p></div>}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Action queue</h2><p className="mt-1 text-xs text-black/35">Highest-leverage next steps.</p></div><Sparkles className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><PriorityIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-extrabold">{action.title}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-black/40">{action.detail}</span>
                    <span className="mt-2 block text-[9px] font-bold text-black/30">{action.evidence}</span>
                  </span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><ShieldCheck size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.045em]">Privacy boundary</h2>
            <p className="mt-3 text-xs font-bold leading-5 text-white/45">This MVP exports anonymous session intent by default. If the store collects email, phone or customer IDs, consent should live in the ecommerce or marketing platform layer until full CRM integrations are intentionally built.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-xl font-extrabold">{report.summary.contactFieldsDetected}</p><p className="mt-1 text-[8px] text-white/35">Contact fields seen</p></div>
              <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-xl font-extrabold">{report.summary.consentedContacts}</p><p className="mt-1 text-[8px] text-white/35">Consent-labelled</p></div>
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Capture moments</h2><p className="mt-1 text-xs text-black/35">Where a merchant should ask for consent or save intent.</p></div><Mail className="text-moss" size={17} /></div>
          <div className="mt-5 space-y-3">
            {report.moments.map((moment) => (
              <article key={moment.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", priorityTone[moment.priority])}>{moment.priority}</span><h3 className="mt-3 text-sm font-extrabold">{moment.title}</h3><p className="mt-1 text-[10px] leading-4 text-black/45">{moment.reason}</p></div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[8px] font-extrabold text-black/35">{moment.trigger}</span>
                </div>
                <div className="mt-4 rounded-xl bg-white p-3"><p className="text-[9px] font-extrabold text-black/30">Prompt</p><p className="mt-1 text-xs font-bold leading-5">{moment.prompt}</p></div>
                <p className="mt-3 text-[10px] leading-4 text-black/40"><span className="font-extrabold text-ink">Guardrail:</span> {moment.guardrail}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{moment.fields.map((field) => <span key={`${moment.id}-${field}`} className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{field}</span>)}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Safe export schema</h2><p className="mt-1 text-xs text-black/35">Manual CSV/API-ready fields before CRM integrations exist.</p></div><Database className="text-moss" size={17} /></div>
          <div className="mt-5 grid gap-2 xl:grid-cols-2">
            {report.exportFields.map((field) => (
              <div key={field.id} className="rounded-2xl border border-black/[0.06] bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold">{field.label}</p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", fieldTone[field.sensitivity])}>{field.sensitivity}</span>
                </div>
                <code className="mt-2 block text-[10px] font-extrabold text-moss">{field.id}</code>
                <p className="mt-2 text-[10px] leading-4 text-black/40">{field.description}</p>
                <p className="mt-2 text-[9px] font-bold text-black/25">Source: {field.source}</p>
              </div>
            ))}
          </div>
          <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white"><Download size={14} className="text-lime" /> Copy schema and packet</button>
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Readiness checks</h2><p className="mt-1 text-xs text-black/35">What must be true before exporting audience evidence.</p></div><ShieldCheck className="text-moss" size={18} /></div>
        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {report.checks.map((check) => (
            <article key={check.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
              <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", checkTone[check.status])}>{check.status}</span>
              <h3 className="mt-4 text-xs font-extrabold">{check.label}</h3>
              <p className="mt-2 text-[10px] leading-4 text-black/45">{check.detail}</p>
              <p className="mt-3 rounded-xl bg-white p-3 text-[9px] font-bold leading-4 text-black/40">{check.recommendation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
