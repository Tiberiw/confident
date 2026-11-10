import type { BoxType, Selection } from "./AnnotationCanvas";
import { TOOTH_LABELS } from "@/lib/teeth-mapping";
import type { Box, Detections } from "@/types/domain";

/** Adds a manually drawn box (score 1). */
export function addBox(d: Detections, box: Box, cls: number): Detections {
  return { boxes: [...d.boxes, box], scores: [...d.scores, 1], classes: [...d.classes, cls] };
}

export function removeBox(d: Detections, index: number): Detections {
  const keep = (_: unknown, i: number) => i !== index;
  return { boxes: d.boxes.filter(keep), scores: d.scores.filter(keep), classes: d.classes.filter(keep) };
}

export function relabelBox(d: Detections, index: number, cls: number): Detections {
  return { ...d, classes: d.classes.map((c, i) => (i === index ? cls : c)) };
}

/** Tooth classes not used by another box. The box being edited keeps its own class available. */
export function availableToothClasses(teeth: Detections, editingIndex?: number): number[] {
  const used = new Set(teeth.classes.filter((_, i) => i !== editingIndex));
  return TOOTH_LABELS.map((_, cls) => cls).filter((cls) => !used.has(cls));
}

/** Which boxes of one layer to draw: all of them when the layer is on, otherwise only the selected one. */
export function visibleBoxIndexes(count: number, type: BoxType, layerOn: boolean, selected: Selection | null): number[] {
  if (layerOn) return Array.from({ length: count }, (_, i) => i);
  return selected?.type === type && selected.index < count ? [selected.index] : [];
}
