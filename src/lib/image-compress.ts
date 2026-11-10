const QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];
const MIN_SIDE = 600;

/** Size that fits inside maxSide × maxSide, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxSide = 1600) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}

/** Decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return (b64.length * 3) / 4 - padding;
}

/**
 * Re-encodes an image as JPEG small enough for a Firestore document.
 * `scale` is the factor between the original and the stored image, used to scale AI boxes.
 */
export async function compressImage(
  img: HTMLImageElement,
  opts: { maxSide?: number; maxBytes?: number } = {},
): Promise<{ dataUrl: string; width: number; height: number; scale: number }> {
  const maxBytes = opts.maxBytes ?? 700 * 1024;
  let maxSide = opts.maxSide ?? 1600;
  const canvas = document.createElement("canvas");

  while (maxSide >= MIN_SIDE) {
    const size = fitWithin(img.naturalWidth, img.naturalHeight, maxSide);
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser");
    ctx.drawImage(img, 0, 0, size.width, size.height);

    for (const q of QUALITIES) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      if (dataUrlBytes(dataUrl) <= maxBytes) return { dataUrl, ...size };
    }
    maxSide *= 0.8;
  }
  throw new Error("Image too large to store");
}
