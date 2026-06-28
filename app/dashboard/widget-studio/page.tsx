"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Clipboard, Code2, ExternalLink, Gauge, Globe2, MousePointerClick, RadioTower, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { buildWidgetStudioReport, type WidgetStudioStatus } from "@/lib/widget-studio";

const statusTone: Record<WidgetStudioStatus, string> = {
  ready: "bg-lime/35 text-moss",
  watch: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const checkTone = {
  pass: "bg-lime/25 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone = {
  critical: "bg-red-400/20 text-red-100",
  high: "bg-amber-300/20 text-amber-100",
  medium: "bg-lime/20 text-lime",
  low: "bg-white/[0.08] text-white/55",
};

export default function WidgetStudioPage() {
  const { ready, settings, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [copied, setCopied] = useState("");
  const report = useMemo(() => buildWidgetStudioReport({ origin, settings, quizzes, configurators, events }), [origin, settings, quizzes, configurators, events]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Loading widget studio…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Widget Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Launch every guided experience with copy-paste storefront snippets.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Centralize modal and inline embeds for finder, advisor, semantic search and configurator experiences—complete with install contracts, attribution labels, QA checks and developer handoff packets.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/storefront-sandbox" className="btn-secondary"><Globe2 size={14} /> Storefront QA</Link>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy widget packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Code2 size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "watch" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">Widget readiness across published IDs, modal/inline snippets, attribution, branding and storefront telemetry proof.</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.installable}</p><p className="mt-1 text-xs text-white/35">Installable</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.modalSnippets}</p><p className="mt-1 text-xs text-white/35">Modal</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.inlineSnippets}</p><p className="mt-1 text-xs text-white/35">Inline</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.totalViews, "Widget views", BarChart3],
            [report.summary.totalStarts, "Starts", Rocket],
            [report.summary.totalCompletions, "Completed", CheckCircle2],
            [report.summary.totalClicks, "Buy clicks", MousePointerClick],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof BarChart3;
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

      {report.recommendedExperience && (
        <section className="mt-5 rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow text-lime">Recommended storefront install</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">{report.recommendedExperience.label}: {report.recommendedExperience.name}</h2>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">{report.recommendedExperience.bestPlacement}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={report.recommendedExperience.publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-extrabold text-white/70">Open URL <ExternalLink size={13} /></Link>
              <button onClick={() => copy(report.recommendedExperience!.modalSnippet, "recommended-modal")} className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied === "recommended-modal" ? "Copied" : "Copy modal"} <Clipboard size={13} /></button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Embeddable experiences</h2>
                <p className="mt-1 text-xs text-black/35">Each surface gets a modal launcher and inline iframe snippet from the same install contract.</p>
              </div>
              <span className="rounded-full bg-lime/35 px-3 py-1.5 text-xs font-extrabold text-moss">{report.summary.experiences} surfaces</span>
            </div>
            <div className="mt-5 space-y-4">
              {report.experiences.map((experience) => (
                <article key={experience.id} className="rounded-[24px] border border-black/[0.07] bg-canvas p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold">{experience.label}</h3>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", statusTone[experience.readiness])}>{experience.readinessLabel}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/35">{experience.name} · {experience.targetPath}</p>
                      <p className="mt-2 max-w-3xl text-xs leading-4 text-black/45">{experience.purpose}</p>
                    </div>
                    <Link href={experience.publicUrl} target="_blank" className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-black/50">Preview <ExternalLink size={10} className="inline" /></Link>
                  </div>

                  <div className="mt-5 grid gap-3 xl:grid-cols-6">
                    {[
                      [experience.metrics.views, "Views"],
                      [experience.metrics.starts, "Starts"],
                      [experience.metrics.completions, "Done"],
                      [experience.metrics.recommendations, "Recs"],
                      [experience.metrics.clicks, "Clicks"],
                      [`${experience.metrics.clickRate}%`, "Click rate"],
                    ].map(([value, label]) => (
                      <div key={`${experience.id}-${label}`} className="rounded-2xl bg-white p-4 text-center">
                        <p className="text-xl font-extrabold">{String(value)}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl bg-ink p-4 text-white">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-xs font-extrabold"><Code2 size={14} className="text-lime" /> Modal snippet</p>
                        <button onClick={() => copy(experience.modalSnippet, `${experience.id}-modal`)} className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">{copied === `${experience.id}-modal` ? "Copied" : "Copy"}</button>
                      </div>
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/20 p-3 text-xs leading-4 text-white/55">{experience.modalSnippet}</pre>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-xs font-extrabold"><Code2 size={14} className="text-moss" /> Inline snippet</p>
                        <button onClick={() => copy(experience.inlineSnippet, `${experience.id}-inline`)} className="rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">{copied === `${experience.id}-inline` ? "Copied" : "Copy"}</button>
                      </div>
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-canvas p-3 text-xs leading-4 text-black/45">{experience.inlineSnippet}</pre>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 xl:grid-cols-4">
                    {experience.qa.map((item) => (
                      <div key={`${experience.id}-${item.id}`} className={cn("rounded-2xl p-3", checkTone[item.status])}>
                        <p className="text-xs font-extrabold">{item.label}</p>
                        <p className="mt-1 text-xs leading-4 opacity-70">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold">Install contract</h2>
                <p className="mt-1 text-xs text-black/35">The required script attributes your theme developer needs to preserve.</p>
              </div>
              <button onClick={() => copy(report.packet, "contract")} className="rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-white">{copied === "contract" ? "Packet copied" : "Copy widget packet"}</button>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {report.installContract.map((field) => (
                <div key={field.attribute} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold">{field.attribute}</p>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", field.required ? "bg-ink text-white" : "bg-white text-black/35")}>{field.required ? "required" : "optional"}</span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-moss">{field.example}</p>
                  <p className="mt-2 text-xs leading-4 text-black/40">{field.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Install QA checks</h2>
            <div className="mt-4 space-y-2">
              {report.qaChecks.map((item) => (
                <div key={item.id} className={cn("rounded-2xl p-4", checkTone[item.status])}>
                  <p className="text-xs font-extrabold">{item.label}</p>
                  <p className="mt-1 text-xs leading-4 opacity-70">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Gauge size={16} className="text-lime" /> Action queue</h2>
            <div className="mt-4 space-y-2">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-white/[0.06] p-4 transition hover:bg-white/[0.1]">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-1 text-xs leading-4 text-white/45">{action.detail}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">{action.label}<ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Analytics event contract</h2>
            <div className="mt-4 space-y-2">
              {report.eventContract.map((event) => (
                <div key={event.event} className="rounded-2xl bg-canvas p-4">
                  <p className="text-xs font-extrabold">{event.event}</p>
                  <p className="mt-1 text-xs leading-4 text-black/40">{event.when}</p>
                  <p className="mt-2 text-xs font-bold text-moss">{event.requiredMetadata.join(" · ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Useful next screens</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/experiences", label: "Experience Registry", detail: "Check public URLs and runtime status.", icon: Sparkles },
                { href: "/dashboard/channels", label: "Launch channels", detail: "Package snippets by storefront placement.", icon: Globe2 },
                { href: "/dashboard/operations", label: "Runtime Ops", detail: "Monitor endpoint and telemetry health.", icon: RadioTower },
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
