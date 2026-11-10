import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./cx";

export type AlertTone = "success" | "error" | "info";

const tones: Record<AlertTone, string> = {
  success: "border-brand/25 bg-brand-soft text-brand-ink",
  error: "border-danger/25 bg-danger-soft text-danger",
  info: "border-line bg-page text-ink",
};

export function Alert({ tone, children, onClose }: { tone: AlertTone; children: ReactNode; onClose?: () => void }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex items-start gap-3 rounded border px-3.5 py-2.5 text-base", tones[tone])}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="rounded p-0.5 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
