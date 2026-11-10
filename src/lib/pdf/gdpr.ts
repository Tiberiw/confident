import { formatDate } from "@/lib/dates";
import type { Clinic, Patient } from "@/types/domain";
import { tokens } from "@/ui/tokens";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const page = (n: number, total: number, body: string) => `
  <div data-page="${n}" style="position: relative; font-family: 'Inter Variable', Inter, Helvetica, Arial, sans-serif;
    font-size: 12px; line-height: 1.6; color: ${tokens.ink}; width: 210mm; height: 297mm; padding: 20mm;
    box-sizing: border-box; background: ${tokens.surface};">
    ${body}
    <div style="position: absolute; bottom: 12mm; left: 20mm; right: 20mm; text-align: center; font-size: 10px; color: ${tokens.muted};">
      Page ${n} of ${total}
    </div>
  </div>`;

const header = (clinic: Clinic) => `
  <div style="border-bottom: 2px solid ${tokens.brand}; padding-bottom: 10px; margin-bottom: 20px;">
    <h1 style="margin: 0; color: ${tokens.brand}; font-size: 18px; font-weight: 600;">${esc(clinic.name || "Dental clinic")}</h1>
    <p style="margin: 4px 0 0; font-size: 10px; color: ${tokens.muted};">GDPR & data protection</p>
  </div>`;

const h3 = (text: string) =>
  `<h3 style="font-size: 13px; color: ${tokens.brandInk}; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid ${tokens.line};">${text}</h3>`;

const blank = (value: string, kind: string) =>
  `<span data-blank="${kind}" style="display: inline-block; min-width: 70mm; border-bottom: 1px dotted ${tokens.ink}; padding: 0 4px;">${value}</span>`;

function noticePage(clinic: Clinic): string {
  const name = esc(clinic.name || "[Clinic name]");
  return `
    ${header(clinic)}
    <h2 style="text-align: center; font-size: 14px; margin: 0 0 20px;">Information Notice on Personal Data Processing (GDPR)</h2>
    <p><strong>Dear patient,</strong></p>
    <p>Protecting your personal data is a priority for <strong>${name}</strong>. In accordance with Regulation (EU) 2016/679, we inform you of the following:</p>

    ${h3("1. Data controller")}
    <p style="margin-bottom: 4px;">Your data is processed by: <strong>${name}</strong></p>
    <ul style="list-style: none; padding: 0; margin: 0; font-size: 11px; color: ${tokens.muted};">
      <li>Address: ${esc(clinic.address || "-")}</li>
    </ul>

    ${h3("2. Legal basis and purpose")}
    <p>Your data is processed for two separate purposes, each with its own legal basis:</p>
    <ul style="margin-top: 4px;">
      <li><strong>Medical care:</strong> processing is necessary to provide the medical services you requested and to establish a diagnosis (Art. 6(1)(b) and Art. 9(2)(h) GDPR). <em style="font-size: 10px;">Without this data, medical care cannot be provided.</em></li>
      <li><strong>Advanced technology (AI and cloud):</strong> secure digital storage and AI-assisted analysis rely on your <strong>explicit consent</strong> (Art. 9(2)(a) GDPR), which you may withdraw at any time without affecting your basic medical care.</li>
    </ul>

    ${h3("3. Recipients and transfers")}
    <p>Your data may be accessed by:</p>
    <ul style="margin: 4px 0 10px;">
      <li><strong>Clinic staff:</strong> dentists, assistants and reception, all bound by professional secrecy.</li>
      <li><strong>Contracted partners:</strong> dental laboratories, accounting, and IT providers (for example the Confident platform).</li>
      <li><strong>Public authorities:</strong> only when legally required.</li>
    </ul>
    <p style="background: ${tokens.brandSoft}; padding: 6px 8px;"><strong>About AI:</strong> artificial intelligence is used strictly as <strong>technical support</strong>. The final medical decision, treatment plan and diagnosis are made by your dentist alone, not by software.</p>

    ${h3("4. Your rights")}
    <p>You have the right to access, correct, erase and port your data, and to object to its processing. You can withdraw your consent at any time with a simple written request.</p>`;
}

function consentPage(clinic: Clinic, patient?: Patient): string {
  const fullName = patient ? esc(`${patient.firstName} ${patient.lastName}`.trim()) : "";
  const dob = patient?.dateOfBirth ? formatDate(patient.dateOfBirth) : "";
  return `
    ${header(clinic)}
    <div style="border: 1.5px solid ${tokens.ink}; padding: 20px; margin-top: 20px;">
      <h2 style="text-align: center; margin: 0 0 6px; font-size: 16px;">Explicit Consent Form</h2>
      <p style="text-align: center; font-size: 10px; font-style: italic; margin: 0 0 28px;">Under Art. 9 GDPR on health data</p>

      <div style="margin-bottom: 20px;">
        <p style="margin-bottom: 10px;"><strong>I, the undersigned:</strong> ${blank(fullName, "name")}</p>
        <p><strong>Date of birth:</strong> ${blank(dob, "dob")}</p>
      </div>

      <p style="text-align: justify;">
        I declare that I have read the Information Notice. <strong>I understand that my basic medical care does not depend on this consent to digital technologies.</strong> However, to benefit from secure digital records and the precision of AI analysis, I give my explicit consent to:
      </p>

      <ul style="background: ${tokens.page}; border: 1px solid ${tokens.line}; padding: 14px 14px 14px 34px;">
        <li style="margin-bottom: 10px;">
          <strong>AI image analysis:</strong> processing of my X-rays with artificial intelligence algorithms to help the dentist detect caries and other pathologies.<br>
          <span style="font-size: 10px; color: ${tokens.muted};">(I understand that the AI does not make a diagnosis on its own.)</span>
        </li>
        <li>
          <strong>Digital cloud archiving:</strong> storage of my medical history and imaging on secure servers in the European Union (Google Cloud) to prevent data loss.
        </li>
      </ul>

      <p style="margin-top: 20px; font-size: 11px; color: ${tokens.muted};">* I am aware that I can withdraw this consent at any time.</p>

      <div style="margin-top: 56px; display: flex; justify-content: space-between; gap: 20mm;">
        <div style="flex: 1;"><div style="border-top: 1px solid ${tokens.ink}; padding-top: 4px; font-size: 11px;">Date</div></div>
        <div style="flex: 1;"><div style="border-top: 1px solid ${tokens.ink}; padding-top: 4px; font-size: 11px;">Patient signature</div></div>
      </div>
    </div>`;
}

/** The two A4 pages of the consent form as HTML: the information notice and the consent form. */
export function consentFormPages(clinic: Clinic, patient?: Patient): string[] {
  return [page(1, 2, noticePage(clinic)), page(2, 2, consentPage(clinic, patient))];
}

/** Renders the pages with html2canvas and downloads them as one PDF. */
export async function downloadConsentForm(clinic: Clinic, patient?: Patient): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const container = document.createElement("div");
  container.style.cssText = "position: absolute; left: -10000px; top: 0;";
  container.innerHTML = consentFormPages(clinic, patient).join("");
  document.body.appendChild(container);
  try {
    const doc = new jsPDF("p", "mm", "a4");
    const pages = Array.from(container.querySelectorAll<HTMLElement>("[data-page]"));
    for (const [i, el] of pages.entries()) {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: tokens.surface });
      if (i > 0) doc.addPage();
      doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
    }
    doc.save(`consent-form-${patient?.lastName || "blank"}.pdf`);
  } finally {
    container.remove();
  }
}
