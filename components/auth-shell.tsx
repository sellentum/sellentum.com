import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthShell({ children, title, copy }: { children: React.ReactNode; title: string; copy: string }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_.9fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between"><Logo /><Link href="/" className="flex items-center gap-2 text-xs font-bold text-black/45"><ArrowLeft size={14} /> Back to site</Link></div>
        <div className="mx-auto my-auto w-full max-w-[430px] py-16"><p className="eyebrow text-moss">Welcome to Sellentum</p><h1 className="display mt-3 text-5xl leading-none">{title}</h1><p className="mt-4 text-sm leading-6 text-black/50">{copy}</p>{children}</div>
        <p className="text-center text-xs text-black/30">By continuing, you agree to our Terms and Privacy Policy.</p>
      </section>
      <aside className="noise relative m-3 hidden overflow-hidden rounded-[32px] bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-lime/20 blur-3xl" />
        <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-lime"><Sparkles size={13} /> Built for modern commerce teams</span></div>
        <div className="relative"><blockquote className="display max-w-xl text-5xl leading-[1.02]">“The best product finder feels less like filtering—and more like being understood.”</blockquote><div className="mt-10 space-y-3">{["Deterministic product matching", "Human-friendly AI explanations", "One snippet to publish anywhere"].map((item) => <div className="flex items-center gap-3 text-sm font-semibold text-white/65" key={item}><span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink"><Check size={13} /></span>{item}</div>)}</div></div>
        <p className="relative text-xs text-white/30">Sellentum · Guided selling, made lighter</p>
      </aside>
    </main>
  );
}
