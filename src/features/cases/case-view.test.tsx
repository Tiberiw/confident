import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { emptyDetections, type Case, type Detections, type Patient, type UserProfile } from "@/types/domain";
import { useAuth } from "@/features/auth/useAuth";
import { getPatient } from "@/features/patients/patients.api";
import { getCase, updateCaseAnnotations } from "./cases.api";
import { getXRay } from "./xrays.api";
import { CaseViewPage } from "./CaseViewPage";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/features/patients/patients.api", () => ({ getPatient: vi.fn() }));
vi.mock("./cases.api", () => ({ getCase: vi.fn(), updateCaseAnnotations: vi.fn(), updateCaseReport: vi.fn() }));
vi.mock("./xrays.api", () => ({ getXRay: vi.fn() }));
vi.mock("@/lib/image-file", () => ({ loadImage: vi.fn(() => new Promise(() => {})) }));

const makeCase = (pathologies: Detections): Case => ({
  id: "c1",
  clinicId: "k1",
  patientId: "p1",
  scanDate: new Date(2026, 10, 2),
  referringDentist: "Dr. Radu Stan",
  clinicalIndication: "",
  description: "",
  radiologist: "Dr. Ana Pop",
  radiologistId: "u1",
  imageFileName: "pano.jpg",
  imageWidth: 1600,
  imageHeight: 800,
  pathologies,
  teeth: emptyDetections(),
  createdAt: null,
  updatedAt: null,
});

const caries: Detections = { boxes: [[10, 10, 50, 50], [100, 100, 150, 150]], scores: [0.86, 0.92], classes: [4, 2] };

function as(role: UserProfile["role"]) {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: "u1", email: "a@x.com", doctorName: "Dr. Ana Pop", clinicId: "k1", role },
    loading: false,
    isDemo: role === "demo",
    profileMissing: false,
    refreshProfile: vi.fn(),
  });
}

function renderCase(c: Case) {
  vi.mocked(getCase).mockResolvedValue(c);
  vi.mocked(getXRay).mockResolvedValue({ caseId: "c1", clinicId: "k1", dataUrl: "data:image/jpeg;base64,AAAA", width: 1600, height: 800 });
  vi.mocked(getPatient).mockResolvedValue({ id: "p1", firstName: "Maria", lastName: "Ionescu", dateOfBirth: new Date(1984, 2, 12) } as Patient);
  const router = createMemoryRouter([{ path: "/patients/:patientId/cases/:caseId", element: <CaseViewPage /> }], {
    initialEntries: ["/patients/p1/cases/c1"],
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateCaseAnnotations).mockResolvedValue();
});

it("shows an empty state when the AI found nothing", async () => {
  as("admin");
  renderCase(makeCase(emptyDetections()));
  expect(await screen.findByText("No findings detected")).toBeInTheDocument();
});

it("selects a finding when its row is clicked", async () => {
  as("admin");
  renderCase(makeCase(caries));
  const row = await screen.findByRole("button", { name: /Caries/ });
  await userEvent.click(row);
  expect(row).toHaveAttribute("aria-pressed", "true");
});

it("deletes the selected box and saves", async () => {
  as("admin");
  renderCase(makeCase(caries));
  await userEvent.click(await screen.findByRole("button", { name: /Caries/ }));
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() => expect(updateCaseAnnotations).toHaveBeenCalled());
  const [id, saved] = vi.mocked(updateCaseAnnotations).mock.calls[0];
  expect(id).toBe("c1");
  expect(saved.pathologies).toEqual({ boxes: [[100, 100, 150, 150]], scores: [0.92], classes: [2] });
  expect(await screen.findByText("Saved")).toBeInTheDocument();
});

it("hides editing from demo users but keeps the PDF download", async () => {
  as("demo");
  renderCase(makeCase(caries));
  const panel = await screen.findByRole("region", { name: "Findings" });
  expect(within(panel).getByRole("button", { name: /Caries/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Finding box/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Report details" })).toBeNull();
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
});

it("keeps the Findings layer hidden when one finding is picked from the list", async () => {
  as("admin");
  renderCase(makeCase(caries));
  const layer = await screen.findByRole("button", { name: "Findings" });
  expect(screen.getByRole("button", { name: "Finding box" })).toBeInTheDocument();
  await userEvent.click(layer);
  expect(layer).toHaveAttribute("aria-pressed", "false");
  const row = screen.getAllByRole("button", { name: /Caries/ })[0];
  await userEvent.click(row);
  expect(row).toHaveAttribute("aria-pressed", "true");
  expect(layer).toHaveAttribute("aria-pressed", "false");
});
