"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Clipboard, Code2, ExternalLink, Globe2, LayoutDashboard, Megaphone, MousePointerClick, Rocket, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildLaunchChannelReport, type LaunchChannelStatus } from "@/lib/launch-channels";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<LaunchChannelStatus, string> = {
  blocked: "bg-red-50 text-red-700",
  ready: "bg-lime/35 text-moss",
  learning: "bg-blue-50 text-blue-700",
  live: "bg-ink text-lime",
};

const channelIcon = {
  "homepage-finder": LayoutDashboard,
  "category-inline-search": Search,
  "pdp-configurator": MousePointerClick,
  "support-advisor": Sparkles,
};

export default function LaunchChannelsPage() {
  const { ready, settings, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [selectedId, setSelectedId] = useState("homepage-finder");
  const [copied, setCopied] = useState<string | null>(null);
  const report = useMemo(() => buildLaunchChannelReport({ origin, settings, finders: quizzes, configurators, events }), [origin, settings, quizzes, configurators, events]);
  const selected = report.channels.find((channel) => channel.id === selectedId) || report.recommendedChannel || report.channels[0];

  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function copy(value: string, id: string) {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  }

  if (!ready) return <LoadingState label="Preparing launch channels…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Launch channels</p>
          <h1 className="display mt-2 text-5xl">Plan every storefront placement.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Package Findly experiences for homepage, category, PDP and help placements with attribution labels, install QA, launch snippets and early channel metrics.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/settings" className="btn-secondary"><Code2 size={14} /> Brand embed</Link>
          <Link href="/dashboard/launch" className="btn-primary"><Rocket size={14} className="text-lime" /> Launch Studio</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[320px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Megaphone size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", statusTone[report.status])}>{report.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{report.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">Channel readiness across install-ready snippets, attributed traffic and early conversion proof.</p>
          <button onClick={() => copy(report.packet, "packet")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-xs font-extrabold text-ink">
            {copied === "packet" ? <Check size={14} /> : <Clipboard size={14} />} {copied === "packet" ? "Packet copied" : "Copy channel packet"}
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-5">
          {[
            [report.summary.channels, "Channels", Globe2],
            [report.summary.installReady, "Install-ready", ShieldCheck],
            [report.summary.liveChannels, "Learning/live", BarChart3],
            [report.summary.totalViews, "Views", Megaphone],
            [report.summary.totalClicks, "Buy clicks", MousePointerClick],
          ].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof Globe2; return (
            <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
              <p className="display mt-5 text-4xl">{String(value)}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
            </article>
          ); })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[420px_1fr]">
        <aside className="space-y-3">
          {report.channels.map((channel) => {
            const Icon = channelIcon[channel.id as keyof typeof channelIcon] || Globe2;
            const active = channel.id === selected.id;
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedId(channel.id)}
                className={cn("w-full rounded-2xl border p-4 text-left transition", active ? "border-ink bg-ink text-white shadow-xl" : "border-black/[0.07] bg-white hover:-translate-y-0.5 hover:border-black/15")}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", active ? "bg-lime text-ink" : "bg-[#eef1e8] text-moss")}><Icon size={18} /></span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", active ? "bg-white/10 text-white/50" : statusTone[channel.status])}>{channel.statusLabel}</span>
                </div>
                <h2 className="mt-4 text-sm font-extrabold">{channel.name}</h2>
                <p className={cn("mt-1 text-[10px] font-bold", active ? "text-white/35" : "text-black/35")}>{channel.targetPages}</p>
                <p className={cn("mt-3 text-xs leading-5", active ? "text-white/55" : "text-black/45")}>{channel.reason}</p>
                <div className={cn("mt-4 grid grid-cols-3 gap-2 text-center text-xs", active ? "text-white" : "text-ink")}>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block">{channel.metrics.views}</b><small className={active ? "text-white/35" : "text-black/35"}>Views</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block">{channel.metrics.completions}</b><small className={active ? "text-white/35" : "text-black/35"}>Done</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block">{channel.metrics.clickRate}%</b><small className={active ? "text-white/35" : "text-black/35"}>Click</small></span>
                </div>
              </button>
            );
          })}
        </aside>

        <main className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="border-b border-black/[0.06] bg-[radial-gradient(circle_at_85%_10%,rgba(217,255,97,.75),transparent_30%),linear-gradient(135deg,#f8f8f4,#ffffff)] p-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <span className={cn("inline-flex rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider", statusTone[selected.status])}>{selected.statusLabel}</span>
                <h2 className="display mt-5 text-4xl">{selected.name}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">{selected.objective}</p>
              </div>
              <button onClick={() => copy(selected.snippet, selected.id)} className="btn-primary shrink-0">{copied === selected.id ? <Check size={15} /> : <Clipboard size={15} />} {copied === selected.id ? "Copied" : "Copy snippet"}</button>
            </div>
          </div>

          <div className="grid gap-6 p-8 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div><h3 className="text-sm font-extrabold">Install snippet</h3><p className="mt-1 text-xs text-black/35">Attribution labels are pre-filled for this channel.</p></div>
                  <a href={selected.publicUrl} target="_blank" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Preview <ExternalLink size={12} /></a>
                </div>
                <pre className="mt-5 max-h-[360px] overflow-auto rounded-2xl bg-ink p-5 text-[10px] leading-5 text-lime/80"><code>{selected.snippet}</code></pre>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="text-sm font-extrabold">Channel telemetry</h3>
                <div className="mt-5 grid grid-cols-6 gap-2 text-center">
                  {[
                    [selected.metrics.views, "Views"],
                    [selected.metrics.starts, "Starts"],
                    [selected.metrics.completions, "Done"],
                    [selected.metrics.recommendations, "Recs"],
                    [selected.metrics.clicks, "Clicks"],
                    [`${selected.metrics.clickRate}%`, "Click rate"],
                  ].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-canvas p-3"><p className="text-lg font-extrabold">{String(value)}</p><p className="mt-1 text-[8px] font-bold text-black/30">{String(label)}</p></div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="text-sm font-extrabold">Launch rationale</h3>
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {[
                    ["Audience", selected.audience],
                    ["Target pages", selected.targetPages],
                    ["Experience", `${selected.experience} · ${selected.mode}`],
                    ["Attribution", `source=${selected.source}, campaign=${selected.campaign}, placement=${selected.placement}`],
                  ].map(([label, detail]) => <div key={label} className="rounded-2xl bg-canvas p-4"><p className="text-[9px] font-extrabold uppercase tracking-wider text-black/30">{label}</p><p className="mt-2 text-xs font-bold leading-5 text-black/55">{detail}</p></div>)}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] bg-ink p-5 text-white">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><Rocket size={16} className="text-lime" /> Next channel action</h3>
                <span className={cn("mt-4 inline-flex rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", selected.nextAction.priority === "critical" || selected.nextAction.priority === "high" ? "bg-red-400/20 text-red-100" : selected.nextAction.priority === "medium" ? "bg-amber-300/20 text-amber-100" : "bg-lime text-ink")}>{selected.nextAction.priority}</span>
                <h4 className="mt-4 text-lg font-extrabold leading-tight">{selected.nextAction.title}</h4>
                <p className="mt-2 text-xs leading-5 text-white/45">{selected.nextAction.detail}</p>
                <Link href={selected.nextAction.href} className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-lime">{selected.nextAction.label} <ArrowRight size={12} /></Link>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Channel QA</h3>
                <div className="mt-4 space-y-2">
                  {selected.qa.map((item) => (
                    <div key={item.id} className={cn("rounded-xl p-3", item.status === "pass" ? "bg-lime/15" : item.status === "warn" ? "bg-amber-50" : "bg-red-50")}>
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", item.status === "pass" ? "bg-lime text-ink" : item.status === "warn" ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-600")}>{item.status === "pass" ? <Check size={11} /> : "!"}</span>
                        <span><span className="block text-[10px] font-extrabold">{item.label}</span><span className="mt-0.5 block text-[8px] font-bold leading-3 text-black/40">{item.detail}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-5">
                <h3 className="text-sm font-extrabold">Why channels matter</h3>
                <p className="mt-2 text-xs leading-5 text-black/45">One generic widget snippet can prove the demo. Channelized snippets prove the SaaS: each placement gets its own attribution, QA trail and optimization loop.</p>
                <Link href="/dashboard/analytics" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Compare channel performance <ArrowRight size={12} /></Link>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
