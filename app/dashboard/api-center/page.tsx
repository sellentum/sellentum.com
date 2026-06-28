"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Braces, CheckCircle2, Clipboard, Code2, ExternalLink, Gauge, Globe2, LockKeyhole, RadioTower, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildApiCenterReport, type ApiActionPriority, type ApiCenterStatus, type ApiCheckStatus, type ApiEndpointStatus } from "@/lib/api-center";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<ApiCenterStatus, string> = {
  ready: "bg-lime/35 text-moss",
  watch: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const endpointTone: Record<ApiEndpointStatus, string> = {
  ready: "bg-lime/25 text-moss",
  review: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const checkTone: Record<ApiCheckStatus, string> = {
  pass: "bg-lime/25 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<ApiActionPriority, string> = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function ApiCenterPage() {
  const { ready, settings, products, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-sellentum-app.vercel.app");
  const [copied, setCopied] = useState("");
  const [selectedEndpointId, setSelectedEndpointId] = useState("finder-recommendations");
  const report = useMemo(() => buildApiCenterReport({ origin, settings, products, quizzes, configurators, events }), [origin, settings, products, quizzes, configurators, events]);
  const selectedEndpoint = report.endpoints.find((endpoint) => endpoint.id === selectedEndpointId) || report.endpoints[0];

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Preparing headless API contracts…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Headless API Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Ship Sellentum discovery through custom storefront APIs.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Package finder, advisor, semantic search, configurator, widget and analytics runtimes for custom React, headless commerce or agency-built storefronts—without exposing private keys or moving product selection into the browser.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/operations" className="btn-secondary"><RadioTower size={14} /> Runtime Ops</Link>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy API packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[390px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Braces size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.readyEndpoints}</p><p className="mt-1 text-xs text-white/35">Ready</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.endpoints}</p><p className="mt-1 text-xs text-white/35">Endpoints</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blockedEndpoints}</p><p className="mt-1 text-xs text-white/35">Blocked</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.checksPassing, "Passing checks", CheckCircle2],
            [report.summary.totalViews, "Runtime views", Globe2],
            [report.summary.totalCompletions, "Completions", Sparkles],
            [report.summary.analyticsQualityScore, "Analytics QA", Gauge],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Braces;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}{label === "Analytics QA" ? "%" : ""}</p>
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
                <h2 className="text-sm font-extrabold">API endpoint catalog</h2>
                <p className="mt-1 text-xs text-black/35">Public runtime endpoints for custom storefronts. These are the same services behind the widget and shopper pages.</p>
              </div>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.endpoints.map((endpoint) => (
                <button key={endpoint.id} onClick={() => setSelectedEndpointId(endpoint.id)} className={cn("rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", selectedEndpoint.id === endpoint.id ? "border-ink bg-ink text-white" : "border-black/[0.07] bg-canvas hover:bg-white")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-extrabold">{endpoint.label}</h3>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", selectedEndpoint.id === endpoint.id ? "bg-white/10 text-lime" : endpointTone[endpoint.status])}>{endpoint.statusLabel}</span>
                      </div>
                      <p className={cn("mt-2 text-xs leading-4", selectedEndpoint.id === endpoint.id ? "text-white/45" : "text-black/40")}>{endpoint.purpose}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-extrabold", selectedEndpoint.id === endpoint.id ? "bg-lime text-ink" : "bg-white text-black/35")}>{endpoint.method}</span>
                  </div>
                  <code className={cn("mt-3 block truncate rounded-xl px-3 py-2 text-xs font-bold", selectedEndpoint.id === endpoint.id ? "bg-white/[0.06] text-white/45" : "bg-white text-black/45")}>{endpoint.path}</code>
                </button>
              ))}
            </div>
          </section>

          {selectedEndpoint && (
            <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="eyebrow text-moss">Selected endpoint</p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{selectedEndpoint.label}</h2>
                  <p className="mt-2 max-w-3xl text-xs leading-5 text-black/45">{selectedEndpoint.purpose}</p>
                </div>
                <a href={selectedEndpoint.path.includes("YOUR_") || selectedEndpoint.method === "POST" ? undefined : selectedEndpoint.path} target="_blank" className={cn("shrink-0 rounded-full border border-black/10 px-4 py-2.5 text-xs font-extrabold text-black/50", (selectedEndpoint.path.includes("YOUR_") || selectedEndpoint.method === "POST") && "pointer-events-none opacity-35")}>Open <ExternalLink size={12} className="inline" /></a>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-ink p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-extrabold"><TerminalSquare size={14} className="text-lime" /> Fetch snippet</p>
                    <button onClick={() => copy(selectedEndpoint.clientSnippet, `${selectedEndpoint.id}-snippet`)} className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">{copied === `${selectedEndpoint.id}-snippet` ? "Copied" : "Copy"}</button>
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/20 p-3 text-xs leading-4 text-white/55">{selectedEndpoint.clientSnippet}</pre>
                </div>
                <div className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-xs font-extrabold"><Code2 size={14} className="text-moss" /> Request body</p>
                    <button onClick={() => copy(selectedEndpoint.requestExample, `${selectedEndpoint.id}-body`)} className="rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">{copied === `${selectedEndpoint.id}-body` ? "Copied" : "Copy"}</button>
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-white p-3 text-xs leading-4 text-black/45">{selectedEndpoint.requestExample}</pre>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold">Response fields</p>
                  <div className="mt-3 flex flex-wrap gap-2">{selectedEndpoint.responseFields.map((field) => <span key={field} className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-black/40">{field}</span>)}</div>
                </div>
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold">Runtime guardrails</p>
                  <div className="mt-3 space-y-2">{selectedEndpoint.guardrails.map((guardrail) => <p key={guardrail} className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{guardrail}</p>)}</div>
                </div>
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> API readiness checks</h2>
            <div className="mt-4 space-y-2">
              {report.checks.map((check) => (
                <Link key={check.id} href={check.href} className={cn("block rounded-2xl p-4 transition hover:-translate-y-0.5", checkTone[check.status])}>
                  <p className="text-xs font-extrabold">{check.label}</p>
                  <p className="mt-1 text-xs leading-4 opacity-70">{check.detail}</p>
                  <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold leading-4 opacity-80">{check.evidence}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Gauge size={16} className="text-lime" /> Handoff queue</h2>
            <div className="mt-4 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-white/[0.06] p-4 transition hover:bg-white/[0.1]">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-1 text-xs leading-4 text-white/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-bold leading-4 text-white/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">{action.label}<ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><LockKeyhole size={16} className="text-moss" /> SDK boundary notes</h2>
            <div className="mt-4 space-y-2">
              {report.sdkNotes.map((note) => (
                <div key={note.label} className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold">{note.label}</p>
                  <p className="mt-1 text-xs leading-4 text-black/40">{note.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-moss">{note.proof}</p>
                </div>
              ))}
            </div>
            <button onClick={() => copy(report.packet, "packet-bottom")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">{copied === "packet-bottom" ? "Packet copied" : "Copy API packet"} <Clipboard size={13} /></button>
          </section>
        </aside>
      </div>
    </div>
  );
}
