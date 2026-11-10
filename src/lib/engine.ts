// Moteur de planning : logique pure, sans React, testée dans tests/engine.test.ts.
import { addDays, diffDays, fmtDur, fmtTime, weekday } from './dates';
import { RECIPE_BY_ID, recipesFor } from '../data/recipes';
import type {
  AppState, Block, DayPlan, JjbPlan, MealSlot, MuscuSession, Plan, SessionType, Settings, Shift, TimelineEvent,
} from './types';

export const CYCLE: Shift[] = ['M', 'M', 'A', 'A', 'N', 'N', 'R', 'R', 'R', 'R'];
export const SHIFT_NAME: Record<Shift, string> = { M: 'Matin', A: 'Après-midi', N: 'Nuit', R: 'Repos' };
const TYPES: SessionType[] = ['A', 'B', 'C'];

export type PlanInput = Pick<AppState, 'settings' | 'anchors' | 'shiftOverrides' | 'jjbStatus' | 'muscuMoves' | 'muscuSkipped' | 'extraSessions' | 'mealSwaps'>;

/** Poste d'une date : cycle 5x8 depuis le dernier point d'ancrage, sauf exception ponctuelle. */
export function shiftOn(date: string, anchors: { date: string; pos: number }[], overrides: Record<string, Shift>) {
  let a = anchors[0];
  for (const x of anchors) if (x.date <= date) a = x;
  const pos = (((a.pos + diffDays(date, a.date)) % 10) + 10) % 10;
  const ov = overrides[date];
  return { shift: ov ?? CYCLE[pos], cyclePos: pos + 1, overridden: ov !== undefined };
}

export function shiftHours(s: Shift, st: Settings): string {
  if (s === 'R') return 'Journée libre';
  const [a, b] = st.shiftTimes[s];
  return `${fmtTime(a)} – ${fmtTime(b)}`;
}

function minus(slot: Block, blocked: Block[]): Block[] {
  let free = [slot];
  for (const b of blocked) {
    free = free.flatMap((f) =>
      b.end <= f.start || b.start >= f.end
        ? [f]
        : [{ start: f.start, end: Math.min(f.end, b.start) }, { start: Math.max(f.start, b.end), end: f.end }].filter((x) => x.end > x.start),
    );
  }
  return free;
}
const overlap = (a: Block, b: Block) => a.start < b.end && b.start < a.end;
const hashKey = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);

export function buildPlan(inp: PlanInput): Plan {
  const st = inp.settings;
  const start = st.programStart;
  const end = st.programEnd;
  const n = diffDays(end, start) + 1;
  const T = st.shiftTimes;
  const sl = st.sleep;
  const tr = st.travel;
  const dateAt = (i: number) => addDays(start, i);

  // ——— 1. Postes ———
  const infos = Array.from({ length: n + 2 }, (_, k) => shiftOn(dateAt(k - 1), inp.anchors, inp.shiftOverrides));
  const S = (i: number): Shift => infos[Math.max(0, Math.min(n + 1, i + 1))].shift;

  const workBlocks = (i: number): Block[] => {
    const out: Block[] = [];
    if (S(i - 1) === 'N') out.push({ start: 0, end: T.N[1] - 1440 });
    const s = S(i);
    if (s === 'M') out.push({ start: T.M[0], end: T.M[1] });
    if (s === 'A') out.push({ start: T.A[0], end: T.A[1] });
    if (s === 'N') out.push({ start: T.N[0], end: 1440 });
    return out;
  };

  // ——— 2. Sommeil : réveil et coucher dépendent du poste du jour ET du lendemain ———
  const wake: number[] = [];
  const bed: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const prev = S(i - 1), s = S(i), next = S(i + 1);
    wake[i] = prev === 'N' ? (s === 'N' ? sl.nightSleepEnd : sl.postNightWake) : s === 'M' ? sl.wakeM : sl.wakeDefault;
    let b: number | null = s === 'N' ? null : next === 'M' ? sl.bedBeforeM : s === 'A' ? sl.bedA : sl.bedR;
    if (b !== null && s === 'A') b = Math.max(b, T.A[1] + 60);
    bed[i] = b;
  }
  const cancelled = (date: string, slotId: string) => inp.jjbStatus[`${date}|${slotId}`]?.decision === 'cancelled';
  // Un créneau de JJB matinal (samedi 08h) avance le réveil, sans jamais descendre sous le minimum de sommeil.
  for (let i = 0; i < n; i++) {
    if (S(i - 1) === 'N' || S(i) === 'M') continue;
    const date = dateAt(i);
    const wd = weekday(date);
    const early = st.jjbSlots.filter((x) => x.enabled && x.weekday === wd && x.start < wake[i] + 60 && !cancelled(date, x.id));
    if (!early.length) continue;
    const desired = Math.min(...early.map((x) => x.start)) - 75;
    const prevS = S(i - 1);
    const prevBedFloor = prevS === 'A' ? Math.max(sl.bedA, T.A[1] + 60) : 1350;
    const earliest = prevBedFloor + sl.minHours * 60 - 1440;
    const w = Math.min(wake[i], Math.max(desired, earliest));
    wake[i] = w;
    if (i > 0 && bed[i - 1] !== null && prevS !== 'A') bed[i - 1] = Math.min(bed[i - 1] as number, w + 1440 - sl.minHours * 60 - 15);
  }

  const days: DayPlan[] = [];
  for (let i = 0; i < n; i++) {
    const date = dateAt(i);
    const info = infos[i + 1];
    const prev = S(i - 1), s = S(i), next = S(i + 1);
    const prevBed = i > 0 ? bed[i - 1] : s === 'M' ? sl.bedBeforeM : sl.bedR;
    const mainSleep = prev === 'N' ? { start: sl.nightSleepStart, end: wake[i] } : null;
    const mainSleepMin = prev === 'N' ? wake[i] - sl.nightSleepStart : wake[i] + 1440 - (prevBed ?? sl.bedR);
    days.push({
      date, idx: i, weekday: weekday(date), shift: s, prev, next, cyclePos: info.cyclePos, overridden: info.overridden,
      work: workBlocks(i), workLabel: shiftHours(s, st), wake: wake[i], bed: bed[i], mainSleep, nap: null,
      plannedSleepMin: mainSleepMin, jjb: [], muscu: [], meals: [], events: [], conflicts: [], recoveryGapH: null, muscuScore: 0,
    });
  }

  // ——— 3. JJB : chaque créneau est évalué, jamais supprimé en silence ———
  for (const d of days) {
    const blocked: (Block & { why: string })[] = [];
    for (const w of d.work) {
      const isSpill = w.start === 0 && d.prev === 'N';
      const label = isSpill ? `ton poste de nuit (fin à ${fmtTime(w.end)})` : `ton poste ${d.shift === 'A' ? "d'après-midi" : d.shift === 'M' ? 'du matin' : 'de nuit'} (${d.workLabel})`;
      blocked.push({ ...w, why: `Chevauche ${label}` });
      if (w.start > 0) blocked.push({ start: w.start - tr.beforeWork, end: w.start, why: `Se termine moins de ${fmtDur(tr.beforeWork)} avant la prise de poste de ${fmtTime(w.start)}` });
      if (w.end < 1440) blocked.push({ start: w.end, end: w.end + tr.afterWork, why: `Commence moins de ${fmtDur(tr.afterWork)} après la fin de poste de ${fmtTime(w.end)}` });
    }
    if (d.mainSleep) blocked.push({ start: d.mainSleep.start, end: d.wake + 60, why: `Empiète sur ton sommeil après la nuit (réveil prévu à ${fmtTime(d.wake)})` });
    else blocked.push({ start: 0, end: d.wake + 60, why: `Trop tôt après le réveil de ${fmtTime(d.wake)} : le sommeil passe avant` });
    if (d.bed !== null) blocked.push({ start: d.bed - tr.jjbHome - 45, end: 4000, why: `Retour trop tardif pour un coucher à ${fmtTime(d.bed)}` });

    for (const slot of st.jjbSlots) {
      if (!slot.enabled || slot.weekday !== d.weekday) continue;
      const key = `${d.date}|${slot.id}`;
      const log = inp.jjbStatus[key] ?? {};
      const full: Block = { start: slot.start, end: slot.end };
      const free = minus(full, blocked).sort((a, b) => b.end - b.start - (a.end - a.start));
      const best = free[0];
      const reasons = [...new Set(blocked.filter((b) => overlap(b, full)).map((b) => b.why))];
      let status: JjbPlan['status'] = 'conflict';
      let window: [number, number] | null = null;
      if (best && best.start === full.start && best.end === full.end) status = 'ok';
      else if (best) {
        const lo = Math.ceil(best.start / 5) * 5, hi = Math.floor(best.end / 5) * 5;
        if (hi - lo >= 90) { status = 'partial'; window = [lo, hi]; }
      }
      let caution: string | undefined;
      if (d.prev === 'N') caution = 'Lendemain de nuit : séance optionnelle, seulement si tu as bien dormi.';
      else if (d.shift === 'N') caution = 'Avant une nuit de travail : garde de l’énergie, privilégie la technique.';
      const forced = log.decision === 'forced';
      const active = log.decision === 'cancelled' ? false : status === 'conflict' ? forced : true;
      const eff: [number, number] = forced || status !== 'partial' || !window ? [slot.start, slot.end] : window;
      d.jjb.push({ key, slotId: slot.id, start: slot.start, end: slot.end, status, window, reasons, caution, decision: log.decision, done: !!log.done, active, effStart: eff[0], effEnd: eff[1] });
    }
    d.jjb.sort((a, b) => a.start - b.start);
  }

  // ——— 4. Sieste conseillée ———
  for (const d of days) {
    const mornJ = d.jjb.filter((j) => j.active && j.effStart < 720);
    if (d.prev !== 'N' && d.shift === 'N') {
      const s0 = Math.max(870, ...mornJ.map((j) => j.effEnd + 120));
      d.nap = { start: s0, dur: 90, label: 'Sieste avant la nuit' };
    } else if (d.prev !== 'N' && d.plannedSleepMin < sl.minHours * 60) {
      d.nap = { start: d.shift === 'M' ? T.M[1] + 45 : 840, dur: 30, label: 'Sieste courte' };
    }
    if (d.nap) d.plannedSleepMin += d.nap.dur;
    if (d.prev === 'N' && d.shift !== 'N') d.sleepNote = `Sommeil raccourci après la dernière nuit pour retrouver un rythme de jour : coucher ce soir à ${fmtTime(d.bed ?? sl.bedR)}.`;
  }

  // ——— 5. Musculation : 2 séances principales par cycle de 10 jours + 1 bonus courte ———
  const score = (d: DayPlan): number => {
    if (d.prev === 'N') return 0; // jamais de séance lourde après une nuit de travail
    const eve = d.jjb.some((j) => j.active && j.effStart >= 900);
    const morn = d.jjb.some((j) => j.active && j.effStart < 720);
    if (d.shift === 'A') return morn ? 25 : 85;
    if (d.shift === 'R') return (d.next === 'M' ? 55 : 90) - (morn ? 45 : eve ? 15 : 0);
    if (d.shift === 'M') return eve ? 15 : 45;
    return eve ? 30 : morn ? 20 : 50; // première nuit
  };
  for (const d of days) d.muscuScore = score(d);

  const sessions: MuscuSession[] = [];
  let seq = 0;
  let lastMain = -10;
  const nWin = Math.ceil(n / 10);
  for (let w = 0; w < nWin; w++) {
    const lo = w * 10, hi = Math.min(n, lo + 10);
    const deload = w % 4 === 3;
    const ok = (i: number) => days[i].muscuScore >= 15 && i - lastMain >= 2;
    let mains: number[] = [];
    if (hi - lo >= 6) {
      let bestV = -1e9;
      for (let i = lo; i < hi; i++) for (let j = i + 2; j < hi; j++) {
        if (!ok(i) || days[j].muscuScore < 15) continue;
        const v = days[i].muscuScore + days[j].muscuScore - 6 * Math.abs(j - i - 5) - (i - lastMain < 3 ? 10 : 0);
        if (v > bestV) { bestV = v; mains = [i, j]; }
      }
    }
    if (!mains.length) {
      let bi = -1;
      for (let i = lo; i < hi; i++) if (ok(i) && days[i].muscuScore >= 30 && (bi < 0 || days[i].muscuScore > days[bi].muscuScore)) bi = i;
      if (bi >= 0) mains = [bi];
    }
    mains.forEach((i, k) => {
      sessions.push(mkSession(`c${w + 1}-s${k + 1}`, w, 'main', TYPES[seq % 3], days[i].date, deload));
      seq++;
    });
    if (mains.length) lastMain = mains[mains.length - 1];
    if (mains.length === 2 && !deload) {
      let bi = -1;
      for (let i = lo; i < hi; i++) {
        if (days[i].muscuScore < 30 || mains.some((m) => Math.abs(m - i) < 2)) continue;
        if (bi < 0 || days[i].muscuScore >= days[bi].muscuScore) bi = i;
      }
      if (bi >= 0) sessions.push(mkSession(`c${w + 1}-bonus`, w, 'bonus', TYPES[seq % 3], days[bi].date, false));
    }
  }
  for (const x of inp.extraSessions) {
    if (x.date >= start && x.date <= end) sessions.push(mkSession(x.id, -1, 'libre', x.type, x.date, false));
  }
  function mkSession(id: string, window: number, kind: MuscuSession['kind'], type: SessionType, baseDate: string, deload: boolean): MuscuSession {
    const mv = inp.muscuMoves[id];
    const date = mv && mv >= start && mv <= end ? mv : baseDate;
    return { id, window, kind, type, baseDate, date, moved: date !== baseDate, skipped: !!inp.muscuSkipped[id], deload, start: 600, dur: kind === 'bonus' ? 35 : 60 };
  }

  const byDate: Record<string, DayPlan> = {};
  for (const d of days) byDate[d.date] = d;

  const CANDIDATES = (d: DayPlan): number[] =>
    d.prev === 'N' ? [990, 1020, 1050] : d.shift === 'A' ? [570, 600, 540] : d.shift === 'M' ? [945, 930, 960] : d.shift === 'N' ? [630, 600, 660] : [600, 960, 1020, 900];
  for (const s of sessions) {
    const d = byDate[s.date];
    const busy: Block[] = [
      ...d.work,
      ...d.jjb.filter((j) => j.active).map((j) => ({ start: j.effStart - 90, end: j.effEnd + 90 })),
      { start: 0, end: d.wake + 45 },
      ...(d.mainSleep ? [{ start: d.mainSleep.start, end: d.wake + 45 }] : []),
      ...(d.bed !== null ? [{ start: d.bed - 60, end: 4000 }] : []),
      ...(d.shift === 'N' ? [{ start: T.N[0] - 120, end: 1440 }] : []),
      ...d.muscu.map((m) => ({ start: m.start - 60, end: m.start + m.dur + 60 })),
    ];
    const cands = CANDIDATES(d);
    const pick = cands.find((c) => !busy.some((b) => overlap(b, { start: c, end: c + s.dur })));
    s.start = pick ?? cands[0];
    if (pick === undefined) s.conflict = 'Aucun créneau libre ce jour-là sans chevaucher le travail, le JJB ou le sommeil.';
    if (d.prev === 'N') s.warn = 'Lendemain de nuit : pas de séance lourde. Fais-la en version allégée ou déplace-la.';
    if (!s.skipped) d.muscu.push(s);
  }
  sessions.sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1));

  // ——— 6. Repas, frise de la journée, conflits ———
  for (const d of days) {
    d.meals = buildMeals(d, st, inp.mealSwaps);
    d.events = buildEvents(d, st, days[d.idx + 1]);
    for (const j of d.jjb) {
      if (j.decision === 'cancelled') continue;
      if (j.status === 'conflict') d.conflicts.push(`JJB ${fmtTime(j.start)} – ${fmtTime(j.end)} : ${j.reasons[0] ?? 'créneau incompatible'}`);
    }
    for (const m of d.muscu) if (m.conflict) d.conflicts.push(`Musculation : ${m.conflict}`);
    if (d.mainSleep && d.work.some((w) => overlap(w, d.mainSleep as Block))) d.conflicts.push('Ton poste chevauche le sommeil de récupération après la nuit.');
    if (d.prev !== 'N' && d.plannedSleepMin < 390) d.conflicts.push(`Sommeil prévu trop court (${fmtDur(d.plannedSleepMin)}).`);
  }

  // ——— 7. Temps de récupération entre deux entraînements ———
  const trainings: { abs: number; end: number; day: number }[] = [];
  for (const d of days) {
    for (const j of d.jjb) if (j.active) trainings.push({ abs: d.idx * 1440 + j.effStart, end: d.idx * 1440 + j.effEnd, day: d.idx });
    for (const m of d.muscu) if (m.kind !== 'bonus') trainings.push({ abs: d.idx * 1440 + m.start, end: d.idx * 1440 + m.start + m.dur, day: d.idx });
  }
  trainings.sort((a, b) => a.abs - b.abs);
  for (const d of days) {
    const mine = trainings.filter((x) => x.day === d.idx);
    if (!mine.length) continue;
    const last = mine[mine.length - 1];
    const nx = trainings.find((x) => x.day > d.idx);
    if (nx) d.recoveryGapH = Math.round(((nx.abs - last.end) / 60) * 2) / 2;
  }

  return { days, byDate, sessions, start, end };
}

function buildMeals(d: DayPlan, st: Settings, swaps: Record<string, string>): MealSlot[] {
  type Raw = Omit<MealSlot, 'recipeId'>;
  const out: Raw[] = [];
  const add = (key: string, t: number, label: string, tags: string[], extra: Partial<Raw> = {}) =>
    out.push({ key, t, label, tags, snack: tags[0] === 'col', ...extra });
  const eve = d.jjb.find((j) => j.active && j.effStart >= 900);
  const morn = d.jjb.find((j) => j.active && j.effStart < 720);
  const home = st.travel.jjbHome + 15;
  const preSnack = eve ? Math.max(eve.effStart - 75, d.wake + 60) : 0;

  if (d.prev === 'N') {
    add('nuit-repas', 30, 'Repas au travail', ['box'], { atWork: true });
    add('nuit-col', 240, 'Collation au travail', ['col'], { atWork: true });
    add('pdj', 420, 'Petit-déjeuner léger', ['pdjLeger']);
    add('dej', d.shift === 'N' ? d.wake : d.wake + 30, 'Repas au réveil', ['repas', 'box']);
    add('col2', eve ? preSnack : d.shift === 'N' ? 1110 : 1020, eve ? 'Collation avant le JJB' : 'Collation', ['col']);
    add('diner', eve ? eve.effEnd + home : d.shift === 'N' ? 1200 : 1170, d.shift === 'N' ? 'Repas avant le travail' : eve ? 'Dîner après le JJB' : 'Dîner', ['repas', 'box']);
  } else if (d.shift === 'M') {
    add('pdj', d.wake + 15, 'Petit-déjeuner', ['pdj']);
    add('col1', 510, 'Collation au travail', ['col'], { atWork: true });
    add('travail', 690, 'Repas au travail', ['box'], { atWork: true });
    add('col2', 900, 'Collation', ['col']);
    if (eve) {
      add('prejjb', eve.effStart - 60, 'Repas avant le JJB', ['pre']);
      add('diner', eve.effEnd + home, 'Dîner après le JJB', ['repas', 'box']);
    } else add('diner', Math.min(1125, (d.bed ?? 1380) - 120), 'Dîner', ['repas', 'box']);
  } else if (d.shift === 'A') {
    add('pdj', morn ? d.wake + 15 : d.wake, 'Petit-déjeuner', ['pdj']);
    add('col1', morn ? morn.effStart + 120 : 630, morn ? 'Collation pendant l’entraînement' : 'Collation', ['col']);
    add('dej', morn ? morn.effEnd + 25 : 720, 'Déjeuner', ['repas', 'box']);
    add('travail', 990, 'Repas au travail', ['box'], { atWork: true });
    add('col2', 1170, 'Collation au travail', ['col'], { atWork: true });
    add('leger', 1380, 'Repas léger si faim', ['leger'], { optional: true });
  } else if (d.shift === 'N') {
    add('pdj', morn ? d.wake + 15 : d.wake + 30, 'Petit-déjeuner', ['pdj']);
    if (morn) add('col1', morn.effStart + 120, 'Collation pendant l’entraînement', ['col']);
    add('dej', morn ? morn.effEnd + 45 : 750, 'Déjeuner', ['repas', 'box']);
    add('col2', eve ? preSnack : 1110, eve ? 'Collation avant le JJB' : 'Collation', ['col']);
    add('diner', eve ? eve.effEnd + home : 1200, 'Repas avant le travail', ['repas', 'box']);
  } else {
    add('pdj', morn ? d.wake + 15 : d.wake + 30, 'Petit-déjeuner', ['pdj']);
    if (morn) add('col1', morn.effStart + 150, 'Collation pendant l’entraînement', ['col']);
    add('dej', morn ? morn.effEnd + 45 : 750, 'Déjeuner', ['repas', 'box']);
    add('col2', eve ? preSnack : 960, eve ? 'Collation avant le JJB' : 'Collation', ['col']);
    add('diner', eve ? eve.effEnd + home : d.next === 'M' ? 1140 : 1170, eve ? 'Dîner après le JJB' : 'Dîner', ['repas', 'box']);
  }
  out.sort((a, b) => a.t - b.t);

  // Attribution des plats : rotation déterministe, pas deux fois le même plat dans la journée.
  // Les deux jours d'un même poste partagent la même boîte au travail (une seule préparation).
  const used = new Set<string>();
  const pairBase = d.idx - ((d.cyclePos - 1) % 2);
  return out.map((s, k) => {
    const swap = swaps[`${d.date}|${s.key}`];
    let id = swap && RECIPE_BY_ID[swap] ? swap : '';
    if (!id) {
      const pool = recipesFor(s.tags);
      const seed = s.atWork && s.tags[0] === 'box' ? pairBase * 13 + hashKey(s.key) : d.idx * 13 + k * 5 + hashKey(s.key);
      const j = ((seed % pool.length) + pool.length) % pool.length;
      id = pool[j].id;
      for (let c = 0; c < pool.length; c++) {
        const cand = pool[(j + c) % pool.length];
        if (!used.has(cand.id)) { id = cand.id; break; }
      }
    }
    used.add(id);
    return { ...s, recipeId: id };
  });
}

function buildEvents(d: DayPlan, st: Settings, nextDay?: DayPlan): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  const T = st.shiftTimes;
  if (d.prev === 'N') {
    ev.push({ t: 0, end: T.N[1] - 1440, kind: 'work', title: 'Poste de nuit', sub: `fin à ${fmtTime(T.N[1])}` });
    if (d.mainSleep) ev.push({ t: d.mainSleep.start, end: d.mainSleep.end, kind: 'sleep', title: 'Sommeil de récupération', sub: fmtDur(d.mainSleep.end - d.mainSleep.start) });
  }
  ev.push({ t: d.wake, kind: 'wake', title: 'Réveil' });
  if (d.shift !== 'R') ev.push({ t: T[d.shift][0], end: T[d.shift][1], kind: 'work', title: `Poste ${d.shift === 'M' ? 'du matin' : d.shift === 'A' ? "d'après-midi" : 'de nuit'}`, sub: d.workLabel });
  for (const m of d.meals) ev.push({ t: m.t, kind: 'meal', title: m.label, sub: RECIPE_BY_ID[m.recipeId]?.name, ref: m.key, flag: m.optional ? 'optional' : undefined });
  if (d.nap) ev.push({ t: d.nap.start, end: d.nap.start + d.nap.dur, kind: 'nap', title: d.nap.label, sub: fmtDur(d.nap.dur) });
  for (const j of d.jjb) {
    if (j.decision === 'cancelled') continue;
    const partial = j.status === 'partial' && j.decision !== 'forced';
    ev.push({
      t: j.effStart, end: j.effEnd, kind: 'jjb', title: 'JJB', ref: j.key,
      sub: j.status === 'conflict' && !j.active ? 'En conflit : à arbitrer' : partial ? 'Créneau raccourci' : j.caution ? 'Optionnel' : undefined,
      flag: j.status === 'conflict' ? 'conflict' : partial ? 'partial' : j.caution ? 'optional' : undefined,
    });
  }
  for (const m of d.muscu) ev.push({ t: m.start, end: m.start + m.dur, kind: 'muscu', title: `Musculation ${m.type}`, sub: m.kind === 'bonus' ? 'Séance courte, si la récupération est bonne' : m.deload ? 'Cycle de récupération : séance allégée' : undefined, ref: m.id, flag: m.conflict ? 'conflict' : m.kind === 'bonus' ? 'optional' : undefined });
  if (d.bed !== null) {
    const dur = nextDay ? nextDay.wake + 1440 - d.bed : st.sleep.minHours * 60;
    ev.push({ t: d.bed, kind: 'bed', title: 'Coucher', sub: `${fmtDur(dur)} de sommeil prévues` });
  }
  return ev.sort((a, b) => a.t - b.t);
}

// ——— Aides pour l'interface ———

/** Meilleure date pour reprogrammer une séance manquée ou à déplacer. */
export function suggestReschedule(plan: Plan, session: MuscuSession, from: string): string | null {
  const startIdx = Math.max(plan.byDate[from]?.idx ?? 0, 0);
  let best: { date: string; v: number } | null = null;
  for (let k = 0; k <= 6; k++) {
    const d = plan.days[startIdx + k];
    if (!d || d.date === session.date) continue;
    if (d.prev === 'N' || d.muscuScore < 15) continue;
    if (d.muscu.some((m) => m.id !== session.id)) continue;
    const neighbours = [plan.days[d.idx - 1], plan.days[d.idx + 1]].filter(Boolean) as DayPlan[];
    const crowded = neighbours.some((x) => x.muscu.some((m) => m.id !== session.id && m.kind !== 'bonus'));
    const v = d.muscuScore - k * 6 - (crowded ? 25 : 0);
    if (!best || v > best.v) best = { date: d.date, v };
  }
  return best?.date ?? null;
}

export interface NextThing { date: string; t: number; end?: number; title: string; sub?: string; ref?: string; kind: TimelineEvent['kind'] }

/** Prochains événements à partir d'un instant donné (date + minutes). */
export function nextEvents(plan: Plan, date: string, nowMin: number) {
  const startIdx = date < plan.start ? 0 : plan.byDate[date]?.idx ?? plan.days.length;
  const after = date < plan.start ? -1 : nowMin;
  const res: { work?: NextThing; training?: NextThing; meal?: NextThing; sleep?: NextThing } = {};
  for (let i = startIdx; i < plan.days.length && i < startIdx + 12; i++) {
    const d = plan.days[i];
    for (const e of d.events) {
      if (i === startIdx && e.t <= after) continue;
      const x: NextThing = { date: d.date, t: e.t, end: e.end, title: e.title, sub: e.sub, ref: e.ref, kind: e.kind };
      if (e.kind === 'work' && !res.work && !(e.t === 0 && d.prev === 'N')) res.work = x;
      if ((e.kind === 'jjb' || e.kind === 'muscu') && !res.training && e.flag !== 'conflict') res.training = x;
      if (e.kind === 'meal' && !res.meal && e.flag !== 'optional') res.meal = x;
      if ((e.kind === 'bed' || e.kind === 'sleep') && !res.sleep) res.sleep = x;
    }
    if (res.work && res.training && res.meal && res.sleep) break;
  }
  return res;
}

export function cycleStart(d: DayPlan): string {
  return addDays(d.date, -(d.cyclePos - 1));
}
