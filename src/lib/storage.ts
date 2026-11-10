import { defaultSettings, defaultState } from './defaults';
import type { AppState } from './types';

export const STORAGE_KEY = 'luffy-performance-v1';

const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Fusionne des données lues (stockage, import) avec les valeurs par défaut : tolère les champs manquants. */
export function normalize(raw: unknown): AppState {
  const base = defaultState();
  if (!isObj(raw)) return base;
  const out: any = { ...base };
  for (const k of Object.keys(base) as (keyof AppState)[]) {
    const v = (raw as any)[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(base[k]) ? Array.isArray(v) : isObj(base[k]) ? isObj(v) : typeof v === typeof base[k]) out[k] = v;
  }
  const ds = defaultSettings();
  const s = isObj(out.settings) ? out.settings : {};
  out.settings = { ...ds, ...s };
  for (const k of ['profile', 'shiftTimes', 'travel', 'sleep', 'equip', 'reminders'] as const) {
    out.settings[k] = { ...(ds as any)[k], ...(isObj(s[k]) ? s[k] : {}) };
  }
  if (!Array.isArray(out.settings.jjbSlots)) out.settings.jjbSlots = ds.jjbSlots;
  if (!Array.isArray(out.anchors) || !out.anchors.length) out.anchors = base.anchors;
  out.anchors = [...out.anchors].filter((a: any) => isObj(a) && typeof a.date === 'string' && typeof a.pos === 'number').sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  if (!out.anchors.length) out.anchors = base.anchors;
  out.stamps = { ...base.stamps, ...(isObj(out.stamps) ? out.stamps : {}) };
  out.version = 1;
  return out as AppState;
}

export function loadLocal(): AppState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (txt) return normalize(JSON.parse(txt));
  } catch {
    /* stockage indisponible ou données illisibles : on repart des valeurs par défaut */
  }
  return defaultState();
}

export function saveLocal(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(state: AppState): string {
  return JSON.stringify({ app: 'luffy-performance', exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Lit un export. Lève une erreur explicite si le fichier n'est pas une sauvegarde de l'application. */
export function importJSON(text: string): AppState {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide. Choisis un fichier exporté depuis l'application.");
  }
  const data = isObj(parsed) && parsed.app === 'luffy-performance' && isObj(parsed.data) ? parsed.data : parsed;
  if (!isObj(data) || !isObj(data.settings) || data.version !== 1) {
    throw new Error("Ce fichier ne contient pas de sauvegarde Luffy Performance. Vérifie que tu as choisi le bon fichier.");
  }
  const st = normalize(data);
  const now = Date.now();
  st.stamps = { core: now, workouts: now, journal: now };
  return st;
}
