import type { AppState, JjbLog, WorkoutLog } from './types';

export const toggleMeal = (date: string, key: string) => (s: AppState): AppState => {
  const day = { ...(s.mealsDone[date] ?? {}) };
  day[key] = !day[key];
  return { ...s, mealsDone: { ...s.mealsDone, [date]: day } };
};
export const toggleTask = (date: string, key: string) => (s: AppState): AppState => {
  const day = { ...(s.tasks[date] ?? {}) };
  day[key] = !day[key];
  return { ...s, tasks: { ...s.tasks, [date]: day } };
};
export const patchJjb = (key: string, patch: Partial<JjbLog>) => (s: AppState): AppState => {
  const next = { ...(s.jjbStatus[key] ?? {}), ...patch };
  for (const k of Object.keys(next) as (keyof JjbLog)[]) if (next[k] === undefined) delete next[k];
  return { ...s, jjbStatus: { ...s.jjbStatus, [key]: next } };
};
export const moveSession = (id: string, date: string) => (s: AppState): AppState => {
  const sk = { ...s.muscuSkipped };
  delete sk[id];
  const w = s.workouts[id];
  return { ...s, muscuMoves: { ...s.muscuMoves, [id]: date }, muscuSkipped: sk, workouts: w && !w.done ? { ...s.workouts, [id]: { ...w, date } } : s.workouts };
};
export const skipSession = (id: string, skipped: boolean) => (s: AppState): AppState => {
  const sk = { ...s.muscuSkipped };
  if (skipped) sk[id] = true; else delete sk[id];
  return { ...s, muscuSkipped: sk };
};
export const putWorkout = (id: string, w: WorkoutLog) => (s: AppState): AppState => ({ ...s, workouts: { ...s.workouts, [id]: w } });
