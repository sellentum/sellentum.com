"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, Database, Gauge, GitBranch, LoaderCircle, LockKeyhole, RadioTower, RefreshCw, ServerCog, Settings, ShieldCheck, ShoppingBag, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { buildWorkspaceHealthReport, type WorkspaceHealthCheckStatus, type WorkspaceHealthReport, type WorkspaceHealthStatus } from "@/lib/workspace-health";
import { cn } from "@/lib/utils";

const statusTone: Record<WorkspaceHealthStatus, string> = {
  ready: "bg-lime text-ink",
  review: "bg-amber-300/20 text-amber-100",
  blocked: "bg-red-500/20 text-red-100",
};

const checkTone: Record<WorkspaceHealthCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-lime/35 text-moss",
  low: "bg-black/[0.04] text-black/35",
};

function CheckIcon({ status }: { status: WorkspaceHealthCheckStatus }) {
  if (status === "pass") return <CheckCircle2 size={16} />;
  if (status === "warn") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

function areaIcon(area: string) {
  if (area === "persistence") return ServerCog;
  if (area === "schema") return Database;
  if (area === "catalog") return ShoppingBag;
  if (area === "experiences") return GitBranch;
  if (area === "analytics") return Gauge;
  if (area === "settings") return Settings;
  return RadioTower;
}

export default function DataContractPage() {
  const { ready, mode, products, quizzes, configurators, events, settings } = useStore();
  const [serverReport, setServerReport] = useState<WorkspaceHealthReport | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverError, setServerError] = useState("");
  const [copied, setCopied] = useState(false);

  const localReport = useMemo(() => buildWorkspaceHealthReport({ mode, products, quizzes, configurators, events, settings }), [mode, products, quizzes, configurators, events, settings]);
  const report = serverReport || localReport;
  const sections = useMemo(() => {
    const grouped = new Map<string, typeof report.checks>();
    report.checks.forEach((check) => grouped.set(check.area, [...(grouped.get(check.area) || []), check]));
    return Array.from(grouped.entries());
  }, [report]);

  async function refreshServerReport() {
    setLoadingServer(true);
    setServerError("");
    try {
      const response = await fetch("/api/workspace/health", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load server workspace health.");
      setServerReport(payload as WorkspaceHealthReport);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Could not load server workspace health.");
    } finally {
      setLoadingServer(false);
    }
  }

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    if (ready) refreshServerReport();
  }, [ready]);

  if (!ready) return <LoadingState label="Checking workspace contract…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Data Contract Center</p>
            <h1 className="display mt-3 text-5xl">Prove the workspace data layer can power every product-discovery runtime.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">A server-backed health check for Supabase persistence, schema tables, catalog records, published finders, configurators, analytics event shape and widget settings before production launch.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={refreshServerReport} disabled={loadingServer} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15 disabled:opacity-50">{loadingServer ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCw size={14} />} Refresh server proof</button>
              <Link href="/dashboard/production" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15"><ShieldCheck size={14} /> Production gates</Link>
              <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Packet copied" : "Copy data packet"}</button>
            </div>
            {serverError && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-100">{serverError}</p>}
          </div>
          <div className="w-[370px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Database size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
            </div>
            <p className="display mt-8 text-6xl">{report.score}%</p>
            <p className="mt-2 text-xs font-bold leading-5 text-white/45">{report.headline}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.passingChecks}</p><p className="mt-1 text-xs text-white/45">Pass</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.warningChecks}</p><p className="mt-1 text-xs text-white/45">Review</p></div>
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.failingChecks}</p><p className="mt-1 text-xs text-white/45">Block</p></div>
            </div>
            <p className="mt-4 rounded-2xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-white/45">Source: {report.source} · Mode: {report.mode}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-6 gap-3">
          {[
            [report.summary.activeProducts, "Active products", ShoppingBag],
            [report.summary.publishedFinders, "Finders", GitBranch],
            [report.summary.publishedConfigurators, "Configurators", Wrench],
            [report.summary.events, "Events", Gauge],
            [report.summary.schemaTables, "Schema tables", Database],
            [report.source === "server-api" ? "API" : "Local", "Proof source", ServerCog],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Database;
            return <div key={String(label)} className="rounded-2xl bg-white/[0.06] p-4"><MetricIcon size={15} className="text-lime" /><p className="mt-5 text-2xl font-extrabold">{String(value)}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/45">{String(label)}</p></div>;
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Workspace health checks</h2><p className="mt-1 text-xs text-black/35">The checks that prove Sellentum can run catalog, finder, advisor, search, configurator, analytics and embed services from one data layer.</p></div>
            <Link href="/dashboard/api-center" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">API Center <ArrowRight size={12} /></Link>
          </div>
          <div className="mt-5 space-y-5">
            {sections.map(([area, checks]) => {
              const Icon = areaIcon(area);
              return (
                <div key={area} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-moss"><Icon size={16} /></span><div><h3 className="text-sm font-extrabold capitalize">{area}</h3><p className="text-xs font-bold text-black/35">{checks.length} contract check{checks.length === 1 ? "" : "s"}</p></div></div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {checks.map((item) => (
                      <Link key={item.id} href={item.href} className="rounded-2xl border border-black/[0.07] bg-white p-4 transition hover:-translate-y-0.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", checkTone[item.status])}><CheckIcon status={item.status} /></span>
                            <div><h4 className="text-sm font-extrabold">{item.label}</h4><p className="mt-1 text-xs font-extrabold uppercase text-black/35">{item.status}</p></div>
                          </div>
                          <ArrowRight size={13} className="mt-2 text-black/25" />
                        </div>
                        <p className="mt-3 text-sm leading-5 text-black/50">{item.detail}</p>
                        <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs font-bold leading-5 text-black/40">{item.evidence}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Action queue</h2><p className="mt-1 text-xs text-black/35">Data fixes that most improve launch confidence.</p></div><Wrench className="text-moss" size={17} /></div>
            <div className="mt-5 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-2xl border border-black/[0.06] p-4 hover:bg-canvas">
                  <span className={cn("mt-0.5 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{action.title}</span><span className="mt-1 block text-sm leading-5 text-black/45">{action.detail}</span></span>
                  <ArrowRight size={13} className="mt-2 text-black/25" />
                </Link>
              ))}
              {!report.actions.length && <p className="rounded-2xl bg-lime/20 p-4 text-sm font-bold text-moss">No contract actions remain for this workspace snapshot.</p>}
            </div>
          </section>

          <section className="rounded-[28px] bg-ink p-6 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><ServerCog size={18} /></div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-.045em]">Authenticated health endpoint</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">The dashboard calls the same server route production support can use for launch triage. It returns a redacted report, never Supabase keys or shopper PII.</p>
            <code className="mt-4 block rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold text-lime">GET /api/workspace/health</code>
          </section>
        </aside>
      </div>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Supabase table contract</h2><p className="mt-1 text-xs text-black/35">Required tables, columns and runtime guardrails for the current Sellentum production track.</p></div><Database className="text-moss" size={18} /></div>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {report.schemaContracts.map((contract) => (
            <article key={contract.table} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", checkTone[contract.status])}>{contract.status}</span>
              <h3 className="mt-3 text-sm font-extrabold">{contract.table}</h3>
              <p className="mt-2 text-sm leading-5 text-black/50">{contract.purpose}</p>
              <p className="mt-3 text-xs font-bold leading-5 text-black/35">{contract.missingColumns.length ? `Missing: ${contract.missingColumns.join(", ")}` : `${contract.requiredColumns.length} required columns covered.`}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
