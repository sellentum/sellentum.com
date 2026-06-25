"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, Boxes, Check, Clipboard, Code2, ExternalLink, Gauge, LoaderCircle, Rocket, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import type { GeneratedQuizSuggestion, Product, ProductInput } from "@/lib/types";
import { slugify, uid } from "@/lib/utils";

type BusyAction = "enrich" | "generate" | "copy" | null;

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
  const { ready, products, quizzes, settings, saveProduct, createQuiz, saveQuiz } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdQuizId, setCreatedQuizId] = useState("");
  const [source, setSource] = useState<"rules" | "openai" | "">("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);
  const enrichedProducts = useMemo(() => activeProducts.filter((product) => product.enrichment_status === "enriched" || Boolean(product.search_text) || Boolean(product.buyer_needs?.length)), [activeProducts]);
  const selectedFinder = useMemo(() => quizzes.find((quiz) => quiz.id === createdQuizId) || quizzes.find((quiz) => quiz.published) || quizzes[0], [createdQuizId, quizzes]);
  const liveFinder = selectedFinder?.published ? selectedFinder : quizzes.find((quiz) => quiz.published);
  const finderForSnippet = liveFinder || selectedFinder;
  const enrichedPercent = activeProducts.length ? Math.round((enrichedProducts.length / activeProducts.length) * 100) : 0;
  const hasLaunchableCatalog = activeProducts.length >= 2;
  const hasLaunchableFinder = Boolean(liveFinder && liveFinder.questions.length > 0);
  const launchScore = [hasLaunchableCatalog, enrichedPercent >= 60, hasLaunchableFinder].filter(Boolean).length;
  const snippet = `<script\n  src="${origin}/api/widget.js"\n  data-experience="finder"\n  data-mode="modal"\n  data-id="${finderForSnippet?.id || "YOUR_FINDER_ID"}"\n  data-color="${settings.primary_color}"\n  data-label="${settings.button_text}"\n  data-position="${settings.launcher_position === "bottom-left" ? "left" : "right"}"\n  data-height="780px"\n  async\n></script>`;

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
      setNotice(`${quiz.name} was generated and published using ${payload.source === "openai" ? "OpenAI" : "the deterministic fallback engine"}.`);
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
      setNotice("Widget snippet copied. Paste it before your storefront’s closing </body> tag.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy automatically. Select the snippet and copy it manually.");
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
              <button onClick={generateAndPublishFinder} disabled={!hasLaunchableCatalog || busy !== null} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-xs font-extrabold text-white hover:bg-white/15 disabled:opacity-50">{busy === "generate" ? <LoaderCircle size={14} className="animate-spin" /> : <Rocket size={14} />} Generate & publish finder</button>
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
              { label: "Widget snippet is ready", detail: finderForSnippet ? "A copy-paste script can launch the finder in a modal iframe" : "Generate or publish a finder first", done: Boolean(finderForSnippet), href: "/dashboard/settings", icon: Code2 },
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
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-extrabold">Install widget</h2>
              <p className="mt-1 text-[10px] text-black/35">Paste this into any storefront once the finder is published.</p>
            </div>
            <button onClick={copySnippet} disabled={!finderForSnippet || busy !== null} className="btn-secondary !px-3 !py-2 text-xs">{busy === "copy" ? <LoaderCircle size={13} className="animate-spin" /> : copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? "Copied" : "Copy"}</button>
          </div>
          <pre className="min-h-[220px] overflow-x-auto bg-ink p-5 text-[10px] leading-5 text-lime/80"><code>{snippet}</code></pre>
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {finderForSnippet && <Link href={`/finder/${finderForSnippet.slug || finderForSnippet.id}`} target="_blank" className="btn-primary justify-center !px-3 !py-2.5 text-xs"><ExternalLink size={13} /> Preview finder</Link>}
            <Link href="/dashboard/lab" className="btn-secondary justify-center !px-3 !py-2.5 text-xs"><ShieldCheck size={13} /> Test logic</Link>
            <Link href="/dashboard/preflight" className="btn-secondary justify-center !px-3 !py-2.5 text-xs"><Rocket size={13} /> Run preflight</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
