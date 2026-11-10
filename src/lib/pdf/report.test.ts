import type { Case, Clinic, Patient, XRay } from "@/types/domain";
import { generateCaseReport } from "./report";

const save = vi.fn();
vi.mock("jspdf", () => {
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === "save") return save;
      if (prop === "internal") return { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      if (prop === "splitTextToSize") return (t: string) => [t];
      if (prop === "getTextWidth") return () => 10;
      if (prop === "getImageProperties") return () => ({ width: 2, height: 1 });
      return () => proxy;
    },
  };
  const proxy: object = new Proxy({}, handler);
  return { default: vi.fn(() => proxy) };
});
vi.mock("./annotated-image", () => ({ renderAnnotatedImage: vi.fn(async () => "data:image/jpeg;base64,AAAA") }));

it("saves the report with the patient's name and scan date", async () => {
  const c = {
    id: "c1",
    clinicId: "k1",
    patientId: "p1",
    scanDate: new Date(2026, 10, 2),
    referringDentist: "Dr. Radu Stan",
    radiologist: "Dr. Ana Pop",
    pathologies: { boxes: [[1, 1, 9, 9]], scores: [0.9], classes: [4] },
    teeth: { boxes: [[0, 0, 10, 10]], scores: [1], classes: [7] },
  } as Case;
  const patient = { id: "p1", firstName: "Maria", lastName: "Ionescu", gender: "F", dateOfBirth: new Date(1984, 2, 12) } as Patient;
  const xray: XRay = { caseId: "c1", clinicId: "k1", dataUrl: "data:image/jpeg;base64,AAAA", width: 2, height: 1 };
  const clinic: Clinic = { id: "k1", name: "Smile Dental Clinic", address: "Cluj", ownerUid: "u1" };
  await generateCaseReport(c, patient, xray, clinic);
  expect(save).toHaveBeenCalledWith("Ionescu-Maria-radiography-report-2026-11-02.pdf");
});
