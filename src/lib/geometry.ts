import type { Box } from "@/types/domain";

/** Intersection over union of two [y1, x1, y2, x2] boxes. */
export function iou(a: Box, b: Box): number {
  const [ay1, ax1, ay2, ax2] = a;
  const [by1, bx1, by2, bx2] = b;
  const w = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const h = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = w * h;
  const union = (ax2 - ax1) * (ay2 - ay1) + (bx2 - bx1) * (by2 - by1) - inter;
  return union > 0 ? inter / union : 0;
}

export function scaleBoxes(boxes: Box[], factor: number): Box[] {
  return boxes.map((b) => b.map((v) => v * factor) as Box);
}

/** Builds a box from two corners in any order. */
export function normalizeBox(y1: number, x1: number, y2: number, x2: number): Box {
  return [Math.min(y1, y2), Math.min(x1, x2), Math.max(y1, y2), Math.max(x1, x2)];
}
