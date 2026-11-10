import { ING, RAYONS, RECIPE_BY_ID, type Unit } from '../data/recipes';
import type { AppState, Plan } from './types';

export interface ShoppingItem { id: string; name: string; qty: number; unit: Unit; rayon: string; meals: number }

export function portionOf(state: Pick<AppState, 'settings' | 'mealPortions'>, recipeId: string): number {
  return (state.mealPortions[recipeId] ?? 1) * state.settings.portion;
}

/** Liste de courses : somme des ingrédients des menus retenus sur la période. */
export function shoppingList(plan: Plan, state: Pick<AppState, 'settings' | 'mealPortions'>, from: string, days: number): { rayon: string; items: ShoppingItem[] }[] {
  const acc: Record<string, ShoppingItem> = {};
  const i0 = plan.byDate[from]?.idx ?? (from < plan.start ? 0 : -1);
  if (i0 < 0) return [];
  for (let i = i0; i < Math.min(plan.days.length, i0 + days); i++) {
    for (const m of plan.days[i].meals) {
      if (m.optional) continue;
      const rec = RECIPE_BY_ID[m.recipeId];
      if (!rec) continue;
      const k = portionOf(state, rec.id);
      for (const [id, q] of rec.ing) {
        const ing = ING[id];
        acc[id] ??= { id, name: ing.n, qty: 0, unit: ing.u, rayon: ing.r, meals: 0 };
        acc[id].qty += q * k;
        acc[id].meals += 1;
      }
    }
  }
  return RAYONS.map((rayon) => ({
    rayon,
    items: Object.values(acc).filter((x) => x.rayon === rayon).map((x) => ({ ...x, qty: x.unit === 'pc' || x.unit === 'tr' ? Math.ceil(x.qty) : x.qty })).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  })).filter((g) => g.items.length);
}
