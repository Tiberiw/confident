import * as tf from "@tensorflow/tfjs";

export type LoadedModel = { net: tf.GraphModel; inputShape: number[]; outputShape?: number[][] };
export type Models = { detect: LoadedModel; segment: LoadedModel };
export type ModelStage = "detect" | "segment";
export type LoadProgress = { stage: ModelStage; fraction: number };

const URLS: Record<ModelStage, string> = {
  detect: "/models/detect/model.json",
  segment: "/models/segment/model.json",
};

let cached: Promise<Models> | null = null;
let lastProgress: LoadProgress | null = null;
const listeners = new Set<(p: LoadProgress) => void>();

const report = (p: LoadProgress) => {
  lastProgress = p;
  listeners.forEach((l) => l(p));
};

async function loadOne(stage: ModelStage): Promise<LoadedModel> {
  report({ stage, fraction: 0 });
  const net = await tf.loadGraphModel(URLS[stage], { onProgress: (fraction) => report({ stage, fraction }) });
  const inputShape = net.inputs[0].shape as number[];

  // Warm up once so the first real X-ray isn't slow, and record the output shapes.
  const dummy = tf.ones(inputShape);
  const out = net.execute(dummy) as tf.Tensor | tf.Tensor[];
  const outputs = Array.isArray(out) ? out : [out];
  const outputShape = outputs.map((t) => t.shape as number[]);
  tf.dispose([dummy, ...outputs]);
  report({ stage, fraction: 1 });
  return { net, inputShape, outputShape };
}

async function loadAll(): Promise<Models> {
  if (tf.getBackend() !== "webgl") await tf.setBackend("webgl").catch(() => false);
  await tf.ready();
  const detect = await loadOne("detect");
  const segment = await loadOne("segment");
  return { detect, segment };
}

/**
 * Loads both models once per page session (~22 MB, cached by the browser afterwards).
 * Parallel callers share one load; a failed load is forgotten so the next call retries.
 */
export function loadModels(onProgress?: (p: LoadProgress) => void): Promise<Models> {
  if (onProgress) {
    listeners.add(onProgress);
    if (lastProgress && cached) onProgress(lastProgress);
  }
  if (!cached) {
    lastProgress = null;
    cached = loadAll().catch((e) => {
      cached = null;
      throw e;
    });
  }
  const current = cached;
  return current.finally(() => {
    if (onProgress) listeners.delete(onProgress);
  });
}

export function resetModelsForTests() {
  cached = null;
  lastProgress = null;
  listeners.clear();
}
