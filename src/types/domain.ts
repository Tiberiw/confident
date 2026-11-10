/** A bounding box as [y1, x1, y2, x2] in pixels of the stored (compressed) image. */
export type Box = [y1: number, x1: number, y2: number, x2: number];

export interface Detections {
  boxes: Box[];
  scores: number[];
  classes: number[];
}

export const emptyDetections = (): Detections => ({ boxes: [], scores: [], classes: [] });

export type Role = "admin" | "demo";

export interface UserProfile {
  uid: string;
  email: string;
  doctorName: string;
  clinicId: string;
  role: Role;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  ownerUid: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date | null;
  address: string;
  notes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type PatientInput = Omit<Patient, "id" | "clinicId" | "createdAt" | "updatedAt">;

/** Radiology report fields shown in "Report details" and printed in the PDF. */
export interface ReportDetails {
  presenceOfArtifacts?: string;
  artifactsDescription?: string;
  dentalDevelopment?: string;
  alveolarBoneDensity?: string;
  periodontalLigamentSpace?: string;
  corticalIntegrity?: string;
  corticalIntegrityDesc?: string;
  mandibularCanal?: string;
  condylarCoronoid?: string;
  mandibularSymphysis?: string;
  tmjJointSpace?: string;
  condylarHead?: string;
  degenerativeChanges?: string;
  maxillarySinuses?: string;
  nasalCavity?: string;
  airwayPatency?: string;
  softTissueSwelling?: string;
  calcifications?: string;
  calcificationsDesc?: string;
  pathologicLesions?: string;
  supernumeraryTeeth?: string;
  supernumeraryTeethDesc?: string;
  recommendation?: string;
  showAdvancedFindings?: boolean;
}

export interface Case extends ReportDetails {
  id: string;
  clinicId: string;
  patientId: string;
  scanDate: Date | null;
  referringDentist: string;
  clinicalIndication: string;
  description: string;
  radiologist: string;
  radiologistId: string;
  imageFileName: string;
  imageWidth: number;
  imageHeight: number;
  pathologies: Detections;
  teeth: Detections;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type CaseInput = Omit<Case, "id" | "createdAt" | "updatedAt">;

export interface XRay {
  caseId: string;
  clinicId: string;
  dataUrl: string;
  width: number;
  height: number;
}
