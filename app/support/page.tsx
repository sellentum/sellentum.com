import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Code2, LifeBuoy, Mail, UploadCloud } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const supportTopics = [
  { title: "Import products", copy: "Prepare a CSV with product names, prices, categories, descriptions, features, tags and product URLs.", icon: UploadCloud, href: "/dashboard/products" },
  { title: "Build a finder", copy: "Create guided questions, connect answers to deterministic rules, publish the experience and test the result path.", icon: BookOpen, href: "/dashboard/quizzes" },
  { title: "Install the widget", copy: "Copy the modal or inline snippet and install it on a staging storefront before sending real traffic.", icon: Code2, href: "/dashboard/widget-studio" },
  { title: "Verify production", copy: "Use the production checks for Supabase, public routes, widget runtime, analytics and release readiness.", icon: CheckCircle2, href: "/dashboard/production" },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <p className="eyebrow text-moss">Support</p>
          <h1 className="mx-auto mt-6 max-w-5xl text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">Get from catalog to launch without guessing.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-black/52">
            Sellentum support is focused on the MVP launch loop: product data, guided questions, widget installation, analytics proof and production verification.
          </p>
          <a href="mailto:hello@sellentum.com?subject=Sellentum%20support" className="mt-9 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5">
            Contact support <Mail size={15} className="text-lime" />
          </a>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-4">
          {supportTopics.map(({ title, copy, icon: Icon, href }) => (
            <Link key={title} href={href} className="group rounded-[28px] border border-black/10 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss transition group-hover:bg-lime"><Icon size={20} /></span>
              <h2 className="mt-12 text-2xl font-extrabold tracking-[-.045em]">{title}</h2>
              <p className="mt-4 text-xs leading-5 text-black/45">{copy}</p>
              <span className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Open area <ArrowRight size={13} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[.75fr_1.25fr]">
          <div className="rounded-[30px] bg-ink p-9 text-white">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><LifeBuoy size={20} /></span>
            <h2 className="mt-12 text-4xl font-extrabold tracking-[-.06em]">Before asking for help, collect launch evidence.</h2>
            <p className="mt-5 text-sm leading-6 text-white/45">The fastest fixes come from exact URLs, screenshots, catalog rows and the route where a journey fails.</p>
          </div>
          <div className="grid gap-3 rounded-[30px] border border-black/10 bg-white p-6">
            {[
              "Your Sellentum account email and workspace brand name.",
              "The page URL where the widget is installed or should be installed.",
              "The finder/advisor/search/configurator URL you are testing.",
              "A short description of the expected result and the actual result.",
              "A sample product row if recommendations do not look right.",
            ].map((item, index) => (
              <p key={item} className="rounded-2xl bg-canvas p-4 text-sm font-bold text-black/50"><span className="mr-3 text-xs font-extrabold text-moss">0{index + 1}</span>{item}</p>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
