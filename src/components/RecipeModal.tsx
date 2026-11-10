import { useState } from 'react';
import { Clock, Minus, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../store';
import { fmtQty, ING, RECIPE_BY_ID, recipesFor } from '../data/recipes';
import { portionOf } from '../lib/shopping';
import { toggleMeal } from '../lib/actions';
import { fmtTime } from '../lib/dates';
import { Modal } from './ui';
import { MealArt } from './art';
import type { MealSlot } from '../lib/types';

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Fiche d'un plat. Avec date + créneau : permet de valider le repas et de changer de plat. */
export function RecipeModal({ recipeId, date, slot, onClose }: { recipeId: string | null; date?: string; slot?: MealSlot; onClose: () => void }) {
  const { state, update, toast } = useApp();
  const [swapping, setSwapping] = useState(false);
  const rec = recipeId ? RECIPE_BY_ID[recipeId] : null;
  if (!rec) return null;
  const own = state.mealPortions[rec.id] ?? 1;
  const k = portionOf(state, rec.id);
  const setOwn = (v: number) => update((s) => ({ ...s, mealPortions: { ...s.mealPortions, [rec.id]: v } }));
  const idx = STEPS.indexOf(own);
  const done = date && slot ? !!state.mealsDone[date]?.[slot.key] : false;
  const alternatives = slot ? recipesFor(slot.tags).filter((x) => x.id !== rec.id) : [];
  const close = () => { setSwapping(false); onClose(); };

  return (
    <Modal open onClose={close} title={slot ? `${slot.label} · ${fmtTime(slot.t)}` : 'Recette'} wide
      footer={date && slot ? (
        <>
          <button className="btn btn-ghost" onClick={() => setSwapping((v) => !v)}><RefreshCw size={16} />Changer de plat</button>
          <button className={`btn ${done ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { update(toggleMeal(date, slot.key)); if (!done) { toast('Repas validé'); close(); } }}>{done ? 'Annuler la validation' : 'Repas pris'}</button>
        </>
      ) : undefined}>
      {swapping && slot && date ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Choisis un autre plat pour ce créneau. La liste de courses se met à jour.</p>
          {alternatives.map((a) => (
            <button key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-raised p-2 text-left hover:border-faint"
              onClick={() => { update((s) => ({ ...s, mealSwaps: { ...s.mealSwaps, [`${date}|${slot.key}`]: a.id } })); setSwapping(false); toast('Plat remplacé'); }}>
              <MealArt recipe={a} className="h-12 w-16 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{a.name}</span><span className="text-sm text-muted">{a.prep} min</span></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <MealArt recipe={rec} className="w-full max-w-[220px] shrink-0 self-center sm:self-start" />
            <div className="min-w-0 flex-1">
              <h4 className="display text-2xl leading-tight">{rec.name}</h4>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Clock size={15} />{rec.prep} min de préparation</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-muted">Portion</span>
                <div className="flex items-center gap-1 rounded-xl bg-raised p-1">
                  <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" onClick={() => setOwn(STEPS[Math.max(0, idx - 1)])} disabled={idx <= 0} aria-label="Réduire la portion"><Minus size={16} /></button>
                  <span className="num w-12 text-center text-lg">×{String(own).replace('.', ',')}</span>
                  <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" onClick={() => setOwn(STEPS[Math.min(STEPS.length - 1, idx + 1)])} disabled={idx >= STEPS.length - 1} aria-label="Augmenter la portion"><Plus size={16} /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-faint">Quantités indicatives : ajuste selon ta faim, ta séance du jour et ta récupération.</p>
            </div>
          </div>
          <div>
            <div className="eyebrow mb-2">Ingrédients</div>
            <ul className="divide-y divide-line/60 rounded-xl border border-line/70">
              {rec.ing.map(([id, q]) => (
                <li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span><span className="mr-2" aria-hidden="true">{ING[id].e}</span>{ING[id].n}</span>
                  <span className="tabular shrink-0 font-semibold">{fmtQty(q * k, ING[id].u)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-2">Préparation</div>
            <ol className="flex flex-col gap-2">
              {rec.steps.map((s, i) => (
                <li key={i} className="flex gap-3"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-sm">{i + 1}</span><span>{s}</span></li>
              ))}
            </ol>
          </div>
          <div>
            <div className="eyebrow mb-2">Remplacements possibles</div>
            <ul className="flex flex-col gap-1 text-sm text-muted">{rec.swaps.map((s, i) => <li key={i}>· {s}</li>)}</ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
