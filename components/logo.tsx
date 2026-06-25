import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 font-extrabold tracking-[-0.03em]" aria-label="Findly home">
      <span className={`grid h-8 w-8 place-items-center rounded-[11px] ${light ? "bg-lime text-ink" : "bg-ink text-lime"}`}><Sparkles size={16} strokeWidth={2.4} /></span>
      <span className={light ? "text-white" : "text-ink"}>findly</span>
    </Link>
  );
}
