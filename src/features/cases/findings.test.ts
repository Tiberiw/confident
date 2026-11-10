import { emptyDetections, type Box } from "@/types/domain";
import { buildFindingRows, buildToothRows } from "./findings";

it("returns no rows for an empty case", () => {
  expect(buildFindingRows(emptyDetections(), emptyDetections())).toEqual([]);
});

it("lists pathologies before treatments", () => {
  const rows = buildFindingRows({ boxes: [[0, 0, 1, 1], [0, 0, 1, 1]], scores: [1, 1], classes: [2, 4] }, emptyDetections());
  expect(rows.map((r) => r.label)).toEqual(["Caries", "Dental Filling"]);
  expect(rows.map((r) => r.index)).toEqual([1, 0]);
});

it("assigns teeth and sorts by tooth, unknown teeth last", () => {
  const teeth = { boxes: [[0, 0, 10, 10], [0, 20, 10, 30]] as Box[], scores: [1, 1], classes: [8, 7] }; // 2.1, 1.1
  const p = { boxes: [[50, 50, 60, 60], [1, 21, 9, 29], [1, 1, 9, 9]] as Box[], scores: [0.5, 0.6, 0.7], classes: [4, 4, 4] };
  expect(buildFindingRows(p, teeth).map((r) => r.tooth)).toEqual(["1.1", "2.1", null]);
});

it("lists teeth in chart order", () => {
  const teeth = { boxes: [[0, 0, 1, 1], [0, 0, 1, 1]] as Box[], scores: [0.9, 0.8], classes: [8, 7] };
  expect(buildToothRows(teeth).map((r) => r.label)).toEqual(["1.1", "2.1"]);
});

it("lists unnumbered teeth last, labeled Unnumbered", () => {
  const teeth = { boxes: [[0, 0, 1, 1], [0, 2, 1, 3], [0, 4, 1, 5]] as Box[], scores: [0.3, 0.9, 0.8], classes: [-1, 8, 7] };
  expect(buildToothRows(teeth).map((r) => r.label)).toEqual(["1.1", "2.1", "Unnumbered"]);
});
