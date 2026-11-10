import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildPlan } from './lib/engine';
import { loadLocal, normalize, saveLocal } from './lib/storage';
import { connectCloud, PART_KEYS, PARTS, type Cloud, type Part } from './lib/platform';
import { fmtTime, nowMinutes, todayISO } from './lib/dates';
import type { AppState, DayPlan, Plan } from './lib/types';

export type Page = 'accueil' | 'calendrier' | 'musculation' | 'jjb' | 'nutrition' | 'sommeil' | 'progression' | 'parametres';
export const PAGES: Page[] = ['accueil', 'calendrier', 'musculation', 'jjb', 'nutrition', 'sommeil', 'progression', 'parametres'];

export interface Toast { id: number; text: string; tone: 'ok' | 'warn' | 'info' }
export type SyncState = 'local' | 'connecting' | 'synced' | 'error';

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  plan: Plan;
  today: string; // date réelle
  ref: string; // date réelle bornée à la période du programme
  refDay: DayPlan;
  nowMin: number;
  started: boolean;
  page: Page;
  go: (p: Page, opts?: { date?: string; session?: string | null }) => void;
  selDate: string;
  setSelDate: (d: string) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  toast: (text: string, tone?: Toast['tone']) => void;
  toasts: Toast[];
  sync: SyncState;
  savedLocally: boolean;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = (): Ctx => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp hors du fournisseur');
  return c;
};

const readHash = (): Page => {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace('#', '');
  return (PAGES as string[]).includes(h) ? (h as Page) : 'accueil';
};

function stampChanges(prev: AppState, next: AppState): AppState {
  let stamps = next.stamps;
  const now = Date.now();
  for (const p of PARTS) {
    if (PART_KEYS[p].some((k) => prev[k] !== next[k])) stamps = { ...stamps, [p]: now };
  }
  return stamps === next.stamps ? next : { ...next, stamps };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadLocal());
  const [clock, setClock] = useState(() => ({ today: todayISO(), nowMin: nowMinutes() }));
  const [page, setPage] = useState<Page>(readHash);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sync, setSync] = useState<SyncState>('local');
  const [savedLocally, setSavedLocally] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((prev) => stampChanges(prev, fn(prev))), []);
  const replace = useCallback((s: AppState) => setState(s), []);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // Planning recalculé dès qu'un paramètre qui l'influence change
  const plan = useMemo(
    () => buildPlan(state),
    [state.settings, state.anchors, state.shiftOverrides, state.jjbStatus, state.muscuMoves, state.muscuSkipped, state.extraSessions, state.mealSwaps],
  );

  const ref = clock.today < plan.start ? plan.start : clock.today > plan.end ? plan.end : clock.today;
  const [selDate, setSelDate] = useState(ref);

  // Sauvegarde automatique locale
  useEffect(() => {
    const t = setTimeout(() => setSavedLocally(saveLocal(state)), 250);
    return () => clearTimeout(t);
  }, [state]);

  // Horloge : rafraîchit « prochain repas », « prochain poste »…
  useEffect(() => {
    const tick = () => setClock((c) => {
      const n = { today: todayISO(), nowMin: nowMinutes() };
      return n.today === c.today && n.nowMin === c.nowMin ? c : n;
    });
    const id = setInterval(tick, 20000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  // Navigation par ancre (#calendrier…)
  useEffect(() => {
    const on = () => setPage(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((p: Page, opts?: { date?: string; session?: string | null }) => {
    if (opts?.date) setSelDate(opts.date);
    setSessionId(opts?.session ?? null);
    setPage(p);
    try { if (location.hash !== '#' + p) location.hash = p; } catch { /* ancre indisponible */ }
    window.scrollTo(0, 0);
  }, []);

  // Synchronisation avec l'espace privé du compte (version en ligne)
  const cloud = useRef<Cloud | null>(null);
  const pushed = useRef<Record<Part, number>>({ core: 0, workouts: 0, journal: 0 });
  const pushing = useRef(false);
  const latest = useRef(state);
  latest.current = state;

  const pull = useCallback(async () => {
    const c = cloud.current;
    if (!c) return;
    const remote = await c.pull();
    setState((s) => {
      let out: any = s;
      for (const p of PARTS) {
        const r = remote[p];
        if (!r) continue;
        if (r.stamp > s.stamps[p]) {
          out = { ...out, ...Object.fromEntries(PART_KEYS[p].filter((k) => k in r.data).map((k) => [k, (r.data as any)[k]])), stamps: { ...out.stamps, [p]: r.stamp } };
          pushed.current[p] = r.stamp;
        } else if (r.stamp === s.stamps[p]) pushed.current[p] = r.stamp;
      }
      return out === s ? s : normalize(out);
    });
  }, []);

  const flush = useCallback(async () => {
    const c = cloud.current;
    if (!c || pushing.current) return;
    pushing.current = true;
    try {
      for (let guard = 0; guard < 4; guard++) {
        const s = latest.current;
        const dirty = PARTS.filter((p) => s.stamps[p] > pushed.current[p]);
        if (!dirty.length) break;
        for (const p of dirty) {
          await c.push(p, s.stamps[p], Object.fromEntries(PART_KEYS[p].map((k) => [k, s[k]])));
          pushed.current[p] = s.stamps[p];
        }
      }
      setSync('synced');
    } catch {
      setSync('error');
    } finally {
      pushing.current = false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await connectCloud();
      if (!alive || !c) return;
      cloud.current = c;
      setSync('connecting');
      try {
        await pull();
        if (!alive) return;
        setSync('synced');
        setTimeout(flush, 500);
      } catch {
        if (alive) setSync('error');
      }
    })();
    return () => { alive = false; };
  }, [pull, flush]);

  useEffect(() => {
    if (!cloud.current) return;
    const t = setTimeout(flush, 1800);
    return () => clearTimeout(t);
  }, [state.stamps, flush]);

  useEffect(() => {
    const on = () => {
      if (document.visibilityState !== 'visible' || !cloud.current || pushing.current) return;
      if (PARTS.some((p) => latest.current.stamps[p] > pushed.current[p])) return;
      pull().then(() => setSync('synced')).catch(() => setSync('error'));
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [pull]);

  useReminders(plan, state, clock, toast);

  const value: Ctx = {
    state, update, replace, plan, today: clock.today, ref, refDay: plan.byDate[ref], nowMin: clock.nowMin,
    started: clock.today >= plan.start, page, go, selDate, setSelDate, sessionId, setSessionId, toast, toasts, sync, savedLocally,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ——— Rappels : fonctionnent tant que l'application est ouverte (sans serveur) ———
function useReminders(plan: Plan, state: AppState, clock: { today: string; nowMin: number }, toast: Ctx['toast']) {
  const fired = useRef<Set<string>>(new Set());
  useEffect(() => {
    const r = state.settings.reminders;
    if (!r.enabled) return;
    const d = plan.byDate[clock.today];
    if (!d) return;
    const due: { key: string; t: number; text: string }[] = [];
    const lead = r.leadMin;
    for (const e of d.events) {
      const k = `${d.date}|${e.kind}|${e.t}`;
      if (e.kind === 'wake' && r.wake) due.push({ key: k, t: e.t, text: `Réveil à ${fmtTime(e.t)}` });
      if (e.kind === 'meal' && e.flag !== 'optional') {
        const snack = /ollation/.test(e.title);
        if ((snack && r.snacks) || (!snack && r.meals)) due.push({ key: k, t: e.t - lead, text: `${e.title} à ${fmtTime(e.t)}${e.sub ? ' : ' + e.sub : ''}` });
      }
      if ((e.kind === 'jjb' || e.kind === 'muscu') && e.flag !== 'conflict') {
        if (r.training) due.push({ key: k, t: e.t - Math.max(lead, 30), text: `${e.title} à ${fmtTime(e.t)}` });
        if (e.kind === 'jjb' && r.bag) due.push({ key: k + '|sac', t: e.t - 120, text: `Prépare ton sac : JJB à ${fmtTime(e.t)}` });
      }
      if (e.kind === 'bed' && r.bed) due.push({ key: k, t: e.t - 30, text: `Coucher à ${fmtTime(e.t)} : commence à couper les écrans` });
    }
    if (r.hydration) for (const t of [600, 720, 840, 960, 1080]) if (t > d.wake && !(d.mainSleep && t > d.mainSleep.start && t < d.mainSleep.end)) due.push({ key: `${d.date}|eau|${t}`, t, text: 'Hydratation : un grand verre d’eau' });
    for (const x of due) {
      if (fired.current.has(x.key)) continue;
      if (clock.nowMin >= x.t && clock.nowMin < x.t + 12) {
        fired.current.add(x.key);
        toast(x.text, 'info');
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Luffy Performance', { body: x.text });
        } catch { /* notifications système indisponibles : le rappel reste affiché dans l'application */ }
      }
    }
  }, [plan, state.settings.reminders, clock, toast]);
}
