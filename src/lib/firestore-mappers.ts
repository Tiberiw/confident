import type { DocumentData } from "firebase/firestore";
import { emptyDetections, type Box, type Case, type Detections, type Patient, type ReportDetails } from "@/types/domain";

/** Firestore can't store nested arrays, so boxes are stored as objects. */
export interface StoredDetections {
  boxes: { y1: number; x1: number; y2: number; x2: number }[];
  scores: number[];
  classes: number[];
}

export function detectionsToFirestore(d: Detections): StoredDetections {
  return {
    boxes: d.boxes.map(([y1, x1, y2, x2]) => ({ y1, x1, y2, x2 })),
    scores: [...d.scores],
    classes: [...d.classes],
  };
}

const isNumberArray = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === "number");

export function detectionsFromFirestore(raw: unknown): Detections {
  if (!raw || typeof raw !== "object") return emptyDetections();
  const { boxes, scores, classes } = raw as Record<string, unknown>;
  if (!Array.isArray(boxes) || !isNumberArray(scores) || !isNumberArray(classes)) return emptyDetections();
  if (boxes.length !== scores.length || boxes.length !== classes.length) return emptyDetections();
  return {
    boxes: boxes.map((b) => [Number(b?.y1) || 0, Number(b?.x1) || 0, Number(b?.y2) || 0, Number(b?.x2) || 0] as Box),
    scores,
    classes,
  };
}

/** Firestore Timestamp, Date, or anything else → Date | null. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (v && typeof (v as { toDate?: unknown }).toDate === "function") return (v as { toDate: () => Date }).toDate();
  return null;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function patientFromDoc(id: string, data: DocumentData): Patient {
  return {
    id,
    clinicId: str(data.clinicId),
    firstName: str(data.firstName),
    lastName: str(data.lastName),
    gender: str(data.gender),
    email: str(data.email),
    phoneNumber: str(data.phoneNumber),
    dateOfBirth: toDate(data.dateOfBirth),
    address: str(data.address),
    notes: str(data.notes),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export const REPORT_TEXT_KEYS = [
  "presenceOfArtifacts",
  "artifactsDescription",
  "dentalDevelopment",
  "alveolarBoneDensity",
  "periodontalLigamentSpace",
  "corticalIntegrity",
  "corticalIntegrityDesc",
  "mandibularCanal",
  "condylarCoronoid",
  "mandibularSymphysis",
  "tmjJointSpace",
  "condylarHead",
  "degenerativeChanges",
  "maxillarySinuses",
  "nasalCavity",
  "airwayPatency",
  "softTissueSwelling",
  "calcifications",
  "calcificationsDesc",
  "pathologicLesions",
  "supernumeraryTeeth",
  "supernumeraryTeethDesc",
  "recommendation",
] as const satisfies readonly (keyof ReportDetails)[];

export function reportFromData(data: DocumentData): ReportDetails {
  const report: ReportDetails = {};
  for (const key of REPORT_TEXT_KEYS) if (typeof data[key] === "string") report[key] = data[key];
  if (typeof data.showAdvancedFindings === "boolean") report.showAdvancedFindings = data.showAdvancedFindings;
  return report;
}

export function caseFromDoc(id: string, data: DocumentData): Case {
  return {
    ...reportFromData(data),
    id,
    clinicId: str(data.clinicId),
    patientId: str(data.patientId),
    scanDate: toDate(data.scanDate),
    referringDentist: str(data.referringDentist),
    clinicalIndication: str(data.clinicalIndication),
    description: str(data.description),
    radiologist: str(data.radiologist),
    radiologistId: str(data.radiologistId),
    imageFileName: str(data.imageFileName),
    imageWidth: num(data.imageWidth),
    imageHeight: num(data.imageHeight),
    pathologies: detectionsFromFirestore(data.pathologies),
    teeth: detectionsFromFirestore(data.teeth),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
