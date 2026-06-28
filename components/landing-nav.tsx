"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Boxes, BrainCircuit, ChevronDown, Code2, Footprints, Menu, MessageCircle, PackagePlus, Search, Settings2, ShoppingBag, Sparkles, Store, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

const menus = {
  Platform: {
    intro: "One focused platform for every step of guided product discovery.",
    items: [
      { title: "Product catalog", copy: "Structure the facts behind every match", icon: Boxes, href: "/platform/catalog" },
      { title: "Guided selling", copy: "Build useful, human buying conversations", icon: Sparkles, href: "/platform/guided-selling" },
      { title: "Recommendation engine", copy: "Rank products with reliable rules", icon: BrainCircuit, href: "/platform/recommendation-engine" },
      { title: "AI explanations", copy: "Explain every recommendation clearly", icon: Search, href: "/platform/ai-advisor" },
      { title: "Visual configurators", copy: "Let shoppers build compatible bundles", icon: PackagePlus, href: "/platform/configurators" },
      { title: "Embeddable widget", copy: "Launch on any storefront with one snippet", icon: Code2, href: "/platform/widget" },
      { title: "Journey analytics", copy: "See intent, completion and buying signals", icon: BarChart3, href: "/platform/analytics" },
    ],
  },
  Industries: {
    intro: "Built for products that deserve more guidance than a filter menu can give.",
    items: [
      { title: "Fashion & footwear", copy: "Guide fit, feel, use and personal style", icon: Footprints, href: "/industries" },
      { title: "Beauty & wellness", copy: "Match routines, needs and preferences", icon: Sparkles, href: "/industries" },
      { title: "Home & lifestyle", copy: "Make taste-led decisions feel simple", icon: Store, href: "/industries" },
      { title: "Sports & outdoors", copy: "Connect goals and conditions to the right gear", icon: ShoppingBag, href: "/industries" },
    ],
  },
  Resources: {
    intro: "See the product in action, then build a useful experience of your own.",
    items: [
      { title: "Live product finder", copy: "Experience the customer journey", icon: Sparkles, href: "/finder/quiz_footwear" },
      { title: "Conversational advisor", copy: "Search the catalog in natural language", icon: MessageCircle, href: "/assistant/quiz_footwear" },
      { title: "Visual configurator", copy: "Build a compatible product bundle", icon: PackagePlus, href: "/configurator/config_trail_kit" },
      { title: "Merchant workspace", copy: "Explore catalog, builder and analytics", icon: Settings2, href: "/login" },
      { title: "Quick-start guide", copy: "Go from catalog to launch in minutes", icon: BookOpen, href: "/resources" },
    ],
  },
} as const;

type MenuName = keyof typeof menus;

export function LandingNav() {
  const [open, setOpen] = useState<MenuName | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white">
      <div className="bg-ink px-5 py-2.5 text-center text-xs font-bold text-white">
        <span className="text-lime">✦ New</span>
        <span className="mx-2 text-white/35">·</span>
        Turn product knowledge into a guided buying experience in one afternoon.
        <Link href="/signup" className="ml-2 border-b border-white/40">Start building →</Link>
      </div>
      <div className="border-b border-black/[0.07] bg-white shadow-[0_8px_30px_rgba(24,33,27,.04)]">
        <div className="mx-auto flex h-[88px] max-w-[1440px] items-center px-6 lg:px-10">
          <Logo />
          <nav className="ml-14 hidden h-full items-center gap-8 lg:flex" onMouseLeave={() => setOpen(null)}>
            <Link href="/#why" className="text-[15px] font-semibold text-black/70 transition hover:text-ink">Why Findly</Link>
            {(Object.keys(menus) as MenuName[]).map((name) => (
              <button
                key={name}
                onMouseEnter={() => setOpen(name)}
                onFocus={() => setOpen(name)}
                onClick={() => setOpen(open === name ? null : name)}
                aria-expanded={open === name}
                className="flex h-full items-center gap-1.5 text-[15px] font-semibold text-black/70 transition hover:text-ink"
              >
                {name}<ChevronDown size={14} className={`transition ${open === name ? "rotate-180" : ""}`} />
              </button>
            ))}
            <Link href="/#pricing" className="text-[15px] font-semibold text-black/70 transition hover:text-ink">Pricing</Link>
          </nav>
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            <Link href="/login" className="text-sm font-bold text-black/60 hover:text-ink">Log in</Link>
            <Link href="/signup" className="rounded-full bg-ink px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-moss">Start free <span className="ml-1 text-lime">↗</span></Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-black/10 lg:hidden" aria-label="Toggle navigation">{mobileOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>

      {open && (
        <div onMouseEnter={() => setOpen(open)} onMouseLeave={() => setOpen(null)} className="absolute left-0 right-0 hidden border-b border-black/10 bg-white shadow-[0_30px_70px_rgba(20,30,24,.12)] lg:block">
          <div className="mx-auto grid max-w-[1360px] grid-cols-[280px_1fr] gap-10 px-10 py-8">
            <div className="rounded-2xl bg-[#f1f3ed] p-6">
              <p className="eyebrow text-moss">{open}</p>
              <p className="mt-4 text-xl font-extrabold leading-tight tracking-[-.03em]">{menus[open].intro}</p>
              <Link href={open === "Platform" ? "/platform" : open === "Industries" ? "/industries" : "/resources"} onClick={() => setOpen(null)} className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Explore {open.toLowerCase()} <span>→</span></Link>
            </div>
            <div className={`grid gap-2 ${menus[open].items.length > 4 ? "grid-cols-3" : "grid-cols-2"}`}>
              {menus[open].items.map(({ title, copy, icon: Icon, href }) => (
                <Link key={title} href={href} onClick={() => setOpen(null)} className="group flex gap-4 rounded-2xl p-4 transition hover:bg-[#f6f7f3]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime/45 text-moss transition group-hover:bg-lime"><Icon size={17} /></span>
                  <span><span className="block text-sm font-extrabold">{title}</span><span className="mt-1 block text-xs leading-4 text-black/40">{copy}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="border-b border-black/10 bg-white px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-1">
            {[
              ["Why Findly", "/#why"],
              ["Platform", "/platform"],
              ["Industries", "/industries"],
              ["Resources", "/resources"],
              ["Pricing", "/#pricing"],
            ].map(([label, href]) => <Link onClick={() => setMobileOpen(false)} key={label} href={href} className="rounded-xl px-3 py-3 font-semibold hover:bg-canvas">{label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-2"><Link href="/login" className="btn-secondary">Log in</Link><Link href="/signup" className="btn-primary">Start free</Link></div>
          </nav>
        </div>
      )}
    </header>
  );
}
