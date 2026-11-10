import { addDays, hhmmToMin } from './dates';
import type { AppState, MuscuSession, Plan, SleepLog } from './types';

/** Heures réellement dormies (nuit + siestes), ou null si rien n'est renseigné. */
export function sleepHours(log?: SleepLog): number | null {
  if (!log) return null;
  const b = hhmmToMin(log.bed ?? ''), w = hhmmToMin(log.wake ?? '');
  let h = 0, has = false;
  if (b !== null && w !== null) {
    let m = w - b;
    if (m <= 0) m += 1440;
    h += m / 60;
    has = true;
  }
  if (log.napMin) { h += log.napMin / 60; has = true; }
  return has ? Math.round(h * 100) / 100 : null;
}

export type RecoveryLevel = 'bonne' | 'moyenne' | 'insuffisante' | 'inconnue';
export interface Recovery { score: number | null; level: RecoveryLevel; advice: string; lastSleepH: number | null; plannedH: number }

const ADVICE: Record<RecoveryLevel, string> = {
  bonne: 'Feu vert : séance complète possible, et la séance courte bonus si elle est prévue.',
  moyenne: 'Séance maintenue, mais garde 3 répétitions en réserve et saute la séance bonus.',
  insuffisante: 'Priorité au sommeil : allège ou déplace la musculation, et ajoute une sieste si tu peux.',
  inconnue: 'Renseigne ton sommeil et ta fatigue pour obtenir une recommandation.',
};

export function recoveryFor(date: string, state: Pick<AppState, 'sleepLogs'>, plan: Plan): Recovery {
  const plannedH = (plan.byDate[date]?.plannedSleepMin ?? 480) / 60;
  const weights = [0.5, 0.3, 0.2];
  let sum = 0, wsum = 0;
  let lastSleepH: number | null = null;
  let latest: SleepLog | undefined;
  for (let k = 0; k < 3; k++) {
    const dt = addDays(date, -k);
    const log = state.sleepLogs[dt];
    if (!log) continue;
    const h = sleepHours(log);
    if (h === null && log.quality === undefined && log.fatigue === undefined) continue;
    const target = Math.max(6.5, Math.min(8, (plan.byDate[dt]?.plannedSleepMin ?? 480) / 60));
    const ratio = h === null ? 0.85 : Math.min(1, h / target);
    const q = ((log.quality ?? 3) - 1) / 4;
    const f = (5 - (log.fatigue ?? 3)) / 4;
    sum += weights[k] * 100 * (0.5 * ratio + 0.2 * q + 0.3 * f);
    wsum += weights[k];
    if (k === 0) { lastSleepH = h; latest = log; }
  }
  if (wsum === 0) return { score: null, level: 'inconnue', advice: ADVICE.inconnue, lastSleepH: null, plannedH };
  let score = Math.round(sum / wsum);
  if (lastSleepH !== null && lastSleepH < 6) score = Math.min(score, 48);
  if (latest?.fatigue === 5) score = Math.min(score, 48);
  else if (latest?.fatigue === 4) score = Math.min(score, 66);
  const level: RecoveryLevel = score >= 72 ? 'bonne' : score >= 52 ? 'moyenne' : 'insuffisante';
  return { score, level, advice: ADVICE[level], lastSleepH, plannedH };
}

/** JJB « particulièrement intense » : au moins 2 séances notées 4 ou 5 en moyenne sur 7 jours. */
export function jjbLoadHigh(state: Pick<AppState, 'jjbStatus'>, date: string): boolean {
  const from = addDays(date, -7);
  const vals: number[] = [];
  for (const [key, log] of Object.entries(state.jjbStatus)) {
    const d = key.split('|')[0];
    if (log.done && log.intensity && d > from && d <= date) vals.push(log.intensity);
  }
  return vals.length >= 2 && vals.reduce((a, b) => a + b, 0) / vals.length >= 4;
}

export interface SessionAdvice { light: boolean; auto: boolean; reasons: string[]; suggestMove: boolean }

export function sessionAdvice(s: MuscuSession, state: AppState, plan: Plan, today: string): SessionAdvice {
  const reasons: string[] = [];
  let suggestMove = false;
  if (s.warn) reasons.push('Lendemain de nuit de travail');
  if (jjbLoadHigh(state, s.date <= today ? s.date : today)) reasons.push('JJB très intense ces 7 derniers jours');
  if (s.date === today) {
    const rec = recoveryFor(today, state, plan);
    if (rec.level === 'insuffisante') { reasons.push('Récupération insuffisante'); suggestMove = true; }
  }
  const mode = state.muscuMode[s.id];
  const light = mode ? mode === 'light' : reasons.length > 0;
  return { light, auto: !mode, reasons, suggestMove };
}
