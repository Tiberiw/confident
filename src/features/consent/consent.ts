export type Consent = "accepted" | "declined";

const KEY = "confident.analytics-consent";

/** The visitor's analytics choice, or null if they haven't chosen (or storage is blocked). */
export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Consent): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Storage blocked: the choice lasts for this page session only.
  }
}
