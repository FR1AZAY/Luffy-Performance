import { useMemo } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useApp } from '../store';
import { addDays, cap, fmtDate, fmtDur, fmtTime, minToHHMM } from '../lib/dates';
import { recoveryFor, sleepHours } from '../lib/recovery';
import { suggestReschedule } from '../lib/engine';
import { moveSession } from '../lib/actions';
import { Flag, PageHead, Rating, Section, ShiftBadge } from '../components/ui';
import { RecoveryRing } from './Home';
import type { SleepLog } from '../lib/types';

const h1 = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export default function Sleep() {
  const { state, update, plan, ref, today, selDate, setSelDate, go, toast } = useApp();
  const date = plan.byDate[selDate] ? selDate : ref;
  const day = plan.byDate[date];
  const prev = plan.days[day.idx - 1];
  const log: SleepLog = state.sleepLogs[date] ?? {};
  const set = (patch: Partial<SleepLog>) => update((s) => ({ ...s, sleepLogs: { ...s.sleepLogs, [date]: { ...(s.sleepLogs[date] ?? {}), ...patch } } }));
  const rec = useMemo(() => recoveryFor(date, state, plan), [date, state.sleepLogs, plan]);
  const slept = sleepHours(log);
  const planned = day.plannedSleepMin / 60;
  const clamp = (d: string) => (d < plan.start ? plan.start : d > plan.end ? plan.end : d);
  const plannedBed = day.mainSleep ? day.mainSleep.start : prev?.bed ?? state.settings.sleep.bedBeforeM;
  const upcoming = [day, plan.days[day.idx + 1]].filter(Boolean).flatMap((d) => d.muscu).filter((m) => !state.workouts[m.id]?.done);
  const week = Array.from({ length: 7 }, (_, k) => plan.byDate[addDays(date, -k)]).filter(Boolean);
  const S = state.settings.sleep;

  return (
    <>
      <PageHead title="Sommeil" sub={`Objectif : ${S.minHours} à 10 heures par période de 24 heures, siestes comprises.`} />

      <div className="flex items-center justify-between gap-2">
        <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, -1)))} aria-label="Jour précédent" disabled={date <= plan.start}><ChevronLeft size={18} /></button>
        <button className="flex min-w-0 flex-col items-center" onClick={() => setSelDate(ref)}>
          <span className="display text-xl">{cap(fmtDate(date, 'medium'))}</span>
          <span className="mt-1 flex items-center gap-2"><ShiftBadge shift={day.shift} small />{date === today && <Flag tone="accent">Aujourd’hui</Flag>}</span>
        </button>
        <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, 1)))} aria-label="Jour suivant" disabled={date >= plan.end}><ChevronRight size={18} /></button>
      </div>

      <Section title="Prévu pour ce jour">
        <div className="panel grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-4">
          <div><div className="eyebrow">{day.mainSleep ? 'Endormissement' : 'Coucher la veille'}</div><div className="num mt-1 text-3xl">{fmtTime(plannedBed)}</div></div>
          <div><div className="eyebrow">Réveil</div><div className="num mt-1 text-3xl">{fmtTime(day.wake)}</div></div>
          <div><div className="eyebrow">Sommeil prévu</div><div className="num mt-1 text-3xl">{fmtDur(day.plannedSleepMin)}</div></div>
          <div><div className="eyebrow">Coucher ce soir</div><div className="num mt-1 text-3xl">{day.bed !== null ? fmtTime(day.bed) : '–'}</div>{day.bed === null && <div className="text-xs text-muted">nuit de travail</div>}</div>
          {day.nap && <p className="col-span-full text-sm text-muted">{day.nap.label} conseillée à {fmtTime(day.nap.start)} ({fmtDur(day.nap.dur)}), comprise dans le total.</p>}
          {day.sleepNote && <p className="col-span-full text-sm text-muted">{day.sleepNote}</p>}
        </div>
      </Section>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-6">
        <Section title="Ce que j’ai réellement dormi">
          <div className="panel flex flex-col gap-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="sleep-bed" className="flex flex-col gap-1"><span className="text-sm text-muted">Endormi à</span>
                <input id="sleep-bed" type="time" className="field" value={log.bed ?? ''} onChange={(e) => set({ bed: e.target.value || undefined })} />
              </label>
              <label htmlFor="sleep-wake" className="flex flex-col gap-1"><span className="text-sm text-muted">Réveillé à</span>
                <input id="sleep-wake" type="time" className="field" value={log.wake ?? ''} onChange={(e) => set({ wake: e.target.value || undefined })} />
              </label>
            </div>
            {!log.bed && !log.wake && <button className="btn btn-ghost btn-sm self-start" onClick={() => set({ bed: minToHHMM(plannedBed), wake: minToHHMM(day.wake) })}>Remplir avec les horaires prévus</button>}
            <div className="flex items-center justify-between gap-3">
              <div><div className="font-medium">Siestes</div><div className="text-sm text-muted">Durée totale dans la journée</div></div>
              <div className="flex items-center gap-1 rounded-xl bg-raised p-1">
                <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" onClick={() => set({ napMin: Math.max(0, (log.napMin ?? 0) - 15) })} disabled={!log.napMin} aria-label="Retirer 15 minutes de sieste"><Minus size={16} /></button>
                <span className="num w-16 text-center text-lg">{log.napMin ? fmtDur(log.napMin) : 'Aucune'}</span>
                <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" onClick={() => set({ napMin: Math.min(240, (log.napMin ?? 0) + 15) })} aria-label="Ajouter 15 minutes de sieste"><Plus size={16} /></button>
              </div>
            </div>
            <Rating label="Qualité du sommeil" value={log.quality} onChange={(v) => set({ quality: v })} low="Très agité" high="Profond" />
            <Rating label="Fatigue ressentie" value={log.fatigue} onChange={(v) => set({ fatigue: v })} low="En pleine forme" high="Épuisé" />
          </div>
        </Section>

        <Section title="Recommandation de récupération">
          <div className="panel flex flex-col gap-4 p-4">
            <div className="flex items-center gap-4">
              <RecoveryRing score={rec.score} size={88} />
              <div className="min-w-0">
                <div className="display text-2xl">{rec.level === 'inconnue' ? 'À renseigner' : `Récupération ${rec.level}`}</div>
                <div className="tabular mt-1 text-sm text-muted">{slept !== null ? `${h1(slept)} h dormies` : 'Nuit non renseignée'} · {h1(planned)} h prévues</div>
              </div>
            </div>
            <p>{rec.advice}</p>
            {slept !== null && slept < planned - 1 && <p className="text-sm text-warn">Il te manque environ {h1(planned - slept)} h : une sieste de 20 à 30 minutes avant 16h aide sans gêner la nuit suivante.</p>}
            {rec.level === 'insuffisante' && upcoming.map((m) => {
              const to = suggestReschedule(plan, m, addDays(m.date, 1));
              const light = state.muscuMode[m.id] === 'light';
              return (
                <div key={m.id} className="flex flex-col gap-2 rounded-xl bg-raised p-3">
                  <div className="text-sm"><span className="font-semibold">Musculation {m.type} du {fmtDate(m.date, 'medium')}</span> : mieux vaut l’alléger ou la décaler.</div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-ghost btn-sm" disabled={light} onClick={() => { update((s) => ({ ...s, muscuMode: { ...s.muscuMode, [m.id]: 'light' } })); toast('Séance passée en version allégée'); }}>{light ? 'Déjà allégée' : 'Alléger la séance'}</button>
                    {to && <button className="btn btn-ghost btn-sm" onClick={() => { update(moveSession(m.id, to)); toast(`Séance déplacée au ${fmtDate(to, 'medium')}`); }}><CalendarClock size={15} />Déplacer au {fmtDate(to, 'medium')}</button>}
                    <button className="btn btn-quiet btn-sm" onClick={() => go('musculation', { session: m.id })}>Voir la séance</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <Section title="7 derniers jours">
        <div className="panel overflow-x-auto">
          <table className="tabular w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-muted"><th className="px-4 py-2.5 font-medium">Jour</th><th className="px-2 py-2.5 font-medium">Prévu</th><th className="px-2 py-2.5 font-medium">Dormi</th><th className="px-2 py-2.5 font-medium">Qualité</th><th className="px-4 py-2.5 font-medium">Fatigue</th></tr></thead>
            <tbody>
              {week.map((d) => {
                const l = state.sleepLogs[d.date];
                const h = sleepHours(l);
                return (
                  <tr key={d.date} className="border-t border-line/60">
                    <td className="px-4 py-2.5"><button className="font-semibold hover:text-accent" onClick={() => setSelDate(d.date)}>{cap(fmtDate(d.date, 'medium'))}</button></td>
                    <td className="px-2 py-2.5 text-muted">{h1(d.plannedSleepMin / 60)} h</td>
                    <td className={`px-2 py-2.5 font-semibold ${h === null ? 'text-faint' : h >= d.plannedSleepMin / 60 - 0.5 ? 'text-ok' : h >= 6 ? 'text-warn' : 'text-accent'}`}>{h === null ? '–' : `${h1(h)} h`}</td>
                    <td className="px-2 py-2.5">{l?.quality ? `${l.quality}/5` : '–'}</td>
                    <td className="px-4 py-2.5">{l?.fatigue ? `${l.fatigue}/5` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Mon rythme par poste" action={<button className="text-sm font-semibold text-accent" onClick={() => go('parametres')}>Modifier</button>}>
        <div className="panel divide-y divide-line/60">
          {[
            ['M', `Coucher ${fmtTime(S.bedBeforeM)}, réveil ${fmtTime(S.wakeM)}, courte sieste après le poste`],
            ['A', `Coucher ${fmtTime(S.bedA)}, réveil ${fmtTime(S.wakeDefault)}`],
            ['N', `Sommeil principal après le travail, ${fmtTime(S.nightSleepStart)} – ${fmtTime(S.nightSleepEnd)} ; sieste avant la première nuit`],
            ['R', `Coucher ${fmtTime(S.bedR)}, réveil ${fmtTime(S.wakeDefault)} ; lever à ${fmtTime(S.postNightWake)} après la dernière nuit`],
          ].map(([s, t]) => (
            <div key={s} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"><span className="w-28 shrink-0"><ShiftBadge shift={s as any} small /></span><span className="text-sm text-muted">{t}</span></div>
          ))}
        </div>
      </Section>
    </>
  );
}
