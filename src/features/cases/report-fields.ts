import type { ReportDetails } from "@/types/domain";

type ChoiceKey = Exclude<keyof ReportDetails, "showAdvancedFindings" | "recommendation">;

export interface ReportField {
  key: ChoiceKey;
  label: string;
  /** The first option is the default. */
  options: string[];
  /** Free-text field shown when the value equals `describeWhen`. */
  descriptionKey?: ChoiceKey;
  describeWhen?: string;
  descriptionLabel?: string;
  /** Only shown (and printed) when "Show advanced anatomical findings" is on. */
  advanced?: boolean;
  section: string;
}

export const REPORT_FIELDS: ReportField[] = [
  { section: "Image quality", key: "presenceOfArtifacts", label: "Presence of artifacts", options: ["None", "Yes"], descriptionKey: "artifactsDescription", describeWhen: "Yes", descriptionLabel: "Describe artifacts" },
  { section: "Dentition", key: "dentalDevelopment", label: "Dental development", options: ["Normal", "Delayed", "Accelerated"] },
  { section: "Dentition", key: "supernumeraryTeeth", label: "Supernumerary teeth", options: ["No", "Yes"], descriptionKey: "supernumeraryTeethDesc", describeWhen: "Yes", descriptionLabel: "Describe supernumerary teeth" },
  { section: "Periodontal structures", key: "alveolarBoneDensity", label: "Alveolar bone density", options: ["Normal", "Reduced", "Increased"] },
  { section: "Periodontal structures", key: "periodontalLigamentSpace", label: "Periodontal ligament space", options: ["Normal", "Widened", "Irregular"] },
  { section: "Jaw bones (maxilla & mandible)", advanced: true, key: "corticalIntegrity", label: "Cortical integrity", options: ["Intact", "Disrupted"], descriptionKey: "corticalIntegrityDesc", describeWhen: "Disrupted", descriptionLabel: "Describe disruption" },
  { section: "Jaw bones (maxilla & mandible)", advanced: true, key: "mandibularCanal", label: "Mandibular canal", options: ["Normal", "Altered"] },
  { section: "Jaw bones (maxilla & mandible)", advanced: true, key: "condylarCoronoid", label: "Condylar & coronoid processes", options: ["Normal", "Abnormal"] },
  { section: "Jaw bones (maxilla & mandible)", advanced: true, key: "mandibularSymphysis", label: "Mandibular symphysis & ramus", options: ["Normal", "Abnormal"] },
  { section: "Temporomandibular joints (TMJ)", advanced: true, key: "tmjJointSpace", label: "TMJ joint space", options: ["Normal", "Narrowed", "Widened"] },
  { section: "Temporomandibular joints (TMJ)", advanced: true, key: "condylarHead", label: "Condylar head", options: ["Normal", "Flattened", "Erosions"] },
  { section: "Temporomandibular joints (TMJ)", advanced: true, key: "degenerativeChanges", label: "Degenerative changes", options: ["No", "Yes"] },
  { section: "Sinuses & airway", advanced: true, key: "maxillarySinuses", label: "Maxillary sinuses", options: ["Clear", "Mucosal Thickening", "Opacified"] },
  { section: "Sinuses & airway", advanced: true, key: "nasalCavity", label: "Nasal cavity & septum", options: ["Normal", "Deviated", "Obstructed"] },
  { section: "Sinuses & airway", advanced: true, key: "airwayPatency", label: "Airway patency", options: ["Normal", "Narrowed"] },
  { section: "Soft tissues & incidental findings", advanced: true, key: "softTissueSwelling", label: "Soft tissue swelling / masses", options: ["No", "Yes"] },
  { section: "Soft tissues & incidental findings", advanced: true, key: "calcifications", label: "Calcifications", options: ["None", "Present"], descriptionKey: "calcificationsDesc", describeWhen: "Present", descriptionLabel: "Describe calcifications" },
  { section: "Soft tissues & incidental findings", advanced: true, key: "pathologicLesions", label: "Pathologic lesions", options: ["None", "Cyst/Tumor", "Other"] },
];

/** Report values with every unset choice filled with its default (as legacy did). */
export function withReportDefaults(r: ReportDetails): ReportDetails {
  const out: ReportDetails = { ...r, showAdvancedFindings: r.showAdvancedFindings === true, recommendation: r.recommendation ?? "" };
  for (const f of REPORT_FIELDS) {
    if (!out[f.key]) out[f.key] = f.options[0];
    if (f.descriptionKey && out[f.descriptionKey] === undefined) out[f.descriptionKey] = "";
  }
  return out;
}

/** Only the report fields of a case (drops ids, boxes, dates…). */
export function pickReport(c: ReportDetails): ReportDetails {
  const out: ReportDetails = {};
  for (const f of REPORT_FIELDS) {
    if (c[f.key] !== undefined) out[f.key] = c[f.key];
    if (f.descriptionKey && c[f.descriptionKey] !== undefined) out[f.descriptionKey] = c[f.descriptionKey];
  }
  if (c.recommendation !== undefined) out.recommendation = c.recommendation;
  if (c.showAdvancedFindings !== undefined) out.showAdvancedFindings = c.showAdvancedFindings;
  return out;
}
