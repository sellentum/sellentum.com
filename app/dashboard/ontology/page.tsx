"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, BrainCircuit, FileText, GitBranch, HelpCircle, Lightbulb, MessageCircle, Network, Search, Sparkles, Tags } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildCatalogBenefitReport } from "@/lib/catalog-benefits";
import { buildCatalogOntology } from "@/lib/catalog-ontology";
import { buildShopperLanguagePlan } from "@/lib/shopper-language-planner";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

const signalTone = {
  buyer_need: "bg-lime/25 text-moss",
  tag: "bg-blue-50 text-blue-700",
  feature: "bg-peach/45 text-ink",
  category: "bg-black/[0.05] text-black/45",
};

export default function OntologyPage() {
  const { ready, products, quizzes, events } = useStore();
  if (!ready) return <LoadingState label="Mapping catalog ontology…" />;

  const ontology = buildCatalogOntology(products);
  const benefitReport = buildCatalogBenefitReport(products);
  const languagePlan = buildShopperLanguagePlan({ products, quizzes, events });

  if (!products.length) {
    return <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><Network size={25} /></span>
        <h1 className="display mt-5 text-4xl">Your ontology starts with products.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Add or import catalog items, then Findly will map the buyer needs, features, tags and categories that power discovery.</p>
        <Link href="/dashboard/products" className="btn-primary mt-6"><Boxes size={15} /> Add products</Link>
      </div>
    </div>;
  }

  return <div className="animate-rise">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-moss">Catalog ontology</p>
        <h1 className="display mt-2 text-5xl">Map product facts to shopper intent.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Findly turns your catalog into a practical knowledge map: categories, buyer needs, tags and features that can become finder questions, search terms and recommendation explanations.</p>
      </div>
      <div className="flex gap-2">
        <Link href="/dashboard/products" className="btn-secondary self-start"><Sparkles size={14} /> Enrich catalog</Link>
        <Link href="/dashboard/quizzes" className="btn-primary self-start"><GitBranch size={14} /> Build finder</Link>
      </div>
    </div>

    <div className="mt-8 grid gap-4 lg:grid-cols-6">
      {[
        [ontology.activeProducts, "Active products", Boxes],
        [ontology.categoryClusters.length, "Category clusters", Network],
        [ontology.topSignals.length, "Top signals", Tags],
        [ontology.suggestedQuestions.length, "Question ideas", BrainCircuit],
        [`${benefitReport.coverage}%`, "Benefit coverage", Lightbulb],
        [`${languagePlan.score}%`, "Language score", MessageCircle],
      ].map(([value, label, Icon]) => { const MetricIcon = Icon as typeof Boxes; return <div key={String(label)} className="rounded-2xl border border-black/[0.07] bg-white p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
        <p className="display mt-5 text-4xl">{String(value)}</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
      </div>; })}
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <main className="space-y-5">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><Network size={16} className="text-moss" /> Category clusters</h2>
              <p className="mt-1 text-[10px] leading-4 text-black/35">Each cluster shows the signals Findly can use for matching and explanations.</p>
            </div>
            <span className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-extrabold text-black/35">{ontology.categoryClusters.length} clusters</span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {ontology.categoryClusters.map((cluster) => <article key={cluster.category} className="rounded-2xl border border-black/[0.07] bg-canvas/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold">{cluster.category}</h3>
                  <p className="mt-1 text-[10px] font-bold text-black/35">{cluster.productCount} products · Avg {formatCurrency(cluster.averagePrice)}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold text-black/35">category</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ["Buyer needs", cluster.needs],
                  ["Tags", cluster.tags],
                  ["Features", cluster.features],
                ].map(([label, signals]) => <div key={String(label)}>
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(signals as typeof cluster.tags).slice(0, 5).map((signal) => <span key={`${cluster.category}-${signal.type}-${signal.key}`} className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${signalTone[signal.type]}`}>{signal.label} · {signal.productCount}</span>)}
                    {!(signals as typeof cluster.tags).length && <span className="text-[9px] font-bold text-black/30">No signals yet</span>}
                  </div>
                </div>)}
              </div>
              <div className="mt-4 border-t border-black/[0.06] pt-3">
                <p className="text-[8px] font-extrabold uppercase tracking-wider text-black/30">Sample products</p>
                <div className="mt-2 space-y-1.5">
                  {cluster.products.slice(0, 3).map((product) => <p key={product.id} className="truncate text-[10px] font-bold text-black/45">{product.name} · {formatCurrency(product.price)}</p>)}
                </div>
              </div>
            </article>)}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-extrabold"><MessageCircle size={16} className="text-moss" /> Shopper language planner</h2>
              <p className="mt-1 text-[10px] leading-4 text-black/35">Checks whether shopper words from catalog facts, quiz options and analytics are covered strongly enough for search, advisor prompts and generated finder questions.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase ${languagePlan.status === "ready" ? "bg-lime/35 text-moss" : languagePlan.status === "blocked" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{languagePlan.status.replace("-", " ")}</span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[260px_1fr]">
            <div className="rounded-2xl bg-ink p-5 text-white">
              <p className="eyebrow text-lime">Discovery language</p>
              <p className="display mt-4 text-5xl">{languagePlan.score}%</p>
              <p className="mt-2 text-xs font-bold leading-5 text-white/45">{languagePlan.headline}</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{languagePlan.summary.coveredTerms}</p><p className="mt-1 text-[8px] text-white/35">Covered</p></div>
                <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{languagePlan.summary.thinTerms}</p><p className="mt-1 text-[8px] text-white/35">Thin</p></div>
                <div className="rounded-xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{languagePlan.summary.missingTerms}</p><p className="mt-1 text-[8px] text-white/35">Missing</p></div>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {languagePlan.actions.slice(0, 4).map((action) => (
                <Link key={action.id} href={action.actionHref} className="rounded-2xl border border-black/[0.07] bg-canvas/70 p-4 transition hover:bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${action.priority === "critical" || action.priority === "high" ? "bg-red-50 text-red-700" : action.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss"}`}>{action.priority}</span>
                    <span className="text-[8px] font-extrabold text-moss">{action.actionLabel}</span>
                  </div>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-[10px] leading-4 text-black/40">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[9px] font-bold leading-4 text-black/45">{action.evidence}</p>
                </Link>
              ))}
              {!languagePlan.actions.length && <div className="rounded-2xl border border-lime/40 bg-lime/10 p-4 xl:col-span-2"><p className="text-xs font-extrabold text-moss">No urgent language actions</p><p className="mt-1 text-[10px] leading-4 text-black/40">Catalog, quiz and observed shopper terms are sufficiently covered for launch testing.</p></div>}
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_280px]">
            <div className="rounded-2xl border border-black/[0.06] bg-[#f8f8f4] p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="flex items-center gap-2 text-xs font-extrabold"><Search size={14} className="text-moss" /> Term coverage</p>
                <span className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{languagePlan.summary.totalTerms} terms</span>
              </div>
              <div className="mt-4 grid gap-2 xl:grid-cols-2">
                {languagePlan.terms.slice(0, 10).map((term) => (
                  <div key={term.term} className="rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-extrabold">{term.label}</p>
                      <span className={`rounded-full px-2 py-1 text-[7px] font-extrabold uppercase ${term.status === "covered" ? "bg-lime/30 text-moss" : term.status === "thin" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{term.status}</span>
                    </div>
                    <p className="mt-1 text-[9px] font-bold leading-4 text-black/35">{term.productCount} direct products · {term.semanticProductCount} semantic matches</p>
                    <p className="mt-2 text-[9px] leading-4 text-black/40">{term.recommendation}</p>
                    {term.suggestedSynonyms.length ? <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-black/25">Synonyms: {term.suggestedSynonyms.slice(0, 3).join(" · ")}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-[#f8f8f4] p-4">
              <p className="flex items-center gap-2 text-xs font-extrabold"><FileText size={14} className="text-moss" /> Product backlog</p>
              <p className="mt-1 text-[10px] leading-4 text-black/35">Highest-impact product rows to enrich next.</p>
              <div className="mt-4 space-y-2">
                {languagePlan.productAudits.slice(0, 4).map((audit) => (
                  <Link key={audit.productId} href="/dashboard/products" className="block rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[10px] font-extrabold">{audit.productName}</p>
                      <span className="rounded-full bg-black/[0.04] px-2 py-1 text-[8px] font-extrabold text-black/35">{audit.score}%</span>
                    </div>
                    <p className="mt-1 text-[9px] leading-4 text-black/35">{audit.missingFields.length ? audit.missingFields.join(", ") : "Language coverage looks strong."}</p>
                    {audit.suggestedBuyerNeeds.length ? <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-moss">Needs: {audit.suggestedBuyerNeeds.slice(0, 2).join(" · ")}</p> : null}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <aside className="space-y-5">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-xs font-extrabold"><Tags size={14} className="text-lime" /> Top ontology signals</p>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-extrabold text-white/35">{ontology.topSignals.length}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {ontology.topSignals.map((signal) => <span key={`${signal.type}-${signal.key}`} className="rounded-full bg-white/[.08] px-3 py-1.5 text-[9px] font-extrabold text-white/65">{signal.label} · {signal.productCount}</span>)}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-xs font-extrabold"><Lightbulb size={14} className="text-moss" /> Spec-to-benefit translator</p>
            <span className="rounded-full bg-lime/30 px-2.5 py-1 text-[8px] font-extrabold text-moss">{benefitReport.productsWithBenefits}/{benefitReport.activeProducts || 0} products</span>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-black/40">Findly converts technical catalog language into shopper outcomes for questions, search tuning and recommendation copy.</p>
          <div className="mt-4 space-y-3">
            {benefitReport.benefits.slice(0, 4).map((benefit) => <article key={benefit.id} className="rounded-2xl bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold">{benefit.label}</h3>
                  <p className="mt-1 text-[9px] leading-4 text-black/45">{benefit.benefit}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{benefit.productCount} SKUs</span>
              </div>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-[9px] font-bold leading-4 text-moss">Ask: {benefit.shopperQuestion}</p>
              <p className="mt-2 text-[8px] font-bold uppercase tracking-wide text-black/25">Signals: {benefit.sourceTerms.join(" · ")}{benefit.sampleProducts.length ? ` · ${benefit.sampleProducts.slice(0, 2).join(", ")}` : ""}</p>
            </article>)}
            {!benefitReport.benefits.length && <p className="rounded-2xl bg-canvas p-4 text-[10px] font-bold leading-5 text-black/35">No benefit patterns detected yet. Add richer features, tags or buyer needs, then run enrichment.</p>}
          </div>
          {benefitReport.gaps.length ? <div className="mt-4 space-y-2">
            {benefitReport.gaps.slice(0, 2).map((gap) => <p key={gap} className="rounded-2xl bg-amber-50 p-3 text-[10px] font-bold leading-5 text-amber-700">{gap}</p>)}
          </div> : null}
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><BrainCircuit size={14} className="text-moss" /> Suggested finder questions</p>
          <p className="mt-2 text-[10px] leading-5 text-black/40">Generated from repeated product attributes, ready to copy into the quiz builder.</p>
          <div className="mt-4 space-y-3">
            {ontology.suggestedQuestions.map((question) => <article key={question.title} className="rounded-2xl bg-canvas p-4">
              <h3 className="text-xs font-extrabold">{question.title}</h3>
              <p className="mt-1 text-[9px] leading-4 text-black/40">{question.helperText}</p>
              <div className="mt-3 space-y-1.5">
                {question.options.map((option) => <p key={`${question.title}-${option.matchValue}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-[9px] font-bold text-black/45"><span>{option.label}</span><span className="text-black/25">{option.productCount} products</span></p>)}
              </div>
            </article>)}
            {!ontology.suggestedQuestions.length && <p className="rounded-2xl bg-canvas p-4 text-[10px] font-bold leading-5 text-black/35">Add more products, tags, features or buyer needs to generate stronger question ideas.</p>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><AlertTriangle size={14} className="text-amber-600" /> Ontology gaps</p>
          <div className="mt-4 space-y-2">
            {ontology.gaps.map((gap) => <p key={gap} className="rounded-2xl bg-amber-50 p-3 text-[10px] font-bold leading-5 text-amber-700">{gap}</p>)}
            {!ontology.gaps.length && <p className="rounded-2xl bg-lime/15 p-3 text-[10px] font-bold leading-5 text-moss">No major ontology gaps detected. Your catalog has enough structure for guided selling.</p>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><Search size={14} className="text-moss" /> Thin or one-off signals</p>
          <p className="mt-2 text-[10px] leading-5 text-black/40">Normalize these if they should map to existing tags or features.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {ontology.orphanSignals.map((signal) => <span key={`orphan-${signal.type}-${signal.key}`} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[8px] font-extrabold text-black/35">{signal.label}</span>)}
            {!ontology.orphanSignals.length && <span className="text-[10px] font-bold text-black/35">No one-off signals detected.</span>}
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-extrabold"><HelpCircle size={14} className="text-moss" /> Why this matters</p>
          <p className="mt-2 text-[10px] leading-5 text-black/45">A clean ontology keeps quiz rules reliable, search terms explainable, and AI copy grounded in approved product facts. It’s the connective tissue between catalog enrichment and customer-facing recommendations.</p>
          <Link href="/dashboard/search" className="mt-4 inline-flex items-center gap-1 text-[10px] font-extrabold text-moss">Test these signals in Search Lab <ArrowRight size={10} /></Link>
        </section>
      </aside>
    </div>
  </div>;
}
