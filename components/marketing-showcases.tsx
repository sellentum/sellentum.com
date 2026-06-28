"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Boxes, Check, ChevronRight, Code2, Database, Eye, Footprints, Layers3, MousePointerClick, PackagePlus, Search, Settings2, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const demoMatches = [
  {
    label: "Weekend trails",
    name: "Terra Trail Runner",
    price: 128,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
    reason: "Trail grip and soft cushioning make this the strongest match for mixed surfaces and longer miles.",
    tags: ["Trail grip", "Cushioned", "Rain-ready"],
  },
  {
    label: "City & travel",
    name: "Aero City Knit",
    price: 94,
    image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=85",
    reason: "Lightweight, breathable construction makes this an easy match for commutes, travel and all-day wear.",
    tags: ["Lightweight", "Breathable", "Flexible"],
  },
  {
    label: "Faster running",
    name: "Pulse Tempo Pro",
    price: 165,
    image: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=900&q=85",
    reason: "Responsive energy return and a light road build fit the speed sessions and race-day feel you chose.",
    tags: ["Energy return", "Road grip", "Race-day"],
  },
];

export function HeroDiscoveryDemo() {
  const [view, setView] = useState<"shopper" | "merchant">("shopper");
  const [selected, setSelected] = useState(0);
  const match = demoMatches[selected];

  return (
    <div className="relative mx-auto max-w-[1180px]">
      <div className="absolute -inset-8 rounded-[56px] bg-[radial-gradient(circle_at_20%_20%,rgba(217,255,97,.5),transparent_37%),radial-gradient(circle_at_80%_40%,rgba(255,189,138,.35),transparent_36%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_35px_100px_rgba(28,39,32,.16)]">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-xl bg-ink text-lime"><Sparkles size={14} /></span>Northstar product guide</div>
          <div className="flex rounded-full bg-[#f0f2ec] p-1">
            <button onClick={() => setView("shopper")} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${view === "shopper" ? "bg-white shadow-sm" : "text-black/40"}`}>Shopper experience</button>
            <button onClick={() => setView("merchant")} className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${view === "merchant" ? "bg-white shadow-sm" : "text-black/40"}`}>Merchant workspace</button>
          </div>
          <span className="hidden rounded-full bg-lime/35 px-3 py-1.5 text-xs font-extrabold text-moss sm:block">Live product demo</span>
        </div>

        {view === "shopper" ? (
          <div className="grid min-h-[525px] lg:grid-cols-[.86fr_1.14fr]">
            <div className="flex flex-col justify-center border-b border-black/[0.07] p-7 sm:p-11 lg:border-b-0 lg:border-r">
              <p className="eyebrow text-moss">Question 1 of 3</p>
              <h3 className="mt-4 text-[2.35rem] font-extrabold leading-[1.02] tracking-[-.055em]">Where will you wear them most?</h3>
              <p className="mt-3 text-sm leading-6 text-black/45">Choose the setting that looks most like your week.</p>
              <div className="mt-7 space-y-2.5">
                {demoMatches.map((item, index) => (
                  <button key={item.label} onClick={() => setSelected(index)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-extrabold transition hover:-translate-y-0.5 ${selected === index ? "border-ink bg-ink text-white shadow-lg" : "border-black/10 bg-white hover:border-black/30"}`}>
                    <span className="flex items-center gap-3"><span className={`grid h-7 w-7 place-items-center rounded-full border ${selected === index ? "border-lime bg-lime text-ink" : "border-black/15"}`}>{selected === index ? <Check size={13} /> : String.fromCharCode(65 + index)}</span>{item.label}</span><ChevronRight size={15} className={selected === index ? "text-lime" : "text-black/20"} />
                  </button>
                ))}
              </div>
              <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full w-1/3 rounded-full bg-lime" /></div>
            </div>
            <div className="bg-[linear-gradient(135deg,#f7f8f3_0%,#eff3e2_55%,#fff2e8_100%)] p-7 sm:p-10">
              <div className="flex items-center justify-between"><p className="eyebrow text-moss">Your current best match</p><span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold shadow-sm">94% match</span></div>
              <div className="mt-5 grid overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-xl sm:grid-cols-[1.05fr_.95fr]">
                <div className="relative min-h-[315px] overflow-hidden bg-[#eceee9]"><img src={match.image} alt={match.name} className="absolute inset-0 h-full w-full object-cover transition duration-500" /><span className="absolute left-4 top-4 rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider">Best match</span></div>
                <div className="flex flex-col p-6"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">Running shoes</p><h4 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-.04em]">{match.name}</h4><p className="mt-1 text-lg font-extrabold">{formatCurrency(match.price)}</p><div className="mt-5 rounded-xl bg-[#f3f5ef] p-4"><p className="flex items-center gap-1.5 text-xs font-extrabold text-moss"><Sparkles size={11} /> Why it fits</p><p className="mt-2 text-xs leading-5 text-black/55">{match.reason}</p></div><div className="mt-4 flex flex-wrap gap-1.5">{match.tags.map((tag) => <span key={tag} className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-bold text-black/45">{tag}</span>)}</div><button className="mt-auto rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white">See my full results →</button></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[525px] bg-[#f4f5f1] lg:grid-cols-[220px_1fr]">
            <aside className="hidden border-r border-black/[0.07] bg-[#eaede6] p-4 lg:block"><p className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-black/30">Workspace</p>{[["Overview", BarChart3], ["Products", Boxes], ["Product finders", Footprints], ["Configurators", PackagePlus], ["Analytics", Eye], ["Brand & embed", Code2]].map(([label, Icon], index) => { const MenuIcon = Icon as typeof BarChart3; return <div key={String(label)} className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold ${index === 2 ? "bg-ink text-white" : "text-black/45"}`}><MenuIcon size={15} className={index === 2 ? "text-lime" : ""} />{String(label)}</div>; })}</aside>
            <div className="p-6 sm:p-9"><div className="flex items-center justify-between"><div><p className="eyebrow text-moss">Product finder</p><h3 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">Find your perfect pair</h3></div><button className="rounded-full bg-ink px-4 py-2.5 text-xs font-extrabold text-white">Publish finder</button></div><div className="mt-7 grid gap-5 xl:grid-cols-[1fr_280px]"><div className="rounded-2xl border border-black/[0.07] bg-white p-5"><p className="text-xs font-extrabold">Conversation flow</p><div className="mt-5 space-y-3">{["Where will you wear them most?", "What matters most underfoot?", "What’s your comfortable budget?"].map((question, index) => <div key={question} className="flex items-center gap-4 rounded-xl border border-black/[0.07] p-4"><span className="grid h-8 w-8 place-items-center rounded-xl bg-lime/45 text-xs font-extrabold">{index + 1}</span><span className="flex-1 text-xs font-extrabold">{question}</span><span className="rounded-full bg-[#f1f3ed] px-2 py-1 text-xs font-bold text-black/35">{index === 2 ? "Budget" : index === 1 ? "Feature" : "Tag"}</span><Settings2 size={14} className="text-black/25" /></div>)}</div><button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 py-3 text-xs font-extrabold text-moss">+ Add question</button></div><div className="rounded-2xl bg-ink p-5 text-white"><p className="text-xs font-extrabold uppercase tracking-wider text-lime">Live performance</p><p className="mt-7 text-xs text-white/40">Completion rate</p><p className="mt-1 text-4xl font-extrabold tracking-[-.06em]">52%</p><div className="mt-6 h-1.5 rounded-full bg-white/10"><div className="h-full w-[52%] rounded-full bg-lime" /></div><div className="mt-8 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/[.06] p-3"><Eye size={13} className="text-lime" /><p className="mt-3 text-lg font-extrabold">1.2k</p><p className="text-xs text-white/35">Views</p></div><div className="rounded-xl bg-white/[.06] p-3"><MousePointerClick size={13} className="text-lime" /><p className="mt-3 text-lg font-extrabold">184</p><p className="text-xs text-white/35">Buy clicks</p></div></div></div></div></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AudienceExperience() {
  const [mode, setMode] = useState<"shoppers" | "teams">("shoppers");
  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full bg-black/[0.06] p-1.5">
        <button onClick={() => setMode("shoppers")} className={`rounded-full px-6 py-3 text-xs font-extrabold transition ${mode === "shoppers" ? "bg-ink text-white shadow-lg" : "text-black/45"}`}>For shoppers</button>
        <button onClick={() => setMode("teams")} className={`rounded-full px-6 py-3 text-xs font-extrabold transition ${mode === "teams" ? "bg-ink text-white shadow-lg" : "text-black/45"}`}>For commerce teams</button>
      </div>
      <div className="mt-8 grid overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-soft lg:grid-cols-[.92fr_1.08fr]">
        <div className="p-8 sm:p-12 lg:p-14"><p className="eyebrow text-moss">{mode === "shoppers" ? "Guided discovery" : "Repeatable expertise"}</p><h3 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.03] tracking-[-.055em] sm:text-5xl">{mode === "shoppers" ? <>Turn a few answers into <span className="text-moss">a confident choice.</span></> : <>Turn product knowledge into <span className="text-moss">a scalable sales experience.</span></>}</h3><p className="mt-5 max-w-lg text-sm leading-6 text-black/50">{mode === "shoppers" ? "Replace endless browsing with a short, thoughtful conversation that narrows a complex catalog to the products that genuinely fit." : "Give merchandising teams a visual builder, reliable matching controls, live brand settings and the signals they need to keep improving."}</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{(mode === "shoppers" ? ["Questions that feel useful", "1–3 focused recommendations", "Clear reasons for every match", "Direct paths to purchase"] : ["CSV and manual catalog tools", "Tag, category, feature and budget rules", "One-click publishing", "Views, completions and buying intent"]).map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-[#f3f5ef] px-3 py-3 text-xs font-extrabold"><span className="grid h-5 w-5 place-items-center rounded-full bg-lime"><Check size={11} /></span>{item}</div>)}</div><a href={mode === "shoppers" ? "/finder/quiz_footwear" : "/login"} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-xs font-extrabold text-white">{mode === "shoppers" ? "Try the live finder" : "Explore the workspace"}<ArrowRight size={14} /></a></div>
        <div className="relative min-h-[540px] overflow-hidden bg-[radial-gradient(circle_at_75%_20%,rgba(217,255,97,.8),transparent_35%),linear-gradient(135deg,#edf0e8,#fff2e7)] p-8 sm:p-12">{mode === "shoppers" ? <div className="grid h-full place-items-center"><div className="w-full max-w-md rotate-2 rounded-[26px] border border-black/10 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-lime"><Sparkles size={12} /></span>Your matches</span><span className="rounded-full bg-lime px-2 py-1 text-xs font-extrabold">3 found</span></div><div className="mt-5 grid grid-cols-2 gap-3">{demoMatches.slice(0, 2).map((item, i) => <div key={item.name} className="overflow-hidden rounded-xl border border-black/10"><div className="relative h-32"><img src={item.image} alt="" className="h-full w-full object-cover" />{i === 0 && <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-1 text-xs font-extrabold">BEST MATCH</span>}</div><div className="p-3"><p className="text-xs font-extrabold">{item.name}</p><p className="mt-1 text-xs text-black/40">{formatCurrency(item.price)}</p></div></div>)}</div><div className="mt-4 rounded-xl bg-[#f3f5ef] p-3"><p className="text-xs font-extrabold text-moss">✦ WHY IT FITS</p><p className="mt-1 text-xs leading-4 text-black/45">Matched to the use, feel and budget preferences you shared.</p></div></div></div> : <div className="grid h-full place-items-center"><div className="w-full max-w-md -rotate-2 rounded-[26px] border border-black/10 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-moss">Analytics</p><p className="mt-1 text-sm font-extrabold">Product finder performance</p></div><BarChart3 size={18} className="text-moss" /></div><div className="mt-5 grid grid-cols-3 gap-2">{[["1,284", "Views"], ["667", "Completed"], ["184", "Buy clicks"]].map(([value, label]) => <div key={label} className="rounded-xl bg-[#f3f5ef] p-3"><p className="text-lg font-extrabold">{value}</p><p className="text-xs text-black/35">{label}</p></div>)}</div><div className="mt-5 flex h-44 items-end gap-2">{[38, 55, 45, 68, 62, 79, 58, 85, 73, 92].map((height, i) => <div key={i} className="flex-1 rounded-t bg-moss" style={{height:`${height}%`}}><div className="h-[35%] rounded-t bg-lime" /></div>)}</div></div></div>}</div>
      </div>
    </div>
  );
}

const capabilities = [
  { title: "Catalog management", copy: "Upload a CSV or manage products manually. Keep price, images, categories, descriptions, features, tags and product links ready for discovery.", icon: Database, points: ["Manual product CRUD", "CSV import", "Structured match attributes"], visual: "catalog" },
  { title: "Guided selling builder", copy: "Turn the questions your best salesperson asks into a clean, editable customer conversation.", icon: Layers3, points: ["Multiple questions", "Flexible answer options", "Publish and edit anytime"], visual: "builder" },
  { title: "Reliable recommendations", copy: "Use deterministic category, tag, feature and budget signals to choose products before AI writes a single word.", icon: Search, points: ["Weighted rule matching", "Hard budget eligibility", "Stable, repeatable ranking"], visual: "rules" },
  { title: "AI match explanations", copy: "Translate product facts and customer answers into concise, grounded reasons that make each recommendation easier to trust.", icon: Sparkles, points: ["OpenAI-powered copy", "Fact-limited prompts", "Safe deterministic fallback"], visual: "ai" },
  { title: "Visual configurators", copy: "Let shoppers build a compatible product bundle while price, options and product links update in real time.", icon: PackagePlus, points: ["Single or multi-select steps", "Compatibility rules", "Live bundle pricing"], visual: "configurator" },
  { title: "Embeddable storefront widget", copy: "Launch the experience on any ecommerce site using one JavaScript snippet and a polished modal iframe.", icon: Code2, points: ["Framework independent", "Brand controls", "Modal or direct link"], visual: "embed" },
  { title: "Journey analytics", copy: "Track the full path from widget view to quiz start, completion, recommendation and buy click.", icon: BarChart3, points: ["Five core events", "Product-level signals", "Funnel visibility"], visual: "analytics" },
] as const;

export function CapabilityExplorer() {
  const [active, setActive] = useState(0);
  const item = capabilities[active];
  const Icon = item.icon;
  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {capabilities.map(({ title, copy, icon: ItemIcon }, index) => (
          <button key={title} onClick={() => setActive(index)} className={`min-h-[150px] rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${active === index ? "border-ink bg-white shadow-lg ring-1 ring-ink" : "border-black/10 bg-white/55 hover:bg-white"}`}>
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${active === index ? "bg-ink text-lime" : "bg-lime/40 text-moss"}`}><ItemIcon size={16} /></span>
            <span className="mt-4 block text-sm font-extrabold tracking-[-.02em]">{title}</span>
            <span className="mt-1.5 block text-xs leading-4 text-black/40">{copy.split(".")[0]}.</span>
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-soft">
        <div className="relative min-h-[340px] overflow-hidden bg-[radial-gradient(circle_at_70%_15%,rgba(217,255,97,.9),transparent_34%),linear-gradient(135deg,#e9ede5,#fff0e5)] p-7">
          <div className="absolute inset-0 dot-grid opacity-20" />
          <div className="relative mx-auto max-w-lg rounded-2xl border border-black/10 bg-white/90 p-5 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lime"><Icon size={18} /></span><span className="rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">Findly engine</span></div>
            {item.visual === "catalog" && <div className="mt-5 space-y-2">{["Terra Trail Runner", "Aero City Knit", "Pulse Tempo Pro"].map((name, i) => <div key={name} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef0eb]"><Boxes size={13} /></span><span className="flex-1 text-xs font-extrabold">{name}</span><span className="text-xs text-black/30">{i === 0 ? "trail · cushioned" : i === 1 ? "city · light" : "road · speed"}</span></div>)}</div>}
            {item.visual === "builder" && <div className="mt-5 space-y-2">{["Where will you wear them?", "What matters underfoot?", "What is your budget?"].map((name, i) => <div key={name} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-lime/50 text-xs font-extrabold">{i + 1}</span><span className="text-xs font-extrabold">{name}</span></div>)}</div>}
            {item.visual === "rules" && <div className="mt-5 rounded-xl border border-black/[0.07] p-4"><p className="text-xs font-extrabold">If answer is “Weekend trails”</p><div className="mt-3 flex items-center gap-2 text-xs"><span className="rounded-lg bg-[#eef0eb] px-2.5 py-2">Product tag</span><span>is</span><span className="rounded-lg bg-lime/50 px-2.5 py-2 font-extrabold">trail</span><span className="ml-auto rounded-full bg-ink px-2 py-1 text-xs text-white">High weight</span></div></div>}
            {item.visual === "ai" && <div className="mt-5 space-y-3"><div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink p-3 text-xs leading-4 text-white">I need something cushioned for wet weekend trails.</div><div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[#eef0eb] p-3 text-xs leading-4 text-black/55"><b className="text-moss">Why Terra fits:</b> Trail grip and soft cushioning match the conditions and feel you described.</div></div>}
            {item.visual === "configurator" && <div className="mt-5 space-y-2"><div className="rounded-xl bg-ink p-4 text-white"><p className="text-xs font-extrabold uppercase tracking-wider text-lime">Build your trail kit</p><p className="mt-2 text-2xl font-extrabold tracking-[-.05em]">£166</p><p className="mt-1 text-xs text-white/40">Terra + wet trails + care kit</p></div>{["Wet trails & mud", "Maximum cushioning", "Waterproof care kit"].map((option, i) => <div key={option} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3"><span className="grid h-6 w-6 place-items-center rounded-lg bg-lime/50 text-xs font-extrabold"><Check size={10} /></span><span className="flex-1 text-xs font-extrabold">{option}</span><span className="text-xs text-black/30">{i === 0 ? "compatible" : "selected"}</span></div>)}</div>}
            {item.visual === "embed" && <div className="mt-5 rounded-xl bg-ink p-4 font-mono text-xs leading-5 text-lime">&lt;script<br />&nbsp;&nbsp;src=&quot;findly.app/widget.js&quot;<br />&nbsp;&nbsp;data-experience=&quot;configurator&quot;<br />&nbsp;&nbsp;data-id=&quot;trail-kit&quot;<br />&nbsp;&nbsp;async<br />&gt;&lt;/script&gt;</div>}
            {item.visual === "analytics" && <div className="mt-6 flex h-36 items-end gap-2">{[42, 58, 48, 73, 65, 86, 72, 95].map((height, i) => <div key={i} className="flex-1 rounded-t bg-[#dfe6dc]" style={{height:`${height}%`}}><div className="h-1/2 rounded-t bg-moss" /></div>)}</div>}
          </div>
        </div>
        <div className="p-7 sm:p-9">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/45 text-moss"><Icon size={18} /></span><h3 className="text-2xl font-extrabold tracking-[-.045em]">{item.title}</h3></div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">{item.copy}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">{item.points.map((point) => <span key={point} className="flex items-center gap-2 text-xs font-extrabold"><Check size={12} className="text-moss" />{point}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

const stories = [
  { quote: "A guided finder lets a small ecommerce team turn the knowledge in their heads into something every shopper can use.", role: "For ecommerce managers", result: "More confident journeys" },
  { quote: "The recommendation logic remains visible and reliable, while AI does the softer job of explaining why each match makes sense.", role: "For merchandisers", result: "Control without complexity" },
  { quote: "Instead of asking shoppers to understand the catalog, the catalog begins to understand what the shopper is trying to achieve.", role: "For customers", result: "Less searching" },
];

export function StoryCarousel() {
  const [active, setActive] = useState(0);
  const story = stories[active];
  return <div className="grid overflow-hidden rounded-[30px] border border-black/10 bg-ink text-white lg:grid-cols-[1.2fr_.8fr]"><div className="p-8 sm:p-12 lg:p-16"><p className="eyebrow text-lime">{story.role}</p><blockquote className="mt-8 max-w-3xl text-3xl font-extrabold leading-[1.14] tracking-[-.045em] sm:text-4xl">“{story.quote}”</blockquote><div className="mt-10 flex items-center gap-3"><button onClick={() => setActive((active - 1 + stories.length) % stories.length)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 hover:bg-white/10" aria-label="Previous story"><ArrowLeft size={15} /></button><button onClick={() => setActive((active + 1) % stories.length)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 hover:bg-white/10" aria-label="Next story"><ArrowRight size={15} /></button><div className="ml-2 flex gap-1.5">{stories.map((_, i) => <button key={i} aria-label={`Show story ${i + 1}`} onClick={() => setActive(i)} className={`h-1.5 rounded-full transition ${active === i ? "w-7 bg-lime" : "w-1.5 bg-white/20"}`} />)}</div></div></div><div className="relative grid min-h-[330px] place-items-center overflow-hidden bg-lime p-8 text-ink"><div className="dot-grid absolute inset-0 opacity-20" /><div className="relative text-center"><Sparkles className="mx-auto" size={32} /><p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em]">The practical result</p><p className="mt-2 text-4xl font-extrabold tracking-[-.06em]">{story.result}</p></div></div></div>;
}
