import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Rocket, ShieldCheck } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const contactPaths = [
  {
    title: "Launch support",
    copy: "For help importing a catalog, publishing your first finder or installing the widget on a storefront.",
    href: "mailto:hello@sellentum.com?subject=Sellentum%20launch%20support",
    icon: Rocket,
  },
  {
    title: "Product questions",
    copy: "For roadmap, pricing, implementation or guided-selling strategy questions.",
    href: "mailto:hello@sellentum.com?subject=Sellentum%20product%20question",
    icon: MessageCircle,
  },
  {
    title: "Security and privacy",
    copy: "For responsible disclosure, data handling questions or production security concerns.",
    href: "mailto:hello@sellentum.com?subject=Sellentum%20security%20or%20privacy",
    icon: ShieldCheck,
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
          <div>
            <p className="eyebrow text-moss">Contact</p>
            <h1 className="mt-6 text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">Talk to Sellentum.</h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-black/52">
              Whether you are testing your first catalog, preparing a storefront install or checking if Sellentum fits your category, start here.
            </p>
            <a href="mailto:hello@sellentum.com" className="mt-9 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5">
              Email hello@sellentum.com <Mail size={15} className="text-lime" />
            </a>
          </div>
          <div className="rounded-[34px] border border-black/10 bg-[#f8f6f1] p-5 shadow-[0_35px_90px_rgba(24,33,27,.10)]">
            <div className="rounded-[26px] bg-white p-8">
              <p className="eyebrow text-moss">Fastest useful message</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-.06em]">Send the catalog type, current platform and launch goal.</h2>
              <div className="mt-7 grid gap-3 text-xs font-bold text-black/45">
                {["What do you sell?", "Where will the widget be installed?", "Do you already have a product CSV?", "What does a successful first launch look like?"].map((item, index) => (
                  <p key={item} className="rounded-2xl bg-canvas p-4"><span className="mr-3 text-moss">0{index + 1}</span>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-3">
          {contactPaths.map(({ title, copy, href, icon: Icon }) => (
            <a key={title} href={href} className="group rounded-[28px] border border-black/10 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss transition group-hover:bg-lime"><Icon size={20} /></span>
              <h2 className="mt-12 text-2xl font-extrabold tracking-[-.045em]">{title}</h2>
              <p className="mt-4 text-sm leading-6 text-black/50">{copy}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Send email <ArrowRight size={13} /></span>
            </a>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-6 rounded-[32px] bg-ink p-9 text-center text-white lg:flex-row lg:p-12 lg:text-left">
          <div><p className="eyebrow text-lime">Want to explore first?</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-.06em]">Open the demo workspace and see the product loop.</h2></div>
          <Link href="/login" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Open workspace <ArrowRight size={15} /></Link>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
