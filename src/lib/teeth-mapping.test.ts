import { emptyDetections, type Box } from "@/types/domain";
import { assignTooth, isTreatment, PATHOLOGY_LABELS, processFindings, TOOTH_LABELS, toFdi, toothLabel, UNNUMBERED_TOOTH } from "./teeth-mapping";

const teeth = { boxes: [[0, 0, 10, 10], [0, 20, 10, 30]] as Box[], scores: [1, 1], classes: [7, 8] }; // 1.1, 2.1

it("exposes the label lists", () => {
  expect(TOOTH_LABELS).toHaveLength(32);
  expect(TOOTH_LABELS[7]).toBe("1.1");
  expect(PATHOLOGY_LABELS).toHaveLength(14);
});

describe("assignTooth", () => {
  it("picks the tooth with the highest IoU", () => expect(assignTooth([1, 21, 9, 29], teeth)).toBe("2.1"));
  it("returns null when nothing overlaps", () => expect(assignTooth([50, 50, 60, 60], teeth)).toBeNull());
  it("returns null without teeth", () => expect(assignTooth([1, 1, 9, 9], emptyDetections())).toBeNull());
});

it("isTreatment separates treatments from pathologies", () => {
  expect(isTreatment(PATHOLOGY_LABELS.indexOf("Dental Filling"))).toBe(true);
  expect(isTreatment(PATHOLOGY_LABELS.indexOf("Caries"))).toBe(false);
});

describe("processFindings", () => {
  it("counts an implanted tooth as missing, not present", () => {
    const f = processFindings(teeth, { boxes: [[1, 1, 9, 9]], scores: [1], classes: [0] });
    expect(f.implantedTeeth).toEqual([7]);
    expect(f.presentTeeth).toEqual([8]);
    expect(f.missingTeeth).toContain(7);
    expect(toFdi(f).implantedTeeth).toEqual([1.1]);
  });

  it("marks every tooth missing when no teeth were detected", () => {
    expect(processFindings(emptyDetections(), emptyDetections()).missingTeeth).toHaveLength(32);
  });

  it("puts caries on the overlapping tooth", () => {
    const f = processFindings(teeth, { boxes: [[1, 21, 9, 29]], scores: [1], classes: [PATHOLOGY_LABELS.indexOf("Caries")] });
    expect(toFdi(f).caries).toEqual([2.1]);
  });
});

describe("unnumbered teeth", () => {
  const withExtra = { boxes: [[0, 0, 10, 10], [0, 40, 10, 50]] as Box[], scores: [1, 0.3], classes: [7, UNNUMBERED_TOOTH] };

  it("toothLabel names them", () => {
    expect(toothLabel(7)).toBe("1.1");
    expect(toothLabel(UNNUMBERED_TOOTH)).toBe("Unnumbered");
  });

  it("are left out of the dental chart", () => {
    const f = processFindings(withExtra, { boxes: [[1, 41, 9, 49]], scores: [1], classes: [0] });
    expect(f.presentTeeth).toEqual([7]);
    expect(Object.values(toFdi(f)).flat()).not.toContain(-1);
  });

  it("are not given to a finding as its tooth", () => {
    expect(assignTooth([1, 41, 9, 49], withExtra)).toBeNull();
  });

  it("don't hide a finding from its numbered neighbour", () => {
    // The caries overlaps the extra box most, but also tooth 1.1.
    const overlapping = { boxes: [[0, 0, 10, 30], [0, 20, 10, 40]] as Box[], scores: [1, 0.3], classes: [7, UNNUMBERED_TOOTH] };
    const caries = { boxes: [[1, 22, 9, 38]] as Box[], scores: [1], classes: [PATHOLOGY_LABELS.indexOf("Caries")] };
    expect(toFdi(processFindings(overlapping, caries)).caries).toEqual([1.1]);
    expect(assignTooth(caries.boxes[0], overlapping)).toBe("1.1");
  });
});
