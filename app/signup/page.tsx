import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function SignupPage() {
  return <AuthShell title="Make choosing feel easy." copy="Create your workspace and turn your product knowledge into a polished, guided buying experience."><Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-black/5" />}><AuthForm mode="signup" /></Suspense></AuthShell>;
}
