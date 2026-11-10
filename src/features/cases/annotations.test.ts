import type { Box } from "@/types/domain";
import { addBox, availableToothClasses, relabelBox, removeBox, visibleBoxIndexes } from "./annotations";

const d = { boxes: [[0, 0, 1, 1], [2, 2, 3, 3]] as Box[], scores: [0.9, 0.8], classes: [4, 2] };

it("removeBox drops the box with its score and class", () => {
  expect(removeBox(d, 0)).toEqual({ boxes: [[2, 2, 3, 3]], scores: [0.8], classes: [2] });
});

it("relabelBox changes only the class", () => {
  expect(relabelBox(d, 1, 5).classes).toEqual([4, 5]);
});

it("addBox adds a manual box with score 1", () => {
  expect(addBox(d, [5, 5, 6, 6], 7).scores).toEqual([0.9, 0.8, 1]);
});

it("does not mutate its input", () => {
  removeBox(d, 0);
  expect(d.boxes).toHaveLength(2);
});

describe("availableToothClasses", () => {
  const t = { boxes: [[0, 0, 1, 1], [0, 2, 1, 3]] as Box[], scores: [1, 1], classes: [0, 1] };
  it("leaves out teeth that are already labeled", () => expect(availableToothClasses(t)).not.toContain(0));
  it("keeps the class of the box being edited", () => expect(availableToothClasses(t, 0)).toContain(0));
  it("returns the remaining 30", () => expect(availableToothClasses(t)).toHaveLength(30));
});

it("visibleBoxIndexes shows every box when the layer is on", () => {
  expect(visibleBoxIndexes(3, "pathology", true, { type: "pathology", index: 1 })).toEqual([0, 1, 2]);
});

it("visibleBoxIndexes shows only the selected box when the layer is off", () => {
  expect(visibleBoxIndexes(3, "pathology", false, { type: "pathology", index: 1 })).toEqual([1]);
});

it("visibleBoxIndexes shows nothing when the layer is off and the selection is another type", () => {
  expect(visibleBoxIndexes(3, "teeth", false, { type: "pathology", index: 1 })).toEqual([]);
  expect(visibleBoxIndexes(3, "teeth", false, null)).toEqual([]);
});
