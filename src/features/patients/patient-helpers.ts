import type { Patient, PatientInput } from "@/types/domain";

/** "Maria Ionescu" */
export const patientName = (p: Pick<Patient, "firstName" | "lastName">) => `${p.firstName} ${p.lastName}`.trim();

export const emptyPatient = (): PatientInput => ({
  firstName: "",
  lastName: "",
  gender: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: null,
  address: "",
  notes: "",
});
