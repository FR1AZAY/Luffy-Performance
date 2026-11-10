import { useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Pencil, Swords, TriangleAlert } from 'lucide-react';
import { useApp } from '../store';
import { CYCLE, SHIFT_NAME, shiftOn } from '../lib/engine';
import { addDays, cap, fmtDate, fmtDur, fmtTime, JOURS_INIT, MOIS, mondayOf, parts } from '../lib/dates';
import { patchJjb, toggleTask } from '../lib/actions';
import { CheckRow, Flag, Modal, PageHead, Section, Segmented, ShiftBadge, SHIFT_UI } from '../components/ui';
import { Timeline } from '../components/Timeline';
import { RecipeModal } from '../components/RecipeModal';
import { CycleStrip } from './Home';
import type { DayPlan, MealSlot, Shift } from '../lib/types';

type View = 'jour' | 'semaine' | 'mois' | 'cycle';

function ShiftModal({ day, onClose }: { day: DayPlan; onClose: () => void }) {
  const { state, update, toast } = useApp();
  const [shift, setShift] = useState<Shift>(day.shift);
  const [mode, setMode] = useState<'jour' | 'suite'>('jour');
  const [pos, setPos] = useState(day.cyclePos - 1);
  const anchorHere = state.anchors.some((a) => a.date === day.date && !(a.date === state.settings.programStart && a.pos === 0));
  const hasChange = day.overridden || anchorHere;

  const save = () => {
    update((s) => {
      const ov = { ...s.shiftOverrides };
      let anchors = s.anchors;
      if (mode === 'jour') {
        const base = shiftOn(day.date, s.anchors, {}).shift;
        if (shift === base) delete ov[day.date]; else ov[day.date] = shift;
      } else {
        delete ov[day.date];
        anchors = [...s.anchors.filter((a) => a.date !== day.date), { date: day.date, pos }].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      }
      return { ...s, shiftOverrides: ov, anchors };
    });
    toast(mode === 'jour' ? 'Poste modifié pour ce jour' : 'Cycle recalculé à partir de cette date');
    onClose();
  };
  const reset = () => {
    update((s) => {
      const ov = { ...s.shiftOverrides };
      delete ov[day.date];
      let anchors = s.anchors.filter((a) => a.date !== day.date);
      if (day.date === s.settings.programStart || !anchors.length) anchors = [{ date: s.settings.programStart, pos: 0 }, ...anchors];
      return { ...s, shiftOverrides: ov, anchors };
    });
    toast('Cycle normal rétabli');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Modifier le poste"
      footer={<>{hasChange && <button className="btn btn-ghost" onClick={reset}>Rétablir le cycle normal</button>}<button className="btn btn-primary" onClick={save}>Enregistrer</button></>}>
      <div className="flex flex-col gap-5">
        <p className="text-muted">{cap(fmtDate(day.date))}</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => setMode('jour')} aria-pressed={mode === 'jour'} className={`rounded-xl border p-3 text-left ${mode === 'jour' ? 'border-accent bg-accent/10' : 'border-line'}`}>
            <div className="font-semibold">Exception pour ce jour uniquement</div>
            <div className="text-sm text-muted">Remplacement, congé, échange de poste. Les jours suivants ne bougent pas.</div>
          </button>
          <button onClick={() => setMode('suite')} aria-pressed={mode === 'suite'} className={`rounded-xl border p-3 text-left ${mode === 'suite' ? 'border-accent bg-accent/10' : 'border-line'}`}>
            <div className="font-semibold">Recaler le cycle à partir de ce jour</div>
            <div className="text-sm text-muted">Changement d’équipe ou de roulement. Tous les jours suivants sont recalculés.</div>
          </button>
        </div>
        {mode === 'jour' ? (
          <div className="grid grid-cols-2 gap-2">
            {(['M', 'A', 'N', 'R'] as Shift[]).map((s) => (
              <button key={s} onClick={() => setShift(s)} aria-pressed={shift === s} className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border font-semibold ${shift === s ? `border-fg ${SHIFT_UI[s].bg}` : 'border-line bg-raised'}`}>
                <span className={`h-2 w-2 rounded-full ${SHIFT_UI[s].solid}`} />{SHIFT_NAME[s]}
              </button>
            ))}
          </div>
        ) : (
          <label htmlFor="cycle-pos" className="flex flex-col gap-1">
            <span className="text-sm text-muted">Ce jour devient</span>
            <select id="cycle-pos" className="field" value={pos} onChange={(e) => setPos(Number(e.target.value))}>
              {CYCLE.map((s, i) => <option key={i} value={i}>Jour {i + 1} du cycle : {SHIFT_NAME[s]}</option>)}
            </select>
          </label>
        )}
      </div>
    </Modal>
  );
}

function DayRow({ d, onPick }: { d: DayPlan; onPick: (date: string) => void }) {
  const { today, state } = useApp();
  const jjb = d.jjb.filter((j) => j.decision !== 'cancelled');
  return (
    <button onClick={() => onPick(d.date)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-faint ${d.date === today ? 'border-accent bg-accent/5' : 'border-line/70 bg-surface'}`}>
      <div className="w-12 shrink-0 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{fmtDate(d.date, 'weekday').slice(0, 3)}</div>
        <div className="num text-2xl">{parts(d.date).d}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <ShiftBadge shift={d.shift} small />
          {d.overridden && <Flag tone="muted">Exception</Flag>}
          {d.muscu.map((m) => <Flag key={m.id} tone={state.workouts[m.id]?.done ? 'ok' : 'accent'}><Dumbbell size={12} />{m.type}{m.kind === 'bonus' ? ' bonus' : ''} {fmtTime(m.start)}</Flag>)}
          {jjb.map((j) => <Flag key={j.key} tone={j.done ? 'ok' : j.status === 'conflict' ? 'bad' : j.status === 'partial' ? 'warn' : 'muted'}><Swords size={12} />{j.status === 'conflict' ? 'Conflit' : fmtTime(j.effStart)}</Flag>)}
        </div>
        <div className="tabular mt-1 truncate text-sm text-muted">{d.workLabel} · réveil {fmtTime(d.wake)}{d.bed !== null ? ` · coucher ${fmtTime(d.bed)}` : ''}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-faint" />
    </button>
  );
}

function DayView({ day }: { day: DayPlan }) {
  const { state, update, today, nowMin, go, plan } = useApp();
  const [edit, setEdit] = useState(false);
  const [meal, setMeal] = useState<MealSlot | null>(null);
  const tasks = state.tasks[day.date] ?? {};
  const tomorrow = plan.days[day.idx + 1];
  const jjbActive = day.jjb.filter((j) => j.active);
  const generic: { key: string; label: string }[] = [
    { key: 'hydratation', label: 'Boire au moins 2 litres d’eau' },
    ...(day.muscu.length === 0 ? [{ key: 'mobilite', label: '10 minutes de mobilité ou d’étirements' }] : []),
    ...(day.nap ? [{ key: 'sieste', label: `${day.nap.label} (${fmtDur(day.nap.dur)})` }] : []),
    ...(jjbActive.length || tomorrow?.jjb.some((j) => j.active && j.effStart < 720) ? [{ key: 'sac', label: 'Préparer le sac de JJB' }] : []),
    ...(day.bed !== null ? [{ key: 'coucher', label: `Au lit à ${fmtTime(day.bed)}` }] : []),
  ];
  return (
    <>
      <div className="panel flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="display text-3xl italic">{cap(fmtDate(day.date))}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><ShiftBadge shift={day.shift} /><span className="tabular text-muted">{day.workLabel}</span><Flag tone="muted">Jour {day.cyclePos} / 10</Flag>{day.overridden && <Flag tone="muted">Exception</Flag>}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}><Pencil size={15} />Modifier le poste</button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div><div className="eyebrow">Réveil</div><div className="num mt-1 text-2xl">{fmtTime(day.wake)}</div></div>
          <div><div className="eyebrow">Coucher</div><div className="num mt-1 text-2xl">{day.bed !== null ? fmtTime(day.bed) : '–'}</div>{day.bed === null && <div className="text-xs text-muted">sommeil après le poste</div>}</div>
          <div><div className="eyebrow">Sommeil prévu</div><div className="num mt-1 text-2xl">{fmtDur(day.plannedSleepMin)}</div>{day.nap && <div className="text-xs text-muted">dont sieste {fmtDur(day.nap.dur)}</div>}</div>
          <div><div className="eyebrow">Récupération</div><div className="num mt-1 text-2xl">{day.recoveryGapH !== null ? `${String(day.recoveryGapH).replace('.', ',')} h` : 'Libre'}</div><div className="text-xs text-muted">{day.recoveryGapH !== null ? 'avant la prochaine séance' : 'pas d’entraînement'}</div></div>
        </div>
        {day.sleepNote && <p className="text-sm text-muted">{day.sleepNote}</p>}
      </div>

      {(day.conflicts.length > 0 || day.jjb.some((j) => j.status === 'partial' && j.decision !== 'cancelled')) && (
        <div className="flex flex-col gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-warn"><TriangleAlert size={18} />À arbitrer</div>
          {day.conflicts.map((c, i) => <p key={i} className="text-sm">{c}</p>)}
          {day.jjb.filter((j) => j.status === 'partial' && j.decision !== 'cancelled').map((j) => <p key={j.key} className="text-sm">JJB raccourci à {fmtTime(j.effStart)} – {fmtTime(j.effEnd)} : {j.reasons[0]}.</p>)}
          {day.jjb.length > 0 && <button className="btn btn-ghost btn-sm self-start" onClick={() => go('jjb', { date: day.date })}>Décider dans JJB</button>}
        </div>
      )}

      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Section title="Déroulé de la journée">
          <div className="panel px-3 py-2">
            <Timeline day={day} nowMin={day.date === today ? nowMin : undefined}
              done={(e) => (e.kind === 'meal' ? !!state.mealsDone[day.date]?.[e.ref ?? ''] : e.kind === 'muscu' ? !!state.workouts[e.ref ?? '']?.done : e.kind === 'jjb' ? !!state.jjbStatus[e.ref ?? '']?.done : false)}
              onOpen={(e) => {
                if (e.kind === 'meal') setMeal(day.meals.find((m) => m.key === e.ref) ?? null);
                if (e.kind === 'muscu') go('musculation', { session: e.ref });
                if (e.kind === 'jjb') go('jjb', { date: day.date });
              }} />
          </div>
        </Section>
        <Section title="À valider aujourd’hui">
          <div className="panel divide-y divide-line/60 px-4 py-1">
            {day.muscu.map((m) => (
              <CheckRow key={m.id} checked={!!state.workouts[m.id]?.done} onChange={() => go('musculation', { session: m.id })} sub={`${fmtTime(m.start)} · ouvre la séance pour valider les séries`}>Musculation {m.type}{m.kind === 'bonus' ? ' (bonus)' : ''}</CheckRow>
            ))}
            {jjbActive.map((j) => (
              <CheckRow key={j.key} checked={j.done} onChange={(v) => update(patchJjb(j.key, { done: v }))} sub={`${fmtTime(j.effStart)} – ${fmtTime(j.effEnd)}`}>Entraînement de JJB</CheckRow>
            ))}
            {generic.map((t) => (
              <CheckRow key={t.key} checked={!!tasks[t.key]} onChange={() => update(toggleTask(day.date, t.key))}>{t.label}</CheckRow>
            ))}
          </div>
        </Section>
      </div>
      {edit && <ShiftModal day={day} onClose={() => setEdit(false)} />}
      {meal && <RecipeModal recipeId={day.meals.find((m) => m.key === meal.key)?.recipeId ?? meal.recipeId} date={day.date} slot={meal} onClose={() => setMeal(null)} />}
    </>
  );
}

function MonthView({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { plan, today } = useApp();
  const { y, m } = parts(date);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const gridStart = mondayOf(first);
  const cells = Array.from({ length: 42 }, (_, k) => addDays(gridStart, k)).filter((d, k) => k < 35 || parts(d).m === m);
  return (
    <div className="panel p-3">
      <div className="grid grid-cols-7 gap-1 text-center">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => <div key={wd} className="eyebrow py-1">{JOURS_INIT[wd]}</div>)}
        {cells.map((d) => {
          const day = plan.byDate[d];
          const inMonth = parts(d).m === m;
          if (!day) return <div key={d} className="flex aspect-square items-center justify-center rounded-lg text-sm text-faint/50">{inMonth ? parts(d).d : ''}</div>;
          const u = SHIFT_UI[day.shift];
          return (
            <button key={d} onClick={() => onPick(d)} aria-label={`${fmtDate(d)} : ${u.label}`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border ${d === today ? 'border-accent' : d === date ? 'border-fg' : 'border-transparent'} ${u.bg} ${inMonth ? '' : 'opacity-35'}`}>
              <span className="num text-base sm:text-lg">{parts(d).d}</span>
              <span className={`text-[10px] font-bold leading-none ${u.text}`}>{day.shift === 'R' ? 'R' : day.shift}</span>
              <span className="flex h-1.5 gap-0.5">
                {day.muscu.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                {day.jjb.some((j) => j.active) && <span className="h-1.5 w-1.5 rounded-full bg-fg" />}
                {day.conflicts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warn" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted">
        {(['M', 'A', 'N', 'R'] as Shift[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${SHIFT_UI[s].solid}`} />{SHIFT_UI[s].label}</span>)}
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Musculation</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fg" />JJB</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warn" />Conflit</span>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { plan, ref, selDate, setSelDate } = useApp();
  const [view, setView] = useState<View>('jour');
  const date = plan.byDate[selDate] ? selDate : ref;
  const day = plan.byDate[date];
  const clamp = (d: string) => (d < plan.start ? plan.start : d > plan.end ? plan.end : d);
  const step = (dir: 1 | -1) => {
    if (view === 'mois') {
      const { y, m } = parts(date);
      const t = new Date(Date.UTC(y, m - 1 + dir, 1)).toISOString().slice(0, 10);
      setSelDate(clamp(t));
    } else setSelDate(clamp(addDays(date, dir * (view === 'jour' ? 1 : view === 'semaine' ? 7 : 10))));
  };
  const pick = (d: string) => { setSelDate(d); setView('jour'); window.scrollTo(0, 0); };
  const w0 = mondayOf(date);
  const week = Array.from({ length: 7 }, (_, k) => plan.byDate[addDays(w0, k)]).filter(Boolean);
  const c0 = addDays(date, -(day.cyclePos - 1));
  const cycle = Array.from({ length: 10 }, (_, k) => plan.byDate[addDays(c0, k)]).filter(Boolean);
  const title = view === 'jour' ? cap(fmtDate(date, 'medium'))
    : view === 'semaine' ? `Semaine du ${fmtDate(w0, 'medium').replace(/^\S+ /, '')}`
    : view === 'mois' ? `${cap(MOIS[parts(date).m - 1])} ${parts(date).y}`
    : `Cycle du ${fmtDate(c0, 'medium').replace(/^\S+ /, '')}`;

  return (
    <>
      <PageHead title="Calendrier" sub="Du 11 novembre 2026 au 30 juin 2027" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Vue du calendrier" value={view} onChange={setView} options={[{ value: 'jour', label: 'Jour' }, { value: 'semaine', label: 'Semaine' }, { value: 'mois', label: 'Mois' }, { value: 'cycle', label: 'Cycle 10 j' }]} />
        <button className="btn btn-ghost btn-sm" onClick={() => { setSelDate(ref); }}>Aujourd’hui</button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => step(-1)} aria-label="Précédent" disabled={date <= plan.start && view !== 'mois'}><ChevronLeft size={18} /></button>
        <div className="display text-xl">{title}</div>
        <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => step(1)} aria-label="Suivant" disabled={date >= plan.end && view !== 'mois'}><ChevronRight size={18} /></button>
      </div>

      {view === 'jour' && <DayView key={date} day={day} />}
      {view === 'semaine' && <div className="flex flex-col gap-2">{week.map((d) => <DayRow key={d.date} d={d} onPick={pick} />)}</div>}
      {view === 'mois' && <MonthView date={date} onPick={pick} />}
      {view === 'cycle' && (
        <div className="flex flex-col gap-4">
          <CycleStrip day={day} onPick={setSelDate} selected={date} />
          <div className="flex flex-col gap-2">{cycle.map((d) => <DayRow key={d.date} d={d} onPick={pick} />)}</div>
        </div>
      )}
    </>
  );
}

