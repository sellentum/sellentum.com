"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, Boxes, CheckCircle2, Clipboard, Database, FileSpreadsheet, GitBranch, Layers3, Network, Search, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { buildCatalogPipelineReport, type CatalogPipelineActionPriority, type CatalogPipelineStageStatus, type CatalogPipelineStatus } from "@/lib/catalog-pipeline";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<CatalogPipelineStatus, string> = {
  empty: "bg-black/5 text-black/45",
  blocked: "bg-red-100 text-red-700",
  "needs-enrichment": "bg-amber-100 text-amber-800",
  ready: "bg-lime text-moss",
};

const stageTone: Record<CatalogPipelineStageStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const priorityTone: Record<CatalogPipelineActionPriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-amber-50 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-lime/35 text-moss",
};

function stageIcon(id: string) {
  if (id.includes("import")) return Upload;
  if (id.includes("normalization")) return Layers3;
  if (id.includes("enrichment")) return Sparkles;
  if (id.includes("semantic")) return Search;
  if (id.includes("consumer")) return Network;
  return BarChart3;
}

function statusIcon(status: CatalogPipelineStageStatus) {
  if (status === "pass") return CheckCircle2;
  return AlertTriangle;
}

export default function CatalogPipelinePage() {
  const { ready, products, quizzes, configurators, events } = useStore();
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => buildCatalogPipelineReport({ products, quizzes, configurators, events }), [products, quizzes, configurators, events]);

  async function copyPacket() {
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Checking catalog pipeline…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Catalog Pipeline Center</p>
          <h1 className="display mt-2 max-w-5xl text-5xl">Govern the product truth layer behind every guided experience.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/45">Track import contracts, catalog normalization, AI enrichment, semantic readiness, downstream consumers and telemetry feedback before the catalog powers live shopper decisions.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/products" className="btn-secondary"><Boxes size={14} /> Products</Link>
          <button onClick={copyPacket} className="btn-primary"><Clipboard size={14} className="text-lime" /> {copied ? "Copied" : "Copy pipeline packet"}</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[380px_1fr]">
        <section className="rounded-[30px] border border-black/[0.07] bg-ink p-7 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Database size={22} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", statusTone[report.status])}>{report.status.replace("-", " ")}</span>
          </div>
          <p className="display mt-8 text-7xl">{report.score}%</p>
          <p className="mt-3 text-sm font-bold leading-6 text-white/45">{report.headline}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.activeProducts}</p><p className="mt-1 text-xs text-white/35">Active</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.enrichedProducts}</p><p className="mt-1 text-xs text-white/35">Enriched</p></div>
            <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-xl font-extrabold">{report.summary.downstreamExperiences}</p><p className="mt-1 text-xs text-white/35">Live uses</p></div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [report.summary.products, "Total products", Boxes],
            [report.summary.discoveryReadyProducts, "Discovery-ready", Sparkles],
            [report.summary.categories, "Categories", Layers3],
            [`${report.summary.fieldCoverageAverage}%`, "Field coverage", FileSpreadsheet],
          ].map(([value, label, Icon]) => {
            const MetricIcon = Icon as typeof Boxes;
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
                <h2 className="text-sm font-extrabold">Pipeline stages</h2>
                <p className="mt-1 text-xs text-black/35">The production path from imported products to live discovery experiences.</p>
              </div>
              <Link href="/dashboard/launch" className="inline-flex items-center gap-1 text-xs font-extrabold text-moss">Open Launch Studio <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.stages.map((stage) => {
                const Icon = stageIcon(stage.id);
                const StatusIcon = statusIcon(stage.status);
                return (
                  <Link key={stage.id} href={stage.href} className="rounded-2xl border border-black/[0.07] bg-canvas p-4 transition hover:bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-moss"><Icon size={17} /></span>
                        <div>
                          <h3 className="text-xs font-extrabold">{stage.label}</h3>
                          <p className="mt-1 text-xs font-extrabold uppercase text-black/30">{stage.score}% · {stage.status}</p>
                        </div>
                      </div>
                      <span className={cn("grid h-8 w-8 place-items-center rounded-xl", stageTone[stage.status])}><StatusIcon size={15} /></span>
                    </div>
                    <p className="mt-3 text-xs leading-4 text-black/45">{stage.detail}</p>
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{stage.evidence}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Source contracts</h2>
            <p className="mt-1 text-xs text-black/35">What each catalog source is allowed to add to the product truth layer.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.sources.map((source) => (
                <article key={source.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-extrabold">{source.label}</h3>
                      <p className="mt-1 text-xs font-extrabold uppercase text-black/30">{source.count} item{source.count === 1 ? "" : "s"}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", stageTone[source.status])}>{source.status}</span>
                  </div>
                  <p className="mt-3 text-xs leading-4 text-black/45">{source.detail}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {source.contract.map((item) => <span key={`${source.id}-${item}`} className="rounded-full bg-white px-2 py-1 text-xs font-extrabold text-black/35">{item}</span>)}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Field coverage matrix</h2>
            <p className="mt-1 text-xs text-black/35">How complete active products are across the fields used by rules, AI explanations, search, advisor and embeds.</p>
            <div className="mt-5 grid gap-3 xl:grid-cols-4">
              {report.fieldCoverage.map((field) => (
                <article key={field.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", stageTone[field.status])}>{field.status}</span>
                    <span className="text-xs font-extrabold text-black/30">{field.filled}/{field.total}</span>
                  </div>
                  <p className="display mt-5 text-3xl">{field.coverage}%</p>
                  <h3 className="mt-1 text-xs font-extrabold leading-4">{field.label}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{field.detail}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-lime" style={{ width: `${field.coverage}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Pipeline action queue</h2>
            <div className="mt-4 space-y-3">
              {report.actions.map((action) => (
                <Link key={action.id} href={action.href} className="block rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", priorityTone[action.priority])}>{action.priority}</span>
                  <h3 className="mt-3 text-xs font-extrabold leading-5">{action.title}</h3>
                  <p className="mt-2 text-xs leading-4 text-black/45">{action.detail}</p>
                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/45">{action.evidence}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{action.label} <ArrowRight size={10} /></span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><Clipboard size={16} className="text-lime" /> Catalog handoff packet</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">Use this when handing the catalog to launch, support or implementation work.</p>
            <button onClick={copyPacket} className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2.5 text-xs font-extrabold text-ink">{copied ? "Copied" : "Copy pipeline packet"} <Clipboard size={13} /></button>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Downstream consumers</h2>
            <div className="mt-4 space-y-2">
              {report.consumers.map((consumer) => (
                <Link key={consumer.label} href={consumer.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", stageTone[consumer.status])}>{consumer.status === "pass" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}</span>
                  <span>
                    <span className="flex items-center gap-2 text-xs font-extrabold">{consumer.label}<span className="rounded-full bg-white px-2 py-0.5 text-xs text-black/35">{consumer.count}</span></span>
                    <span className="mt-1 block text-xs leading-4 text-black/40">{consumer.detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Related catalog tools</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/dashboard/products", label: "Products", detail: "Add, import and enrich products.", icon: Boxes },
                { href: "/dashboard/attributes", label: "Attribute Studio", detail: "Normalize specs and aliases.", icon: Layers3 },
                { href: "/dashboard/ontology", label: "Ontology map", detail: "Inspect catalog clusters.", icon: Network },
                { href: "/dashboard/vocabulary", label: "Vocabulary Studio", detail: "Govern shopper language.", icon: GitBranch },
              ].map((item) => {
                const Icon = item.icon;
                return <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-2xl bg-canvas p-4 transition hover:bg-white">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/35 text-moss"><Icon size={16} /></span>
                  <span><span className="block text-xs font-extrabold">{item.label}</span><span className="mt-1 block text-xs leading-4 text-black/40">{item.detail}</span></span>
                </Link>;
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Pipeline proof</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-canvas p-4"><ShieldCheck className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.discoveryReadyProducts}</p><p className="mt-1 text-xs font-bold text-black/30">Ready SKUs</p></div>
              <div className="rounded-2xl bg-canvas p-4"><BarChart3 className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.productsWithDemand}</p><p className="mt-1 text-xs font-bold text-black/30">Demand SKUs</p></div>
              <div className="rounded-2xl bg-canvas p-4"><Layers3 className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.categories}</p><p className="mt-1 text-xs font-bold text-black/30">Categories</p></div>
              <div className="rounded-2xl bg-canvas p-4"><AlertTriangle className="mx-auto text-moss" size={16} /><p className="mt-3 text-2xl font-extrabold">{report.summary.duplicateGroups}</p><p className="mt-1 text-xs font-bold text-black/30">Duplicates</p></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
