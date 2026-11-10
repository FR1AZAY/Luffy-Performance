import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useApp } from '../store';
import { addDays, cap, fmtDate, mondayOf } from '../lib/dates';
import { liftSeries, weekReview } from '../lib/stats';
import { Empty, PageHead, Section } from '../components/ui';
import { Charts } from '../components/Charts';

const EXOS = [{ id: 'bench', label: 'Développé couché', needsW: true }, { id: 'tractions', label: 'Tractions', needsW: false }, { id: 'dips', label: 'Dips', needsW: false }];
const n1 = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export default function Progress() {
  const { state, update, plan, ref, toast, go } = useApp();
  const [weekStart, setWeekStart] = useState(() => mondayOf(ref));
  const [ex, setEx] = useState('bench');
  const [w, setW] = useState('');
  const [r, setR] = useState('');
  const [date, setDate] = useState(ref);
  const review = useMemo(() => weekReview(state, plan, weekStart), [state, plan, weekStart]);
  const records = useMemo(() => ({
    bench: liftSeries(state, ['bench'], 'weight'),
    pulls: liftSeries(state, ['tractions', 'tractionsSup'], 'reps'),
    dips: liftSeries(state, ['dips'], 'reps'),
  }), [state.workouts, state.perfLogs]);
  const best = (a: { v: number }[]) => (a.length ? Math.max(...a.map((x) => x.v)) : null);
  const cur = EXOS.find((e) => e.id === ex)!;
  const jjbLogs = Object.entries(state.jjbStatus).filter(([, l]) => l.done).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6);
  const sessions = Object.entries(state.workouts).filter(([, x]) => x.done).sort((a, b) => (a[1].date < b[1].date ? 1 : -1)).slice(0, 6);

  const add = () => {
    const reps = parseInt(r, 10);
    const weight = parseFloat(w.replace(',', '.'));
    if (!Number.isFinite(reps) || reps <= 0) { toast('Indique un nombre de répétitions.', 'warn'); return; }
    if (cur.needsW && !Number.isFinite(weight)) { toast('Indique la charge en kg.', 'warn'); return; }
    update((s) => ({ ...s, perfLogs: [...s.perfLogs, { id: Date.now().toString(36), date, ex, w: Number.isFinite(weight) ? weight : null, r: reps }] }));
    setW(''); setR('');
    toast('Performance enregistrée');
  };

  return (
    <>
      <PageHead title="Progression" sub="Charges, répétitions, régularité. Aucun score d’apparence : seule la performance compte." />

      <div className="panel grid grid-cols-3 gap-4 p-4">
        <div className="min-w-0"><div className="eyebrow">Développé couché</div><div className="num mt-1 text-3xl">{best(records.bench) !== null ? `${n1(best(records.bench)!)} kg` : '–'}</div><div className="text-sm text-muted">meilleure charge</div></div>
        <div className="min-w-0"><div className="eyebrow">Tractions</div><div className="num mt-1 text-3xl">{best(records.pulls) ?? '–'}</div><div className="text-sm text-muted">meilleure série</div></div>
        <div className="min-w-0"><div className="eyebrow">Dips</div><div className="num mt-1 text-3xl">{best(records.dips) ?? '–'}</div><div className="text-sm text-muted">meilleure série</div></div>
      </div>

      <Section title="Courbes"><Charts /></Section>

      <Section title="Bilan de la semaine">
        <div className="panel flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Semaine précédente" disabled={addDays(weekStart, 6) <= plan.start}><ChevronLeft size={18} /></button>
            <div className="display text-xl">Du {fmtDate(review.from, 'medium').replace(/^\S+ /, '')} au {fmtDate(review.to, 'medium').replace(/^\S+ /, '')}</div>
            <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Semaine suivante" disabled={addDays(weekStart, 7) > plan.end}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <div><div className="eyebrow">Musculation</div><div className="num mt-1 text-3xl">{review.muscuDone}<span className="text-xl text-muted"> / {review.muscuPlanned}</span></div></div>
            <div><div className="eyebrow">JJB</div><div className="num mt-1 text-3xl">{review.jjbDone}<span className="text-xl text-muted"> / {review.jjbPlanned}</span></div></div>
            <div><div className="eyebrow">Sommeil moyen</div><div className="num mt-1 text-3xl">{review.sleepAvg !== null ? `${n1(review.sleepAvg)} h` : '–'}</div></div>
            <div><div className="eyebrow">Repas validés</div><div className="num mt-1 text-3xl">{review.mealsPct !== null ? `${review.mealsPct} %` : '–'}</div></div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-raised p-3">
            <div className="eyebrow">Pour la semaine suivante</div>
            {review.advice.map((a, i) => <p key={i} className="text-sm">{a}</p>)}
          </div>
        </div>
      </Section>

      <Section title="Enregistrer une performance">
        <div className="panel flex flex-col gap-3 p-4">
          <p className="text-sm text-muted">Pour un test hors séance. Les séries validées pendant tes séances sont déjà comptées.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label htmlFor="perf-ex" className="col-span-2 flex flex-col gap-1 sm:col-span-1"><span className="text-sm text-muted">Exercice</span>
              <select id="perf-ex" className="field" value={ex} onChange={(e) => setEx(e.target.value)}>{EXOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select>
            </label>
            <label htmlFor="perf-w" className="flex flex-col gap-1"><span className="text-sm text-muted">{cur.needsW ? 'Charge (kg)' : 'Lest (kg, facultatif)'}</span>
              <input id="perf-w" className="field" type="number" inputMode="decimal" step="0.5" min="0" value={w} onChange={(e) => setW(e.target.value)} />
            </label>
            <label htmlFor="perf-r" className="flex flex-col gap-1"><span className="text-sm text-muted">Répétitions</span>
              <input id="perf-r" className="field" type="number" inputMode="numeric" min="1" value={r} onChange={(e) => setR(e.target.value)} />
            </label>
            <label htmlFor="perf-d" className="col-span-2 flex flex-col gap-1 sm:col-span-1"><span className="text-sm text-muted">Date</span>
              <input id="perf-d" className="field" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
          </div>
          <button className="btn btn-primary self-start" onClick={add}>Enregistrer</button>
          {state.perfLogs.length > 0 && (
            <ul className="divide-y divide-line/60 rounded-xl border border-line/70">
              {[...state.perfLogs].reverse().slice(0, 8).map((p) => (
                <li key={p.id} className="tabular flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span>{fmtDate(p.date, 'short')} · {EXOS.find((e) => e.id === p.ex)?.label} : {p.w ? `${n1(p.w)} kg × ` : ''}{p.r}</span>
                  <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" aria-label="Supprimer cette performance" onClick={() => update((s) => ({ ...s, perfLogs: s.perfLogs.filter((x) => x.id !== p.id) }))}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <div className="grid gap-7 lg:grid-cols-2 lg:gap-6">
        <Section title="Dernières séances de musculation" action={<button className="text-sm font-semibold text-accent" onClick={() => go('musculation')}>Tout voir</button>}>
          {sessions.length === 0 ? <Empty title="Rien pour l’instant" text="Sensations et fatigue de chaque séance terminée seront listées ici." /> : (
            <div className="panel divide-y divide-line/60">
              {sessions.map(([id, x]) => (
                <div key={id} className="px-4 py-3"><div className="font-semibold">Séance {x.type} · {cap(fmtDate(x.date, 'medium'))}</div><div className="text-sm text-muted">{x.feeling ? `Sensations ${x.feeling}/5` : 'Sensations non notées'}{x.fatigue ? ` · fatigue ${x.fatigue}/5` : ''}{x.note ? ` · ${x.note}` : ''}</div></div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Journal de JJB" action={<button className="text-sm font-semibold text-accent" onClick={() => go('jjb')}>Tout voir</button>}>
          {jjbLogs.length === 0 ? <Empty title="Rien pour l’instant" text="Valide tes entraînements de JJB avec leur intensité pour suivre ta charge." /> : (
            <div className="panel divide-y divide-line/60">
              {jjbLogs.map(([key, l]) => (
                <div key={key} className="px-4 py-3"><div className="font-semibold">{cap(fmtDate(key.split('|')[0], 'medium'))}</div><div className="text-sm text-muted">{l.intensity ? `Intensité ${l.intensity}/5` : 'Intensité non notée'}{l.note ? ` · ${l.note}` : ''}</div></div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}
