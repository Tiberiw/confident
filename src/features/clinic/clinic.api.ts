import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Clinic } from "@/types/domain";

export async function getClinic(clinicId: string): Promise<Clinic | null> {
  const snap = await getDoc(doc(db, "clinics", clinicId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { id: snap.id, name: d.name ?? "", address: d.address ?? "", ownerUid: d.ownerUid ?? "" };
}

export async function updateClinic(clinicId: string, v: { name: string; address: string }): Promise<void> {
  await updateDoc(doc(db, "clinics", clinicId), { name: v.name, address: v.address });
}
