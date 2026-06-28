"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, LoaderCircle, LogOut, Save, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

type ProfileRow = {
  full_name: string | null;
  company_name: string | null;
};

export default function AccountPage() {
  const { ready, mode, settings } = useStore();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    let active = true;

    async function loadAccount() {
      if (mode !== "supabase") {
        setEmail("Demo workspace");
        setCompanyName(settings.brand_name);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!active || !user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || "");
      const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
      setFullName(metadataName);

      const { data: profile } = await supabase.from("profiles").select("full_name, company_name").eq("id", user.id).maybeSingle<ProfileRow>();
      if (!active) return;
      setFullName(profile?.full_name || metadataName || "");
      setCompanyName(profile?.company_name || settings.brand_name || "");
      setLoading(false);
    }

    loadAccount();
    return () => { active = false; };
  }, [mode, ready, settings.brand_name]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "supabase") return;
    const supabase = createClient();
    if (!supabase) return;

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error("You need to be logged in to update account settings.");

      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      if (metadataError) throw metadataError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), company_name: companyName.trim() })
        .eq("id", userId);
      if (profileError) throw profileError;

      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account settings.");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await createClient()?.auth.signOut();
    document.cookie = "sellentum_demo_session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  if (!ready || loading) return <LoadingState label="Loading account settings…" />;

  return (
    <div className="animate-rise">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow text-moss">Account settings</p>
          <h1 className="display mt-2 text-5xl">Manage your Sellentum account.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Update owner details, review workspace identity, jump to billing, or sign out securely.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/settings" className="btn-secondary"><Sparkles size={14} /> Brand settings</Link>
          <Link href="/dashboard/usage" className="btn-secondary"><CreditCard size={14} /> Billing & plan</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_380px]">
        <form onSubmit={save} className="rounded-[28px] border border-black/[0.07] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime/45 text-moss"><UserRound size={21} /></span>
            <div>
              <h2 className="text-sm font-extrabold">Profile details</h2>
              <p className="mt-1 text-xs text-black/35">Used for account ownership and workspace records.</p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-2">
            <div>
              <label className="label" htmlFor="account-email">Email</label>
              <input id="account-email" className="field bg-black/[0.02] text-black/45" value={email} disabled />
            </div>
            <div>
              <label className="label" htmlFor="full-name">Full name</label>
              <input id="full-name" className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" />
            </div>
            <div className="xl:col-span-2">
              <label className="label" htmlFor="company-name">Company name</label>
              <input id="company-name" className="field" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" />
              <p className="mt-1.5 text-xs font-bold text-black/30">Your public widget brand is managed separately in Brand & widget settings.</p>
            </div>
          </div>

          {error && <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-5">
            <button type="submit" disabled={saving || mode !== "supabase"} className="btn-primary">
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
              {saved ? "Saved" : "Save account"}
            </button>
            <button type="button" onClick={logout} className="btn-secondary text-red-600"><LogOut size={14} /> Log out</button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><ShieldCheck size={20} /></span>
            <h2 className="mt-6 text-2xl font-extrabold tracking-[-.045em]">Workspace access</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">You are signed into the private workspace for {settings.brand_name}. Data is isolated by Supabase Row Level Security.</p>
          </section>
          <Link href="/dashboard/usage" className="block rounded-[28px] border border-black/[0.07] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <CreditCard className="text-moss" size={22} />
            <h2 className="mt-5 text-sm font-extrabold">Billing & plan</h2>
            <p className="mt-2 text-xs leading-5 text-black/40">Review current usage, starter-plan readiness, and Stripe placeholder status.</p>
          </Link>
          <Link href="/dashboard/settings" className="block rounded-[28px] border border-black/[0.07] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
            <Settings className="text-moss" size={22} />
            <h2 className="mt-5 text-sm font-extrabold">Brand & widget</h2>
            <p className="mt-2 text-xs leading-5 text-black/40">Edit public widget copy, brand color, launcher text, and embed snippets.</p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
