import { addDays, parts } from './dates';
import { RECIPE_BY_ID } from '../data/recipes';
import type { Plan } from './types';

export interface IcsOptions { work: boolean; jjb: boolean; muscu: boolean; sleep: boolean; meals: boolean; alarmMin: number }

const pad = (n: number) => String(n).padStart(2, '0');
function stamp(date: string, min: number): string {
  const d = addDays(date, Math.floor(min / 1440));
  const m = ((min % 1440) + 1440) % 1440;
  const p = parts(d);
  return `${p.y}${pad(p.m)}${pad(p.d)}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Calendrier .ics (heures locales) pour obtenir des alertes natives sur le téléphone. */
export function buildIcs(plan: Plan, from: string, to: string, o: IcsOptions): string {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Luffy Performance//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Luffy Performance'];
  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  let n = 0;
  const add = (date: string, t: number, end: number, title: string, desc = '') => {
    L.push('BEGIN:VEVENT', `UID:lp-${date}-${t}-${n++}@luffy-performance`, `DTSTAMP:${now}`, `DTSTART:${stamp(date, t)}`, `DTEND:${stamp(date, end)}`, `SUMMARY:${esc(title)}`);
    if (desc) L.push(`DESCRIPTION:${esc(desc)}`);
    if (o.alarmMin > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, `TRIGGER:-PT${o.alarmMin}M`, 'END:VALARM');
    L.push('END:VEVENT');
  };
  for (const d of plan.days) {
    if (d.date < from || d.date > to) continue;
    for (const e of d.events) {
      if (e.kind === 'work' && o.work && !(e.t === 0 && d.prev === 'N')) add(d.date, e.t, e.end ?? e.t + 60, e.title, e.sub);
      if (e.kind === 'jjb' && o.jjb && e.flag !== 'conflict') add(d.date, e.t, e.end ?? e.t + 90, 'JJB', e.sub);
      if (e.kind === 'muscu' && o.muscu) add(d.date, e.t, e.end ?? e.t + 60, e.title, e.sub);
      if ((e.kind === 'bed' || e.kind === 'wake') && o.sleep) add(d.date, e.t, e.t + 15, e.title, e.sub);
      if (e.kind === 'meal' && o.meals && e.flag !== 'optional') {
        const m = d.meals.find((x) => x.key === e.ref);
        add(d.date, e.t, e.t + 20, e.title, m ? RECIPE_BY_ID[m.recipeId]?.name : '');
      }
    }
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
