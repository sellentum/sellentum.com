"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clipboard, Code2, ExternalLink, Globe2, LoaderCircle, LockKeyhole, MonitorCheck, MousePointerClick, Search, ShieldCheck, Wrench } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import type { StorefrontInstallScanReport, StorefrontInstallScanStatus, StorefrontInstallCheckStatus } from "@/lib/storefront-install-scanner";
import { buildStorefrontProofPacket, storefrontProofEvents, storefrontProofSteps } from "@/lib/storefront-proof";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const statusTone: Record<StorefrontInstallScanStatus, string> = {
  installed: "bg-lime text-ink",
  partial: "bg-amber-300/20 text-amber-100",
  missing: "bg-red-500/20 text-red-100",
  blocked: "bg-red-500/20 text-red-100",
};

const checkTone: Record<StorefrontInstallCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

function CheckIcon({ status }: { status: StorefrontInstallCheckStatus }) {
  if (status === "pass") return <CheckCircle2 size={16} />;
  if (status === "warn") return <AlertTriangle size={16} />;
  return <LockKeyhole size={16} />;
}

export default function InstallScannerPage() {
  const { ready, quizzes, configurators } = useStore();
  const [appOrigin, setAppOrigin] = useState("https://your-sellentum-app.vercel.app");
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<StorefrontInstallScanReport | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proofCopied, setProofCopied] = useState(false);
  const publishedFinder = useMemo(() => quizzes.find((quiz) => quiz.published) || quizzes[0], [quizzes]);
  const publishedConfigurator = useMemo(() => configurators.find((configurator) => configurator.published) || configurators[0], [configurators]);

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  async function scan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setScanning(true);
    try {
      const response = await fetch("/api/storefront/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, appOrigin }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not scan storefront.");
      setReport(payload as StorefrontInstallScanReport);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Could not scan storefront.");
    } finally {
      setScanning(false);
    }
  }

  async function copyPacket() {
    if (!report) return;
    await navigator.clipboard.writeText(report.packet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function copyProofPacket() {
    await navigator.clipboard.writeText(buildStorefrontProofPacket({
      storefrontUrl: url,
      appOrigin,
      experienceId: publishedFinder?.id || publishedConfigurator?.id,
    }));
    setProofCopied(true);
    window.setTimeout(() => setProofCopied(false), 1600);
  }

  if (!ready) return <LoadingState label="Preparing storefront install scanner…" />;

  return (
    <div className="animate-rise">
      <section className="rounded-[32px] bg-ink p-8 text-white">
        <div className="flex items-start justify-between gap-10">
          <div className="max-w-4xl">
            <p className="eyebrow text-lime">Storefront Install Scanner</p>
            <h1 className="display mt-3 text-5xl">Scan a storefront page for the Sellentum widget before launch.</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-white/45">Paste a staging or production storefront URL. Sellentum fetches the page HTML, checks for the widget script, validates data attributes, compares app origins and produces install QA evidence.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/widget-studio" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><Code2 size={14} /> Widget Studio</Link>
              <Link href="/dashboard/storefront-sandbox" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><MonitorCheck size={14} /> QA Sandbox</Link>
              <button onClick={copyProofPacket} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/15"><Clipboard size={14} /> {proofCopied ? "Proof copied" : "Copy proof packet"}</button>
              {report && <button onClick={copyPacket} className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 text-sm font-extrabold text-ink"><Clipboard size={14} /> {copied ? "Scan copied" : "Copy scan packet"}</button>}
            </div>
          </div>
          <div className="w-[370px] shrink-0 rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-ink"><Search size={22} /></span>
              <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", report ? statusTone[report.status] : "bg-white/10 text-white/45")}>{report?.status || "not scanned"}</span>
            </div>
            <p className="display mt-8 text-6xl">{report ? `${report.score}%` : "—"}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/45">{report ? `${report.summary.sellentumScripts} widget script${report.summary.sellentumScripts === 1 ? "" : "s"} · ${report.summary.blockers} blockers · ${report.summary.warnings} warnings.` : "Run a scan after installing the snippet on a staging storefront page."}</p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Scan target</h2><p className="mt-1 text-sm text-black/45">Use a public staging or production page. Localhost/private network URLs are intentionally blocked.</p></div><Globe2 className="text-moss" size={18} /></div>
          <form onSubmit={scan} className="mt-5 space-y-4">
            <div>
              <label className="label">Storefront URL</label>
              <input className="field" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://store.example.com/products/trail-runner" type="url" required />
            </div>
            <div>
              <label className="label">Expected Sellentum app origin</label>
              <input className="field" value={appOrigin} onChange={(event) => setAppOrigin(event.target.value)} placeholder="https://your-sellentum-app.vercel.app" type="url" />
            </div>
            <button disabled={scanning} className="btn-primary w-full">{scanning ? <LoaderCircle className="animate-spin" size={15} /> : <Search size={15} />} {scanning ? "Scanning storefront…" : "Scan storefront install"}</button>
            {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold leading-5 text-red-700">{error}</p>}
          </form>

          <div className="mt-6 rounded-2xl bg-canvas p-5">
            <h3 className="text-sm font-extrabold">Suggested staging targets</h3>
            <p className="mt-2 text-sm leading-5 text-black/45">Publish a finder/configurator, paste the widget snippet into a public staging page, then scan that page here.</p>
            <div className="mt-4 grid gap-2">
              {publishedFinder && <Link href={`/finder/${publishedFinder.id}`} target="_blank" className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-extrabold text-black/45">Finder preview <ExternalLink size={12} /></Link>}
              {publishedConfigurator && <Link href={`/configurator/${publishedConfigurator.id}`} target="_blank" className="flex items-center justify-between rounded-xl bg-white px-3 py-3 text-xs font-extrabold text-black/45">Configurator preview <ExternalLink size={12} /></Link>}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Install checks</h2><p className="mt-1 text-sm text-black/45">Evidence from the latest scan.</p></div><ShieldCheck className="text-moss" size={18} /></div>
          {report ? (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.checks.map((check) => (
                <article key={check.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", checkTone[check.status])}><CheckIcon status={check.status} /></span>
                    <div>
                      <h3 className="text-sm font-extrabold">{check.label}</h3>
                      <p className="mt-1 text-sm leading-5 text-black/50">{check.detail}</p>
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-black/40">{check.evidence}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-black/10 p-12 text-center">
              <Search className="mx-auto text-black/25" size={28} />
              <p className="mt-4 text-sm font-extrabold">No scan yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-black/45">Scan a storefront URL to validate script install, experience ID, embed mode, attribution labels and production origin.</p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[28px] border border-black/[0.07] bg-white p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-sm font-extrabold">Storefront proof handoff</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-black/45">Use this checklist to prove the widget on a real or staging storefront after the script scan passes. It captures the exact evidence needed before Sellentum can call the embed production-proven.</p>
          </div>
          <button onClick={copyProofPacket} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-5 py-3 text-xs font-extrabold text-white"><Clipboard size={14} /> {proofCopied ? "Proof copied" : "Copy proof packet"}</button>
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          {storefrontProofSteps.map((step, index) => (
            <article key={step.id} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-xs font-extrabold text-ink">{index + 1}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-extrabold uppercase text-black/35">{step.owner}</span>
              </div>
              <h3 className="mt-4 text-sm font-extrabold leading-5">{step.label}</h3>
              <p className="mt-2 text-xs leading-4 text-black/45">{step.detail}</p>
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-4 text-black/35">{step.evidence}</p>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-ink p-5 text-white">
          <h3 className="text-sm font-extrabold">Launch-critical analytics events</h3>
          <div className="mt-4 grid gap-2 xl:grid-cols-5">
            {storefrontProofEvents.map((event) => (
              <div key={event.event} className="rounded-2xl bg-white/[0.06] p-3">
                <code className="text-xs font-extrabold text-lime">{event.event}</code>
                <p className="mt-2 text-xs leading-4 text-white/40">{event.proof}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {report && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Detected snippets</h2><p className="mt-1 text-sm text-black/45">Sellentum scripts discovered in the scanned HTML.</p></div><Code2 className="text-moss" size={18} /></div>
            <div className="mt-5 space-y-3">
              {report.snippets.map((snippet, index) => (
                <article key={`${snippet.scriptSrc}-${index}`} className="rounded-2xl border border-black/[0.07] bg-canvas p-4">
                  <code className="block break-all rounded-xl bg-white px-3 py-2 text-xs font-bold text-moss">{snippet.scriptSrc}</code>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[snippet.experience, snippet.mode, snippet.id, snippet.source, snippet.campaign, snippet.placement].filter(Boolean).map((item) => <span key={String(item)} className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-black/45">{String(item)}</span>)}
                  </div>
                </article>
              ))}
              {!report.snippets.length && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">No Sellentum widget snippets were detected.</p>}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Recommended next tasks</h2><p className="mt-1 text-sm text-black/45">What to do before calling the storefront install verified.</p></div><Wrench className="text-moss" size={18} /></div>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {report.recommendations.map((item, index) => (
                <p key={item} className="flex gap-3 rounded-2xl bg-canvas p-4 text-sm font-bold leading-5 text-black/50"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-lime text-xs font-extrabold text-ink">{index + 1}</span>{item}</p>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-ink p-5 text-white">
              <h3 className="flex items-center gap-2 text-sm font-extrabold"><MousePointerClick size={16} className="text-lime" /> After scan passes</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-white/45">Complete a real shopper QA session and confirm widget_view, quiz_start, quiz_complete, product_recommended and buy_click events in Analytics with source/campaign/placement labels.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
