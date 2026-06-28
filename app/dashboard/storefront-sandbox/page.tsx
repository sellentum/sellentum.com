"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clipboard, Code2, ExternalLink, Globe2, MonitorCheck, MousePointerClick, PlayCircle, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildStorefrontSandboxReport, type StorefrontSandboxStatus } from "@/lib/storefront-sandbox";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<StorefrontSandboxStatus, string> = {
  blocked: "bg-red-50 text-red-700",
  ready: "bg-lime/35 text-moss",
  verified: "bg-ink text-lime",
};

export default function StorefrontSandboxPage() {
  const { ready, settings, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-sellentum-app.vercel.app");
  const report = useMemo(() => buildStorefrontSandboxReport({ origin, settings, finders: quizzes, configurators, events }), [origin, settings, quizzes, configurators, events]);
  const [selectedId, setSelectedId] = useState(report.recommendedCase?.id || "");
  const [copied, setCopied] = useState<string | null>(null);
  const selected = report.cases.find((item) => item.id === selectedId) || report.recommendedCase || report.cases[0];

  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => { if (!selectedId && report.recommendedCase) setSelectedId(report.recommendedCase.id); }, [report.recommendedCase, selectedId]);

  async function copy(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  }

  if (!ready) return <LoadingState label="Preparing storefront sandbox…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Storefront QA sandbox</p>
          <h1 className="display mt-2 text-5xl">Verify embeds before touching a live theme.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Preview each launch channel in a controlled desktop storefront, copy the exact snippet, and follow the event-contract checklist that proves the widget is production-ready.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/channels" className="btn-secondary"><Rocket size={14} /> Channels</Link>
          <Link href="/dashboard/preflight" className="btn-primary"><ShieldCheck size={14} className="text-lime" /> Preflight</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><MonitorCheck size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "verified" ? "bg-lime text-ink" : report.status === "blocked" ? "bg-red-500/20 text-red-100" : "bg-white/10 text-white/50")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">Sandbox confidence across install-ready snippets, QA cases and captured telemetry proof.</p>
          <button onClick={() => copy(report.packet, "packet")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-xs font-extrabold text-ink">
            {copied === "packet" ? <Check size={14} /> : <Clipboard size={14} />} {copied === "packet" ? "Packet copied" : "Copy QA packet"}
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          {[
            [report.summary.cases, "QA cases", MonitorCheck],
            [report.summary.ready, "Ready", PlayCircle],
            [report.summary.verified, "Verified", Check],
            [report.summary.blocked, "Blocked", ShieldCheck],
            [report.summary.expectedEvents, "Expected events", MousePointerClick],
          ].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof MonitorCheck; return (
            <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
              <p className="display mt-5 text-4xl">{String(value)}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
            </article>
          ); })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-3">
          {report.cases.map((item) => {
            const active = item.id === selected.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn("w-full rounded-2xl border p-4 text-left transition", active ? "border-ink bg-ink text-white shadow-xl" : "border-black/[0.07] bg-white hover:-translate-y-0.5 hover:border-black/15")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-lime text-ink" : "bg-[#eef1e8] text-moss")}><Globe2 size={18} /></span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", active ? "bg-white/10 text-white/45" : statusTone[item.status])}>{item.statusLabel}</span>
                </div>
                <h2 className="mt-4 text-sm font-extrabold">{item.title}</h2>
                <p className={cn("mt-1 text-xs font-bold", active ? "text-white/35" : "text-black/35")}>{item.experienceLabel} · {item.mode}</p>
                <p className={cn("mt-3 text-xs leading-5", active ? "text-white/55" : "text-black/45")}>{item.shopperPrompt}</p>
                <div className={cn("mt-4 grid grid-cols-3 gap-2 text-center", active ? "text-white" : "text-ink")}>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{item.telemetry.views}</b><small className={active ? "text-white/35" : "text-black/35"}>Views</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{item.telemetry.completions}</b><small className={active ? "text-white/35" : "text-black/35"}>Done</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{item.telemetry.clicks}</b><small className={active ? "text-white/35" : "text-black/35"}>Clicks</small></span>
                </div>
              </button>
            );
          })}
        </aside>

        <main className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="border-b border-black/[0.06] bg-[radial-gradient(circle_at_85%_10%,rgba(217,255,97,.75),transparent_30%),linear-gradient(135deg,#f8f8f4,#ffffff)] p-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <span className={cn("inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider", statusTone[selected.status])}>{selected.statusLabel}</span>
                <h2 className="display mt-5 text-4xl">{selected.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">{selected.storefrontArea} · {selected.experienceLabel} · suggested prompt: “{selected.shopperPrompt}”</p>
              </div>
              <a href={selected.publicUrl} target="_blank" className="btn-primary shrink-0">Open preview <ExternalLink size={14} /></a>
            </div>
          </div>

          <div className="grid gap-6 p-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-2xl border border-black/[0.07]">
                <div className="flex h-11 items-center gap-1.5 border-b border-black/[0.06] bg-[#f8f8f4] px-4">
                  <i className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <i className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                  <i className="h-2.5 w-2.5 rounded-full bg-green-300" />
                  <span className="mx-auto rounded-full bg-white px-4 py-1 text-xs font-bold text-black/35">staging-store.example/{selected.placement}</span>
                </div>
                <div className="relative min-h-[560px] bg-[#f2f3ee] p-7">
                  <div className="rounded-[26px] bg-white p-7 shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-5">
                      <div><p className="text-xs font-extrabold">{settings.brand_name}</p><p className="mt-1 text-xs text-black/35">Desktop storefront QA preview</p></div>
                      <div className="flex gap-5 text-xs font-extrabold text-black/35"><span>Shop</span><span>Guides</span><span>Support</span></div>
                    </div>
                    <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_360px]">
                      <div>
                        <p className="eyebrow text-moss">{selected.storefrontArea}</p>
                        <h3 className="display mt-3 text-4xl">Find the product that fits before you buy.</h3>
                        <p className="mt-3 max-w-md text-sm leading-6 text-black/45">This sandbox shows where Sellentum appears, how the shopper opens it, and which events must arrive in Analytics.</p>
                        <div className="mt-6 grid grid-cols-3 gap-3">
                          {["Product card", "Buying guide", "Reviews"].map((label) => <div key={label} className="h-28 rounded-2xl bg-canvas p-4"><p className="text-xs font-extrabold text-black/40">{label}</p></div>)}
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-black/[0.07] bg-[#f8f8f4] p-4">
                        {selected.mode === "inline" ? (
                          <iframe src={selected.publicUrl} title={`${selected.title} inline preview`} className="h-[430px] w-full rounded-2xl border border-black/10 bg-white" />
                        ) : (
                          <div className="grid h-[430px] place-items-center rounded-2xl border border-dashed border-black/15 bg-white p-6 text-center">
                            <div>
                              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white" style={{ background: settings.primary_color }}><Sparkles size={20} /></span>
                              <h4 className="mt-4 text-sm font-extrabold">Modal launcher preview</h4>
                              <p className="mx-auto mt-2 max-w-xs text-xs leading-4 text-black/40">Clicking the storefront launcher should lazy-load this Sellentum iframe and record a widget_view with channel labels.</p>
                              <a href={selected.publicUrl} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold text-white" style={{ background: settings.primary_color }}>Open {selected.experienceLabel}<ExternalLink size={12} /></a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {selected.mode === "modal" && <button className="absolute bottom-11 right-11 flex items-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold text-white shadow-xl" style={{ background: settings.primary_color }}><Sparkles size={14} />{settings.button_text}</button>}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <div className="flex items-center justify-between">
                  <div><h3 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-moss" /> Exact snippet</h3><p className="mt-1 text-xs text-black/35">Paste into a staging storefront slot matching this placement.</p></div>
                  <button onClick={() => copy(selected.snippet, selected.id)} className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">{copied === selected.id ? <Check size={13} /> : <Clipboard size={13} />}{copied === selected.id ? "Copied" : "Copy"}</button>
                </div>
                <pre className="mt-5 max-h-[320px] overflow-auto rounded-2xl bg-ink p-5 text-xs leading-5 text-lime/80"><code>{selected.snippet}</code></pre>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] bg-ink p-5 text-white">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><MousePointerClick size={16} className="text-lime" /> Expected event contract</h3>
                <div className="mt-4 space-y-2">
                  {selected.expectedEvents.map((event) => (
                    <div key={event.event} className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-xs font-extrabold">{event.event}</p>
                      <p className="mt-1 text-xs leading-4 text-white/35">{event.purpose}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><PlayCircle size={16} className="text-moss" /> QA steps</h3>
                <div className="mt-4 space-y-2">
                  {selected.qaSteps.map((step, index) => <p key={step} className="flex gap-3 rounded-xl bg-canvas p-3 text-xs font-bold leading-4 text-black/45"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">{index + 1}</span>{step}</p>)}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Acceptance criteria</h3>
                <div className="mt-4 space-y-2">
                  {selected.acceptanceCriteria.map((criterion) => <p key={criterion} className="flex gap-2 text-xs font-bold leading-4 text-black/45"><Check size={13} className="mt-0.5 shrink-0 text-moss" />{criterion}</p>)}
                </div>
                {selected.risks.length ? <div className="mt-4 space-y-2">{selected.risks.map((risk) => <p key={risk} className="rounded-xl bg-amber-50 p-3 text-xs font-bold leading-4 text-amber-700">{risk}</p>)}</div> : <p className="mt-4 rounded-xl bg-lime/15 p-3 text-xs font-bold leading-4 text-moss">No sandbox risks detected for this placement.</p>}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
