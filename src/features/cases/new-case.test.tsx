import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Patient } from "@/types/domain";
import { useAuth } from "@/features/auth/useAuth";
import { loadModels } from "@/ml/models";
import { analyzeXRay } from "@/ml/analyze";
import { compressImage } from "@/lib/image-compress";
import { loadImageFile } from "@/lib/image-file";
import { createCase } from "./cases.api";
import { NewCaseForm } from "./NewCaseForm";

vi.mock("@/lib/firebase", () => ({ db: {}, auth: {} }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/ml/models", () => ({ loadModels: vi.fn() }));
vi.mock("@/ml/analyze", () => ({ analyzeXRay: vi.fn() }));
vi.mock("@/lib/image-compress", () => ({ compressImage: vi.fn() }));
vi.mock("@/lib/image-file", () => ({ loadImageFile: vi.fn(), loadImage: vi.fn(() => new Promise(() => {})) }));
vi.mock("./cases.api", () => ({ createCase: vi.fn() }));

const patient = { id: "p1", clinicId: "k1", firstName: "Maria", lastName: "Ionescu" } as Patient;
const img = { naturalWidth: 2000, naturalHeight: 1000 } as HTMLImageElement;
const xray = () => new File(["x"], "pano.png", { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: "u1", email: "a@x.com", doctorName: "Dr. Ana Pop", clinicId: "k1", role: "admin" },
    loading: false,
    isDemo: false,
    profileMissing: false,
    refreshProfile: vi.fn(),
  });
  vi.mocked(loadModels).mockResolvedValue({} as never);
  vi.mocked(loadImageFile).mockResolvedValue({ img, url: "blob:x" });
  vi.mocked(analyzeXRay).mockResolvedValue({
    pathologies: { boxes: [[100, 200, 300, 400]], scores: [0.9], classes: [4] },
    teeth: { boxes: [[10, 20, 30, 40]], scores: [0.8], classes: [7] },
  });
  vi.mocked(compressImage).mockResolvedValue({ dataUrl: "data:image/jpeg;base64,AAAA", width: 1000, height: 500, scale: 0.5 });
  vi.mocked(createCase).mockResolvedValue("c9");
});

const renderForm = () => render(<NewCaseForm patient={patient} />, { wrapper: MemoryRouter });

it("enables Save only after the dentist is filled in and the analysis finished", async () => {
  renderForm();
  const save = screen.getByRole("button", { name: "Save case" });
  expect(save).toBeDisabled();
  await userEvent.upload(screen.getByLabelText(/choose an x-ray/i), xray());
  expect(await screen.findByText("1 pathology · 0 treatments · 1 tooth")).toBeInTheDocument();
  expect(save).toBeDisabled();
  await userEvent.type(screen.getByLabelText("Referring dentist"), "Dr. Radu Stan");
  expect(save).toBeEnabled();
});

it("saves boxes scaled to the stored image size", async () => {
  renderForm();
  await userEvent.upload(screen.getByLabelText(/choose an x-ray/i), xray());
  await screen.findByText(/1 pathology/);
  await userEvent.type(screen.getByLabelText("Referring dentist"), "Dr. Radu Stan");
  await userEvent.click(screen.getByRole("button", { name: "Save case" }));
  await waitFor(() => expect(createCase).toHaveBeenCalled());
  const [input, image] = vi.mocked(createCase).mock.calls[0];
  expect(input.pathologies.boxes).toEqual([[50, 100, 150, 200]]);
  expect(input.teeth.boxes).toEqual([[5, 10, 15, 20]]);
  expect(input).toMatchObject({ imageWidth: 1000, imageHeight: 500, patientId: "p1", clinicId: "k1", radiologist: "Dr. Ana Pop", referringDentist: "Dr. Radu Stan" });
  expect(image.dataUrl).toBe("data:image/jpeg;base64,AAAA");
});

it("rejects files over 12 MB without analysing them", async () => {
  renderForm();
  const big = new File(["x"], "big.png", { type: "image/png" });
  Object.defineProperty(big, "size", { value: 13 * 1024 * 1024 });
  await userEvent.upload(screen.getByLabelText(/choose an x-ray/i), big);
  expect(await screen.findByText("Please choose an image under 12 MB")).toBeInTheDocument();
  expect(analyzeXRay).not.toHaveBeenCalled();
});

it("offers a retry when the models fail to load", async () => {
  vi.mocked(loadModels).mockRejectedValueOnce(new Error("offline"));
  renderForm();
  await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
  expect(loadModels).toHaveBeenCalledTimes(2);
});
