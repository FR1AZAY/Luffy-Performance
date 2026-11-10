import type { AppState, Settings } from './types';

export const PROGRAM_START = '2026-11-11';
export const PROGRAM_END = '2027-06-30';

export function defaultSettings(): Settings {
  return {
    profile: {
      name: '',
      heightCm: 183,
      weightKg: 73,
      goal: 'Développer progressivement la musculature et la force, tout en conservant une bonne condition physique.',
      sports: 'Musculation et JJB',
      level: 'Pratiquant régulier',
      equipment: ['Banc de musculation', 'Barre de développé couché', 'Disques de musculation', 'Haltères réglables', 'Barre de traction', 'Barres de dips'],
    },
    programStart: PROGRAM_START,
    programEnd: PROGRAM_END,
    shiftTimes: { M: [350, 870], A: [830, 1350], N: [1310, 1830] },
    jjbSlots: [
      { id: 'lun', weekday: 1, start: 1080, end: 1170, enabled: true },
      { id: 'mar', weekday: 2, start: 1080, end: 1170, enabled: true },
      { id: 'jeu', weekday: 4, start: 1050, end: 1140, enabled: true },
      { id: 'ven', weekday: 5, start: 1080, end: 1170, enabled: true },
      { id: 'sam', weekday: 6, start: 480, end: 780, enabled: true },
    ],
    travel: { jjbHome: 30, beforeWork: 90, afterWork: 60 },
    sleep: {
      minHours: 8,
      wakeM: 255, // 04h15
      bedBeforeM: 1245, // 20h45
      wakeDefault: 510, // 08h30
      bedA: 1440, // 00h00
      bedR: 1380, // 23h00
      nightSleepStart: 450, // 07h30
      nightSleepEnd: 930, // 15h30
      postNightWake: 840, // 14h00 après la dernière nuit
    },
    equip: { barMaxKg: 100, dbMaxKg: 20, barStepKg: 2.5, dbStepKg: 1 },
    reminders: { enabled: false, leadMin: 10, wake: true, meals: true, snacks: true, training: true, hydration: true, bag: true, bed: true },
    portion: 1,
  };
}

export function defaultState(): AppState {
  return {
    version: 1,
    stamps: { core: 0, workouts: 0, journal: 0 },
    settings: defaultSettings(),
    anchors: [{ date: PROGRAM_START, pos: 0 }],
    shiftOverrides: {},
    jjbStatus: {},
    muscuMoves: {},
    muscuSkipped: {},
    muscuMode: {},
    extraSessions: [],
    mealSwaps: {},
    mealPortions: {},
    shoppingChecked: {},
    workouts: {},
    perfLogs: [],
    sleepLogs: {},
    mealsDone: {},
    tasks: {},
  };
}

export const CORE_KEYS = ['settings', 'anchors', 'shiftOverrides', 'jjbStatus', 'muscuMoves', 'muscuSkipped', 'muscuMode', 'extraSessions', 'mealSwaps', 'mealPortions', 'shoppingChecked'] as const;
export const WORKOUT_KEYS = ['workouts', 'perfLogs'] as const;
export const JOURNAL_KEYS = ['sleepLogs', 'mealsDone', 'tasks'] as const;
