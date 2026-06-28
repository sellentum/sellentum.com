"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck, ShoppingBag, Sparkles, X } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { RecommendationFeedback } from "@/components/recommendation-feedback";
import { useStore } from "@/lib/store";
import { getSessionMetadata } from "@/lib/session";
import { buildConfiguratorOptionGuidance, buildConfiguratorSelectionGuidance } from "@/lib/configurator-guidance";
import { buildPublicExperienceCopy, normalizeWidgetSettings } from "@/lib/public-experience";
import type { Configurator, ConfiguratorOption, Product, WidgetSettings } from "@/lib/types";
import { describeConfiguratorSelection, formatCurrency, getConfiguratorProducts, getConfiguratorProgress, getConfiguratorTotal, optionConflictsWithSelection, updateConfiguratorSelection } from "@/lib/utils";

type ConfiguratorData = { configurator: Configurator; products: Product[]; settings: WidgetSettings };
type ConfiguratorRuntimeResult = {
  valid: boolean;
  errors: string[];
  selectedIds: string[];
  selectedOptions: ConfiguratorOption[];
  selectedProducts: Product[];
  primaryProduct?: Product;
  selectedOptionNames: string[];
  selectedTags: string[];
  total: number;
  progress: number;
  explanation: string;
};

export default function ConfiguratorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [data, setData] = useState<ConfiguratorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [validatingBundle, setValidatingBundle] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [validatedBundle, setValidatedBundle] = useState<ConfiguratorRuntimeResult | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [error, setError] = useState("");
  const viewed = useRef(false);
  const started = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    if (!store.ready) return;
    const localConfigurator = store.configurators.find((configurator) => configurator.id === id || configurator.slug === id);
    if (localConfigurator) {
      setData({ configurator: localConfigurator, products: store.products, settings: normalizeWidgetSettings(store.settings) });
      setLoading(false);
      return;
    }
    fetch(`/api/public/configurator/${id}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Configurator not found.")))
      .then((payload) => setData({ ...payload, settings: normalizeWidgetSettings(payload.settings) }))
      .catch((err) => setError(err instanceof Error ? err.message : "Configurator not found."))
      .finally(() => setLoading(false));
  }, [id, store.ready, store.configurators, store.products, store.settings]);

  const track = useCallback(async (eventType: "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click" | "recommendation_feedback", productId?: string, extraMetadata: Record<string, unknown> = {}, selectionOverride = selectedIds) => {
    if (!data) return;
    const summary = describeConfiguratorSelection(data.configurator, selectionOverride);
    const metadata = {
      experience_type: "configurator",
      experience_id: data.configurator.id,
      experience_name: data.configurator.name,
      experience_slug: data.configurator.slug,
      ...getSessionMetadata(),
      selections: selectionOverride,
      selected_options: summary.selected.map((option) => ({ id: option.id, step_id: option.step_id, label: option.label, price_delta: option.price_delta, product_id: option.product_id, tags: option.tags })),
      selected_option_names: summary.names,
      selected_tags: summary.tags,
      total: getConfiguratorTotal(data.configurator, selectionOverride),
      progress: getConfiguratorProgress(data.configurator, selectionOverride),
      ...extraMetadata,
    };
    setSavingEvent(true);
    try {
      if (store.mode === "demo") await store.recordEvent(eventType, data.configurator.id, productId, metadata);
      else await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, quizId: data.configurator.id, productId, metadata }) });
    } finally {
      setSavingEvent(false);
    }
  }, [data, selectedIds, store]);

  useEffect(() => {
    if (!data || viewed.current) return;
    viewed.current = true;
    track("widget_view");
  }, [data, track]);

  const configurator = data?.configurator;
  const products = data?.products || [];
  const settings = useMemo(() => normalizeWidgetSettings(data?.settings || store.settings), [data?.settings, store.settings]);
  const configuratorCopy = useMemo(() => buildPublicExperienceCopy("configurator", settings, { title: configurator?.title, description: configurator?.subtitle }), [settings, configurator?.title, configurator?.subtitle]);
  const accent = configuratorCopy.accentColor;
  const currentStep = configurator?.steps[stepIndex];
  const progress = configurator ? getConfiguratorProgress(configurator, selectedIds) : 0;
  const total = configurator ? getConfiguratorTotal(configurator, selectedIds) : 0;
  const selectedProducts = configurator ? getConfiguratorProducts(configurator, products, selectedIds) : [];
  const primaryProduct = selectedProducts[0];
  const selectionSummary = configurator ? describeConfiguratorSelection(configurator, selectedIds) : { selected: [], tags: [], names: [] };
  const stepComplete = currentStep ? !currentStep.required || currentStep.options.some((option) => selectedIds.includes(option.id)) : false;
  const displayTotal = complete && validatedBundle ? validatedBundle.total : total;
  const displayProgress = complete && validatedBundle ? validatedBundle.progress : progress;
  const displaySelectedOptions = complete && validatedBundle ? validatedBundle.selectedOptions : selectionSummary.selected;
  const displaySelectedProducts = complete && validatedBundle ? validatedBundle.selectedProducts : selectedProducts;
  const displayPrimaryProduct = complete && validatedBundle ? validatedBundle.primaryProduct : primaryProduct;
  const compatibilityGuidance = useMemo(() => configurator ? buildConfiguratorSelectionGuidance(configurator, selectedIds) : null, [configurator, selectedIds]);

  const explanation = useMemo(() => {
    if (complete && validatedBundle) return validatedBundle.explanation;
    if (!displayPrimaryProduct) return "Choose a base product and Findly will keep the rest of the bundle compatible.";
    const tags = selectionSummary.tags.slice(0, 4).join(", ");
    return `${displayPrimaryProduct.name} is the anchor product. The bundle is tuned around ${tags || "the options you selected"} and only keeps compatible choices in play.`;
  }, [complete, validatedBundle, displayPrimaryProduct, selectionSummary.tags]);

  function choose(optionId: string) {
    if (!configurator || !currentStep) return;
    const option = currentStep.options.find((item) => item.id === optionId);
    if (!option || optionConflictsWithSelection(option, selectedIds, configurator)) return;
    setValidationError("");
    setValidatedBundle(null);
    setSelectedIds((current) => {
      const next = updateConfiguratorSelection(configurator, current, currentStep.id, optionId);
      if (!started.current) {
        started.current = true;
        track("quiz_start", undefined, { step_id: currentStep.id, step_title: currentStep.title, selected_option_id: option.id, selected_option_label: option.label }, next);
      }
      return next;
    });
  }

  async function next() {
    if (!configurator || !stepComplete) return;
    if (stepIndex < configurator.steps.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setValidationError("");

    if (store.mode !== "demo") {
      setValidatingBundle(true);
      try {
        const response = await fetch(`/api/public/configurator/${encodeURIComponent(configurator.slug || configurator.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedIds }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.valid) throw new Error(payload.errors?.join(" ") || payload.error || "That bundle is not compatible.");
        setValidatedBundle(payload as ConfiguratorRuntimeResult);
        setComplete(true);
        if (!completed.current) {
          completed.current = true;
          track("quiz_complete", undefined, { result_count: payload.selectedProducts?.length || 0, primary_product_id: payload.primaryProduct?.id, primary_product_name: payload.primaryProduct?.name, server_validated: true }, payload.selectedIds || selectedIds);
          (payload.selectedProducts || []).forEach((product: Product, index: number) => track("product_recommended", product.id, { rank: index + 1, product_name: product.name, server_validated: true }, payload.selectedIds || selectedIds));
        }
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : "That bundle is not compatible.");
      } finally {
        setValidatingBundle(false);
      }
      return;
    }

    setComplete(true);
    if (!completed.current) {
      completed.current = true;
      track("quiz_complete", undefined, { result_count: selectedProducts.length, primary_product_id: primaryProduct?.id, primary_product_name: primaryProduct?.name });
      selectedProducts.forEach((product, index) => track("product_recommended", product.id, { rank: index + 1, product_name: product.name }));
    }
  }

  function restart() {
    setSelectedIds([]);
    setStepIndex(0);
    setComplete(false);
    setValidationError("");
    setValidatedBundle(null);
    setValidatingBundle(false);
    started.current = false;
    completed.current = false;
  }

  if (loading) return <LoadingState label="Loading configurator…" />;
  if (error || !data || !configurator) return <div className="grid min-h-screen place-items-center bg-canvas p-8 text-center"><div className="rounded-3xl bg-white p-9 shadow-soft"><p className="eyebrow text-moss">Configurator unavailable</p><h1 className="display mt-3 text-4xl">We couldn’t load that experience.</h1><p className="mt-3 text-sm text-black/45">{error || "Try another configurator link."}</p></div></div>;

  return (
    <main className="min-h-screen bg-[#f3f4ef] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-ink p-8 text-white lg:block">
          <div className="absolute inset-0 opacity-20 dot-grid" />
          {configurator.hero_image_url && <img src={configurator.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="relative flex min-h-full flex-col">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: accent }}><Sparkles size={15} /></span>{configuratorCopy.brandName}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-extrabold text-lime">{configuratorCopy.eyebrow}</span>
            </div>

            <div className="my-auto py-16">
              <p className="eyebrow text-lime">{configuratorCopy.widgetTitle}</p>
              <h1 className="mt-5 max-w-xl text-6xl font-extrabold leading-[.95] tracking-[-.065em]">{configuratorCopy.title}</h1>
              <p className="mt-6 max-w-lg text-sm leading-6 text-white/55">{configuratorCopy.description}</p>

              <div className="mt-10 max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[.08] p-4 backdrop-blur">
                <div className="grid grid-cols-[180px_1fr] gap-4">
                  <div className="relative h-44 overflow-hidden rounded-2xl bg-white/10">
                    {(displayPrimaryProduct?.image_url || displaySelectedOptions.find((option) => option.image_url)?.image_url) ? <img src={displayPrimaryProduct?.image_url || displaySelectedOptions.find((option) => option.image_url)?.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-lime"><ShoppingBag size={34} /></div>}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-lime">{complete ? "Configured result" : "Current setup"}</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">{displayPrimaryProduct?.name || "Your kit is taking shape"}</h2>
                    <p className="mt-3 text-xs leading-5 text-white/50">{explanation}</p>
                    <div className="mt-auto flex items-end justify-between">
                      <div><p className="text-xs text-white/35">Estimated total</p><p className="text-3xl font-extrabold tracking-[-.06em]">{formatCurrency(displayTotal)}</p></div>
                      <span className="rounded-full px-3 py-1.5 text-xs font-extrabold text-white" style={{ background: accent }}>{displayProgress}% ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["Compatible choices only", "Live price updates", "Product-linked checkout"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[.06] p-4 text-xs font-extrabold text-white/65"><ShieldCheck className="mb-3 text-lime" size={16} />{item}</div>)}
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col bg-[#f8f8f4]">
          <header className="flex items-center justify-between border-b border-black/[0.07] bg-white px-6 py-4">
            <div><p className="eyebrow text-moss">{complete ? "Your configured bundle" : `Step ${Math.min(stepIndex + 1, configurator.steps.length)} of ${configurator.steps.length}`}</p><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em]">{complete ? "Ready to review" : currentStep?.title}</h2></div>
            <div className="text-right"><p className="text-xs font-bold text-black/30">Total</p><p className="text-lg font-extrabold">{formatCurrency(displayTotal)}</p></div>
          </header>

          <div className="h-1.5 bg-black/[0.04]"><div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${complete ? 100 : progress}%`, background: accent }} /></div>

          {!complete && currentStep && (
            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="mx-auto max-w-3xl">
                <p className="text-sm leading-6 text-black/45">{currentStep.helper_text}</p>
                <div className="mt-8 grid gap-3">
                  {currentStep.options.map((option, index) => {
                    const selected = selectedIds.includes(option.id);
                    const disabled = !selected && optionConflictsWithSelection(option, selectedIds, configurator);
                    const guidance = buildConfiguratorOptionGuidance(configurator, option.id, selectedIds);
                    const alternativeLabels = guidance?.safeAlternativeIds
                      .map((alternativeId) => currentStep.options.find((item) => item.id === alternativeId)?.label)
                      .filter(Boolean) || [];
                    return (
                      <button key={option.id} onClick={() => choose(option.id)} disabled={disabled} className={`group grid grid-cols-[88px_1fr_auto] items-center gap-4 rounded-3xl border p-3 text-left transition ${selected ? "border-ink bg-ink text-white shadow-lg" : disabled ? "border-black/5 bg-black/[0.03] text-black/25" : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/25 hover:shadow-md"}`}>
                        <div className="h-20 overflow-hidden rounded-2xl bg-[#eceee8]">
                          {option.image_url ? <img src={option.image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Sparkles size={18} className={selected ? "text-lime" : "text-moss"} /></div>}
                        </div>
                        <span>
                          <span className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-extrabold ${selected ? "border-lime bg-lime text-ink" : "border-black/10 bg-canvas text-black/40"}`}>{selected ? <Check size={12} /> : String.fromCharCode(65 + index)}</span><span className="font-extrabold">{option.label}</span></span>
                          <span className={`mt-2 block text-xs leading-5 ${selected ? "text-white/55" : "text-black/45"}`}>{option.description}</span>
                          <span className="mt-3 flex flex-wrap gap-1.5">{option.tags.slice(0, 4).map((tag) => <span key={tag} className={`rounded-full px-2 py-1 text-xs font-bold ${selected ? "bg-white/10 text-lime" : "bg-lime/30 text-moss"}`}>{tag}</span>)}</span>
                          {disabled && guidance && <span className="mt-3 block rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-4 text-red-600">
                            {guidance.explanation}
                            {alternativeLabels.length ? ` Try ${alternativeLabels.slice(0, 2).join(" or ")} instead.` : " Go back and change the conflicting choice to unlock it."}
                          </span>}
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-extrabold">{option.price_delta ? formatCurrency(option.price_delta) : "Included"}</span>
                          {disabled && <span className="mt-1 block text-xs font-bold text-red-500">Not compatible</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {complete && (
            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="mx-auto max-w-4xl">
                <div className="rounded-[30px] border border-black/10 bg-white p-7 shadow-soft">
                  <div className="flex items-start justify-between gap-6">
                    <div><p className="eyebrow text-moss">Compatibility checked</p><h1 className="display mt-3 text-5xl">Your kit is ready.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-black/50">{explanation}</p></div>
                    <span className="rounded-full bg-lime px-4 py-2 text-xs font-extrabold text-moss">{formatCurrency(displayTotal)}</span>
                  </div>
                  <div className="mt-8 grid gap-3 lg:grid-cols-2">
                    {displaySelectedOptions.map((option) => {
                      const linkedProduct = option.product_id ? displaySelectedProducts.find((product) => product.id === option.product_id) || products.find((product) => product.id === option.product_id) : undefined;
                      return <div key={option.id} className="flex gap-3 rounded-2xl bg-[#f1f3ed] p-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">{(linkedProduct?.image_url || option.image_url) && <img src={linkedProduct?.image_url || option.image_url} alt="" className="h-full w-full object-cover" />}</div><div><p className="text-xs font-extrabold">{option.label}</p><p className="mt-1 text-xs leading-4 text-black/45">{option.description}</p><p className="mt-1 text-xs font-extrabold text-moss">{option.price_delta ? formatCurrency(option.price_delta) : "Included"}</p></div></div>;
                    })}
                  </div>
                  {compatibilityGuidance && <div className="mt-6 rounded-2xl border border-black/[0.06] bg-[#f7f8f4] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-extrabold">Compatibility guidance</p>
                        <p className="mt-1 text-xs leading-4 text-black/40">{compatibilityGuidance.summary}</p>
                      </div>
                      <span className="rounded-full bg-lime/35 px-3 py-1 text-xs font-extrabold text-moss">{compatibilityGuidance.availableOptions.length} safe options</span>
                    </div>
                    {compatibilityGuidance.blockedOptions.length ? <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {compatibilityGuidance.blockedOptions.slice(0, 4).map((item) => <div key={item.optionId} className="rounded-xl bg-white p-3">
                        <p className="text-xs font-extrabold">{item.explanation}</p>
                        <p className="mt-1 text-xs leading-4 text-black/40">{item.suggestion}</p>
                      </div>)}
                    </div> : null}
                  </div>}
                  {displayPrimaryProduct && <div className="mt-6 max-w-md"><RecommendationFeedback productId={displayPrimaryProduct.id} productName={displayPrimaryProduct.name} onFeedback={(feedback, feedbackReason) => track("recommendation_feedback", displayPrimaryProduct.id, { feedback, feedback_reason: feedbackReason, product_name: displayPrimaryProduct.name, primary_product_id: displayPrimaryProduct.id, primary_product_name: displayPrimaryProduct.name, bundle_total: displayTotal, selected_option_names: displaySelectedOptions.map((option) => option.label), server_validated: Boolean(validatedBundle), feedback_surface: "configurator_bundle_result" }, validatedBundle?.selectedIds || selectedIds)} /></div>}
                  <div className="mt-8 flex flex-wrap gap-3">
                    {displayPrimaryProduct ? <a href={displayPrimaryProduct.product_url || "#"} target="_blank" rel="noreferrer" onClick={() => track("buy_click", displayPrimaryProduct.id, { product_name: displayPrimaryProduct.name, primary_product_id: displayPrimaryProduct.id, primary_product_name: displayPrimaryProduct.name, server_validated: Boolean(validatedBundle) }, validatedBundle?.selectedIds || selectedIds)} className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-extrabold text-white" style={{ background: accent }}>Buy configured kit <ExternalLink size={14} /></a> : <button className="btn-primary">Request quote</button>}
                    <button onClick={restart} className="btn-secondary"><RefreshCcw size={14} /> Start again</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="flex items-center justify-between border-t border-black/[0.07] bg-white px-6 py-4">
            <button onClick={() => complete ? setComplete(false) : stepIndex > 0 ? setStepIndex(stepIndex - 1) : restart()} className="inline-flex items-center gap-2 text-xs font-extrabold text-black/45 hover:text-ink"><ArrowLeft size={14} />{complete ? "Edit choices" : stepIndex > 0 ? "Back" : "Reset"}</button>
            <div className="flex items-center gap-3">
              {validationError && <span className="max-w-[360px] rounded-full bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600">{validationError}</span>}
              {savingEvent && <span className="hidden items-center gap-1 text-xs font-bold text-black/25 lg:flex"><LoaderCircle className="animate-spin" size={11} />Syncing analytics</span>}
              {!complete && <button onClick={next} disabled={!stepComplete || validatingBundle} className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-extrabold text-white disabled:opacity-40" style={{ background: accent }}>{validatingBundle ? <LoaderCircle className="animate-spin" size={14} /> : stepIndex === configurator.steps.length - 1 ? "Review bundle" : "Continue"} {!validatingBundle && <ArrowRight size={14} />}</button>}
              {complete && <button onClick={restart} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-xs font-extrabold"><X size={13} /> Clear</button>}
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
