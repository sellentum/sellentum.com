"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Boxes, Check, CheckCircle2, ClipboardList, ExternalLink, LayoutTemplate, LoaderCircle, PackagePlus, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { buildStarterKitReadiness, materializeStarterKit, starterKits } from "@/lib/starter-kits";
import { cn, formatCurrency } from "@/lib/utils";

export default function DashboardTemplatesPage() {
  const { ready, saveProduct, saveQuiz, saveConfigurator, error } = useStore();
  const [selectedId, setSelectedId] = useState(starterKits[0]?.id || "");
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<{ quizId: string; configuratorId: string; productCount: number } | null>(null);
  const selectedKit = starterKits.find((kit) => kit.id === selectedId) || starterKits[0];
  const readiness = useMemo(() => buildStarterKitReadiness(selectedKit), [selectedKit]);
  const catalogValue = useMemo(() => selectedKit.products.reduce((sum, product) => sum + product.price, 0), [selectedKit]);

  async function installStarterKit() {
    setInstalling(true);
    setInstallError(null);
    setInstalled(null);
    try {
      const payload = materializeStarterKit(selectedKit);
      for (const product of payload.products) await saveProduct(product.input, product.id);
      await saveQuiz(payload.quiz);
      await saveConfigurator(payload.configurator);
      setInstalled({ quizId: payload.quiz.id, configuratorId: payload.configurator.id, productCount: payload.products.length });
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "Could not install the starter kit.");
    } finally {
      setInstalling(false);
    }
  }

  if (!ready) return <LoadingState label="Loading starter kits…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Launch templates</p>
          <h1 className="display mt-2 text-5xl">Start from a proven guided-selling kit.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Install a complete vertical workspace: enriched sample products, deterministic finder rules, conditional branches and a product-linked configurator draft. Swap in the real catalog when the flow feels right.</p>
        </div>
        <Link href="/dashboard/launch" className="btn-primary shrink-0"><Rocket size={15} className="text-lime" /> Launch Studio</Link>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          {starterKits.map((kit) => {
            const kitReadiness = buildStarterKitReadiness(kit);
            const active = kit.id === selectedKit.id;
            return (
              <button
                key={kit.id}
                onClick={() => { setSelectedId(kit.id); setInstalled(null); setInstallError(null); }}
                className={cn("w-full rounded-2xl border p-4 text-left transition", active ? "border-ink bg-ink text-white shadow-xl" : "border-black/[0.07] bg-white hover:-translate-y-0.5 hover:border-black/15")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: active ? kit.accent : `${kit.accent}55`, color: active ? "#142118" : "#22352a" }}><LayoutTemplate size={18} /></span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase", active ? "bg-white/10 text-white/50" : "bg-lime/35 text-moss")}>{kitReadiness.score}% ready</span>
                </div>
                <h2 className="mt-4 text-sm font-extrabold">{kit.title}</h2>
                <p className={cn("mt-1 text-[10px] font-bold", active ? "text-white/40" : "text-black/35")}>{kit.industry}</p>
                <p className={cn("mt-3 text-xs leading-5", active ? "text-white/55" : "text-black/45")}>{kit.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{kit.products.length}</b><small className={active ? "text-white/35" : "text-black/35"}>Products</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{kit.quiz.questions.length}</b><small className={active ? "text-white/35" : "text-black/35"}>Questions</small></span>
                  <span className={cn("rounded-xl p-2", active ? "bg-white/[0.06]" : "bg-canvas")}><b className="block text-sm">{kit.configurator.steps.length}</b><small className={active ? "text-white/35" : "text-black/35"}>Steps</small></span>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="relative border-b border-black/[0.06] bg-[radial-gradient(circle_at_85%_15%,rgba(217,255,97,.65),transparent_30%),linear-gradient(135deg,#f8f8f4,#ffffff)] p-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-moss shadow-sm"><Sparkles size={11} /> {selectedKit.useCase}</span>
                <h2 className="display mt-5 max-w-3xl text-4xl">{selectedKit.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">{selectedKit.audience}</p>
              </div>
              <div className="w-[280px] rounded-2xl bg-ink p-5 text-white shadow-xl">
                <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-lime text-ink"><ShieldCheck size={17} /></span><span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-extrabold text-white/45">{readiness.status}</span></div>
                <p className="display mt-5 text-4xl">{readiness.score}%</p>
                <p className="mt-1 text-xs font-bold text-white/45">Starter readiness before merchant edits.</p>
                <button onClick={installStarterKit} disabled={installing || readiness.status === "blocked"} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-lime px-4 py-3 text-xs font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60">
                  {installing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Install starter kit
                </button>
              </div>
            </div>
          </div>

          {(installed || installError || error) && (
            <div className={cn("mx-8 mt-6 rounded-2xl border p-4", installError || error ? "border-red-200 bg-red-50 text-red-700" : "border-lime/40 bg-lime/15 text-moss")}>
              {installed ? (
                <div className="flex items-center justify-between gap-5">
                  <div><p className="text-sm font-extrabold">Starter kit installed as editable drafts.</p><p className="mt-1 text-xs">{installed.productCount} products, one finder and one configurator were added to this workspace.</p></div>
                  <div className="flex gap-2">
                    <Link href="/dashboard/products" className="rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-moss">Review products</Link>
                    <Link href="/dashboard/quizzes" className="rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-moss">Edit finder</Link>
                    <Link href="/dashboard/configurators" className="rounded-full bg-white px-3 py-2 text-[10px] font-extrabold text-moss">Edit configurator</Link>
                  </div>
                </div>
              ) : <p className="text-xs font-bold">{installError || error}</p>}
            </div>
          )}

          <div className="grid gap-6 p-8 xl:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] p-5">
                <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-sm font-extrabold"><Boxes size={16} className="text-moss" /> Starter catalog</h3><p className="mt-1 text-xs text-black/35">{formatCurrency(catalogValue)} sample catalog value across {selectedKit.products.length} editable products.</p></div><Link href="/dashboard/products" className="text-xs font-extrabold text-moss">Products <ArrowRight size={12} className="inline" /></Link></div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {selectedKit.products.map((product) => (
                    <article key={product.key} className="overflow-hidden rounded-2xl border border-black/[0.07] bg-canvas">
                      <div className="h-40 overflow-hidden bg-[#eceee9]">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-black/20"><Boxes size={20} /></div>}</div>
                      <div className="p-4">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-moss">{product.category}</p>
                        <h4 className="mt-2 text-xs font-extrabold leading-5">{product.name}</h4>
                        <p className="mt-1 text-xs font-extrabold">{formatCurrency(product.price)}</p>
                        <div className="mt-3 flex flex-wrap gap-1">{[...(product.buyer_needs || []), ...product.tags].slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-black/40">{tag}</span>)}</div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-sm font-extrabold"><BookOpenCheck size={16} className="text-moss" /> Finder blueprint</h3><p className="mt-1 text-xs text-black/35">{selectedKit.quiz.questions.length} questions with answer-level matching rules and draft branching.</p></div><Link href="/dashboard/quizzes" className="text-xs font-extrabold text-moss">Builder <ArrowRight size={12} className="inline" /></Link></div>
                <div className="mt-5 space-y-3">
                  {selectedKit.quiz.questions.map((question, index) => (
                    <div key={question.key} className="rounded-2xl bg-canvas p-4">
                      <div className="flex items-start gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-xs font-extrabold text-moss">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{question.title}</p><p className="mt-1 text-[10px] leading-4 text-black/35">{question.helper_text}</p><div className="mt-3 flex flex-wrap gap-2">{question.options.map((option) => <span key={option.key} className="rounded-full bg-white px-2.5 py-1.5 text-[9px] font-bold text-black/45">{option.label} · {option.match_type === "none" ? "preference" : option.match_value}</span>)}</div></div></div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-black/[0.07] bg-ink p-5 text-white">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><PackagePlus size={16} className="text-lime" /> Configurator draft</h3>
                <p className="mt-2 text-xs leading-5 text-white/45">{selectedKit.configurator.subtitle}</p>
                <div className="mt-5 space-y-3">
                  {selectedKit.configurator.steps.map((step, index) => (
                    <div key={step.key} className="rounded-2xl bg-white/[0.06] p-4">
                      <div className="flex items-center justify-between"><p className="text-xs font-extrabold">{index + 1}. {step.title}</p><span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-extrabold uppercase text-white/35">{step.selection_type}</span></div>
                      <p className="mt-1 text-[10px] leading-4 text-white/35">{step.helper_text}</p>
                      <div className="mt-3 space-y-1.5">{step.options.map((option) => <div key={option.key} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2"><span className="text-[10px] font-bold text-white/70">{option.label}</span><span className="text-[9px] font-extrabold text-lime">{option.price_delta ? formatCurrency(option.price_delta) : "Included"}</span></div>)}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] p-5">
                <h3 className="flex items-center gap-2 text-sm font-extrabold"><ClipboardList size={16} className="text-moss" /> Readiness checks</h3>
                <div className="mt-4 space-y-2">
                  {readiness.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-3 rounded-xl bg-canvas p-3">
                      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", check.status === "pass" ? "bg-lime text-ink" : check.status === "warn" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}><Check size={11} /></span>
                      <div><p className="text-xs font-extrabold">{check.label}</p><p className="mt-1 text-[10px] leading-4 text-black/40">{check.detail}</p></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-5">
                <h3 className="text-sm font-extrabold">Launch playbook</h3>
                <div className="mt-4 space-y-2">
                  {selectedKit.launchPlaybook.map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-black/45"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-moss" /> {item}</p>)}
                </div>
                <Link href="/dashboard/preflight" className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Run preflight after edits <ExternalLink size={12} /></Link>
              </section>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
