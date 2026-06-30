import Link from "next/link";
import { ArrowRight, Database, KeyRound, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const securityItems = [
  { title: "Authentication", copy: "Merchant access uses Supabase email/password authentication with protected dashboard routes.", icon: KeyRound },
  { title: "Database boundaries", copy: "Workspace data is designed around Supabase RLS policies and server-side service routes for public runtimes.", icon: Database },
  { title: "Public runtime safety", copy: "Embedded experiences load published data server-side and return shopper-safe payloads instead of raw merchant logic.", icon: LockKeyhole },
  { title: "Operational checks", copy: "Production verification, data-contract checks and runtime operations pages help prove launch readiness before traffic scales.", icon: ServerCog },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />
      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <p className="eyebrow text-moss">Security</p>
          <h1 className="mx-auto mt-6 max-w-5xl text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">Rules, data and AI boundaries should stay visible.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-black/52">
            Sellentum is built around a simple safety principle: product selection stays deterministic and server-side; AI explains selected product facts; public widgets do not receive dashboard secrets.
          </p>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-4">
          {securityItems.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="rounded-[28px] border border-black/10 bg-white p-7">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss"><Icon size={20} /></span>
              <h2 className="mt-12 text-2xl font-extrabold tracking-[-.045em]">{title}</h2>
              <p className="mt-4 text-xs leading-5 text-black/45">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-4 lg:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[30px] bg-ink p-9 text-white">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><ShieldCheck size={20} /></span>
            <h2 className="mt-12 text-4xl font-extrabold tracking-[-.06em]">Responsible disclosure</h2>
            <p className="mt-5 text-sm leading-6 text-white/45">
              If you believe you have found a security issue in Sellentum, email a clear report with affected URLs, reproduction steps and impact.
            </p>
            <a href="mailto:hello@sellentum.com?subject=Sellentum%20security%20report" className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold text-ink">Report an issue <ArrowRight size={15} /></a>
          </div>
          <div className="rounded-[30px] border border-black/10 bg-white p-9">
            <p className="eyebrow text-moss">Current MVP boundary</p>
            <h3 className="mt-4 text-3xl font-extrabold tracking-[-.055em]">Sellentum is still pre-enterprise.</h3>
            <p className="mt-5 text-sm leading-6 text-black/50">
              Enterprise controls such as SSO, advanced audit logs, complex team permissions and formal compliance reports are not part of the current MVP. Those should be added only after the core guided-selling workflow is production-proven.
            </p>
            <Link href="/platform/production-verification" className="mt-7 inline-flex items-center gap-2 text-xs font-extrabold text-moss">View production verification <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
