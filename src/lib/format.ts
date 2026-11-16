import { DEMO_TODAY } from "@/lib/disputes";

export const MONTHS = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
export const MONTHS_SHORT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sept", "oct", "nov", "dec"];
export const WEEKDAYS = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];
const WEEKDAYS_LONG = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function dateParts(iso: string): [number, number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
}

export function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function fmtDay(iso: string): string {
  const [, m, d] = dateParts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = dateParts(iso);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function fmtLongDate(iso: string): string {
  const [y, m, d] = dateParts(iso);
  const weekday = WEEKDAYS_LONG[new Date(y, m - 1, d).getDay()];
  return `${weekday}, ${d} ${MONTHS[m - 1].toLowerCase()}`;
}

export function fmtDateTime(iso: string): string {
  const time = iso.length >= 16 ? `, ${iso.slice(11, 16)}` : "";
  return `${fmtDate(iso)}${time}`;
}

export function fmtMonthYear(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = dateParts(iso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = dateParts(iso);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return toIso(year, month, Math.min(d, daysInMonth(year, month)));
}

export function plural(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const mod = n % 100;
  const withDe = n >= 20 && (mod === 0 || mod >= 20);
  return `${n} ${withDe ? "de " : ""}${many}`;
}

export function daysLabel(n: number): string {
  return plural(Math.abs(n), "zi", "zile");
}

export function demoNow(): string {
  const now = new Date();
  return `${DEMO_TODAY}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(" ")
    .filter((word) => /^\p{L}/u.test(word));
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function hashOf(text: string): number {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_003;
  return hash;
}
