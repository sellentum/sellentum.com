"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, LoaderCircle, MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { RecommendationFeedback } from "@/components/recommendation-feedback";
import { useStore } from "@/lib/store";
import { getSessionMetadata } from "@/lib/session";
import type { AdvisorRecoveryReport } from "@/lib/advisor-recovery";
import { buildPublicExperienceCopy, normalizeWidgetSettings } from "@/lib/public-experience";
import type { ConversationalMatch, Product, Quiz, WidgetSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type RuntimeSource = "local" | "public";
type AdvisorData = { quiz: Quiz; products: Product[]; settings: WidgetSettings; source: RuntimeSource };
type Message = { role: "user" | "assistant"; content: string };
type AssistantEventType = "widget_view" | "quiz_start" | "quiz_complete" | "product_recommended" | "buy_click" | "recommendation_feedback";
type AdvisorStatus = "clarifying" | "recommendations";
type LastIntent = { query: string; source?: string; terms?: string[]; maxBudget?: number | null; resultCount?: number; status?: AdvisorStatus };

const suggestions = ["Something durable for everyday use", "A premium option under £150", "Help me compare the best value choices"];

export default function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const store = useStore();
  const [data, setData] = useState<AdvisorData | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Tell me what you’re looking for in your own words. A use case, must-have feature and budget are a great place to start." }]);
  const [matches, setMatches] = useState<ConversationalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [lastIntent, setLastIntent] = useState<LastIntent | null>(null);
  const [clarifyingOptions, setClarifyingOptions] = useState<string[]>([]);
  const [recovery, setRecovery] = useState<AdvisorRecoveryReport | null>(null);
  const started = useRef(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!store.ready) return;
    const localQuiz = store.quizzes.find((quiz) => quiz.id === id || quiz.slug === id);
    if (localQuiz) { setData({ quiz: localQuiz, products: store.products, settings: normalizeWidgetSettings(store.settings), source: "local" }); setLoading(false); return; }
    fetch(`/api/public/finder/${encodeURIComponent(id)}`).then(async (response) => { if (!response.ok) throw new Error((await response.json()).error || "Advisor not found."); return response.json(); }).then((result) => setData({ ...result, source: "public", settings: normalizeWidgetSettings(result.settings) })).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id, store.ready, store.quizzes, store.products, store.settings]);

  const settings = useMemo(() => normalizeWidgetSettings(data?.settings), [data?.settings]);
  const advisorCopy = useMemo(() => buildPublicExperienceCopy("assistant", settings, { title: data?.settings.widget_title, description: data?.settings.welcome_message }), [settings, data?.settings.widget_title, data?.settings.welcome_message]);

  useEffect(() => {
    if (!data || started.current) return;
    setMessages((current) => {
      if (current.length !== 1 || current[0]?.role !== "assistant") return current;
      return [{ role: "assistant", content: advisorCopy.assistantGreeting }];
    });
  }, [data, advisorCopy.assistantGreeting]);

  useEffect(() => {
    if (!data || viewed.current) return;
    viewed.current = true;
    const metadata = { experience_type: "assistant", experience_id: data.quiz.id, experience_name: data.quiz.name, experience_slug: data.quiz.slug, runtime_source: data.source, ...getSessionMetadata() };
    if (data.source === "local") store.recordPreviewEvent("widget_view", data.quiz.id, undefined, metadata);
    else fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "widget_view", quizId: data.quiz.id, metadata }) }).catch(() => undefined);
  }, [data, store]);

  async function track(eventType: AssistantEventType, productId?: string, extraMetadata: Record<string, unknown> = {}) {
    if (!data) return;
    const metadata = { experience_type: "assistant", experience_id: data.quiz.id, experience_name: data.quiz.name, experience_slug: data.quiz.slug, runtime_source: data.source, ...getSessionMetadata(), ...extraMetadata };
    if (data.source === "local") await store.recordPreviewEvent(eventType, data.quiz.id, productId, metadata);
    else fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, quizId: data.quiz.id, productId, metadata }) }).catch(() => undefined);
  }

  async function ask(value = query) {
    const clean = value.trim();
    if (!clean || !data || searching) return;
    const nextMessages: Message[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages); setQuery(""); setSearching(true); setError(""); setClarifyingOptions([]); setRecovery(null);
    if (!started.current) { started.current = true; track("quiz_start", undefined, { query: clean }); }
    try {
      const response = await fetch(data.source === "local" ? "/api/assistant" : `/api/public/assistant/${encodeURIComponent(data.quiz.slug || data.quiz.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.source === "local" ? { query: clean, history: messages.slice(-6), products: data.products } : { query: clean, history: messages.slice(-6) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The advisor could not complete that search.");
      const resultMatches = (payload.matches || []) as ConversationalMatch[];
      const status = (payload.status === "clarifying" ? "clarifying" : "recommendations") as AdvisorStatus;
      const intent: LastIntent = { query: clean, source: payload.source, terms: payload.intent?.terms || [], maxBudget: payload.intent?.maxBudget ?? null, resultCount: resultMatches.length, status };
      setMessages([...nextMessages, { role: "assistant", content: payload.assistantMessage }]);
      setMatches(resultMatches);
      setLastIntent(intent);
      const nextRecovery = payload.recovery as AdvisorRecoveryReport | undefined;
      setRecovery(nextRecovery || null);
      if (status === "clarifying") {
        setClarifyingOptions((payload.clarifyingOptions || []) as string[]);
        return;
      }
      await track("quiz_complete", undefined, { query: intent.query, source: intent.source, terms: intent.terms, max_budget: intent.maxBudget, result_count: intent.resultCount, advisor_status: status, recovery_status: nextRecovery?.status, recovery_primary_action: nextRecovery?.primaryAction });
      for (const [index, match] of resultMatches.entries()) await track("product_recommended", match.product.id, { query: intent.query, source: intent.source, terms: intent.terms, max_budget: intent.maxBudget, rank: index + 1, score: match.score, matched_signals: match.matchedSignals, product_name: match.product.name });
    } catch (err) { setError(err instanceof Error ? err.message : "The advisor could not complete that search."); setMessages([...nextMessages, { role: "assistant", content: "I hit a snag while comparing the catalog. Please try phrasing that another way." }]); }
    finally { setSearching(false); }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#eef1e9]"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-moss" /><p className="mt-3 text-xs font-bold text-black/40">Preparing your product advisor…</p></div></main>;
  if (!data) return <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center"><div><h1 className="text-3xl font-extrabold">Advisor unavailable</h1><p className="mt-2 text-sm text-black/45">{error}</p><Link href="/" className="btn-primary mt-5">Back to Sellentum</Link></div></main>;
  const accent = advisorCopy.accentColor;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,rgba(217,255,97,.38),transparent_30%),linear-gradient(135deg,#f0f3eb,#fff5ec)] p-4 lg:p-8">
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1400px] overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_35px_100px_rgba(25,40,30,.16)] lg:grid-cols-[.82fr_1.18fr]">
      <section className="flex min-h-[700px] flex-col border-b border-black/[0.07] lg:border-b-0 lg:border-r">
        <header className="flex items-center justify-between border-b border-black/[0.07] px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl text-white" style={{ background: accent }}><MessageCircle size={18} /></span><span><span className="block text-sm font-extrabold">{advisorCopy.brandName} advisor</span><span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-black/35"><i className="h-1.5 w-1.5 rounded-full bg-green-500" /> Ready to help</span></span></div><span className="hidden items-center gap-1.5 text-xs font-bold text-black/30 sm:flex"><ShieldCheck size={12} /> {advisorCopy.trustLabel}</span></header>
        <div className="flex-1 overflow-y-auto p-6"><div className="mb-7"><p className="eyebrow text-moss">{advisorCopy.eyebrow}</p><h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-.05em]">{advisorCopy.title}</h1><p className="mt-2 text-xs leading-5 text-black/40">{advisorCopy.description}</p></div><div className="space-y-4">{messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-5 ${message.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm bg-[#f0f2ec] text-black/60"}`} style={message.role === "user" ? { background: accent } : undefined}>{message.role === "assistant" && <Sparkles size={12} className="mb-2 text-moss" />}{message.content}</div></div>)}{searching && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-[#f0f2ec] px-4 py-3 text-xs font-bold text-black/40"><LoaderCircle size={13} className="animate-spin" /> Comparing catalog facts…</div></div>}</div>{clarifyingOptions.length > 0 && !searching && <div className="mt-5"><p className="text-xs font-extrabold uppercase tracking-wider text-black/30">Quick replies</p><div className="mt-2 flex flex-wrap gap-2">{clarifyingOptions.map((option) => <button key={option} onClick={() => ask(option)} className="rounded-full border border-moss/20 bg-lime/20 px-3 py-2 text-left text-xs font-extrabold text-moss hover:bg-lime/40">{option}</button>)}</div></div>}{messages.length === 1 && <div className="mt-7"><p className="text-xs font-extrabold uppercase tracking-wider text-black/30">Try asking</p><div className="mt-2 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-left text-xs font-bold text-black/50 hover:border-moss/40 hover:text-moss">{suggestion}</button>)}</div></div>}{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}</div>
        <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="border-t border-black/[0.07] p-4"><div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm focus-within:border-moss/40"><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-xs outline-none placeholder:text-black/30" placeholder={advisorCopy.inputPlaceholder} maxLength={500} /><button disabled={!query.trim() || searching} className="grid h-10 w-10 place-items-center rounded-xl text-white disabled:opacity-40" style={{ background: accent }} aria-label="Ask product advisor"><Send size={15} /></button></div><p className="mt-2 text-center text-xs text-black/25">Product selection is constrained to the active catalog and your stated budget.</p></form>
      </section>

      <section className="bg-[#f7f8f4] p-6 lg:p-9"><div className="flex items-end justify-between"><div><p className="eyebrow text-moss">Recommended for you</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{matches.length ? `${matches.length} strongest matches` : "Your matches will appear here"}</h2></div>{matches.length > 0 && <span className="rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold">Ranked live</span>}</div>
        {recovery && recovery.status !== "healthy" && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">{recovery.status === "no-results" ? "No exact eligible match" : recovery.status === "clarify" ? "One more detail helps" : "Refine this request"}</p>
              <h3 className="mt-1 text-sm font-extrabold">{recovery.primaryAction}</h3>
              <p className="mt-1 text-xs leading-4 text-black/45">{recovery.summary}</p>
            </div>
            {recovery.suggestions[0]?.prompt && <button onClick={() => ask(recovery.suggestions[0]!.prompt)} className="shrink-0 rounded-full bg-ink px-3 py-2 text-xs font-extrabold text-white">Try fix</button>}
          </div>
          {recovery.suggestions.length ? <div className="mt-3 grid gap-2 xl:grid-cols-2">
            {recovery.suggestions.slice(0, 4).map((suggestion) => <button key={suggestion.id} onClick={() => suggestion.prompt && ask(suggestion.prompt)} className="rounded-xl bg-white px-3 py-2 text-left">
              <p className="text-xs font-extrabold">{suggestion.title}</p>
              <p className="mt-1 text-xs leading-4 text-black/40">{suggestion.detail}</p>
            </button>)}
          </div> : null}
          {recovery.nearMisses.length ? <div className="mt-3 rounded-xl bg-white p-3">
            <p className="text-xs font-extrabold text-black/55">Closest catalog options</p>
            <div className="mt-2 grid gap-2 xl:grid-cols-3">
              {recovery.nearMisses.map((item) => <div key={item.productId} className="rounded-xl border border-black/[0.06] p-2">
                <p className="truncate text-xs font-extrabold">{item.productName}</p>
                <p className="mt-1 text-xs font-bold text-black/35">{item.category} · {formatCurrency(item.price)}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-3 text-black/35">{item.reason}</p>
              </div>)}
            </div>
          </div> : null}
        </section>}
        {matches.length ? <div className="mt-7 grid gap-4 xl:grid-cols-3">{matches.map((match, index) => <article key={match.product.id} className={`relative overflow-hidden rounded-2xl border bg-white ${index === 0 ? "border-ink shadow-xl" : "border-black/10"}`}>{index === 0 && <span className="absolute left-3 top-3 z-10 rounded-full bg-lime px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">Best match</span>}<div className="h-44 overflow-hidden bg-[#eceee9]">{match.product.image_url ? <img src={match.product.image_url} alt={match.product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Sparkles className="text-black/15" /></div>}</div><div className="p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-moss">{match.product.category}</p><h3 className="mt-2 text-sm font-extrabold leading-tight">{match.product.name}</h3><p className="mt-1 text-xs font-extrabold">{formatCurrency(match.product.price)}</p><div className="mt-4 min-h-[92px] rounded-xl bg-[#f2f4ef] p-3"><p className="flex items-center gap-1.5 text-xs font-extrabold text-moss"><Sparkles size={9} /> Why it fits</p><p className="mt-1.5 text-xs leading-4 text-black/50">{match.explanation}</p></div><div className="mt-4"><RecommendationFeedback productId={match.product.id} productName={match.product.name} compact onFeedback={(feedback, feedbackReason) => track("recommendation_feedback", match.product.id, { query: lastIntent?.query, source: lastIntent?.source, terms: lastIntent?.terms, max_budget: lastIntent?.maxBudget, feedback, feedback_reason: feedbackReason, rank: index + 1, score: match.score, matched_signals: match.matchedSignals, product_name: match.product.name, explanation_present: Boolean(match.explanation), feedback_surface: "advisor_result_card" })} /></div><a href={match.product.product_url || "#"} onClick={() => track("buy_click", match.product.id, { query: lastIntent?.query, source: lastIntent?.source, terms: lastIntent?.terms, max_budget: lastIntent?.maxBudget, rank: index + 1, score: match.score, matched_signals: match.matchedSignals, product_name: match.product.name })} target="_blank" rel="noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-extrabold text-white" style={{ background: accent }}>View product <ExternalLink size={11} /></a></div></article>)}</div> : <div className="mt-7 grid min-h-[520px] place-items-center rounded-[24px] border-2 border-dashed border-black/[0.07] bg-white/50 p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-lime/45 text-moss"><Sparkles size={24} /></span><h3 className="mt-5 text-lg font-extrabold">Ask naturally. Match reliably.</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-black/40">Try a goal, use case, preferred feature or maximum budget. Sellentum combines semantic similarity with catalog rules and stable ranking.</p><button onClick={() => ask(suggestions[0])} className="mt-5 inline-flex items-center gap-2 text-xs font-extrabold text-moss">Run an example <ArrowRight size={13} /></button></div></div>}
      </section>
    </div>
  </main>;
}
