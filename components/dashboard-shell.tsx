"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, BarChart3, BookOpenCheck, Bot, Boxes, Braces, BrainCircuit, ChevronDown, ClipboardCheck, Code2, CreditCard, Database, ExternalLink, FileText, FlaskConical, GalleryVerticalEnd, GitBranch, GitPullRequestArrow, Globe2, Handshake, HeartPulse, HelpCircle, Layers3, LayoutDashboard, LayoutTemplate, LogOut, Megaphone, Menu, MessageCircle, MonitorCheck, Network, PackagePlus, RadioTower, Rocket, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, ThumbsUp, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/launch", label: "Launch Studio", icon: Rocket },
  { href: "/dashboard/widget-studio", label: "Widget Studio", icon: Code2 },
  { href: "/dashboard/api-center", label: "API Center", icon: Braces },
  { href: "/dashboard/experiences", label: "Experience Registry", icon: GalleryVerticalEnd },
  { href: "/dashboard/channels", label: "Launch channels", icon: Megaphone },
  { href: "/dashboard/syndication", label: "Syndication", icon: Handshake },
  { href: "/dashboard/storefront-sandbox", label: "Storefront QA", icon: Globe2 },
  { href: "/dashboard/operations", label: "Runtime Ops", icon: RadioTower },
  { href: "/dashboard/release-center", label: "Release Center", icon: GitPullRequestArrow },
  { href: "/dashboard/production", label: "Production Verification", icon: MonitorCheck },
  { href: "/dashboard/trust-center", label: "AI Trust Center", icon: ShieldCheck },
  { href: "/dashboard/grounding", label: "Grounding Center", icon: BrainCircuit },
  { href: "/dashboard/workspace-snapshot", label: "Workspace snapshot", icon: Archive },
  { href: "/dashboard/usage", label: "Usage & plan", icon: CreditCard },
  { href: "/dashboard/experiments", label: "Experiments", icon: Target },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/products", label: "Products", icon: Boxes },
  { href: "/dashboard/availability", label: "Availability guard", icon: ShieldCheck },
  { href: "/dashboard/catalog-pipeline", label: "Catalog pipeline", icon: Database },
  { href: "/dashboard/attributes", label: "Attribute Studio", icon: Layers3 },
  { href: "/dashboard/ontology", label: "Ontology map", icon: Network },
  { href: "/dashboard/vocabulary", label: "Vocabulary Studio", icon: MessageCircle },
  { href: "/dashboard/decision-graph", label: "Decision graph", icon: BrainCircuit },
  { href: "/dashboard/flow-studio", label: "Flow Studio", icon: GitBranch },
  { href: "/dashboard/quizzes", label: "Product finders", icon: BookOpenCheck },
  { href: "/dashboard/configurators", label: "Configurators", icon: PackagePlus },
  { href: "/dashboard/compatibility", label: "Compatibility matrix", icon: Network },
  { href: "/dashboard/bundles", label: "Bundle Studio", icon: PackagePlus },
  { href: "/dashboard/lab", label: "Recommendation lab", icon: FlaskConical },
  { href: "/dashboard/merchandising", label: "Merchandising", icon: SlidersHorizontal },
  { href: "/dashboard/advisor", label: "Advisor Studio", icon: Bot },
  { href: "/dashboard/search", label: "Search lab", icon: Search },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/feedback", label: "Feedback Center", icon: ThumbsUp },
  { href: "/dashboard/content", label: "Content Studio", icon: FileText },
  { href: "/dashboard/returns", label: "Returns & fit", icon: HeartPulse },
  { href: "/dashboard/personas", label: "Persona Studio", icon: UsersRound },
  { href: "/dashboard/audience", label: "Audience Capture", icon: UsersRound },
  { href: "/dashboard/settings", label: "Brand & embed", icon: Settings },
  { href: "/dashboard/preflight", label: "Launch preflight", icon: ClipboardCheck },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, settings, quizzes, configurators } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const previewQuiz = quizzes.find((quiz) => quiz.published) || quizzes[0];
  const previewConfigurator = configurators.find((configurator) => configurator.published) || configurators[0];

  async function logout() {
    if (mode === "supabase") await createClient()?.auth.signOut();
    document.cookie = "findly_demo_session=; path=/; max-age=0";
    router.push("/login"); router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center justify-between px-5"><Logo href="/dashboard" /><button onClick={() => setMobileOpen(false)} className="md:hidden"><X size={19} /></button></div>
      <div className="mx-3 mb-5 rounded-2xl border border-black/[0.07] bg-white p-2.5">
        <button className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink text-xs font-extrabold text-lime">{settings.brand_name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{settings.brand_name}</span><span className="block text-xs text-black/35">Starter workspace</span></span><ChevronDown size={14} className="text-black/30" />
        </button>
      </div>
      <nav className="space-y-1 px-3">
        <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-[.18em] text-black/30">Workspace</p>
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return <Link onClick={() => setMobileOpen(false)} key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition", active ? "bg-ink text-white shadow-sm" : "text-black/55 hover:bg-white hover:text-ink")}><Icon size={17} className={active ? "text-lime" : "text-black/35"} />{label}</Link>;
        })}
      </nav>
      <div className="mt-auto p-3">
        <div className="mb-3 rounded-2xl bg-ink p-4 text-white">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-ink"><Sparkles size={15} /></div><p className="mt-3 text-xs font-extrabold">Need a hand?</p><p className="mt-1 text-xs leading-4 text-white/45">Set up your first finder with our quick-start guide.</p><a href="mailto:hello@findly.app" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">Contact support <ExternalLink size={10} /></a>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black/45 hover:bg-white hover:text-ink"><LogOut size={16} /> Log out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4ef] md:grid md:grid-cols-[245px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[245px] border-r border-black/[0.06] bg-[#eceee8] md:block">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-label="Close menu" /><aside className="relative h-full w-[280px] bg-[#eceee8] shadow-2xl">{sidebar}</aside></div>}
      <div className="md:col-start-2">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-black/[0.06] bg-[#f3f4ef]/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 md:hidden"><Menu size={17} /></button><p className="text-xs font-bold text-black/35">{mode === "demo" ? "Interactive demo workspace" : "Your workspace"}</p></div>
          <div className="flex items-center gap-3">{previewQuiz && <Link href={`/finder/${previewQuiz.slug || previewQuiz.id}`} target="_blank" className="hidden items-center gap-1.5 text-xs font-extrabold text-black/50 sm:flex">Preview finder <ExternalLink size={13} /></Link>}{previewConfigurator && <Link href={`/configurator/${previewConfigurator.slug || previewConfigurator.id}`} target="_blank" className="hidden items-center gap-1.5 text-xs font-extrabold text-black/50 xl:flex">Preview configurator <ExternalLink size={13} /></Link>}<button className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/40" aria-label="Help"><HelpCircle size={16} /></button><div className="grid h-9 w-9 place-items-center rounded-full bg-peach text-xs font-extrabold">AM</div></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">{children}</main>
      </div>
    </div>
  );
}
