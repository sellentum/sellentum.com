"use client";

import { useState } from "react";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecommendationFeedbackSentiment = "positive" | "negative";

type RecommendationFeedbackProps = {
  productId: string;
  productName: string;
  compact?: boolean;
  onFeedback: (sentiment: RecommendationFeedbackSentiment, reason: string) => Promise<void> | void;
};

const options: Array<{ sentiment: RecommendationFeedbackSentiment; reason: string; label: string; icon: typeof ThumbsUp }> = [
  { sentiment: "positive", reason: "helpful_match", label: "Helpful", icon: ThumbsUp },
  { sentiment: "negative", reason: "not_right", label: "Not right", icon: ThumbsDown },
];

export function RecommendationFeedback({ productId, productName, compact = false, onFeedback }: RecommendationFeedbackProps) {
  const [selected, setSelected] = useState<RecommendationFeedbackSentiment | null>(null);
  const [saving, setSaving] = useState(false);

  async function send(sentiment: RecommendationFeedbackSentiment, reason: string) {
    if (saving) return;
    setSaving(true);
    setSelected(sentiment);
    try {
      await onFeedback(sentiment, reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-black/[0.06] bg-white p-3", compact && "p-2.5")} data-feedback-product={productId}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-xs font-extrabold uppercase tracking-wider text-black/30", compact && "text-xs")}>Was this match useful?</p>
        {selected && <span className="inline-flex items-center gap-1 rounded-full bg-lime/35 px-2 py-1 text-xs font-extrabold text-moss"><Check size={10} /> Saved</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {options.map(({ sentiment, reason, label, icon: Icon }) => {
          const active = selected === sentiment;
          return (
            <button
              key={`${productId}-${sentiment}`}
              type="button"
              disabled={saving}
              onClick={() => send(sentiment, reason)}
              aria-label={`${label}: ${productName}`}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-extrabold transition disabled:opacity-60",
                active ? "border-ink bg-ink text-white" : "border-black/10 bg-canvas text-black/45 hover:border-moss/30 hover:text-moss",
              )}
            >
              <Icon size={11} className={active ? "text-lime" : ""} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
