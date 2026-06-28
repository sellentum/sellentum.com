import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, MessageCircle, PackagePlus, Rocket, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { Logo } from "@/components/logo";

const resources = [
  { label: "Live product finder", title: "Answer guided questions and get 1–3 reliable product recommendations.", href: "/finder/quiz_footwear", icon: Sparkles },
  { label: "Conversational advisor", title: "Describe a need in natural language and see semantic catalog matching.", href: "/assistant/quiz_footwear", icon: MessageCircle },
  { label: "Visual configurator", title: "Build a compatible trail bundle with live price updates.", href: "/configurator/config_trail_kit", icon: PackagePlus },
  { label: "Merchant workspace", title: "Explore product import, builders, analytics and widget settings.", href: "/login", icon: BarChart3 },
  { label: "Launch Studio", title: "Enrich products, generate a finder, publish it and copy the widget snippet.", href: "/dashboard/launch", icon: Rocket },
  { label: "Platform overview", title: "See how the catalog, rules, AI and analytics fit together.", href: "/platform", icon: BookOpen },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_40%)]" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <p className="eyebrow text-moss">Resources</p>
          <h1 className="mx-auto mt-6 max-w-5xl text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">Demo the product discovery loop end to end.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-black/52">Use these routes to test the shopper experiences and the merchant workspace without needing a full ecommerce integration.</p>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-3">
          {resources.map(({ label, title, href, icon: Icon }) => (
            <Link key={label} href={href} className="group rounded-[28px] border border-black/10 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss transition group-hover:bg-lime"><Icon size={20} /></span>
              <p className="eyebrow mt-12 text-moss">{label}</p>
              <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-.045em]">{title}</h2>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Open <ArrowRight size={13} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1280px] rounded-[32px] bg-ink p-10 text-white">
          <p className="eyebrow text-lime">Suggested test path</p>
          <div className="mt-7 grid gap-3 lg:grid-cols-4">
            {["Open Launch Studio", "Enrich products", "Generate and publish a finder", "Copy the widget snippet"].map((step, index) => <div key={step} className="rounded-2xl bg-white/[.06] p-5"><span className="text-xs font-extrabold text-lime">0{index + 1}</span><p className="mt-8 text-xl font-extrabold tracking-[-.04em]">{step}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-10 lg:px-10"><div className="mx-auto flex max-w-[1280px] items-center justify-between text-xs font-bold text-black/35"><Logo /><span>© 2026 Sellentum</span></div></footer>
    </main>
  );
}
