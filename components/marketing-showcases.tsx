"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Boxes, Check, Code2, Database, Eye, Layers3, MousePointerClick, Search, Sparkles } from "lucide-react";
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

const heroStorySteps = [
  {
    id: "catalog",
    eyebrow: "Step 1 · Catalog imported",
    title: "Your products become recommendation-ready.",
    copy: "Upload a CSV or add products manually with prices, images, tags, features and Buy Now links.",
    icon: Database,
  },
  {
    id: "questions",
    eyebrow: "Step 2 · Guided questions",
    title: "Sellentum asks like a helpful salesperson.",
    copy: "Create a short buying flow and connect each answer to tags, categories, features or budget logic.",
    icon: Layers3,
  },
  {
    id: "recommend",
    eyebrow: "Step 3 · Best-fit products",
    title: "Rules select the right 1–3 products.",
    copy: "Product selection is deterministic, stable and traceable before AI writes any shopper-facing copy.",
    icon: Search,
  },
  {
    id: "explain",
    eyebrow: "Step 4 · AI explanation",
    title: "AI explains why each product fits.",
    copy: "The explanation uses only the shopper answers and selected product facts, so it feels useful without becoming random.",
    icon: Sparkles,
  },
  {
    id: "embed",
    eyebrow: "Step 5 · Embed and prove",
    title: "Copy one snippet, then track the full journey.",
    copy: "The widget runs on your store and records views, starts, completions, recommendations and Buy Now clicks.",
    icon: Code2,
  },
] as const;

export function HeroDiscoveryDemo() {
  const [active, setActive] = useState(0);
  const scene = heroStorySteps[active];
  const SceneIcon = scene.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % heroStorySteps.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto max-w-[1180px]">
      <div className="absolute -inset-8 rounded-[56px] bg-[radial-gradient(circle_at_16%_20%,rgba(217,255,97,.55),transparent_36%),radial-gradient(circle_at_88%_42%,rgba(255,189,138,.34),transparent_35%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[34px] border border-black/10 bg-[#101912] p-2 shadow-[0_40px_120px_rgba(28,39,32,.24)]">
        <div className="overflow-hidden rounded-[26px] bg-[#f7f8f3]">
          <div className="flex items-center justify-between border-b border-black/[0.07] bg-white/80 px-5 py-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff8d7a]" />
              <span className="h-3 w-3 rounded-full bg-[#ffd25f]" />
              <span className="h-3 w-3 rounded-full bg-lime" />
              <span className="ml-3 rounded-full bg-[#eef1e8] px-4 py-2 text-xs font-extrabold text-black/45">sellentum.com/product-finder</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">Sellentum product finder story</span>
              <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-extrabold text-black/40">Auto demo</span>
            </div>
          </div>

          <div className="grid min-h-[610px] lg:grid-cols-[360px_1fr]">
            <aside className="border-r border-black/[0.07] bg-white p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lime"><Sparkles size={18} /></span>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">How it works</p>
                  <h3 className="text-2xl font-extrabold tracking-[-.055em]">From catalog to confident shopper.</h3>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                {heroStorySteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = active === index;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActive(index)}
                      aria-pressed={isActive}
                      className={`group w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${isActive ? "border-ink bg-ink text-white shadow-xl" : "border-black/[0.07] bg-[#f7f8f3] text-ink hover:border-black/20 hover:bg-white"}`}
                    >
                      <span className="flex items-start gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isActive ? "bg-lime text-ink" : "bg-white text-moss ring-1 ring-black/[0.06]"}`}>
                          <StepIcon size={15} />
                        </span>
                        <span>
                          <span className={`block text-xs font-extrabold uppercase tracking-[.12em] ${isActive ? "text-lime" : "text-moss"}`}>{step.eyebrow}</span>
                          <span className="mt-1 block text-sm font-extrabold leading-snug tracking-[-.02em]">{step.title}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 rounded-2xl border border-black/[0.07] bg-[#f7f8f3] p-4">
                <p className="text-xs font-extrabold text-moss">What visitors understand</p>
                <p className="mt-2 text-sm leading-6 text-black/50">Sellentum is not just a chatbot. It is a controlled ecommerce product finder that recommends, explains, embeds and measures.</p>
              </div>
            </aside>

            <section className="relative overflow-hidden bg-[radial-gradient(circle_at_78%_16%,rgba(217,255,97,.72),transparent_32%),linear-gradient(135deg,#eef2e7_0%,#fff5eb_100%)] p-8">
              <div className="dot-grid absolute inset-0 opacity-20" />
              <div className="relative grid h-full gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="eyebrow text-moss">{scene.eyebrow}</p>
                    <h3 className="mt-3 max-w-2xl text-5xl font-extrabold leading-[.98] tracking-[-.065em]">{scene.title}</h3>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-black/52">{scene.copy}</p>
                  </div>
                  <span className="grid h-16 w-16 place-items-center rounded-[22px] border border-black/10 bg-white/70 text-moss shadow-lg backdrop-blur">
                    <SceneIcon size={24} />
                  </span>
                </div>

                <div key={scene.id} className="animate-rise">
                  <HeroStoryScene sceneId={scene.id} />
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs font-extrabold text-black/35">
                    <span>Product finder launch flow</span>
                    <span>{active + 1}/{heroStorySteps.length}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {heroStorySteps.map((step, index) => (
                      <button key={step.id} onClick={() => setActive(index)} aria-label={`Show ${step.eyebrow}`} className="h-2 overflow-hidden rounded-full bg-white/70 shadow-inner">
                        <span className={`block h-full rounded-full transition-all duration-500 ${index <= active ? "w-full bg-ink" : "w-0 bg-ink"}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStoryScene({ sceneId }: { sceneId: (typeof heroStorySteps)[number]["id"] }) {
  if (sceneId === "catalog") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">Catalog import</p>
            <span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">CSV ready</span>
          </div>
          <div className="mt-5 space-y-3">
            {demoMatches.map((product, index) => (
              <div key={product.name} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 rounded-2xl border border-black/[0.07] bg-[#f8faf4] p-3">
                <div className="relative h-14 overflow-hidden rounded-xl bg-[#e9ece5]"><img src={product.image} alt="" className="h-full w-full object-cover" /></div>
                <div>
                  <p className="text-sm font-extrabold tracking-[-.025em]">{product.name}</p>
                  <p className="mt-1 text-xs font-bold text-black/35">{product.tags.join(" · ")}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold shadow-sm">{index === 0 ? "active" : "mapped"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] bg-ink p-5 text-white shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-lime">What Sellentum reads</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {["Name", "Price", "Image URL", "Category", "Features", "Buy Now URL"].map((field) => (
              <div key={field} className="rounded-2xl bg-white/[.06] p-4">
                <Check size={14} className="text-lime" />
                <p className="mt-3 text-sm font-extrabold">{field}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-lime/25 bg-lime/10 p-4 text-xs leading-5 text-white/58">Clean catalog data gives the recommendation engine enough facts to make repeatable product choices.</div>
        </div>
      </div>
    );
  }

  if (sceneId === "questions") {
    return (
      <div className="grid gap-4 xl:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="eyebrow text-moss">Question 1 of 3</p>
            <span className="rounded-full bg-[#eef1e8] px-3 py-1.5 text-xs font-extrabold text-black/45">Finder preview</span>
          </div>
          <h4 className="mt-5 text-4xl font-extrabold leading-[1] tracking-[-.06em]">Where will you use them most?</h4>
          <div className="mt-6 space-y-3">
            {["Weekend trails", "City walking", "Fast road runs"].map((answer, index) => (
              <div key={answer} className={`flex items-center justify-between rounded-2xl border p-4 ${index === 0 ? "border-ink bg-ink text-white shadow-lg" : "border-black/[0.08] bg-[#f8faf4]"}`}>
                <span className="flex items-center gap-3 text-sm font-extrabold">
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${index === 0 ? "bg-lime text-ink" : "bg-white text-black/35 ring-1 ring-black/10"}`}>{index === 0 ? <Check size={13} /> : String.fromCharCode(65 + index)}</span>
                  {answer}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${index === 0 ? "bg-lime/15 text-lime" : "bg-white text-black/35"}`}>{index === 0 ? "tag: trail" : "rule ready"}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full w-1/3 rounded-full bg-lime" /></div>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white/80 p-6 shadow-xl backdrop-blur">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">Merchant rule mapping</p>
          <div className="mt-5 space-y-3">
            {[
              ["Answer", "Weekend trails"],
              ["Match signal", "tag contains trail"],
              ["Feature boost", "cushioned + weather-ready"],
              ["Budget rule", "exclude over shopper budget"],
            ].map(([label, value], index) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime/45 text-xs font-extrabold">{index + 1}</span>
                <span className="text-xs font-bold text-black/35">{label}</span>
                <span className="ml-auto text-sm font-extrabold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sceneId === "recommend") {
    return (
      <div className="rounded-[26px] border border-black/10 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-moss">Your best matches</p>
          <span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold text-ink">3 recommendations</span>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {demoMatches.map((product, index) => (
            <article key={product.name} className={`overflow-hidden rounded-[22px] border bg-white ${index === 0 ? "border-ink shadow-2xl" : "border-black/[0.08]"}`}>
              <div className="relative h-48 overflow-hidden bg-[#e9ece5]">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-extrabold ${index === 0 ? "bg-lime text-ink" : "bg-white/85 text-black/45"}`}>{index === 0 ? "Best match" : `${88 - index * 6}% match`}</span>
              </div>
              <div className="p-5">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">Running shoes</p>
                <h4 className="mt-2 text-xl font-extrabold leading-tight tracking-[-.04em]">{product.name}</h4>
                <p className="mt-1 text-sm font-extrabold">{formatCurrency(product.price)}</p>
                <p className="mt-4 min-h-[64px] rounded-2xl bg-[#f3f5ef] p-3 text-xs leading-5 text-black/52">{product.reason}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (sceneId === "explain") {
    return (
      <div className="grid gap-4 xl:grid-cols-[.92fr_1.08fr]">
        <div className="rounded-[24px] bg-ink p-6 text-white shadow-xl">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-lime">Recommendation trace</p>
          <div className="mt-6 space-y-3">
            {[
              ["Shopper need", "Weekend trails"],
              ["Tag matched", "trail · weight 5"],
              ["Feature matched", "soft cushioning"],
              ["Budget passed", "£128 under budget"],
              ["Selected product", "Terra Trail Runner"],
            ].map(([label, value], index) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-4">
                <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-extrabold ${index === 4 ? "bg-lime text-ink" : "bg-white/10 text-white"}`}>{index + 1}</span>
                <span className="text-xs text-white/38">{label}</span>
                <span className="ml-auto text-sm font-extrabold">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Sparkles size={18} /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">AI explanation</p>
              <p className="text-sm font-bold text-black/40">Generated after rules select the product</p>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            <div className="ml-auto max-w-[78%] rounded-3xl rounded-br-md bg-ink p-4 text-sm leading-6 text-white">I need something cushioned for wet weekend trails under £140.</div>
            <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-[#eef1e8] p-4 text-sm leading-6 text-black/58">
              <b className="text-moss">Why Terra Trail Runner fits:</b> it matched your trail use, cushioning preference and budget. The grip and rain-ready signals make it the safest first recommendation.
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {["No black-box selection", "Catalog facts only", "Human-readable reason"].map((label) => <span key={label} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-extrabold text-black/45">{label}</span>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <div className="rounded-[24px] bg-ink p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-[.14em] text-lime">Embed snippet</p>
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold">Any storefront</span>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 font-mono text-xs leading-6 text-lime">
          &lt;script<br />
          &nbsp;&nbsp;src=&quot;https://www.sellentum.com/api/widget.js&quot;<br />
          &nbsp;&nbsp;data-experience=&quot;finder&quot;<br />
          &nbsp;&nbsp;data-id=&quot;quiz_footwear&quot;<br />
          &nbsp;&nbsp;async<br />
          &gt;&lt;/script&gt;
        </div>
        <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink">Copy widget code <ArrowRight size={13} /></button>
      </div>
      <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-xl">
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-moss">First live proof</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ["1.2k", "widget views", Eye],
            ["642", "quiz starts", Layers3],
            ["511", "completed", Check],
            ["184", "buy clicks", MousePointerClick],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Eye;
            return (
              <div key={String(label)} className="rounded-2xl bg-[#f3f5ef] p-4">
                <MetricIcon size={15} className="text-moss" />
                <p className="mt-4 text-3xl font-extrabold tracking-[-.06em]">{String(value)}</p>
                <p className="text-xs font-bold text-black/35">{String(label)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-2xl border border-black/[0.07] p-4">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span>Proof checklist</span>
            <span className="text-moss">5/5 events</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-black/5"><div className="h-full w-full rounded-full bg-lime" /></div>
          <p className="mt-3 text-xs leading-5 text-black/45">widget_view, quiz_start, quiz_complete, product_recommended and buy_click are captured from one shopper journey.</p>
        </div>
      </div>
    </div>
  );
}

export function AudienceExperience() {
  const [mode, setMode] = useState<"shoppers" | "teams">("shoppers");
  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full bg-black/[0.06] p-1.5">
        <button onClick={() => setMode("shoppers")} aria-pressed={mode === "shoppers"} className={`rounded-full px-6 py-3 text-xs font-extrabold transition ${mode === "shoppers" ? "bg-ink text-white shadow-lg" : "text-black/45"}`}>For shoppers</button>
        <button onClick={() => setMode("teams")} aria-pressed={mode === "teams"} className={`rounded-full px-6 py-3 text-xs font-extrabold transition ${mode === "teams" ? "bg-ink text-white shadow-lg" : "text-black/45"}`}>For commerce teams</button>
      </div>
      <div className="mt-8 grid overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-soft lg:grid-cols-[.92fr_1.08fr]">
        <div className="p-8 sm:p-12 lg:p-14"><p className="eyebrow text-moss">{mode === "shoppers" ? "Guided discovery" : "Repeatable expertise"}</p><h3 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.03] tracking-[-.055em] sm:text-5xl">{mode === "shoppers" ? <>Turn a few answers into <span className="text-moss">a confident choice.</span></> : <>Turn product knowledge into <span className="text-moss">a scalable sales experience.</span></>}</h3><p className="mt-5 max-w-lg text-sm leading-6 text-black/50">{mode === "shoppers" ? "Replace endless browsing with a short, thoughtful conversation that narrows a complex catalog to the products that genuinely fit." : "Give merchandising teams a visual builder, reliable matching controls, live brand settings and the signals they need to keep improving."}</p><div className="mt-7 grid gap-2 sm:grid-cols-2">{(mode === "shoppers" ? ["Questions that feel useful", "1–3 focused recommendations", "Clear reasons for every match", "Direct paths to purchase"] : ["CSV and manual catalog tools", "Tag, category, feature and budget rules", "One-click publishing", "Views, completions and buying intent"]).map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-[#f3f5ef] px-3 py-3 text-xs font-extrabold"><span className="grid h-5 w-5 place-items-center rounded-full bg-lime"><Check size={11} /></span>{item}</div>)}</div><a href={mode === "shoppers" ? "/finder/quiz_footwear" : "/login"} className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-xs font-extrabold text-white">{mode === "shoppers" ? "Try the live finder" : "Explore the workspace"}<ArrowRight size={14} /></a></div>
        <div className="relative min-h-[540px] overflow-hidden bg-[radial-gradient(circle_at_75%_20%,rgba(217,255,97,.8),transparent_35%),linear-gradient(135deg,#edf0e8,#fff2e7)] p-8 sm:p-12">{mode === "shoppers" ? <div className="grid h-full place-items-center"><div className="w-full max-w-md rotate-2 rounded-[26px] border border-black/10 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-extrabold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-lime"><Sparkles size={12} /></span>Your matches</span><span className="rounded-full bg-lime px-2 py-1 text-xs font-extrabold">3 found</span></div><div className="mt-5 grid grid-cols-2 gap-3">{demoMatches.slice(0, 2).map((item, i) => <div key={item.name} className="overflow-hidden rounded-xl border border-black/10"><div className="relative h-32"><img src={item.image} alt="" className="h-full w-full object-cover" />{i === 0 && <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-1 text-xs font-extrabold">BEST MATCH</span>}</div><div className="p-3"><p className="text-xs font-extrabold">{item.name}</p><p className="mt-1 text-xs text-black/40">{formatCurrency(item.price)}</p></div></div>)}</div><div className="mt-4 rounded-xl bg-[#f3f5ef] p-3"><p className="text-xs font-extrabold text-moss">✦ WHY IT FITS</p><p className="mt-1 text-xs leading-4 text-black/45">Matched to the use, feel and budget preferences you shared.</p></div></div></div> : <div className="grid h-full place-items-center"><div className="w-full max-w-md -rotate-2 rounded-[26px] border border-black/10 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-moss">Analytics</p><p className="mt-1 text-sm font-extrabold">Product finder performance</p></div><BarChart3 size={18} className="text-moss" /></div><div className="mt-5 grid grid-cols-3 gap-2">{[["1,284", "Views"], ["667", "Completed"], ["184", "Buy clicks"]].map(([value, label]) => <div key={label} className="rounded-xl bg-[#f3f5ef] p-3"><p className="text-lg font-extrabold">{value}</p><p className="text-xs text-black/35">{label}</p></div>)}</div><div className="mt-5 flex h-44 items-end gap-2">{[38, 55, 45, 68, 62, 79, 58, 85, 73, 92].map((height, i) => <div key={i} className="flex-1 rounded-t bg-moss" style={{height:`${height}%`}}><div className="h-[35%] rounded-t bg-lime" /></div>)}</div></div></div>}</div>
      </div>
    </div>
  );
}

const capabilities = [
  { title: "Upload your products", copy: "Add products manually or import a CSV with names, prices, images, categories, features, tags and product links.", icon: Database, points: ["Manual product CRUD", "CSV import", "Product links"], visual: "catalog" },
  { title: "Ask buying questions", copy: "Build a short product finder from the questions a helpful salesperson would ask in-store.", icon: Layers3, points: ["Multiple questions", "Answer options", "Edit anytime"], visual: "builder" },
  { title: "Match with rules", copy: "Connect answers to tags, categories, features and budget so product selection is stable and understandable.", icon: Search, points: ["Weighted matching", "Budget checks", "Repeatable ranking"], visual: "rules" },
  { title: "Explain each match", copy: "Use AI to write clear, grounded reasons after the rules have selected the recommended products.", icon: Sparkles, points: ["AI explanation copy", "Catalog facts only", "Fallback copy"], visual: "ai" },
  { title: "Embed on your store", copy: "Copy one snippet to open the product finder as a branded widget on your ecommerce website.", icon: Code2, points: ["One script", "Brand controls", "Any storefront"], visual: "embed" },
  { title: "Track the journey", copy: "See whether shoppers view the widget, start the finder, complete it, see recommendations and click Buy Now.", icon: BarChart3, points: ["Five core events", "Product signals", "Proof packet"], visual: "analytics" },
] as const;

export function CapabilityExplorer() {
  const [active, setActive] = useState(0);
  const item = capabilities[active];
  const Icon = item.icon;
  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        {capabilities.map(({ title, copy, icon: ItemIcon }, index) => (
          <button key={title} onClick={() => setActive(index)} aria-label={`${title}: ${copy}`} aria-pressed={active === index} className={`min-h-[150px] rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${active === index ? "border-ink bg-white shadow-lg ring-1 ring-ink" : "border-black/10 bg-white/55 hover:bg-white"}`}>
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
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lime"><Icon size={18} /></span><span className="rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">Sellentum engine</span></div>
            {item.visual === "catalog" && <div className="mt-5 space-y-2">{["Terra Trail Runner", "Aero City Knit", "Pulse Tempo Pro"].map((name, i) => <div key={name} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef0eb]"><Boxes size={13} /></span><span className="flex-1 text-xs font-extrabold">{name}</span><span className="text-xs text-black/30">{i === 0 ? "trail · cushioned" : i === 1 ? "city · light" : "road · speed"}</span></div>)}</div>}
            {item.visual === "builder" && <div className="mt-5 space-y-2">{["Where will you wear them?", "What matters underfoot?", "What is your budget?"].map((name, i) => <div key={name} className="flex items-center gap-3 rounded-xl border border-black/[0.07] p-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-lime/50 text-xs font-extrabold">{i + 1}</span><span className="text-xs font-extrabold">{name}</span></div>)}</div>}
            {item.visual === "rules" && <div className="mt-5 rounded-xl border border-black/[0.07] p-4"><p className="text-xs font-extrabold">If answer is “Weekend trails”</p><div className="mt-3 flex items-center gap-2 text-xs"><span className="rounded-lg bg-[#eef0eb] px-2.5 py-2">Product tag</span><span>is</span><span className="rounded-lg bg-lime/50 px-2.5 py-2 font-extrabold">trail</span><span className="ml-auto rounded-full bg-ink px-2 py-1 text-xs text-white">High weight</span></div></div>}
            {item.visual === "ai" && <div className="mt-5 space-y-3"><div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink p-3 text-xs leading-4 text-white">I need something cushioned for wet weekend trails.</div><div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-[#eef0eb] p-3 text-xs leading-4 text-black/55"><b className="text-moss">Why Terra fits:</b> Trail grip and soft cushioning match the conditions and feel you described.</div></div>}
            {item.visual === "embed" && <div className="mt-5 rounded-xl bg-ink p-4 font-mono text-xs leading-5 text-lime">&lt;script<br />&nbsp;&nbsp;src=&quot;https://www.sellentum.com/api/widget.js&quot;<br />&nbsp;&nbsp;data-experience=&quot;configurator&quot;<br />&nbsp;&nbsp;data-id=&quot;trail-kit&quot;<br />&nbsp;&nbsp;async<br />&gt;&lt;/script&gt;</div>}
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
