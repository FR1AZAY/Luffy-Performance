import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Copy } from 'lucide-react';
import { useApp } from '../store';
import { addDays, cap, fmtDate, fmtTime } from '../lib/dates';
import { fmtQty, RECIPE_BY_ID, RECIPES } from '../data/recipes';
import { shoppingList } from '../lib/shopping';
import { toggleMeal } from '../lib/actions';
import { copyText } from '../lib/platform';
import { CheckRow, PageHead, Section, Segmented, ShiftBadge } from '../components/ui';
import { MealArt } from '../components/art';
import { RecipeModal } from '../components/RecipeModal';
import type { MealSlot } from '../lib/types';

const PORTIONS = [{ v: 0.75, l: 'Petite faim' }, { v: 1, l: 'Normale' }, { v: 1.25, l: 'Grosse faim' }, { v: 1.5, l: 'Très grosse faim' }];
const CATS: [string, string][] = [['pdj', 'Petits-déjeuners'], ['pdjLeger', 'Petits-déjeuners légers'], ['col', 'Collations'], ['box', 'Repas à emporter'], ['repas', 'Repas à la maison'], ['pre', 'Avant l’entraînement'], ['leger', 'Repas légers']];

export default function Nutrition() {
  const { state, update, plan, ref, today, nowMin, selDate, setSelDate, toast } = useApp();
  const [tab, setTab] = useState<'menus' | 'courses' | 'recettes'>('menus');
  const [meal, setMeal] = useState<MealSlot | null>(null);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [range, setRange] = useState<'3' | '7' | '10'>('7');
  const date = plan.byDate[selDate] ? selDate : ref;
  const day = plan.byDate[date];
  const done = state.mealsDone[date] ?? {};
  const clamp = (d: string) => (d < plan.start ? plan.start : d > plan.end ? plan.end : d);
  const list = useMemo(() => shoppingList(plan, state, date, Number(range)), [plan, state.settings.portion, state.mealPortions, date, range]);
  const items = list.flatMap((g) => g.items);
  const checked = items.filter((i) => state.shoppingChecked[i.id]).length;
  const nextKey = date === today ? day.meals.find((m) => m.t > nowMin && !done[m.key])?.key : undefined;

  const copyList = async () => {
    const txt = list.map((g) => `${g.rayon}\n${g.items.map((i) => `- ${i.name} : ${fmtQty(i.qty, i.unit)}`).join('\n')}`).join('\n\n');
    const ok = await copyText(txt);
    toast(ok ? 'Liste copiée' : 'Copie impossible ici : sélectionne la liste à la main', ok ? 'ok' : 'warn');
  };

  return (
    <>
      <PageHead title="Nutrition" sub="Des repas simples, calés sur ton poste. Pas de régime : les portions suivent ta faim et ton activité." />
      <Segmented label="Sections de la nutrition" value={tab} onChange={setTab} options={[{ value: 'menus', label: 'Menus du jour' }, { value: 'courses', label: 'Liste de courses' }, { value: 'recettes', label: 'Recettes' }]} />

      {tab !== 'recettes' && (
        <div className="flex items-center justify-between gap-2">
          <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, -1)))} aria-label="Jour précédent" disabled={date <= plan.start}><ChevronLeft size={18} /></button>
          <button className="flex min-w-0 flex-col items-center" onClick={() => setSelDate(ref)}>
            <span className="display text-xl">{cap(fmtDate(date, 'medium'))}</span>
            <span className="mt-1"><ShiftBadge shift={day.shift} small /></span>
          </button>
          <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, 1)))} aria-label="Jour suivant" disabled={date >= plan.end}><ChevronRight size={18} /></button>
        </div>
      )}

      {tab === 'menus' && (
        <>
          <Section title="Taille des portions">
            <Segmented label="Taille des portions" value={String(state.settings.portion)} onChange={(v) => update((s) => ({ ...s, settings: { ...s.settings, portion: Number(v) } }))} options={PORTIONS.map((p) => ({ value: String(p.v), label: p.l }))} />
          </Section>
          <Section title={`${day.meals.filter((m) => !m.optional).length} repas et collations`}>
            <div className="flex flex-col gap-2">
              {day.meals.map((m) => {
                const rec = RECIPE_BY_ID[m.recipeId];
                const ok = !!done[m.key];
                return (
                  <div key={m.key} className={`panel flex items-stretch gap-3 p-2.5 ${m.key === nextKey ? 'ring-1 ring-accent/60' : ''} ${ok ? 'opacity-70' : ''}`}>
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setMeal(m)}>
                      <MealArt recipe={rec} className="h-[66px] w-[88px] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2"><span className="num text-xl">{fmtTime(m.t)}</span><span className="eyebrow">{m.label}</span></span>
                        <span className={`mt-0.5 block font-semibold leading-snug ${ok ? 'line-through decoration-faint' : ''}`}>{rec.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-sm text-muted"><Clock size={13} />{rec.prep} min{m.atWork ? ' · à emporter' : ''}{m.optional ? ' · facultatif' : ''}</span>
                      </span>
                    </button>
                    <button onClick={() => update(toggleMeal(date, m.key))} aria-pressed={ok} aria-label={`Valider : ${m.label}`}
                      className={`flex w-11 shrink-0 items-center justify-center self-center rounded-xl border-2 py-2.5 transition-colors ${ok ? 'border-ok bg-ok text-bg' : 'border-line text-faint hover:border-faint'}`}>
                      <Check size={20} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {tab === 'courses' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented label="Période de la liste" value={range} onChange={setRange} options={[{ value: '3', label: '3 jours' }, { value: '7', label: '7 jours' }, { value: '10', label: 'Cycle 10 j' }]} />
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={copyList}><Copy size={15} />Copier</button>
              {checked > 0 && <button className="btn btn-quiet btn-sm" onClick={() => update((s) => ({ ...s, shoppingChecked: {} }))}>Tout décocher</button>}
            </div>
          </div>
          <p className="text-sm text-muted">Du {fmtDate(date, 'medium')} au {fmtDate(clamp(addDays(date, Number(range) - 1)), 'medium')} · {checked} / {items.length} articles cochés. Calculée d’après les menus affichés et tes portions.</p>
          {list.map((g) => (
            <Section key={g.rayon} title={g.rayon}>
              <div className="panel divide-y divide-line/60 px-4 py-1">
                {g.items.map((i) => (
                  <CheckRow key={i.id} checked={!!state.shoppingChecked[i.id]} onChange={(v) => update((s) => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [i.id]: v } }))}>
                    <span className="flex items-baseline justify-between gap-3"><span>{i.name}</span><span className="tabular shrink-0 font-semibold">{fmtQty(i.qty, i.unit)}</span></span>
                  </CheckRow>
                ))}
              </div>
            </Section>
          ))}
        </>
      )}

      {tab === 'recettes' && CATS.map(([tag, label]) => {
        const recs = RECIPES.filter((r) => r.tags[0] === tag);
        if (!recs.length) return null;
        return (
          <Section key={tag} title={label}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {recs.map((r) => (
                <button key={r.id} onClick={() => setRecipe(r.id)} className="panel flex flex-col gap-2 p-2 text-left hover:border-faint">
                  <MealArt recipe={r} className="w-full" />
                  <span className="px-1 pb-1"><span className="block text-sm font-semibold leading-snug">{r.name}</span><span className="text-xs text-muted">{r.prep} min</span></span>
                </button>
              ))}
            </div>
          </Section>
        );
      })}

      {meal && <RecipeModal recipeId={day.meals.find((m) => m.key === meal.key)?.recipeId ?? meal.recipeId} date={date} slot={meal} onClose={() => setMeal(null)} />}
      {recipe && <RecipeModal recipeId={recipe} onClose={() => setRecipe(null)} />}
    </>
  );
}
