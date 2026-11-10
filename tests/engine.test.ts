import { describe, expect, it } from 'vitest';
import { buildPlan, CYCLE, shiftOn, suggestReschedule } from '../src/lib/engine';
import { defaultState } from '../src/lib/defaults';
import { exportJSON, importJSON, normalize } from '../src/lib/storage';
import { shoppingList } from '../src/lib/shopping';
import { recoveryFor, sleepHours } from '../src/lib/recovery';
import { addDays, weekday } from '../src/lib/dates';
import { RECIPE_BY_ID, RECIPES, ING } from '../src/data/recipes';

const base = defaultState();
const plan = buildPlan(base);
const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

describe('cycle 5x8', () => {
  it('couvre du 11 novembre 2026 au 30 juin 2027 sans trou ni doublon', () => {
    expect(plan.days.length).toBe(232);
    expect(plan.days[0].date).toBe('2026-11-11');
    expect(plan.days[231].date).toBe('2027-06-30');
    expect(new Set(plan.days.map((d) => d.date)).size).toBe(232);
    for (let i = 1; i < plan.days.length; i++) expect(plan.days[i].date).toBe(addDays(plan.days[i - 1].date, 1));
  });
  it('le 11 novembre 2026 est un mercredi, premier jour du poste du matin', () => {
    expect(weekday('2026-11-11')).toBe(3);
    expect(plan.days[0].shift).toBe('M');
    expect(plan.days[0].cyclePos).toBe(1);
  });
  it('suit matin×2, après-midi×2, nuit×2, repos×4 sur toute la période', () => {
    plan.days.forEach((d, i) => expect(d.shift).toBe(CYCLE[i % 10]));
    expect(plan.byDate['2026-11-13'].shift).toBe('A');
    expect(plan.byDate['2026-11-15'].shift).toBe('N');
    expect(plan.byDate['2026-11-17'].shift).toBe('R');
    expect(plan.byDate['2026-11-21'].shift).toBe('M');
    expect(plan.byDate['2027-01-01'].shift).toBe('M'); // J+51 → jour 2
    expect(plan.byDate['2027-03-28'].shift).toBe(CYCLE[137 % 10]); // changement d'heure
    expect(plan.byDate['2027-06-30'].shift).toBe('M');
  });
  it('une exception ponctuelle ne décale pas la suite', () => {
    const p = buildPlan({ ...base, shiftOverrides: { '2026-11-13': 'R' } });
    expect(p.byDate['2026-11-13'].shift).toBe('R');
    expect(p.byDate['2026-11-13'].overridden).toBe(true);
    expect(p.byDate['2026-11-14'].shift).toBe('A');
    expect(p.byDate['2026-11-21'].shift).toBe('M');
  });
  it('un nouvel ancrage recalcule tous les jours suivants', () => {
    const anchors = [...base.anchors, { date: '2026-12-01', pos: 0 }];
    const p = buildPlan({ ...base, anchors });
    expect(p.byDate['2026-11-30'].shift).toBe(plan.byDate['2026-11-30'].shift);
    expect(p.byDate['2026-12-01'].shift).toBe('M');
    expect(p.byDate['2026-12-05'].shift).toBe('N');
    expect(p.byDate['2026-12-11'].shift).toBe('M');
    expect(shiftOn('2026-12-03', anchors, {}).cyclePos).toBe(3);
  });
});

describe('JJB et conflits', () => {
  it("aucun JJB actif ne chevauche le travail ni le sommeil d'après-nuit", () => {
    for (const d of plan.days) for (const j of d.jjb) {
      if (!j.active) continue;
      const b = { start: j.effStart, end: j.effEnd };
      for (const w of d.work) expect(overlap(b, w), `${d.date} ${j.slotId}`).toBe(false);
      if (d.mainSleep) expect(overlap(b, d.mainSleep), `${d.date} sommeil`).toBe(false);
      expect(j.effStart).toBeGreaterThanOrEqual(d.wake);
    }
  });
  it('les soirs de poste après-midi sont en conflit et signalés, jamais supprimés', () => {
    let seen = 0;
    for (const d of plan.days) {
      if (d.shift !== 'A') continue;
      for (const j of d.jjb.filter((x) => x.start >= 900)) {
        seen++;
        expect(j.status).toBe('conflict');
        expect(j.active).toBe(false);
        expect(j.reasons.length).toBeGreaterThan(0);
        expect(d.conflicts.some((c) => c.startsWith('JJB'))).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
  it('le samedi matin est vérifié contre le poste', () => {
    const sats = plan.days.filter((d) => d.weekday === 6);
    for (const d of sats) {
      const j = d.jjb[0];
      if (d.shift === 'M') expect(j.status).toBe('conflict');
      if (d.shift === 'R' && d.prev !== 'N') { expect(j.status).toBe('ok'); expect(d.wake).toBeLessThanOrEqual(420); }
      if (d.prev === 'N') expect(j.status).toBe('conflict');
      if (d.shift === 'A') { expect(j.status).toBe('partial'); expect(j.effEnd).toBeLessThanOrEqual(830 - 90); }
    }
  });
  it('jours du matin : JJB du soir compatible ; jours de nuit : proposé avant le travail', () => {
    const m = plan.days.find((d) => d.shift === 'M' && d.jjb.some((j) => j.start >= 900))!;
    expect(m.jjb[0].status).toBe('ok');
    const nt = plan.days.find((d) => d.shift === 'N' && d.jjb.some((j) => j.start >= 900))!;
    expect(nt.jjb[0].status).toBe('ok');
    expect(nt.jjb[0].caution).toBeTruthy();
  });
  it('forcer ou annuler un créneau est respecté', () => {
    const d0 = plan.days.find((d) => d.shift === 'A' && d.jjb.length && d.jjb[0].start >= 900)!;
    const key = d0.jjb[0].key;
    const forced = buildPlan({ ...base, jjbStatus: { [key]: { decision: 'forced' } } }).byDate[d0.date];
    expect(forced.jjb[0].active).toBe(true);
    expect(forced.conflicts.length).toBeGreaterThan(0);
    const ok = plan.days.find((d) => d.jjb.some((j) => j.status === 'ok'))!;
    const cancelled = buildPlan({ ...base, jjbStatus: { [ok.jjb[0].key]: { decision: 'cancelled' } } }).byDate[ok.date];
    expect(cancelled.jjb[0].active).toBe(false);
    expect(cancelled.events.some((e) => e.kind === 'jjb')).toBe(false);
  });
});

describe('musculation', () => {
  const mains = plan.sessions.filter((s) => s.kind === 'main');
  it('2 séances principales par cycle de 10 jours, jamais un lendemain de nuit', () => {
    for (let w = 0; w < 23; w++) expect(mains.filter((s) => s.window === w).length, `cycle ${w + 1}`).toBe(2);
    for (const s of mains) expect(plan.byDate[s.date].prev).not.toBe('N');
  });
  it('au moins un jour plein entre deux séances principales, types A/B/C en rotation', () => {
    for (let i = 1; i < mains.length; i++) {
      expect(plan.byDate[mains[i].date].idx - plan.byDate[mains[i - 1].date].idx).toBeGreaterThanOrEqual(2);
      expect(mains[i].type).not.toBe(mains[i - 1].type);
    }
    expect(mains.slice(0, 4).map((s) => s.type)).toEqual(['A', 'B', 'C', 'A']);
  });
  it('les séances ne chevauchent ni le travail ni le JJB actif', () => {
    for (const s of plan.sessions) {
      const d = plan.byDate[s.date];
      const b = { start: s.start, end: s.start + s.dur };
      expect(s.conflict, `${s.id} ${s.date}`).toBeUndefined();
      for (const w of d.work) expect(overlap(b, w)).toBe(false);
      for (const j of d.jjb) if (j.active) expect(overlap(b, { start: j.effStart, end: j.effEnd })).toBe(false);
    }
  });
  it('le programme varie : les séances ne tombent pas toujours le même jour', () => {
    expect(new Set(mains.map((s) => plan.byDate[s.date].weekday)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(mains.map((s) => plan.byDate[s.date].cyclePos)).size).toBeGreaterThanOrEqual(2);
  });
  it('bonus : au plus une séance courte par cycle, aucune en cycle de récupération', () => {
    for (let w = 0; w < 24; w++) {
      const b = plan.sessions.filter((s) => s.window === w && s.kind === 'bonus');
      expect(b.length).toBeLessThanOrEqual(1);
      if (w % 4 === 3) { expect(b.length).toBe(0); expect(mains.filter((s) => s.window === w).every((s) => s.deload)).toBe(true); }
    }
    expect(plan.sessions.filter((s) => s.kind === 'bonus').length).toBeGreaterThan(10);
  });
  it('une séance manquée peut être reprogrammée sur un jour valide', () => {
    const s = mains[2];
    const to = suggestReschedule(plan, s, addDays(s.date, 1))!;
    expect(to).toBeTruthy();
    expect(to > s.date).toBe(true);
    expect(plan.byDate[to].prev).not.toBe('N');
    const moved = buildPlan({ ...base, muscuMoves: { [s.id]: to } });
    expect(moved.byDate[to].muscu.some((m) => m.id === s.id)).toBe(true);
    expect(moved.byDate[s.date].muscu.some((m) => m.id === s.id)).toBe(false);
    const skipped = buildPlan({ ...base, muscuSkipped: { [s.id]: true } });
    expect(skipped.byDate[s.date].muscu.length).toBe(0);
  });
});

describe('sommeil et repas', () => {
  it('8 heures de sommeil prévues par 24 h (hors transition après la dernière nuit)', () => {
    for (const d of plan.days) {
      if (d.prev === 'N' && d.shift !== 'N') { expect(d.plannedSleepMin).toBeGreaterThanOrEqual(390); continue; }
      expect(d.plannedSleepMin, d.date).toBeGreaterThanOrEqual(480);
    }
  });
  it('horaires de référence respectés', () => {
    const m = plan.byDate['2026-11-11'];
    expect(m.wake).toBe(255);
    expect(m.meals.map((x) => x.t).slice(0, 4)).toEqual([270, 510, 690, 900]);
    const a = plan.byDate['2026-11-13'];
    expect(a.meals.map((x) => x.t)).toEqual([510, 630, 720, 990, 1170, 1380]);
    const n2 = plan.byDate['2026-11-16'];
    expect(n2.meals.map((x) => x.t)).toEqual([30, 240, 420, 930, 1020, 1215].map((x, i) => (i < 4 ? x : n2.meals[i].t)));
    expect(n2.mainSleep).toEqual({ start: 450, end: 930 });
    const r = plan.byDate['2026-11-18'];
    expect(r.meals.map((x) => x.t)).toEqual([540, 750, 960, 1170]);
  });
  it('chaque repas a un plat valide, sans doublon dans la journée, et aucun repas pendant le sommeil', () => {
    for (const d of plan.days) {
      expect(d.meals.length).toBeGreaterThanOrEqual(4);
      const ids = d.meals.map((m) => m.recipeId);
      expect(new Set(ids).size, d.date).toBe(ids.length);
      for (const m of d.meals) {
        expect(RECIPE_BY_ID[m.recipeId]).toBeTruthy();
        if (d.mainSleep) expect(m.t > d.mainSleep.start && m.t < d.mainSleep.end).toBe(false);
        if (m.atWork) expect(d.work.some((w) => m.t >= w.start && m.t <= w.end), `${d.date} ${m.key}`).toBe(true);
      }
      for (let i = 1; i < d.meals.length; i++) expect(d.meals[i].t).toBeGreaterThan(d.meals[i - 1].t);
    }
  });
  it('toutes les recettes utilisent des ingrédients connus et sont proposées au moins une fois', () => {
    for (const r of RECIPES) for (const [id] of r.ing) expect(ING[id], `${r.id}:${id}`).toBeTruthy();
    const used = new Set(plan.days.flatMap((d) => d.meals.map((m) => m.recipeId)));
    expect(RECIPES.filter((r) => !used.has(r.id)).map((r) => r.id)).toEqual([]);
  });
  it('la liste de courses additionne les ingrédients de la période', () => {
    const list = shoppingList(plan, base, '2026-11-11', 3);
    const all = list.flatMap((g) => g.items);
    expect(all.length).toBeGreaterThan(8);
    expect(all.every((x) => x.qty > 0)).toBe(true);
    const double = shoppingList(plan, { ...base, settings: { ...base.settings, portion: 2 } }, '2026-11-11', 3).flatMap((g) => g.items);
    const g = all.find((x) => x.unit === 'g')!;
    expect(double.find((x) => x.id === g.id)!.qty).toBeCloseTo(g.qty * 2);
  });
  it('récupération : calcule les heures et déclenche une alerte quand le sommeil manque', () => {
    expect(sleepHours({ bed: '23:00', wake: '07:30' })).toBe(8.5);
    expect(sleepHours({ bed: '07:30', wake: '15:30', napMin: 30 })).toBe(8.5);
    expect(recoveryFor('2026-11-12', base, plan).level).toBe('inconnue');
    const bad = { sleepLogs: { '2026-11-12': { bed: '23:30', wake: '04:15', quality: 2, fatigue: 4 } } };
    expect(recoveryFor('2026-11-12', bad, plan).level).toBe('insuffisante');
    const good = { sleepLogs: { '2026-11-12': { bed: '20:30', wake: '04:15', napMin: 30, quality: 4, fatigue: 2 } } };
    expect(recoveryFor('2026-11-12', good, plan).level).toBe('bonne');
  });
});

describe('sauvegarde', () => {
  it('export puis import redonne les mêmes données', () => {
    const st = { ...base, workouts: { 'c1-s1': { date: '2026-11-13', type: 'A' as const, kind: 'main' as const, sets: { bench: [{ w: 50, r: 8, done: true }] }, done: true } }, shiftOverrides: { '2026-12-25': 'R' as const } };
    const back = importJSON(exportJSON(st));
    expect(back.workouts).toEqual(st.workouts);
    expect(back.shiftOverrides).toEqual(st.shiftOverrides);
    expect(back.settings).toEqual(st.settings);
  });
  it('refuse un fichier invalide avec un message clair', () => {
    expect(() => importJSON('pas du json')).toThrow(/JSON valide/);
    expect(() => importJSON('{"foo":1}')).toThrow(/sauvegarde/);
  });
  it('tolère des données partielles ou abîmées', () => {
    const st = normalize({ version: 1, settings: { portion: 1.25 }, anchors: 'x', workouts: null });
    expect(st.settings.portion).toBe(1.25);
    expect(st.settings.jjbSlots.length).toBe(5);
    expect(st.anchors).toEqual(base.anchors);
    expect(buildPlan(st).days.length).toBe(232);
  });
});
