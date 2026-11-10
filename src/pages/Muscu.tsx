import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CalendarClock, Check, ChevronDown, ChevronLeft, History, Play, Plus, SkipForward, Timer, TriangleAlert } from 'lucide-react';
import { useApp } from '../store';
import { suggestReschedule, SHIFT_NAME } from '../lib/engine';
import { addDays, cap, fmtDate, fmtTime } from '../lib/dates';
import { sessionAdvice } from '../lib/recovery';
import { moveSession, putWorkout, skipSession } from '../lib/actions';
import { EXERCISES, PROGRAMS, sessionExercises, TRAINING_RULES, WARMUP, type Exercise, type PlannedExercise } from '../data/programs';
import { CheckRow, Empty, Flag, Modal, PageHead, Rating, Section, Segmented } from '../components/ui';
import { ExerciseArt } from '../components/art';
import type { AppState, MuscuSession, SessionType, SetLog, WorkoutLog } from '../lib/types';

const kg = (v: number) => String(v).replace('.', ',');
const restLabel = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) : ''}` : `${s} s`);

/** Proposition de charge à partir de la dernière séance : hausse seulement si toutes les séries étaient au maximum de la fourchette. */
function suggest(ex: Exercise, state: AppState, currentId: string, deload: boolean): { w: number | null; note: string } {
  const past = Object.entries(state.workouts)
    .filter(([id, w]) => id !== currentId && (w.sets[ex.id] ?? []).some((s) => s.done))
    .sort((a, b) => (a[1].date < b[1].date ? 1 : -1));
  if (!past.length) return { w: null, note: ex.load === 'temps' ? 'Tiens la position sans que les hanches bougent.' : 'Première fois : choisis une charge qui te laisse 2 à 3 répétitions en réserve.' };
  const sets = past[0][1].sets[ex.id].filter((s) => s.done);
  const reps = sets.map((s) => s.r ?? 0);
  const lastW = Math.max(...sets.map((s) => s.w ?? 0));
  const allTop = reps.every((r) => r >= ex.repMax);
  if (ex.load === 'temps') return { w: null, note: `Dernière fois : ${reps.join(', ')} s${allTop ? ' → vise 5 secondes de plus' : ''}` };
  let w = lastW;
  let note = `Dernière fois : ${reps.join(', ')} rép.${ex.load === 'pdc' ? (lastW ? ` avec ${kg(lastW)} kg de lest` : ' au poids du corps') : ` à ${kg(lastW)} kg`}`;
  if (deload) {
    w = ex.load === 'pdc' ? 0 : Math.round((lastW * 0.9) / 0.5) * 0.5;
    note += ex.load === 'pdc' ? ' → sans lest ce cycle' : ` → ${kg(w)} kg ce cycle (récupération)`;
  } else if (allTop) {
    if (ex.load === 'pdc') note += ' → ajoute 1 répétition, ou 2,5 kg de lest';
    else {
      const step = ex.load === 'barre' ? state.settings.equip.barStepKg : state.settings.equip.dbStepKg;
      const max = ex.load === 'barre' ? state.settings.equip.barMaxKg : state.settings.equip.dbMaxKg;
      if (lastW + step <= max) { w = lastW + step; note += ` → ${kg(w)} kg si la technique était propre`; }
      else note += ' → charge maximale de ton matériel : ajoute des répétitions ou ralentis la descente (3 secondes)';
    }
  } else note += ' → même charge, complète d’abord toutes les répétitions';
  return { w, note };
}

function buildLog(s: MuscuSession, planned: PlannedExercise[], state: AppState, existing?: WorkoutLog): WorkoutLog {
  const sets: Record<string, SetLog[]> = {};
  for (const { ex, sets: n } of planned) {
    const cur = existing?.sets[ex.id] ?? [];
    const sug = existing ? null : suggest(ex, state, s.id, s.deload);
    const arr: SetLog[] = [];
    for (let i = 0; i < Math.max(n, cur.filter((x) => x.done).length); i++) {
      arr.push(cur[i] ?? { w: ex.load === 'temps' ? null : sug?.w ?? cur[0]?.w ?? null, r: ex.repMin === ex.repMax ? ex.repMin : null, done: false });
    }
    sets[ex.id] = arr;
  }
  return { date: s.date, type: s.type, kind: s.kind, done: false, ...existing, sets };
}

function ExerciseDetail({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={ex.name}>
      <div className="flex flex-col gap-4">
        <ExerciseArt pose={ex.pose} label={ex.name} className="mx-auto w-full max-w-[280px]" />
        <div className="tabular text-muted">{ex.sets} × {ex.reps} · repos {restLabel(ex.rest)}</div>
        <ol className="flex flex-col gap-2">
          {ex.how.map((h, i) => <li key={i} className="flex gap-3"><span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised text-sm">{i + 1}</span><span>{h}</span></li>)}
        </ol>
        <p className="rounded-xl bg-raised p-3 text-sm"><span className="font-semibold">À surveiller : </span>{ex.tip}</p>
      </div>
    </Modal>
  );
}

function MoveModal({ session, onClose }: { session: MuscuSession; onClose: () => void }) {
  const { plan, ref, update, toast } = useApp();
  const from = session.date < ref ? ref : session.date;
  const best = suggestReschedule(plan, session, session.date < ref ? ref : addDays(session.date, 1));
  const options = Array.from({ length: 8 }, (_, k) => plan.byDate[addDays(from, k)]).filter((d) => d && d.date !== session.date);
  return (
    <Modal open onClose={onClose} title={`Déplacer la séance ${session.type}`}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">Les jours sont classés selon ton poste, ton JJB et ta récupération. Jamais de séance lourde un lendemain de nuit.</p>
        {options.map((d) => {
          const blocked = d.prev === 'N';
          const taken = d.muscu.some((m) => m.id !== session.id);
          return (
            <button key={d.date} disabled={blocked} onClick={() => { update(moveSession(session.id, d.date)); toast(`Séance déplacée au ${fmtDate(d.date, 'medium')}`); onClose(); }}
              className={`flex min-h-[56px] items-center justify-between gap-3 rounded-xl border px-3 text-left ${d.date === best ? 'border-accent bg-accent/10' : 'border-line bg-raised'} ${blocked ? 'opacity-45' : 'hover:border-faint'}`}>
              <span><span className="block font-semibold">{cap(fmtDate(d.date, 'medium'))}</span><span className="text-sm text-muted">{SHIFT_NAME[d.shift]}{d.jjb.some((j) => j.active) ? ' · JJB' : ''}{taken ? ' · déjà une séance' : ''}{blocked ? ' · lendemain de nuit' : ''}</span></span>
              {d.date === best && <Flag tone="accent">Conseillé</Flag>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function Workout({ session }: { session: MuscuSession }) {
  const { state, update, plan, today, go, toast } = useApp();
  const advice = useMemo(() => sessionAdvice(session, state, plan, today), [session, state, plan, today]);
  const planned = useMemo(() => sessionExercises(session.type, session.kind, { deload: session.deload, light: advice.light }), [session, advice.light]);
  const stored = state.workouts[session.id];
  const log = useMemo(() => buildLog(session, planned, state, stored), [session, planned, stored]);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [moving, setMoving] = useState(false);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [, tick] = useState(0);
  const prog = PROGRAMS[session.type];

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= rest.end + 4000) setRest(null);
    }, 250);
    return () => clearInterval(id);
  }, [rest]);

  const save = (next: WorkoutLog) => update(putWorkout(session.id, next));
  const setSet = (exId: string, i: number, patch: Partial<SetLog>) => {
    const arr = log.sets[exId].map((s, k) => (k === i ? { ...s, ...patch } : s));
    save({ ...log, sets: { ...log.sets, [exId]: arr } });
  };
  const toggle = (ex: Exercise, i: number) => {
    const s = log.sets[ex.id][i];
    const done = !s.done;
    setSet(ex.id, i, { done, r: s.r ?? ex.repMin });
    if (done) setRest({ end: Date.now() + ex.rest * 1000, total: ex.rest });
  };
  const total = planned.reduce((n, p) => n + p.sets, 0);
  const doneSets = planned.reduce((n, p) => n + log.sets[p.ex.id].filter((s) => s.done).length, 0);
  const remaining = rest ? Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)) : 0;
  const best = advice.suggestMove ? suggestReschedule(plan, session, addDays(today, 1)) : null;

  const finish = () => {
    save({ ...log, done: true });
    toast('Séance enregistrée. Bien joué.');
    go('musculation');
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <button className="btn btn-quiet -ml-2 self-start" onClick={() => go('musculation')}><ChevronLeft size={18} />Toutes les séances</button>
        <div className="eyebrow">{cap(fmtDate(session.date, 'medium'))} · {fmtTime(session.start)} · environ {session.dur} min</div>
        <h1 className="display text-[34px] italic sm:text-[40px]">Séance {session.type} <span className="text-accent">{prog.title}</span></h1>
        <div className="flex flex-wrap gap-2">
          {session.kind === 'bonus' && <Flag tone="muted">Séance courte bonus</Flag>}
          {session.kind === 'libre' && <Flag tone="muted">Séance libre</Flag>}
          {session.deload && <Flag tone="warn">Cycle de récupération</Flag>}
          {session.moved && <Flag tone="muted">Déplacée</Flag>}
          {log.done && <Flag tone="ok">Terminée</Flag>}
        </div>
      </div>

      {(session.deload || advice.reasons.length > 0 || session.kind === 'bonus') && !log.done && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          {session.deload && <p className="text-sm"><span className="font-semibold">Cycle de récupération :</span> une série de moins par exercice et charges réduites d’environ 10 %. C’est prévu, pas un recul.</p>}
          {session.kind === 'bonus' && <p className="text-sm"><span className="font-semibold">Séance optionnelle :</span> 3 exercices, 2 séries. À faire seulement si ta récupération est bonne, sinon saute-la sans regret.</p>}
          {advice.reasons.length > 0 && (
            <>
              <p className="flex items-start gap-2 text-sm"><TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" /><span><span className="font-semibold">{advice.reasons.join(' · ')}.</span> {advice.light ? 'La séance est passée en version allégée : une série de moins par exercice.' : 'Tu as choisi de faire la séance complète.'}</span></p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => update((s) => ({ ...s, muscuMode: { ...s.muscuMode, [session.id]: advice.light ? 'full' : 'light' } }))}>{advice.light ? 'Faire la séance complète' : 'Repasser en version allégée'}</button>
                {best && <button className="btn btn-ghost btn-sm" onClick={() => { update(moveSession(session.id, best)); toast(`Séance déplacée au ${fmtDate(best, 'medium')}`); go('musculation'); }}><CalendarClock size={15} />Déplacer au {fmtDate(best, 'medium')}</button>}
              </div>
            </>
          )}
        </div>
      )}

      <Section title="Échauffement">
        <div className="panel px-4 py-1">
          <CheckRow checked={!!log.warmup} onChange={(v) => save({ ...log, warmup: v })} sub={WARMUP.join(' · ')}>Échauffement fait</CheckRow>
        </div>
      </Section>

      <Section title={`Exercices · ${doneSets} / ${total} séries`}>
        <div className="flex flex-col gap-3">
          {planned.map(({ ex, sets }, n) => {
            const sug = suggest(ex, state, session.id, session.deload);
            const hist = Object.entries(state.workouts).filter(([id, w]) => id !== session.id && (w.sets[ex.id] ?? []).some((s) => s.done)).sort((a, b) => (a[1].date < b[1].date ? 1 : -1)).slice(0, 4);
            const arr = log.sets[ex.id];
            const allDone = arr.every((s) => s.done);
            return (
              <article key={ex.id} className={`panel flex flex-col gap-3 p-4 ${allDone ? 'opacity-80' : ''}`}>
                <div className="flex gap-3">
                  <button onClick={() => setDetail(ex)} aria-label={`Voir l'exécution : ${ex.name}`} className="shrink-0"><ExerciseArt pose={ex.pose} label={ex.name} className="h-[72px] w-24" /></button>
                  <div className="min-w-0 flex-1">
                    <div className="eyebrow">Exercice {n + 1}</div>
                    <h3 className="display text-2xl leading-tight">{ex.name}</h3>
                    <div className="tabular mt-1 text-sm text-muted">{sets} × {ex.reps} · repos {restLabel(ex.rest)}</div>
                  </div>
                </div>
                <p className="text-sm text-muted">{sug.note}</p>
                <div className="flex flex-col gap-2">
                  {arr.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="num w-6 text-center text-lg text-muted">{i + 1}</span>
                      {ex.load !== 'temps' && (
                        <label className="relative min-w-0 flex-1">
                          <span className="sr-only">{ex.loadHint}, série {i + 1}</span>
                          <input id={`w-${ex.id}-${i}`} type="number" inputMode="decimal" step="0.5" min="0" className="field pr-9" placeholder={ex.load === 'pdc' ? 'lest' : 'charge'} value={s.w ?? ''}
                            onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); setSet(ex.id, i, { w: Number.isFinite(v) ? v : null }); }} />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">kg</span>
                        </label>
                      )}
                      <label className="relative min-w-0 flex-1">
                        <span className="sr-only">{ex.load === 'temps' ? 'Secondes tenues' : 'Répétitions'}, série {i + 1}</span>
                        <input id={`r-${ex.id}-${i}`} type="number" inputMode="numeric" min="0" className="field pr-10" placeholder={ex.reps.replace(' s', '')} value={s.r ?? ''}
                          onChange={(e) => { const v = parseInt(e.target.value, 10); setSet(ex.id, i, { r: Number.isFinite(v) ? v : null }); }} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">{ex.load === 'temps' ? 's' : 'rép.'}</span>
                      </label>
                      <button onClick={() => toggle(ex, i)} aria-pressed={s.done} aria-label={`Valider la série ${i + 1} de ${ex.name}`}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${s.done ? 'border-ok bg-ok text-bg' : 'border-line bg-bg text-faint hover:border-faint'}`}>
                        <Check size={20} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-faint">{ex.loadHint}</span>
                  <button className="inline-flex items-center gap-1 font-semibold text-accent" onClick={() => setDetail(ex)}>Exécution<ArrowRight size={14} /></button>
                </div>
                {hist.length > 0 && (
                  <details className="group rounded-xl bg-raised/60 px-3 py-2 text-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium"><span className="flex items-center gap-2"><History size={15} />Historique des charges</span><ChevronDown size={16} className="transition-transform group-open:rotate-180" /></summary>
                    <ul className="tabular mt-2 flex flex-col gap-1 text-muted">
                      {hist.map(([id, w]) => {
                        const ds = w.sets[ex.id].filter((x) => x.done);
                        return <li key={id}>{fmtDate(w.date, 'short')} : {ex.load === 'temps' ? ds.map((x) => `${x.r} s`).join(', ') : ds.map((x) => `${x.w ? kg(x.w) + ' kg × ' : ''}${x.r}`).join(', ')}</li>;
                      })}
                    </ul>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="Après la séance">
        <div className="panel flex flex-col gap-4 p-4">
          <Rating label="Sensations" value={log.feeling} onChange={(v) => save({ ...log, feeling: v })} low="Séance difficile" high="Excellentes" />
          <Rating label="Fatigue en fin de séance" value={log.fatigue} onChange={(v) => save({ ...log, fatigue: v })} low="Frais" high="Épuisé" />
          <label htmlFor="note-seance" className="flex flex-col gap-1"><span className="text-sm font-medium">Notes</span>
            <textarea id="note-seance" className="field" placeholder="Douleur, exercice à ajuster, charge trop légère…" value={log.note ?? ''} onChange={(e) => save({ ...log, note: e.target.value })} />
          </label>
          {log.done
            ? <button className="btn btn-ghost" onClick={() => save({ ...log, done: false })}>Rouvrir la séance</button>
            : <button className="btn btn-primary" onClick={finish} disabled={doneSets === 0}>Terminer la séance</button>}
          {!log.done && doneSets === 0 && <p className="text-center text-sm text-faint">Valide au moins une série pour terminer.</p>}
          {!log.done && (
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn btn-quiet btn-sm" onClick={() => setMoving(true)}><CalendarClock size={15} />Déplacer</button>
              {session.kind !== 'libre' && <button className="btn btn-quiet btn-sm" onClick={() => { update(skipSession(session.id, true)); toast('Séance passée. Tu peux la rétablir depuis la liste.', 'info'); go('musculation'); }}><SkipForward size={15} />Passer cette séance</button>}
            </div>
          )}
        </div>
      </Section>

      {rest && createPortal(
        <div className="fixed inset-x-0 z-40 flex justify-center px-4 lg:left-[232px]" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 shadow-lg shadow-black/50">
            <Timer size={20} className={remaining > 0 ? 'text-accent' : 'text-ok'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between"><span className="text-sm font-semibold">{remaining > 0 ? 'Repos' : 'Repos terminé : série suivante'}</span>{remaining > 0 && <span className="num text-2xl">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, 100 - (remaining / rest.total) * 100)}%` }} /></div>
            </div>
            <button className="btn btn-quiet btn-sm" onClick={() => setRest(null)}>Passer</button>
          </div>
        </div>,
        document.body,
      )}
      {detail && <ExerciseDetail ex={detail} onClose={() => setDetail(null)} />}
      {moving && <MoveModal session={session} onClose={() => { setMoving(false); go('musculation'); }} />}
    </>
  );
}

function SessionCard({ s }: { s: MuscuSession }) {
  const { state, go, today } = useApp();
  const [moving, setMoving] = useState(false);
  const done = state.workouts[s.id]?.done;
  const started = !done && Object.values(state.workouts[s.id]?.sets ?? {}).some((a) => a.some((x) => x.done));
  return (
    <div className={`panel flex flex-wrap items-center justify-between gap-3 p-4 ${s.date === today ? 'ring-1 ring-accent/60' : ''}`}>
      <div className="min-w-0">
        <div className="eyebrow">{cap(fmtDate(s.date, 'medium'))} · {fmtTime(s.start)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2"><span className="display text-2xl">Séance {s.type}</span><span className="text-muted">{PROGRAMS[s.type].title}</span></div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {s.date === today && <Flag tone="accent">Aujourd’hui</Flag>}
          {s.kind === 'bonus' && <Flag tone="muted">Bonus courte</Flag>}
          {s.kind === 'libre' && <Flag tone="muted">Libre</Flag>}
          {s.deload && <Flag tone="warn">Allégée</Flag>}
          {s.moved && <Flag tone="muted">Déplacée</Flag>}
          {s.warn && <Flag tone="warn">Lendemain de nuit</Flag>}
          {done && <Flag tone="ok">Faite</Flag>}
          {started && <Flag tone="warn">En cours</Flag>}
        </div>
      </div>
      <div className="flex gap-2">
        {!done && <button className="btn btn-ghost btn-sm" onClick={() => setMoving(true)} aria-label="Déplacer la séance"><CalendarClock size={16} /></button>}
        <button className={`btn btn-sm ${s.date === today && !done ? 'btn-primary' : 'btn-ghost'}`} onClick={() => go('musculation', { session: s.id })}>{done ? 'Revoir' : <><Play size={15} />Ouvrir</>}</button>
      </div>
      {moving && <MoveModal session={s} onClose={() => setMoving(false)} />}
    </div>
  );
}

export default function Muscu() {
  const { state, update, plan, ref, today, sessionId, toast, go } = useApp();
  const [tab, setTab] = useState<'seances' | 'programme' | 'historique'>('seances');
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [adding, setAdding] = useState(false);
  const open = sessionId ? plan.sessions.find((s) => s.id === sessionId) : null;
  if (open) return <Workout key={open.id} session={open} />;

  const missed = plan.sessions.filter((s) => s.kind === 'main' && !s.skipped && s.date < today && s.date >= addDays(today, -14) && !state.workouts[s.id]?.done);
  const upcoming = plan.sessions.filter((s) => !s.skipped && s.date >= ref).slice(0, 7);
  const skipped = plan.sessions.filter((s) => s.skipped && s.date >= addDays(ref, -10)).slice(0, 4);
  const history = Object.entries(state.workouts).filter(([, w]) => w.done).sort((a, b) => (a[1].date < b[1].date ? 1 : -1));
  const addFree = (type: SessionType) => {
    const id = `libre-${ref}-${type}-${Date.now().toString(36)}`;
    update((s) => ({ ...s, extraSessions: [...s.extraSessions, { id, date: ref, type }] }));
    setAdding(false);
    go('musculation', { session: id });
  };

  return (
    <>
      <PageHead title="Musculation" sub="Deux séances principales par cycle de 10 jours, une séance courte en bonus si la récupération est bonne." />
      <Segmented label="Sections de la musculation" value={tab} onChange={setTab} options={[{ value: 'seances', label: 'Séances' }, { value: 'programme', label: 'Programme' }, { value: 'historique', label: 'Historique' }]} />

      {tab === 'seances' && (
        <>
          {missed.length > 0 && (
            <Section title="Séances manquées">
              {missed.map((s) => {
                const to = suggestReschedule(plan, s, today >= plan.start ? today : plan.start);
                return (
                  <div key={s.id} className="flex flex-col gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4">
                    <div><span className="font-semibold">Séance {s.type} du {fmtDate(s.date, 'medium')} non faite.</span> <span className="text-sm text-muted">{to ? `Meilleur créneau de rattrapage : ${fmtDate(to, 'medium')}.` : 'Pas de créneau correct dans les 7 jours : mieux vaut la laisser.'}</span></div>
                    <div className="flex flex-wrap gap-2">
                      {to && <button className="btn btn-primary btn-sm" onClick={() => { update(moveSession(s.id, to)); toast(`Séance reprogrammée au ${fmtDate(to, 'medium')}`); }}>Reprogrammer au {fmtDate(to, 'medium')}</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => { update(skipSession(s.id, true)); toast('Séance abandonnée', 'info'); }}>Abandonner</button>
                    </div>
                  </div>
                );
              })}
            </Section>
          )}
          <Section title="Prochaines séances" action={<button className="inline-flex items-center gap-1 text-sm font-semibold text-accent" onClick={() => setAdding(true)}><Plus size={15} />Séance libre</button>}>
            {upcoming.length ? upcoming.map((s) => <SessionCard key={s.id} s={s} />) : <Empty title="Programme terminé" text="Toutes les séances du programme sont passées." />}
          </Section>
          {skipped.length > 0 && (
            <Section title="Séances passées volontairement">
              {skipped.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line/70 p-3">
                  <span className="text-muted">Séance {s.type} du {fmtDate(s.date, 'medium')}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => update(skipSession(s.id, false))}>Rétablir</button>
                </div>
              ))}
            </Section>
          )}
        </>
      )}

      {tab === 'programme' && (
        <>
          {(['A', 'B', 'C'] as SessionType[]).map((t) => (
            <Section key={t} title={`Séance ${t} · ${PROGRAMS[t].title}`}>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROGRAMS[t].exercises.map((id) => {
                  const ex = EXERCISES[id];
                  return (
                    <button key={id} onClick={() => setDetail(ex)} className="panel flex items-center gap-3 p-2.5 text-left hover:border-faint">
                      <ExerciseArt pose={ex.pose} label={ex.name} className="h-[60px] w-20 shrink-0" />
                      <span className="min-w-0"><span className="block font-semibold">{ex.name}</span><span className="tabular text-sm text-muted">{ex.sets} × {ex.reps} · repos {restLabel(ex.rest)}</span></span>
                    </button>
                  );
                })}
              </div>
            </Section>
          ))}
          <Section title="Règles d’entraînement">
            <ul className="panel flex flex-col gap-2 p-4">{TRAINING_RULES.map((r, i) => <li key={i} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-ok" />{r}</li>)}</ul>
          </Section>
        </>
      )}

      {tab === 'historique' && (
        <Section title="Séances terminées">
          {history.length === 0 && <Empty title="Aucune séance terminée" text="Tes séances validées apparaîtront ici avec les charges, les sensations et la fatigue." />}
          {history.map(([id, w]) => {
            const n = Object.values(w.sets).reduce((a, s) => a + s.filter((x) => x.done).length, 0);
            return (
              <button key={id} onClick={() => go('musculation', { session: id })} disabled={!plan.sessions.some((s) => s.id === id)} className="panel flex items-center justify-between gap-3 p-4 text-left hover:border-faint">
                <div className="min-w-0">
                  <div className="eyebrow">{cap(fmtDate(w.date, 'medium'))}</div>
                  <div className="display mt-1 text-xl">Séance {w.type} · {n} séries</div>
                  <div className="text-sm text-muted">{w.feeling ? `Sensations ${w.feeling}/5` : 'Sensations non notées'}{w.fatigue ? ` · fatigue ${w.fatigue}/5` : ''}{w.note ? ` · ${w.note}` : ''}</div>
                </div>
                <ArrowRight size={18} className="shrink-0 text-faint" />
              </button>
            );
          })}
        </Section>
      )}

      {detail && <ExerciseDetail ex={detail} onClose={() => setDetail(null)} />}
      <Modal open={adding} onClose={() => setAdding(false)} title="Séance libre aujourd’hui">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Ajoute une séance hors planning. Elle compte dans tes statistiques et ton historique.</p>
          {(['A', 'B', 'C'] as SessionType[]).map((t) => (
            <button key={t} className="flex min-h-[56px] items-center justify-between rounded-xl border border-line bg-raised px-4 text-left hover:border-faint" onClick={() => addFree(t)}>
              <span><span className="display text-xl">Séance {t}</span><span className="ml-2 text-muted">{PROGRAMS[t].title}</span></span><ArrowRight size={18} className="text-faint" />
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
