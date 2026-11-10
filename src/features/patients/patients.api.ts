import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { patientFromDoc } from "@/lib/firestore-mappers";
import type { Patient, PatientInput } from "@/types/domain";

const byName = (a: Patient, b: Patient) =>
  a.lastName.localeCompare(b.lastName, undefined, { sensitivity: "base" }) ||
  a.firstName.localeCompare(b.firstName, undefined, { sensitivity: "base" });

export async function listPatients(clinicId: string): Promise<Patient[]> {
  const snap = await getDocs(query(collection(db, "patients"), where("clinicId", "==", clinicId)));
  return snap.docs.map((d) => patientFromDoc(d.id, d.data())).sort(byName);
}

export async function getPatient(id: string): Promise<Patient | null> {
  const snap = await getDoc(doc(db, "patients", id));
  return snap.exists() ? patientFromDoc(snap.id, snap.data()) : null;
}

const patientFields = (p: PatientInput) => ({
  firstName: p.firstName.trim(),
  lastName: p.lastName.trim(),
  gender: p.gender,
  email: p.email.trim(),
  phoneNumber: p.phoneNumber.trim(),
  dateOfBirth: p.dateOfBirth,
  address: p.address.trim(),
  notes: p.notes,
});

export async function createPatient(clinicId: string, input: PatientInput): Promise<string> {
  const ref = await addDoc(collection(db, "patients"), {
    ...patientFields(input),
    clinicId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePatient(id: string, input: PatientInput): Promise<void> {
  await updateDoc(doc(db, "patients", id), { ...patientFields(input), updatedAt: serverTimestamp() });
}

/** Deletes the patient together with all their cases and X-rays. */
export async function deletePatient(clinicId: string, patientId: string): Promise<void> {
  const cases = await getDocs(
    query(collection(db, "cases"), where("clinicId", "==", clinicId), where("patientId", "==", patientId)),
  );
  const batch = writeBatch(db);
  for (const c of cases.docs) {
    batch.delete(c.ref);
    batch.delete(doc(db, "xrays", c.id));
  }
  batch.delete(doc(db, "patients", patientId));
  await batch.commit();
}

/** Case-insensitive match on first or last name. Runs client-side, so no Firestore index is needed. */
export function filterPatients(patients: Patient[], term: string): Patient[] {
  const t = term.trim().toLocaleLowerCase();
  if (!t) return patients;
  return patients.filter(
    (p) => p.firstName.toLocaleLowerCase().includes(t) || p.lastName.toLocaleLowerCase().includes(t),
  );
}
