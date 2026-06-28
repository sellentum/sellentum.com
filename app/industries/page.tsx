import Link from "next/link";
import { ArrowRight, Check, Footprints, ShoppingBag, Sparkles, Store } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { Logo } from "@/components/logo";

const industries = [
  { title: "Fashion & footwear", icon: Footprints, copy: "Guide fit, feel, intended use and style without forcing shoppers through endless filters.", journeys: ["Shoe finder", "Trail kit configurator", "Fit and comfort advisor"] },
  { title: "Beauty & wellness", icon: Sparkles, copy: "Translate routines, goals, sensitivities and preferences into grounded product matches.", journeys: ["Routine builder", "Ingredient-aware finder", "Bundle recommendation"] },
  { title: "Home & lifestyle", icon: Store, copy: "Make taste-led and feature-heavy decisions easier for shoppers comparing many similar products.", journeys: ["Room-style finder", "Gift advisor", "Configurable sets"] },
  { title: "Sports & outdoors", icon: ShoppingBag, copy: "Connect goals, terrain, conditions and experience level to the right gear or bundle.", journeys: ["Equipment finder", "Weather-ready kit", "Performance advisor"] },
];

export default function IndustriesPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <p className="eyebrow text-moss">Industries</p>
          <h1 className="mx-auto mt-6 max-w-5xl text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">For ecommerce catalogs where choice needs guidance.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-black/52">Sellentum is best for products where shoppers need context: use case, fit, conditions, compatibility, budget, style or routine.</p>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-2">
          {industries.map(({ title, icon: Icon, copy, journeys }, index) => (
            <article key={title} className="overflow-hidden rounded-[30px] border border-black/10 bg-white">
              <div className={`relative h-56 p-8 ${index === 0 ? "bg-lime" : index === 1 ? "bg-[#ffd5b6]" : index === 2 ? "bg-[#cbd9d0]" : "bg-[#d7d4ff]"}`}>
                <div className="absolute inset-0 dot-grid opacity-20" />
                <div className="relative flex h-full items-start justify-between"><span className="text-xs font-extrabold tracking-[.16em]">0{index + 1}</span><span className="grid h-16 w-16 place-items-center rounded-2xl border border-black/10 bg-white/60"><Icon size={25} /></span></div>
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-extrabold tracking-[-.055em]">{title}</h2>
                <p className="mt-4 text-sm leading-6 text-black/50">{copy}</p>
                <div className="mt-6 grid gap-2">{journeys.map((journey) => <span key={journey} className="flex items-center gap-2 text-xs font-extrabold"><Check size={13} className="text-moss" />{journey}</span>)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto rounded-[32px] bg-ink p-10 text-center text-white lg:max-w-[1280px]">
          <p className="eyebrow text-lime">Start with one journey</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-5xl font-extrabold leading-[.98] tracking-[-.065em]">Upload products, build a finder, then add advisor or configurator depth.</h2>
          <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Start building <ArrowRight size={15} /></Link>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-10 lg:px-10"><div className="mx-auto flex max-w-[1280px] items-center justify-between text-xs font-bold text-black/35"><Logo /><span>© 2026 Sellentum</span></div></footer>
    </main>
  );
}
