"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({ open, onClose, title, description, children, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6"><button className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-label="Close modal" /><div role="dialog" aria-modal="true" aria-label={title} className={`relative max-h-[94vh] w-full ${width} overflow-y-auto rounded-[24px] bg-white shadow-2xl`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-black/[0.07] bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><div><h2 className="text-base font-extrabold">{title}</h2>{description && <p className="mt-1 text-xs text-black/40">{description}</p>}</div><button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/45"><X size={16} /></button></div>{children}</div></div>;
}
