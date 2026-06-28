"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Clipboard, GitPullRequestArrow, Rocket, ShieldCheck, Undo2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildReleaseCandidate, type ReleaseGateStatus } from "@/lib/release-center";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const gateTone: Record<ReleaseGateStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

export default function ReleaseCenterPage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-sellentum-app.vercel.app");
  const [copied, setCopied] = useState(false);
  const candidate = useMemo(() => buildReleaseCandidate({ origin, products, quizzes, configurators, events, settings }), [origin, products, quizzes, configurators, events, settings]);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function copyReleaseNotes() {
    await navigator.clipboard.writeText(candidate.releaseNotes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Preparing release candidate…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Release Center</p>
          <h1 className="display mt-2 text-5xl">Ship with a go/no-go release candidate.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Bundle the current Sellentum catalog, experiences, channel snippets, sandbox QA, analytics quality and rollback plan into one production handoff.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/preflight" className="btn-secondary"><ShieldCheck size={14} /> Preflight</Link>
          <Link href="/dashboard/storefront-sandbox" className="btn-primary"><Rocket size={14} className="text-lime" /> Storefront QA</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[340px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><GitPullRequestArrow size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", candidate.decision === "go" ? "bg-lime text-ink" : candidate.decision === "review" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{candidate.decision}</span>
          </div>
          <p className="display mt-8 text-6xl">{candidate.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">{candidate.title} · {candidate.id}</p>
          <button onClick={copyReleaseNotes} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-xs font-extrabold text-ink">
            {copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? "Release notes copied" : "Copy release notes"}
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [candidate.summary.activeProducts, "Active products"],
            [candidate.summary.installReadyChannels, "Ready channels"],
            [candidate.summary.sandboxVerifiedCases, "Verified QA"],
            [`${candidate.summary.analyticsQualityScore}%`, "Analytics QA"],
          ].map(([value, label]) => (
            <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><Rocket size={18} /></span>
              <p className="display mt-5 text-4xl">{String(value)}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
            </article>
          ))}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_390px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Release scope</h2>
                <p className="mt-1 text-xs text-black/35">What will be included if this candidate ships.</p>
              </div>
              <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-extrabold text-black/35">{new Date(candidate.generatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {candidate.scope.map((item) => (
                <article key={item.label} className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-black/30">{item.label}</p>
                  <h3 className="mt-2 text-sm font-extrabold">{item.value}</h3>
                  <p className="mt-2 text-xs leading-5 text-black/45">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Release gates</h2>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {candidate.gates.map((gate) => (
                <article key={gate.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{gate.label}</h3><p className="mt-1 text-xs font-bold text-black/30">{gate.owner}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", gateTone[gate.status])}>{gate.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{gate.detail}</p>
                  <Link href={gate.href} className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{gate.action} <ArrowRight size={10} /></Link>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-amber-600" /> Release action queue</h2>
            <div className="mt-4 space-y-3">
              {candidate.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", action.priority === "critical" ? "bg-red-50 text-red-700" : action.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Undo2 size={16} className="text-lime" /> Rollback plan</h2>
            <div className="mt-4 space-y-2">
              {candidate.rollbackPlan.map((item, index) => (
                <p key={item} className="flex gap-3 rounded-xl bg-white/[0.06] p-3 text-xs font-bold leading-4 text-white/50"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">{index + 1}</span>{item}</p>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Release strengths</h2>
            <div className="mt-4 space-y-2">
              {candidate.strengths.slice(0, 5).map((strength) => <p key={strength} className="flex gap-2 text-xs font-bold leading-4 text-black/45"><Check size={13} className="mt-0.5 shrink-0 text-moss" />{strength}</p>)}
              {!candidate.strengths.length && <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-4 text-amber-700">No passing release gates yet. Start with Preflight and Storefront QA.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
