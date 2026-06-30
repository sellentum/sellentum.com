import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const sections = [
  {
    title: "Service status",
    copy: "Sellentum is currently an MVP-stage guided-selling SaaS. Some capabilities are production-oriented but still require verification with real catalogs, real storefronts and real analytics traffic before broad commercial use.",
  },
  {
    title: "Merchant responsibilities",
    copy: "Merchants are responsible for the accuracy of product data, pricing, product URLs, images, availability, catalog claims and any legal or compliance obligations connected to their storefront.",
  },
  {
    title: "Recommendation boundaries",
    copy: "Sellentum is designed to use deterministic catalog and rule logic for product selection. AI-generated text is used to explain selected products and should be reviewed when merchants operate in regulated or high-risk categories.",
  },
  {
    title: "Acceptable use",
    copy: "Do not use Sellentum to publish unlawful, deceptive, harmful or privacy-invasive experiences. Do not attempt to access other workspaces, reverse engineer protected routes or expose service credentials.",
  },
  {
    title: "Billing boundary",
    copy: "Stripe billing is a placeholder in the current MVP. No paid subscription, card collection or checkout billing flow is enabled unless separately added and agreed.",
  },
  {
    title: "Support and changes",
    copy: "The product may change as the MVP matures. Support requests, implementation questions and policy questions can be sent to hello@sellentum.com.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1100px]">
          <p className="eyebrow text-moss">Terms of Service</p>
          <h1 className="mt-6 text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">A practical usage boundary for the Sellentum MVP.</h1>
          <p className="mt-7 max-w-2xl text-sm leading-7 text-black/52">
            These MVP terms explain the current product boundary. They are not a substitute for legal review before a wider commercial launch.
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
          <div><p className="eyebrow text-lime">Questions before launch?</p><h2 className="mt-3 text-4xl font-extrabold tracking-[-.06em]">Review commercial terms before onboarding real merchants.</h2></div>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Contact us <ArrowRight size={15} /></Link>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
