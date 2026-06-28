"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Clipboard, FileText, GitBranch, Layers3, Lightbulb, Network, Search, ShieldCheck, Sparkles, Tags } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildAttributeStudioReport, type AttributeStudioItemStatus } from "@/lib/attribute-studio";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<AttributeStudioItemStatus, string> = {
  approved: "bg-lime/35 text-moss",
  review: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-700",
};

const kindTone: Record<string, string> = {
  category: "bg-black/[0.05] text-black/45",
  benefit: "bg-lime/25 text-moss",
  material: "bg-blue-50 text-blue-700",
  measurement: "bg-purple-50 text-purple-700",
  price_band: "bg-peach/45 text-ink",
  compatibility: "bg-amber-50 text-amber-700",
  catalog_signal: "bg-canvas text-black/45",
};

export default function AttributeStudioPage() {
  const { ready, products } = useStore();
  const [copied, setCopied] = useState<"packet" | "glossary" | "">("");
  const report = useMemo(() => buildAttributeStudioReport(products), [products]);

  async function copy(text: string, type: "packet" | "glossary") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 1800);
  }

  if (!ready) return <LoadingState label="Normalizing catalog attributes…" />;

  if (!products.length) {
    return <div className="grid min-h-[620px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><Layers3 size={25} /></span>
        <h1 className="display mt-5 text-4xl">Attribute Studio needs products.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Import or add catalog products, then Findly will normalize categories, specs, materials, benefits and shopper-friendly attributes.</p>
        <Link href="/dashboard/products" className="btn-primary mt-6"><Boxes size={15} /> Add products</Link>
      </div>
    </div>;
  }

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Attribute Studio</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Normalize messy product specs into shopper language.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Review canonical attributes, raw aliases, spec-to-benefit mappings and product cleanup tasks before the finder, search, advisor and AI explanations use them.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => copy(report.glossary, "glossary")} className="btn-secondary"><FileText size={14} /> {copied === "glossary" ? "Glossary copied" : "Copy glossary"}</button>
          <button onClick={() => copy(report.packet, "packet")} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied === "packet" ? "Packet copied" : "Copy attribute packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Layers3 size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report.status === "ready" ? "bg-lime text-ink" : report.status === "review" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{report.status}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.approvedAttributes}</p><p className="mt-1 text-xs text-white/35">Approved</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.reviewAttributes}</p><p className="mt-1 text-xs text-white/35">Review</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.missingProductTasks}</p><p className="mt-1 text-xs text-white/35">Missing</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.normalizedAttributes, "Normalized attributes", Tags],
            [`${report.summary.benefitCoverage}%`, "Benefit coverage", Lightbulb],
            [report.summary.conflictGroups, "Variant groups", Network],
            [`${report.summary.catalogScore}%`, "Catalog score", ShieldCheck],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Tags;
            return (
              <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><MetricIcon size={18} /></span>
                <p className="display mt-5 text-4xl">{String(value)}</p>
                <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
              </article>
            );
          })}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Normalized attribute glossary</h2>
                <p className="mt-1 text-xs text-black/35">Canonical language Findly can reuse in quiz rules, semantic search, advisor prompts and grounded explanations.</p>
              </div>
              <Link href="/dashboard/ontology" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open ontology <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.attributes.slice(0, 14).map((attribute) => (
                <article key={attribute.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold">{attribute.label}</h3>
                      <p className="mt-1 text-xs font-bold text-black/30">{attribute.canonicalValue}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", statusTone[attribute.status])}>{attribute.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{attribute.shopperBenefit}</p>
                  <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs font-bold leading-4 text-black/45">Ask: {attribute.suggestedQuestion}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold", kindTone[attribute.kind])}>{attribute.kind.replace("_", " ")}</span>
                    <span className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/35">{attribute.productCount} products</span>
                    <span className="rounded-full bg-canvas px-2 py-1 text-xs font-extrabold text-black/35">{attribute.confidence}% confidence</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {attribute.aliases.slice(0, 6).map((alias) => <span key={`${attribute.id}-${alias}`} className="rounded-full bg-[#f6f7f2] px-2 py-1 text-xs font-extrabold text-black/35">{alias}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Attribute variant groups</h2>
            <p className="mt-1 text-xs text-black/35">Raw catalog phrases that map to the same canonical meaning. Approve the canonical value so rules and AI copy stay consistent.</p>
            <div className="mt-5 space-y-3">
              {report.conflictGroups.map((group) => (
                <article key={group.id} className={cn("rounded-2xl p-4", group.status === "warn" ? "bg-amber-50" : "bg-canvas")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold">{group.label}</h3>
                      <p className="mt-1 text-xs leading-4 text-black/45">{group.recommendation}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", group.status === "warn" ? "bg-amber-200 text-amber-800" : "bg-lime/35 text-moss")}>{group.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {group.variants.map((variant) => <span key={`${group.id}-${variant.value}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/40">{variant.value} · {variant.productCount}</span>)}
                  </div>
                </article>
              ))}
              {!report.conflictGroups.length && <p className="rounded-2xl bg-lime/15 p-5 text-xs font-extrabold text-moss">No attribute variants need review yet.</p>}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Normalization action queue</h2>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", action.priority === "critical" ? "bg-red-50 text-red-700" : action.priority === "high" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss")}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Search size={16} className="text-lime" /> Product cleanup tasks</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Rows with weak normalized language are the highest-return cleanup work before generating quizzes or launching the advisor.</p>
            <div className="mt-4 space-y-3">
              {report.productTasks.slice(0, 6).map((task) => (
                <Link key={task.productId} href="/dashboard/products" className="block rounded-2xl bg-white/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold">{task.productName}</h3>
                      <p className="mt-1 text-xs font-bold text-white/35">{task.missingFields.join(", ") || "Review normalized language"}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-extrabold uppercase", statusTone[task.status])}>{task.score}%</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs font-bold leading-4 text-white/45">{task.suggestedSearchText}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {task.suggestedBuyerNeeds.slice(0, 3).map((need) => <span key={`${task.productId}-${need}`} className="rounded-full bg-lime/10 px-2 py-1 text-xs font-extrabold text-lime">{need}</span>)}
                  </div>
                </Link>
              ))}
              {!report.productTasks.length && <p className="rounded-2xl bg-lime/10 p-4 text-xs font-bold leading-4 text-lime">All active products have enough normalized attribute language for launch QA.</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Use normalized attributes next</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/quizzes", label: "Build finder rules", detail: "Use approved canonical values in answer rules.", icon: GitBranch },
                { href: "/dashboard/search", label: "Tune semantic search", detail: "Check whether shopper prompts map to normalized attributes.", icon: Search },
                { href: "/dashboard/advisor", label: "Test advisor prompts", detail: "Validate conversational requests against the cleaned attribute map.", icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                  <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-xs leading-4 text-black/40">{item.detail}</span></span>
                </Link>;
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
