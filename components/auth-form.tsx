"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(mode === "login" ? "founder@example.com" : "");
  const [password, setPassword] = useState(mode === "login" ? "demo1234" : "");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    try {
      if (!isSupabaseConfigured()) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        document.cookie = "findly_demo_session=1; path=/; max-age=604800; SameSite=Lax";
        router.push(params.get("next") || "/dashboard");
        router.refresh();
        return;
      }
      const supabase = createClient()!;
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push(params.get("next") || "/dashboard");
        router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
        if (authError) throw authError;
        if (!data.session) setNotice("Check your inbox to confirm your account, then log in.");
        else { router.push("/dashboard"); router.refresh(); }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {mode === "signup" && <div><label className="label" htmlFor="name">Your name</label><input className="field" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" required /></div>}
      <div><label className="label" htmlFor="email">Work email</label><input className="field" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required /></div>
      <div><div className="mb-1.5 flex items-center justify-between"><label className="label !mb-0" htmlFor="password">Password</label>{mode === "login" && <button type="button" className="text-xs font-bold text-moss">Forgot password?</button>}</div><div className="relative"><input className="field pr-11" id="password" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {notice && <p className="rounded-xl bg-lime/30 px-3 py-2 text-xs font-semibold text-moss">{notice}</p>}
      <button className="btn-primary !mt-6 w-full !py-3.5" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : <>{mode === "login" ? "Log in to Findly" : "Create my workspace"}<ArrowRight size={16} /></>}</button>
      {!isSupabaseConfigured() && <p className="rounded-xl border border-lime/60 bg-lime/20 px-3 py-2.5 text-center text-xs font-semibold text-moss">Demo mode is active—any credentials will work.</p>}
      <p className="pt-2 text-center text-sm text-black/45">{mode === "login" ? "New to Findly?" : "Already have an account?"} <Link className="font-extrabold text-ink" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Log in"}</Link></p>
    </form>
  );
}
