"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clipboard, Code2, ExternalLink, FileText, Gauge, Globe2, LockKeyhole, RadioTower, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildRuntimeOperationsReport, type RuntimeCheckStatus, type RuntimeOperationsStatus } from "@/lib/runtime-operations";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<RuntimeOperationsStatus, string> = {
  healthy: "bg-lime text-ink",
  watch: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const checkTone: Record<RuntimeCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

function checkIcon(status: RuntimeCheckStatus) {
  if (status === "pass") return CheckCircle2;
  if (status === "warn") return AlertTriangle;
  return LockKeyhole;
}

function metricValue(value: number, label: string) {
  return label.includes("score") || label.includes("QA") ? `${value}%` : String(value);
}

export default function RuntimeOperationsPage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-sellentum-app.vercel.app");
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildRuntimeOperationsReport({ origin, settings, products, quizzes, configurators, events }), [origin, settings, products, quizzes, configurators, events]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Checking runtime operations…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Runtime Operations</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Prove the widget runtime is production-safe.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Monitor public endpoints, install readiness, analytics contracts, release gates and safety guardrails before sending real storefront traffic to Sellentum.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/storefront-sandbox" className="btn-secondary"><Globe2 size={14} /> Storefront QA</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy ops packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><RadioTower size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.passingChecks}</p><p className="mt-1 text-xs text-white/35">Pass</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.warningChecks}</p><p className="mt-1 text-xs text-white/35">Review</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockingChecks}</p><p className="mt-1 text-xs text-white/35">Blockers</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.endpoints, "Runtime endpoints", Code2],
            [report.summary.liveSurfaces, "Live surfaces", Activity],
            [report.summary.analyticsQualityScore, "Analytics QA", BarChart3],
            [report.summary.releaseScore, "Release score", Gauge],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Code2;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{metricValue(Number(value), String(label))}</p>
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
                <h2 className="text-sm font-extrabold">Operations health checks</h2>
                <p className="mt-1 text-xs text-black/35">The checks that determine whether Sellentum is safe to run on production storefront traffic.</p>
              </div>
              <Link href="/dashboard/release-center" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open release <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.checks.map((check) => {
                const Icon = checkIcon(check.status);
                return (
                  <Link key={check.id} href={check.href} className="rounded-2xl border border-black/[0.07] p-4 transition hover:bg-canvas">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", checkTone[check.status])}><Icon size={17} /></span>
                        <div><h3 className="text-xs font-extrabold">{check.label}</h3><p className="mt-1 text-xs font-extrabold uppercase text-black/30">{check.score}% · {check.status}</p></div>
                      </div>
                      <ArrowRight size={14} className="text-black/25" />
                    </div>
                    <p className="mt-3 text-xs leading-4 text-black/45">{check.detail}</p>
                    <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs font-bold leading-4 text-black/40">{check.evidence}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Runtime endpoint contract</h2>
            <p className="mt-1 text-xs text-black/35">Public routes that power embedded finder, advisor, search, configurator and analytics experiences.</p>
            <div className="mt-5 space-y-3">
              {report.endpoints.map((endpoint) => (
                <article key={endpoint.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="text-xs font-extrabold">{endpoint.label}</h3><span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{endpoint.method}</span><span className="rounded-full bg-lime/25 px-2 py-1 text-xs font-extrabold text-moss">{endpoint.owner}</span></div>
                      <p className="mt-2 text-xs leading-4 text-black/45">{endpoint.purpose}</p>
                    </div>
                    <a href={endpoint.path.includes("[id]") ? undefined : endpoint.path} target="_blank" className={cn("shrink-0 rounded-full border border-black/10 px-3 py-2 text-xs font-extrabold text-black/50", endpoint.path.includes("[id]") && "pointer-events-none opacity-35")}>Open <ExternalLink size={10} className="inline" /></a>
                  </div>
                  <code className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/45">{endpoint.path}</code>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {endpoint.guardrails.map((guardrail) => <span key={`${endpoint.id}-${guardrail}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{guardrail}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Runtime guardrail contract</h2>
            <p className="mt-1 text-xs text-black/35">What must remain true as the product evolves.</p>
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
            <h2 className="text-sm font-extrabold">Runtime action queue</h2>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", action.priority === "critical" ? "bg-red-50 text-red-700" : action.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Clipboard size={16} className="text-lime" /> Runtime handoff packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Use this as the engineering/growth handoff before production install or retailer syndication.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied ? "Copied" : "Copy ops packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Operations evidence</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.surfaces}</p><p className="mt-1 text-xs font-bold text-black/30">Surfaces</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.totalViews}</p><p className="mt-1 text-xs font-bold text-black/30">Views</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.totalClicks}</p><p className="mt-1 text-xs font-bold text-black/30">Clicks</p></div>
              <div className="rounded-2xl bg-canvas p-4"><p className="text-2xl font-extrabold">{report.summary.endpoints}</p><p className="mt-1 text-xs font-bold text-black/30">Endpoints</p></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Related ops screens</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/experiences", label: "Experience Registry", detail: "Inspect every public surface.", icon: Sparkles },
                { href: "/dashboard/trust-center", label: "AI Trust Center", detail: "Review AI and data boundaries.", icon: ShieldCheck },
                { href: "/dashboard/preflight", label: "Launch preflight", detail: "Run pre-production launch checks.", icon: FileText },
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
