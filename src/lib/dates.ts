// Toutes les dates sont des chaînes « AAAA-MM-JJ ». Les calculs passent par l'UTC
// pour ne jamais être décalés par le changement d'heure (28 mars 2027).
export const DAY_MS = 86400000;

export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export const JOURS_INIT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseISO(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
export function toISO(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}
export function addDays(s: string, n: number): string {
  return toISO(parseISO(s) + n * DAY_MS);
}
/** a − b, en jours */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a) - parseISO(b)) / DAY_MS);
}
/** 0 = dimanche … 6 = samedi */
export function weekday(s: string): number {
  return new Date(parseISO(s)).getUTCDay();
}
export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
export function mondayOf(s: string): string {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}
export function parts(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
/** 510 → « 08h30 » ; 1470 → « 00h30 » */
export function fmtTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}h${pad(m % 60)}`;
}
/** 495 → « 8 h 15 » */
export function fmtDur(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${pad(r)}`;
}
export function fmtDate(s: string, style: 'long' | 'medium' | 'short' | 'weekday' = 'long'): string {
  const { y, m, d } = parts(s);
  const wd = weekday(s);
  const dd = d === 1 ? '1er' : String(d);
  if (style === 'long') return `${JOURS[wd]} ${dd} ${MOIS[m - 1]} ${y}`;
  if (style === 'medium') return `${JOURS_COURTS[wd]} ${dd} ${MOIS_COURTS[m - 1]}`;
  if (style === 'weekday') return JOURS[wd];
  return `${pad(d)}/${pad(m)}`;
}
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
/** « 08:30 » → 510 */
export function hhmmToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
export function minToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
