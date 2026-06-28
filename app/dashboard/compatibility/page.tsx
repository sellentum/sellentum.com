"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clipboard, GitBranch, Network, PackagePlus, ShieldAlert, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildCompatibilityMatrixReport, type CompatibilityActionPriority, type CompatibilityMatrixStatus, type CompatibilityRuleStatus } from "@/lib/compatibility-matrix";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<CompatibilityMatrixStatus, string> = {
  empty: "bg-black/5 text-black/40",
  "needs-attention": "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  ready: "bg-lime/35 text-moss",
};

const ruleTone: Record<CompatibilityRuleStatus, string> = {
  pass: "bg-lime/25 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<CompatibilityActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function CompatibilityMatrixPage() {
  const { ready, products, configurators } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildCompatibilityMatrixReport({ products, configurators }), [products, configurators]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!ready) return <LoadingState label="Auditing compatibility matrix…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Compatibility Matrix Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Audit dependency rules before shoppers build impossible carts.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Turn configurator incompatibility rules into a merchant-readable matrix for B2B-style dependencies, stale option references, product-link availability and runtime QA guardrails.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/configurators" className="btn-secondary"><PackagePlus size={14} /> Edit rules</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Packet copied" : "Copy matrix packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Network size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : report.status === "needs-attention" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockedPairs}</p><p className="mt-1 text-xs text-white/35">Pairs</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.staleRules}</p><p className="mt-1 text-xs text-white/35">Stale</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.qaScore}%</p><p className="mt-1 text-xs text-white/35">QA</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.compatibilityRules, "Rule refs", ShieldAlert],
            [report.summary.productLinkedOptions, "Product links", PackagePlus],
            [report.summary.guardedSteps, "Guarded steps", GitBranch],
            [report.summary.oneWayRules, "One-way refs", AlertTriangle],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof ShieldAlert;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
              </article>
            );
          })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Dependency rule matrix</h2>
                <p className="mt-1 text-xs text-black/35">Each row is a deterministic blocked pair used by the configurator runtime before checkout.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.summary.compatibilityRules} rules</span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.07]">
              <div className="grid grid-cols-[1fr_1fr_120px_120px] bg-canvas px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-black/35">
                <span>Selected option</span>
                <span>Blocked option</span>
                <span>Status</span>
                <span>Matrix</span>
              </div>
              {report.rules.slice(0, 10).map((rule) => (
                <div key={rule.id} className="grid grid-cols-[1fr_1fr_120px_120px] gap-3 border-t border-black/[0.06] px-4 py-4 text-xs">
                  <div>
                    <p className="font-extrabold">{rule.sourceOptionLabel}</p>
                    <p className="mt-1 text-xs text-black/35">{rule.sourceStepTitle}{rule.sourceProductName ? ` · ${rule.sourceProductName}` : ""}</p>
                  </div>
                  <div>
                    <p className="font-extrabold">{rule.targetOptionLabel}</p>
                    <p className="mt-1 text-xs text-black/35">{rule.targetStepTitle || "Missing option"}{rule.targetProductName ? ` · ${rule.targetProductName}` : ""}</p>
                  </div>
                  <div><span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", ruleTone[rule.status])}>{rule.status}</span></div>
                  <div><span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-extrabold uppercase text-black/35">{rule.reciprocal ? "two-way" : "one-way"}</span></div>
                  <p className="col-span-4 rounded-xl bg-canvas px-3 py-2 text-xs font-bold leading-4 text-black/45">{rule.evidence}</p>
                </div>
              ))}
              {!report.rules.length && <div className="p-5 text-xs font-bold leading-5 text-black/45">No compatibility rules yet. Add incompatibility references in Configurators to generate the matrix.</div>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Option coverage</h2>
                <p className="mt-1 text-xs text-black/35">The most dependency-sensitive options across every visual configurator.</p>
              </div>
              <ShieldCheck size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {report.options.slice(0, 6).map((option) => (
                <article key={option.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold">{option.label}</p>
                      <p className="mt-1 text-xs text-black/35">{option.configuratorName} · {option.stepTitle}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", option.activeProduct ? "bg-lime/25 text-moss" : "bg-red-50 text-red-700")}>{option.activeProduct ? "available" : "unavailable"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/40">{option.ruleCount} rules</span>
                    <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-black/40">{option.productName || "No product link"}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Matrix checks</h2>
                <p className="mt-1 text-xs text-black/35">Readiness evidence for B2B-style dependency rules and configurator launch safety.</p>
              </div>
              <CheckCircle2 size={18} className="text-moss" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.checks.map((check) => (
                <div key={check.id} className={cn("rounded-2xl p-4", ruleTone[check.status])}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xs font-extrabold">{check.label}</h3>
                    <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-extrabold uppercase opacity-80">{check.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-4 opacity-70">{check.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold leading-4 opacity-80">{check.evidence}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Wrench size={16} className="text-lime" /> Dependency action queue</h2>
            <div className="mt-4 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.actionHref} className="block rounded-2xl bg-white/[0.06] p-4 transition hover:bg-white/[0.1]">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-1 text-xs leading-4 text-white/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold leading-4 text-white/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">{action.actionLabel}<ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Network size={16} className="text-moss" /> Why this matters</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">Zoovu wins complex categories because it can reason over dependencies: if a shopper chooses one motor, bracket, finish or fit constraint, incompatible items are removed before the cart. This center makes that same rule layer visible for Sellentum merchants.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied ? "Packet copied" : "Copy matrix packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={16} className="text-moss" /> AI boundary</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">AI can help explain why a selected bundle fits, but it does not invent dependency rules. The matrix comes from merchant-authored configurator options and is validated deterministically before recommendations are shown.</p>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldAlert size={16} className="text-moss" /> Runtime proof</h2>
            <p className="mt-3 text-xs leading-5 text-black/45">{report.summary.failedQaGuardrails ? `${report.summary.failedQaGuardrails} guardrail QA failure needs attention before launch.` : "Configurator QA currently validates compatibility guardrails without failing blocked-pair scenarios."}</p>
            <Link href="/dashboard/preflight" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open launch preflight <ArrowRight size={12} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
