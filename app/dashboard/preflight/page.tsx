"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, ExternalLink, LoaderCircle, RefreshCcw, Rocket, ShieldAlert, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";

type CheckStatus = "pass" | "warn" | "fail";

type PreflightCheck = {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

type PreflightSection = {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  checks: PreflightCheck[];
};

type PreflightPayload = {
  mode: "demo" | "supabase";
  generated_at: string;
  origin: string;
  app_url: string;
  overall: CheckStatus;
  summary: {
    products: number;
    active_products: number;
    catalog_intelligence_score: number;
    catalog_intelligence_blockers: number;
    catalog_intelligence_warnings: number;
    ready_finders: number;
    ready_configurators: number;
    finder_readiness_blockers: number;
    finder_readiness_warnings: number;
    configurator_readiness_blockers: number;
    configurator_readiness_warnings: number;
    analytics_events: number;
    sessions: number;
    session_events: number;
    intent_events: number;
  };
  sections: PreflightSection[];
};

const statusCopy: Record<CheckStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pass: { label: "Ready", className: "bg-lime/35 text-moss", icon: CheckCircle2 },
  warn: { label: "Needs review", className: "bg-amber-50 text-amber-700", icon: AlertTriangle },
  fail: { label: "Blocked", className: "bg-red-50 text-red-700", icon: ShieldAlert },
};

function StatusPill({ status }: { status: CheckStatus }) {
  const copy = statusCopy[status];
  const Icon = copy.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-extrabold ${copy.className}`}><Icon size={11} />{copy.label}</span>;
}

export default function PreflightPage() {
  const [payload, setPayload] = useState<PreflightPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/preflight", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not run preflight.");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run preflight.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const checks = payload?.sections.flatMap((section) => section.checks) || [];
    return {
      checks: checks.length,
      ready: checks.filter((check) => check.status === "pass").length,
      warn: checks.filter((check) => check.status === "warn").length,
      fail: checks.filter((check) => check.status === "fail").length,
    };
  }, [payload]);

  if (loading) return <LoadingState label="Running launch preflight…" />;

  if (error || !payload) {
    return (
      <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600"><ShieldAlert size={25} /></span>
          <h1 className="display mt-5 text-4xl">Preflight could not run.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">{error || "Try logging in again and rerunning the check."}</p>
          <button onClick={load} className="btn-primary mt-6"><RefreshCcw size={15} /> Try again</button>
        </div>
      </div>
    );
  }

  const overall = statusCopy[payload.overall];
  const OverallIcon = overall.icon;

  return (
    <div className="animate-rise">
      <div className="overflow-hidden rounded-[34px] bg-ink text-white">
        <div className="relative grid gap-8 p-7 lg:grid-cols-[1fr_420px] lg:p-10">
          <div className="dot-grid absolute inset-0 opacity-10" />
          <div className="relative">
            <p className="eyebrow text-lime">Production verification</p>
            <h1 className="mt-4 max-w-3xl text-6xl font-extrabold leading-[.9] tracking-[-.07em]">Launch preflight for your product discovery stack.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/50">Check whether Findly has the catalog data, AI configuration, published experiences, embed setup and analytics signals needed to ship confidently.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={load} disabled={refreshing} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink disabled:opacity-60">{refreshing ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCcw size={14} />}Rerun checks</button>
              <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15">Open embed settings <ExternalLink size={13} /></Link>
            </div>
          </div>
          <div className="relative rounded-[28px] border border-white/10 bg-white/[.06] p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><OverallIcon size={22} /></span>
              <StatusPill status={payload.overall} />
            </div>
            <h2 className="display mt-7 text-4xl">{payload.overall === "pass" ? "Ready to embed" : payload.overall === "warn" ? "Almost launchable" : "Fix blockers first"}</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">{payload.mode === "demo" ? "Demo workspace checks use seeded data. Connect Supabase before production launch." : "Supabase workspace checks are using your authenticated account."}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{totals.ready}</p><p className="mt-1 text-[8px] font-bold text-white/35">Ready</p></div>
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{totals.warn}</p><p className="mt-1 text-[8px] font-bold text-white/35">Review</p></div>
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{totals.fail}</p><p className="mt-1 text-[8px] font-bold text-white/35">Blocked</p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
        {[
          [payload.summary.active_products, "Active products"],
          [`${payload.summary.catalog_intelligence_score}%`, "Catalog score"],
          [payload.summary.catalog_intelligence_blockers, "Catalog blockers"],
          [payload.summary.catalog_intelligence_warnings, "Catalog warnings"],
          [payload.summary.ready_finders, "Ready finders"],
          [payload.summary.ready_configurators, "Ready configurators"],
          [payload.summary.finder_readiness_blockers + payload.summary.configurator_readiness_blockers, "Readiness blockers"],
          [payload.summary.finder_readiness_warnings + payload.summary.configurator_readiness_warnings, "Readiness warnings"],
          [payload.summary.analytics_events, "Analytics events"],
          [payload.summary.sessions, "Sessions"],
          [payload.summary.intent_events, "Intent events"],
          [totals.checks, "Checks run"],
        ].map(([value, label]) => (
          <div key={String(label)} className="rounded-2xl border border-black/[0.07] bg-white p-4">
            <p className="text-2xl font-extrabold tracking-[-.05em]">{String(value)}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {payload.sections.map((section) => (
          <section key={section.id} className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><ClipboardCheck size={16} className="text-moss" />{section.label}</h2>
                <p className="mt-1 text-[10px] leading-4 text-black/35">{section.description}</p>
              </div>
              <StatusPill status={section.status} />
            </div>

            <div className="mt-5 space-y-3">
              {section.checks.map((item) => {
                const copy = statusCopy[item.status];
                const Icon = copy.icon;
                return (
                  <article key={item.id} className="rounded-2xl border border-black/[0.06] bg-[#f8f8f4] p-4">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${copy.className}`}><Icon size={15} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xs font-extrabold">{item.label}</h3>
                          {item.actionHref && item.actionLabel && <Link href={item.actionHref} className="hidden shrink-0 items-center gap-1 text-[9px] font-extrabold text-moss sm:flex">{item.actionLabel}<ArrowRight size={10} /></Link>}
                        </div>
                        <p className="mt-1 text-[10px] leading-4 text-black/40">{item.description}</p>
                        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[10px] font-bold leading-4 text-black/50">{item.detail}</p>
                        {item.actionHref && item.actionLabel && <Link href={item.actionHref} className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-moss sm:hidden">{item.actionLabel}<ArrowRight size={10} /></Link>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="eyebrow text-moss">Next best action</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-.05em]">{payload.overall === "fail" ? "Clear the blocked checks before embedding." : payload.overall === "warn" ? "Review warnings, then run a real widget session." : "Copy the widget and run a live storefront test."}</h2>
            <p className="mt-2 text-xs leading-5 text-black/40">Last generated {new Date(payload.generated_at).toLocaleString("en-GB")} for {payload.app_url}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/settings" className="btn-primary"><Rocket size={15} /> Copy embed</Link>
            <Link href="/dashboard/analytics" className="btn-secondary"><Sparkles size={15} /> Check analytics</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
