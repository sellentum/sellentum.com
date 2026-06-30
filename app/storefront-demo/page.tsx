import Link from "next/link";
import { ArrowRight, Check, Clipboard, Code2, ExternalLink, MonitorCheck, Package, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { buildWidgetSnippet, widgetExperienceLabel, widgetPathForExperience, type WidgetEmbedExperience, type WidgetEmbedMode } from "@/lib/widget-snippet";

type StorefrontDemoSearchParams = Record<string, string | string[] | undefined>;

const experiences: WidgetEmbedExperience[] = ["finder", "assistant", "search", "configurator"];
const modes: WidgetEmbedMode[] = ["modal", "inline"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validExperience(value: string | undefined): WidgetEmbedExperience {
  return experiences.includes(value as WidgetEmbedExperience) ? value as WidgetEmbedExperience : "finder";
}

function validMode(value: string | undefined): WidgetEmbedMode {
  return modes.includes(value as WidgetEmbedMode) ? value as WidgetEmbedMode : "modal";
}

function cleanId(value: string | undefined) {
  return (value || "").trim().slice(0, 120);
}

function cleanHex(value: string | undefined) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value! : "#22352a";
}

export default async function StorefrontDemoPage({ searchParams }: { searchParams?: Promise<StorefrontDemoSearchParams> }) {
  const params = await searchParams;
  const experience = validExperience(first(params?.experience));
  const mode = validMode(first(params?.mode));
  const id = cleanId(first(params?.id));
  const color = cleanHex(first(params?.color));
  const label = first(params?.label)?.trim().slice(0, 80) || "Find my match";
  const placement = first(params?.placement)?.trim().slice(0, 80) || "storefront-demo";
  const appOrigin = first(params?.origin)?.trim().replace(/\/+$/, "") || "https://sellentum.com";
  const snippet = buildWidgetSnippet({
    origin: appOrigin,
    experience,
    mode,
    id: id || undefined,
    color,
    label,
    position: "right",
    height: "780px",
    source: "storefront-demo",
    medium: "embed",
    campaign: "production-qa",
    placement,
  });
  const publicPath = id ? `/${widgetPathForExperience(experience)}/${encodeURIComponent(id)}` : "";
  const canLoadWidget = Boolean(id);

  return (
    <main className="min-h-screen bg-white text-ink">
      <LandingNav />

      <section className="relative overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(217,255,97,.35),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div>
            <p className="eyebrow text-moss">Storefront widget demo</p>
            <h1 className="mt-6 text-6xl font-extrabold leading-[.95] tracking-[-.07em] lg:text-8xl">Test the embed before touching a real store theme.</h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-black/52">
              Use this simulated ecommerce page to prove the Sellentum widget script, modal or inline iframe, attribution labels and shopper journey before installing on a live storefront.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/dashboard/widget-studio" className="btn-primary">Open Widget Studio <ArrowRight size={15} /></Link>
              <Link href="/dashboard/install-scanner" className="btn-secondary">Open install scanner</Link>
            </div>
          </div>
          <div className="rounded-[34px] border border-black/10 bg-[#f8f6f1] p-5 shadow-[0_35px_90px_rgba(24,33,27,.10)]">
            <form className="rounded-[26px] bg-white p-7" action="/storefront-demo">
              <p className="eyebrow text-moss">Configure test embed</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-.06em]">Paste a real published experience ID.</h2>
              <div className="mt-7 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-black/35">Experience</span>
                  <select name="experience" defaultValue={experience} className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm font-bold outline-none">
                    <option value="finder">Guided finder</option>
                    <option value="assistant">Conversational advisor</option>
                    <option value="search">Semantic search</option>
                    <option value="configurator">Visual configurator</option>
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-black/35">Published experience ID</span>
                  <input name="id" defaultValue={id} placeholder="Paste finder/configurator ID from Widget Studio" className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm font-bold outline-none" />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-black/35">Mode</span>
                    <select name="mode" defaultValue={mode} className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm font-bold outline-none">
                      <option value="modal">Modal</option>
                      <option value="inline">Inline</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-black/35">Colour</span>
                    <input name="color" defaultValue={color} className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm font-bold outline-none" />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-black/35">Label</span>
                    <input name="label" defaultValue={label} className="rounded-2xl border border-black/10 bg-canvas px-4 py-3 text-sm font-bold outline-none" />
                  </label>
                </div>
                <input type="hidden" name="placement" value={placement} />
                <input type="hidden" name="origin" value={appOrigin} />
                <button className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-extrabold text-white">Load test widget <ArrowRight size={15} className="text-lime" /></button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f6f1] px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-5 xl:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_70px_rgba(24,33,27,.08)]">
            <div className="flex h-12 items-center gap-1.5 border-b border-black/[0.06] bg-[#f8f8f4] px-5">
              <i className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <i className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
              <i className="h-2.5 w-2.5 rounded-full bg-green-300" />
              <span className="mx-auto rounded-full bg-white px-4 py-1 text-xs font-bold text-black/35">demo-storefront.example/product/trail-runner</span>
            </div>
            <div className="relative min-h-[720px] bg-[#f2f3ee] p-8">
              <div className="rounded-[28px] bg-white p-7">
                <div className="flex items-center justify-between border-b border-black/[0.06] pb-5">
                  <div><p className="text-sm font-extrabold">Northstar Outdoor</p><p className="mt-1 text-xs text-black/35">Simulated desktop storefront</p></div>
                  <div className="flex gap-6 text-xs font-extrabold text-black/35"><span>Shop</span><span>Guides</span><span>Reviews</span><span>Support</span></div>
                </div>
                <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_420px]">
                  <div>
                    <div className="grid h-[420px] place-items-center rounded-[28px] bg-[radial-gradient(circle_at_70%_20%,rgba(217,255,97,.6),transparent_32%),linear-gradient(135deg,#dfe6d9,#ffffff)]">
                      <span className="grid h-24 w-24 place-items-center rounded-[30px] bg-white/70 text-moss shadow-xl"><Package size={36} /></span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {["Trail-ready", "Weather proof", "Weekend-tested"].map((item) => <div key={item} className="rounded-2xl bg-canvas p-4 text-xs font-extrabold text-black/45">{item}</div>)}
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow text-moss">Featured product</p>
                    <h2 className="mt-3 text-5xl font-extrabold leading-[.95] tracking-[-.065em]">Terra Trail Runner</h2>
                    <p className="mt-4 text-xl font-extrabold">£128</p>
                    <p className="mt-5 text-sm leading-7 text-black/52">A simulated product detail page for checking whether Sellentum can help uncertain shoppers choose confidently before checkout.</p>
                    <div className="mt-6 grid gap-3">
                      {[
                        "Need help choosing between terrain, comfort and budget?",
                        "Open the Sellentum widget and complete one full journey.",
                        "Confirm Analytics records widget_view, quiz_start, completion and Buy Now click.",
                      ].map((item) => <p key={item} className="flex gap-3 rounded-2xl bg-canvas p-4 text-xs font-bold leading-5 text-black/45"><Check size={14} className="mt-0.5 shrink-0 text-moss" />{item}</p>)}
                    </div>
                    <button className="mt-7 w-full rounded-full bg-ink px-6 py-4 text-sm font-extrabold text-white">Add to cart</button>
                  </div>
                </div>
              </div>

              {canLoadWidget ? (
                <script
                  src="/api/widget.js"
                  data-experience={experience}
                  data-mode={mode}
                  data-id={id}
                  data-color={color}
                  data-label={label}
                  data-position="right"
                  data-height="780px"
                  data-source="storefront-demo"
                  data-medium="embed"
                  data-campaign="production-qa"
                  data-placement={placement}
                  async
                />
              ) : (
                <div className="absolute bottom-10 right-10 max-w-xs rounded-2xl border border-black/10 bg-white p-5 text-sm font-bold text-black/45 shadow-xl">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime/40 text-moss"><Sparkles size={18} /></span>
                  <p className="mt-4 text-ink">Widget not loaded yet.</p>
                  <p className="mt-2 text-xs leading-5">Enter a real published experience ID above to inject the same script a storefront would use.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss"><MonitorCheck size={20} /></span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${canLoadWidget ? "bg-lime/35 text-moss" : "bg-amber-50 text-amber-700"}`}>{canLoadWidget ? "Ready to test" : "Needs ID"}</span>
              </div>
              <h2 className="mt-10 text-3xl font-extrabold tracking-[-.055em]">{widgetExperienceLabel(experience)} · {mode}</h2>
              <p className="mt-4 text-sm leading-6 text-black/50">
                {canLoadWidget ? `The widget is loading ${publicPath} with storefront-demo attribution.` : "Paste a real published experience ID from Widget Studio or Launch Studio to activate the test."}
              </p>
              {canLoadWidget && <Link href={publicPath} target="_blank" className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Open direct experience <ExternalLink size={13} /></Link>}
            </section>

            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div><h2 className="flex items-center gap-2 text-sm font-extrabold"><Code2 size={16} className="text-moss" /> Exact snippet</h2><p className="mt-1 text-xs text-black/35">Use this same contract on a staging store.</p></div>
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1.5 text-xs font-extrabold text-black/35"><Clipboard size={12} /> Copy manually</span>
              </div>
              <pre className="mt-5 max-h-[360px] overflow-auto rounded-2xl bg-ink p-5 text-xs leading-5 text-lime/80"><code>{snippet}</code></pre>
            </section>

            <section className="rounded-[28px] border border-black/10 bg-white p-6">
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-moss" /> Acceptance checklist</h2>
              <div className="mt-4 grid gap-3">
                {[
                  "The launcher appears or inline iframe renders.",
                  "The iframe opens the expected Sellentum experience.",
                  "A full shopper journey reaches recommendations or review.",
                  "Buy Now click opens the product URL.",
                  "Analytics receives events with source=storefront-demo and campaign=production-qa.",
                ].map((item) => <p key={item} className="flex gap-3 rounded-2xl bg-canvas p-4 text-xs font-bold leading-5 text-black/45"><Check size={14} className="mt-0.5 shrink-0 text-moss" />{item}</p>)}
              </div>
              <Link href="/dashboard/analytics" className="mt-6 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Check Analytics after testing <ArrowRight size={13} /></Link>
            </section>

            <section className="rounded-[28px] border border-black/10 bg-ink p-6 text-white">
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><Search size={16} className="text-lime" /> Next proof step</h2>
              <p className="mt-4 text-sm leading-6 text-white/45">After this simulated page works, install the same snippet on a real staging storefront and scan it from the Install Scanner.</p>
              <Link href="/dashboard/install-scanner" className="mt-6 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink">Open scanner <ArrowRight size={13} /></Link>
            </section>
          </aside>
        </div>
      </section>

      <MarketingFooter compact />
    </main>
  );
}
