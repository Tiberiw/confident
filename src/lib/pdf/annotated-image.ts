import { loadImage } from "@/lib/image-file";
import { PATHOLOGY_LABELS } from "@/lib/teeth-mapping";
import type { Detections, XRay } from "@/types/domain";
import { tokens } from "@/ui/tokens";

/** The X-ray with pathology boxes and labels burned in, as a JPEG data URL. */
export async function renderAnnotatedImage(xray: XRay, pathologies: Detections): Promise<string> {
  const img = await loadImage(xray.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(img, 0, 0);

  // Box coordinates are in stored-image pixels; scale in case the doc sizes differ.
  const scale = xray.width ? img.naturalWidth / xray.width : 1;
  const line = Math.max(2, img.naturalWidth / 500);
  const fontSize = Math.max(14, Math.round(img.naturalWidth / 70));
  ctx.font = `600 ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "middle";

  pathologies.boxes.forEach((box, i) => {
    const [y1, x1, y2, x2] = box.map((v) => v * scale);
    ctx.strokeStyle = tokens.annotPathology;
    ctx.lineWidth = line;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    const label = PATHOLOGY_LABELS[pathologies.classes[i]] ?? "?";
    const pad = fontSize * 0.3;
    const w = ctx.measureText(label).width + pad * 2;
    const h = fontSize + pad * 2;
    const top = y1 >= h ? y1 - h : y1;
    ctx.fillStyle = tokens.annotPathology;
    ctx.fillRect(x1 - line / 2, top, w, h);
    ctx.fillStyle = tokens.surface;
    ctx.fillText(label, x1 - line / 2 + pad, top + h / 2);
  });

  return canvas.toDataURL("image/jpeg", 0.9);
}
