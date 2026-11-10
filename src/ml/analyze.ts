import type { Detections } from "@/types/domain";
import { detect } from "./detect";
import { loadModels } from "./models";
import { segment } from "./segment";

/** Runs both models on a loaded X-ray. Boxes are in the image's original pixels. */
export async function analyzeXRay(img: HTMLImageElement): Promise<{ pathologies: Detections; teeth: Detections }> {
  const models = await loadModels();
  const pathologies = await detect(img, models.detect);
  const teeth = await segment(img, models.segment);
  return { pathologies, teeth };
}
