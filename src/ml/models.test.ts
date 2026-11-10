import * as tf from "@tensorflow/tfjs";
import { loadModels, resetModelsForTests } from "./models";

vi.mock("@tensorflow/tfjs", () => {
  const tensor = { shape: [1, 4], dispose: vi.fn() };
  return {
    ready: vi.fn(async () => {}),
    setBackend: vi.fn(async () => true),
    getBackend: vi.fn(() => "webgl"),
    ones: vi.fn(() => tensor),
    dispose: vi.fn(),
    loadGraphModel: vi.fn(),
  };
});

const fakeModel = () => ({ inputs: [{ shape: [1, 640, 640, 3] }], execute: vi.fn(() => ({ shape: [1, 4], dispose: vi.fn() })) });
const load = vi.mocked(tf.loadGraphModel);

beforeEach(() => {
  resetModelsForTests();
  load.mockReset();
});

it("loads each model once for parallel callers", async () => {
  load.mockImplementation(async () => fakeModel() as unknown as tf.GraphModel);
  const [a, b] = await Promise.all([loadModels(), loadModels()]);
  expect(a).toBe(b);
  expect(load).toHaveBeenCalledTimes(2);
  expect(load.mock.calls.map((c) => c[0])).toEqual(["/models/detect/model.json", "/models/segment/model.json"]);
  expect(a.detect.inputShape).toEqual([1, 640, 640, 3]);
});

it("tries again after a failed load", async () => {
  load.mockRejectedValueOnce(new Error("offline"));
  await expect(loadModels()).rejects.toThrow("offline");
  load.mockImplementation(async () => fakeModel() as unknown as tf.GraphModel);
  await expect(loadModels()).resolves.toBeDefined();
});

it("reports detect progress before segment progress", async () => {
  load.mockImplementation(async (_url, opts) => {
    opts?.onProgress?.(1);
    return fakeModel() as unknown as tf.GraphModel;
  });
  const stages: string[] = [];
  await loadModels((p) => stages.push(p.stage));
  expect(stages.indexOf("detect")).toBeGreaterThanOrEqual(0);
  expect(stages.indexOf("detect")).toBeLessThan(stages.indexOf("segment"));
});
