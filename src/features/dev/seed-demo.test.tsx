import { render, screen } from "@testing-library/react";
import { useAuth } from "@/features/auth/useAuth";
import { listPatients } from "@/features/patients/patients.api";
import type { Patient } from "@/types/domain";
import SeedDemoPage from "./SeedDemoPage";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/features/auth/auth.api", () => ({ lockAsDemo: vi.fn() }));
vi.mock("@/features/patients/patients.api", () => ({ listPatients: vi.fn(), createPatient: vi.fn() }));
vi.mock("@/features/cases/cases.api", () => ({ createCase: vi.fn() }));
vi.mock("@/features/clinic/clinic.api", () => ({ getClinic: vi.fn(), updateClinic: vi.fn() }));
vi.mock("@/ml/analyze", () => ({ analyzeXRay: vi.fn() }));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: "u1", email: "test@demo.com", doctorName: "Dr. Ana Pop", clinicId: "k1", role: "admin" },
    loading: false,
    isDemo: false,
    profileMissing: false,
    refreshProfile: vi.fn(),
  });
});

it("lets a clinic seeded earlier be locked after coming back to the page", async () => {
  vi.mocked(listPatients).mockResolvedValue([{ id: "p1" } as Patient, { id: "p2" } as Patient]);
  render(<SeedDemoPage />);
  expect(await screen.findByRole("button", { name: "Lock as demo" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Seed demo clinic" })).toBeDisabled();
  expect(screen.queryByText(/Use a fresh account/)).not.toBeInTheDocument();
  expect(screen.getByText(/already has 2 patients/)).toBeInTheDocument();
});

it("keeps Lock off for an empty clinic until it is seeded", async () => {
  vi.mocked(listPatients).mockResolvedValue([]);
  render(<SeedDemoPage />);
  expect(await screen.findByRole("button", { name: "Lock as demo" })).toBeDisabled();
});
