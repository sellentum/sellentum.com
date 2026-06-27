"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, CheckCircle2, Clipboard, Code2, ExternalLink, Gauge, GitPullRequestArrow, Layers3, MessageCircle, PackagePlus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildExperienceRegistry, type ExperienceRegistryStatus } from "@/lib/experience-registry";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<ExperienceRegistryStatus, string> = {
  live: "bg-lime/35 text-moss",
  learning: "bg-blue-50 text-blue-700",
  ready: "bg-amber-50 text-amber-700",
  blocked: "bg-red-50 text-red-700",
};

const iconForExperience = {
  finder: MessageCircle,
  assistant: Bot,
  search: Search,
  configurator: PackagePlus,
};

export default function ExperiencesPage() {
  const { ready, settings, quizzes, configurators, events } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [copied, setCopied] = useState<"packet" | string>("");
  const report = useMemo(() => buildExperienceRegistry({ origin, settings, quizzes, configurators, events }), [origin, settings, quizzes, configurators, events]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Loading experience registry…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Experience Registry</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Operate every customer-facing discovery surface.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">One registry for finder, advisor, semantic search and configurator surfaces—public URLs, embed snippets, install QA, runtime telemetry and rollout readiness.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/release-center" className="btn-secondary"><GitPullRequestArrow size={14} /> Release center</Link>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy registry packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Layers3 size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase", report.status === "live" ? "bg-lime text-ink" : report.status === "learning" ? "bg-blue-400/20 text-blue-100" : report.status === "ready" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">Registry readiness across embed install checks, publish status and captured customer telemetry.</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.live}</p><p className="mt-1 text-[8px] text-white/35">Live</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.ready}</p><p className="mt-1 text-[8px] text-white/35">Ready</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.blocked}</p><p className="mt-1 text-[8px] text-white/35">Blocked</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.surfaces, "Surfaces", Layers3],
            [report.summary.totalViews, "Views", BarChart3],
            [report.summary.totalCompletions, "Completions", CheckCircle2],
            [report.summary.totalClicks, "Clicks", Gauge],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Layers3;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}</p>
                <p className="mt-1 text-[9px] font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
              </article>
            );
          })}
        </section>
      </div>

      {report.recommendedSurface && (
        <section className="mt-5 rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="eyebrow text-lime">Recommended rollout candidate</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.05em]">{report.recommendedSurface.label}: {report.recommendedSurface.name}</h2>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">{report.recommendedSurface.purpose}</p>
            </div>
            <Link href={report.recommendedSurface.publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">Open public URL <ExternalLink size={13} /></Link>
          </div>
        </section>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          {report.surfaces.map((surface) => {
            const Icon = iconForExperience[surface.experience];
            const snippetKey = `snippet-${surface.id}`;
            return (
              <section key={surface.id} className="rounded-[28px] border border-black/[0.07] bg-white p-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/35 text-moss"><Icon size={20} /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-extrabold">{surface.label}</h2>
                        <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", statusTone[surface.status])}>{surface.statusLabel}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-black/35">{surface.name} · {surface.mode} · {surface.targetPath}</p>
                      <p className="mt-2 max-w-2xl text-[10px] leading-4 text-black/45">{surface.purpose}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={surface.publicUrl} target="_blank" className="rounded-full border border-black/10 px-3 py-2 text-[10px] font-extrabold text-black/50 hover:bg-canvas">Open <ExternalLink size={10} className="inline" /></Link>
                    <button onClick={() => copy(surface.snippet, snippetKey)} className="rounded-full bg-ink px-3 py-2 text-[10px] font-extrabold text-white">{copied === snippetKey ? "Copied" : "Copy snippet"}</button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-6">
                  {[
                    [surface.metrics.views, "Views"],
                    [surface.metrics.starts, "Starts"],
                    [surface.metrics.completions, "Done"],
                    [surface.metrics.recommendations, "Recs"],
                    [surface.metrics.clicks, "Clicks"],
                    [`${surface.metrics.clickRate}%`, "Click rate"],
                  ].map(([value, label]) => (
                    <div key={`${surface.id}-${label}`} className="rounded-2xl bg-canvas p-4 text-center">
                      <p className="text-xl font-extrabold">{String(value)}</p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_340px]">
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={14} className="text-moss" /> QA checklist</p>
                    <div className="mt-3 grid gap-2 xl:grid-cols-2">
                      {surface.qa.slice(0, 6).map((check) => (
                        <div key={`${surface.id}-${check.id}`} className={cn("rounded-xl p-3", check.status === "pass" ? "bg-lime/20" : check.status === "warn" ? "bg-amber-50" : "bg-red-50")}>
                          <p className="text-[10px] font-extrabold">{check.label}</p>
                          <p className="mt-1 text-[9px] leading-4 text-black/40">{check.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link href={surface.nextAction.href} className="rounded-2xl bg-ink p-5 text-white transition hover:-translate-y-0.5">
                    <span className={cn("rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase", surface.nextAction.priority === "critical" ? "bg-red-400/20 text-red-100" : surface.nextAction.priority === "high" ? "bg-amber-300/20 text-amber-100" : "bg-lime/20 text-lime")}>{surface.nextAction.priority}</span>
                    <h3 className="mt-4 text-sm font-extrabold leading-5">{surface.nextAction.title}</h3>
                    <p className="mt-2 text-[10px] leading-4 text-white/45">{surface.nextAction.detail}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-extrabold text-lime">{surface.nextAction.label} <ArrowRight size={10} /></span>
                  </Link>
                </div>
              </section>
            );
          })}
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Registry action map</h2>
            <div className="mt-4 space-y-3">
              {report.surfaces.map((surface) => {
                const Icon = iconForExperience[surface.experience];
                return (
                  <Link key={`action-${surface.id}`} href={surface.nextAction.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                    <span>
                      <span className="block text-xs font-extrabold">{surface.nextAction.title}</span>
                      <span className="mt-1 block text-[10px] leading-4 text-black/40">{surface.label}: {surface.nextAction.detail}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-lime" /> Deployment packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Copy this when handing storefront implementation to yourself, a theme developer, an agency partner or a retailer.</p>
            <button onClick={() => copy(report.packet, "packet")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied === "packet" ? "Packet copied" : "Copy registry packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Useful next screens</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/channels", label: "Launch channels", detail: "Choose storefront placement strategy.", icon: Sparkles },
                { href: "/dashboard/storefront-sandbox", label: "Storefront QA", detail: "Run staging install checks.", icon: ShieldCheck },
                { href: "/dashboard/analytics", label: "Analytics", detail: "Compare live surface performance.", icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                  <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-black/40">{item.detail}</span></span>
                </Link>;
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
