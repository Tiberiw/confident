import type { Clinic, Patient } from "@/types/domain";
import { consentFormPages } from "./gdpr";

const clinic: Clinic = { id: "k1", name: "Smile Dental Clinic", address: "Str. Lunga 1, Cluj-Napoca", ownerUid: "u1" };
const patient = { id: "p1", firstName: "Maria", lastName: "Ionescu", dateOfBirth: new Date(1984, 2, 12) } as Patient;

it("builds the notice and the consent page in English", () => {
  const pages = consentFormPages(clinic, patient);
  expect(pages).toHaveLength(2);
  const html = pages.join("");
  expect(html).toContain("Smile Dental Clinic");
  expect(html).toContain("Maria Ionescu");
  expect(html).toContain("12.03.1984");
  expect(html).toContain("Information Notice on Personal Data Processing");
  for (const romanian of ["Stimate", "Pacient", "Datele", "Operatorul", "Subsemnatul", "Consimțământ"]) {
    expect(html).not.toContain(romanian);
  }
});

it("leaves the name blank without a patient", () => {
  const html = consentFormPages(clinic).join("");
  expect(html).not.toContain("Maria");
  expect(html).toContain('data-blank="name"');
});

it("escapes HTML in user-entered text", () => {
  const html = consentFormPages({ ...clinic, name: "<img src=x onerror=alert(1)>" }).join("");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("&lt;img src=x");
});
