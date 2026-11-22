// Pure helpers behind the date/time pickers used for birth details.
// Kept dependency-free so they can be unit-tested and reused by the app and admin.

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface TimeParts {
  hour: number; // 0-23
  minute: number; // 0-59
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Parses "YYYY-MM-DD"; returns null for anything that is not a real calendar date. */
export function parseDate(value: string | null | undefined): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month))
    return null;
  return { year, month, day };
}

export function formatDate(p: DateParts): string {
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** Keeps the day valid when the month or year changes (e.g. 31 Jan -> Feb gives 28/29). */
export function clampDate(p: DateParts): DateParts {
  return { ...p, day: Math.min(p.day, daysInMonth(p.year, p.month)) };
}

/** Parses "HH:MM" or "HH:MM:SS" (24h). */
export function parseTime(value: string | null | undefined): TimeParts | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(
    (value ?? "").trim(),
  );
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function formatTime(p: TimeParts): string {
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export interface Time12 {
  hour12: number; // 1-12
  minute: number;
  period: "AM" | "PM";
}

export function to12h(p: TimeParts): Time12 {
  const period = p.hour >= 12 ? "PM" : "AM";
  const hour12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return { hour12, minute: p.minute, period };
}

export function from12h(t: Time12): TimeParts {
  const base = t.hour12 % 12;
  return { hour: t.period === "PM" ? base + 12 : base, minute: t.minute };
}

/** Human-readable, e.g. "15 Aug 1990" / "2:30 PM". */
export function displayDate(value: string | null | undefined): string {
  const p = parseDate(value);
  return p ? `${p.day} ${MONTH_NAMES[p.month - 1].slice(0, 3)} ${p.year}` : "";
}

export function displayTime(value: string | null | undefined): string {
  const p = parseTime(value);
  if (!p) return "";
  const t = to12h(p);
  return `${t.hour12}:${pad(t.minute)} ${t.period}`;
}

/** Range check for a birth date: not in the future, not before 1900. */
export function validateBirthDate(
  value: string,
  today: Date = new Date(),
): string | null {
  const p = parseDate(value);
  if (!p) return "Please choose a valid date of birth.";
  if (p.year < 1900) return "Date of birth cannot be before 1900.";
  const asDate = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  if (asDate.getTime() > todayUtc.getTime())
    return "Date of birth cannot be in the future.";
  return null;
}

/** Inclusive year list, newest first (typical for birth years). */
export function yearRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let y = to; y >= from; y--) out.push(y);
  return out;
}
