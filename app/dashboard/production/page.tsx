"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, Code2, ExternalLink, Gauge, Globe2, LockKeyhole, MonitorCheck, Rocket, ShieldCheck, TerminalSquare, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildProductionAuthProofPacket, buildProductionVerificationReport, productionAuthChecklist, productionAuthProofSteps, productionSupabaseRepair, type ProductionActionPriority, type ProductionCheckStatus, type ProductionProofStatus, type ProductionVerificationStatus } from "@/lib/production-verification";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<ProductionVerificationStatus, string> = {
  verified: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const checkTone: Record<ProductionCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<ProductionActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

const proofTone: Record<ProductionProofStatus, string> = {
  proven: "border-lime/50 bg-lime/15 text-moss",
  "needs-proof": "border-amber-200 bg-amber-50 text-amber-700",
  blocked: "border-red-100 bg-red-50 text-red-700",
};

const proofBadge: Record<ProductionProofStatus, string> = {
  proven: "Proven",
  "needs-proof": "Needs proof",
  blocked: "Blocked",
};

function CheckIcon({ status }: { status: ProductionCheckStatus }) {
  if (status === "pass") return <CheckCircle2 size={16} />;
  if (status === "warn") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

function PriorityIcon({ priority }: { priority: ProductionActionPriority }) {
  if (priority === "critical") return <LockKeyhole size={14} />;
  if (priority === "high") return <Wrench size={14} />;
  if (priority === "medium") return <AlertTriangle size={14} />;
  return <CheckCircle2 size={14} />;
}

export default function ProductionVerificationPage() {
  const { ready, mode, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-sellentum-app.vercel.app");
  const [copied, setCopied] = useState(false);
  const [copiedRepair, setCopiedRepair] = useState(false);
  const [copiedRepairSql, setCopiedRepairSql] = useState(false);
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [copiedAuthProof, setCopiedAuthProof] = useState(false);
  const report = useMemo(() => buildProductionVerificationReport({ origin, mode, products, quizzes, configurators, events, settings }), [origin, mode, products, quizzes, configurators, events, settings]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyRepairSteps() {
    await navigator.clipboard.writeText([
      "Run this in the production Supabase SQL editor:",
      productionSupabaseRepair.path,
      "",
      "Or paste the SQL directly from the Copy repair SQL button in /dashboard/production.",
      "",
      "Then rerun the production verifier:",
      productionSupabaseRepair.verifyCommand,
      "",
      "Then run the full schema/RLS check:",
      productionSupabaseRepair.schemaCheckPath,
    ].join("\n"));
    setCopiedRepair(true);
    window.setTimeout(() => setCopiedRepair(false), 1600);
  }

  async function copyRepairSql() {
    await navigator.clipboard.writeText(productionSupabaseRepair.sql);
    setCopiedRepairSql(true);
    window.setTimeout(() => setCopiedRepairSql(false), 1600);
  }

  async function copyAuthSteps() {
    await navigator.clipboard.writeText([
      "Production auth QA checklist",
      "============================",
      "",
      `Expected app URL: ${productionAuthChecklist.appUrl}`,
      `Expected callback path: ${productionAuthChecklist.appUrl}${productionAuthChecklist.callbackPath}`,
      "",
      "Routes to verify:",
      ...productionAuthChecklist.routes.map((route) => `- ${productionAuthChecklist.appUrl}${route}`),
      "",
      "Manual checks:",
      ...productionAuthChecklist.manualChecks.map((item) => `- ${item}`),
    ].join("\n"));
    setCopiedAuth(true);
    window.setTimeout(() => setCopiedAuth(false), 1600);
  }

  async function copyAuthProofTemplate() {
    await navigator.clipboard.writeText(buildProductionAuthProofPacket({ appUrl: origin, testedAt: new Date().toISOString() }));
    setCopiedAuthProof(true);
    window.setTimeout(() => setCopiedAuthProof(false), 1600);
  }

  if (!ready) return <LoadingState label="Verifying production readiness…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Production Verification Center</p>
            <h1 className="display mt-3 text-5xl">Prove Sellentum is ready for a real storefront launch.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">A desktop-first production gate for Vercel deployment, Supabase persistence, public runtime contracts, widget QA, analytics proof and deterministic AI trust boundaries.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/preflight" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15"><ShieldCheck size={14} /> Run preflight</Link>
              <Link href="/dashboard/release-center" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15"><Rocket size={14} /> Release Center</Link>
              <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Packet copied" : "Copy verification packet"}</button>
            </div>
          </div>
          <div className="w-[370px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><MonitorCheck size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white/45">{report.headline}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.passingChecks}</p><p className="mt-1 text-xs text-white/45">Pass</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.warningChecks}</p><p className="mt-1 text-xs text-white/45">Review</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockingChecks}</p><p className="mt-1 text-xs text-white/45">Block</p></div>
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-6 gap-3">
          {[
            [report.summary.requiredRoutes, "Routes", Globe2],
            [report.summary.runtimeEndpoints, "Endpoints", Code2],
            [report.summary.desktopScenarios, "Desktop QA", MonitorCheck],
            [`${report.summary.analyticsQualityScore}%`, "Analytics QA", Gauge],
            [`${report.summary.releaseScore}%`, "Release", Rocket],
            [`${report.summary.runtimeScore}%`, "Runtime", ShieldCheck],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Globe2;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-moss">Plain-English production status</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em] text-ink">What is actually proven, and what still needs evidence?</h2>
            <p className="mt-3 text-sm leading-6 text-black/55">This separates shipped code from real launch proof. Green means the evidence exists, amber means someone still needs to test or capture proof, and red means the launch path is blocked.</p>
          </div>
          <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white">Open launch queue <ArrowRight size={13} className="text-lime" /></Link>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {report.plainEnglishProof.map((proof) => (
            <Link key={proof.id} href={proof.href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${proofTone[proof.status]}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold uppercase text-black/35">{proof.owner}</span>
                  <h3 className="mt-4 text-sm font-extrabold leading-5 text-ink">{proof.title}</h3>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold uppercase text-black/45">{proofBadge[proof.status]}</span>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-black/50">{proof.meaning}</p>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/40">{proof.evidence}</p>
              <p className="mt-3 text-xs font-extrabold leading-5 text-moss">Next: {proof.nextStep}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-lime/40 bg-lime/10 p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-moss">Backend proof reference</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em] text-ink">The production backend repair pack is kept here as a fallback.</h2>
            <p className="mt-3 text-sm leading-6 text-black/55">The current Sellentum production backend has already passed schema/RLS and live route verification. Keep this repair pack available only for future schema drift or if the verifier reports <span className="font-extrabold text-ink">{productionSupabaseRepair.fixes.join(" or ")}</span> missing again.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={copyRepairSteps} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white"><Clipboard size={14} /> {copiedRepair ? "Steps copied" : "Copy repair steps"}</button>
            <button onClick={copyRepairSql} className="inline-flex items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-xs font-extrabold text-white"><Clipboard size={14} /> {copiedRepairSql ? "SQL copied" : "Copy repair SQL"}</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">1. Supabase SQL editor</p>
            <code className="mt-3 block rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-moss">{productionSupabaseRepair.path}</code>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">2. CLI verification</p>
            <code className="mt-3 block rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-moss">{productionSupabaseRepair.verifyCommand}</code>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">3. Full schema/RLS proof</p>
            <code className="mt-3 block rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-moss">{productionSupabaseRepair.schemaCheckPath}</code>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">Fallback use only</p>
            <p className="mt-3 text-xs font-bold leading-5 text-black/45">Do not rerun this as the next launch task unless production verification reports the widget/rate-limit schema drift again.</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-moss">Production auth proof</p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em] text-ink">Confirm Supabase emails return users to Sellentum, not localhost.</h2>
            <p className="mt-3 text-sm leading-6 text-black/55">The app already generates signup and reset links from <span className="font-extrabold text-ink">NEXT_PUBLIC_APP_URL</span>. This checklist proves Supabase email confirmation, login and password reset work on the live domain before merchant onboarding.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={copyAuthSteps} className="inline-flex items-center justify-center gap-2 rounded-full bg-moss px-5 py-3 text-xs font-extrabold text-white"><Clipboard size={14} /> {copiedAuth ? "Checklist copied" : "Copy auth checklist"}</button>
            <button onClick={copyAuthProofTemplate} className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copiedAuthProof ? "Template copied" : "Copy auth proof template"}</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">Expected callback</p>
            <code className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-bold text-moss">{productionAuthChecklist.appUrl}{productionAuthChecklist.callbackPath}</code>
            <p className="mt-3 text-xs font-bold leading-5 text-black/40">Supabase confirmation and reset emails should route through this callback, then continue to dashboard or reset password.</p>
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-xs font-extrabold uppercase text-black/35">Routes covered by verifier</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {productionAuthChecklist.routes.map((route) => <code key={route} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-black/45">{route}</code>)}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 xl:grid-cols-3">
          {productionAuthChecklist.manualChecks.map((item, index) => (
            <p key={item} className="rounded-2xl border border-black/[0.06] bg-canvas p-4 text-sm font-bold leading-5 text-black/50"><span className="mr-2 text-moss">{index + 1}.</span>{item}</p>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-black/[0.07] bg-canvas p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-black/35">Proof to capture</p>
              <h3 className="mt-2 text-lg font-extrabold tracking-[-.035em] text-ink">Send this evidence back after testing auth.</h3>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold uppercase text-black/35">{productionAuthProofSteps.length} proof points</span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {productionAuthProofSteps.map((step) => (
              <article key={step.id} className="rounded-2xl bg-white p-4">
                <p className="text-sm font-extrabold">{step.label}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-black/45">{step.proofToCapture}</p>
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-4 text-red-700/75">Risk if failed: {step.failureRisk}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Production gates</h2><p className="mt-1 text-xs text-black/35">Deployment, runtime, storefront, analytics, trust and handoff evidence.</p></div>
            <Link href="/dashboard/operations" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">Runtime Ops <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.checks.map((check) => (
              <Link key={check.id} href={check.href} className="rounded-2xl border border-black/[0.07] bg-canvas p-4 transition hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", checkTone[check.status])}><CheckIcon status={check.status} /></span>
                    <div><h3 className="text-sm font-extrabold">{check.label}</h3><p className="mt-1 text-xs font-extrabold uppercase text-black/35">{check.area} · {check.score}%</p></div>
                  </div>
                  <ArrowRight size={14} className="text-black/25" />
                </div>
                <p className="mt-3 text-sm leading-5 text-black/50">{check.detail}</p>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/45">{check.evidence}</p>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Action queue</h2><p className="mt-1 text-xs text-black/35">Highest-priority production fixes.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl", priorityTone[action.priority])}><PriorityIcon priority={action.priority} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{action.title}</span><span className="mt-1 block text-sm leading-5 text-black/45">{action.detail}</span><span className="mt-2 block text-xs font-bold text-black/35">{action.evidence}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><TerminalSquare size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.045em]">Final deployment commands</h2>
            <div className="mt-4 space-y-2">
              {report.artifacts.filter((artifact) => artifact.command).map((artifact) => <code key={artifact.id} className="block rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-lime">{artifact.command}</code>)}
            </div>
            <p className="mt-4 text-xs font-bold leading-5 text-white/40">Run smoke against the deployed Vercel URL before calling production done.</p>
          </section>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Verification artifacts</h2><p className="mt-1 text-xs text-black/35">Commands, files and deployment evidence needed before production handoff.</p></div><TerminalSquare className="text-moss" size={17} /></div>
          <div className="mt-5 space-y-3">
            {report.artifacts.map((artifact) => (
              <article key={artifact.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", checkTone[artifact.status])}>{artifact.status}</span><h3 className="mt-3 text-sm font-extrabold">{artifact.label}</h3><p className="mt-1 text-sm leading-5 text-black/50">{artifact.detail}</p></div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/45">{artifact.owner}</span>
                </div>
                {artifact.command && <code className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-bold text-moss">{artifact.command}</code>}
                {artifact.path && <code className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/45">{artifact.path}</code>}
                <p className="mt-3 text-xs font-bold leading-5 text-black/40">{artifact.proof}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Desktop QA scenarios</h2><p className="mt-1 text-xs text-black/35">Desktop-only launch checks for the MVP storefront and dashboard surfaces.</p></div><MonitorCheck className="text-moss" size={17} /></div>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {report.desktopQa.map((scenario) => (
              <article key={scenario.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", checkTone[scenario.status])}>{scenario.status}</span><h3 className="mt-3 text-sm font-extrabold">{scenario.label}</h3></div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/45">{scenario.owner}</span>
                </div>
                <code className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/45">{scenario.route}</code>
                <p className="mt-3 text-sm leading-5 text-black/50">{scenario.expected}</p>
                {!!scenario.telemetry.length && <div className="mt-3 flex flex-wrap gap-1.5">{scenario.telemetry.map((event) => <span key={`${scenario.id}-${event}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/45">{event}</span>)}</div>}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Required route and API contract</h2><p className="mt-1 text-xs text-black/35">Every production deployment must expose these marketing, dashboard, widget and public runtime routes.</p></div><Code2 className="text-moss" size={18} /></div>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {report.requiredRoutes.map((route) => (
            <article key={route.route} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold uppercase text-black/45">{route.owner}</span>
              <code className="mt-3 block break-all rounded-xl bg-white px-3 py-2 text-xs font-bold text-moss">{route.route}</code>
              <p className="mt-3 text-sm leading-5 text-black/50">{route.purpose}</p>
              {!route.route.includes("[id]") && <a href={route.route} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open route <ExternalLink size={10} /></a>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
