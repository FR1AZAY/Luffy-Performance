export type Shift = 'M' | 'A' | 'N' | 'R';
export type SessionType = 'A' | 'B' | 'C';

export interface JjbSlot {
  id: string;
  weekday: number; // 0 = dimanche
  start: number; // minutes depuis minuit
  end: number;
  enabled: boolean;
}

export interface Settings {
  profile: {
    name: string;
    heightCm: number;
    weightKg: number;
    goal: string;
    sports: string;
    level: string;
    equipment: string[];
  };
  programStart: string;
  programEnd: string;
  shiftTimes: { M: [number, number]; A: [number, number]; N: [number, number] };
  jjbSlots: JjbSlot[];
  travel: { jjbHome: number; beforeWork: number; afterWork: number };
  sleep: {
    minHours: number;
    wakeM: number;
    bedBeforeM: number;
    wakeDefault: number;
    bedA: number;
    bedR: number;
    nightSleepStart: number;
    nightSleepEnd: number;
    postNightWake: number;
  };
  equip: { barMaxKg: number; dbMaxKg: number; barStepKg: number; dbStepKg: number };
  reminders: {
    enabled: boolean;
    leadMin: number;
    wake: boolean;
    meals: boolean;
    snacks: boolean;
    training: boolean;
    hydration: boolean;
    bag: boolean;
    bed: boolean;
  };
  portion: number;
}

export interface SetLog { w: number | null; r: number | null; done: boolean }
export interface WorkoutLog {
  date: string;
  type: SessionType;
  kind: 'main' | 'bonus' | 'libre';
  sets: Record<string, SetLog[]>;
  warmup?: boolean;
  feeling?: number;
  fatigue?: number;
  note?: string;
  done: boolean;
}
export interface SleepLog { bed?: string; wake?: string; napMin?: number; quality?: number; fatigue?: number }
export interface JjbLog { decision?: 'cancelled' | 'forced'; done?: boolean; intensity?: number; note?: string }
export interface PerfLog { id: string; date: string; ex: string; w: number | null; r: number }
export interface ExtraSession { id: string; date: string; type: SessionType }

export interface AppState {
  version: 1;
  stamps: { core: number; workouts: number; journal: number };
  // — core
  settings: Settings;
  anchors: { date: string; pos: number }[];
  shiftOverrides: Record<string, Shift>;
  jjbStatus: Record<string, JjbLog>; // clé « date|slotId »
  muscuMoves: Record<string, string>; // sessionId → nouvelle date
  muscuSkipped: Record<string, boolean>;
  muscuMode: Record<string, 'light' | 'full'>;
  extraSessions: ExtraSession[];
  mealSwaps: Record<string, string>; // « date|slot » → recipeId
  mealPortions: Record<string, number>;
  shoppingChecked: Record<string, boolean>;
  // — workouts
  workouts: Record<string, WorkoutLog>;
  perfLogs: PerfLog[];
  // — journal
  sleepLogs: Record<string, SleepLog>; // clé = date du réveil
  mealsDone: Record<string, Record<string, boolean>>;
  tasks: Record<string, Record<string, boolean>>;
}

// ——— Planning calculé ———
export interface Block { start: number; end: number }

export interface JjbPlan {
  key: string; // « date|slotId »
  slotId: string;
  start: number;
  end: number;
  status: 'ok' | 'partial' | 'conflict';
  window: [number, number] | null;
  reasons: string[];
  caution?: string;
  decision?: 'cancelled' | 'forced';
  done: boolean;
  active: boolean;
  effStart: number;
  effEnd: number;
}

export interface MuscuSession {
  id: string;
  window: number; // n° du cycle de 10 jours (0-based), −1 pour une séance libre
  kind: 'main' | 'bonus' | 'libre';
  type: SessionType;
  baseDate: string;
  date: string;
  moved: boolean;
  skipped: boolean;
  deload: boolean;
  start: number;
  dur: number;
  conflict?: string;
  warn?: string;
}

export interface MealSlot {
  key: string;
  t: number;
  label: string;
  tags: string[];
  snack: boolean;
  optional?: boolean;
  atWork?: boolean;
  recipeId: string;
}

export interface TimelineEvent {
  t: number;
  end?: number;
  kind: 'wake' | 'meal' | 'work' | 'jjb' | 'muscu' | 'nap' | 'bed' | 'sleep' | 'info';
  title: string;
  sub?: string;
  ref?: string;
  flag?: 'conflict' | 'partial' | 'optional';
}

export interface DayPlan {
  date: string;
  idx: number;
  weekday: number;
  shift: Shift;
  prev: Shift;
  next: Shift;
  cyclePos: number; // 1..10
  overridden: boolean;
  work: Block[];
  workLabel: string;
  wake: number;
  bed: number | null; // peut valoir 1440 (minuit)
  mainSleep: Block | null; // sommeil de jour après une nuit
  nap: { start: number; dur: number; label: string } | null;
  plannedSleepMin: number; // sommeil principal + sieste conseillée
  jjb: JjbPlan[];
  muscu: MuscuSession[];
  meals: MealSlot[];
  events: TimelineEvent[];
  conflicts: string[];
  recoveryGapH: number | null;
  muscuScore: number;
  sleepNote?: string;
}

export interface Plan {
  days: DayPlan[];
  byDate: Record<string, DayPlan>;
  sessions: MuscuSession[];
  start: string;
  end: string;
}
