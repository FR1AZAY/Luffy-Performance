import type { SessionType } from '../lib/types';

type P = [number, number];
export type Gear =
  | ['bar', number, number, number, number]
  | ['bench', number, number, number, number]
  | ['post', number, number, number]
  | ['plate', number, number, number]
  | ['db', number, number, number]
  | ['step', number, number, number, number];

export interface Pose {
  head: P;
  sh: P;
  hip: P;
  legs: [P, P][];
  arms: [P, P][];
  gear: Gear[];
  arrow?: [number, number, number, number];
  floor?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  repMin: number;
  repMax: number;
  rest: number; // secondes
  load: 'barre' | 'halteres' | 'pdc' | 'temps';
  loadHint: string;
  how: string[];
  tip: string;
  pose: Pose;
}

const ex = (e: Exercise) => e;

export const EXERCISES: Record<string, Exercise> = {
  bench: ex({
    id: 'bench', name: 'Développé couché', sets: 3, reps: '8', repMin: 8, repMax: 8, rest: 120, load: 'barre',
    loadHint: 'Charge totale, barre comprise',
    how: ["Allongé, pieds au sol, omoplates serrées et légèrement cambré.", "Descends la barre sous contrôle jusqu'au bas des pectoraux, coudes à 45° du buste.", "Pousse jusqu'à l'extension sans décoller les fesses du banc."],
    tip: "Seul chez toi : garde toujours 2 à 3 répétitions en réserve et ne mets pas de stop-disques pour pouvoir vider la barre.",
    pose: { head: [33, 53], sh: [43, 55], hip: [70, 55], legs: [[[84, 62], [87, 84]]], arms: [[[44, 43], [45, 30]]], gear: [['bench', 26, 60, 84, 60], ['post', 32, 60, 84], ['post', 78, 60, 84], ['plate', 45, 30, 10]], arrow: [64, 46, 64, 26], floor: true },
  }),
  tractions: ex({
    id: 'tractions', name: 'Tractions', sets: 3, reps: '6 à 10', repMin: 6, repMax: 10, rest: 120, load: 'pdc',
    loadHint: 'Lest ajouté (0 = poids du corps)',
    how: ["Prise en pronation un peu plus large que les épaules, bras tendus.", "Tire les coudes vers les hanches jusqu'à passer le menton au-dessus de la barre.", "Redescends lentement jusqu'à l'extension complète."],
    tip: "Pas d'élan : si la dernière répétition devient saccadée, arrête la série.",
    pose: { head: [60, 24], sh: [60, 33], hip: [60, 58], legs: [[[57, 70], [55, 82]], [[63, 70], [65, 82]]], arms: [[[46, 28], [44, 12]], [[74, 28], [76, 12]]], gear: [['bar', 26, 12, 94, 12]], arrow: [102, 42, 102, 18] },
  }),
  militaire: ex({
    id: 'militaire', name: 'Développé militaire haltères', sets: 3, reps: '8 à 10', repMin: 8, repMax: 10, rest: 90, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Assis ou debout, haltères à hauteur d'épaules, abdos gainés.", "Pousse à la verticale sans cambrer le bas du dos.", "Redescends jusqu'à ce que les coudes passent sous les épaules."],
    tip: "Très sollicité au JJB : si tes épaules sont fatiguées, descends d'un cran en charge.",
    pose: { head: [60, 24], sh: [60, 34], hip: [60, 58], legs: [[[56, 71], [54, 84]], [[64, 71], [66, 84]]], arms: [[[45, 38], [44, 22]], [[75, 38], [76, 22]]], gear: [['db', 44, 22, 0], ['db', 76, 22, 0]], arrow: [100, 36, 100, 12], floor: true },
  }),
  rowing1: ex({
    id: 'rowing1', name: 'Rowing haltère', sets: 3, reps: '10', repMin: 10, repMax: 10, rest: 75, load: 'halteres',
    loadHint: 'Par haltère, 10 répétitions par bras',
    how: ["Un genou et une main sur le banc, dos plat, regard vers le sol.", "Tire l'haltère vers la hanche en gardant le coude près du corps.", "Contrôle la descente jusqu'au bras tendu."],
    tip: "Le buste ne tourne pas : c'est le dos qui travaille, pas l'élan.",
    pose: { head: [32, 38], sh: [42, 42], hip: [72, 44], legs: [[[58, 60], [74, 58]], [[78, 64], [76, 84]]], arms: [[[40, 52], [40, 61]], [[54, 36], [52, 50]]], gear: [['bench', 24, 62, 72, 62], ['post', 30, 62, 84], ['post', 66, 62, 84], ['db', 52, 51, 0]], arrow: [64, 56, 64, 38], floor: true },
  }),
  dips: ex({
    id: 'dips', name: 'Dips', sets: 2, reps: '8', repMin: 8, repMax: 8, rest: 90, load: 'pdc',
    loadHint: 'Lest ajouté (0 = poids du corps)',
    how: ["En appui bras tendus sur les barres, épaules basses.", "Descends en fléchissant les coudes jusqu'à ce que les bras soient parallèles au sol.", "Remonte sans verrouiller brutalement."],
    tip: "Ne descends pas plus bas que ce que tes épaules acceptent sans gêne.",
    pose: { head: [56, 22], sh: [58, 33], hip: [60, 58], legs: [[[66, 70], [78, 74]]], arms: [[[68, 39], [62, 48]]], gear: [['bar', 38, 48, 86, 48], ['post', 44, 48, 84], ['post', 80, 48, 84]], arrow: [98, 48, 98, 24], floor: true },
  }),
  squat: ex({
    id: 'squat', name: 'Squat haltères', sets: 3, reps: '10', repMin: 10, repMax: 10, rest: 90, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Debout, pieds largeur d'épaules, un haltère dans chaque main.", "Descends en poussant les hanches en arrière, dos droit, genoux dans l'axe des pieds.", "Remonte en poussant dans les talons."],
    tip: "Si tes haltères deviennent trop légers, passe en squat gobelet lent (3 secondes à la descente).",
    pose: { head: [64, 32], sh: [60, 42], hip: [52, 64], legs: [[[76, 68], [64, 84]]], arms: [[[60, 52], [61, 62]]], gear: [['db', 61, 63, 0]], arrow: [94, 72, 94, 46], floor: true },
  }),
  rdl: ex({
    id: 'rdl', name: 'Soulevé de terre roumain', sets: 3, reps: '10', repMin: 10, repMax: 10, rest: 90, load: 'halteres',
    loadHint: 'Par haltère (ou barre : charge totale)',
    how: ["Debout, genoux légèrement fléchis, charge devant les cuisses.", "Bascule le buste en reculant les hanches, dos plat, charge près des jambes.", "Remonte en contractant fessiers et ischios."],
    tip: "Arrête la descente dès que le bas du dos commence à s'arrondir.",
    pose: { head: [86, 43], sh: [76, 46], hip: [52, 52], legs: [[[60, 68], [58, 84]]], arms: [[[76, 56], [76, 66]]], gear: [['db', 76, 67, 0]], arrow: [96, 72, 96, 50], floor: true },
  }),
  fentes: ex({
    id: 'fentes', name: 'Fentes', sets: 2, reps: '10', repMin: 10, repMax: 10, rest: 75, load: 'halteres',
    loadHint: 'Par haltère, 10 répétitions par jambe',
    how: ["Debout, haltères le long du corps, fais un grand pas en avant.", "Descends jusqu'à frôler le sol avec le genou arrière, buste droit.", "Repousse dans le talon avant pour revenir."],
    tip: "Genou sensible après le JJB ? Fais des fentes arrière, plus douces pour l'articulation.",
    pose: { head: [60, 28], sh: [60, 38], hip: [60, 60], legs: [[[78, 66], [78, 84]], [[52, 78], [36, 82]]], arms: [[[61, 50], [63, 62]]], gear: [['db', 63, 63, 0]], arrow: [98, 72, 98, 48], floor: true },
  }),
  mollets: ex({
    id: 'mollets', name: 'Mollets debout', sets: 3, reps: '15', repMin: 15, repMax: 15, rest: 45, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Avant-pieds sur un disque ou une marche, talons dans le vide.", "Monte le plus haut possible sur la pointe des pieds.", "Marque une seconde en haut, redescends lentement sous l'horizontale."],
    tip: "Amplitude complète avant d'ajouter du poids.",
    pose: { head: [60, 18], sh: [60, 28], hip: [60, 48], legs: [[[61, 64], [62, 78]]], arms: [[[61, 39], [61, 50]]], gear: [['step', 50, 80, 24, 4], ['db', 61, 51, 0]], arrow: [86, 80, 86, 62], floor: true },
  }),
  gainage: ex({
    id: 'gainage', name: 'Gainage', sets: 3, reps: '30 à 40 s', repMin: 30, repMax: 40, rest: 45, load: 'temps',
    loadHint: 'Durée tenue, en secondes',
    how: ["En appui sur les avant-bras et les pointes de pieds.", "Aligne épaules, hanches et chevilles, fessiers et abdos serrés.", "Respire normalement et tiens la position."],
    tip: "Dès que les hanches s'affaissent, la série est terminée.",
    pose: { head: [30, 58], sh: [38, 64], hip: [70, 68], legs: [[[88, 74], [104, 82]]], arms: [[[38, 82], [26, 82]]], gear: [], floor: true },
  }),
  incline: ex({
    id: 'incline', name: 'Développé incliné haltères', sets: 3, reps: '10', repMin: 10, repMax: 10, rest: 90, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Banc incliné à 30-45°, haltères au niveau des pectoraux.", "Pousse vers le haut en rapprochant légèrement les haltères.", "Redescends lentement, coudes sous les poignets."],
    tip: "Pas de banc inclinable ? Cale une extrémité du banc sur deux disques bien stables.",
    pose: { head: [75, 38], sh: [68, 46], hip: [46, 68], legs: [[[32, 62], [28, 84]]], arms: [[[70, 33], [72, 20]]], gear: [['bench', 42, 72, 74, 42], ['bench', 42, 72, 30, 72], ['post', 36, 72, 84], ['post', 60, 56, 84], ['db', 72, 19, 0]], arrow: [92, 40, 92, 16], floor: true },
  }),
  tractionsSup: ex({
    id: 'tractionsSup', name: 'Tractions supination', sets: 3, reps: '6 à 8', repMin: 6, repMax: 8, rest: 120, load: 'pdc',
    loadHint: 'Lest ajouté (0 = poids du corps)',
    how: ["Prise en supination (paumes vers toi), mains largeur d'épaules.", "Tire jusqu'à amener le menton au-dessus de la barre, coudes vers les côtes.", "Redescends bras presque tendus, sans relâcher les épaules."],
    tip: "Sollicite fort les biceps et les avant-bras, déjà très utilisés en JJB : privilégie la qualité.",
    pose: { head: [60, 23], sh: [60, 33], hip: [60, 58], legs: [[[57, 70], [55, 82]], [[63, 70], [65, 82]]], arms: [[[49, 31], [52, 12]], [[71, 31], [68, 12]]], gear: [['bar', 26, 12, 94, 12]], arrow: [102, 42, 102, 18] },
  }),
  curl: ex({
    id: 'curl', name: 'Curl biceps', sets: 3, reps: '10 à 12', repMin: 10, repMax: 12, rest: 60, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Debout, coudes collés au buste, paumes vers l'avant.", "Monte les haltères sans bouger les coudes ni balancer le buste.", "Redescends en 2 à 3 secondes."],
    tip: "Si tu dois te pencher en arrière pour finir, la charge est trop lourde.",
    pose: { head: [60, 18], sh: [60, 28], hip: [60, 50], legs: [[[60, 66], [60, 84]]], arms: [[[61, 42], [73, 35]]], gear: [['db', 74, 34, 60]], arrow: [88, 52, 88, 30], floor: true },
  }),
  triceps: ex({
    id: 'triceps', name: 'Extension triceps', sets: 3, reps: '10 à 12', repMin: 10, repMax: 12, rest: 60, load: 'halteres',
    loadHint: 'Charge de l’haltère',
    how: ["Assis ou debout, un haltère tenu à deux mains au-dessus de la tête.", "Fléchis les coudes pour descendre l'haltère derrière la nuque, coudes serrés.", "Tends les bras sans cambrer."],
    tip: "Variante allongée sur le banc (haltères vers le front) si tes épaules manquent de mobilité.",
    pose: { head: [60, 28], sh: [60, 38], hip: [60, 59], legs: [[[60, 72], [60, 84]]], arms: [[[63, 18], [52, 22]]], gear: [['db', 51, 22, 90]], arrow: [80, 26, 80, 8], floor: true },
  }),
  rowing2: ex({
    id: 'rowing2', name: 'Rowing haltères', sets: 2, reps: '12', repMin: 12, repMax: 12, rest: 75, load: 'halteres',
    loadHint: 'Par haltère',
    how: ["Buste penché à 45°, dos plat, un haltère dans chaque main.", "Tire les deux coudes vers l'arrière en serrant les omoplates.", "Redescends bras tendus sans arrondir le dos."],
    tip: "Bas du dos fatigué ? Fais-le buste en appui sur le banc incliné.",
    pose: { head: [86, 40], sh: [76, 44], hip: [50, 54], legs: [[[60, 68], [56, 84]]], arms: [[[66, 40], [72, 54]]], gear: [['db', 72, 55, 0]], arrow: [92, 62, 92, 44], floor: true },
  }),
};

export interface Program { type: SessionType; title: string; focus: string; exercises: string[] }

export const PROGRAMS: Record<SessionType, Program> = {
  A: { type: 'A', title: 'Haut du corps', focus: 'Pectoraux, dos, épaules', exercises: ['bench', 'tractions', 'militaire', 'rowing1', 'dips'] },
  B: { type: 'B', title: 'Jambes et gainage', focus: 'Quadriceps, ischios, mollets, tronc', exercises: ['squat', 'rdl', 'fentes', 'mollets', 'gainage'] },
  C: { type: 'C', title: 'Bras, pectoraux et dos', focus: 'Pectoraux, dos, biceps, triceps', exercises: ['incline', 'tractionsSup', 'curl', 'triceps', 'rowing2'] },
};

export const WARMUP = [
  '5 minutes pour monter en température : corde à sauter, montées de genoux ou jumping jacks',
  'Mobilité des épaules, hanches et poignets : 10 rotations par articulation',
  '2 séries légères du premier exercice (50 % puis 75 % de la charge de travail)',
];

export const TRAINING_RULES = [
  "Commence toujours par l'échauffement.",
  'Garde 2 à 3 répétitions en réserve à chaque série.',
  "Ne cherche pas l'échec musculaire systématiquement.",
  'Augmente la charge uniquement si la technique reste propre sur toutes les séries.',
  'Un cycle sur quatre est allégé pour récupérer.',
  'Le volume baisse quand le JJB devient très intense.',
];

export interface PlannedExercise { ex: Exercise; sets: number }

/** Exercices et séries effectifs selon le type de séance et les allègements */
export function sessionExercises(type: SessionType, kind: 'main' | 'bonus' | 'libre', opts: { deload?: boolean; light?: boolean } = {}): PlannedExercise[] {
  const ids = PROGRAMS[type].exercises;
  if (kind === 'bonus') return ids.slice(0, 3).map((id) => ({ ex: EXERCISES[id], sets: 2 }));
  const reduce = opts.deload || opts.light;
  return ids.map((id) => {
    const e = EXERCISES[id];
    return { ex: e, sets: reduce ? Math.max(2, e.sets - 1) : e.sets };
  });
}
