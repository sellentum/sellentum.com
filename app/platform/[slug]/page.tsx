import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { platformPageMap, platformPages } from "@/lib/marketing-pages";

export function generateStaticParams() {
  return platformPages.map((page) => ({ slug: page.slug }));
}

export default async function PlatformDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = platformPageMap.get(slug);
  if (!page) notFound();
  const related = platformPages.filter((item) => item.slug !== page.slug).slice(0, 3);

  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(217,255,97,.35),transparent_34%),linear-gradient(135deg,#fff,#f6f8ee)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div>
            <p className="eyebrow text-moss">{page.eyebrow}</p>
            <h1 className="mt-6 text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">{page.title}</h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-black/52">{page.description}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href={page.demoHref} className="btn-primary">{page.demoLabel} <ArrowRight size={15} /></Link><Link href="/platform" className="btn-secondary">All platform</Link></div>
          </div>
          <div className="rounded-[34px] border border-black/10 bg-white p-5 shadow-[0_35px_90px_rgba(24,33,27,.12)]">
            <div className="rounded-[26px] bg-ink p-7 text-white">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Sparkles size={20} /></span>
              <h2 className="mt-10 text-4xl font-extrabold tracking-[-.06em]">What this unlocks</h2>
              <div className="mt-7 grid gap-3">
                {page.points.map((point) => <div key={point} className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-4 text-xs font-extrabold"><span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink"><Check size={12} /></span>{point}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[.78fr_1.22fr]">
          <div><p className="eyebrow text-moss">Why it matters</p><h2 className="mt-4 text-5xl font-extrabold tracking-[-.065em]">Built for the real MVP, not imaginary enterprise complexity.</h2></div>
          <div className="grid gap-3">
            {page.proof.map((item, index) => <article key={item} className="rounded-2xl border border-black/10 bg-white p-6"><span className="text-xs font-extrabold text-moss">{String(index + 1).padStart(2, "0")}</span><p className="mt-5 text-xl font-extrabold tracking-[-.04em]">{item}</p></article>)}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex items-end justify-between gap-6"><div><p className="eyebrow text-moss">Related platform areas</p><h2 className="mt-4 text-5xl font-extrabold tracking-[-.065em]">Keep exploring.</h2></div><Link href="/signup" className="hidden items-center gap-2 text-xs font-extrabold text-moss sm:flex">Start free <ExternalLink size={12} /></Link></div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">{related.map((item) => <Link key={item.slug} href={`/platform/${item.slug}`} className="rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"><p className="eyebrow text-moss">{item.eyebrow}</p><h3 className="mt-4 text-2xl font-extrabold tracking-[-.05em]">{item.title}</h3><p className="mt-3 text-xs leading-5 text-black/45">{item.description}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Explore <ArrowRight size={13} /></span></Link>)}</div>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
