const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "yyyy-MM-dd" in local time (what <input type="date"> expects). */
export const toInputDate = (d: Date | null) =>
  d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "";

/** "yyyy-MM-dd" → local Date, or null. */
export const fromInputDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** "02.11.2026", or "—" when there is no date. */
export const formatDate = (d: Date | null) =>
  d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : "—";

/** Full years since `dob`; never negative. */
export function ageFromDob(dob: Date | null, today: Date = new Date()): number | null {
  if (!dob) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return Math.max(0, age);
}

/** "yyyy-MM-dd" for file names. */
export const isoDay = (d: Date) => toInputDate(d);

/** "1 year", "42 years". */
export function formatAge(years: number): string {
  return `${years} ${years === 1 ? "year" : "years"}`;
}
