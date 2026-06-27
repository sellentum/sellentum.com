"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpenCheck, Bot, BrainCircuit, Check, ChevronRight, CirclePlay, Eye, GitBranch, GitPullRequestArrow, Globe2, Handshake, Layers3, LayoutTemplate, Megaphone, MessageCircle, MousePointerClick, PackagePlus, Rocket, ShieldCheck, Sparkles, Target, Wrench } from "lucide-react";
import { useStore } from "@/lib/store";
import { LoadingState } from "@/components/loading-state";
import { buildDashboardCommandCenter } from "@/lib/dashboard-command-center";
import { buildConversionPlaybook } from "@/lib/conversion-playbook";

export default function DashboardOverview() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const commandCenter = useMemo(() => buildDashboardCommandCenter({ products, quizzes, configurators, events, settings }), [products, quizzes, configurators, events, settings]);
  const conversionPlaybook = useMemo(() => buildConversionPlaybook({ products, quizzes, configurators, events, settings }), [products, quizzes, configurators, events, settings]);
  if (!ready) return <LoadingState />;
  const { snapshot, trends } = commandCenter;
  const views = snapshot.widget_view;
  const completions = snapshot.quiz_complete;
  const clicks = snapshot.buy_click;
  const published = commandCenter.summary.publishedFinders;
  const liveConfigurators = commandCenter.summary.publishedConfigurators;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const metricCards: Array<{ label: string; value: string | number; icon: typeof Eye; trend?: typeof trends.widget_view; badge?: string }> = [
    { label: "Widget views", value: views, icon: Eye, trend: trends.widget_view },
    { label: "Completed journeys", value: completions, icon: Check, trend: trends.quiz_complete },
    { label: "Buy clicks", value: clicks, icon: MousePointerClick, trend: trends.buy_click },
    { label: "Launch score", value: `${commandCenter.launchScore}%`, icon: Rocket, badge: commandCenter.launchLabel },
  ];

  return (
    <div className="animate-rise">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow text-moss">{today}</p><h1 className="display mt-2 text-4xl sm:text-5xl">Good evening, Alex.</h1><p className="mt-2 text-sm text-black/45">Here’s how {settings.brand_name} is helping shoppers choose.</p></div>
        <div className="flex flex-wrap justify-end gap-3">
          <Link href="/dashboard/templates" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><LayoutTemplate size={15} className="text-moss" /> Use a template</Link>
          <Link href="/dashboard/attributes" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Layers3 size={15} className="text-moss" /> Attributes</Link>
          <Link href="/dashboard/vocabulary" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><MessageCircle size={15} className="text-moss" /> Vocabulary</Link>
          <Link href="/dashboard/decision-graph" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><BrainCircuit size={15} className="text-moss" /> Decision graph</Link>
          <Link href="/dashboard/flow-studio" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><GitBranch size={15} className="text-moss" /> Flow Studio</Link>
          <Link href="/dashboard/advisor" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Bot size={15} className="text-moss" /> Advisor</Link>
          <Link href="/dashboard/channels" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Megaphone size={15} className="text-moss" /> Channels</Link>
          <Link href="/dashboard/syndication" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Handshake size={15} className="text-moss" /> Syndication</Link>
          <Link href="/dashboard/storefront-sandbox" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Globe2 size={15} className="text-moss" /> Storefront QA</Link>
          <Link href="/dashboard/release-center" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><GitPullRequestArrow size={15} className="text-moss" /> Release</Link>
          <Link href="/dashboard/trust-center" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><ShieldCheck size={15} className="text-moss" /> AI Trust</Link>
          <Link href="/dashboard/workspace-snapshot" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Archive size={15} className="text-moss" /> Snapshot</Link>
          <Link href="/dashboard/experiments" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:-translate-y-0.5"><Target size={15} className="text-moss" /> Experiments</Link>
          <Link href="/dashboard/launch" className="btn-primary self-start"><Rocket size={15} className="text-lime" /> Launch a finder</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const MetricIcon = metric.icon;
          const trend = metric.trend;
          const direction = trend?.direction || "flat";
          return <div key={metric.label} className="rounded-2xl border border-black/[0.07] bg-white p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f3ed] text-moss"><MetricIcon size={17} /></span>{trend ? <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold ${direction === "down" ? "bg-red-50 text-red-600" : direction === "flat" ? "bg-black/5 text-black/35" : "bg-lime/35 text-moss"}`}>{direction === "down" ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}{trend.label}</span> : <span className="rounded-full bg-lime/35 px-2 py-1 text-[9px] font-extrabold text-moss">{metric.badge}</span>}</div><p className="mt-6 text-xs font-bold text-black/40">{metric.label}</p><p className="display mt-1 text-4xl">{String(metric.value)}</p>{trend && <p className="mt-1 text-[9px] font-bold text-black/25">Previous 14 days: {trend.previous}</p>}</div>;
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Performance</h2><p className="mt-1 text-xs text-black/35">Real shopper activity over the last 14 days</p></div><span className="rounded-full bg-lime/35 px-3 py-1.5 text-[9px] font-extrabold text-moss">Live data</span></div>
          <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3">
            {commandCenter.performance.map((day) => <div key={day.label} className="group flex h-full flex-1 flex-col justify-end"><div className="relative flex flex-1 items-end"><div style={{ height: `${Math.max(5, day.views / commandCenter.maxPerformance * 100)}%` }} className="relative w-full rounded-t-md bg-[#dfe6dc] transition group-hover:bg-lime/50"><div style={{ height: `${Math.max(2, day.completions / commandCenter.maxPerformance * 100)}%` }} className="absolute bottom-0 w-full rounded-t-md bg-moss" /></div></div><span className="mt-2 hidden text-center text-[8px] font-bold text-black/25 sm:block">{day.label.split(" ")[0]}</span></div>)}
          </div><div className="mt-3 flex justify-between text-[9px] font-bold text-black/25"><span>{commandCenter.performance[0]?.label || "Start"}</span><span>{commandCenter.performance[Math.floor(commandCenter.performance.length / 2)]?.label || "Mid"}</span><span>{commandCenter.performance.at(-1)?.label || "Today"}</span></div>
          <div className="mt-5 flex gap-5 border-t border-black/5 pt-4 text-[10px] font-bold text-black/45"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-moss" /> Completed</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#dfe6dc]" /> Views</span></div>
        </section>

        <section className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Sparkles size={18} /></div><span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Quick start</span></div>
          <h2 className="display mt-7 text-3xl">Your launch checklist</h2><p className="mt-2 text-xs leading-5 text-white/45">The essentials for getting your first guided experience live.</p>
          <div className="mt-6 space-y-2">
            {commandCenter.milestones.map((item) => <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-3 text-xs font-bold"><span className={`grid h-5 w-5 place-items-center rounded-full border ${item.done ? "border-lime bg-lime text-ink" : "border-white/20"}`}>{item.done && <Check size={11} />}</span><span className={item.done ? "text-white/45 line-through" : "text-white"}>{item.label}</span><ChevronRight className="ml-auto text-white/25" size={14} /></Link>)}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Your product finders</h2><p className="mt-1 text-xs text-black/35">{published} live · {quizzes.length} total</p></div><Link href="/dashboard/quizzes" className="text-xs font-extrabold text-moss">View all</Link></div><div className="mt-5 space-y-2">{quizzes.slice(0, 2).map((quiz) => <Link href="/dashboard/quizzes" key={quiz.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3.5 hover:bg-canvas"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/40 text-moss"><BookOpenCheck size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{quiz.name}</span><span className="mt-1 block text-[10px] text-black/35">{quiz.questions.length} questions · {quiz.published ? "Published" : "Draft"}</span></span><CirclePlay size={16} className="text-black/25" /></Link>)}</div></section>
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Visual configurators</h2><p className="mt-1 text-xs text-black/35">{liveConfigurators} live · {configurators.length} total</p></div><Link href="/dashboard/configurators" className="text-xs font-extrabold text-moss">View all</Link></div><div className="mt-5 space-y-2">{configurators.slice(0, 2).map((configurator) => <Link href="/dashboard/configurators" key={configurator.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3.5 hover:bg-canvas"><span className="grid h-10 w-10 place-items-center rounded-xl bg-peach/55 text-moss"><PackagePlus size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{configurator.name}</span><span className="mt-1 block text-[10px] text-black/35">{configurator.steps.length} steps · {configurator.published ? "Published" : "Draft"}</span></span><CirclePlay size={16} className="text-black/25" /></Link>)}</div></section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-extrabold"><Wrench size={15} className="text-moss" /> Command queue</h2><p className="mt-1 text-xs text-black/35">The next highest-leverage fixes from catalog, QA and analytics.</p></div><Link href="/dashboard/preflight" className="text-xs font-extrabold text-moss">Preflight</Link></div>
          <div className="mt-5 space-y-2">
            {commandCenter.actions.slice(0, 3).map((action) => <Link key={action.id} href={action.href} className="flex items-start gap-3 rounded-xl border border-black/[0.07] p-3.5 hover:bg-canvas"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${action.priority === "critical" ? "bg-red-50 text-red-600" : action.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss"}`}>{action.priority === "critical" ? <AlertTriangle size={15} /> : <ChevronRight size={15} />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold">{action.title}</span><span className="mt-1 block text-[10px] leading-4 text-black/35">{action.detail}</span></span><span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-1 text-[8px] font-extrabold uppercase text-black/35">{action.label}</span></Link>)}
            {!commandCenter.actions.length && <div className="rounded-xl border border-lime/40 bg-lime/10 p-4"><p className="flex items-center gap-2 text-xs font-extrabold text-moss"><Check size={14} /> No urgent launch actions</p><p className="mt-1 text-[10px] leading-4 text-black/40">Keep collecting sessions and rerun preflight before the next campaign.</p></div>}
          </div>
        </section>
        <section className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Experience mix</h2><p className="mt-1 text-xs text-white/35">Actual event mix across every embedded surface.</p></div><Sparkles className="text-lime" size={18} /></div><div className="mt-6 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{commandCenter.experienceMix.finder}</p><p className="mt-1 text-[9px] text-white/35">Finder</p></div><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{commandCenter.experienceMix.assistant}</p><p className="mt-1 text-[9px] text-white/35">Advisor</p></div><Link href="/dashboard/search" className="rounded-xl bg-white/[.06] p-4 transition hover:bg-white/[.1]"><p className="text-2xl font-extrabold">{commandCenter.experienceMix.search}</p><p className="mt-1 text-[9px] text-white/35">Search</p></Link><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{commandCenter.experienceMix.configurator}</p><p className="mt-1 text-[9px] text-white/35">Config</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-white/[.06] p-3"><p className="text-lg font-extrabold">{commandCenter.catalogScore}%</p><p className="mt-1 text-[8px] text-white/35">Catalog</p></div><div className="rounded-xl bg-white/[.06] p-3"><p className="text-lg font-extrabold">{commandCenter.discoveryScore}</p><p className="mt-1 text-[8px] text-white/35">Gap score</p></div><div className="rounded-xl bg-white/[.06] p-3"><p className="text-lg font-extrabold">{commandCenter.summary.recommendationQaScore}%</p><p className="mt-1 text-[8px] text-white/35">QA</p></div></div><Link href="/dashboard/settings" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-lime">Choose embed experience <ChevronRight size={13} /></Link></section>
      </div>

      <section className="mt-5 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Sparkles size={15} className="text-moss" /> Conversion playbook</h2>
            <p className="mt-1 text-xs text-black/35">Deterministic next steps from analytics quality, funnel rates, discovery gaps and product demand.</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase ${conversionPlaybook.status === "blocked" ? "bg-red-50 text-red-700" : conversionPlaybook.status === "watch" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss"}`}>{conversionPlaybook.score}% · {conversionPlaybook.status}</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl bg-ink p-5 text-white">
            <p className="eyebrow text-lime">Next optimization loop</p>
            <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-.045em]">{conversionPlaybook.headline}</h3>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{conversionPlaybook.summary.startRate}%</p><p className="mt-1 text-[8px] text-white/35">Start</p></div>
              <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{conversionPlaybook.summary.completionRate}%</p><p className="mt-1 text-[8px] text-white/35">Done</p></div>
              <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{conversionPlaybook.summary.clickRate}%</p><p className="mt-1 text-[8px] text-white/35">Click</p></div>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {conversionPlaybook.actions.slice(0, 3).map((action) => (
              <Link key={action.id} href={action.href} className="rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-4 transition hover:-translate-y-0.5 hover:bg-white">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${action.priority === "critical" ? "bg-red-100 text-red-700" : action.priority === "high" ? "bg-orange-100 text-orange-700" : action.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-lime/40 text-moss"}`}>{action.priority}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{action.metricLabel}: {action.metricValue}</span>
                </div>
                <h3 className="mt-4 text-xs font-extrabold leading-5">{action.title}</h3>
                <p className="mt-2 text-[10px] leading-4 text-black/40">{action.detail}</p>
                <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[9px] font-bold leading-4 text-black/45">{action.evidence}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-extrabold text-moss">{action.cta}<ArrowRight size={10} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
