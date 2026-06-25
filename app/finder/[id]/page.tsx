"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useStore } from "@/lib/store";
import { getSessionMetadata } from "@/lib/session";
import { getNextFinderQuestionIndex } from "@/lib/finder-flow";
import type { FinderAnswer, Product, Quiz, Recommendation, WidgetSettings } from "@/lib/types";
import { compareFinderRecommendations, formatCurrency, recommendProducts } from "@/lib/utils";
import { demoSettings } from "@/lib/demo-data";

type FinderData = { quiz: Quiz; products: Product[]; settings: WidgetSettings };
type FinderEventType = "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click";

function serializeAnswers(items: FinderAnswer[]) {
  return items.map((item) => ({
    question_id: item.questionId,
    question: item.question,
    option_id: item.optionId,
    answer: item.answer,
    match_type: item.matchType,
    match_value: item.matchValue,
    weight: item.weight,
  }));
}

export default function FinderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const [data, setData] = useState<FinderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendationError, setRecommendationError] = useState("");
  const [step, setStep] = useState(-1);
  const [visitedStepIndexes, setVisitedStepIndexes] = useState<number[]>([]);
  const [answers, setAnswers] = useState<FinderAnswer[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommending, setRecommending] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!store.ready) return;
    const localQuiz = store.quizzes.find((quiz) => quiz.id === id || quiz.slug === id);
    if (localQuiz) { setData({ quiz: localQuiz, products: store.products, settings: store.settings }); setLoading(false); return; }
    fetch(`/api/public/finder/${encodeURIComponent(id)}`).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || "Finder not found."); return response.json(); }).then((result) => setData({ ...result, settings: result.settings || demoSettings })).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id, store.ready, store.quizzes, store.products, store.settings]);

  const track = useCallback(async (eventType: FinderEventType, productId?: string, extraMetadata: Record<string, unknown> = {}) => {
    if (!data) return;
    const metadata = { experience_type: "finder", experience_id: data.quiz.id, experience_name: data.quiz.name, experience_slug: data.quiz.slug, ...getSessionMetadata(), ...extraMetadata };
    if (store.mode === "demo") await store.recordEvent(eventType, data.quiz.id, productId, metadata);
    else fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, quizId: data.quiz.id, productId, metadata }) }).catch(() => undefined);
  }, [data, store]);

  useEffect(() => { if (!data || viewed.current) return; viewed.current = true; track("widget_view"); }, [data, track]);

  function start() {
    if (!data) return;
    setRecommendationError("");
    setStep(0);
    setVisitedStepIndexes([0]);
    track("quiz_start", undefined, { question_count: data.quiz.questions.length, flow_type: "conditional" });
  }
  async function choose(optionIndex: number) {
    if (!data) return;
    const question = data.quiz.questions[step];
    const option = question.options[optionIndex];
    const currentPathIndex = visitedStepIndexes.lastIndexOf(step);
    const currentPath = currentPathIndex >= 0 ? visitedStepIndexes.slice(0, currentPathIndex + 1) : [...visitedStepIndexes, step];
    const activeQuestionIds = new Set(currentPath.map((index) => data.quiz.questions[index]?.id).filter(Boolean));
    const selectedAnswer: FinderAnswer = { questionId: question.id, question: question.title, optionId: option.id, answer: option.label, matchType: option.match_type, matchValue: option.match_value, weight: option.weight };
    const nextAnswers = [...answers.filter((a) => activeQuestionIds.has(a.questionId) && a.questionId !== question.id), selectedAnswer];
    const nextStep = getNextFinderQuestionIndex(data.quiz, step, option, currentPath);
    const questionPath = currentPath.map((index) => data.quiz.questions[index]?.id).filter(Boolean);
    setRecommendationError("");
    setAnswers(nextAnswers);
    setVisitedStepIndexes(currentPath);
    if (nextStep >= 0) {
      setTimeout(() => {
        setVisitedStepIndexes([...currentPath, nextStep]);
        setStep(nextStep);
      }, 150);
      return;
    }
    setStep(data.quiz.questions.length);
    setRecommendations([]);
    setRecommending(true);

    if (store.mode === "demo") {
      const matches = recommendProducts(data.products, nextAnswers, 3, { overrides: data.quiz.recommendation_overrides || [] });
      const answerMetadata = serializeAnswers(nextAnswers);
      setRecommendations(matches); track("quiz_complete", undefined, { answers: answerMetadata, answer_summary: nextAnswers.map((answer) => answer.answer), question_path: questionPath, result_count: matches.length });
      matches.forEach((match, index) => track("product_recommended", match.product.id, { answers: answerMetadata, question_path: questionPath, rank: index + 1, score: match.score, matched_reasons: match.matchedReasons, product_name: match.product.name }));
      const explained = await Promise.all(matches.map(async (match) => { try { const response = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: { name: match.product.name, description: match.product.description, category: match.product.category, features: match.product.features, tags: match.product.tags }, answers: nextAnswers.map(({ question: q, answer }) => ({ question: q, answer })), matchedReasons: match.matchedReasons }) }); const json = await response.json(); return { ...match, explanation: json.explanation }; } catch { return match; } }));
      setRecommendations(explained);
      setRecommending(false);
      return;
    }

    try {
      const response = await fetch(`/api/public/finder/${encodeURIComponent(data.quiz.slug || data.quiz.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nextAnswers.map((answer) => ({ questionId: answer.questionId, optionId: answer.optionId })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The finder could not generate recommendations.");
      const serverAnswers = (payload.answers || nextAnswers) as FinderAnswer[];
      const matches = (payload.recommendations || []) as Recommendation[];
      const answerMetadata = serializeAnswers(serverAnswers);
      setRecommendations(matches);
      track("quiz_complete", undefined, { answers: answerMetadata, answer_summary: serverAnswers.map((answer) => answer.answer), question_path: payload.retrieval?.question_path || questionPath, result_count: matches.length });
      matches.forEach((match, index) => track("product_recommended", match.product.id, { answers: answerMetadata, question_path: payload.retrieval?.question_path || questionPath, rank: index + 1, score: match.score, matched_reasons: match.matchedReasons, product_name: match.product.name }));
    } catch (err) {
      setRecommendationError(err instanceof Error ? err.message : "The finder could not generate recommendations.");
      track("quiz_complete", undefined, { answers: serializeAnswers(nextAnswers), answer_summary: nextAnswers.map((answer) => answer.answer), question_path: questionPath, result_count: 0, error: "recommendation_failed" });
    } finally {
      setRecommending(false);
    }
  }
  function restart() { setStep(-1); setVisitedStepIndexes([]); setAnswers([]); setRecommendations([]); setRecommendationError(""); setRecommending(false); viewed.current = true; }
  const accent = data?.settings.primary_color || "#22352a";
  const progress = data && step >= 0 ? Math.min(100, ((step === data.quiz.questions.length ? visitedStepIndexes.length : Math.max(1, visitedStepIndexes.lastIndexOf(step) + 1)) / data.quiz.questions.length) * 100) : 0;
  const comparisonRows = useMemo(() => compareFinderRecommendations(recommendations), [recommendations]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#e8eadf]"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-moss" /><p className="mt-3 text-xs font-bold text-black/40">Preparing your product guide…</p></div></main>;
  if (error || !data) return <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/5"><Sparkles size={21} /></span><h1 className="display mt-5 text-4xl">This finder isn’t available.</h1><p className="mt-2 text-sm text-black/45">{error || "It may be unpublished or no longer exist."}</p><Link href="/" className="btn-primary mt-5">Visit Findly</Link></div></main>;
  const quiz = data.quiz;

  return <main className="noise relative min-h-screen overflow-hidden bg-[#e8eadf] p-3 sm:p-6 lg:p-10" style={{ "--finder-accent": accent } as React.CSSProperties}>
    <div className="dot-grid absolute inset-0 opacity-35" /><div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-lime/40 blur-3xl" />
    <section className="relative mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-soft sm:min-h-[calc(100vh-48px)] lg:min-h-[700px] lg:max-h-[800px]">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-8"><div className="flex items-center gap-2.5 text-sm font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-xl text-white" style={{ background: accent }}><Sparkles size={14} /></span>{data.settings.brand_name}</div><div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 text-[10px] font-bold text-black/35 sm:flex"><ShieldCheck size={13} /> Recommendations you can trust</span>{step >= 0 && <button onClick={restart} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/35" aria-label="Restart"><RefreshCcw size={13} /></button>}</div></header>
      {step >= 0 && step < quiz.questions.length && <div className="h-1 bg-black/[0.04]"><div className="h-full rounded-r-full bg-lime transition-all duration-500" style={{ width: `${progress}%` }} /></div>}

      {step === -1 && <div className="grid flex-1 lg:grid-cols-[1.05fr_.95fr]"><div className="flex flex-col justify-center px-7 py-14 sm:px-14 lg:px-20"><p className="eyebrow text-moss">Your personal product guide</p><h1 className="display mt-4 max-w-2xl text-5xl leading-[.95] sm:text-7xl">{quiz.welcome_title}</h1><p className="mt-6 max-w-lg text-base leading-7 text-black/50">{quiz.welcome_message}</p><button onClick={start} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full px-6 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5" style={{ background: accent }}>{data.settings.button_text || "Find my match"}<ArrowRight size={16} /></button><p className="mt-4 text-[10px] font-bold text-black/30">{quiz.questions.length} quick questions · About 60 seconds</p></div><div className="relative hidden overflow-hidden bg-[#d9ff61] lg:block"><div className="dot-grid absolute inset-0 opacity-30" /><div className="absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-[28px] bg-white p-7 shadow-2xl"><div className="flex items-center justify-between"><span className="rounded-full bg-lime/40 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider">Made for you</span><div className="flex text-[#f0a746]">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</div></div><p className="display mt-8 text-4xl leading-none">A short path to<br /><span className="italic">the right choice.</span></p><div className="mt-7 space-y-2">{["Tell us what matters", "We compare the details", "Meet your best matches"].map((item, i) => <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-3 text-xs font-extrabold" key={item}><span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[9px] text-lime">{i + 1}</span>{item}</div>)}</div></div></div></div>}

      {step >= 0 && step < quiz.questions.length && (() => {
        const question = quiz.questions[step];
        const prior = answers.find((a) => a.questionId === question.id);
        const pathIndex = visitedStepIndexes.lastIndexOf(step);
        const pathPosition = pathIndex >= 0 ? pathIndex + 1 : Math.min(step + 1, quiz.questions.length);
        const goBack = () => {
          if (pathIndex > 0) {
            const previousPath = visitedStepIndexes.slice(0, pathIndex);
            setVisitedStepIndexes(previousPath);
            setStep(previousPath[previousPath.length - 1]);
            return;
          }
          setStep(-1);
          setVisitedStepIndexes([]);
        };
        return <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-12 lg:px-24"><div className="mx-auto w-full max-w-3xl"><div className="flex items-center justify-between"><p className="eyebrow text-moss">Question {pathPosition} of up to {quiz.questions.length}</p><span className="text-[10px] font-bold text-black/25">{Math.round(progress)}% complete</span></div><h1 className="display mt-4 text-4xl leading-none sm:text-6xl">{question.title}</h1>{question.helper_text && <p className="mt-4 text-sm text-black/45">{question.helper_text}</p>}<div className="mt-8 grid gap-3 sm:grid-cols-2">{question.options.map((option, index) => { const chosen = prior?.optionId === option.id; return <button key={option.id} onClick={() => choose(index)} className={`group flex min-h-[72px] items-center justify-between rounded-2xl border p-4 text-left text-sm font-extrabold transition hover:-translate-y-0.5 hover:border-black/30 hover:shadow-md ${chosen ? "border-ink bg-ink text-white" : "border-black/10 bg-white"}`}><span className="flex items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[10px] ${chosen ? "border-lime bg-lime text-ink" : "border-black/10 bg-canvas group-hover:bg-lime/40"}`}>{chosen ? <Check size={14} /> : String.fromCharCode(65 + index)}</span>{option.label}</span><ChevronRightIcon chosen={chosen} /></button>; })}</div><div className="mt-8 flex items-center justify-between"><button onClick={goBack} className="flex items-center gap-2 text-xs font-extrabold text-black/40 hover:text-ink"><ArrowLeft size={14} /> {pathIndex > 0 ? "Back" : "Welcome"}</button><p className="text-[10px] text-black/25">Choose one answer to continue</p></div></div></div>;
      })()}

      {step === quiz.questions.length && (
        <div className="flex-1 overflow-y-auto px-5 py-9 sm:px-9 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-lime"><Sparkles size={18} /></span>
              <p className="eyebrow mt-5 text-moss">Your best matches</p>
              <h1 className="display mt-2 text-4xl sm:text-6xl">These feel right for you.</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-black/45">Chosen from the details you shared, then ranked using the product facts that matter most.</p>
            </div>

            {recommending ? (
              <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-black/10 p-8 text-center">
                <LoaderCircle className="mx-auto animate-spin text-moss" />
                <h2 className="mt-4 text-sm font-extrabold">Building your recommendations…</h2>
                <p className="mt-2 text-xs text-black/40">Findly is checking your answers against the live catalog.</p>
              </div>
            ) : recommendations.length ? (
              <>
                <div className="mt-9 grid gap-4 lg:grid-cols-3">
                  {recommendations.map((recommendation, index) => (
                    <article key={recommendation.product.id} className={`relative overflow-hidden rounded-2xl border bg-white ${index === 0 ? "border-ink shadow-lg" : "border-black/10"}`}>
                      {index === 0 && <span className="absolute left-3 top-3 z-10 rounded-full bg-lime px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider">Best match</span>}
                      <div className="h-44 overflow-hidden bg-canvas">
                        {recommendation.product.image_url ? <img src={recommendation.product.image_url} alt={recommendation.product.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" /> : <div className="grid h-full place-items-center text-black/20"><Sparkles /></div>}
                      </div>
                      <div className="p-5">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-moss">{recommendation.product.category}</p>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <h2 className="text-base font-extrabold leading-tight">{recommendation.product.name}</h2>
                          <span className="shrink-0 text-sm font-extrabold">{formatCurrency(recommendation.product.price)}</span>
                        </div>
                        <div className="mt-4 min-h-[58px] rounded-xl bg-canvas p-3">
                          <p className="flex items-center gap-1.5 text-[9px] font-extrabold text-moss"><Sparkles size={11} /> Why it fits</p>
                          {recommendation.explanation ? <p className="mt-1.5 text-[10px] leading-4 text-black/55">{recommendation.explanation}</p> : <div className="mt-2 space-y-1.5"><div className="h-2 w-full animate-pulse rounded bg-black/5" /><div className="h-2 w-3/4 animate-pulse rounded bg-black/5" /></div>}
                        </div>
                        <a onClick={() => track("buy_click", recommendation.product.id, { answers: serializeAnswers(answers), rank: index + 1, score: recommendation.score, matched_reasons: recommendation.matchedReasons, product_name: recommendation.product.name })} href={recommendation.product.product_url || "#"} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-extrabold text-white" style={{ background: accent }}>Buy now <ExternalLink size={12} /></a>
                      </div>
                    </article>
                  ))}
                </div>

                {comparisonRows.length > 1 && (
                  <section className="mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white text-left shadow-sm">
                    <div className="flex items-center justify-between border-b border-black/[0.06] bg-canvas/70 px-5 py-4">
                      <div>
                        <p className="eyebrow text-moss">Compare your matches</p>
                        <h2 className="mt-1 text-base font-extrabold">Why these options differ</h2>
                      </div>
                      <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-black/45">Deterministic comparison</span>
                    </div>
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                      <thead className="bg-white text-[9px] uppercase tracking-wider text-black/35">
                        <tr>
                          <th className="w-[20%] px-5 py-3 text-left font-extrabold">Product</th>
                          <th className="w-[18%] px-5 py-3 text-left font-extrabold">Best for</th>
                          <th className="w-[18%] px-5 py-3 text-left font-extrabold">Standout detail</th>
                          <th className="w-[22%] px-5 py-3 text-left font-extrabold">Trade-off</th>
                          <th className="px-5 py-3 text-left font-extrabold">Proof points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.06]">
                        {comparisonRows.map((row, index) => {
                          const product = recommendations.find((item) => item.product.id === row.productId)?.product;
                          if (!product) return null;
                          return (
                            <tr key={row.productId} className={index === 0 ? "bg-lime/10" : "bg-white"}>
                              <td className="px-5 py-4 align-top">
                                <p className="text-xs font-extrabold text-ink">{product.name}</p>
                                <p className="mt-1 text-[10px] font-bold text-black/35">{formatCurrency(product.price)}</p>
                              </td>
                              <td className="px-5 py-4 align-top text-xs font-bold leading-5 text-black/65">{row.bestFor}</td>
                              <td className="px-5 py-4 align-top text-xs font-bold leading-5 text-black/65">{row.standout}</td>
                              <td className="px-5 py-4 align-top text-xs leading-5 text-black/55">{row.tradeoff}</td>
                              <td className="px-5 py-4 align-top">
                                <div className="flex flex-wrap gap-1.5">
                                  {row.proofPoints.map((point) => <span key={point} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[10px] font-bold text-black/45">{point}</span>)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>
                )}
              </>
            ) : (
              <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-black/10 p-8 text-center">
                <h2 className="text-sm font-extrabold">{recommendationError ? "We couldn’t generate matches" : "No exact matches yet"}</h2>
                <p className="mt-2 text-xs text-black/40">{recommendationError || "Your current budget or preferences filtered out every active product. Try broadening an answer."}</p>
              </div>
            )}

            <div className="mt-8 text-center">
              <button onClick={restart} className="btn-secondary !px-4 !py-2.5"><RefreshCcw size={14} /> Start again</button>
            </div>
          </div>
        </div>
      )}
      <footer className="flex items-center justify-between border-t border-black/[0.05] px-5 py-3 text-[9px] font-bold text-black/25 sm:px-8"><span>Powered by <b className="text-black/45">findly</b></span><span>Your answers are used only for this recommendation</span></footer>
    </section>
  </main>;
}

function ChevronRightIcon({ chosen }: { chosen: boolean }) { return <ArrowRight size={14} className={chosen ? "text-lime" : "text-black/20"} />; }
