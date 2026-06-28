"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, ArrowRight, Check, Clipboard, DatabaseBackup, Download, FileJson, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { buildWorkspaceSnapshot, type WorkspaceExportFile, type WorkspaceSnapshotCheckStatus } from "@/lib/workspace-snapshot";

const checkTone: Record<WorkspaceSnapshotCheckStatus, string> = {
  pass: "bg-lime/35 text-moss",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-red-50 text-red-700",
};

const exportIcon: Record<WorkspaceExportFile["id"], typeof FileJson> = {
  json: FileJson,
  products: FileSpreadsheet,
  analytics: FileSpreadsheet,
  handoff: Clipboard,
};

const mimeType: Record<WorkspaceExportFile["format"], string> = {
  json: "application/json",
  csv: "text/csv",
  markdown: "text/markdown",
};

export default function WorkspaceSnapshotPage() {
  const { ready, products, quizzes, configurators, events, settings } = useStore();
  const [origin, setOrigin] = useState("https://your-findly-app.vercel.app");
  const [copied, setCopied] = useState<WorkspaceExportFile["id"] | null>(null);
  const [copyError, setCopyError] = useState("");
  const [activeExport, setActiveExport] = useState<WorkspaceExportFile["id"]>("handoff");
  const snapshot = useMemo(() => buildWorkspaceSnapshot({ origin, products, quizzes, configurators, events, settings }), [origin, products, quizzes, configurators, events, settings]);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const activeFile = snapshot.exportFiles.find((file) => file.id === activeExport) || snapshot.exportFiles[0];
  const activeText = exportText(activeExport);

  function exportText(id: WorkspaceExportFile["id"]) {
    if (id === "json") return snapshot.json;
    if (id === "products") return snapshot.productCsv;
    if (id === "analytics") return snapshot.analyticsCsv;
    return snapshot.handoff;
  }

  async function copyExport(id: WorkspaceExportFile["id"]) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(exportText(id));
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopyError("Clipboard access is blocked in this browser. Use Download instead.");
    }
  }

  function downloadExport(file: WorkspaceExportFile) {
    const blob = new Blob([exportText(file.id)], { type: `${mimeType[file.format]};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <LoadingState label="Preparing workspace snapshot…" />;

  return (
    <div className="animate-rise">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-moss">Workspace snapshot</p>
          <h1 className="display mt-2 text-5xl">Export a clean handoff of the whole Findly setup.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/45">Package products, finders, configurators, brand settings, launch channels, release gates and redacted analytics into a safe archive before production changes.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/release-center" className="btn-secondary"><ShieldCheck size={14} /> Release Center</Link>
          <button onClick={() => downloadExport(snapshot.exportFiles[0])} className="btn-primary"><Download size={14} className="text-lime" /> Download archive</button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-[28px] border border-black/[0.07] bg-ink p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime text-ink"><DatabaseBackup size={20} /></span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-extrabold uppercase", snapshot.status === "portable" ? "bg-lime text-ink" : snapshot.status === "review" ? "bg-amber-300/20 text-amber-100" : "bg-red-500/20 text-red-100")}>{snapshot.status}</span>
          </div>
          <p className="display mt-8 text-6xl">{snapshot.score}%</p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/45">{snapshot.id}</p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button onClick={() => copyExport("json")} className="rounded-2xl bg-white/[0.06] px-3 py-3 text-xs font-extrabold text-white transition hover:bg-white/[0.1]">{copied === "json" ? "JSON copied" : "Copy JSON archive"}</button>
            <button onClick={() => copyExport("handoff")} className="rounded-2xl bg-lime px-3 py-3 text-xs font-extrabold text-ink">{copied === "handoff" ? "Handoff copied" : "Copy handoff"}</button>
          </div>
          {copyError && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold leading-4 text-red-100">{copyError}</p>}
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {[
            [snapshot.summary.activeProducts, "Active products"],
            [snapshot.summary.publishedFinders, "Live finders"],
            [snapshot.summary.readyChannels, "Ready snippets"],
            [`${snapshot.summary.releaseScore}%`, "Release score"],
          ].map(([value, label]) => (
            <article key={String(label)} className="rounded-[24px] border border-black/[0.07] bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef1e8] text-moss"><Archive size={18} /></span>
              <p className="display mt-5 text-4xl">{String(value)}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-wider text-black/30">{String(label)}</p>
            </article>
          ))}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <main className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold">Export files</h2>
                <p className="mt-1 text-xs text-black/35">Choose what to copy, inspect or download for backup and storefront handoff.</p>
              </div>
              <span className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-extrabold text-black/35">{new Date(snapshot.generatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-4">
              {snapshot.exportFiles.map((file) => {
                const Icon = exportIcon[file.id];
                return (
                  <button key={file.id} onClick={() => setActiveExport(file.id)} className={cn("rounded-2xl border p-4 text-left transition hover:-translate-y-0.5", activeExport === file.id ? "border-ink bg-ink text-white shadow-sm" : "border-black/[0.07] bg-canvas text-ink")}>
                    <span className={cn("grid h-9 w-9 place-items-center rounded-xl", activeExport === file.id ? "bg-lime text-ink" : "bg-white text-moss")}><Icon size={17} /></span>
                    <h3 className="mt-4 text-xs font-extrabold">{file.label}</h3>
                    <p className={cn("mt-2 text-xs leading-4", activeExport === file.id ? "text-white/45" : "text-black/40")}>{file.description}</p>
                    <p className={cn("mt-3 text-xs font-extrabold uppercase tracking-wider", activeExport === file.id ? "text-lime" : "text-black/30")}>{file.format} · {file.bytes.toLocaleString()} chars</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#10180f]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div><p className="text-xs font-extrabold text-white">{activeFile?.filename}</p><p className="mt-0.5 text-xs font-bold text-white/35">{activeFile?.description}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => copyExport(activeExport)} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-2 text-xs font-extrabold text-white"><Clipboard size={12} /> {copied === activeExport ? "Copied" : activeExport === "products" ? "Copy product CSV" : activeExport === "analytics" ? "Copy analytics CSV" : activeExport === "json" ? "Copy JSON archive" : "Copy handoff"}</button>
                  {activeFile && <button onClick={() => downloadExport(activeFile)} className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-2 text-xs font-extrabold text-ink"><Download size={12} /> Download</button>}
                </div>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-5 text-lime/80">{activeText}</pre>
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-6">
            <h2 className="text-sm font-extrabold">Safe export checks</h2>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {snapshot.checks.map((item) => (
                <article key={item.id} className="rounded-2xl border border-black/[0.07] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-xs font-extrabold">{item.label}</h3><p className="mt-1 text-xs leading-4 text-black/40">{item.detail}</p></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", checkTone[item.status])}>{item.status}</span>
                  </div>
                  <Link href={item.href} className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-moss">{item.action} <ArrowRight size={10} /></Link>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Archive coverage</h2>
            <div className="mt-4 space-y-2">
              {snapshot.sections.map((section) => (
                <article key={section.id} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-extrabold uppercase tracking-wider text-black/30">{section.label}</p><h3 className="mt-1 text-2xl font-extrabold">{section.count}</h3></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-extrabold uppercase", checkTone[section.status])}>{section.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-4 text-black/45">{section.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-ink p-5 text-white">
            <h2 className="flex items-center gap-2 text-sm font-extrabold"><AlertTriangle size={16} className="text-lime" /> Restore plan</h2>
            <div className="mt-4 space-y-2">
              {snapshot.restorePlan.map((item, index) => (
                <p key={item} className="flex gap-3 rounded-xl bg-white/[0.06] p-3 text-xs font-bold leading-4 text-white/50"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-xs font-extrabold text-ink">{index + 1}</span>{item}</p>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-black/[0.07] bg-white p-5">
            <h2 className="text-sm font-extrabold">Privacy boundary</h2>
            <div className="mt-4 space-y-2">
              {["No Supabase keys, OpenAI keys, cookies or auth tokens are exported.", "User IDs are stripped from products, quizzes, configurators and settings.", "Analytics metadata is allowlisted so handoff notes stay useful without leaking arbitrary customer fields."].map((item) => <p key={item} className="flex gap-2 text-xs font-bold leading-4 text-black/45"><Check size={13} className="mt-0.5 shrink-0 text-moss" />{item}</p>)}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
