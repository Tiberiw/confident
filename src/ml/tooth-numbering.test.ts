import { TOOTH_LABELS, UNNUMBERED_TOOTH } from "@/lib/teeth-mapping";
import { numberTeeth, type DetectedTooth } from "./tooth-numbering";

const W = 2000;
const cls = (label: string) => TOOTH_LABELS.indexOf(label);
const labels = (classes: number[]) => classes.map((c) => TOOTH_LABELS[c] ?? "unnumbered");

/** One jaw, listed left to right on the image, spaced 60 px apart around `mid`. */
function jaw(modelLabels: string[], mid = W / 2, firstRight = modelLabels.length / 2): DetectedTooth[] {
  return modelLabels.map((label, i) => ({
    xCenter: mid + (i - firstRight + 0.5) * 60,
    modelClass: cls(label),
    score: 0.9,
  }));
}

const UPPER = ["1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"];
const LOWER = ["4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"];

it("numbers a full upper jaw in FDI order", () => {
  expect(labels(numberTeeth(jaw(UPPER), W))).toEqual(UPPER);
});

it("numbers the lower left from 4.1 at the centre to 4.8 at the back", () => {
  expect(labels(numberTeeth(jaw(LOWER), W))).toEqual(LOWER);
});

it("fixes neighbours the model swapped, using their position", () => {
  const swapped = ["1.8", "1.6", "1.7", "1.5", "1.4", "1.3", "1.1", "1.2", "2.2", "2.1", "2.3", "2.4", "2.5", "2.6", "2.8", "2.7"];
  expect(labels(numberTeeth(jaw(swapped), W))).toEqual(UPPER);
});

it("keeps 1.6 as 1.6 when both back molars are missing", () => {
  const teeth = jaw(UPPER.slice(2), W / 2, 6);
  expect(labels(numberTeeth(teeth, W))).toEqual(UPPER.slice(2));
});

it("skips a missing front tooth instead of shifting every number", () => {
  const withoutUpperRight12 = UPPER.filter((l) => l !== "1.2");
  expect(labels(numberTeeth(jaw(withoutUpperRight12, W / 2, 7), W), )).toEqual(withoutUpperRight12);
});

it("finds the midline when the patient is off the image centre", () => {
  const teeth = jaw(UPPER, W * 0.4);
  expect(labels(numberTeeth(teeth, W))).toEqual(UPPER);
});

it("never gives two teeth the same number; the weakest extra box stays unnumbered", () => {
  // Nine boxes on the upper left: an extra, weak box between 1.4 and 1.3.
  const teeth = jaw(UPPER);
  teeth.splice(5, 0, { xCenter: (teeth[4].xCenter + teeth[5].xCenter) / 2, modelClass: cls("1.3"), score: 0.3 });
  const result = labels(numberTeeth(teeth, W));
  expect(result[5]).toBe("unnumbered");
  expect(result.filter((l) => l !== "unnumbered")).toEqual(UPPER);
});

it("numbers both jaws in one call, keeping the input order", () => {
  const upper = jaw(UPPER);
  const lower = jaw(LOWER);
  const mixed = [lower[0], upper[0], lower[15], upper[15]];
  expect(labels(numberTeeth(mixed, W))).toEqual(["4.8", "1.8", "3.8", "2.8"]);
});

it("returns UNNUMBERED_TOOTH as -1 and handles an empty list", () => {
  expect(UNNUMBERED_TOOTH).toBe(-1);
  expect(numberTeeth([], W)).toEqual([]);
});
