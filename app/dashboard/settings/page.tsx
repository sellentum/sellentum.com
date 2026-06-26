"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clipboard, Code2, ExternalLink, LoaderCircle, RotateCcw, Save, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import type { WidgetSettings } from "@/lib/types";
import { buildWidgetInstallReport, buildWidgetSnippet, widgetPathForExperience, widgetPlaceholderForExperience, type WidgetEmbedExperience, type WidgetEmbedMode, type WidgetLauncherPosition } from "@/lib/widget-snippet";

const swatches = ["#22352a", "#2d4cbe", "#7c3aed", "#be3a2d", "#111827", "#d25f28"];

export default function SettingsPage() {
  const { ready, settings, quizzes, configurators, saveSettings, resetDemo, mode } = useStore();
  const [draft, setDraft] = useState<WidgetSettings>(settings);
  const [embedType, setEmbedType] = useState<WidgetEmbedExperience>("finder");
  const [embedMode, setEmbedMode] = useState<WidgetEmbedMode>("modal");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [embedSource, setEmbedSource] = useState("storefront");
  const [embedCampaign, setEmbedCampaign] = useState("findly-launch");
  const [embedPlacement, setEmbedPlacement] = useState("site-wide");
  useEffect(() => { setDraft(settings); setOrigin(window.location.origin); }, [settings]);
  const publishedQuiz = quizzes.find((q) => q.published) || quizzes[0];
  const publishedConfigurator = configurators.find((configurator) => configurator.published) || configurators[0];
  const embedId = embedType === "configurator" ? publishedConfigurator?.id : publishedQuiz?.id;
  const embedPath = widgetPathForExperience(embedType);
  const embedPlaceholder = widgetPlaceholderForExperience(embedType);
  const embedLabel = embedType === "search" ? "Search products" : draft.button_text;
  const embedPosition: WidgetLauncherPosition = draft.launcher_position === "bottom-left" ? "left" : "right";
  const snippetConfig = useMemo(() => ({ origin, experience: embedType, mode: embedMode, id: embedId || embedPlaceholder, color: draft.primary_color, label: embedLabel, position: embedPosition, source: embedSource, campaign: embedCampaign, placement: embedPlacement }), [origin, embedType, embedMode, embedId, embedPlaceholder, draft.primary_color, embedLabel, embedPosition, embedSource, embedCampaign, embedPlacement]);
  const snippet = useMemo(() => buildWidgetSnippet(snippetConfig), [snippetConfig]);
  const installReport = useMemo(() => buildWidgetInstallReport({ ...snippetConfig, id: embedId }), [snippetConfig, embedId]);
  const update = (key: keyof WidgetSettings, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  async function save() { setSaving(true); await saveSettings(draft); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1800); }
  async function copy() { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1800); }
  if (!ready) return <LoadingState label="Loading brand settings…" />;
  return <div className="animate-rise">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-moss">Customise & launch</p><h1 className="display mt-2 text-4xl sm:text-5xl">Brand & embed</h1><p className="mt-2 text-sm text-black/45">Make the experience yours, then add it to any storefront.</p></div><button onClick={save} disabled={saving} className="btn-primary self-start">{saving ? <LoaderCircle size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}{saved ? "Changes saved" : "Save changes"}</button></div>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_.85fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7"><div><h2 className="text-sm font-extrabold">Brand identity</h2><p className="mt-1 text-[10px] text-black/35">Shown inside your product finder and widget launcher.</p></div><div className="mt-6 grid gap-5"><div><label className="label">Brand name</label><input className="field" value={draft.brand_name} onChange={(e) => update("brand_name", e.target.value)} /></div><div><label className="label">Primary colour</label><div className="flex flex-wrap items-center gap-2">{swatches.map((color) => <button key={color} onClick={() => update("primary_color", color)} style={{ background: color }} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white shadow-sm ring-offset-2 ${draft.primary_color === color ? "ring-2 ring-ink" : ""}`} aria-label={`Set colour ${color}`}>{draft.primary_color === color && <Check size={14} className="text-white" />}</button>)}<label className="flex items-center gap-2 rounded-full border border-black/10 bg-canvas p-1 pr-3 text-[10px] font-bold"><input type="color" value={draft.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent" /> Custom</label></div></div></div></section>
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7"><div><h2 className="text-sm font-extrabold">Widget copy</h2><p className="mt-1 text-[10px] text-black/35">Keep it clear, friendly, and true to your brand voice.</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><label className="label">Launcher button text</label><input className="field" value={draft.button_text} onChange={(e) => update("button_text", e.target.value)} /></div><div><label className="label">Widget title</label><input className="field" value={draft.widget_title} onChange={(e) => update("widget_title", e.target.value)} /></div><div className="sm:col-span-2"><label className="label">Welcome message</label><textarea className="field min-h-24" value={draft.welcome_message} onChange={(e) => update("welcome_message", e.target.value)} /></div><div><label className="label">Launcher position</label><select className="field" value={draft.launcher_position} onChange={(e) => update("launcher_position", e.target.value)}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option></select></div><div><label className="label">Embedded experience</label><select className="field" value={embedType} onChange={(e) => setEmbedType(e.target.value as WidgetEmbedExperience)}><option value="finder">Guided finder</option><option value="assistant">Conversational advisor</option><option value="search">Semantic search</option><option value="configurator">Visual configurator</option></select></div><div className="sm:col-span-2"><label className="label">Embed mode</label><select className="field" value={embedMode} onChange={(e) => setEmbedMode(e.target.value as WidgetEmbedMode)}><option value="modal">Floating launcher modal — lazy-loads when opened</option><option value="inline">Inline iframe — embedded directly in the page</option></select><p className="mt-1 text-[10px] text-black/30">Modal mode avoids loading the experience iframe until a shopper opens it, keeping view analytics cleaner.</p></div><div className="sm:col-span-2 rounded-2xl bg-[#f7f8f4] p-4"><div><h3 className="text-xs font-extrabold">Analytics labels</h3><p className="mt-1 text-[10px] text-black/35">These labels travel with widget events so Analytics can compare campaigns, pages and placements.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><label className="label !text-[9px]">Source</label><input className="field !py-2.5 text-xs" value={embedSource} onChange={(e) => setEmbedSource(e.target.value)} placeholder="storefront" /></div><div><label className="label !text-[9px]">Campaign</label><input className="field !py-2.5 text-xs" value={embedCampaign} onChange={(e) => setEmbedCampaign(e.target.value)} placeholder="holiday-guide" /></div><div><label className="label !text-[9px]">Placement</label><input className="field !py-2.5 text-xs" value={embedPlacement} onChange={(e) => setEmbedPlacement(e.target.value)} placeholder="pdp-bottom" /></div></div></div></div></section>
      </div>
      <div className="space-y-5">
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Live preview</h2><p className="mt-1 text-[10px] text-black/35">What shoppers will see on your storefront.</p></div><span className="rounded-full bg-lime/35 px-2 py-1 text-[9px] font-extrabold text-moss">Interactive look</span></div><div className="relative mt-5 h-[340px] overflow-hidden rounded-2xl border border-black/10 bg-[#eceee9]"><div className="absolute left-0 right-0 top-0 flex h-11 items-center gap-1.5 border-b border-black/[0.06] bg-white px-3"><i className="h-2 w-2 rounded-full bg-red-300" /><i className="h-2 w-2 rounded-full bg-yellow-300" /><i className="h-2 w-2 rounded-full bg-green-300" /><div className="mx-auto h-4 w-32 rounded-full bg-black/5" /></div><div className="dot-grid absolute inset-x-0 bottom-0 top-11 opacity-40" /><div className="absolute left-6 top-20 h-3 w-32 rounded bg-black/10" /><div className="absolute left-6 top-28 h-2 w-48 rounded bg-black/5" /><div className="absolute left-6 top-32 h-2 w-40 rounded bg-black/5" /><button className={`absolute bottom-4 ${draft.launcher_position === "bottom-right" ? "right-4" : "left-4"} flex items-center gap-2 rounded-full px-4 py-3 text-xs font-extrabold text-white shadow-xl`} style={{ background: draft.primary_color }}><Sparkles size={14} />{draft.button_text}</button><div className="absolute left-1/2 top-[58%] w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 text-center shadow-xl"><span className="mx-auto grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: draft.primary_color }}><Sparkles size={13} /></span><p className="mt-3 text-xs font-extrabold">{draft.widget_title}</p><p className="mt-1 text-[8px] leading-3 text-black/40">{draft.welcome_message}</p></div></div></section>
        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-ink text-white"><div className="flex items-start justify-between p-5 sm:p-6"><div><h2 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-lime" /> Install your widget</h2><p className="mt-1 text-[10px] text-white/40">Paste this before your site’s closing &lt;/body&gt; tag.</p></div><button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[10px] font-extrabold hover:bg-white/15">{copied ? <Check size={12} className="text-lime" /> : <Clipboard size={12} />}{copied ? "Copied" : "Copy"}</button></div><pre className="overflow-x-auto border-y border-white/10 bg-black/20 p-5 text-[10px] leading-5 text-lime/80"><code>{snippet}</code></pre><div className="flex items-center justify-between p-4 text-[9px] text-white/35"><span>Works on any HTML storefront</span>{embedId && <a href={`/${embedPath}/${embedId}`} target="_blank" className="flex items-center gap-1 font-bold text-lime">Open {embedType} <ExternalLink size={10} /></a>}</div></section>
        <section className="rounded-2xl border border-black/[0.07] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-xs font-extrabold">Embed QA checklist</h2><p className="mt-1 text-[9px] text-black/35">Make sure the snippet is install-ready before it goes into a storefront theme.</p></div>
            <span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${installReport.canInstall ? "bg-lime/35 text-moss" : "bg-amber-50 text-amber-700"}`}>{installReport.canInstall ? "Ready" : "Needs attention"}</span>
          </div>
          <div className="mt-4 space-y-2">
            {installReport.checks.map((item) => (
              <div key={item.id} className={`rounded-xl px-3 py-2 ${item.severity === "pass" ? "bg-lime/20" : item.severity === "warning" ? "bg-amber-50" : "bg-red-50"}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${item.severity === "pass" ? "bg-lime text-moss" : item.severity === "warning" ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-600"}`}>{item.severity === "pass" ? <Check size={11} /> : <AlertTriangle size={11} />}</span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-extrabold">{item.label}</span>
                    <span className="mt-0.5 block text-[8px] font-bold leading-3 text-black/35">{item.detail}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        {mode === "demo" && <section className="rounded-2xl border border-black/[0.07] bg-white p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xs font-extrabold">Reset demo workspace</h2><p className="mt-1 text-[9px] text-black/35">Restore the starter products, finder and analytics.</p></div><button onClick={() => { if (confirm("Reset all demo data?")) resetDemo(); }} className="btn-secondary shrink-0 !px-3 !py-2 text-[10px]"><RotateCcw size={12} /> Reset</button></div></section>}
      </div>
    </div>
  </div>;
}
