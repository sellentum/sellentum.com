"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpenCheck, Boxes, BrainCircuit, Check, Clipboard, Code2, ExternalLink, FileText, Gauge, LoaderCircle, Rocket, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { buildLaunchExperienceCards } from "@/lib/experience-launch";
import { buildLaunchPacket } from "@/lib/launch-packet";
import { buildQuizBlueprint } from "@/lib/quiz-blueprint";
import type { GeneratedQuizSuggestion, Product, ProductInput } from "@/lib/types";
import { slugify, uid } from "@/lib/utils";
import type { WidgetEmbedExperience } from "@/lib/widget-snippet";

type BusyAction = "enrich" | "generate" | "copy" | "packet" | null;

function productPayload(products: Product[]) {
  return products.map(({ id, name, price, category, description, features, tags, buyer_needs }) => ({
    id,
    name,
    price,
    category,
    description,
    features,
    tags,
    buyer_needs,
  }));
}

function productInputFromEnrichment(original: Product, enriched: { normalized_category: string; features: string[]; tags: string[]; buyer_needs: string[]; search_text: string }, enrichedAt: string): ProductInput {
  return {
    name: original.name,
    price: original.price,
    image_url: original.image_url,
    category: enriched.normalized_category,
    description: original.description,
    features: enriched.features,
    tags: enriched.tags,
    product_url: original.product_url,
    active: original.active,
    search_text: enriched.search_text,
    buyer_needs: enriched.buyer_needs,
    enrichment_status: "enriched",
    enriched_at: enrichedAt,
  };
}

export default function LaunchStudioPage() {
  const { ready, products, quizzes, configurators, settings, saveProduct, createQuiz, saveQuiz } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [selectedExperience, setSelectedExperience] = useState<WidgetEmbedExperience>("finder");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdQuizId, setCreatedQuizId] = useState("");
  const [source, setSource] = useState<"rules" | "ontology" | "openai" | "">("");
  const [copied, setCopied] = useState(false);
  const [packetCopied, setPacketCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const originBase = origin.replace(/\/+$/, "");
  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);
  const enrichedProducts = useMemo(() => activeProducts.filter((product) => product.enrichment_status === "enriched" || Boolean(product.search_text) || Boolean(product.buyer_needs?.length)), [activeProducts]);
  const selectedFinder = useMemo(() => quizzes.find((quiz) => quiz.id === createdQuizId) || quizzes.find((quiz) => quiz.published) || quizzes[0], [createdQuizId, quizzes]);
  const liveFinder = selectedFinder?.published ? selectedFinder : quizzes.find((quiz) => quiz.published);
  const finderForSnippet = liveFinder || selectedFinder;
  const publishedConfigurator = useMemo(() => configurators.find((configurator) => configurator.published) || configurators[0], [configurators]);
  const enrichedPercent = activeProducts.length ? Math.round((enrichedProducts.length / activeProducts.length) * 100) : 0;
  const hasLaunchableCatalog = activeProducts.length >= 2;
  const hasLaunchableFinder = Boolean(liveFinder && liveFinder.questions.length > 0);
  const launchScore = [hasLaunchableCatalog, enrichedPercent >= 60, hasLaunchableFinder].filter(Boolean).length;
  const quizBlueprint = useMemo(() => buildQuizBlueprint(activeProducts), [activeProducts]);
  const blueprintStatusLabel = quizBlueprint.status === "ready" ? "Ready" : quizBlueprint.status === "needs-review" ? "Review" : "Blocked";
  const launchExperienceCards = useMemo(() => buildLaunchExperienceCards({
    origin,
    settings,
    finders: quizzes,
    configurators,
    mode: "modal",
    preferredFinderId: finderForSnippet?.id,
    preferredConfiguratorId: publishedConfigurator?.id,
  }), [origin, settings, quizzes, configurators, finderForSnippet?.id, publishedConfigurator?.id]);
  const selectedLaunchExperience = launchExperienceCards.find((card) => card.experience === selectedExperience) || launchExperienceCards[0];
  const snippet = selectedLaunchExperience.snippet;
  const installReport = selectedLaunchExperience.installReport;
  const publicUrl = selectedLaunchExperience.publicUrl || `${originBase}/finder/${finderForSnippet?.slug || finderForSnippet?.id || "YOUR_FINDER_ID"}`;
  const launchPacket = buildLaunchPacket({
    origin,
    publicUrl,
    widgetExperience: selectedLaunchExperience.label,
    embedSnippet: snippet,
    installReport,
    settings,
    experienceName: selectedLaunchExperience.name || selectedLaunchExperience.label,
    experienceStatus: selectedLaunchExperience.statusLabel,
    stableEmbedId: selectedLaunchExperience.id,
    sourceLabel: selectedLaunchExperience.source === "configurator" ? "Configurator" : "Finder context",
    finder: selectedLaunchExperience.source === "finder" ? finderForSnippet : undefined,
    activeProducts: activeProducts.length,
    enrichedPercent,
  });

  async function enrichCatalog() {
    if (!products.length) return;
    setBusy("enrich");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/catalog/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: products.map(({ id, name, price, category, description, features, tags }) => ({ id, name, price, category, description, features, tags })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not enrich the catalog.");
      for (const enriched of payload.products as Array<{ id: string; normalized_category: string; features: string[]; tags: string[]; buyer_needs: string[]; search_text: string }>) {
        const original = products.find((product) => product.id === enriched.id);
        if (original) await saveProduct(productInputFromEnrichment(original, enriched, payload.enriched_at), original.id);
      }
      setSource(payload.source);
      setNotice(`${payload.products.length} products are discovery-ready${payload.source === "openai" ? " with OpenAI enrichment" : " with deterministic enrichment"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog enrichment failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generateAndPublishFinder() {
    if (!hasLaunchableCatalog) return;
    setBusy("generate");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: "Generate a concise, high-conversion product finder for a self-serve ecommerce guided-selling widget. Prefer buyer language over technical fields.",
          products: productPayload(activeProducts),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not generate a product finder.");
      const suggestion = payload.suggestion as GeneratedQuizSuggestion;
      const quiz = createQuiz();
      quiz.name = suggestion.name || "AI-generated product finder";
      quiz.slug = `${slugify(quiz.name || "product-finder")}-${Date.now().toString().slice(-5)}`;
      quiz.welcome_title = suggestion.welcome_title;
      quiz.welcome_message = suggestion.welcome_message;
      quiz.published = true;
      quiz.questions = suggestion.questions.map((question, questionIndex) => {
        const questionId = uid("q");
        return {
          id: questionId,
          quiz_id: quiz.id,
          title: question.title,
          helper_text: question.helper_text,
          position: questionIndex,
          options: question.options.map((option, optionIndex) => ({
            id: uid("option"),
            question_id: questionId,
            label: option.label,
            match_type: option.match_type,
            match_value: option.match_value,
            weight: option.weight,
            position: optionIndex,
          })),
        };
      });
      await saveQuiz(quiz);
      setCreatedQuizId(quiz.id);
      setSource(payload.source);
      setNotice(`${quiz.name} was generated and published using ${payload.source === "openai" ? "OpenAI with catalog ontology context" : payload.source === "ontology" ? "the catalog ontology engine" : "the deterministic fallback engine"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finder generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function copySnippet() {
    setBusy("copy");
    setError("");
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setNotice(`${selectedLaunchExperience.label} snippet copied. Paste it before your storefront’s closing </body> tag.`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy automatically. Select the snippet and copy it manually.");
    } finally {
      setBusy(null);
    }
  }

  async function copyLaunchPacket() {
    setBusy("packet");
    setError("");
    try {
      await navigator.clipboard.writeText(launchPacket);
      setPacketCopied(true);
      setNotice(`${selectedLaunchExperience.label} launch packet copied. It includes the URL, snippet, readiness checks and analytics events.`);
      setTimeout(() => setPacketCopied(false), 1800);
    } catch {
      setError("Could not copy the launch packet automatically. Select the preview and copy it manually.");
    } finally {
      setBusy(null);
    }
  }

  if (!ready) return <LoadingState label="Opening Launch Studio…" />;

  return (
    <div className="animate-rise">
      <section className="overflow-hidden rounded-[34px] bg-ink text-white">
        <div className="relative grid gap-10 p-8 xl:grid-cols-[1fr_460px] xl:p-11">
          <div className="dot-grid absolute inset-0 opacity-10" />
          <div className="relative">
            <p className="eyebrow text-lime">Launch Studio</p>
            <h1 className="mt-4 max-w-4xl text-6xl font-extrabold leading-[.88] tracking-[-.075em]">Turn a catalog into an embeddable finder in one focused workflow.</h1>
            <p className="mt-6 max-w-2xl text-sm leading-6 text-white/50">Enrich the product data, generate buyer-friendly questions, publish the finder, then copy the storefront widget. Same engine, fewer tabs.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={enrichCatalog} disabled={!products.length || busy !== null} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-xs font-extrabold text-ink disabled:opacity-50">{busy === "enrich" ? <LoaderCircle size={14} className="animate-spin" /> : <Wand2 size={14} />} Enrich catalog</button>
              <button onClick={generateAndPublishFinder} disabled={!quizBlueprint.canGenerate || busy !== null} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15 disabled:opacity-50">{busy === "generate" ? <LoaderCircle size={14} className="animate-spin" /> : <Rocket size={14} />} Generate & publish finder</button>
            </div>
            {error && <p className="mt-5 rounded-2xl bg-red-500/15 p-3 text-xs font-bold text-red-100">{error}</p>}
            {notice && <p className="mt-5 rounded-2xl bg-lime/15 p-3 text-xs font-bold text-lime">{notice}</p>}
          </div>
          <div className="relative rounded-[30px] border border-white/10 bg-white/[.06] p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Gauge size={22} /></span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-extrabold text-white/55">{launchScore}/3 core steps ready</span>
            </div>
            <h2 className="display mt-7 text-4xl">{hasLaunchableFinder ? "Finder is live" : hasLaunchableCatalog ? "Catalog is launchable" : "Catalog first"}</h2>
            <p className="mt-2 text-xs leading-5 text-white/45">{hasLaunchableFinder ? "You can preview, copy the widget, and run preflight." : hasLaunchableCatalog ? "You have enough products. Enrichment will improve semantic matching, then generation can publish the finder." : "Add at least two active products before generating a meaningful finder."}</p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{activeProducts.length}</p><p className="mt-1 text-[8px] font-bold text-white/35">Active SKUs</p></div>
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{enrichedPercent}%</p><p className="mt-1 text-[8px] font-bold text-white/35">Enriched</p></div>
              <div className="rounded-2xl bg-white/[.07] p-4"><p className="text-2xl font-extrabold">{quizzes.filter((quiz) => quiz.published).length}</p><p className="mt-1 text-[8px] font-bold text-white/35">Live finders</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-extrabold">Launch path</h2>
              <p className="mt-1 text-[10px] text-black/35">A self-serve version of the guided-selling setup sequence.</p>
            </div>
            {source && <span className="rounded-full bg-lime/30 px-3 py-1.5 text-[9px] font-extrabold text-moss">Last AI path: {source}</span>}
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: "Catalog has enough active products", detail: `${activeProducts.length} active product${activeProducts.length === 1 ? "" : "s"} available`, done: hasLaunchableCatalog, href: "/dashboard/products", icon: Boxes },
              { label: "Catalog is discovery-ready", detail: `${enrichedProducts.length}/${activeProducts.length || 0} active products enriched or carrying buyer-needs/search text`, done: enrichedPercent >= 60, href: "/dashboard/products", icon: Sparkles },
              { label: "Finder is generated and published", detail: liveFinder ? `${liveFinder.name} · ${liveFinder.questions.length} questions` : "No published finder yet", done: hasLaunchableFinder, href: "/dashboard/quizzes", icon: BookOpenCheck },
              { label: "Widget snippets are ready", detail: launchExperienceCards.some((card) => card.status === "ready") ? "Finder, advisor, search or configurator snippets can be copied from this launch screen" : "Publish a finder or configurator first", done: launchExperienceCards.some((card) => card.status === "ready"), href: "/dashboard/settings", icon: Code2 },
            ].map((item, index) => {
              const Icon = item.icon;
              return <article key={item.label} className="rounded-2xl border border-black/[0.06] bg-[#f8f8f4] p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.done ? "bg-lime text-moss" : "bg-white text-black/25"}`}>{item.done ? <Check size={16} /> : <Icon size={16} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold">{index + 1}. {item.label}</p>
                    <p className="mt-1 text-[10px] leading-4 text-black/40">{item.detail}</p>
                  </div>
                  <Link href={item.href} className="shrink-0 text-[9px] font-extrabold text-moss">Open <ArrowRight size={10} className="inline" /></Link>
                </div>
              </article>;
            })}
          </div>

          <div className="mt-6 rounded-[24px] border border-black/[0.07] bg-ink p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-extrabold"><BrainCircuit size={14} className="text-lime" /> AI quiz blueprint</p>
                <p className="mt-1.5 text-[10px] leading-4 text-white/45">Preview the ontology-derived question plan before one-click generation publishes it.</p>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[8px] font-extrabold uppercase ${quizBlueprint.status === "ready" ? "bg-lime text-ink" : quizBlueprint.status === "needs-review" ? "bg-amber-300/20 text-amber-100" : "bg-red-400/15 text-red-100"}`}>{blueprintStatusLabel} · {quizBlueprint.score}%</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{quizBlueprint.questions.length}</p><p className="mt-1 text-[8px] font-bold text-white/35">Questions</p></div>
              <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-lg font-extrabold">{quizBlueprint.topSignals.length}</p><p className="mt-1 text-[8px] font-bold text-white/35">Signals</p></div>
              <div className="rounded-2xl bg-white/[.07] p-3"><p className="text-lg font-extrabold capitalize">{quizBlueprint.source}</p><p className="mt-1 text-[8px] font-bold text-white/35">Source</p></div>
            </div>
            <div className="mt-4 space-y-3">
              {quizBlueprint.questions.slice(0, 3).map((question, index) => <article key={question.title} className="rounded-2xl bg-white/[.07] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-lime">Question {index + 1}</p>
                    <h3 className="mt-1 text-xs font-extrabold">{question.title}</h3>
                    <p className="mt-1 text-[9px] leading-4 text-white/40">{question.coverageSummary}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-extrabold text-white/35">{question.options.length} answers</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {question.options.slice(0, 5).map((option) => {
                    const tone = option.status === "matched" ? "bg-lime/15 text-lime" : option.status === "preference" ? "bg-blue-400/15 text-blue-100" : "bg-red-400/15 text-red-100";
                    return <span key={`${question.title}-${option.label}`} className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold ${tone}`}>{option.label} · {option.status === "preference" ? "preference" : `${option.productCount} SKUs`}</span>;
                  })}
                </div>
              </article>)}
            </div>
            <div className="mt-4 space-y-2">
              {quizBlueprint.risks.slice(0, 2).map((risk) => <p key={risk} className="flex items-start gap-2 rounded-2xl bg-amber-300/10 p-3 text-[9px] font-bold leading-4 text-amber-100"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{risk}</p>)}
              {!quizBlueprint.risks.length && <p className="rounded-2xl bg-lime/10 p-3 text-[9px] font-bold leading-4 text-lime">Blueprint looks strong: enough catalog structure exists for a useful generated finder.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-extrabold">Install widget</h2>
              <p className="mt-1 text-[10px] text-black/35">Choose a published discovery surface, then paste the snippet into any storefront.</p>
            </div>
            <button onClick={copySnippet} disabled={selectedLaunchExperience.status !== "ready" || busy !== null} className="btn-secondary !px-3 !py-2 text-xs">{busy === "copy" ? <LoaderCircle size={13} className="animate-spin" /> : copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="grid gap-3 border-b border-black/[0.06] bg-[#f8f8f4] p-5 sm:grid-cols-2">
            {launchExperienceCards.map((card) => (
              <button key={card.experience} onClick={() => setSelectedExperience(card.experience)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selectedExperience === card.experience ? "border-ink bg-white shadow-sm" : "border-black/[0.06] bg-white/65 hover:border-moss/30"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold">{card.label}</p>
                    <p className="mt-1 text-[9px] leading-4 text-black/40">{card.purpose}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[8px] font-extrabold uppercase ${card.status === "ready" ? "bg-lime/35 text-moss" : card.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>{card.statusLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[8px] font-bold text-black/35">
                  <span className="truncate">{card.name || "No source selected"}</span>
                  <span>{card.id || "Missing ID"}</span>
                </div>
              </button>
            ))}
          </div>
          <pre className="min-h-[220px] overflow-x-auto bg-ink p-5 text-[10px] leading-5 text-lime/80"><code>{snippet}</code></pre>
          <div className="border-t border-black/[0.06] bg-[#f8f8f4] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold">Embed QA checklist</p>
              <span className={`rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase ${installReport.canInstall ? "bg-lime/35 text-moss" : "bg-amber-50 text-amber-700"}`}>{installReport.canInstall ? "Ready" : "Needs attention"}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {installReport.checks.slice(0, 4).map((item) => <div key={item.id} className={`rounded-xl px-3 py-2 ${item.severity === "pass" ? "bg-lime/20" : item.severity === "warning" ? "bg-amber-50" : "bg-red-50"}`}>
                <p className="text-[9px] font-extrabold">{item.label}</p>
                <p className="mt-0.5 text-[8px] font-bold leading-3 text-black/35">{item.detail}</p>
              </div>)}
            </div>
          </div>
          <div className="border-t border-black/[0.06] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><FileText size={15} className="text-moss" /> Developer handoff</h2>
                <p className="mt-1 text-[10px] leading-4 text-black/35">Copy a launch packet with the preview URL, embed snippet, install QA status and analytics contract.</p>
              </div>
              <button onClick={copyLaunchPacket} disabled={busy !== null} className="btn-secondary shrink-0 !px-3 !py-2 text-xs">{busy === "packet" ? <LoaderCircle size={13} className="animate-spin" /> : packetCopied ? <Check size={13} /> : <Clipboard size={13} />}{packetCopied ? "Copied" : "Copy packet"}</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-canvas p-3"><p className="text-[9px] font-extrabold uppercase tracking-wide text-black/30">Preview URL</p><p className="mt-1 truncate text-[10px] font-bold text-black/55">{publicUrl}</p></div>
              <div className="rounded-2xl bg-canvas p-3"><p className="text-[9px] font-extrabold uppercase tracking-wide text-black/30">Stable embed ID</p><p className="mt-1 truncate text-[10px] font-bold text-black/55">{selectedLaunchExperience.id || "YOUR_EXPERIENCE_ID"}</p></div>
              <div className="rounded-2xl bg-canvas p-3"><p className="text-[9px] font-extrabold uppercase tracking-wide text-black/30">Analytics contract</p><p className="mt-1 text-[10px] font-bold text-black/55">5 tracked events</p></div>
            </div>
            <pre className="mt-4 max-h-40 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#f8f8f4] p-4 text-[9px] leading-4 text-black/45"><code>{launchPacket.split("\n").slice(0, 20).join("\n")}</code></pre>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {selectedLaunchExperience.id && <Link href={selectedLaunchExperience.publicUrl.replace(originBase, "")} target="_blank" className="btn-primary justify-center !px-3 !py-2.5 text-xs"><ExternalLink size={13} /> Preview {selectedLaunchExperience.experience}</Link>}
            <Link href="/dashboard/lab" className="btn-secondary justify-center !px-3 !py-2.5 text-xs"><ShieldCheck size={13} /> Test logic</Link>
            <Link href="/dashboard/preflight" className="btn-secondary justify-center !px-3 !py-2.5 text-xs"><Rocket size={13} /> Run preflight</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
