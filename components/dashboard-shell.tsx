"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, ArrowRight, BarChart3, BookOpenCheck, Bot, Boxes, Braces, BrainCircuit, Check, ChevronDown, ClipboardCheck, Code2, CreditCard, Database, ExternalLink, FileText, FlaskConical, GalleryVerticalEnd, GitBranch, GitPullRequestArrow, Globe2, Handshake, HeartPulse, HelpCircle, Layers3, LayoutDashboard, LayoutTemplate, LogOut, Megaphone, Menu, MessageCircle, MonitorCheck, Network, PackagePlus, RadioTower, Rocket, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, ThumbsUp, UsersRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/loading-state";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { buildMerchantLaunchPlan } from "@/lib/merchant-launch-plan";
import { isWorkspaceOnboarded } from "@/lib/workspace-onboarding";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const primaryNavSections: NavSection[] = [
  {
    label: "Core launch workflow",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/products", label: "Products", icon: Boxes },
      { href: "/dashboard/quizzes", label: "Product finders", icon: BookOpenCheck },
      { href: "/dashboard/configurators", label: "Configurators", icon: PackagePlus },
      { href: "/dashboard/settings", label: "Brand & embed", icon: Settings },
      { href: "/dashboard/launch", label: "Launch Studio", icon: Rocket },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "After launch",
    items: [
      { href: "/dashboard/advisor", label: "Advisor Studio", icon: Bot },
      { href: "/dashboard/search", label: "Search lab", icon: Search },
      { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/dashboard/feedback", label: "Feedback Center", icon: ThumbsUp },
      { href: "/dashboard/usage", label: "Usage & plan", icon: CreditCard },
    ],
  },
];

const advancedNavSections: NavSection[] = [
  {
    label: "Storefront QA",
    items: [
      { href: "/dashboard/widget-studio", label: "Widget Studio", icon: Code2 },
      { href: "/dashboard/storefront-sandbox", label: "Storefront QA", icon: Globe2 },
      { href: "/dashboard/install-scanner", label: "Install Scanner", icon: Search },
      { href: "/dashboard/channels", label: "Launch channels", icon: Megaphone },
      { href: "/dashboard/preflight", label: "Launch preflight", icon: ClipboardCheck },
    ],
  },
  {
    label: "Catalog intelligence",
    items: [
      { href: "/dashboard/availability", label: "Availability guard", icon: ShieldCheck },
      { href: "/dashboard/catalog-pipeline", label: "Catalog pipeline", icon: Database },
      { href: "/dashboard/attributes", label: "Attribute Studio", icon: Layers3 },
      { href: "/dashboard/ontology", label: "Ontology map", icon: Network },
      { href: "/dashboard/vocabulary", label: "Vocabulary Studio", icon: MessageCircle },
      { href: "/dashboard/decision-graph", label: "Decision graph", icon: BrainCircuit },
      { href: "/dashboard/flow-studio", label: "Flow Studio", icon: GitBranch },
      { href: "/dashboard/lab", label: "Recommendation lab", icon: FlaskConical },
      { href: "/dashboard/merchandising", label: "Merchandising", icon: SlidersHorizontal },
      { href: "/dashboard/bundles", label: "Bundle Studio", icon: PackagePlus },
      { href: "/dashboard/compatibility", label: "Compatibility matrix", icon: Network },
    ],
  },
  {
    label: "AI, content & audiences",
    items: [
      { href: "/dashboard/ai-readiness", label: "AI Readiness", icon: Sparkles },
      { href: "/dashboard/trust-center", label: "AI Trust Center", icon: ShieldCheck },
      { href: "/dashboard/grounding", label: "Grounding Center", icon: BrainCircuit },
      { href: "/dashboard/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { href: "/dashboard/content", label: "Content Studio", icon: FileText },
      { href: "/dashboard/returns", label: "Returns & fit", icon: HeartPulse },
      { href: "/dashboard/personas", label: "Persona Studio", icon: UsersRound },
      { href: "/dashboard/audience", label: "Audience Capture", icon: UsersRound },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard/experiences", label: "Experience Registry", icon: GalleryVerticalEnd },
      { href: "/dashboard/api-center", label: "API Center", icon: Braces },
      { href: "/dashboard/data-contract", label: "Data Contract", icon: Database },
      { href: "/dashboard/operations", label: "Runtime Ops", icon: RadioTower },
      { href: "/dashboard/release-center", label: "Release Center", icon: GitPullRequestArrow },
      { href: "/dashboard/production", label: "Production Verification", icon: MonitorCheck },
      { href: "/dashboard/workspace-snapshot", label: "Workspace snapshot", icon: Archive },
      { href: "/dashboard/experiments", label: "Experiments", icon: Target },
      { href: "/dashboard/syndication", label: "Syndication", icon: Handshake },
    ],
  },
];

const advancedItems = advancedNavSections.flatMap((section) => section.items);

function isNavItemActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, mode, settings, products, quizzes, configurators, events } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountName, setAccountName] = useState("");
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const previewQuiz = quizzes.find((quiz) => quiz.published) || quizzes[0];
  const previewConfigurator = configurators.find((configurator) => configurator.published) || configurators[0];
  const launchPlan = useMemo(() => buildMerchantLaunchPlan({ settings, products, quizzes, events }), [settings, products, quizzes, events]);
  const onboardingComplete = mode === "demo" || isWorkspaceOnboarded(settings);
  const isOnboardingPath = pathname.startsWith("/dashboard/onboarding");
  const shouldForceOnboarding = ready && mode === "supabase" && !onboardingComplete && !isOnboardingPath;
  const workspaceInitial = (settings.brand_name.trim()[0] || "S").toUpperCase();
  const advancedPathActive = advancedItems.some((item) => isNavItemActive(pathname, item));
  const accountInitials = useMemo(() => {
    const source = accountName || accountEmail || settings.brand_name || "Sellentum";
    return source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";
  }, [accountEmail, accountName, settings.brand_name]);

  useEffect(() => {
    if (!ready || mode !== "supabase") return;
    if (shouldForceOnboarding) router.replace("/dashboard/onboarding");
  }, [mode, ready, router, shouldForceOnboarding]);

  useEffect(() => {
    if (advancedPathActive) setAdvancedExpanded(true);
  }, [advancedPathActive]);

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mode !== "supabase") return;
    let active = true;
    createClient()?.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAccountEmail(data.user?.email || "");
      const fullName = typeof data.user?.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : "";
      setAccountName(fullName);
    });
    return () => { active = false; };
  }, [mode]);

  async function logout() {
    if (mode === "supabase") await createClient()?.auth.signOut();
    document.cookie = "sellentum_demo_session=; path=/; max-age=0";
    router.push("/login"); router.refresh();
  }

  function renderNavLink(item: NavItem, compact = false) {
    const Icon = item.icon;
    const active = isNavItemActive(pathname, item);
    return (
      <Link
        onClick={() => setMobileOpen(false)}
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-xl font-bold transition",
          compact ? "px-3 py-2 text-xs" : "px-3 py-2.5 text-sm",
          active ? "bg-ink text-white shadow-sm" : "text-black/55 hover:bg-white hover:text-ink",
        )}
      >
        <Icon size={compact ? 15 : 17} className={active ? "text-lime" : "text-black/35"} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center justify-between px-5"><Logo href="/dashboard" /><button onClick={() => setMobileOpen(false)} className="md:hidden"><X size={19} /></button></div>
      <div className="mx-3 mb-5 rounded-2xl border border-black/[0.07] bg-white p-2.5">
        <Link href={onboardingComplete ? "/dashboard/settings" : "/dashboard/onboarding"} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink text-xs font-extrabold text-lime">{workspaceInitial}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{settings.brand_name}</span><span className="block text-xs text-black/35">Starter workspace</span></span><ChevronDown size={14} className="text-black/30" />
        </Link>
      </div>
      <div className="mx-3 mb-5 rounded-2xl border border-lime/40 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[.16em] text-moss">Core launch path</span>
          <span className="rounded-full bg-lime/35 px-2 py-1 text-xs font-extrabold text-moss">{launchPlan.completedCount}/{launchPlan.totalCount}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full rounded-full bg-lime" style={{ width: `${launchPlan.progressPercent}%` }} />
        </div>
        <Link href={launchPlan.currentStep.href} onClick={() => setMobileOpen(false)} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ink px-3 py-2.5 text-xs font-extrabold text-white">
          <span className="min-w-0 truncate">Next: {launchPlan.currentStep.title}</span>
          <ArrowRight size={13} className="shrink-0 text-lime" />
        </Link>
        <div className="mt-3 grid grid-cols-5 gap-1" aria-label="Products to analytics launch path">
          {launchPlan.steps.map((step, index) => (
            <Link
              key={step.id}
              href={step.href}
              onClick={() => setMobileOpen(false)}
              title={`${step.title}: ${step.evidence}`}
              className={`grid h-7 place-items-center rounded-lg text-xs font-extrabold ${step.status === "done" ? "bg-lime text-ink" : step.status === "current" ? "bg-ink text-lime" : "bg-black/[0.05] text-black/30"}`}
            >
              {step.status === "done" ? <Check size={12} /> : index + 1}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs font-bold leading-4 text-black/35">Products → Finder → Publish → Embed → Analytics proof</p>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {primaryNavSections.map((section) => (
          <section key={section.label} className="space-y-1">
            <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-[.18em] text-black/30">{section.label}</p>
            {section.items.map((item) => renderNavLink(item))}
          </section>
        ))}

        <details className="group rounded-2xl border border-black/[0.06] bg-white/45 p-2" open={advancedPathActive || advancedExpanded} onToggle={(event) => setAdvancedExpanded(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-black/35 transition hover:bg-white hover:text-ink">
            Advanced tools
            <ChevronDown size={14} className="transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-4">
            {advancedNavSections.map((section) => (
              <section key={section.label} className="space-y-1">
                <p className="px-3 text-[0.65rem] font-extrabold uppercase tracking-[.16em] text-black/25">{section.label}</p>
                {section.items.map((item) => renderNavLink(item, true))}
              </section>
            ))}
          </div>
        </details>
      </nav>
      <div className="mt-auto p-3">
        <div className="mb-3 rounded-2xl bg-ink p-4 text-white">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-ink"><Sparkles size={15} /></div><p className="mt-3 text-xs font-extrabold">Need a hand?</p><p className="mt-1 text-xs leading-4 text-white/45">Set up your first finder with our quick-start guide.</p><Link href="/support" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-lime">Contact support <ExternalLink size={10} /></Link>
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
          <div className="flex items-center gap-3">{previewQuiz && <Link href={`/finder/${previewQuiz.slug || previewQuiz.id}`} target="_blank" className="hidden items-center gap-1.5 text-xs font-extrabold text-black/50 sm:flex">Preview finder <ExternalLink size={13} /></Link>}{previewConfigurator && <Link href={`/configurator/${previewConfigurator.slug || previewConfigurator.id}`} target="_blank" className="hidden items-center gap-1.5 text-xs font-extrabold text-black/50 xl:flex">Preview configurator <ExternalLink size={13} /></Link>}<Link href="/support" className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/40" aria-label="Help"><HelpCircle size={16} /></Link><div className="relative"><button onClick={() => setAccountOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-full bg-peach text-xs font-extrabold" aria-label="Open account menu" aria-expanded={accountOpen}>{accountInitials}</button>{accountOpen && <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"><div className="border-b border-black/5 p-4"><p className="text-xs font-extrabold text-ink">{accountName || settings.brand_name}</p><p className="mt-1 truncate text-xs font-bold text-black/35">{accountEmail || (mode === "demo" ? "Demo workspace" : "Account")}</p></div><div className="p-2"><Link href="/dashboard/account" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black/55 hover:bg-canvas hover:text-ink"><Settings size={16} className="text-black/35" /> Account settings</Link><Link href="/dashboard/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black/55 hover:bg-canvas hover:text-ink"><Sparkles size={16} className="text-black/35" /> Brand & widget</Link><Link href="/dashboard/usage" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black/55 hover:bg-canvas hover:text-ink"><CreditCard size={16} className="text-black/35" /> Billing & plan</Link><Link href="/support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-black/55 hover:bg-canvas hover:text-ink"><HelpCircle size={16} className="text-black/35" /> Contact support</Link><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"><LogOut size={16} /> Log out</button></div></div>}</div></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-9">{shouldForceOnboarding ? <LoadingState label="Taking you to store setup…" /> : children}</main>
      </div>
    </div>
  );
}
