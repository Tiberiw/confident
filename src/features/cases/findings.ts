import { assignTooth, isTreatment, PATHOLOGY_LABELS, toothLabel } from "@/lib/teeth-mapping";
import type { Detections } from "@/types/domain";

export type FindingRow = { index: number; label: string; tooth: string | null; score: number; treatment: boolean };
export type ToothRow = { index: number; label: string; score: number };

const toothOrder = (tooth: string | null) => (tooth === null ? Infinity : parseFloat(tooth));

/** Pathologies first, then treatments; each group ordered by FDI tooth, unassigned last. */
export function buildFindingRows(pathologies: Detections, teeth: Detections): FindingRow[] {
  return pathologies.boxes
    .map((box, index) => ({
      index,
      label: PATHOLOGY_LABELS[pathologies.classes[index]] ?? "Unknown",
      tooth: assignTooth(box, teeth),
      score: pathologies.scores[index] ?? 0,
      treatment: isTreatment(pathologies.classes[index]),
    }))
    .sort(
      (a, b) =>
        Number(a.treatment) - Number(b.treatment) || toothOrder(a.tooth) - toothOrder(b.tooth) || a.index - b.index,
    );
}

/** Teeth in chart order (1.8 … 4.8, as TOOTH_LABELS), unnumbered extras last. */
export function buildToothRows(teeth: Detections): ToothRow[] {
  return teeth.boxes
    .map((_, index) => ({ index, cls: teeth.classes[index], score: teeth.scores[index] ?? 0 }))
    .sort((a, b) => Number(a.cls < 0) - Number(b.cls < 0) || a.cls - b.cls || a.index - b.index)
    .map(({ index, cls, score }) => ({ index, label: toothLabel(cls), score }));
}
