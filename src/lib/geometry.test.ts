import { iou, normalizeBox, scaleBoxes } from "./geometry";

describe("iou", () => {
  it("is 1 for identical boxes", () => expect(iou([0, 0, 10, 10], [0, 0, 10, 10])).toBe(1));
  it("is 0 for disjoint boxes", () => expect(iou([0, 0, 10, 10], [20, 20, 30, 30])).toBe(0));
  it("is 1/3 for half-overlapping boxes", () => expect(iou([0, 0, 10, 10], [0, 5, 10, 15])).toBeCloseTo(1 / 3));
  it("is 0 for zero-area boxes", () => expect(iou([0, 0, 0, 0], [0, 0, 0, 0])).toBe(0));
});

it("scaleBoxes multiplies every coordinate", () => {
  expect(scaleBoxes([[10, 20, 30, 40]], 0.5)).toEqual([[5, 10, 15, 20]]);
});

it("normalizeBox orders min/max", () => {
  expect(normalizeBox(30, 40, 10, 20)).toEqual([10, 20, 30, 40]);
});
