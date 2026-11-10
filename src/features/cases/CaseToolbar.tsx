import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { cx } from "@/ui";
import type { BoxType } from "./AnnotationCanvas";
import type { SaveStatus } from "./useAutosave";

export interface CaseToolbarProps {
  showPathologies: boolean;
  showTeeth: boolean;
  onTogglePathologies: () => void;
  onToggleTeeth: () => void;
  canEdit: boolean;
  drawTool: BoxType | null;
  onDrawTool: (t: BoxType | null) => void;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
}

function Toggle({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-ink hover:bg-page",
      )}
    >
      {children}
    </button>
  );
}

const Dot = ({ className }: { className: string }) => <span aria-hidden className={cx("h-2 w-2 rounded-sm", className)} />;

export function CaseToolbar(p: CaseToolbarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <Toggle on={p.showPathologies} onClick={p.onTogglePathologies}>
        <Dot className="bg-annot-pathology" />
        Findings
      </Toggle>
      <Toggle on={p.showTeeth} onClick={p.onToggleTeeth}>
        <Dot className="bg-annot-tooth" />
        Teeth
      </Toggle>
      {p.canEdit && (
        <>
          <span aria-hidden className="mx-1.5 h-5 w-px bg-line" />
          <Toggle on={p.drawTool === "pathology"} onClick={() => p.onDrawTool(p.drawTool === "pathology" ? null : "pathology")}>
            <Plus size={14} aria-hidden />
            Finding box
          </Toggle>
          <Toggle on={p.drawTool === "teeth"} onClick={() => p.onDrawTool(p.drawTool === "teeth" ? null : "teeth")}>
            <Plus size={14} aria-hidden />
            Tooth box
          </Toggle>
        </>
      )}
      <span className="ml-auto text-sm text-muted" aria-live="polite">
        {p.drawTool ? (
          "Drag on the X-ray to draw a box"
        ) : p.saveStatus === "saving" ? (
          "Saving…"
        ) : p.saveStatus === "saved" ? (
          "Saved"
        ) : p.saveStatus === "error" ? (
          <span className="text-danger">
            Couldn't save.{" "}
            <button type="button" onClick={p.onRetrySave} className="font-medium underline underline-offset-2">
              Retry
            </button>
          </span>
        ) : null}
      </span>
    </div>
  );
}
