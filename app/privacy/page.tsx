import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const sections = [
  {
    title: "Information merchants provide",
    copy: "Sellentum stores account details, workspace settings, brand configuration, product catalog data, finder questions, answer logic, widget settings and related dashboard content that merchants add to the product.",
  },
  {
    title: "Shopper interaction data",
    copy: "Embedded experiences may record product-finder views, starts, answers, recommendations, search/advisor prompts, configurator selections, feedback and Buy Now clicks so merchants can understand guided-selling performance.",
  },
  {
    title: "How AI is used",
    copy: "AI may help draft explanations, enrich catalog language or generate experience blueprints. Product selection is designed to remain deterministic and based on catalog/rule data rather than open-ended AI product picking.",
  },
  {
    title: "Service providers",
    copy: "The MVP uses infrastructure providers such as Vercel, Supabase and OpenAI. Environment keys and service-role credentials must be stored server-side and should not be exposed in public browser code.",
  },
  {
    title: "Data controls",
    copy: "Merchants can edit or remove products, settings and experiences from the dashboard. Production deletion/export workflows should be reviewed before a broad commercial launch.",
  },
  {
    title: "Contact",
    copy: "Questions about this policy or Sellentum data handling can be sent to hello@sellentum.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1100px]">
          <p className="eyebrow text-moss">Privacy Policy</p>
          <h1 className="mt-6 text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">How Sellentum handles product and journey data.</h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-black/52">
            This is a practical MVP privacy notice for early Sellentum use. It should be reviewed by a qualified legal professional before broad commercial launch.
          </p>
          <p className="mt-5 text-xs font-bold text-black/35">Last updated: 30 June 2026</p>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1100px] gap-4">
          {sections.map((section, index) => (
            <article key={section.title} className="rounded-[28px] border border-black/10 bg-white p-8">
              <span className="text-xs font-extrabold tracking-[.16em] text-moss">{String(index + 1).padStart(2, "0")}</span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-[-.055em]">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-black/52">{section.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-6 rounded-[32px] bg-ink p-9 text-center text-white lg:flex-row lg:p-12 lg:text-left">
          <div><p className="eyebrow text-lime">Need a data question answered?</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-.06em]">Contact Sellentum before sending sensitive production data.</h2></div>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Contact us <ArrowRight size={15} /></Link>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
