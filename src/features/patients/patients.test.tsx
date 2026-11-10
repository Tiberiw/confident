import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { emptyDetections, type Case, type Patient, type UserProfile } from "@/types/domain";
import { useAuth } from "@/features/auth/useAuth";
import { listPatients } from "./patients.api";
import { PatientListPage } from "./PatientListPage";
import { CaseHistoryTable } from "./CaseHistoryTable";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("./patients.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./patients.api")>()),
  listPatients: vi.fn(),
}));

const patient = (id: string, firstName: string, lastName: string): Patient => ({
  id,
  clinicId: "k1",
  firstName,
  lastName,
  gender: "F",
  email: "",
  phoneNumber: "",
  dateOfBirth: new Date(1984, 2, 12),
  address: "",
  notes: "",
  createdAt: null,
  updatedAt: null,
});

function as(role: UserProfile["role"]) {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: "u1", email: "a@x.com", doctorName: "Dr. Ana", clinicId: "k1", role },
    loading: false,
    isDemo: role === "demo",
    profileMissing: false,
    refreshProfile: vi.fn(),
  });
}

describe("PatientListPage", () => {
  beforeEach(() => {
    vi.mocked(listPatients).mockResolvedValue([patient("1", "Maria", "Ionescu"), patient("2", "Andrei", "Popa")]);
  });

  it("filters rows by name", async () => {
    as("admin");
    render(<PatientListPage />, { wrapper: MemoryRouter });
    expect(await screen.findByText("Popa, Andrei")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search patients" }), "ion");
    expect(screen.getByText("Ionescu, Maria")).toBeInTheDocument();
    expect(screen.queryByText("Popa, Andrei")).toBeNull();
  });

  it("hides New patient from demo users", async () => {
    as("demo");
    render(<PatientListPage />, { wrapper: MemoryRouter });
    expect(await screen.findByText("Popa, Andrei")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new patient/i })).toBeNull();
  });

  it("offers New patient to admins", async () => {
    as("admin");
    render(<PatientListPage />, { wrapper: MemoryRouter });
    expect(await screen.findByRole("link", { name: /new patient/i })).toBeInTheDocument();
  });
});

it("CaseHistoryTable counts pathologies and treatments separately", () => {
  const c: Case = {
    id: "c1",
    clinicId: "k1",
    patientId: "1",
    scanDate: new Date(2026, 10, 2),
    referringDentist: "Dr. Radu Stan",
    clinicalIndication: "",
    description: "",
    radiologist: "",
    radiologistId: "",
    imageFileName: "",
    imageWidth: 100,
    imageHeight: 50,
    // Caries, Periodontal Bone Loss, Periapical Lesion + Dental Filling (treatment)
    pathologies: { boxes: [[0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]], scores: [1, 1, 1, 1], classes: [4, 5, 7, 2] },
    teeth: emptyDetections(),
    createdAt: null,
    updatedAt: null,
  };
  render(<CaseHistoryTable cases={[c]} canDelete={false} onOpen={() => {}} onDelete={async () => {}} />);
  expect(screen.getByText("3 pathologies")).toBeInTheDocument();
  expect(screen.getByText("1 treatment")).toBeInTheDocument();
  expect(screen.getByText("02.11.2026")).toBeInTheDocument();
});

it("CaseHistoryTable says No findings when the AI found nothing", () => {
  const c = { id: "c2", clinicId: "k1", patientId: "1", scanDate: new Date(2026, 10, 3), pathologies: emptyDetections(), teeth: emptyDetections() } as Case;
  render(<CaseHistoryTable cases={[c]} canDelete={false} onOpen={() => {}} onDelete={async () => {}} />);
  expect(screen.getByText("No findings")).toBeInTheDocument();
  expect(screen.queryByText(/treatment/)).not.toBeInTheDocument();
});
