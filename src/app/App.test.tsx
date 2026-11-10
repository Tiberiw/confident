import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("@/features/auth/auth.api", () => ({
  subscribeToAuth: (cb: (uid: string | null) => void) => {
    cb(null);
    return () => {};
  },
  getUserProfile: vi.fn(),
  demoAvailable: () => false,
}));
vi.mock("@/lib/firebase", () => ({ db: {}, auth: {}, initAnalytics: vi.fn() }));

it("renders the Confident wordmark on the sign-in page", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.getByText("Confi")).toBeInTheDocument();
});
