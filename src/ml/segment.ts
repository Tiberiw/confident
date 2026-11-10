import * as tf from "@tensorflow/tfjs";
import type { Box, Detections } from "@/types/domain";
import labels from "./labels/teeth.json";
import { toModelInput } from "./detect";
import type { LoadedModel } from "./models";
import { numberTeeth } from "./tooth-numbering";

const NUM_CLASSES = labels.length;
const MAX_BOXES = 500;
const IOU_THRESHOLD = 0.45;
const SCORE_THRESHOLD = 0.2;

/** Tooth segmentation (boxes only; masks are not used). Boxes are returned in original image pixels. */
export async function segment(img: HTMLImageElement, model: LoadedModel): Promise<Detections> {
  const [, modelHeight, modelWidth] = model.inputShape;
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const side = Math.max(width, height);
  const scaleX = side / modelWidth;
  const scaleY = side / modelHeight;

  const input = toModelInput(img, modelWidth, modelHeight);
  const out = model.net.execute(input) as tf.Tensor[];
  // The detection head is the rank-3 output; the other one holds mask prototypes.
  const head = (Array.isArray(out) ? out : [out]).find((t) => t.rank === 3) as tf.Tensor3D;

  const [boxes, scores, classes] = tf.tidy(() => {
    const t = head.transpose([0, 2, 1]).squeeze<tf.Tensor2D>([0]); // [anchors, 4 + classes + masks]
    const xc = t.slice([0, 0], [-1, 1]);
    const yc = t.slice([0, 1], [-1, 1]);
    const w = t.slice([0, 2], [-1, 1]);
    const h = t.slice([0, 3], [-1, 1]);
    const b = tf.concat(
      [tf.sub(yc, tf.div(h, 2)), tf.sub(xc, tf.div(w, 2)), tf.add(yc, tf.div(h, 2)), tf.add(xc, tf.div(w, 2))],
      1,
    ) as tf.Tensor2D;
    const raw = t.slice([0, 4], [-1, NUM_CLASSES]);
    return [b, raw.max(1) as tf.Tensor1D, raw.argMax(1) as tf.Tensor1D];
  });

  try {
    const keep = await tf.image.nonMaxSuppressionAsync(boxes, scores, MAX_BOXES, IOU_THRESHOLD, SCORE_THRESHOLD);
    const [b, s, c] = [boxes.gather(keep), scores.gather(keep), classes.gather(keep)];
    const [boxData, scoreData, classData] = (await Promise.all([b.array(), s.array(), c.array()])) as [
      number[][],
      number[],
      number[],
    ];
    tf.dispose([keep, b, s, c]);

    const toothBoxes: Box[] = boxData.map(([y1, x1, y2, x2]) => [
      Math.max(0, Math.floor(y1 * scaleY)),
      Math.max(0, Math.floor(x1 * scaleX)),
      Math.min(height, Math.ceil(y2 * scaleY)),
      Math.min(width, Math.ceil(x2 * scaleX)),
    ]);
    const toothClasses = numberTeeth(
      toothBoxes.map((box, i) => ({ xCenter: (box[1] + box[3]) / 2, modelClass: classData[i], score: scoreData[i] })),
      width,
    );

    return { boxes: toothBoxes, scores: scoreData, classes: toothClasses };
  } finally {
    tf.dispose([input, ...(Array.isArray(out) ? out : [out]), boxes, scores, classes]);
  }
}
