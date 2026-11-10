import { cx } from "@/ui";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("font-semibold tracking-[-0.01em] text-ink", className ?? "text-section")}>
      Confi<span className="text-brand">dent</span>
    </span>
  );
}
