import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initAnalytics } from "@/lib/firebase";
import { ConsentBanner } from "./ConsentBanner";
import { getConsent } from "./consent";

vi.mock("@/lib/firebase", () => ({ initAnalytics: vi.fn(async () => {}) }));

const KEY = "confident.analytics-consent";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it("asks when no choice is stored", () => {
  render(<ConsentBanner />);
  expect(screen.getByText(/We use analytics/)).toBeInTheDocument();
});

it("Accept stores the choice, starts analytics and hides the banner", async () => {
  render(<ConsentBanner />);
  await userEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(localStorage.getItem(KEY)).toBe("accepted");
  expect(initAnalytics).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/We use analytics/)).toBeNull();
});

it("Decline stores the choice without analytics", async () => {
  render(<ConsentBanner />);
  await userEvent.click(screen.getByRole("button", { name: "Decline" }));
  expect(getConsent()).toBe("declined");
  expect(initAnalytics).not.toHaveBeenCalled();
  expect(screen.queryByText(/We use analytics/)).toBeNull();
});

it("stays hidden once the visitor has declined", () => {
  localStorage.setItem(KEY, "declined");
  render(<ConsentBanner />);
  expect(screen.queryByText(/We use analytics/)).toBeNull();
});

it("still works when storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<ConsentBanner />);
  expect(screen.getByText(/We use analytics/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Decline" }));
  expect(screen.queryByText(/We use analytics/)).toBeNull();
});
