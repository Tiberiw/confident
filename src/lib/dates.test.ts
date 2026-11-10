import { ageFromDob, formatDate, formatAge } from "./dates";

it("formatDate uses dd.MM.yyyy", () => {
  expect(formatDate(new Date(2026, 10, 2))).toBe("02.11.2026");
  expect(formatDate(null)).toBe("—");
});

describe("ageFromDob", () => {
  it("counts full years", () => expect(ageFromDob(new Date(1984, 2, 12), new Date(2026, 10, 7))).toBe(42));
  it("waits for the birthday", () => expect(ageFromDob(new Date(1984, 11, 25), new Date(2026, 10, 7))).toBe(41));
  it("is never negative", () => expect(ageFromDob(new Date(2030, 0, 1), new Date(2026, 10, 7))).toBe(0));
  it("is null without a date", () => expect(ageFromDob(null)).toBeNull());
});

describe("formatAge", () => {
  it("uses the singular for one year", () => expect(formatAge(1)).toBe("1 year"));
  it("uses the plural otherwise", () => {
    expect(formatAge(0)).toBe("0 years");
    expect(formatAge(42)).toBe("42 years");
  });
});
