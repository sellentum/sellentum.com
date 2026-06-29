"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (!isSupabaseConfigured()) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        setNotice("Demo mode is active, so no reset email was sent. In production, Sellentum will email a secure reset link.");
        return;
      }

      const supabase = createClient()!;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
      });
      if (resetError) throw resetError;
      setNotice("If an account exists for that email, Sellentum has sent a secure password reset link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="reset-email">Work email</label>
        <input
          className="field"
          id="reset-email"
          name="reset-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {notice && <p className="flex items-start gap-2 rounded-xl bg-lime/30 px-3 py-2 text-xs font-semibold text-moss"><CheckCircle2 className="mt-0.5 shrink-0" size={14} />{notice}</p>}
      <button className="btn-primary !mt-6 w-full !py-3.5" disabled={loading}>
        {loading ? <LoaderCircle className="animate-spin" size={17} /> : <>Send reset link<ArrowRight size={16} /></>}
      </button>
      <Link href="/login" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss"><ArrowLeft size={13} /> Back to login</Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (password !== confirmPassword) throw new Error("Passwords do not match.");
      if (!isSupabaseConfigured()) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        setNotice("Demo mode is active. In production, this will update your Sellentum password.");
        return;
      }

      const supabase = createClient()!;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("This reset link has expired or was already used. Please request a new password reset email.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setNotice("Your password has been updated. Redirecting you to the dashboard.");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password. Please request a new reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="label" htmlFor="new-password">New password</label>
        <div className="relative">
          <input
            className="field pr-11"
            id="new-password"
            name="new-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            autoComplete="new-password"
            required
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Confirm password</label>
        <input
          className="field"
          id="confirm-password"
          name="confirm-password"
          type={show ? "text" : "password"}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {notice && <p className="flex items-start gap-2 rounded-xl bg-lime/30 px-3 py-2 text-xs font-semibold text-moss"><CheckCircle2 className="mt-0.5 shrink-0" size={14} />{notice}</p>}
      <button className="btn-primary !mt-6 w-full !py-3.5" disabled={loading}>
        {loading ? <LoaderCircle className="animate-spin" size={17} /> : <>Update password<ArrowRight size={16} /></>}
      </button>
      <Link href="/forgot-password" className="inline-flex items-center gap-2 text-xs font-extrabold text-moss">Request a new reset link</Link>
    </form>
  );
}
