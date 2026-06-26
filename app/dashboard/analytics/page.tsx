"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Check, ChevronDown, Clock3, Eye, GitBranch, ListChecks, MessageCircle, MousePointerClick, PackagePlus, Search, Sparkles, Tags, Trophy, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import type { ExperienceType } from "@/lib/types";
import { buildAnalyticsSnapshot, buildAnalyticsTrends, buildFunnelDiagnosis, countAnalyticsEvents, getAnalyticsPeriods, stageRate } from "@/lib/analytics";
import { buildZeroPartyInsights } from "@/lib/insights";
import { buildShopperJourneyReport } from "@/lib/journey-insights";
import { filterEventsByExperience, formatCurrency, getEventExperienceType } from "@/lib/utils";

type ExperienceFilter = ExperienceType | "all";

const experienceLabels: Record<ExperienceFilter, string> = {
  all: "All experiences",
  finder: "Product finders",
  assistant: "AI advisor",
  search: "Semantic search",
  configurator: "Configurators",
};

const experienceOptions: Array<{ value: ExperienceFilter; icon: typeof Sparkles }> = [
  { value: "all", icon: Sparkles },
  { value: "finder", icon: Sparkles },
  { value: "assistant", icon: MessageCircle },
  { value: "search", icon: Search },
  { value: "configurator", icon: PackagePlus },
];

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function AnalyticsPage() {
  const { ready, events, products, quizzes, configurators } = useStore();
  const [range, setRange] = useState("14 days");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>("all");
  const rangeDays = Number.parseInt(range, 10) || 14;

  const periodEvents = useMemo(() => getAnalyticsPeriods(events, rangeDays), [events, rangeDays]);
  const eventsInRange = periodEvents.current;
  const filteredEvents = useMemo(() => filterEventsByExperience(eventsInRange, experienceFilter), [eventsInRange, experienceFilter]);
  const previousFilteredEvents = useMemo(() => filterEventsByExperience(periodEvents.previous, experienceFilter), [periodEvents.previous, experienceFilter]);

  const sessionStats = useMemo(() => buildAnalyticsSnapshot(filteredEvents), [filteredEvents]);
  const trends = useMemo(() => buildAnalyticsTrends(filteredEvents, previousFilteredEvents), [filteredEvents, previousFilteredEvents]);
  const funnelDiagnosis = useMemo(() => buildFunnelDiagnosis(sessionStats), [sessionStats]);
  const views = sessionStats.widget_view;
  const starts = sessionStats.quiz_start;
  const completions = sessionStats.quiz_complete;
  const clicks = sessionStats.buy_click;
  const recommended = sessionStats.product_recommended;

  const experienceStats = useMemo(() => (["finder", "assistant", "search", "configurator"] as ExperienceType[]).map((type) => {
    const scoped = eventsInRange.filter((event) => getEventExperienceType(event) === type);
    return {
      type,
      views: countAnalyticsEvents(scoped, "widget_view"),
      starts: countAnalyticsEvents(scoped, "quiz_start"),
      completions: countAnalyticsEvents(scoped, "quiz_complete"),
      clicks: countAnalyticsEvents(scoped, "buy_click"),
    };
  }), [eventsInRange]);

  const productStats = useMemo(() => products.map((product) => {
    const productEvents = filteredEvents.filter((event) => event.product_id === product.id);
    const productRecommended = countAnalyticsEvents(productEvents, "product_recommended");
    const productClicks = countAnalyticsEvents(productEvents, "buy_click");
    return { product, recommended: productRecommended, clicks: productClicks };
  }).sort((a, b) => b.recommended - a.recommended || b.clicks - a.clicks || a.product.name.localeCompare(b.product.name)), [products, filteredEvents]);

  const zeroPartyInsights = useMemo(() => buildZeroPartyInsights(filteredEvents, products), [filteredEvents, products]);
  const journeyReport = useMemo(() => buildShopperJourneyReport(filteredEvents, products), [filteredEvents, products]);

  const byDay = useMemo(() => Array.from({ length: rangeDays }, (_, reverseIndex) => {
    const offset = rangeDays - 1 - reverseIndex;
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayEvents = filteredEvents.filter((event) => {
      const date = new Date(event.created_at);
      return date >= day && date < next;
    });
    return {
      label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      views: countAnalyticsEvents(dayEvents, "widget_view"),
      completions: countAnalyticsEvents(dayEvents, "quiz_complete"),
    };
  }), [filteredEvents, rangeDays]);

  const max = Math.max(1, ...byDay.map((day) => day.views));
  const activeExperienceLabel = experienceLabels[experienceFilter];
  const funnelStages = [
    ["Viewed widget", sessionStats.viewed, sessionStats.sessions ? stageRate(sessionStats.viewed, sessionStats.sessions) : 0],
    ["Started journey", sessionStats.started, stageRate(sessionStats.started, sessionStats.viewed)],
    ["Got a result", sessionStats.completed, stageRate(sessionStats.completed, sessionStats.started)],
    ["Clicked to buy", sessionStats.clicked, stageRate(sessionStats.clicked, sessionStats.completed)],
  ] as const;

  if (!ready) return <LoadingState label="Crunching your numbers…" />;

  return (
    <div className="animate-rise">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow text-moss">Insights</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Analytics</h1>
          <p className="mt-2 text-sm text-black/45">See how each guided experience moves shoppers from uncertainty to buying intent.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select value={range} onChange={(event) => setRange(event.target.value)} className="appearance-none rounded-full border border-black/10 bg-white py-2.5 pl-4 pr-10 text-xs font-extrabold">
              <option>7 days</option>
              <option>14 days</option>
              <option>30 days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/30" size={13} />
          </div>
          <div className="flex rounded-full border border-black/10 bg-white p-1">
            {experienceOptions.map(({ value, icon: Icon }) => (
              <button key={value} onClick={() => setExperienceFilter(value)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-extrabold transition ${experienceFilter === value ? "bg-ink text-white" : "text-black/45 hover:text-ink"}`}>
                <Icon size={12} className={experienceFilter === value ? "text-lime" : ""} />
                {experienceLabels[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Sessions", sessionStats.sessions, UsersRound, trends.sessions],
          ["Widget views", views, Eye, trends.widget_view],
          ["Experience starts", starts, Sparkles, trends.quiz_start],
          ["Completed journeys", completions, Check, trends.quiz_complete],
          ["Products surfaced", recommended, Trophy, trends.product_recommended],
          ["Buy button clicks", clicks, MousePointerClick, trends.buy_click],
        ].map(([label, value, Icon, trend]) => {
          const MetricIcon = Icon as typeof Eye;
          const metricTrend = trend as typeof trends.sessions;
          return (
            <div key={String(label)} className="rounded-2xl border border-black/[0.07] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0f2ec] text-moss"><MetricIcon size={17} /></span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold ${metricTrend.direction === "down" ? "bg-red-50 text-red-600" : metricTrend.direction === "flat" ? "bg-black/5 text-black/35" : "bg-lime/35 text-moss"}`}>{metricTrend.direction === "down" ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}{metricTrend.label}</span>
              </div>
              <p className="mt-6 text-xs font-bold text-black/40">{String(label)}</p>
              <p className="display mt-1 text-4xl">{String(value)}</p>
              <p className="mt-1 text-[9px] font-bold text-black/25">Previous {range.toLowerCase()}: {metricTrend.previous}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.82fr]">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Experience mix</h2><p className="mt-1 text-[10px] text-black/35">Breakdown across finder, advisor and configurator journeys</p></div>
            <span className="rounded-full bg-lime/35 px-3 py-1.5 text-[9px] font-extrabold text-moss">{range}</span>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {experienceStats.map((stat) => {
              const active = experienceFilter === stat.type;
              const Icon = stat.type === "assistant" ? MessageCircle : stat.type === "configurator" ? PackagePlus : Sparkles;
              const total = stat.views + stat.starts + stat.completions + stat.clicks;
              return (
                <button key={stat.type} onClick={() => setExperienceFilter(stat.type)} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${active ? "border-ink bg-ink text-white shadow-lg" : "border-black/10 bg-[#f7f8f4] hover:bg-white"}`}>
                  <div className="flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-lime text-ink" : "bg-lime/45 text-moss"}`}><Icon size={18} /></span><span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${active ? "bg-white/10 text-lime" : "bg-white text-black/35"}`}>{total} events</span></div>
                  <h3 className="mt-6 text-lg font-extrabold tracking-[-.04em]">{experienceLabels[stat.type]}</h3>
                  <div className={`mt-4 grid grid-cols-3 gap-2 text-center ${active ? "text-white" : "text-ink"}`}>
                    <span className={`rounded-xl p-2 ${active ? "bg-white/[.06]" : "bg-white"}`}><b className="block text-sm">{stat.views}</b><i className="not-italic text-[8px] opacity-45">Views</i></span>
                    <span className={`rounded-xl p-2 ${active ? "bg-white/[.06]" : "bg-white"}`}><b className="block text-sm">{stat.completions}</b><i className="not-italic text-[8px] opacity-45">Done</i></span>
                    <span className={`rounded-xl p-2 ${active ? "bg-white/[.06]" : "bg-white"}`}><b className="block text-sm">{stat.clicks}</b><i className="not-italic text-[8px] opacity-45">Clicks</i></span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><Trophy size={18} /></div><span className="text-[9px] font-extrabold uppercase tracking-wider text-lime">{activeExperienceLabel}</span></div>
          <h2 className="display mt-6 text-3xl">From curiosity to click</h2>
          <div className="mt-6 space-y-4">
            {funnelStages.map(([label, value, percent]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-[10px] font-bold"><span className="text-white/55">{String(label)}</span><span>{String(value)} <i className="ml-1 not-italic text-white/30">{Math.round(Number(percent))}%</i></span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, Number(percent))}%` }} /></div>
              </div>
            ))}
          </div>
          <div className={`mt-6 rounded-xl p-3 ${funnelDiagnosis.severity === "empty" ? "bg-white/[0.06]" : funnelDiagnosis.severity === "watch" ? "bg-amber-300/10" : "bg-lime/10"}`}>
            <p className="text-[10px] font-extrabold text-white">{funnelDiagnosis.title}</p>
            <p className="mt-1 text-[10px] leading-4 text-white/45">{funnelDiagnosis.detail}</p>
            <p className="mt-2 text-[10px] leading-4 text-lime">{funnelDiagnosis.recommendation}</p>
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div><h2 className="text-sm font-extrabold">Activity trend</h2><p className="mt-1 text-[10px] text-black/35">Views and completed journeys for {activeExperienceLabel.toLowerCase()}</p></div>
          <div className="flex gap-4 text-[9px] font-bold text-black/40"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#dfe6dc]" /> Views</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-moss" /> Completed</span></div>
        </div>
        <div className="mt-8 flex h-60 items-end gap-2">
          {byDay.map((day) => (
            <div key={day.label} className="group flex h-full flex-1 flex-col justify-end">
              <div className="relative flex flex-1 items-end">
                <div className="w-full rounded-t bg-[#dfe6dc] transition group-hover:bg-lime/50" style={{ height: `${Math.max(5, day.views / max * 100)}%` }}>
                  <div className="absolute bottom-0 w-full rounded-t bg-moss" style={{ height: `${Math.max(2, day.completions / max * 100)}%` }} />
                </div>
              </div>
              <span className="mt-2 hidden text-center text-[8px] font-bold text-black/25 sm:block">{day.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
        <div className="rounded-2xl border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink"><GitBranch size={18} /></div>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase text-white/55">{journeyReport.summary.sessions} sessions</span>
          </div>
          <h2 className="display mt-6 text-3xl">Shopper journey replay</h2>
          <p className="mt-2 text-xs leading-5 text-white/45">Session-level paths reconstructed from widget views, starts, completions, recommendations and buy clicks.</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {[
              ["Completed", journeyReport.summary.completed],
              ["Clicked", journeyReport.summary.clicked],
              ["Started drop-off", journeyReport.summary.abandonedAfterStart],
              ["Avg duration", formatDuration(journeyReport.summary.averageDurationSeconds)],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white/[.07] p-3">
              <p className="text-xl font-extrabold">{String(value)}</p>
              <p className="mt-1 text-[8px] font-bold text-white/35">{String(label)}</p>
            </div>)}
          </div>
          <div className="mt-5 space-y-2">
            {journeyReport.dropoffs.slice(0, 2).map((dropoff) => <div key={dropoff.stage} className={`rounded-2xl p-3 ${dropoff.count ? "bg-amber-300/10" : "bg-lime/10"}`}>
              <div className="flex items-start gap-2">
                {dropoff.count ? <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-100" /> : <Check size={13} className="mt-0.5 shrink-0 text-lime" />}
                <div>
                  <p className="text-[10px] font-extrabold">{dropoff.label} · {dropoff.count} sessions</p>
                  <p className="mt-1 text-[9px] leading-4 text-white/45">{dropoff.count ? dropoff.recommendation : "No meaningful drop-off at this stage for the selected filter."}</p>
                </div>
              </div>
            </div>)}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Recent shopper paths</h2><p className="mt-1 text-[10px] text-black/35">A lightweight session replay for {activeExperienceLabel.toLowerCase()}</p></div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0f2ec] text-moss"><Clock3 size={16} /></span>
          </div>
          <div className="mt-5 space-y-3">
            {journeyReport.journeys.slice(0, 4).map((journey) => {
              const outcomeTone = journey.outcome === "clicked" ? "bg-lime/35 text-moss" : journey.outcome === "completed" ? "bg-blue-50 text-blue-700" : journey.outcome === "started" ? "bg-amber-50 text-amber-700" : "bg-black/5 text-black/35";
              return <article key={journey.sessionId} className="rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${outcomeTone}`}>{journey.outcome}</span><span className="text-[8px] font-bold text-black/25">{journey.experienceType}</span></div>
                    <h3 className="mt-3 truncate text-xs font-extrabold">{journey.intentSummary}</h3>
                    <p className="mt-1 text-[9px] font-bold text-black/35">{journey.experienceName} · {journey.eventCount} events · {formatDuration(journey.durationSeconds)}</p>
                  </div>
                  <span className="shrink-0 text-[8px] font-bold text-black/30">{new Date(journey.lastSeenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </div>
                <div className="mt-4 grid gap-1.5 xl:grid-cols-3">
                  {journey.steps.slice(0, 6).map((step, index) => <div key={`${journey.sessionId}-${step.createdAt}-${index}`} className="rounded-xl bg-white px-2.5 py-2">
                    <p className="truncate text-[8px] font-extrabold text-black/45">{index + 1}. {step.label}</p>
                  </div>)}
                </div>
                {(journey.recommendedProducts.length || journey.clickedProducts.length) ? <p className="mt-3 truncate text-[9px] font-bold text-black/35">Products: {[...new Set([...journey.clickedProducts, ...journey.recommendedProducts])].slice(0, 3).join(", ")}</p> : null}
              </article>;
            })}
            {!journeyReport.journeys.length && <div className="rounded-2xl border border-dashed border-black/10 p-10 text-center"><p className="text-xs font-extrabold">No sessions in this filter yet</p><p className="mt-1 text-[10px] text-black/35">Open a published experience to capture shopper paths.</p></div>}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_.9fr]">
        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Zero-party intent hub</h2><p className="mt-1 text-[10px] text-black/35">Answers, queries and catalog signals shoppers explicitly gave you</p></div>
            <span className="rounded-full bg-lime/35 px-3 py-1.5 text-[9px] font-extrabold text-moss">{zeroPartyInsights.summary.explicitSignals} signals</span>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {[
              { label: "Top answers", icon: ListChecks, items: zeroPartyInsights.answers, empty: "Completed finder answers and configurator choices will appear here." },
              { label: "Search/advisor themes", icon: Search, items: zeroPartyInsights.queryThemes, empty: "Natural-language shopper themes will appear here." },
              { label: "Matched catalog signals", icon: Tags, items: zeroPartyInsights.catalogSignals, empty: "Matched tags, reasons and semantic terms will appear here." },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-black/[0.07] bg-[#f7f8f4] p-4">
                  <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-lime/45 text-moss"><Icon size={15} /></span><h3 className="text-xs font-extrabold">{card.label}</h3></div>
                  <div className="mt-4 space-y-2">
                    {card.items.length ? card.items.map((item) => (
                      <div key={item.label} className="rounded-xl bg-white px-3 py-2">
                        <div className="flex items-start justify-between gap-2"><p className="text-[10px] font-extrabold leading-4">{item.label}</p><span className="rounded-full bg-black/5 px-2 py-0.5 text-[8px] font-extrabold text-black/35">{item.count}</span></div>
                        {item.detail && <p className="mt-0.5 line-clamp-1 text-[8px] font-bold text-black/30">{item.detail}</p>}
                        <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-black/25">{item.sources.join(" · ")}{item.products.length ? ` · ${item.products.slice(0, 2).join(", ")}` : ""}</p>
                      </div>
                    )) : <p className="rounded-xl bg-white px-3 py-5 text-center text-[10px] leading-4 text-black/35">{card.empty}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl bg-ink p-4 text-white">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-lime">Unique signals</p>
              <p className="display mt-3 text-4xl">{zeroPartyInsights.summary.uniqueSignals}</p>
              <p className="mt-2 text-[10px] leading-4 text-white/45">Distinct shopper terms, answers and mapped catalog reasons in this filter.</p>
            </div>
            <div className="rounded-2xl bg-[#f7f8f4] p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/35">Product demand</p>
              <p className="display mt-3 text-4xl">{zeroPartyInsights.summary.productsWithDemand}</p>
              <p className="mt-2 text-[10px] leading-4 text-black/40">Products with recommendation or buy-click evidence.</p>
            </div>
            <div className="rounded-2xl bg-lime/35 p-4">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-moss">Scoped events</p>
              <p className="display mt-3 text-4xl">{filteredEvents.length}</p>
              <p className="mt-2 text-[10px] leading-4 text-moss/70">Filtered by {activeExperienceLabel.toLowerCase()} over {range.toLowerCase()}.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-extrabold">Intent opportunities</h2><p className="mt-1 text-[10px] text-black/35">Deterministic next steps from your captured shopper signals</p></div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0f2ec] text-moss"><Sparkles size={16} /></span>
          </div>
          <div className="mt-6 space-y-3">
            {zeroPartyInsights.opportunities.map((opportunity) => (
              <div key={opportunity.title} className={`rounded-2xl border p-4 ${opportunity.severity === "win" ? "border-lime/60 bg-lime/20" : opportunity.severity === "watch" ? "border-amber-200 bg-amber-50" : "border-black/[0.06] bg-[#f7f8f4]"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold">{opportunity.title}</p>
                  <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${opportunity.severity === "win" ? "bg-lime text-moss" : opportunity.severity === "watch" ? "bg-amber-200 text-amber-800" : "bg-white text-black/35"}`}>{opportunity.severity}</span>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-black/45">{opportunity.detail}</p>
                <p className="mt-2 text-[10px] leading-4 font-bold text-moss">{opportunity.recommendation}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-black/[0.06] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold">Product demand pulse</h3>
              <Trophy size={15} className="text-moss" />
            </div>
            <div className="mt-3 space-y-2">
              {zeroPartyInsights.productDemand.length ? zeroPartyInsights.productDemand.map((item) => (
                <div key={item.productId || item.productName} className="rounded-xl bg-[#f7f8f4] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[10px] font-extrabold">{item.productName}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[8px] font-extrabold text-moss">{Math.round(item.clickRate)}%</span>
                  </div>
                  <p className="mt-1 text-[8px] font-bold text-black/35">{item.recommended} surfaced · {item.clicks} buy clicks · {item.sources.join(" · ")}</p>
                </div>
              )) : <p className="rounded-xl bg-[#f7f8f4] px-3 py-5 text-center text-[10px] leading-4 text-black/35">Recommendation and buy-click product demand will appear here.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div><h2 className="text-sm font-extrabold">Recent high-intent moments</h2><p className="mt-1 text-[10px] text-black/35">Completions, recommendations and clicks with zero-party context</p></div>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0f2ec] text-moss"><Clock3 size={16} /></span>
        </div>
        <div className="mt-6 grid gap-3 xl:grid-cols-3">
          {zeroPartyInsights.recent.length ? zeroPartyInsights.recent.map((item) => (
              <div key={item.id} className="rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-lime/35 px-2.5 py-1 text-[8px] font-extrabold uppercase text-moss">{item.type}</span>
                  <span className="text-[8px] font-bold text-black/30">{item.date}</span>
                </div>
                <p className="mt-3 text-xs font-extrabold leading-5">{item.summary}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-bold text-black/35">
                  <span>{item.eventType.replaceAll("_", " ")}</span>
                  {item.productName && <span className="truncate text-moss">{item.productName}</span>}
                </div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center xl:col-span-3"><p className="text-xs font-extrabold">No high-intent events yet</p><p className="mt-1 text-[10px] text-black/35">Run a finder, advisor, search or configurator to populate this stream.</p></div>}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <div><h2 className="text-sm font-extrabold">Recommended products</h2><p className="mt-1 text-[10px] text-black/35">Product-level performance for {activeExperienceLabel.toLowerCase()}</p></div>
          <span className="text-[10px] font-bold text-black/30">{quizzes.length} finder{quizzes.length === 1 ? "" : "s"} · {configurators.length} configurator{configurators.length === 1 ? "" : "s"}</span>
        </div>
        {productStats.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead><tr className="border-b border-black/[0.05] text-[9px] font-extrabold uppercase tracking-wider text-black/30"><th className="px-6 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Recommended</th><th className="px-4 py-3">Buy clicks</th><th className="px-6 py-3">Click rate</th></tr></thead>
              <tbody>
                {productStats.slice(0, 8).map(({ product, recommended: productRecommended, clicks: productClicks }, index) => (
                  <tr key={product.id} className="border-b border-black/[0.05] last:border-0">
                    <td className="px-6 py-3"><div className="flex items-center gap-3"><span className="w-5 text-[10px] font-extrabold text-black/25">#{index + 1}</span><div className="h-9 w-9 overflow-hidden rounded-lg bg-canvas">{product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}</div><span className="text-xs font-extrabold">{product.name}</span></div></td>
                    <td className="px-4 py-3 text-xs font-bold text-black/50">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-xs font-extrabold">{productRecommended}</td>
                    <td className="px-4 py-3 text-xs font-extrabold">{productClicks}</td>
                    <td className="px-6 py-3"><span className="rounded-full bg-lime/35 px-2 py-1 text-[9px] font-extrabold text-moss">{productRecommended ? Math.round(productClicks / productRecommended * 100) : 0}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-12 text-center text-xs text-black/35">Recommendation data will appear after shoppers complete an experience.</div>}
      </section>
    </div>
  );
}
