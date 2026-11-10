import { useMemo } from 'react';
import { ArrowRight, BedDouble, Briefcase, Dumbbell, Play, Swords, TriangleAlert, Utensils } from 'lucide-react';
import { useApp } from '../store';
import { nextEvents, SHIFT_NAME, shiftHours, type NextThing } from '../lib/engine';
import { addDays, cap, diffDays, fmtDate, fmtDur, fmtTime, mondayOf } from '../lib/dates';
import { recoveryFor, sleepHours } from '../lib/recovery';
import { PROGRAMS } from '../data/programs';
import { Flag, Section, SHIFT_UI } from '../components/ui';
import { Charts } from '../components/Charts';
import type { DayPlan } from '../lib/types';

export function whenLabel(x: NextThing, today: string, nowMin: number, started: boolean): string {
  const dd = diffDays(x.date, today);
  const diff = dd * 1440 + x.t - nowMin;
  if (!started || dd > 1 || diff > 1440) return `${cap(fmtDate(x.date, 'medium'))} à ${fmtTime(x.t)}`;
  if (dd === 1 && diff > 480) return `Demain à ${fmtTime(x.t)}`;
  if (diff < 60) return `Dans ${Math.max(1, diff)} min`;
  return `Dans ${fmtDur(diff)}`;
}

export function RecoveryRing({ score, size = 76 }: { score: number | null; size?: number }) {
  const r = 32, c = 2 * Math.PI * r;
  const tone = score === null ? 'rgb(var(--faint))' : score >= 72 ? 'rgb(var(--ok))' : score >= 52 ? 'rgb(var(--warn))' : 'rgb(var(--accent))';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} role="img" aria-label={score === null ? 'Récupération non renseignée' : `Récupération ${score} sur 100`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(var(--raised))" strokeWidth="8" />
      {score !== null && <circle cx="40" cy="40" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 40 40)" />}
      <text x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="700" fill="rgb(var(--fg))" fontFamily="'Barlow Condensed', sans-serif">{score ?? '–'}</text>
    </svg>
  );
}

export function CycleStrip({ day, onPick, selected }: { day: DayPlan; onPick: (d: string) => void; selected?: string }) {
  const { plan, today } = useApp();
  const start = addDays(day.date, -(day.cyclePos - 1));
  const cells = Array.from({ length: 10 }, (_, k) => plan.byDate[addDays(start, k)]).filter(Boolean);
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
      {cells.map((d) => {
        const u = SHIFT_UI[d.shift];
        const isToday = d.date === today;
        const sel = d.date === selected;
        return (
          <button key={d.date} onClick={() => onPick(d.date)} aria-label={`${fmtDate(d.date)} : ${u.label}`}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${sel ? 'border-fg bg-raised' : isToday ? 'border-accent bg-accent/10' : 'border-line/70 bg-surface hover:border-faint'}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{fmtDate(d.date, 'weekday').slice(0, 3)}</span>
            <span className="num text-xl">{Number(d.date.slice(8))}</span>
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${u.bg} ${u.text}`}>{u.label === 'Après-midi' ? 'Aprèm' : u.label}</span>
            <span className="flex h-2 items-center gap-1">
              {d.muscu.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" title="Musculation" />}
              {d.jjb.some((j) => j.active) && <span className="h-1.5 w-1.5 rounded-full bg-fg" title="JJB" />}
              {d.conflicts.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warn" title="Conflit" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function NextTile({ icon: Icon, label, title, when, sub, onClick }: { icon: typeof Briefcase; label: string; title: string; when: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="panel flex min-w-0 flex-col gap-2 p-3.5 text-left transition-colors hover:border-faint">
      <span className="flex items-center gap-2 text-muted"><Icon size={16} /><span className="eyebrow">{label}</span></span>
      <span className="display text-[22px] leading-tight">{title}</span>
      <span className="text-sm font-semibold text-accent">{when}</span>
      {sub && <span className="line-clamp-2 text-sm text-muted">{sub}</span>}
    </button>
  );
}

function Bar({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm"><span>{label}</span><span className="tabular font-semibold">{text}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function Home() {
  const { state, plan, today, ref, refDay: day, nowMin, started, go } = useApp();
  const next = useMemo(() => nextEvents(plan, today, nowMin), [plan, today, nowMin]);
  const rec = useMemo(() => recoveryFor(ref, state, plan), [ref, state.sleepLogs, plan]);
  const u = SHIFT_UI[day.shift];

  const win = Math.floor(day.idx / 10);
  const cycleMains = plan.sessions.filter((s) => s.window === win && s.kind === 'main');
  const cycleDone = cycleMains.filter((s) => state.workouts[s.id]?.done).length;
  const w0 = mondayOf(ref);
  let jjbPlanned = 0, jjbDone = 0;
  const sleeps: number[] = [];
  for (let k = 0; k < 7; k++) {
    const d = plan.byDate[addDays(w0, k)];
    if (d) { jjbPlanned += d.jjb.filter((j) => j.active).length; jjbDone += d.jjb.filter((j) => j.done).length; }
    const h = sleepHours(state.sleepLogs[addDays(ref, -k)]);
    if (h !== null) sleeps.push(h);
  }
  const sleepAvg = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
  const jjbToday = day.jjb.filter((j) => j.decision !== 'cancelled');
  const daysTo = diffDays(plan.start, today);

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="eyebrow">{started ? "Aujourd'hui" : `Début du programme dans ${daysTo} jour${daysTo > 1 ? 's' : ''}`}</div>
        <h1 className="display text-[34px] italic sm:text-[44px]">{cap(fmtDate(ref, 'long')).replace(/ \d{4}$/, '')}</h1>
        {!started && <p className="max-w-xl text-muted">Voici ta première journée. Tout le calendrier jusqu’au 30 juin 2027 est déjà généré : tu peux le parcourir et préparer tes courses.</p>}
      </div>

      <button onClick={() => go('calendrier', { date: ref })} className={`panel flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4 text-left ring-1 ${u.ring}`}>
        <div className="min-w-0">
          <div className="eyebrow">Poste du jour · jour {day.cyclePos} du cycle</div>
          <div className={`display mt-1 text-4xl italic ${u.text}`}>{SHIFT_NAME[day.shift]}</div>
          <div className="tabular mt-1 text-muted">{shiftHours(day.shift, state.settings)}</div>
        </div>
        <div className="flex gap-6">
          <div><div className="eyebrow">Réveil</div><div className="num mt-1 text-2xl">{fmtTime(day.wake)}</div></div>
          <div><div className="eyebrow">{day.bed !== null ? 'Coucher' : 'Sommeil'}</div><div className="num mt-1 text-2xl">{day.bed !== null ? fmtTime(day.bed) : 'après le poste'}</div></div>
        </div>
        {day.conflicts.length > 0 && (
          <div className="flex w-full items-start gap-2 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn"><TriangleAlert size={16} className="mt-0.5 shrink-0" /><span>{day.conflicts.length} conflit{day.conflicts.length > 1 ? 's' : ''} à arbitrer : {day.conflicts[0]}</span></div>
        )}
      </button>

      <Section title="À venir">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {next.work && <NextTile icon={Briefcase} label="Prochain poste" title={next.work.title.replace('Poste ', '')} when={whenLabel(next.work, today, nowMin, started)} sub={next.work.sub} onClick={() => go('calendrier', { date: next.work!.date })} />}
          {next.training && <NextTile icon={next.training.kind === 'jjb' ? Swords : Dumbbell} label="Prochain entraînement" title={next.training.title} when={whenLabel(next.training, today, nowMin, started)} sub={next.training.end ? `${fmtTime(next.training.t)} – ${fmtTime(next.training.end)}` : undefined} onClick={() => (next.training!.kind === 'jjb' ? go('jjb') : go('musculation', { session: next.training!.ref }))} />}
          {next.meal && <NextTile icon={Utensils} label="Prochain repas" title={next.meal.title} when={whenLabel(next.meal, today, nowMin, started)} sub={next.meal.sub} onClick={() => go('nutrition', { date: next.meal!.date })} />}
          {next.sleep && <NextTile icon={BedDouble} label="Prochain sommeil" title={`${next.sleep.kind === 'bed' ? 'Coucher' : 'Sommeil'} ${fmtTime(next.sleep.t)}`} when={whenLabel(next.sleep, today, nowMin, started)} sub={next.sleep.sub} onClick={() => go('sommeil')} />}
        </div>
      </Section>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-6">
        <Section title="Séance du jour">
          <div className="panel flex flex-col divide-y divide-line/60">
            {day.muscu.map((m) => {
              const done = state.workouts[m.id]?.done;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="display text-2xl">Musculation {m.type}</span>{m.kind === 'bonus' && <Flag tone="muted">Bonus</Flag>}{m.deload && <Flag tone="muted">Allégée</Flag>}{done && <Flag tone="ok">Faite</Flag>}</div>
                    <div className="text-sm text-muted">{PROGRAMS[m.type].title} · {fmtTime(m.start)} · {m.dur} min</div>
                  </div>
                  <button className={`btn ${done ? 'btn-ghost' : 'btn-primary'} shrink-0`} onClick={() => go('musculation', { session: m.id })}>{done ? 'Revoir' : <><Play size={16} />Démarrer</>}</button>
                </div>
              );
            })}
            {jjbToday.map((j) => (
              <div key={j.key} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="display text-2xl">JJB</span>{j.status === 'conflict' && <Flag tone="bad">Conflit</Flag>}{j.status === 'partial' && <Flag tone="warn">Raccourci</Flag>}{j.done && <Flag tone="ok">Fait</Flag>}</div>
                  <div className="tabular text-sm text-muted">{fmtTime(j.effStart)} – {fmtTime(j.effEnd)}{j.status === 'conflict' ? ` · ${j.reasons[0]}` : ''}</div>
                </div>
                <button className="btn btn-ghost shrink-0" onClick={() => go('jjb')}>Voir</button>
              </div>
            ))}
            {day.muscu.length === 0 && jjbToday.length === 0 && (
              <div className="p-4"><div className="font-semibold">Journée de récupération</div><div className="text-sm text-muted">Aucun entraînement prévu. 10 minutes de mobilité, une bonne hydratation et un coucher à l’heure suffisent.</div></div>
            )}
          </div>
        </Section>

        <Section title="État de récupération">
          <div className="panel flex items-center gap-4 p-4">
            <RecoveryRing score={rec.score} />
            <div className="min-w-0 flex-1">
              <div className="display text-2xl">{rec.level === 'inconnue' ? 'À renseigner' : `Récupération ${rec.level}`}</div>
              <p className="mt-1 text-sm text-muted">{rec.advice}</p>
              <button className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent" onClick={() => go('sommeil')}>{rec.level === 'inconnue' ? 'Renseigner ma nuit' : 'Voir le détail'}<ArrowRight size={15} /></button>
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-6">
        <Section title="Objectifs sportifs">
          <div className="panel flex flex-col gap-4 p-4">
            <p className="text-sm text-muted">{state.settings.profile.goal}</p>
            <Bar label="Musculation ce cycle" value={cycleDone} max={cycleMains.length} text={`${cycleDone} / ${cycleMains.length} séances`} />
            <Bar label="JJB cette semaine" value={jjbDone} max={jjbPlanned} text={`${jjbDone} / ${jjbPlanned} créneaux compatibles`} />
            <Bar label="Sommeil moyen sur 7 jours" value={sleepAvg ?? 0} max={state.settings.sleep.minHours} text={sleepAvg === null ? 'à renseigner' : `${String(Math.round(sleepAvg * 10) / 10).replace('.', ',')} h / ${state.settings.sleep.minHours} h`} />
          </div>
        </Section>
        <Section title={`Mon cycle · ${fmtDate(addDays(ref, -(day.cyclePos - 1)), 'medium')} → ${fmtDate(addDays(ref, 10 - day.cyclePos), 'medium')}`} action={<button className="text-sm font-semibold text-accent" onClick={() => go('calendrier', { date: ref })}>Calendrier</button>}>
          <CycleStrip day={day} onPick={(d) => go('calendrier', { date: d })} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Musculation</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-fg" />JJB</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warn" />Conflit à arbitrer</span>
          </div>
        </Section>
      </div>

      <Section title="Statistiques">
        <Charts />
      </Section>
    </>
  );
}

