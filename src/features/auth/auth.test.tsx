import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { UserProfile } from "@/types/domain";
import { AuthProvider } from "./AuthProvider";
import { routes } from "@/app/router";
import * as api from "./auth.api";

vi.mock("./auth.api", () => ({
  subscribeToAuth: vi.fn(),
  getUserProfile: vi.fn(),
  signIn: vi.fn(),
  signInDemo: vi.fn(),
  signOutUser: vi.fn(),
  registerClinic: vi.fn(),
  finishClinicSetup: vi.fn(),
  demoAvailable: vi.fn(() => true),
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: {}, initAnalytics: vi.fn() }));

const mocked = vi.mocked(api);

const profile = (role: UserProfile["role"]): UserProfile => ({
  uid: "u1",
  email: "ana@example.com",
  doctorName: "Dr. Ana Pop",
  clinicId: "k1",
  role,
});

function signedInAs(p: UserProfile | null) {
  mocked.subscribeToAuth.mockImplementation((cb) => {
    cb(p ? p.uid : null);
    return () => {};
  });
  mocked.getUserProfile.mockResolvedValue(p);
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

beforeEach(() => vi.clearAllMocks());

it("sends signed-out visitors to the login page", async () => {
  signedInAs(null);
  const router = renderAt("/patients");
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/login");
});

it("shows the demo notice to demo users", async () => {
  signedInAs(profile("demo"));
  renderAt("/patients");
  expect(await screen.findByText(/You're viewing a read-only demo/)).toBeInTheDocument();
});

it("hides the demo notice from admins", async () => {
  signedInAs(profile("admin"));
  renderAt("/patients");
  expect(await screen.findByText("Dr. Ana Pop")).toBeInTheDocument();
  expect(screen.queryByText(/You're viewing a read-only demo/)).toBeNull();
});

it("explains a wrong password", async () => {
  signedInAs(null);
  mocked.signIn.mockRejectedValue({ code: "auth/invalid-credential" });
  renderAt("/login");
  await userEvent.type(await screen.findByLabelText("Email"), "ana@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText("Wrong email or password.")).toBeInTheDocument();
});

it("blocks registration when the passwords differ", async () => {
  signedInAs(null);
  renderAt("/register");
  await userEvent.type(await screen.findByLabelText("Clinic name"), "Smile Dental");
  await userEvent.type(screen.getByLabelText("Clinic address"), "Str. Lunga 1, Cluj");
  await userEvent.type(screen.getByLabelText("Your name"), "Dr. Ana Pop");
  await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "secret1");
  await userEvent.type(screen.getByLabelText("Confirm password"), "secret2");
  await userEvent.click(screen.getByRole("button", { name: "Create clinic" }));
  expect(await screen.findByText("Passwords must match")).toBeInTheDocument();
  expect(mocked.registerClinic).not.toHaveBeenCalled();
});

it("lets a login whose sign-up broke halfway finish creating its clinic", async () => {
  mocked.subscribeToAuth.mockImplementation((cb) => {
    cb("u1");
    return () => {};
  });
  mocked.getUserProfile.mockResolvedValue(null);
  renderAt("/patients");
  await userEvent.type(await screen.findByLabelText("Clinic name", {}, { timeout: 5000 }), "Smile Dental");
  await userEvent.type(screen.getByLabelText("Clinic address"), "Str. Lunga 1, Cluj");
  await userEvent.type(screen.getByLabelText("Your name"), "Dr. Ana Pop");
  mocked.getUserProfile.mockResolvedValue(profile("admin"));
  await userEvent.click(screen.getByRole("button", { name: "Create clinic" }));
  expect(mocked.finishClinicSetup).toHaveBeenCalledWith({
    clinicName: "Smile Dental",
    clinicAddress: "Str. Lunga 1, Cluj",
    doctorName: "Dr. Ana Pop",
  });
  expect(await screen.findByText("Dr. Ana Pop")).toBeInTheDocument();
}, 15000);
