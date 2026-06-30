import Link from "next/link";
import { Logo } from "@/components/logo";

const footerGroups = [
  {
    heading: "Platform",
    links: [
      ["Overview", "/platform"],
      ["Product catalog", "/platform/catalog"],
      ["Guided selling", "/platform/guided-selling"],
      ["AI advisor", "/platform/ai-advisor"],
      ["Widget", "/platform/widget"],
    ],
  },
  {
    heading: "Experiences",
    links: [
      ["Live finder", "/finder/quiz_footwear"],
      ["Advisor", "/assistant/quiz_footwear"],
      ["Configurator", "/configurator/config_trail_kit"],
      ["Industries", "/industries"],
      ["Resources", "/resources"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["Why Sellentum", "/#why"],
      ["Pricing", "/#pricing"],
      ["Contact", "/contact"],
      ["Support", "/support"],
      ["Security", "/security"],
    ],
  },
  {
    heading: "Product",
    links: [
      ["Sign up", "/signup"],
      ["Log in", "/login"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function MarketingFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="border-t border-black/10 px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between text-xs font-bold text-black/35">
          <Logo />
          <div className="flex items-center gap-5">
            <Link href="/contact" className="hover:text-ink">Contact</Link>
            <Link href="/support" className="hover:text-ink">Support</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <span>© 2026 Sellentum</span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-white px-5 py-14 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <div className="grid gap-12 border-b border-black/10 pb-12 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-xs leading-5 text-black/40">
              AI-guided product discovery for ecommerce teams that want useful recommendations without enterprise complexity.
            </p>
            <Link href="/contact" className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white transition hover:-translate-y-0.5">
              Talk to Sellentum
            </Link>
          </div>
          {footerGroups.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-extrabold uppercase tracking-[.14em] text-black/35">{group.heading}</h3>
              <div className="mt-5 space-y-3">
                {group.links.map(([label, href]) => (
                  <Link key={label} href={href} className="block text-xs font-bold text-black/55 hover:text-ink">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 pt-7 text-xs font-bold text-black/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Sellentum. Product decisions, made lighter.</span>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/security" className="hover:text-ink">Security</Link>
            <span>Built with Next.js, Supabase & OpenAI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
