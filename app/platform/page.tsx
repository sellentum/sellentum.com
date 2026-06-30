import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { platformPages } from "@/lib/marketing-pages";

export default function PlatformOverviewPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_10%,rgba(217,255,97,.35),transparent_45%)]" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <p className="eyebrow text-moss">Sellentum platform</p>
          <h1 className="mx-auto mt-6 max-w-5xl text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">A practical product discovery suite for small ecommerce teams.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-black/52">Catalog enrichment, guided selling, semantic discovery, configurators, embeds and analytics—built as one focused MVP instead of an enterprise maze.</p>
          <div className="mt-9 flex justify-center gap-3"><Link href="/signup" className="btn-primary">Start building <ArrowRight size={15} /></Link><Link href="/configurator/config_trail_kit" className="btn-secondary">Try configurator</Link></div>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-3">
          {platformPages.map((page, index) => (
            <Link key={page.slug} href={`/platform/${page.slug}`} className="group rounded-[28px] border border-black/10 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="flex items-start justify-between"><span className="text-xs font-extrabold tracking-[.16em] text-moss">{String(index + 1).padStart(2, "0")}</span><span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/50 transition group-hover:bg-lime"><Sparkles size={18} /></span></div>
              <p className="eyebrow mt-12 text-moss">{page.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-.045em]">{page.title}</h2>
              <p className="mt-4 text-xs leading-5 text-black/45">{page.description}</p>
              <div className="mt-6 grid gap-2">{page.points.slice(0, 3).map((point) => <span key={point} className="flex items-center gap-2 text-xs font-extrabold text-black/55"><Check size={12} className="text-moss" />{point}</span>)}</div>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Explore <ArrowRight size={13} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 rounded-[32px] bg-ink p-9 text-center text-white lg:flex-row lg:p-12 lg:text-left">
          <div><p className="eyebrow text-lime">Ready to test the workflow?</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-.06em]">Open the demo workspace and build from the catalog.</h2></div>
          <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Open workspace <ArrowRight size={15} /></Link>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
