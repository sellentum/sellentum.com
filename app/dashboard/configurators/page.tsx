"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ExternalLink, GripVertical, LoaderCircle, PackagePlus, Plus, Save, Settings2, Sparkles, Trash2, X } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { buildConfiguratorQaReport } from "@/lib/configurator-qa";
import { analyzeConfiguratorReadiness } from "@/lib/configurator-readiness";
import type { Configurator, ConfiguratorOption, ConfiguratorStep } from "@/lib/types";
import { describeConfiguratorSelection, flattenConfiguratorOptions, formatCurrency, getConfiguratorTotal, slugify, uid } from "@/lib/utils";

function commaList(value: string[]) {
  return value.join(", ");
}

function parseCommaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function ConfiguratorEditor({ selected, onBack }: { selected: Configurator; onBack: () => void }) {
  const { saveConfigurator, deleteConfigurator, products } = useStore();
  const [draft, setDraft] = useState<Configurator>(selected);
  const [activeStepId, setActiveStepId] = useState<string | null>(selected.steps[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    setDraft(selected);
    setActiveStepId(selected.steps[0]?.id || null);
  }, [selected]);

  const activeStep = draft.steps.find((step) => step.id === activeStepId);
  const allOptions = useMemo(() => flattenConfiguratorOptions(draft), [draft]);
  const previewSelectedIds = useMemo(() => draft.steps.flatMap((step) => step.options[0]?.id ? [step.options[0].id] : []), [draft.steps]);
  const previewSummary = describeConfiguratorSelection(draft, previewSelectedIds);
  const previewTotal = getConfiguratorTotal(draft, previewSelectedIds);
  const readiness = useMemo(() => analyzeConfiguratorReadiness(draft, products), [draft, products]);
  const pathQa = useMemo(() => buildConfiguratorQaReport([draft], products), [draft, products]);

  function updateStep(stepId: string, update: Partial<ConfiguratorStep>) {
    setDraft((current) => ({ ...current, steps: current.steps.map((step) => step.id === stepId ? { ...step, ...update } : step) }));
  }

  function updateOption(stepId: string, optionId: string, update: Partial<ConfiguratorOption>) {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => step.id === stepId ? { ...step, options: step.options.map((option) => option.id === optionId ? { ...option, ...update } : option) } : step),
    }));
  }

  function addStep() {
    const id = uid("config_step");
    const step: ConfiguratorStep = {
      id,
      configurator_id: draft.id,
      title: "New configurator step",
      helper_text: "Help shoppers choose the option that best fits.",
      selection_type: "single",
      required: true,
      position: draft.steps.length,
      options: [],
    };
    setDraft((current) => ({ ...current, steps: [...current.steps, step] }));
    setActiveStepId(id);
  }

  function deleteStep(stepId: string) {
    if (!confirm("Delete this configurator step and all its options?")) return;
    const steps = draft.steps.filter((step) => step.id !== stepId).map((step, index) => ({ ...step, position: index }));
    setDraft((current) => ({ ...current, steps }));
    setActiveStepId(steps[0]?.id || null);
  }

  function addOption(stepId: string) {
    const step = draft.steps.find((item) => item.id === stepId);
    if (!step) return;
    const product = products[step.options.length % Math.max(1, products.length)];
    const option: ConfiguratorOption = {
      id: uid("config_opt"),
      step_id: stepId,
      label: product?.name || "New option",
      description: product?.description || "Describe what this choice changes for the shopper.",
      image_url: product?.image_url || "",
      price_delta: product?.price || 0,
      product_id: product?.id,
      tags: product?.tags || [],
      incompatible_option_ids: [],
      position: step.options.length,
    };
    updateStep(stepId, { options: [...step.options, option] });
  }

  function deleteOption(stepId: string, optionId: string) {
    const step = draft.steps.find((item) => item.id === stepId);
    if (!step) return;
    const options = step.options
      .filter((option) => option.id !== optionId)
      .map((option, index) => ({ ...option, incompatible_option_ids: option.incompatible_option_ids.filter((id) => id !== optionId), position: index }));
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item) => item.id === stepId ? { ...item, options } : { ...item, options: item.options.map((option) => ({ ...option, incompatible_option_ids: option.incompatible_option_ids.filter((id) => id !== optionId) })) }),
    }));
  }

  function updateProduct(stepId: string, option: ConfiguratorOption, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateOption(stepId, option.id, {
      product_id: product?.id,
      label: product?.name || option.label,
      description: product?.description || option.description,
      image_url: product?.image_url || option.image_url,
      price_delta: product?.price ?? option.price_delta,
      tags: product ? [...new Set([...product.tags, product.category].filter(Boolean))] : option.tags,
    });
  }

  async function persist(publish?: boolean) {
    setPublishError("");
    if (publish === true && !readiness.canPublish) {
      setPublishError(`Fix ${readiness.blockers.length} launch blocker${readiness.blockers.length === 1 ? "" : "s"} before publishing.`);
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const next = { ...draft, published: publish ?? draft.published, slug: slugify(draft.slug || draft.name), steps: draft.steps.map((step, stepIndex) => ({ ...step, position: stepIndex, options: step.options.map((option, optionIndex) => ({ ...option, position: optionIndex })) })) };
      await saveConfigurator(next);
      setDraft(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100vh-68px)] flex-col sm:-m-7 lg:-m-9">
      <div className="flex flex-wrap items-center gap-3 border-b border-black/[0.07] bg-white px-4 py-3 sm:px-6">
        <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10"><ArrowLeft size={16} /></button>
        <div className="min-w-0 flex-1">
          <input aria-label="Configurator name" className="w-full max-w-lg truncate bg-transparent text-sm font-extrabold outline-none" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <p className="mt-0.5 text-[10px] text-black/35">{draft.steps.length} steps · {allOptions.length} options · {draft.published ? "Published" : "Draft"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {draft.published && <Link target="_blank" href={`/configurator/${draft.id}`} className="btn-secondary !px-3 !py-2 text-xs"><ExternalLink size={13} /> Preview</Link>}
          <button onClick={() => persist()} disabled={saving} className="btn-secondary !px-3 !py-2 text-xs">{saving ? <LoaderCircle className="animate-spin" size={14} /> : saved ? <Check size={14} /> : <Save size={14} />}{saved ? "Saved" : "Save"}</button>
          <button onClick={() => persist(!draft.published)} disabled={saving || (!draft.published && !readiness.canPublish)} title={!draft.published && !readiness.canPublish ? readiness.blockers[0]?.detail : undefined} className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50">{draft.published ? "Unpublish" : "Publish"}</button>
        </div>
      </div>
      {publishError && <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-xs font-bold text-red-700">{publishError}</div>}

      <div className="grid flex-1 lg:grid-cols-[270px_1fr_330px]">
        <aside className="border-b border-black/[0.07] bg-[#eef0eb] p-4 lg:border-b-0 lg:border-r">
          <p className="px-2 text-[9px] font-extrabold uppercase tracking-wider text-black/30">Configurator flow</p>
          <button onClick={() => setActiveStepId(null)} className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeStepId === null ? "bg-white shadow-sm" : "text-black/50 hover:bg-white/60"}`}><span className="grid h-6 w-6 place-items-center rounded-lg bg-lime/55 text-[10px]">✦</span> Setup</button>
          <div className="mt-3 space-y-1.5">
            {draft.steps.map((step, index) => <button key={step.id} onClick={() => setActiveStepId(step.id)} className={`group flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left ${step.id === activeStepId ? "bg-ink text-white shadow-sm" : "text-black/55 hover:bg-white"}`}><GripVertical size={13} className={step.id === activeStepId ? "text-white/30" : "text-black/20"} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-extrabold ${step.id === activeStepId ? "bg-lime text-ink" : "bg-black/5"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-[11px] font-bold">{step.title}</span><span className="text-[9px] opacity-45">{step.options.length}</span></button>)}
          </div>
          <button onClick={addStep} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-white/40 px-3 py-3 text-xs font-extrabold text-moss hover:bg-white"><Plus size={14} /> Add step</button>
          <div className="mt-5 border-t border-black/[0.07] pt-4"><button onClick={async () => { if (confirm("Delete this configurator permanently?")) { await deleteConfigurator(draft.id); onBack(); } }} className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold text-red-600"><Trash2 size={12} /> Delete configurator</button></div>
        </aside>

        <main className="min-h-[700px] bg-[#f8f8f5] p-4 sm:p-8 lg:p-10">
          {activeStep ? (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div><p className="eyebrow text-moss">Step {activeStep.position + 1}</p><h2 className="display mt-2 text-4xl">Configure choices</h2></div>
                <button onClick={() => deleteStep(activeStep.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-500"><Trash2 size={15} /></button>
              </div>

              <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6">
                <label className="label">Step title</label>
                <input className="field !text-base font-extrabold" value={activeStep.title} onChange={(event) => updateStep(activeStep.id, { title: event.target.value })} />
                <label className="label mt-4">Helper text</label>
                <textarea className="field min-h-20" value={activeStep.helper_text} onChange={(event) => updateStep(activeStep.id, { helper_text: event.target.value })} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Selection type</label><div className="relative"><select value={activeStep.selection_type} onChange={(event) => updateStep(activeStep.id, { selection_type: event.target.value as ConfiguratorStep["selection_type"] })} className="field appearance-none"><option value="single">Single choice</option><option value="multi">Multi-select</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25" size={13} /></div></div>
                  <label className="mt-6 flex items-center gap-2 rounded-xl border border-black/10 bg-canvas px-3 py-3 text-xs font-extrabold"><input type="checkbox" checked={activeStep.required} onChange={(event) => updateStep(activeStep.id, { required: event.target.checked })} /> Required before checkout</label>
                </div>
              </section>

              <div className="mt-6 flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Options</h3><p className="mt-1 text-[10px] text-black/35">Link an option to a product when it should appear in the final recommendation.</p></div><button onClick={() => addOption(activeStep.id)} className="btn-secondary !px-3 !py-2 text-xs"><Plus size={13} /> Add option</button></div>
              <div className="mt-3 space-y-3">
                {activeStep.options.map((option, index) => {
                  const otherOptions = allOptions.filter((item) => item.id !== option.id);
                  return (
                    <div key={option.id} className="rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="shrink-0 text-black/20" />
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime/45 text-[10px] font-extrabold">{String.fromCharCode(65 + index)}</span>
                        <input aria-label={`Option ${index + 1}`} className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-xs font-extrabold outline-none focus:border-black/15" value={option.label} onChange={(event) => updateOption(activeStep.id, option.id, { label: event.target.value })} />
                        <button onClick={() => deleteOption(activeStep.id, option.id)} className="text-black/25 hover:text-red-500"><X size={15} /></button>
                      </div>
                      <div className="mt-4 grid gap-3 border-t border-black/[0.05] pt-4 sm:grid-cols-2">
                        <div><label className="label !text-[9px]">Linked product</label><select className="field !py-2.5 text-xs" value={option.product_id || ""} onChange={(event) => updateProduct(activeStep.id, option, event.target.value)}><option value="">No linked product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>
                        <div><label className="label !text-[9px]">Price delta</label><input className="field !py-2.5 text-xs" type="number" value={option.price_delta} onChange={(event) => updateOption(activeStep.id, option.id, { price_delta: Number(event.target.value) })} /></div>
                        <div className="sm:col-span-2"><label className="label !text-[9px]">Description</label><textarea className="field min-h-20 !py-2.5 text-xs" value={option.description} onChange={(event) => updateOption(activeStep.id, option.id, { description: event.target.value })} /></div>
                        <div><label className="label !text-[9px]">Image URL</label><input className="field !py-2.5 text-xs" value={option.image_url} onChange={(event) => updateOption(activeStep.id, option.id, { image_url: event.target.value })} /></div>
                        <div><label className="label !text-[9px]">Tags</label><input className="field !py-2.5 text-xs" value={commaList(option.tags)} onChange={(event) => updateOption(activeStep.id, option.id, { tags: parseCommaList(event.target.value) })} placeholder="trail, waterproof, comfort" /></div>
                      </div>
                      {otherOptions.length > 0 && <details className="mt-4 rounded-xl bg-canvas p-3"><summary className="cursor-pointer text-[10px] font-extrabold text-moss">Compatibility rules</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{otherOptions.map((other) => <label key={other.id} className="flex items-center gap-2 text-[10px] font-bold text-black/50"><input type="checkbox" checked={option.incompatible_option_ids.includes(other.id)} onChange={(event) => updateOption(activeStep.id, option.id, { incompatible_option_ids: event.target.checked ? [...option.incompatible_option_ids, other.id] : option.incompatible_option_ids.filter((id) => id !== other.id) })} /> Not compatible with {other.label}</label>)}</div></details>}
                    </div>
                  );
                })}
                {!activeStep.options.length && <button onClick={() => addOption(activeStep.id)} className="w-full rounded-2xl border-2 border-dashed border-black/10 p-10 text-center text-xs font-extrabold text-black/35 hover:border-moss/30 hover:text-moss"><Plus className="mx-auto mb-2" size={18} /> Add the first option</button>}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl">
              <p className="eyebrow text-moss">Configurator setup</p>
              <h2 className="display mt-2 text-4xl">Name the experience</h2>
              <section className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-6">
                <label className="label">Public title</label>
                <input className="field !text-base font-extrabold" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                <label className="label mt-4">Subtitle</label>
                <textarea className="field min-h-24" value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div><label className="label">Base price</label><input className="field" type="number" value={draft.base_price} onChange={(event) => setDraft({ ...draft, base_price: Number(event.target.value) })} /></div>
                  <div><label className="label">Slug</label><div className="flex items-center rounded-xl border border-black/10 bg-canvas px-3"><span className="text-xs text-black/30">/configurator/</span><input className="min-w-0 flex-1 bg-transparent py-3 text-xs font-bold outline-none" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: slugify(event.target.value) })} /></div></div>
                </div>
                <label className="label mt-4">Hero image URL</label>
                <input className="field" value={draft.hero_image_url} onChange={(event) => setDraft({ ...draft, hero_image_url: event.target.value })} />
              </section>
            </div>
          )}
        </main>

        <aside className="hidden border-l border-black/[0.07] bg-white p-5 lg:block">
          <div className="flex items-center justify-between"><p className="text-xs font-extrabold">Live preview</p><span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-bold text-black/35">Desktop</span></div>
          <div className="mt-5 overflow-hidden rounded-[22px] border border-black/10 bg-[#e8eadf] p-3 shadow-sm">
            <div className="rounded-[17px] bg-ink p-4 text-white">
              <div className="flex items-center gap-2 text-[10px] font-extrabold"><span className="grid h-6 w-6 place-items-center rounded-lg bg-lime text-ink"><Sparkles size={11} /></span> Visual configurator</div>
              <h3 className="display mt-6 text-3xl leading-none">{draft.title}</h3>
              <p className="mt-2 text-[9px] leading-4 text-white/45">{draft.subtitle}</p>
              <div className="mt-5 rounded-xl bg-white/[.08] p-3"><p className="text-[9px] font-extrabold text-lime">Preview bundle</p><p className="mt-1 text-xl font-extrabold">{formatCurrency(previewTotal)}</p><div className="mt-3 flex flex-wrap gap-1">{previewSummary.tags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[7px] font-bold text-lime">{tag}</span>)}</div></div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-black/[0.07] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[10px] font-extrabold"><AlertTriangle size={13} className={readiness.canPublish ? "text-moss" : "text-amber-600"} /> Publish readiness</p>
              <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${readiness.canPublish ? "bg-lime/35 text-moss" : "bg-amber-50 text-amber-700"}`}>{readiness.score}% ready</span>
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-black/40">{readiness.canPublish ? readiness.warnings.length ? "This configurator can publish, but review warnings before embedding." : "This configurator is structurally ready to publish." : "Fix blockers before shoppers can receive a valid bundle."}</p>
            <div className="mt-3 space-y-1.5">
              {readiness.checks.map((item) => <div key={item.id} className={`rounded-lg px-2.5 py-2 ${item.severity === "blocker" ? "bg-red-50" : item.severity === "warning" ? "bg-amber-50" : "bg-canvas"}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.severity === "blocker" ? "bg-red-500" : item.severity === "warning" ? "bg-amber-500" : "bg-moss"}`} />
                  <span>
                    <span className="block text-[9px] font-extrabold">{item.label}</span>
                    <span className="mt-0.5 block text-[8px] font-bold leading-3 text-black/35">{item.detail}</span>
                  </span>
                </div>
              </div>)}
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-black/[0.07] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[10px] font-extrabold"><Check size={13} className={pathQa.status === "fail" ? "text-red-600" : pathQa.status === "warn" ? "text-amber-600" : "text-moss"} /> Path QA</p>
              <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold ${pathQa.status === "fail" ? "bg-red-50 text-red-700" : pathQa.status === "warn" ? "bg-amber-50 text-amber-700" : "bg-lime/35 text-moss"}`}>{pathQa.score}%</span>
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-black/40">{pathQa.headline}</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-canvas px-2 py-2"><p className="text-sm font-extrabold">{pathQa.summary.completionScenarios}</p><p className="text-[7px] font-bold text-black/30">Paths</p></div>
              <div className="rounded-lg bg-canvas px-2 py-2"><p className="text-sm font-extrabold">{pathQa.summary.compatibilityGuardrails}</p><p className="text-[7px] font-bold text-black/30">Rules</p></div>
              <div className="rounded-lg bg-canvas px-2 py-2"><p className="text-sm font-extrabold">{pathQa.summary.productLinkedScenarioRate}%</p><p className="text-[7px] font-bold text-black/30">Linked</p></div>
            </div>
            <div className="mt-3 space-y-1.5">
              {pathQa.scenarios.slice(0, 3).map((scenario) => <div key={scenario.id} className={`rounded-lg px-2.5 py-2 ${scenario.status === "fail" ? "bg-red-50" : scenario.status === "warn" ? "bg-amber-50" : "bg-canvas"}`}>
                <p className="text-[9px] font-extrabold">{scenario.label}</p>
                <p className="mt-0.5 text-[8px] font-bold leading-3 text-black/35">{scenario.detail}</p>
              </div>)}
              {!pathQa.scenarios.length && <p className="rounded-lg bg-canvas px-2.5 py-2 text-[8px] font-bold leading-3 text-black/35">Add options before path QA can simulate shopper bundles.</p>}
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-black/[0.07] p-3"><p className="flex items-center gap-2 text-[10px] font-extrabold"><Settings2 size={13} className="text-moss" /> Builder tip</p><p className="mt-1.5 text-[9px] leading-4 text-black/40">Use linked products for the main purchasable items. Use unlinked options for preferences, materials, service plans or add-ons.</p></div>
        </aside>
      </div>
    </div>
  );
}

export default function ConfiguratorsPage() {
  const { ready, configurators, createConfigurator, saveConfigurator, products, events } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = configurators.find((configurator) => configurator.id === selectedId);

  if (!ready) return <LoadingState label="Loading configurators…" />;
  if (selected) return <ConfiguratorEditor selected={selected} onBack={() => setSelectedId(null)} />;

  async function create() {
    const configurator = createConfigurator();
    const baseStepId = uid("config_step");
    configurator.steps = [
      {
        id: baseStepId,
        configurator_id: configurator.id,
        title: "Choose the main product",
        helper_text: "Pick the item that anchors the configured bundle.",
        selection_type: "single",
        required: true,
        position: 0,
        options: products.slice(0, 3).map((product, index) => ({
          id: uid("config_opt"),
          step_id: baseStepId,
          label: product.name,
          description: product.description,
          image_url: product.image_url,
          price_delta: product.price,
          product_id: product.id,
          tags: [...new Set([...product.tags, product.category].filter(Boolean))],
          incompatible_option_ids: [],
          position: index,
        })),
      },
    ];
    await saveConfigurator(configurator);
    setSelectedId(configurator.id);
  }

  return (
    <div className="animate-rise">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow text-moss">Visual selling</p><h1 className="display mt-2 text-4xl sm:text-5xl">Configurators</h1><p className="mt-2 text-sm text-black/45">Create guided bundles with compatible options, product-linked pricing and a polished customer workflow.</p></div>
        <button onClick={create} className="btn-primary self-start"><Plus size={16} /> Create configurator</button>
      </div>

      {configurators.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {configurators.map((configurator) => {
            const views = events.filter((event) => event.quiz_id === configurator.id && event.event_type === "widget_view").length;
            const completed = events.filter((event) => event.quiz_id === configurator.id && event.event_type === "quiz_complete").length;
            const options = flattenConfiguratorOptions(configurator).length;
            const qa = buildConfiguratorQaReport([configurator], products);
            return (
              <article key={configurator.id} className="group overflow-hidden rounded-2xl border border-black/[0.07] bg-white">
                <button onClick={() => setSelectedId(configurator.id)} className="relative block h-48 w-full overflow-hidden bg-ink p-5 text-left text-white">
                  {configurator.hero_image_url && <img src={configurator.hero_image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 transition group-hover:scale-105" />}
                  <div className="dot-grid absolute inset-0 opacity-20" />
                  <div className="relative flex h-full flex-col">
                    <span className={`self-end rounded-full px-2 py-1 text-[8px] font-extrabold ${configurator.published ? "bg-lime text-moss" : "bg-white/15 text-white/55"}`}>{configurator.published ? "Live" : "Draft"}</span>
                    <div className="mt-auto"><p className="eyebrow text-lime">Configurator</p><h2 className="mt-2 text-2xl font-extrabold leading-tight tracking-[-.05em]">{configurator.title}</h2></div>
                  </div>
                </button>
                <div className="p-5">
                  <h3 className="truncate text-sm font-extrabold">{configurator.name}</h3>
                  <p className="mt-1 text-[10px] text-black/35">{configurator.steps.length} steps · {options} options</p>
                  <div className="mt-5 grid grid-cols-4 divide-x divide-black/[0.07] rounded-xl bg-canvas py-3 text-center">
                    <div><p className="text-sm font-extrabold">{views}</p><p className="mt-0.5 text-[8px] font-bold text-black/30">Views</p></div>
                    <div><p className="text-sm font-extrabold">{completed}</p><p className="mt-0.5 text-[8px] font-bold text-black/30">Complete</p></div>
                    <div><p className="text-sm font-extrabold">{views ? Math.round(completed / views * 100) : 0}%</p><p className="mt-0.5 text-[8px] font-bold text-black/30">Rate</p></div>
                    <div><p className="text-sm font-extrabold">{qa.score}%</p><p className="mt-0.5 text-[8px] font-bold text-black/30">QA</p></div>
                  </div>
                  <div className="mt-4 flex gap-2"><button onClick={() => setSelectedId(configurator.id)} className="btn-secondary flex-1 !px-3 !py-2 text-xs">Edit configurator</button>{configurator.published && <Link href={`/configurator/${configurator.id}`} target="_blank" className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><ExternalLink size={13} /></Link>}</div>
                </div>
              </article>
            );
          })}
          <button onClick={create} className="grid min-h-[360px] place-items-center rounded-2xl border-2 border-dashed border-black/10 text-center transition hover:border-moss/30 hover:bg-white"><span><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><PackagePlus size={20} /></span><span className="mt-4 block text-sm font-extrabold">Create another configurator</span><span className="mt-1 block text-xs text-black/35">Start from your catalog</span></span></button>
        </div>
      ) : (
        <div className="mt-8 grid min-h-[450px] place-items-center rounded-2xl border-2 border-dashed border-black/10 bg-white/40 p-8 text-center">
          <div><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><PackagePlus size={25} /></span><h2 className="display mt-5 text-3xl">Build your first configurable bundle</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-black/40">Start with a product, add choices, then define which combinations should be allowed.</p><button onClick={create} className="btn-primary mt-5"><Plus size={15} /> Create configurator</button></div>
        </div>
      )}
    </div>
  );
}
