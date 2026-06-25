import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading your workspace…" }: { label?: string }) {
  return <div className="grid min-h-[400px] place-items-center"><div className="text-center"><LoaderCircle className="mx-auto animate-spin text-moss" /><p className="mt-3 text-xs font-bold text-black/35">{label}</p></div></div>;
}
