import jsPDF from "jspdf";
import { ageFromDob, formatDate, isoDay } from "@/lib/dates";
import { processFindings, toFdi, type ProcessedFindings } from "@/lib/teeth-mapping";
import type { Case, Clinic, Patient, XRay } from "@/types/domain";
import { tokens } from "@/ui/tokens";
import { renderAnnotatedImage } from "./annotated-image";

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const INK = rgb(tokens.ink);
const MUTED = rgb(tokens.muted);
const BRAND = rgb(tokens.brand);
const DANGER = rgb(tokens.danger);

const UPPER = ["1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"];
const LOWER = ["4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"];
const TREATMENT_KEYS: (keyof ProcessedFindings)[] = ["implantedTeeth", "prostheticsRestorations", "dentalFindings", "endodonticTreatments", "apicalSurgeries", "orthodonticTreatments", "surgicalDevices"];
const PATHOLOGY_KEYS: (keyof ProcessedFindings)[] = ["caries", "periodontalBoneLoss", "impactedTeeth", "periapicalLesions", "rootFragments", "furcationLesions", "rootResorption"];
const GENDER: Record<string, string> = { M: "M", F: "F" };

/** Page writer that keeps a cursor and breaks pages before the footer area. */
class Writer {
  y = 15;
  readonly width: number;
  readonly height: number;
  constructor(readonly doc: jsPDF) {
    this.width = doc.internal.pageSize.getWidth();
    this.height = doc.internal.pageSize.getHeight();
  }
  ensure(space: number) {
    if (this.y + space > this.height - 25) {
      this.doc.addPage();
      this.y = 15;
    }
  }
  font(size: number, style: "normal" | "bold" = "normal", color: RGB = INK) {
    this.doc.setFontSize(size).setFont("helvetica", style).setTextColor(...color);
  }
  section(text: string) {
    this.ensure(30);
    this.font(13, "bold");
    this.doc.text(text, 10, this.y);
    this.doc.setDrawColor(...BRAND).setLineWidth(0.4).line(10, this.y + 1.8, this.width - 10, this.y + 1.8);
    this.y += 9;
    this.font(10);
  }
  subheading(text: string) {
    this.ensure(20);
    this.font(10, "bold");
    this.doc.text(text, 15, this.y);
    this.y += 7;
    this.font(10);
  }
  check(x: number, text: string, checked: boolean) {
    this.doc.setDrawColor(...MUTED).setLineWidth(0.2).rect(x, this.y - 3, 3, 3);
    if (checked) {
      this.font(10, "bold", BRAND);
      this.doc.text("X", x + 0.55, this.y - 0.4);
      this.font(10);
    }
    this.doc.text(text, x + 5, this.y);
  }
  /** Label followed by one ticked option. */
  choice(label: string, options: string[], selected: number, note?: string) {
    this.ensure(8);
    this.font(10, "bold");
    this.doc.text(label, 18, this.y);
    this.font(10);
    let x = 85;
    options.forEach((o, i) => {
      this.check(x, o, i === selected);
      x += 12 + this.doc.getTextWidth(o);
    });
    if (note) {
      this.y += 6;
      this.font(9, "normal", MUTED);
      const lines = this.doc.splitTextToSize(`Description: ${note}`, this.width - 100);
      this.doc.text(lines, 85, this.y);
      this.y += (lines.length - 1) * 4.5;
      this.font(10);
    }
    this.y += 7;
  }
  /** Yes/No line with the affected teeth listed on the right. */
  teethLine(label: string, teeth: number[]) {
    this.ensure(8);
    this.font(10, "bold");
    this.doc.text(label, 18, this.y);
    this.font(10);
    this.check(85, "Yes", teeth.length > 0);
    this.check(105, "No", teeth.length === 0);
    let extra = 0;
    if (teeth.length) {
      const lines = this.doc.splitTextToSize(`(Teeth: ${teeth.join(", ")})`, this.width - 135);
      this.doc.text(lines, 125, this.y);
      extra = (lines.length - 1) * 5;
    }
    this.y += 7 + extra;
  }
}

const pick = (value: string | undefined, options: string[]) => Math.max(0, options.indexOf(value ?? ""));

function drawChart(w: Writer, f: ProcessedFindings) {
  const row = (labels: string[], top: number, upper: boolean) => {
    const spacing = 11.4;
    let x = 15;
    labels.forEach((label, i) => {
      const n = parseFloat(label);
      const has = (keys: (keyof ProcessedFindings)[]) => keys.some((k) => f[k].includes(n));
      w.font(9, "bold", f.missingTeeth.includes(n) ? MUTED : has(PATHOLOGY_KEYS) ? DANGER : has(TREATMENT_KEYS) ? BRAND : INK);
      w.doc.text(f.missingTeeth.includes(n) ? "X" : label, f.missingTeeth.includes(n) ? x + 2 : x, top + 7);
      if (i === 7) w.doc.setDrawColor(...MUTED).setLineWidth(0.4).line(x + spacing / 2 + 2, top - 2, x + spacing / 2 + 2, top + 13);
      x += spacing;
    });
    if (upper) w.doc.setDrawColor(...MUTED).setLineWidth(0.4).line(15, top + 13.5, x - spacing + 6, top + 13.5);
  };
  w.ensure(40);
  row(UPPER, w.y, true);
  w.y += 16;
  row(LOWER, w.y, false);
  w.y += 18;
  w.font(8, "normal", MUTED);
  w.doc.text("Red: pathology   Green: treatment   X: missing", 15, w.y);
  w.y += 8;
  w.font(10);
}

function addImage(w: Writer, title: string, dataUrl: string, ratio: number, newPage: boolean) {
  const maxW = w.width - 30;
  let imgW = maxW;
  let imgH = imgW / ratio;
  if (imgH > 150) {
    imgH = 150;
    imgW = imgH * ratio;
  }
  if (newPage) {
    w.doc.addPage();
    w.y = 20;
  } else {
    w.ensure(imgH + 20);
  }
  w.font(13, "bold");
  w.doc.text(title, 15, w.y);
  w.doc.addImage(dataUrl, "JPEG", 15, w.y + 5, imgW, imgH);
  w.y += imgH + 15;
}

/** Builds and downloads the panoramic radiography report for a case. */
export async function generateCaseReport(c: Case, patient: Patient, xray: XRay, clinic: Clinic): Promise<void> {
  const f = toFdi(processFindings(c.teeth, c.pathologies));
  const doc = new jsPDF();
  const w = new Writer(doc);

  // Header: clinic, title.
  w.font(11, "bold", BRAND);
  doc.text(clinic.name || "Dental clinic", 10, w.y);
  if (clinic.address) {
    w.font(9, "normal", MUTED);
    doc.text(clinic.address, 10, w.y + 5);
  }
  w.y += 16;
  w.font(18, "bold");
  doc.text("Panoramic Radiography Report", w.width / 2, w.y, { align: "center" });
  w.y += 11;

  w.section("Patient information");
  const age = ageFromDob(patient.dateOfBirth);
  for (const line of [
    `Name: ${`${patient.firstName} ${patient.lastName}`.trim()}`,
    `Age/Gender: ${age ?? "-"}/${GENDER[patient.gender] ?? "-"}`,
    `Date of examination: ${formatDate(c.scanDate)}`,
    `Referring dentist: ${c.referringDentist || "-"}`,
    `Clinical indication: ${c.clinicalIndication || "-"}`,
  ]) {
    doc.text(line, 15, w.y);
    w.y += 5;
  }
  w.y += 5;

  w.section("Dental chart");
  drawChart(w, f);

  w.section("Radiographic findings");
  w.subheading("1. Image quality");
  w.choice("Image clarity:", ["Satisfactory", "Suboptimal"], 0);
  w.choice("Presence of artifacts:", ["None", "Yes"], c.presenceOfArtifacts === "Yes" ? 1 : 0, c.presenceOfArtifacts === "Yes" ? c.artifactsDescription : undefined);

  w.subheading("2. Dentition");
  const dev = ["Normal", "Delayed", "Accelerated"];
  w.choice("Dental development:", dev, pick(c.dentalDevelopment, dev));
  w.teethLine("Impacted teeth:", f.impactedTeeth);
  w.ensure(14);
  w.font(10, "bold");
  doc.text("Erupted teeth:", 18, w.y);
  w.font(10);
  const erupted = doc.splitTextToSize(f.presentTeeth.join(", ") || "-", w.width - 105);
  doc.text(erupted, 85, w.y);
  w.y += 7 + (erupted.length - 1) * 5;
  w.choice("Supernumerary teeth:", ["No", "Yes"], c.supernumeraryTeeth === "Yes" ? 1 : 0, c.supernumeraryTeeth === "Yes" ? c.supernumeraryTeethDesc : undefined);
  w.teethLine("Missing teeth:", f.missingTeeth);
  w.teethLine("Dental caries:", f.caries);
  w.teethLine("Restorations/prosthetics:", f.prostheticsRestorations);
  w.teethLine("Root resorption:", f.rootResorption);
  w.teethLine("Periapical lesions:", f.periapicalLesions);
  w.y += 3;

  w.subheading("3. Periodontal structures");
  w.choice("Bone loss:", ["None", "Mild", "Moderate", "Severe"], f.periodontalBoneLoss.length > 0 ? 1 : 0);
  const density = ["Normal", "Reduced", "Increased"];
  w.choice("Alveolar bone density:", density, pick(c.alveolarBoneDensity, density));
  const pdl = ["Normal", "Widened", "Irregular"];
  w.choice("Periodontal ligament space:", pdl, pick(c.periodontalLigamentSpace, pdl));
  w.y += 3;

  // Legacy behaviour: advanced sections print unless they were explicitly turned off.
  if (c.showAdvancedFindings !== false) {
    w.subheading("4. Jaw bones (maxilla & mandible)");
    w.choice("Cortical integrity:", ["Intact", "Disrupted"], c.corticalIntegrity === "Disrupted" ? 1 : 0, c.corticalIntegrity === "Disrupted" ? c.corticalIntegrityDesc : undefined);
    w.choice("Mandibular canal:", ["Normal", "Altered"], c.mandibularCanal === "Altered" ? 1 : 0);
    w.choice("Condylar & coronoid:", ["Normal", "Abnormal"], c.condylarCoronoid === "Abnormal" ? 1 : 0);
    w.choice("Symphysis & ramus:", ["Normal", "Abnormal"], c.mandibularSymphysis === "Abnormal" ? 1 : 0);
    w.y += 3;

    w.subheading("5. Temporomandibular joints (TMJ)");
    const space = ["Normal", "Narrowed", "Widened"];
    w.choice("Joint space:", space, pick(c.tmjJointSpace, space));
    const head = ["Normal", "Flattened", "Erosions"];
    w.choice("Condylar head:", head, pick(c.condylarHead, head));
    w.choice("Degenerative changes:", ["No", "Yes"], c.degenerativeChanges === "Yes" ? 1 : 0);
    w.y += 3;

    w.subheading("6. Sinuses & airway");
    const sinus = ["Clear", "Mucosal Thickening", "Opacified"];
    w.choice("Maxillary sinuses:", sinus, pick(c.maxillarySinuses, sinus));
    const nasal = ["Normal", "Deviated", "Obstructed"];
    w.choice("Nasal cavity & septum:", nasal, pick(c.nasalCavity, nasal));
    w.choice("Airway patency:", ["Normal", "Narrowed"], c.airwayPatency === "Narrowed" ? 1 : 0);
    w.y += 3;

    w.subheading("7. Soft tissues & incidental findings");
    w.choice("Soft tissue swelling:", ["No", "Yes"], c.softTissueSwelling === "Yes" ? 1 : 0);
    w.choice("Calcifications:", ["None", "Present"], c.calcifications === "Present" ? 1 : 0, c.calcifications === "Present" ? c.calcificationsDesc : undefined);
    const lesions = ["None", "Cyst/Tumor", "Other"];
    w.choice("Pathologic lesions:", lesions, pick(c.pathologicLesions, lesions));
    w.y += 3;
  }

  const summary: string[] = [];
  if (f.missingTeeth.length) summary.push(`- Missing teeth identified: ${f.missingTeeth.join(", ")}.`);
  if (f.impactedTeeth.length) summary.push(`- Impacted teeth detected at positions: ${f.impactedTeeth.join(", ")}.`);
  if (f.caries.length) summary.push(`- Suspected carious lesions on teeth: ${f.caries.join(", ")}.`);
  if (f.prostheticsRestorations.length) summary.push(`- Restorations, prosthetics or implants on teeth: ${f.prostheticsRestorations.join(", ")}.`);
  if (f.periapicalLesions.length) summary.push(`- Periapical lesions suspected near teeth: ${f.periapicalLesions.join(", ")}.`);
  if (f.periodontalBoneLoss.length) summary.push(`- Signs of periodontal bone loss associated with teeth: ${f.periodontalBoneLoss.join(", ")}.`);
  if (!summary.length) summary.push("- No significant pathologies were detected by the AI analysis.");
  w.section("Impression (summary of findings)");
  const summaryLines = doc.splitTextToSize(summary.join("\n"), w.width - 25);
  w.ensure(summaryLines.length * 5);
  doc.text(summaryLines, 15, w.y);
  w.y += summaryLines.length * 5 + 5;

  if (c.recommendation?.trim()) {
    w.section("Recommendation");
    const lines = doc.splitTextToSize(c.recommendation.trim(), w.width - 30);
    w.ensure(lines.length * 5);
    doc.text(lines, 15, w.y);
    w.y += lines.length * 5 + 5;
  }

  w.ensure(30);
  w.y += 8;
  w.font(10);
  doc.text(`Radiologist/Dentist: ${c.radiologist || "-"}`, 15, w.y);
  doc.text("Signature:", 15, w.y + 8);
  doc.setDrawColor(...INK).setLineWidth(0.2).line(34, w.y + 8, 80, w.y + 8);
  doc.text(`Print date: ${formatDate(new Date())}`, 130, w.y + 8);
  w.font(8, "normal", MUTED);
  doc.text("AI findings support, and do not replace, the clinician's diagnosis.", 15, w.y + 16);
  w.y += 26;

  const ratio = xray.width && xray.height ? xray.width / xray.height : 2;
  addImage(w, "Radiography image", xray.dataUrl, ratio, false);
  if (c.pathologies.boxes.length) {
    try {
      const annotated = await renderAnnotatedImage(xray, c.pathologies);
      addImage(w, "Annotated radiography image", annotated, ratio, true);
    } catch {
      // The report is still useful without the annotated copy.
    }
  }

  const day = isoDay(c.scanDate ?? new Date());
  doc.save(`${patient.lastName}-${patient.firstName}-radiography-report-${day}.pdf`.replace(/\s+/g, "-"));
}
