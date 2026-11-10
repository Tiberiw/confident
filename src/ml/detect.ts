import * as tf from "@tensorflow/tfjs";
import type { Box, Detections } from "@/types/domain";
import labels from "./labels/pathologies.json";
import type { LoadedModel } from "./models";

const NUM_CLASSES = labels.length;
const MAX_BOXES = 1000;
const IOU_THRESHOLD = 0.5;
const SCORE_THRESHOLD = 0.25;

/** Pads the image to a square (bottom/right), resizes to the model input and normalises to 0..1. */
export function toModelInput(img: HTMLImageElement, width: number, height: number): tf.Tensor4D {
  return tf.tidy(() => {
    const pixels = tf.browser.fromPixels(img);
    const [h, w] = pixels.shape;
    const side = Math.max(w, h);
    const padded = pixels.pad([
      [0, side - h],
      [0, side - w],
      [0, 0],
    ]) as tf.Tensor3D;
    return tf.image.resizeBilinear(padded, [height, width]).div(255).expandDims(0) as tf.Tensor4D;
  });
}

/** Pathology / treatment detection. Boxes are returned in original image pixels. */
export async function detect(img: HTMLImageElement, model: LoadedModel): Promise<Detections> {
  const [, modelHeight, modelWidth] = model.inputShape;
  const input = toModelInput(img, modelWidth, modelHeight);
  const res = model.net.execute(input) as tf.Tensor3D;

  const [boxes, scores, classes] = tf.tidy(() => {
    const t = res.transpose([0, 2, 1]); // [1, anchors, 4 + classes]
    const w = t.slice([0, 0, 2], [-1, -1, 1]);
    const h = t.slice([0, 0, 3], [-1, -1, 1]);
    const x1 = tf.sub(t.slice([0, 0, 0], [-1, -1, 1]), tf.div(w, 2));
    const y1 = tf.sub(t.slice([0, 0, 1], [-1, -1, 1]), tf.div(h, 2));
    const b = tf.concat([y1, x1, tf.add(y1, h), tf.add(x1, w)], 2).squeeze<tf.Tensor2D>([0]);
    const raw = t.slice([0, 0, 4], [-1, -1, NUM_CLASSES]).squeeze<tf.Tensor2D>([0]);
    return [b, raw.max(1) as tf.Tensor1D, raw.argMax(1) as tf.Tensor1D];
  });

  try {
    const keep = await tf.image.nonMaxSuppressionAsync(boxes, scores, MAX_BOXES, IOU_THRESHOLD, SCORE_THRESHOLD);
    const [b, s, c] = [boxes.gather(keep), scores.gather(keep), classes.gather(keep)];
    const [boxData, scoreData, classData] = await Promise.all([b.array(), s.array(), c.array()]);
    tf.dispose([keep, b, s, c]);

    const scale = Math.max(img.naturalWidth, img.naturalHeight) / modelWidth;
    return {
      boxes: (boxData as number[][]).map((box) => box.map((v) => v * scale) as Box),
      scores: scoreData as number[],
      classes: classData as number[],
    };
  } finally {
    tf.dispose([input, res, boxes, scores, classes]);
  }
}
