import type { ReactNode } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "brand" | "warn" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-page text-muted ring-1 ring-inset ring-line",
  brand: "bg-brand-soft text-brand-ink",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx("num inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}
