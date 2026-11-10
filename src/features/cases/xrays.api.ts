import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { XRay } from "@/types/domain";

export async function getXRay(caseId: string): Promise<XRay | null> {
  const snap = await getDoc(doc(db, "xrays", caseId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    caseId,
    clinicId: d.clinicId ?? "",
    dataUrl: d.dataUrl ?? "",
    width: Number(d.width) || 0,
    height: Number(d.height) || 0,
  };
}
