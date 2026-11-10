import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/types/domain";

export interface RegisterInput {
  email: string;
  password: string;
  clinicName: string;
  clinicAddress: string;
  doctorName: string;
}

/** Creates the login, the clinic, and the user profile, in that order (the rules check each step). */
export async function registerClinic(i: RegisterInput): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, i.email, i.password);
  const clinic = await addDoc(collection(db, "clinics"), {
    name: i.clinicName,
    address: i.clinicAddress,
    ownerUid: user.uid,
  });
  await setDoc(doc(db, "users", user.uid), {
    email: i.email,
    doctorName: i.doctorName,
    clinicId: clinic.id,
    role: "admin",
  });
}

/** Calls back with the signed-in user's id, or null. Returns the unsubscribe function. */
export function subscribeToAuth(cb: (uid: string | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => cb(u?.uid ?? null));
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export const demoAvailable = () => Boolean(import.meta.env.VITE_DEMO_EMAIL && import.meta.env.VITE_DEMO_PASSWORD);

export async function signInDemo(): Promise<void> {
  const email = import.meta.env.VITE_DEMO_EMAIL;
  const password = import.meta.env.VITE_DEMO_PASSWORD;
  if (!email || !password) throw new Error("The demo account is not configured");
  await signIn(email, password);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    email: typeof d.email === "string" ? d.email : "",
    doctorName: typeof d.doctorName === "string" ? d.doctorName : "",
    clinicId: typeof d.clinicId === "string" ? d.clinicId : "",
    // Anything other than an explicit admin is treated as read-only.
    role: d.role === "admin" ? "admin" : "demo",
  };
}

/** Turns the signed-in admin into a read-only demo user. Can't be undone from the app. */
export async function lockAsDemo(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { role: "demo" });
}
