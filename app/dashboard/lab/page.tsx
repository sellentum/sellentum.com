"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Beaker, CheckCircle2, Clipboard, ExternalLink, FlaskConical, HelpCircle, Layers3, Plus, ShieldCheck, SlidersHorizontal, Sparkles, XCircle } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { answerToFinderAnswer, buildFinderQuestionPath, defaultFinderSelections } from "@/lib/finder-flow";
import { buildRecommendationTraceReport } from "@/lib/recommendation-trace";
import { buildScenarioCoverageReport, type ScenarioCoveragePriority, type ScenarioCoverageStatus } from "@/lib/scenario-coverage";
import type { FinderAnswer, Quiz } from "@/lib/types";
import { auditProductMatches, buildFinderBuyerProfile, extractIntentTokens, formatCurrency } from "@/lib/utils";

function defaultSelections(quiz?: Quiz) {
  return quiz ? defaultFinderSelections(quiz) : {};
}

const scenarioStatusTone: Record<ScenarioCoverageStatus, string> = {
  blocked: "bg-red-50 text-red-700",
  watch: "bg-amber-50 text-amber-700",
  healthy: "bg-lime/35 text-moss",
};

const scenarioPriorityTone: Record<ScenarioCoveragePriority, string> = {
  critical: "bg-red-50 text-red-700",
  high: "bg-orange-50 text-orange-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-lime/35 text-moss",
};

export default function LabPage() {
  const { ready, quizzes, products } = useStore();
  const [selectedId, setSelectedId] = useState("");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [copiedTrace, setCopiedTrace] = useState(false);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedId) || quizzes[0];

  useEffect(() => {
    if (!selectedId && quizzes[0]) setSelectedId(quizzes[0].id);
  }, [quizzes, selectedId]);

  useEffect(() => {
    setSelections(defaultSelections(selectedQuiz));
  }, [selectedQuiz]);

  const questionPath = useMemo(() => selectedQuiz ? buildFinderQuestionPath(selectedQuiz, selections, true) : [], [selectedQuiz, selections]);
  const routedQuestionIds = useMemo(() => new Set(questionPath.map((step) => step.question.id)), [questionPath]);
  const skippedQuestions = useMemo(() => selectedQuiz ? selectedQuiz.questions.filter((question) => !routedQuestionIds.has(question.id)) : [], [selectedQuiz, routedQuestionIds]);
  const answers = useMemo<FinderAnswer[]>(() => questionPath.flatMap((step) => step.selectedOption ? [answerToFinderAnswer(step.question, step.selectedOption)] : []), [questionPath]);

  const overrides = useMemo(() => selectedQuiz?.recommendation_overrides || [], [selectedQuiz]);
  const buyerProfile = useMemo(() => buildFinderBuyerProfile(answers), [answers]);
  const buyerProfileTerms = useMemo(() => extractIntentTokens(buyerProfile).slice(0, 8), [buyerProfile]);
  const audits = useMemo(() => auditProductMatches(products, answers, { overrides }), [products, answers, overrides]);
  const recommended = audits.filter((audit) => audit.eligible).slice(0, 3);
  const winner = recommended[0];
  const maxScore = Math.max(1, ...audits.map((audit) => audit.score));
  const trace = useMemo(() => buildRecommendationTraceReport({ quiz: selectedQuiz, products, answers, audits }), [selectedQuiz, products, answers, audits]);
  const tracePayload = useMemo(() => JSON.stringify(trace, null, 2), [trace]);
  const scenarioCoverage = useMemo(() => buildScenarioCoverageReport(selectedQuiz, products), [selectedQuiz, products]);

  async function copyTrace() {
    try {
      await navigator.clipboard.writeText(tracePayload);
      setCopiedTrace(true);
      setTimeout(() => setCopiedTrace(false), 1600);
    } catch {
      setCopiedTrace(false);
    }
  }

  if (!ready) return <LoadingState label="Loading recommendation lab…" />;

  if (!quizzes.length || !products.length) {
    return (
      <div className="grid min-h-[640px] place-items-center rounded-[30px] border border-black/[0.07] bg-white p-10 text-center">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lime/45 text-moss"><FlaskConical size={25} /></span>
          <h1 className="display mt-5 text-4xl">The lab needs a finder and products.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">Add catalog products and create a product finder, then come back here to test the ranking logic before you publish.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard/products" className="btn-secondary"><Plus size={15} /> Add products</Link>
            <Link href="/dashboard/quizzes" className="btn-primary"><Sparkles size={15} /> Build finder</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-moss">Recommendation lab</p>
          <h1 className="display mt-2 text-5xl">Test the logic before shoppers do.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Simulate a shopper path, inspect product scores, and see which catalog facts made each product eligible. This is the merchant-side antidote to black-box AI.</p>
        </div>
        {selectedQuiz && <Link href={`/finder/${selectedQuiz.slug || selectedQuiz.id}`} target="_blank" className="btn-secondary self-start"><ExternalLink size={14} /> Preview finder</Link>}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="rounded-[28px] border border-black/[0.07] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-lime"><Beaker size={17} /></span>
            <div>
              <p className="text-sm font-extrabold">Shopper scenario</p>
              <p className="mt-0.5 text-[10px] text-black/35">{answers.length} active path answer{answers.length === 1 ? "" : "s"} · {skippedQuestions.length} skipped</p>
            </div>
          </div>

          <label className="label mt-6">Finder to test</label>
          <select value={selectedQuiz?.id || ""} onChange={(event) => setSelectedId(event.target.value)} className="field text-xs font-bold">
            {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.name}</option>)}
          </select>

          <div className="mt-6 space-y-5">
            {questionPath.map(({ question, selectedOption }, index) => (
              <section key={question.id} className="rounded-2xl border border-black/[0.07] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-lime/45 text-[10px] font-extrabold text-moss">{index + 1}</span>
                  <div>
                    <h2 className="text-xs font-extrabold leading-5">{question.title}</h2>
                    {question.helper_text && <p className="mt-1 text-[10px] leading-4 text-black/35">{question.helper_text}</p>}
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => {
                    const selected = (selections[question.id] || selectedOption?.id) === option.id;
                    const targetQuestion = selectedQuiz?.questions.find((item) => item.id === option.next_question_id);
                    return (
                      <button key={option.id} onClick={() => setSelections((current) => ({ ...current, [question.id]: option.id }))} className={`rounded-xl border px-3 py-2.5 text-left text-[10px] font-extrabold transition ${selected ? "border-ink bg-ink text-white" : "border-black/10 bg-canvas text-black/50 hover:border-moss/30 hover:bg-white"}`}>
                        <span className="flex items-center justify-between gap-2">
                          {option.label}
                          <span className={`rounded-full px-2 py-0.5 text-[8px] ${selected ? "bg-lime text-ink" : "bg-white text-black/30"}`}>{option.match_type}</span>
                        </span>
                        {option.match_value && <span className={`mt-1 block text-[8px] ${selected ? "text-white/45" : "text-black/30"}`}>Value: {option.match_value} · weight {option.weight}</span>}
                        {targetQuestion && <span className={`mt-1 block text-[8px] ${selected ? "text-lime" : "text-moss"}`}>Branches to question {targetQuestion.position + 1}</span>}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {skippedQuestions.length > 0 && <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-canvas p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/35">Skipped by this branch</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skippedQuestions.map((question) => <span key={question.id} className="rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold text-black/35">{question.position + 1}. {question.title}</span>)}
            </div>
          </div>}

          <div className="mt-5 rounded-2xl bg-canvas p-4">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/35">Buyer profile</p>
            <p className="mt-2 text-[10px] leading-5 text-black/50">{buyerProfile || "Choose answers to generate a semantic buyer profile."}</p>
            {buyerProfileTerms.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{buyerProfileTerms.map((term) => <span key={term} className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold text-black/35">{term}</span>)}</div>}
          </div>

          <button onClick={() => setSelections(defaultSelections(selectedQuiz))} className="btn-secondary mt-5 w-full !py-2.5 text-xs"><SlidersHorizontal size={13} /> Reset scenario</button>
        </aside>

        <main className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              [products.length, "Catalog products"],
              [audits.filter((audit) => audit.eligible).length, "Eligible after filters"],
              [recommended.length, "Recommended cards"],
              [winner ? winner.score.toFixed(1) : "0.0", "Top score"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-black/[0.07] bg-white p-4">
                <p className="text-2xl font-extrabold tracking-[-.05em]">{value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-black/30">{label}</p>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
            <div className="grid gap-0 xl:grid-cols-[360px_1fr]">
              <div className="bg-ink p-6 text-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><Layers3 size={19} /></span>
                  <span className={`rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase ${scenarioCoverage.status === "healthy" ? "bg-lime text-moss" : scenarioCoverage.status === "watch" ? "bg-amber-200 text-amber-800" : "bg-red-100 text-red-700"}`}>{scenarioCoverage.status}</span>
                </div>
                <p className="eyebrow mt-7 text-lime">Scenario coverage suite</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em]">{scenarioCoverage.headline}</h2>
                <p className="mt-3 text-xs leading-5 text-white/45">A bounded QA sweep that varies finder answers, follows branch routing and checks whether each likely shopper path can return a useful result set.</p>
                <div className="mt-6 grid grid-cols-[110px_1fr] gap-3">
                  <div className="rounded-2xl bg-white/[.07] p-4 text-center">
                    <p className="display text-5xl">{scenarioCoverage.score}</p>
                    <p className="mt-1 text-[8px] font-extrabold uppercase tracking-wider text-white/35">Suite score</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Scenarios", scenarioCoverage.summary.scenarios],
                      ["Healthy", scenarioCoverage.summary.passing],
                      ["Warnings", scenarioCoverage.summary.warnings],
                      ["Blocked", scenarioCoverage.summary.blockers],
                    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white/[.07] p-3">
                      <p className="text-xl font-extrabold">{String(value)}</p>
                      <p className="mt-1 text-[8px] font-bold text-white/35">{String(label)}</p>
                    </div>)}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid gap-3 xl:grid-cols-4">
                  {[
                    ["Answer coverage", `${Math.round(scenarioCoverage.summary.answerCoverageRate)}%`],
                    ["Route coverage", `${Math.round(scenarioCoverage.summary.routeCoverageRate)}%`],
                    ["Product coverage", `${Math.round(scenarioCoverage.summary.productCoverageRate)}%`],
                    ["Avg eligible", scenarioCoverage.summary.averageEligibleProducts],
                  ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-[#f7f8f4] p-4">
                    <p className="text-2xl font-extrabold tracking-[-.05em]">{String(value)}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-black/30">{String(label)}</p>
                  </div>)}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_320px]">
                  <div className="grid gap-3 xl:grid-cols-2">
                    {scenarioCoverage.scenarios.slice(0, 4).map((scenario) => (
                      <article key={scenario.id} className="rounded-2xl border border-black/[0.06] bg-[#f8f8f4] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-xs font-extrabold leading-5">{scenario.label}</h3>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${scenarioStatusTone[scenario.status]}`}>{scenario.status}</span>
                        </div>
                        <p className="mt-2 text-[10px] leading-4 text-black/45">{scenario.detail}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {scenario.answers.slice(0, 4).map((answer) => <span key={answer} className="rounded-full bg-white px-2.5 py-1 text-[8px] font-extrabold text-black/40">{answer}</span>)}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                          <span className="rounded-xl bg-white p-2"><b className="block text-xs">{scenario.eligibleProducts}</b><i className="not-italic text-[8px] text-black/30">Eligible</i></span>
                          <span className="rounded-xl bg-white p-2"><b className="block text-xs">{scenario.blockedProducts}</b><i className="not-italic text-[8px] text-black/30">Blocked</i></span>
                          <span className="rounded-xl bg-white p-2"><b className="block text-xs">{scenario.topScore}</b><i className="not-italic text-[8px] text-black/30">Top score</i></span>
                        </div>
                        <p className="mt-3 text-[10px] font-bold leading-4 text-moss">{scenario.recommendation}</p>
                      </article>
                    ))}
                  </div>

                  <aside className="rounded-2xl bg-ink p-4 text-white">
                    <p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={14} className="text-lime" /> Scenario actions</p>
                    <div className="mt-4 space-y-2">
                      {scenarioCoverage.actions.slice(0, 3).map((action) => (
                        <div key={action.id} className="rounded-2xl bg-white/[.07] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[10px] font-extrabold leading-4">{action.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase ${scenarioPriorityTone[action.priority]}`}>{action.priority}</span>
                          </div>
                          <p className="mt-2 text-[9px] leading-4 text-white/45">{action.evidence}</p>
                          <p className="mt-2 text-[9px] leading-4 text-lime">{action.recommendation}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl bg-white/[.07] p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-white/35">Product coverage</p>
                      <div className="mt-2 space-y-1.5">
                        {scenarioCoverage.productCoverage.slice(0, 4).map((product) => (
                          <div key={product.productId} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.06] px-3 py-2">
                            <span className="truncate text-[9px] font-extrabold">{product.productName}</span>
                            <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-[8px] font-extrabold text-moss">{Math.round(product.coverageRate)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
            <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-moss">Deterministic winner</p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-[-.055em]">{winner?.product.name || "No eligible product"}</h2>
                  </div>
                  <span className="rounded-full bg-lime px-3 py-1.5 text-[9px] font-extrabold text-moss"><ShieldCheck size={12} className="mr-1 inline" /> No AI selection</span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-black/45">{winner ? `${winner.product.name} ranks first because it collected ${winner.score.toFixed(1)} points from ${winner.matchedReasons.slice(0, 3).join(", ") || "preference-compatible answers"}. AI can explain this later, but the product choice is rule-based.` : "Every product is inactive or blocked by the selected scenario. Try a broader budget or different answers."}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {answers.map((answer) => <span key={answer.optionId} className="rounded-full bg-canvas px-3 py-1.5 text-[10px] font-bold text-black/45">{answer.answer}</span>)}
                </div>
              </div>
              <div className="border-t border-black/[0.07] bg-[#eef1e8] p-6 xl:border-l xl:border-t-0">
                <p className="flex items-center gap-2 text-xs font-extrabold"><HelpCircle size={14} className="text-moss" /> How to read this</p>
                <p className="mt-2 text-[10px] leading-5 text-black/45">A product must be active and inside any chosen budget. Matching tags, categories, features and budgets add weighted points. The buyer-profile layer adds semantic/lexical intent points from enriched catalog language. Pins, boosts and exclusions apply as merchant controls. Ties break by lower price, then product name.</p>
                <div className="mt-4 rounded-2xl bg-white/60 p-3">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-black/35">Merchandising controls</p>
                  {overrides.length ? <div className="mt-2 space-y-1.5">{overrides.map((override) => {
                    const product = products.find((item) => item.id === override.product_id);
                    return <p key={override.id} className="text-[10px] font-bold text-black/45">{override.action.toUpperCase()} · {product?.name || override.product_id}{override.action !== "exclude" ? ` · +${override.weight}` : ""}</p>;
                  })}</div> : <p className="mt-2 text-[10px] leading-4 text-black/35">No pins, boosts or exclusions are active for this finder.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-black/[0.07] px-5 py-4">
              <div>
                <p className="eyebrow text-moss">Recommendation decision trace</p>
                <h2 className="mt-1 text-lg font-extrabold tracking-[-.04em]">Merchant-readable proof of why this path wins</h2>
              </div>
              <button onClick={copyTrace} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-canvas px-3 py-2 text-[10px] font-extrabold text-black/45 hover:border-moss/30 hover:text-moss"><Clipboard size={12} /> {copiedTrace ? "Copied" : "Copy trace"}</button>
            </div>
            <div className="grid gap-0 xl:grid-cols-[1fr_360px]">
              <div className="p-5">
                <p className="text-sm font-bold leading-6 text-black/55">{trace.summary}</p>
                {trace.topProduct && (
                  <div className="mt-5 rounded-2xl bg-lime/15 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-moss">Selected product</p>
                        <h3 className="mt-1 text-xl font-extrabold tracking-[-.05em]">{trace.topProduct.productName}</h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-moss">Score {trace.topProduct.score.toFixed(2)}</span>
                    </div>
                    <p className="mt-3 text-[11px] leading-5 text-black/50">{trace.topProduct.explanation}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {trace.topProduct.proofPoints.map((point) => <span key={point} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-extrabold text-black/45">{point}</span>)}
                    </div>
                  </div>
                )}
                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {[
                    [trace.eligibleProducts, "Eligible"],
                    [trace.blockedProducts, "Blocked"],
                    [trace.scoreSpread.gap.toFixed(1), "Score gap"],
                  ].map(([value, label]) => <div key={label} className="rounded-2xl border border-black/[0.06] bg-canvas p-4">
                    <p className="text-2xl font-extrabold tracking-[-.05em]">{value}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-black/30">{label}</p>
                  </div>)}
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.06]">
                  <div className="grid grid-cols-[1fr_90px_110px] bg-canvas px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-black/35">
                    <span>Product trace</span>
                    <span>Score</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-black/[0.06]">
                    {trace.products.slice(0, 5).map((product) => (
                      <div key={product.productId} className="grid grid-cols-[1fr_90px_110px] gap-3 px-4 py-3">
                        <div>
                          <p className="text-xs font-extrabold">{product.productName}</p>
                          <p className="mt-1 line-clamp-1 text-[9px] text-black/35">{product.blocker || product.decisiveSignals.slice(0, 2).join(" · ") || "No decisive signal"}</p>
                        </div>
                        <p className="text-xs font-extrabold">{product.score.toFixed(2)}</p>
                        <span className={`w-fit rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${product.status === "recommended" ? "bg-lime text-moss" : product.status === "blocked" ? "bg-red-50 text-red-600" : "bg-black/5 text-black/35"}`}>{product.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <aside className="border-t border-black/[0.07] bg-[#f3f5ef] p-5 xl:border-l xl:border-t-0">
                <p className="flex items-center gap-2 text-xs font-extrabold"><ShieldCheck size={14} className="text-moss" /> Tuning actions</p>
                <p className="mt-2 text-[10px] leading-5 text-black/40">Use these to fix weak finder paths before embedding on a storefront.</p>
                <div className="mt-4 space-y-2">
                  {trace.tuningActions.map((action) => (
                    <div key={action.id} className={`rounded-2xl border p-3 ${action.priority === "high" ? "border-red-100 bg-red-50" : action.priority === "medium" ? "border-amber-100 bg-amber-50" : "border-lime/40 bg-lime/15"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-extrabold leading-4">{action.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase ${action.priority === "high" ? "bg-red-100 text-red-600" : action.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-lime text-moss"}`}>{action.priority}</span>
                      </div>
                      <p className="mt-1.5 text-[9px] leading-4 text-black/45">{action.detail}</p>
                    </div>
                  ))}
                </div>
                <pre className="mt-4 max-h-44 overflow-hidden rounded-2xl bg-ink p-3 text-[8px] leading-4 text-white/55">{tracePayload.slice(0, 1100)}{tracePayload.length > 1100 ? "\n…" : ""}</pre>
              </aside>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white">
            <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4">
              <div>
                <p className="text-sm font-extrabold">Score breakdown</p>
                <p className="mt-0.5 text-[10px] text-black/35">Same scorer used by the customer-facing finder.</p>
              </div>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-[9px] font-bold text-black/35">Top 3 · branch-aware path</span>
            </div>

            <div className="divide-y divide-black/[0.06]">
              {audits.map((audit) => {
                const recommendedRank = recommended.findIndex((item) => item.product.id === audit.product.id);
                return (
                  <article key={audit.product.id} className="grid gap-5 p-5 xl:grid-cols-[260px_1fr]">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-canvas">
                          {audit.product.image_url ? <img src={audit.product.image_url} alt="" className="h-full w-full object-cover" /> : <Sparkles size={18} className="text-black/20" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-extrabold">{audit.product.name}</h3>
                            {recommendedRank >= 0 && <span className="rounded-full bg-lime px-2 py-0.5 text-[8px] font-extrabold text-moss">#{recommendedRank + 1}</span>}
                          </div>
                          <p className="mt-1 text-[10px] text-black/35">{audit.product.category} · {formatCurrency(audit.product.price)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[9px] font-extrabold text-black/35"><span>Score</span><span>{audit.score.toFixed(2)}</span></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/5"><div className={`h-full rounded-full ${audit.eligible ? "bg-lime" : "bg-red-200"}`} style={{ width: `${Math.min(100, audit.score / maxScore * 100)}%` }} /></div>
                      </div>
                      {!audit.eligible && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600">{audit.blockedReason}</p>}
                    </div>

                    <div className="grid gap-2 lg:grid-cols-2">
                      {audit.signals.map((signal) => (
                        <div key={`${audit.product.id}-${signal.answer}-${signal.matchType}`} className={`rounded-2xl border p-3 ${signal.matched ? "border-lime/50 bg-lime/15" : "border-black/[0.06] bg-canvas/60"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[10px] font-extrabold leading-4">{signal.answer}</p>
                            <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold ${signal.matched ? "bg-lime text-moss" : "bg-white text-black/30"}`}>{signal.matched ? <CheckCircle2 size={9} /> : <XCircle size={9} />}{signal.contribution.toFixed(1)}</span>
                          </div>
                          <p className="mt-1.5 text-[9px] leading-4 text-black/40">{signal.note}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
