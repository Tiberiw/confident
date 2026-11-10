import { useEffect, useId, useState } from "react";
import { isTreatment, PATHOLOGY_LABELS, TOOTH_LABELS } from "@/lib/teeth-mapping";
import { Button, controlClass, cx, Dialog } from "@/ui";
import type { BoxType } from "./AnnotationCanvas";

export interface LabelDialogProps {
  open: boolean;
  type: BoxType;
  /** Selectable tooth classes (ignored for pathologies). */
  toothClasses?: number[];
  initial?: number;
  title: string;
  confirmLabel: string;
  onConfirm: (cls: number) => void;
  onClose: () => void;
}

const pathologyClasses = PATHOLOGY_LABELS.map((_, i) => i).filter((i) => !isTreatment(i));
const treatmentClasses = PATHOLOGY_LABELS.map((_, i) => i).filter((i) => isTreatment(i));

export function LabelDialog({ open, type, toothClasses = [], initial, title, confirmLabel, onConfirm, onClose }: LabelDialogProps) {
  const id = useId();
  const options = type === "pathology" ? [...pathologyClasses, ...treatmentClasses] : toothClasses;
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (open) setValue(initial !== undefined && options.includes(initial) ? initial : (options[0] ?? null));
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const noTeethLeft = type === "teeth" && options.length === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => value !== null && onConfirm(value)} disabled={value === null}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {noTeethLeft ? (
        <p className="text-muted">All teeth are already labeled.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-label font-medium text-muted">
            {type === "pathology" ? "Finding" : "Tooth (FDI)"}
          </label>
          <select
            id={id}
            className={cx(controlClass, "h-9")}
            value={value ?? ""}
            onChange={(e) => setValue(Number(e.target.value))}
          >
            {type === "pathology" ? (
              <>
                <optgroup label="Pathologies">
                  {pathologyClasses.map((c) => (
                    <option key={c} value={c}>
                      {PATHOLOGY_LABELS[c]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Treatments">
                  {treatmentClasses.map((c) => (
                    <option key={c} value={c}>
                      {PATHOLOGY_LABELS[c]}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              options.map((c) => (
                <option key={c} value={c}>
                  {TOOTH_LABELS[c]}
                </option>
              ))
            )}
          </select>
        </div>
      )}
    </Dialog>
  );
}
