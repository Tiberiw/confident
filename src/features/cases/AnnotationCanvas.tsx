import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { loadImage } from "@/lib/image-file";
import { normalizeBox } from "@/lib/geometry";
import { PATHOLOGY_LABELS, toothLabel } from "@/lib/teeth-mapping";
import type { Box, Detections } from "@/types/domain";
import { tokens } from "@/ui";
import { visibleBoxIndexes } from "./annotations";

export type BoxType = "pathology" | "teeth";
export type Selection = { type: BoxType; index: number };

export interface AnnotationCanvasProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  pathologies: Detections;
  teeth: Detections;
  showPathologies: boolean;
  showTeeth: boolean;
  selected?: Selection | null;
  onSelect?: (s: Selection | null) => void;
  onEditRequest?: (s: Selection) => void;
  drawTool?: BoxType | null;
  onDrawBox?: (box: Box, type: BoxType) => void;
  readOnly?: boolean;
  /** Largest display height in CSS pixels. */
  maxHeight?: number;
}

type Point = { x: number; y: number };
const MIN_DRAW_PX = 6;
const LABEL_FONT = "500 11px 'Inter Variable', Inter, system-ui, sans-serif";

/** Shows an X-ray with AI boxes. Boxes are in image pixels and scaled to the displayed size. */
export function AnnotationCanvas({
  imageSrc,
  imageWidth,
  imageHeight,
  pathologies,
  teeth,
  showPathologies,
  showTeeth,
  selected = null,
  onSelect,
  onEditRequest,
  drawTool = null,
  onDrawBox,
  readOnly = false,
  maxHeight = 640,
}: AnnotationCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    let current = true;
    loadImage(imageSrc).then(
      (img) => current && setImage(img),
      () => current && setImage(null),
    );
    return () => {
      current = false;
    };
  }, [imageSrc]);

  // Fit the image to the container width, capped at maxHeight.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !imageWidth || !imageHeight) return;
    const fit = () => {
      const ratio = imageWidth / imageHeight;
      let width = el.clientWidth;
      let height = width / ratio;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageWidth, imageHeight, maxHeight]);

  const scale = size.width && imageWidth ? size.width / imageWidth : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, size.width, size.height);
    if (image) ctx.drawImage(image, 0, 0, size.width, size.height);

    const drawSet = (d: Detections, type: BoxType, layerOn: boolean, color: string, labelOf: (cls: number) => string) => {
      visibleBoxIndexes(d.boxes.length, type, layerOn, selected).forEach((i) => {
        const box = d.boxes[i];
        const isSelected = selected?.type === type && selected.index === i;
        const [y1, x1, y2, x2] = box.map((v) => v * scale);
        if (isSelected) {
          ctx.lineWidth = 5;
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = color;
        ctx.globalAlpha = selected && !isSelected ? 0.75 : 1;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        const label = labelOf(d.classes[i]);
        ctx.font = LABEL_FONT;
        const w = ctx.measureText(label).width + 8;
        const top = y1 >= 16 ? y1 - 16 : y1;
        ctx.fillStyle = color;
        ctx.fillRect(x1 - 0.75, top, w, 16);
        ctx.fillStyle = tokens.surface;
        ctx.textBaseline = "middle";
        ctx.fillText(label, x1 + 3.25, top + 8.5);
        ctx.globalAlpha = 1;
      });
    };
    // Teeth first so pathology boxes sit on top.
    drawSet(teeth, "teeth", showTeeth, tokens.annotTooth, toothLabel);
    drawSet(pathologies, "pathology", showPathologies, tokens.annotPathology, (c) => PATHOLOGY_LABELS[c] ?? "?");

    if (draft) {
      const color = drawTool === "teeth" ? tokens.annotTooth : tokens.annotPathology;
      const [y1, x1, y2, x2] = normalizeBox(draft.start.y, draft.start.x, draft.end.y, draft.end.x);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);
    }
  }, [image, size, scale, pathologies, teeth, showPathologies, showTeeth, selected, draft, drawTool]);

  const pointAt = (e: ReactPointerEvent | ReactMouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** The smallest drawn box under the point; pathologies win over teeth. */
  const hitTest = (p: Point): Selection | null => {
    const find = (d: Detections, type: BoxType, layerOn: boolean): Selection | null => {
      let best: Selection | null = null;
      let bestArea = Infinity;
      visibleBoxIndexes(d.boxes.length, type, layerOn, selected).forEach((index) => {
        const [y1, x1, y2, x2] = d.boxes[index];
        const [sy1, sx1, sy2, sx2] = [y1 * scale, x1 * scale, y2 * scale, x2 * scale];
        if (p.x >= sx1 && p.x <= sx2 && p.y >= sy1 && p.y <= sy2) {
          const area = (sx2 - sx1) * (sy2 - sy1);
          if (area < bestArea) {
            bestArea = area;
            best = { type, index };
          }
        }
      });
      return best;
    };
    return find(pathologies, "pathology", showPathologies) ?? find(teeth, "teeth", showTeeth);
  };

  const interactive = !readOnly;

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !drawTool || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointAt(e);
    onSelect?.(null);
    setDraft({ start: p, end: p });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (draft) {
      const p = pointAt(e);
      setDraft({ start: draft.start, end: { x: Math.max(0, Math.min(size.width, p.x)), y: Math.max(0, Math.min(size.height, p.y)) } });
    } else if (interactive && !drawTool) {
      setHovering(hitTest(pointAt(e)) !== null);
    }
  };

  const onPointerUp = () => {
    if (!draft) return;
    const { start, end } = draft;
    setDraft(null);
    if (Math.abs(end.x - start.x) < MIN_DRAW_PX || Math.abs(end.y - start.y) < MIN_DRAW_PX || !scale) return;
    const box = normalizeBox(start.y / scale, start.x / scale, end.y / scale, end.x / scale);
    onDrawBox?.(box, drawTool!);
  };

  const onClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!interactive || drawTool) return;
    const hit = hitTest(pointAt(e));
    onSelect?.(hit && selected && hit.type === selected.type && hit.index === selected.index ? null : hit);
  };

  const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!interactive || drawTool) return;
    const hit = hitTest(pointAt(e));
    if (hit) onEditRequest?.(hit);
  };

  const cursor = drawTool && interactive ? "crosshair" : hovering ? "pointer" : "default";

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Panoramic X-ray with ${pathologies.boxes.length} findings and ${teeth.boxes.length} teeth marked`}
        style={{ width: size.width || "100%", height: size.height || 240, cursor, touchAction: drawTool ? "none" : "auto" }}
        className="mx-auto block rounded-sm bg-black"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDraft(null)}
        onPointerLeave={() => setHovering(false)}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}
