import type { Box, Detections } from "@/types/domain";
import pathologyLabels from "@/ml/labels/pathologies.json";
import toothLabels from "@/ml/labels/teeth.json";
import treatmentLabels from "@/ml/labels/treatments.json";
import { iou } from "./geometry";

/** Tooth class index → FDI label ("1.8" … "4.8"), in model output order. */
export const TOOTH_LABELS: string[] = toothLabels;
/** Tooth class for an extra box that couldn't be given a number of its own. */
export const UNNUMBERED_TOOTH = -1;

/** Display label for a tooth class: "1.8" … "4.8", or "Unnumbered". */
export function toothLabel(cls: number): string {
  return TOOTH_LABELS[cls] ?? "Unnumbered";
}
/** Detection class index → pathology / treatment name, in model output order. */
export const PATHOLOGY_LABELS: string[] = pathologyLabels;

const TREATMENTS = new Set<string>(treatmentLabels);
const MIN_IOU = 0.01;

export function isTreatment(classIndex: number): boolean {
  return TREATMENTS.has(PATHOLOGY_LABELS[classIndex]);
}

/** Number of pathology boxes that are not treatments (fillings, implants…). */
export function countPathologies(d: Detections): number {
  return d.classes.filter((c) => !isTreatment(c)).length;
}

/** Index into `teeth` of the numbered tooth that overlaps `box` the most, or -1. */
function bestToothIndex(box: Box, teeth: Detections): number {
  let best = -1;
  let bestIou = MIN_IOU;
  teeth.boxes.forEach((toothBox, i) => {
    // Unnumbered extra boxes can't carry a finding; skipping them lets it fall to a real tooth.
    if (teeth.classes[i] === UNNUMBERED_TOOTH) return;
    const v = iou(toothBox, box);
    if (v > bestIou) {
      bestIou = v;
      best = i;
    }
  });
  return best;
}

/** FDI label of the tooth that overlaps `box` the most (IoU > 0.01), or null. */
export function assignTooth(box: Box, teeth: Detections): string | null {
  const i = bestToothIndex(box, teeth);
  return i === -1 ? null : (TOOTH_LABELS[teeth.classes[i]] ?? null);
}

export interface ProcessedFindings {
  presentTeeth: number[];
  missingTeeth: number[];
  implantedTeeth: number[];
  prostheticsRestorations: number[];
  dentalFindings: number[];
  endodonticTreatments: number[];
  caries: number[];
  periodontalBoneLoss: number[];
  impactedTeeth: number[];
  periapicalLesions: number[];
  rootFragments: number[];
  furcationLesions: number[];
  apicalSurgeries: number[];
  rootResorption: number[];
  orthodonticTreatments: number[];
  surgicalDevices: number[];
}

type Category = keyof ProcessedFindings;

/** Which findings list each detection class goes into (same order as PATHOLOGY_LABELS). */
const CATEGORY_BY_LABEL: Record<string, Category> = {
  "Dental Implant": "implantedTeeth",
  "Prosthetic Restoration": "prostheticsRestorations",
  "Dental Filling": "dentalFindings",
  "Endodontic Treatment": "endodonticTreatments",
  Caries: "caries",
  "Periodontal Bone Loss": "periodontalBoneLoss",
  "Impacted Tooth": "impactedTeeth",
  "Periapical Lesion": "periapicalLesions",
  "Root Fragment": "rootFragments",
  "Furcation Lesion": "furcationLesions",
  "Apical Surgery": "apicalSurgeries",
  "Root Resorption": "rootResorption",
  "Orthodontic Treatment": "orthodonticTreatments",
  "Surgical Device": "surgicalDevices",
};

const emptyFindings = (): ProcessedFindings => ({
  presentTeeth: [],
  missingTeeth: [],
  implantedTeeth: [],
  prostheticsRestorations: [],
  dentalFindings: [],
  endodonticTreatments: [],
  caries: [],
  periodontalBoneLoss: [],
  impactedTeeth: [],
  periapicalLesions: [],
  rootFragments: [],
  furcationLesions: [],
  apicalSurgeries: [],
  rootResorption: [],
  orthodonticTreatments: [],
  surgicalDevices: [],
});

function mapValues(f: ProcessedFindings, fn: (list: number[]) => number[]): ProcessedFindings {
  const out = emptyFindings();
  for (const key of Object.keys(out) as Category[]) out[key] = fn(f[key]);
  return out;
}

const uniqueSorted = (list: number[]) => [...new Set(list)].sort((a, b) => a - b);

/**
 * Groups findings by tooth class index. Each pathology is assigned to the tooth it overlaps most.
 * A tooth with an implant counts as missing (the natural tooth is gone).
 */
export function processFindings(teeth: Detections, pathologies: Detections): ProcessedFindings {
  const f = emptyFindings();
  const allTeeth = TOOTH_LABELS.map((_, i) => i);
  if (teeth.boxes.length === 0) {
    f.missingTeeth = allTeeth;
    return f;
  }

  // Unnumbered extra boxes have no place on the chart.
  f.presentTeeth = teeth.classes.filter((c) => c >= 0);
  pathologies.boxes.forEach((box, i) => {
    const toothIndex = bestToothIndex(box, teeth);
    const category = CATEGORY_BY_LABEL[PATHOLOGY_LABELS[pathologies.classes[i]]];
    const tooth = toothIndex === -1 ? -1 : teeth.classes[toothIndex];
    if (tooth >= 0 && category) f[category].push(tooth);
  });

  const implanted = new Set(f.implantedTeeth);
  f.presentTeeth = f.presentTeeth.filter((t) => !implanted.has(t));
  const present = new Set(f.presentTeeth);
  f.missingTeeth = allTeeth.filter((t) => !present.has(t));
  return mapValues(f, uniqueSorted);
}

/** Converts tooth class indexes to FDI numbers (7 → 1.1). */
export function toFdi(findings: ProcessedFindings): ProcessedFindings {
  return mapValues(findings, (list) => uniqueSorted(list.map((t) => parseFloat(TOOTH_LABELS[t] ?? String(t)))));
}
