"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Palette, ShoppingBag, Sparkles, Store } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { WidgetSettings } from "@/lib/types";
import { DEFAULT_WORKSPACE_BRAND, isWorkspaceOnboarded } from "@/lib/workspace-onboarding";

const swatches = ["#22352a", "#2d4cbe", "#7c3aed", "#be3a2d", "#111827", "#d25f28"];

export default function OnboardingPage() {
  const router = useRouter();
  const { ready, mode, settings, saveSettings } = useStore();
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22352a");
  const [buttonText, setButtonText] = useState("Find my match");
  const [widgetTitle, setWidgetTitle] = useState("Your personal product guide");
  const [welcomeMessage, setWelcomeMessage] = useState("Answer a few questions and we’ll find your best match.");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    setBrandName(isWorkspaceOnboarded(settings) ? settings.brand_name : "");
    setPrimaryColor(settings.primary_color || "#22352a");
    setButtonText(settings.button_text || "Find my match");
    setWidgetTitle(settings.widget_title || "Your personal product guide");
    setWelcomeMessage(settings.welcome_message || "Answer a few questions and we’ll find your best match.");
  }, [ready, settings]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedBrand = brandName.trim();
    if (!cleanedBrand || cleanedBrand.toLowerCase() === DEFAULT_WORKSPACE_BRAND.toLowerCase()) {
      setError("Add your real store or brand name before continuing.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const nextSettings: WidgetSettings = {
        ...settings,
        brand_name: cleanedBrand,
        primary_color: primaryColor,
        button_text: buttonText.trim() || "Find my match",
        widget_title: widgetTitle.trim() || `${cleanedBrand} product guide`,
        welcome_message: welcomeMessage.trim() || "Answer a few questions and we’ll find your best match.",
      };
      await saveSettings(nextSettings);

      if (mode === "supabase") {
        const supabase = createClient();
        const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
        if (data.user?.id) {
          await supabase?.from("profiles").update({ company_name: cleanedBrand }).eq("id", data.user.id);
        }
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your store setup. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <LoadingState label="Preparing store setup…" />;

  return (
    <div className="animate-rise">
      <div className="mx-auto max-w-6xl">
        <div className="grid overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-sm xl:grid-cols-[0.95fr_1.05fr]">
          <section className="relative overflow-hidden bg-ink p-10 text-white">
            <div className="dot-grid absolute inset-0 opacity-10" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.16em] text-lime">
                <Store size={13} /> Store setup required
              </span>
              <h1 className="display mt-8 text-5xl">Set up your store before using Sellentum.</h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
                Every merchant gets a clean workspace. Add your own brand first, then build your catalog, product finder, widget, and analytics from your real store context.
              </p>
              <div className="mt-9 space-y-3">
                {[
                  "Create a private brand workspace",
                  "Use your color and shopper-facing copy",
                  "Start with an empty catalog — no fake demo products",
                  "Continue straight into product setup",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-bold">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink"><Check size={13} /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <form onSubmit={submit} className="p-8 sm:p-10">
            <div>
              <p className="eyebrow text-moss">Workspace identity</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.045em]">Tell us about your store.</h2>
              <p className="mt-2 text-sm leading-6 text-black/45">You can change these later from account and brand settings.</p>
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <label className="label" htmlFor="brand-name">Store or brand name</label>
                <input id="brand-name" className="field" value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder="Example: Sellentum Store" autoFocus required />
              </div>

              <div>
                <label className="label">Primary brand color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {swatches.map((color) => (
                    <button key={color} type="button" onClick={() => setPrimaryColor(color)} style={{ background: color }} className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white shadow-sm ring-offset-2 ${primaryColor === color ? "ring-2 ring-ink" : ""}`} aria-label={`Use ${color}`}>
                      {primaryColor === color && <Check size={15} className="text-white" />}
                    </button>
                  ))}
                  <label className="flex items-center gap-2 rounded-full border border-black/10 bg-canvas p-1 pr-3 text-xs font-bold">
                    <input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent" />
                    Custom
                  </label>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="label" htmlFor="button-text">Widget button text</label>
                  <input id="button-text" className="field" value={buttonText} onChange={(event) => setButtonText(event.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="widget-title">Widget title</label>
                  <input id="widget-title" className="field" value={widgetTitle} onChange={(event) => setWidgetTitle(event.target.value)} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="welcome-message">Welcome message</label>
                <textarea id="welcome-message" className="field min-h-24" value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} />
              </div>

              {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl bg-[#f4f6ef] p-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: primaryColor }}><Sparkles size={17} /></span>
                <div>
                  <p className="text-sm font-extrabold">{brandName || "Your store"} product guide</p>
                  <p className="text-xs leading-4 text-black/40">{welcomeMessage}</p>
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : <><ShoppingBag size={15} /> Save store setup <ArrowRight size={15} /></>}
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-black/35">
              <Palette size={13} />
              This creates your branded workspace. Catalog and finder setup come next.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
