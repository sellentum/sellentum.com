"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Ban, Check, ChevronDown, ChevronRight, ExternalLink, GitBranch, GripVertical, HelpCircle, LayoutTemplate, LoaderCircle, MoreHorizontal, Pin, Plus, Save, SlidersHorizontal, Sparkles, Trash2, TrendingUp, X, type LucideIcon } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { analyzeQuizReadiness } from "@/lib/quiz-readiness";
import { getAnswerOptionCoverage, type AnswerOptionRuleCoverage } from "@/lib/rule-coverage";
import type { AnswerOption, GeneratedQuizSuggestion, MatchType, Question, Quiz, RecommendationOverride } from "@/lib/types";
import { slugify, uid } from "@/lib/utils";

const typeLabels: Record<MatchType, string> = { tag: "Product tag", category: "Category", feature: "Feature contains", budget_max: "Maximum price", none: "No filter / preference only" };
const overrideLabels: Record<RecommendationOverride["action"], string> = { boost: "Boost", pin: "Pin to top", exclude: "Exclude" };
const overrideIcons: Record<RecommendationOverride["action"], LucideIcon> = { boost: TrendingUp, pin: Pin, exclude: Ban };

function RuleCoverageRow({ label, coverage }: { label: string; coverage?: AnswerOptionRuleCoverage }) {
  if (!coverage) return null;
  const tone = coverage.status === "matched" ? "bg-lime/25 text-moss" : coverage.status === "preference" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  const dot = coverage.status === "matched" ? "bg-moss" : coverage.status === "preference" ? "bg-blue-500" : "bg-amber-500";
  const summary = coverage.status === "matched" ? `${coverage.count} product match${coverage.count === 1 ? "" : "es"}` : coverage.status === "preference" ? "Preference-only" : "No product match";

  return <div className={`rounded-xl px-3 py-2 ${tone}`}>
    <div className="flex items-start gap-2">
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="truncate text-xs font-extrabold">{label || "Untitled answer"} · {summary}</p>
        <p className="mt-0.5 text-xs font-bold leading-3 opacity-70">{coverage.detail}</p>
      </div>
    </div>
  </div>;
}

function QuizEditor({ selected, onBack }: { selected: Quiz; onBack: () => void }) {
  const { saveQuiz, deleteQuiz, products, settings } = useStore();
  const [draft, setDraft] = useState<Quiz>({ ...selected, recommendation_overrides: selected.recommendation_overrides || [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(selected.questions[0]?.id || null);
  const [overrideProductId, setOverrideProductId] = useState(products[0]?.id || "");
  const [overrideAction, setOverrideAction] = useState<RecommendationOverride["action"]>("boost");
  const [overrideWeight, setOverrideWeight] = useState(3);
  const [overrideNote, setOverrideNote] = useState("");
  const [publishError, setPublishError] = useState("");
  useEffect(() => { setDraft({ ...selected, recommendation_overrides: selected.recommendation_overrides || [] }); setActiveQuestion(selected.questions[0]?.id || null); }, [selected]);
  useEffect(() => { if (!overrideProductId && products[0]) setOverrideProductId(products[0].id); }, [overrideProductId, products]);
  const active = draft.questions.find((q) => q.id === activeQuestion);
  const overrides = draft.recommendation_overrides || [];
  const readiness = useMemo(() => analyzeQuizReadiness(draft, products), [draft, products]);
  const coverageByOptionId = useMemo(() => Object.fromEntries(draft.questions.flatMap((question) => question.options.map((option) => [option.id, getAnswerOptionCoverage(option, products)] as const))) as Record<string, AnswerOptionRuleCoverage>, [draft.questions, products]);
  const updateQuestion = (questionId: string, update: Partial<Question>) => setDraft((current) => ({ ...current, questions: current.questions.map((q) => q.id === questionId ? { ...q, ...update } : q) }));
  const updateOption = (questionId: string, optionId: string, update: Partial<AnswerOption>) => setDraft((current) => ({ ...current, questions: current.questions.map((q) => q.id === questionId ? { ...q, options: q.options.map((o) => o.id === optionId ? { ...o, ...update } : o) } : q) }));
  function addQuestion() { const id = uid("q"); const question: Question = { id, quiz_id: draft.id, title: "New question", helper_text: "", position: draft.questions.length, options: [] }; setDraft((current) => ({ ...current, questions: [...current.questions, question] })); setActiveQuestion(id); }
  function deleteQuestion(id: string) { if (!confirm("Delete this question and its answers?")) return; const questions = draft.questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, position: i, options: q.options.map((option) => ({ ...option, next_question_id: option.next_question_id === id ? null : option.next_question_id || null })) })); setDraft((current) => ({ ...current, questions })); setActiveQuestion(questions[0]?.id || null); }
  function addOption(questionId: string) { const option: AnswerOption = { id: uid("option"), question_id: questionId, label: "New answer", match_type: "tag", match_value: "", weight: 3, next_question_id: null, position: active?.options.length || 0 }; updateQuestion(questionId, { options: [...(active?.options || []), option] }); }
  function deleteOption(questionId: string, optionId: string) { updateQuestion(questionId, { options: active?.options.filter((o) => o.id !== optionId).map((o, i) => ({ ...o, position: i })) || [] }); }
  function addOverride() {
    if (!overrideProductId) return;
    const next: RecommendationOverride = { id: uid("override"), product_id: overrideProductId, action: overrideAction, weight: overrideAction === "exclude" ? 0 : overrideWeight, note: overrideNote.trim() };
    setDraft((current) => ({ ...current, recommendation_overrides: [...(current.recommendation_overrides || []).filter((item) => !(item.product_id === next.product_id && item.action === next.action)), next] }));
    setOverrideNote("");
  }
  function removeOverride(id: string) { setDraft((current) => ({ ...current, recommendation_overrides: (current.recommendation_overrides || []).filter((item) => item.id !== id) })); }
  async function persist(publish?: boolean) {
    setPublishError("");
    if (publish === true && !readiness.canPublish) {
      setPublishError(`Fix ${readiness.blockers.length} launch blocker${readiness.blockers.length === 1 ? "" : "s"} before publishing.`);
      return;
    }
    setSaving(true); setSaved(false);
    try {
      const next = { ...draft, recommendation_overrides: draft.recommendation_overrides || [], published: publish ?? draft.published, slug: slugify(draft.slug || draft.name) };
      await saveQuiz(next);
      setDraft(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  }
  const suggestions = useMemo(() => ({ tag: [...new Set(products.flatMap((p) => p.tags))], category: [...new Set(products.map((p) => p.category))], feature: [...new Set(products.flatMap((p) => p.features))] }), [products]);

  return <div className="-m-4 flex min-h-[calc(100vh-68px)] flex-col sm:-m-7 lg:-m-9">
    <div className="flex flex-wrap items-center gap-3 border-b border-black/[0.07] bg-white px-4 py-3 sm:px-6">
      <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-xl border border-black/10"><ArrowLeft size={16} /></button>
      <div className="min-w-0 flex-1"><input aria-label="Finder name" className="w-full max-w-lg truncate bg-transparent text-sm font-extrabold outline-none" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><p className="mt-0.5 text-xs text-black/35">{draft.questions.length} questions · {draft.published ? "Published" : "Draft"}</p></div>
      <div className="ml-auto flex items-center gap-2">{draft.published && <Link target="_blank" href={`/finder/${draft.id}`} className="btn-secondary !px-3 !py-2 text-xs"><ExternalLink size={13} /> <span className="hidden sm:inline">Preview</span></Link>}<button onClick={() => persist()} disabled={saving} className="btn-secondary !px-3 !py-2 text-xs">{saving ? <LoaderCircle className="animate-spin" size={14} /> : saved ? <Check size={14} /> : <Save size={14} />}<span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span></button><button onClick={() => persist(!draft.published)} disabled={saving || (!draft.published && !readiness.canPublish)} title={!draft.published && !readiness.canPublish ? readiness.blockers[0]?.detail : undefined} className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50">{draft.published ? "Unpublish" : "Publish finder"}</button></div>
    </div>
    {publishError && <div className="border-b border-red-100 bg-red-50 px-6 py-2 text-xs font-bold text-red-700">{publishError}</div>}
    <div className="grid flex-1 lg:grid-cols-[260px_1fr_315px]">
      <aside className="border-b border-black/[0.07] bg-[#eef0eb] p-4 lg:border-b-0 lg:border-r">
        <p className="px-2 text-xs font-extrabold uppercase tracking-wider text-black/30">Conversation flow</p>
        <button onClick={() => setActiveQuestion(null)} className={`mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold ${activeQuestion === null ? "bg-white shadow-sm" : "text-black/50 hover:bg-white/60"}`}><span className="grid h-6 w-6 place-items-center rounded-lg bg-peach/50 text-xs">👋</span> Welcome screen</button>
        <div className="my-2 ml-6 h-3 border-l border-dashed border-black/15" />
        <div className="space-y-1.5">{draft.questions.map((question, index) => <div key={question.id}><button onClick={() => setActiveQuestion(question.id)} className={`group flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left ${question.id === activeQuestion ? "bg-ink text-white shadow-sm" : "text-black/55 hover:bg-white"}`}><GripVertical size={13} className={question.id === activeQuestion ? "text-white/30" : "text-black/20"} /><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${question.id === activeQuestion ? "bg-lime text-ink" : "bg-black/5"}`}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs font-bold">{question.title}</span><ChevronRight size={12} className="opacity-35" /></button>{index < draft.questions.length - 1 && <div className="my-1 ml-7 h-2 border-l border-dashed border-black/15" />}</div>)}</div>
        <button onClick={addQuestion} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-white/40 px-3 py-3 text-xs font-extrabold text-moss hover:bg-white"><Plus size={14} /> Add question</button>
        <div className="mt-5 border-t border-black/[0.07] pt-4"><button onClick={async () => { if (confirm("Delete this finder permanently?")) { await deleteQuiz(draft.id); onBack(); } }} className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-red-600"><Trash2 size={12} /> Delete finder</button></div>
      </aside>

      <main className="min-h-[650px] bg-[#f8f8f5] p-4 sm:p-8 lg:p-10">
        {active ? <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between"><div><p className="eyebrow text-moss">Question {active.position + 1}</p><h2 className="display mt-2 text-4xl">Shape the answer path</h2></div><button onClick={() => deleteQuestion(active.id)} className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-500"><Trash2 size={15} /></button></div>
          <section className="rounded-2xl border border-black/[0.07] bg-white p-5 sm:p-6"><label className="label">Question</label><input className="field !text-base font-extrabold" value={active.title} onChange={(e) => updateQuestion(active.id, { title: e.target.value })} /><label className="label mt-4">Helper text <span className="font-normal text-black/30">(optional)</span></label><input className="field" value={active.helper_text} onChange={(e) => updateQuestion(active.id, { helper_text: e.target.value })} placeholder="Give shoppers a little more context" /></section>
          <div className="mt-6 flex items-center justify-between"><div><h3 className="text-sm font-extrabold">Answer options</h3><p className="mt-1 text-xs text-black/35">Each option can add a deterministic product-matching signal.</p></div><button onClick={() => addOption(active.id)} className="btn-secondary !px-3 !py-2 text-xs"><Plus size={13} /> Add answer</button></div>
          <div className="mt-3 space-y-3">{active.options.map((option, index) => <div key={option.id} className="rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><GripVertical size={14} className="shrink-0 text-black/20" /><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-lime/45 text-xs font-extrabold">{String.fromCharCode(65 + index)}</span><input aria-label={`Answer ${index + 1}`} className="min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-xs font-extrabold outline-none focus:border-black/15" value={option.label} onChange={(e) => updateOption(active.id, option.id, { label: e.target.value })} /><button onClick={() => deleteOption(active.id, option.id)} className="text-black/25 hover:text-red-500"><X size={15} /></button></div><div className="mt-4 grid gap-3 border-t border-black/[0.05] pt-4 sm:grid-cols-[1fr_1fr_120px_80px]"><div><label className="label !text-xs">Match using</label><div className="relative"><select className="field appearance-none !py-2.5 text-xs" value={option.match_type} onChange={(e) => updateOption(active.id, option.id, { match_type: e.target.value as MatchType, match_value: "" })}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/25" size={12} /></div></div><div><label className="label !text-xs">Match value</label>{option.match_type === "budget_max" ? <input className="field !py-2.5 text-xs" type="number" min="0" value={option.match_value} onChange={(e) => updateOption(active.id, option.id, { match_value: e.target.value })} placeholder="e.g. 100" /> : option.match_type === "none" ? <input className="field !py-2.5 text-xs" disabled value="No product filter" /> : <div className="relative"><input className="field !py-2.5 text-xs" list={`${option.id}-suggestions`} value={option.match_value} onChange={(e) => updateOption(active.id, option.id, { match_value: e.target.value })} placeholder={`Choose ${typeLabels[option.match_type].toLowerCase()}`} /><datalist id={`${option.id}-suggestions`}>{suggestions[option.match_type as "tag" | "category" | "feature"]?.map((item) => <option key={item} value={item} />)}</datalist></div>}</div><div><label className="label !text-xs">Then show</label><select className="field !py-2.5 text-xs" value={option.next_question_id || ""} onChange={(e) => updateOption(active.id, option.id, { next_question_id: e.target.value || null })}><option value="">Default</option>{draft.questions.filter((question) => question.position > active.position).map((question) => <option key={question.id} value={question.id}>{question.position + 1}. {question.title}</option>)}</select></div><div><label className="label !text-xs">Weight</label><select className="field !py-2.5 text-xs" value={option.weight} onChange={(e) => updateOption(active.id, option.id, { weight: Number(e.target.value) })}><option value={1}>Low</option><option value={3}>Med</option><option value={5}>High</option></select></div></div></div>)}{!active.options.length && <button onClick={() => addOption(active.id)} className="w-full rounded-2xl border-2 border-dashed border-black/10 p-10 text-center text-xs font-extrabold text-black/35 hover:border-moss/30 hover:text-moss"><Plus className="mx-auto mb-2" size={18} /> Add the first answer</button>}</div>
        </div> : <div className="mx-auto max-w-2xl"><p className="eyebrow text-moss">Welcome screen</p><h2 className="display mt-2 text-4xl">Start with a warm hello</h2><section className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-6"><label className="label">Headline</label><input className="field !text-base font-extrabold" value={draft.welcome_title} onChange={(e) => setDraft({ ...draft, welcome_title: e.target.value })} /><label className="label mt-4">Welcome message</label><textarea className="field min-h-24" value={draft.welcome_message} onChange={(e) => setDraft({ ...draft, welcome_message: e.target.value })} /><label className="label mt-4">Workspace slug</label><div className="flex items-center rounded-xl border border-black/10 bg-canvas px-3"><span className="text-xs text-black/30">slug:</span><input className="min-w-0 flex-1 bg-transparent py-3 text-xs font-bold outline-none" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} /></div><p className="mt-1 text-xs text-black/30">Production previews and widget snippets use the stable finder ID, so this label can safely repeat across workspaces.</p></section><div className="mt-5 rounded-2xl bg-lime/25 p-4"><p className="flex items-center gap-2 text-xs font-extrabold"><Sparkles size={14} /> A good welcome makes the value clear</p><p className="mt-1.5 text-xs leading-4 text-black/45">Tell shoppers how many questions to expect and what they’ll get at the end.</p></div></div>}
      </main>

      <aside className="hidden border-l border-black/[0.07] bg-white p-5 lg:block">
        <div className="flex items-center justify-between"><p className="text-xs font-extrabold">Live preview</p><span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold text-black/35">Desktop</span></div>
        <div className="mt-5 overflow-hidden rounded-[22px] border border-black/10 bg-[#e8eadf] p-3 shadow-sm"><div className="rounded-[17px] bg-white p-4"><div className="flex items-center gap-2 text-xs font-extrabold"><span className="grid h-6 w-6 place-items-center rounded-lg bg-ink text-lime"><Sparkles size={11} /></span> {settings.brand_name}</div><div className="mt-5 h-1 overflow-hidden rounded-full bg-black/5"><div className="h-full w-1/3 bg-lime" /></div><p className="mt-6 text-xs font-extrabold uppercase tracking-wider text-moss">Question {(active?.position || 0) + 1}</p><h3 className="display mt-2 text-2xl leading-none">{active?.title || draft.welcome_title}</h3><p className="mt-2 text-xs leading-4 text-black/35">{active?.helper_text || draft.welcome_message}</p><div className="mt-5 space-y-2">{active ? active.options.slice(0, 4).map((option, index) => <div key={option.id} className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold ${index === 0 ? "border-ink bg-ink text-white" : "border-black/10"}`}><span className={`grid h-4 w-4 place-items-center rounded-full border ${index === 0 ? "border-lime bg-lime text-ink" : "border-black/15"}`}>{index === 0 && <Check size={8} />}</span>{option.label}</div>) : <button className="mt-2 w-full rounded-full bg-ink py-2.5 text-xs font-extrabold text-white">Get started →</button>}</div></div></div>
        <div className="mt-5 rounded-xl border border-black/[0.07] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-extrabold"><AlertTriangle size={13} className={readiness.canPublish ? "text-moss" : "text-amber-600"} /> Publish readiness</p>
            <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${readiness.canPublish ? "bg-lime/35 text-moss" : "bg-amber-50 text-amber-700"}`}>{readiness.score}% ready</span>
          </div>
          <p className="mt-1.5 text-xs leading-4 text-black/40">{readiness.canPublish ? readiness.warnings.length ? "This finder can publish, but review warnings before embedding." : "This finder is structurally ready to publish." : "Fix blockers before shoppers can receive reliable recommendations."}</p>
          <div className="mt-3 space-y-1.5">
            {readiness.checks.map((item) => <div key={item.id} className={`rounded-lg px-2.5 py-2 ${item.severity === "blocker" ? "bg-red-50" : item.severity === "warning" ? "bg-amber-50" : "bg-canvas"}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${item.severity === "blocker" ? "bg-red-500" : item.severity === "warning" ? "bg-amber-500" : "bg-moss"}`} />
                <span>
                  <span className="block text-xs font-extrabold">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-bold leading-3 text-black/35">{item.detail}</span>
                </span>
              </div>
            </div>)}
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-black/[0.07] p-3"><p className="flex items-center gap-2 text-xs font-extrabold"><HelpCircle size={13} className="text-moss" /> Matching tip</p><p className="mt-1.5 text-xs leading-4 text-black/40">Use high weights for answers that should strongly shape the result. Budget always acts as an eligibility signal.</p></div>
        <div className="mt-5 rounded-xl border border-black/[0.07] p-3"><p className="flex items-center gap-2 text-xs font-extrabold"><GitBranch size={13} className="text-moss" /> Branching tip</p><p className="mt-1.5 text-xs leading-4 text-black/40">Use “Then show” when one answer should skip ahead to a more relevant next question. The live finder follows only the selected path.</p></div>
        {active && <div className="mt-5 rounded-xl border border-black/[0.07] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-extrabold"><Check size={13} className="text-moss" /> Rule coverage</p>
            <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-extrabold text-black/35">{active.options.length} answers</span>
          </div>
          <p className="mt-1.5 text-xs leading-4 text-black/40">Check whether each answer actually reaches active products before publishing.</p>
          <div className="mt-3 space-y-2">
            {active.options.map((option) => <RuleCoverageRow key={option.id} label={option.label} coverage={coverageByOptionId[option.id]} />)}
            {!active.options.length && <p className="rounded-xl bg-canvas p-3 text-xs font-bold leading-4 text-black/35">Add answer options to see rule coverage.</p>}
          </div>
        </div>}
        <div className="mt-5 rounded-xl border border-black/[0.07] p-3">
          <p className="flex items-center gap-2 text-xs font-extrabold"><SlidersHorizontal size={13} className="text-moss" /> Merchandising</p>
          <p className="mt-1.5 text-xs leading-4 text-black/40">Pin, boost or exclude specific products for this finder while keeping answer matching deterministic.</p>
          <div className="mt-3 space-y-2">
            {overrides.map((override) => {
              const product = products.find((item) => item.id === override.product_id);
              const Icon = overrideIcons[override.action];
              return <div key={override.id} className="rounded-xl bg-canvas p-2.5">
                <div className="flex items-start gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-moss"><Icon size={13} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-extrabold">{overrideLabels[override.action]} · {product?.name || "Missing product"}</p>
                    <p className="mt-0.5 text-xs font-bold text-black/35">{override.action === "exclude" ? "Hard filter" : `Adds ${override.action === "pin" ? "top priority" : `+${override.weight} points`}`}{override.note ? ` · ${override.note}` : ""}</p>
                  </div>
                  <button onClick={() => removeOverride(override.id)} className="text-black/25 hover:text-red-500" aria-label="Remove override"><X size={13} /></button>
                </div>
              </div>;
            })}
            {!overrides.length && <p className="rounded-xl bg-canvas p-3 text-xs font-bold leading-4 text-black/35">No product pins, boosts or exclusions yet.</p>}
          </div>
          {products.length ? <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
            <select value={overrideProductId} onChange={(e) => setOverrideProductId(e.target.value)} className="field !py-2 text-xs font-bold">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
            <div className="grid grid-cols-[1fr_78px] gap-2">
              <select value={overrideAction} onChange={(e) => setOverrideAction(e.target.value as RecommendationOverride["action"])} className="field !py-2 text-xs font-bold">{Object.entries(overrideLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={overrideWeight} onChange={(e) => setOverrideWeight(Number(e.target.value))} disabled={overrideAction === "exclude"} className="field !py-2 text-xs font-bold disabled:opacity-40"><option value={1}>+1</option><option value={3}>+3</option><option value={5}>+5</option><option value={10}>+10</option></select>
            </div>
            <input value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} className="field !py-2 text-xs" placeholder="Internal note, optional" />
            <button onClick={addOverride} className="btn-secondary w-full !px-3 !py-2 text-xs"><Plus size={12} /> Add control</button>
          </div> : <p className="mt-3 rounded-xl bg-canvas p-3 text-xs font-bold leading-4 text-black/35">Add catalog products before creating merchandising controls.</p>}
        </div>
      </aside>
    </div>
  </div>;
}

export default function QuizzesPage() {
  const { ready, quizzes, createQuiz, saveQuiz, events, products } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const selected = quizzes.find((q) => q.id === selectedId);
  if (!ready) return <LoadingState label="Loading your product finders…" />;
  if (selected) return <QuizEditor selected={selected} onBack={() => setSelectedId(null)} />;
  async function create() { const quiz = createQuiz(); await saveQuiz(quiz); setSelectedId(quiz.id); }
  async function generateWithAi() {
    if (products.length < 2) { setGenerationError("Add at least two products before generating a finder."); return; }
    setGenerating(true); setGenerationError("");
    try {
      const response = await fetch("/api/quizzes/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: products.map(({ name, price, category, description, features, tags, buyer_needs }) => ({ name, price, category, description, features, tags, buyer_needs })) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not generate a finder.");
      const suggestion = payload.suggestion as GeneratedQuizSuggestion;
      const quiz = createQuiz();
      quiz.name = suggestion.name;
      quiz.slug = slugify(suggestion.name) + `-${Date.now().toString().slice(-5)}`;
      quiz.welcome_title = suggestion.welcome_title;
      quiz.welcome_message = suggestion.welcome_message;
      quiz.questions = suggestion.questions.map((question, questionIndex) => {
        const questionId = uid("q");
        return { id: questionId, quiz_id: quiz.id, title: question.title, helper_text: question.helper_text, position: questionIndex, options: question.options.map((option, optionIndex) => ({ id: uid("option"), question_id: questionId, label: option.label, match_type: option.match_type, match_value: option.match_value, weight: option.weight, next_question_id: null, position: optionIndex })) };
      });
      await saveQuiz(quiz); setSelectedId(quiz.id);
    } catch (error) { setGenerationError(error instanceof Error ? error.message : "Could not generate a finder."); }
    finally { setGenerating(false); }
  }
  return <div className="animate-rise">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow text-moss">Guided selling</p><h1 className="display mt-2 text-4xl sm:text-5xl">Product finders</h1><p className="mt-2 text-sm text-black/45">Turn your team’s best product questions into a useful conversation.</p></div><div className="flex gap-2"><button onClick={generateWithAi} disabled={generating || products.length < 2} className="btn-secondary self-start !border-lime/70"><Sparkles size={15} className="text-moss" />{generating ? "Generating…" : "Generate with AI"}</button><button onClick={create} className="btn-primary self-start"><Plus size={16} /> Create a finder</button></div></div>
    {generationError && <p className="mt-5 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{generationError}</p>}
    {quizzes.length ? <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{quizzes.map((quiz) => { const views = events.filter((e) => e.quiz_id === quiz.id && e.event_type === "widget_view").length; const completed = events.filter((e) => e.quiz_id === quiz.id && e.event_type === "quiz_complete").length; return <article key={quiz.id} className="group overflow-hidden rounded-2xl border border-black/[0.07] bg-white"><button onClick={() => setSelectedId(quiz.id)} className="relative block h-44 w-full overflow-hidden bg-[#e7eae2] p-5 text-left"><div className="dot-grid absolute inset-0 opacity-40" /><div className="relative mx-auto max-w-[230px] rounded-2xl bg-white p-4 shadow-lg transition group-hover:-translate-y-1"><div className="flex items-center justify-between"><span className="grid h-6 w-6 place-items-center rounded-lg bg-ink text-lime"><Sparkles size={11} /></span><span className="text-xs font-extrabold uppercase text-black/25">Question 1 of {quiz.questions.length || 1}</span></div><h3 className="display mt-4 text-xl leading-none">{quiz.questions[0]?.title || quiz.welcome_title}</h3><div className="mt-3 space-y-1.5">{(quiz.questions[0]?.options || []).slice(0, 2).map((o) => <div key={o.id} className="rounded-lg border border-black/10 px-2 py-1.5 text-xs font-bold">{o.label}</div>)}</div></div><span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-extrabold ${quiz.published ? "bg-lime text-moss" : "bg-white/80 text-black/40"}`}><i className={`h-1.5 w-1.5 rounded-full ${quiz.published ? "bg-moss" : "bg-black/25"}`} /> {quiz.published ? "Live" : "Draft"}</span></button><div className="p-5"><div className="flex items-start justify-between"><div className="min-w-0"><h2 className="truncate text-sm font-extrabold">{quiz.name}</h2><p className="mt-1 text-xs text-black/35">{quiz.questions.length} questions · Edited recently</p></div><button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5"><MoreHorizontal size={15} /></button></div><div className="mt-5 grid grid-cols-3 divide-x divide-black/[0.07] rounded-xl bg-canvas py-3 text-center"><div><p className="text-sm font-extrabold">{views}</p><p className="mt-0.5 text-xs font-bold text-black/30">Views</p></div><div><p className="text-sm font-extrabold">{completed}</p><p className="mt-0.5 text-xs font-bold text-black/30">Complete</p></div><div><p className="text-sm font-extrabold">{views ? Math.round(completed / views * 100) : 0}%</p><p className="mt-0.5 text-xs font-bold text-black/30">Rate</p></div></div><div className="mt-4 flex gap-2"><button onClick={() => setSelectedId(quiz.id)} className="btn-secondary flex-1 !px-3 !py-2 text-xs">Edit finder</button>{quiz.published && <Link href={`/finder/${quiz.id}`} target="_blank" className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><ExternalLink size={13} /></Link>}</div></div></article>; })}<button onClick={create} className="grid min-h-[360px] place-items-center rounded-2xl border-2 border-dashed border-black/10 text-center transition hover:border-moss/30 hover:bg-white"><span><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><Plus size={20} /></span><span className="mt-4 block text-sm font-extrabold">Create another finder</span><span className="mt-1 block text-xs text-black/35">Start with a blank canvas</span></span></button></div> : <div className="mt-8 grid min-h-[450px] place-items-center rounded-2xl border-2 border-dashed border-black/10 bg-white/40 p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><LayoutTemplate size={25} /></span><h2 className="display mt-5 text-3xl">Build your first buying guide</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-black/40">Ask the questions your best salesperson would ask, then connect answers to product attributes.</p><button onClick={create} className="btn-primary mt-5"><Plus size={15} /> Create a finder</button></div></div>}
  </div>;
}
