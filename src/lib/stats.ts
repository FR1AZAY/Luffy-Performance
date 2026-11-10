import { addDays, fmtDate, mondayOf, parts } from './dates';
import { sleepHours } from './recovery';
import type { AppState, Plan } from './types';

export interface LiftPoint { date: string; label: string; v: number }

/** Meilleure charge (ou meilleur nombre de répétitions) par jour pour un groupe d'exercices. */
export function liftSeries(state: Pick<AppState, 'workouts' | 'perfLogs'>, exIds: string[], mode: 'weight' | 'reps'): LiftPoint[] {
  const best: Record<string, number> = {};
  const put = (date: string, v: number | null) => {
    if (v === null || !Number.isFinite(v)) return;
    best[date] = Math.max(best[date] ?? -Infinity, v);
  };
  for (const w of Object.values(state.workouts)) {
    for (const id of exIds) for (const s of w.sets[id] ?? []) if (s.done) put(w.date, mode === 'weight' ? s.w : s.r);
  }
  for (const p of state.perfLogs) if (exIds.includes(p.ex)) put(p.date, mode === 'weight' ? p.w : p.r);
  return Object.keys(best).sort().map((date) => ({ date, label: fmtDate(date, 'short'), v: best[date] }));
}

export interface WeekPoint { week: string; label: string; muscu: number; jjb: number; jjbH: number }

export function weeklyCounts(state: Pick<AppState, 'workouts' | 'jjbStatus'>, plan: Plan, today: string, weeks = 8): WeekPoint[] {
  const ref = today < plan.start ? plan.start : today > plan.end ? plan.end : today;
  const last = mondayOf(ref);
  const out: WeekPoint[] = [];
  for (let k = weeks - 1; k >= 0; k--) {
    const w0 = addDays(last, -7 * k);
    if (addDays(w0, 6) < plan.start) continue;
    const w1 = addDays(w0, 6);
    const p = parts(w0);
    const pt: WeekPoint = { week: w0, label: `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}`, muscu: 0, jjb: 0, jjbH: 0 };
    for (const w of Object.values(state.workouts)) if (w.done && w.date >= w0 && w.date <= w1) pt.muscu++;
    for (const [key, log] of Object.entries(state.jjbStatus)) {
      const d = key.split('|')[0];
      if (!log.done || d < w0 || d > w1) continue;
      pt.jjb++;
      const j = plan.byDate[d]?.jjb.find((x) => x.key === key);
      if (j) pt.jjbH += (j.effEnd - j.effStart) / 60;
    }
    pt.jjbH = Math.round(pt.jjbH * 10) / 10;
    out.push(pt);
  }
  return out;
}

export function sleepSeries(state: Pick<AppState, 'sleepLogs'>, plan: Plan, today: string, days = 14) {
  const ref = today < plan.start ? plan.start : today > plan.end ? plan.end : today;
  const out: { date: string; label: string; reel: number | null; prevu: number }[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = addDays(ref, -k);
    const day = plan.byDate[d];
    if (!day) continue;
    out.push({ date: d, label: fmtDate(d, 'short'), reel: sleepHours(state.sleepLogs[d]), prevu: Math.round((day.plannedSleepMin / 60) * 10) / 10 });
  }
  return out;
}

export function mealSeries(state: Pick<AppState, 'mealsDone'>, plan: Plan, today: string, days = 14) {
  const ref = today < plan.start ? plan.start : today > plan.end ? plan.end : today;
  const out: { date: string; label: string; pct: number | null }[] = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = addDays(ref, -k);
    const day = plan.byDate[d];
    if (!day) continue;
    const req = day.meals.filter((m) => !m.optional);
    const done = state.mealsDone[d] ?? {};
    const n = req.filter((m) => done[m.key]).length;
    out.push({ date: d, label: fmtDate(d, 'short'), pct: Object.keys(done).length ? Math.round((n / req.length) * 100) : null });
  }
  return out;
}

export interface WeekReview {
  from: string; to: string;
  muscuDone: number; muscuPlanned: number;
  jjbDone: number; jjbPlanned: number;
  sleepAvg: number | null; sleepNights: number;
  fatigueAvg: number | null;
  mealsPct: number | null;
  advice: string[];
}

/** Bilan d'une semaine (lundi → dimanche) et pistes pour la suivante. */
export function weekReview(state: AppState, plan: Plan, weekStart: string): WeekReview {
  const to = addDays(weekStart, 6);
  const r: WeekReview = { from: weekStart, to, muscuDone: 0, muscuPlanned: 0, jjbDone: 0, jjbPlanned: 0, sleepAvg: null, sleepNights: 0, fatigueAvg: null, mealsPct: null, advice: [] };
  let sleepSum = 0, fatSum = 0, fatN = 0, mealReq = 0, mealDone = 0, mealDays = 0;
  for (let k = 0; k < 7; k++) {
    const d = addDays(weekStart, k);
    const day = plan.byDate[d];
    if (!day) continue;
    r.muscuPlanned += day.muscu.filter((m) => m.kind !== 'bonus').length;
    r.jjbPlanned += day.jjb.filter((j) => j.active).length;
    r.jjbDone += day.jjb.filter((j) => j.done).length;
    const h = sleepHours(state.sleepLogs[d]);
    if (h !== null) { sleepSum += h; r.sleepNights++; }
    const f = state.sleepLogs[d]?.fatigue;
    if (f) { fatSum += f; fatN++; }
    const done = state.mealsDone[d];
    if (done && Object.keys(done).length) {
      const req = day.meals.filter((m) => !m.optional);
      mealReq += req.length; mealDone += req.filter((m) => done[m.key]).length; mealDays++;
    }
  }
  for (const w of Object.values(state.workouts)) if (w.done && w.date >= weekStart && w.date <= to) r.muscuDone++;
  if (r.sleepNights) r.sleepAvg = Math.round((sleepSum / r.sleepNights) * 10) / 10;
  if (fatN) r.fatigueAvg = Math.round((fatSum / fatN) * 10) / 10;
  if (mealDays) r.mealsPct = Math.round((mealDone / mealReq) * 100);

  if (r.sleepAvg !== null && r.sleepAvg < 7.5) r.advice.push(`Sommeil moyen de ${String(r.sleepAvg).replace('.', ',')} h : avance le coucher de 30 minutes et garde la sieste des jours de matin.`);
  if (r.fatigueAvg !== null && r.fatigueAvg >= 3.5) r.advice.push('Fatigue élevée : la semaine prochaine, passe une séance de musculation en version allégée et saute la séance bonus.');
  if (r.muscuPlanned > 0 && r.muscuDone < r.muscuPlanned) r.advice.push(`${r.muscuPlanned - r.muscuDone} séance(s) de musculation non faite(s) : reprogramme-la depuis l'onglet Musculation plutôt que de doubler une journée.`);
  if (r.mealsPct !== null && r.mealsPct < 70) r.advice.push('Repas irréguliers : prépare deux boîtes d’avance avant ta série de postes.');
  if (r.jjbPlanned > 0 && r.jjbDone >= r.jjbPlanned && r.muscuDone >= r.muscuPlanned && (r.sleepAvg ?? 8) >= 7.5) r.advice.push('Semaine complète et bien récupérée : tu peux tenter une petite hausse de charge sur un exercice si la technique est propre.');
  if (!r.advice.length) r.advice.push(r.sleepNights || r.muscuDone || r.jjbDone ? 'Rythme correct : continue sur la même base la semaine prochaine.' : 'Aucune donnée cette semaine : valide tes séances, repas et nuits pour obtenir un bilan.');
  return r;
}
