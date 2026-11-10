// Pont entre l'application et son hébergement : version installée (fichiers, PWA)
// ou version en ligne dans Claude (stockage et téléchargements fournis par la plateforme).
import { CORE_KEYS, JOURNAL_KEYS, WORKOUT_KEYS } from './defaults';
import type { AppState } from './types';

const claude = (): any => (typeof window !== 'undefined' ? (window as any).claude : undefined);
export const inViewer = (): boolean => !!claude()?.use;

const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function saveFile(filename: string, text: string, mime = 'application/json'): Promise<'saved' | 'declined'> {
  if (inViewer()) {
    const dl = await claude().use('downloads');
    if (!dl) throw new Error('Téléchargement indisponible ici. Utilise « Copier » à la place.');
    try {
      await dl.save({ filename, data: text });
      return 'saved';
    } catch (e: any) {
      if (e?.code === 'declined') return 'declined';
      throw new Error('Le fichier n’a pas pu être enregistré. Utilise « Copier » à la place.');
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'saved';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ——— Synchronisation (version en ligne uniquement) ———
export type Part = 'core' | 'workouts' | 'journal';
export const PARTS: Part[] = ['core', 'workouts', 'journal'];
export const PART_KEYS: Record<Part, readonly (keyof AppState)[]> = { core: CORE_KEYS, workouts: WORKOUT_KEYS, journal: JOURNAL_KEYS };

export interface Cloud {
  pull(): Promise<Partial<Record<Part, { stamp: number; data: Record<string, unknown> }>>>;
  push(part: Part, stamp: number, data: Record<string, unknown>): Promise<void>;
}

/** Espace privé du compte qui consulte la page. null hors de Claude ou sans identité. */
export async function connectCloud(): Promise<Cloud | null> {
  const c = claude();
  if (!c?.use) return null;
  try {
    const [db, user] = await withTimeout(Promise.all([c.use('db'), c.use('user')]), 15000);
    if (!db || !user) return null;
    const id = await withTimeout<string | null>(user.id());
    if (!id) return null;
    const col = db.collection('data/users/' + id);
    return {
      async pull() {
        const out: Partial<Record<Part, { stamp: number; data: Record<string, unknown> }>> = {};
        for (const p of PARTS) {
          const snap: any = await withTimeout(col.doc(p).get());
          if (!snap?.exists) continue;
          const d = snap.data() ?? {};
          try {
            out[p] = { stamp: Number(d.stamp) || 0, data: JSON.parse(String(d.json)) };
          } catch {
            /* document illisible : ignoré, la copie locale fait foi */
          }
        }
        return out;
      },
      async push(part, stamp, data) {
        await withTimeout(col.doc(part).set({ stamp, json: JSON.stringify(data) }));
      },
    };
  } catch {
    return null;
  }
}
