import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-confident",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clinics/k1"), { name: "Alice Dental", address: "A", ownerUid: "alice" });
    await setDoc(doc(db, "clinics/k2"), { name: "Bob Dental", address: "B", ownerUid: "bob" });
    await setDoc(doc(db, "clinics/kd"), { name: "Demo", address: "D", ownerUid: "demo" });
    await setDoc(doc(db, "users/alice"), { email: "a@x.com", doctorName: "Alice", clinicId: "k1", role: "admin" });
    await setDoc(doc(db, "users/bob"), { email: "b@x.com", doctorName: "Bob", clinicId: "k2", role: "admin" });
    await setDoc(doc(db, "users/demo"), { email: "d@x.com", doctorName: "Demo", clinicId: "kd", role: "demo" });
    await setDoc(doc(db, "patients/p1"), { clinicId: "k1", firstName: "Maria", lastName: "Ionescu" });
    await setDoc(doc(db, "patients/p2"), { clinicId: "k2", firstName: "Ion", lastName: "Pop" });
    await setDoc(doc(db, "patients/pd"), { clinicId: "kd", firstName: "Ana", lastName: "Demo" });
    await setDoc(doc(db, "cases/cd"), { clinicId: "kd", patientId: "pd" });
    await setDoc(doc(db, "xrays/cd"), { clinicId: "kd", dataUrl: "data:image/jpeg;base64,AAAA", width: 1, height: 1 });
  });
});

const as = (uid: string): Firestore => env.authenticatedContext(uid).firestore();

describe("patients, cases and xrays", () => {
  it("lets an admin create, read, update and delete in their own clinic", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "patients/new"), { clinicId: "k1", firstName: "Elena" }));
    await assertSucceeds(getDoc(doc(db, "patients/new")));
    await assertSucceeds(updateDoc(doc(db, "patients/new"), { firstName: "Elena M." }));
    await assertSucceeds(deleteDoc(doc(db, "patients/new")));
  });

  it("lets an admin list their own clinic's patients", async () => {
    await assertSucceeds(getDocs(query(collection(as("alice"), "patients"), where("clinicId", "==", "k1"))));
  });

  it("hides other clinics' data", async () => {
    const db = as("alice");
    await assertFails(getDoc(doc(db, "patients/p2")));
    await assertFails(getDocs(query(collection(db, "patients"), where("clinicId", "==", "k2"))));
  });

  it("rejects queries without a clinic filter", async () => {
    await assertFails(getDocs(collection(as("alice"), "patients")));
  });

  it("blocks writing into another clinic", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "patients/x"), { clinicId: "k2", firstName: "Evil" }));
    await assertFails(updateDoc(doc(db, "patients/p1"), { clinicId: "k2" }));
    await assertFails(deleteDoc(doc(db, "patients/p2")));
  });

  it("lets the demo user read but never write", async () => {
    const db = as("demo");
    await assertSucceeds(getDoc(doc(db, "patients/pd")));
    await assertSucceeds(getDoc(doc(db, "cases/cd")));
    await assertSucceeds(getDoc(doc(db, "xrays/cd")));
    await assertSucceeds(getDocs(query(collection(db, "cases"), where("clinicId", "==", "kd"))));
    await assertFails(setDoc(doc(db, "patients/x"), { clinicId: "kd", firstName: "New" }));
    await assertFails(updateDoc(doc(db, "patients/pd"), { firstName: "Changed" }));
    await assertFails(deleteDoc(doc(db, "patients/pd")));
    await assertFails(setDoc(doc(db, "cases/x"), { clinicId: "kd", patientId: "pd" }));
    await assertFails(updateDoc(doc(db, "cases/cd"), { referringDentist: "x" }));
    await assertFails(deleteDoc(doc(db, "cases/cd")));
    await assertFails(setDoc(doc(db, "xrays/x"), { clinicId: "kd", dataUrl: "" }));
    await assertFails(deleteDoc(doc(db, "xrays/cd")));
    await assertFails(updateDoc(doc(db, "clinics/kd"), { name: "Hacked" }));
  });

  it("denies everything to signed-out visitors", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "patients/p1")));
    await assertFails(getDoc(doc(db, "clinics/k1")));
    await assertFails(getDoc(doc(db, "users/alice")));
  });
});

describe("clinics", () => {
  it("lets members read and admins rename their clinic", async () => {
    await assertSucceeds(getDoc(doc(as("alice"), "clinics/k1")));
    await assertSucceeds(updateDoc(doc(as("alice"), "clinics/k1"), { name: "Alice Dental 2" }));
    await assertFails(getDoc(doc(as("alice"), "clinics/k2")));
    await assertFails(updateDoc(doc(as("alice"), "clinics/k1"), { ownerUid: "bob" }));
  });
});

describe("sign-up", () => {
  it("lets a new user create their clinic and admin profile", async () => {
    const db = as("carol");
    await assertSucceeds(setDoc(doc(db, "clinics/kc"), { name: "Carol Dental", address: "C", ownerUid: "carol" }));
    await assertSucceeds(
      setDoc(doc(db, "users/carol"), { email: "c@x.com", doctorName: "Carol", clinicId: "kc", role: "admin" }),
    );
  });

  it("blocks joining someone else's clinic or crafting a profile", async () => {
    const db = as("carol");
    await assertFails(setDoc(doc(db, "clinics/kx"), { name: "X", address: "", ownerUid: "alice" }));
    await assertFails(
      setDoc(doc(db, "users/carol"), { email: "c@x.com", doctorName: "Carol", clinicId: "k1", role: "admin" }),
    );
    await setDoc(doc(db, "clinics/kc"), { name: "Carol Dental", address: "C", ownerUid: "carol" });
    await assertFails(
      setDoc(doc(db, "users/carol"), { email: "c@x.com", doctorName: "Carol", clinicId: "kc", role: "demo", extra: 1 }),
    );
    await assertFails(
      setDoc(doc(db, "users/bob"), { email: "c@x.com", doctorName: "Carol", clinicId: "kc", role: "admin" }),
    );
  });
});

describe("profiles", () => {
  it("lets an admin lock themselves as demo, but not the other way round", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "users/alice"), { role: "demo" }));
    await assertFails(updateDoc(doc(as("demo"), "users/demo"), { role: "admin" }));
  });

  it("never lets a user move to another clinic", async () => {
    await assertFails(updateDoc(doc(as("alice"), "users/alice"), { clinicId: "k2" }));
  });

  it("lets users rename themselves and read only their own profile", async () => {
    await assertSucceeds(updateDoc(doc(as("alice"), "users/alice"), { doctorName: "Dr. Alice" }));
    await assertSucceeds(getDoc(doc(as("alice"), "users/alice")));
    await assertFails(getDoc(doc(as("alice"), "users/bob")));
  });
});
