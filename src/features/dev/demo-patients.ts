import type { PatientInput } from "@/types/domain";

/** Fictional patients for the public demo clinic. Any resemblance to real people is coincidental. */
export const DEMO_PATIENTS: PatientInput[] = [
  { firstName: "Maria", lastName: "Ionescu", gender: "F", dateOfBirth: new Date(1984, 2, 12), email: "maria.ionescu@example.com", phoneNumber: "+40 700 000 001", address: "Str. Florilor 12, Cluj-Napoca", notes: "Routine check-up. Sensitive to cold on the upper right side." },
  { firstName: "Andrei", lastName: "Popescu", gender: "M", dateOfBirth: new Date(1979, 6, 22), email: "andrei.popescu@example.com", phoneNumber: "+40 700 000 002", address: "Bd. Eroilor 4, Brașov", notes: "Implant consultation." },
  { firstName: "Elena", lastName: "Dumitrescu", gender: "F", dateOfBirth: new Date(1991, 10, 5), email: "elena.dumitrescu@example.com", phoneNumber: "+40 700 000 003", address: "Str. Lalelelor 7, Iași", notes: "" },
  { firstName: "Mihai", lastName: "Constantinescu", gender: "M", dateOfBirth: new Date(1968, 0, 30), email: "mihai.constantinescu@example.com", phoneNumber: "+40 700 000 004", address: "Calea Victoriei 101, București", notes: "Periodontal follow-up every 6 months." },
  { firstName: "Ioana", lastName: "Stan", gender: "F", dateOfBirth: new Date(2002, 4, 18), email: "ioana.stan@example.com", phoneNumber: "+40 700 000 005", address: "Str. Mării 3, Constanța", notes: "Orthodontic evaluation." },
  { firstName: "Radu", lastName: "Marinescu", gender: "M", dateOfBirth: new Date(1955, 8, 9), email: "radu.marinescu@example.com", phoneNumber: "+40 700 000 006", address: "Str. Republicii 20, Timișoara", notes: "" },
];
