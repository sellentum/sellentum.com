"use client";

import Link from "next/link";
import { BarChart3, BookOpenCheck, Boxes, Check, ChevronRight, CirclePlay, Eye, MousePointerClick, PackagePlus, Rocket, Search, Sparkles, TrendingUp, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { LoadingState } from "@/components/loading-state";

export default function DashboardOverview() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  if (!ready) return <LoadingState />;
  const counts = (type: string) => events.filter((event) => event.event_type === type).length;
  const views = counts("widget_view");
  const completions = counts("quiz_complete");
  const clicks = counts("buy_click");
  const published = quizzes.filter((quiz) => quiz.published).length;
  const liveConfigurators = configurators.filter((configurator) => configurator.published).length;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="animate-rise">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow text-moss">{today}</p><h1 className="display mt-2 text-4xl sm:text-5xl">Good evening, Alex.</h1><p className="mt-2 text-sm text-black/45">Here’s how {settings.brand_name} is helping shoppers choose.</p></div>
        <Link href="/dashboard/launch" className="btn-primary self-start"><Rocket size={15} className="text-lime" /> Launch a finder</Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Widget views", views, Eye, "+12.4%"], ["Quiz completions", completions, Check, "+8.1%"], ["Buy clicks", clicks, MousePointerClick, "+16.8%"], ["Completion rate", views ? `${Math.round(completions / views * 100)}%` : "0%", TrendingUp, "+3.2%"],
        ].map(([label, value, Icon, trend]) => { const MetricIcon = Icon as typeof Eye; return <div key={String(label)} className="rounded-2xl border border-black/[0.07] bg-white p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f3ed] text-moss"><MetricIcon size={17} /></span><span className="rounded-full bg-lime/35 px-2 py-1 text-[9px] font-extrabold text-moss">{String(trend)}</span></div><p className="mt-6 text-xs font-bold text-black/40">{String(label)}</p><p className="display mt-1 text-4xl">{String(value)}</p></div>; })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Performance</h2><p className="mt-1 text-xs text-black/35">Shopper activity over the last 14 days</p></div><select className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[10px] font-bold"><option>Last 14 days</option></select></div>
          <div className="mt-8 flex h-52 items-end gap-2 sm:gap-3">
            {[36, 52, 42, 61, 70, 49, 77, 64, 82, 58, 73, 89, 78, 96].map((height, index) => <div key={index} className="group flex h-full flex-1 items-end"><div style={{ height: `${height}%` }} className="relative w-full rounded-t-md bg-[#dfe6dc] transition group-hover:bg-lime"><div style={{ height: `${Math.max(16, height - 34)}%` }} className="absolute bottom-0 w-full rounded-t-md bg-moss" /></div></div>)}
          </div><div className="mt-3 flex justify-between text-[9px] font-bold text-black/25"><span>11 Jun</span><span>14 Jun</span><span>17 Jun</span><span>20 Jun</span><span>25 Jun</span></div>
          <div className="mt-5 flex gap-5 border-t border-black/5 pt-4 text-[10px] font-bold text-black/45"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-moss" /> Completed</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#dfe6dc]" /> Started</span></div>
        </section>

        <section className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Sparkles size={18} /></div><span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Quick start</span></div>
          <h2 className="display mt-7 text-3xl">Your launch checklist</h2><p className="mt-2 text-xs leading-5 text-white/45">The essentials for getting your first guided experience live.</p>
          <div className="mt-6 space-y-2">
            {[
              ["Add your products", products.length > 0, "/dashboard/products"],
              ["Enrich and generate", quizzes.some((q) => q.questions.length > 0), "/dashboard/launch"],
              ["Publish a finder", published > 0, "/dashboard/launch"],
              ["Install your widget", events.some((event) => event.event_type === "widget_view"), "/dashboard/launch"],
              ["Run launch preflight", products.length > 1 && published > 0, "/dashboard/preflight"],
            ].map(([label, done, href]) => <Link key={String(label)} href={String(href)} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-3 text-xs font-bold"><span className={`grid h-5 w-5 place-items-center rounded-full border ${done ? "border-lime bg-lime text-ink" : "border-white/20"}`}>{done && <Check size={11} />}</span><span className={done ? "text-white/45 line-through" : "text-white"}>{String(label)}</span><ChevronRight className="ml-auto text-white/25" size={14} /></Link>)}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Your product finders</h2><p className="mt-1 text-xs text-black/35">{published} live · {quizzes.length} total</p></div><Link href="/dashboard/quizzes" className="text-xs font-extrabold text-moss">View all</Link></div><div className="mt-5 space-y-2">{quizzes.slice(0, 2).map((quiz) => <Link href="/dashboard/quizzes" key={quiz.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3.5 hover:bg-canvas"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/40 text-moss"><BookOpenCheck size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{quiz.name}</span><span className="mt-1 block text-[10px] text-black/35">{quiz.questions.length} questions · {quiz.published ? "Published" : "Draft"}</span></span><CirclePlay size={16} className="text-black/25" /></Link>)}</div></section>
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Visual configurators</h2><p className="mt-1 text-xs text-black/35">{liveConfigurators} live · {configurators.length} total</p></div><Link href="/dashboard/configurators" className="text-xs font-extrabold text-moss">View all</Link></div><div className="mt-5 space-y-2">{configurators.slice(0, 2).map((configurator) => <Link href="/dashboard/configurators" key={configurator.id} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3.5 hover:bg-canvas"><span className="grid h-10 w-10 place-items-center rounded-xl bg-peach/55 text-moss"><PackagePlus size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{configurator.name}</span><span className="mt-1 block text-[10px] text-black/35">{configurator.steps.length} steps · {configurator.published ? "Published" : "Draft"}</span></span><CirclePlay size={16} className="text-black/25" /></Link>)}</div></section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Catalog health</h2><p className="mt-1 text-xs text-black/35">Keep your recommendations useful</p></div><Link href="/dashboard/products" className="text-xs font-extrabold text-moss">Manage</Link></div><div className="mt-6 flex items-center gap-5"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[8px] border-lime bg-white"><span className="display text-2xl">{Math.min(100, products.length ? 92 : 0)}</span></div><div className="space-y-2 text-xs"><p className="flex items-center gap-2 font-bold"><Boxes size={14} className="text-moss" /> {products.length} active products</p><p className="flex items-center gap-2 font-bold"><Upload size={14} className="text-moss" /> Catalog ready to recommend</p><p className="flex items-center gap-2 font-bold"><BarChart3 size={14} className="text-moss" /> {events.filter((e) => e.event_type === "product_recommended").length} recommendations served</p></div></div></section>
        <section className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Experience mix</h2><p className="mt-1 text-xs text-white/35">Finders, advisors, search and configurators share one catalog.</p></div><Sparkles className="text-lime" size={18} /></div><div className="mt-6 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{quizzes.length}</p><p className="mt-1 text-[9px] text-white/35">Finders</p></div><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">1</p><p className="mt-1 text-[9px] text-white/35">Advisor</p></div><Link href="/dashboard/search" className="rounded-xl bg-white/[.06] p-4 transition hover:bg-white/[.1]"><Search className="mx-auto text-lime" size={18} /><p className="mt-2 text-[9px] text-white/35">Search</p></Link><div className="rounded-xl bg-white/[.06] p-4"><p className="text-2xl font-extrabold">{configurators.length}</p><p className="mt-1 text-[9px] text-white/35">Configurators</p></div></div><Link href="/dashboard/settings" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-lime">Choose embed experience <ChevronRight size={13} /></Link></section>
      </div>
    </div>
  );
}
