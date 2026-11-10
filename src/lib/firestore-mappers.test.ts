import { emptyDetections, type Detections, type Patient } from "@/types/domain";
import { caseFromDoc, detectionsFromFirestore, detectionsToFirestore, patientFromDoc, toDate } from "./firestore-mappers";
import { filterPatients } from "@/features/patients/patients.api";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));

describe("detections", () => {
  it("round-trips through the Firestore shape", () => {
    const d: Detections = { boxes: [[1, 2, 3, 4], [5, 6, 7, 8]], scores: [0.9, 0.5], classes: [4, 2] };
    const stored = detectionsToFirestore(d);
    expect(stored.boxes[0]).toEqual({ y1: 1, x1: 2, y2: 3, x2: 4 });
    expect(detectionsFromFirestore(stored)).toEqual(d);
  });

  it("treats missing or invalid data as empty", () => {
    expect(detectionsFromFirestore(undefined)).toEqual(emptyDetections());
    expect(detectionsFromFirestore({ boxes: "nope" })).toEqual(emptyDetections());
  });
});

describe("toDate", () => {
  it("reads Firestore timestamps", () => expect(toDate({ toDate: () => new Date(0) })).toEqual(new Date(0)));
  it("passes dates through", () => expect(toDate(new Date(5))).toEqual(new Date(5)));
  it("returns null for anything else", () => expect(toDate(undefined)).toBeNull());
});

it("caseFromDoc fills defaults", () => {
  const c = caseFromDoc("c1", { clinicId: "k", patientId: "p" });
  expect(c.id).toBe("c1");
  expect(c.pathologies).toEqual(emptyDetections());
  expect(c.referringDentist).toBe("");
  expect(c.imageWidth).toBe(0);
  expect(c.scanDate).toBeNull();
});

it("patientFromDoc fills defaults", () => {
  const p = patientFromDoc("p1", { clinicId: "k", firstName: "Maria" });
  expect(p).toMatchObject({ id: "p1", clinicId: "k", firstName: "Maria", lastName: "", dateOfBirth: null });
});

describe("filterPatients", () => {
  const maria = { firstName: "Maria", lastName: "Ionescu" } as Patient;
  const andrei = { firstName: "Andrei", lastName: "Popa" } as Patient;

  it("matches first or last name, ignoring case", () => {
    expect(filterPatients([maria, andrei], "ION")).toEqual([maria]);
    expect(filterPatients([maria, andrei], "andr")).toEqual([andrei]);
  });

  it("returns everyone for an empty term", () => {
    expect(filterPatients([maria, andrei], "  ")).toEqual([maria, andrei]);
  });
});
