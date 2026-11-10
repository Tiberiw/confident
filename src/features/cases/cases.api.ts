import {
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
import { caseFromDoc, detectionsToFirestore } from "@/lib/firestore-mappers";
import type { Case, CaseInput, Detections, ReportDetails } from "@/types/domain";

export async function listPatientCases(clinicId: string, patientId: string): Promise<Case[]> {
  const snap = await getDocs(
    query(collection(db, "cases"), where("clinicId", "==", clinicId), where("patientId", "==", patientId)),
  );
  const time = (c: Case) => (c.scanDate ?? c.createdAt)?.getTime() ?? 0;
  return snap.docs.map((d) => caseFromDoc(d.id, d.data())).sort((a, b) => time(b) - time(a));
}

export async function getCase(id: string): Promise<Case | null> {
  const snap = await getDoc(doc(db, "cases", id));
  return snap.exists() ? caseFromDoc(snap.id, snap.data()) : null;
}

/** Writes the case and its X-ray image in one batch. Returns the new case id. */
export async function createCase(
  input: CaseInput,
  image: { dataUrl: string; width: number; height: number },
): Promise<string> {
  const caseRef = doc(collection(db, "cases"));
  const batch = writeBatch(db);
  batch.set(caseRef, {
    ...input,
    pathologies: detectionsToFirestore(input.pathologies),
    teeth: detectionsToFirestore(input.teeth),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "xrays", caseRef.id), {
    clinicId: input.clinicId,
    dataUrl: image.dataUrl,
    width: image.width,
    height: image.height,
  });
  await batch.commit();
  return caseRef.id;
}

export async function updateCaseAnnotations(
  id: string,
  a: { pathologies?: Detections; teeth?: Detections },
): Promise<void> {
  await updateDoc(doc(db, "cases", id), {
    ...(a.pathologies && { pathologies: detectionsToFirestore(a.pathologies) }),
    ...(a.teeth && { teeth: detectionsToFirestore(a.teeth) }),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCaseReport(id: string, d: ReportDetails): Promise<void> {
  await updateDoc(doc(db, "cases", id), { ...d, updatedAt: serverTimestamp() });
}

export async function deleteCase(id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "cases", id));
  batch.delete(doc(db, "xrays", id));
  await batch.commit();
}
