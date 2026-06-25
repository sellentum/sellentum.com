import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return <AuthShell title="Good to see you again." copy="Pick up where you left off and keep turning product choice into confident purchases."><Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-black/5" />}><AuthForm mode="login" /></Suspense></AuthShell>;
}
