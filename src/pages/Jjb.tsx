import { useState } from 'react';
import { Ban, Check, ChevronLeft, ChevronRight, RotateCcw, ShieldAlert } from 'lucide-react';
import { useApp } from '../store';
import { addDays, cap, fmtDate, fmtDur, fmtTime, JOURS, mondayOf } from '../lib/dates';
import { patchJjb } from '../lib/actions';
import { Empty, Flag, Modal, PageHead, Rating, Section, ShiftBadge } from '../components/ui';
import type { DayPlan, JjbPlan } from '../lib/types';

function ValidateModal({ j, date, onClose }: { j: JjbPlan; date: string; onClose: () => void }) {
  const { state, update, toast } = useApp();
  const log = state.jjbStatus[j.key] ?? {};
  const [intensity, setIntensity] = useState<number | undefined>(log.intensity);
  const [note, setNote] = useState(log.note ?? '');
  return (
    <Modal open onClose={onClose} title="Valider l’entraînement"
      footer={<button className="btn btn-primary" onClick={() => { update(patchJjb(j.key, { done: true, intensity, note: note || undefined })); toast('Entraînement de JJB validé'); onClose(); }}>Enregistrer</button>}>
      <div className="flex flex-col gap-4">
        <p className="text-muted">{cap(fmtDate(date, 'medium'))} · {fmtTime(j.effStart)} – {fmtTime(j.effEnd)}</p>
        <Rating label="Intensité de la séance" value={intensity} onChange={setIntensity} low="Technique, léger" high="Sparring très dur" />
        <p className="text-sm text-faint">Deux séances notées 4 ou 5 dans la semaine allègent automatiquement ta prochaine séance de musculation.</p>
        <label htmlFor="jjb-note" className="flex flex-col gap-1"><span className="text-sm font-medium">Notes</span>
          <textarea id="jjb-note" className="field" placeholder="Techniques travaillées, douleurs, sensations…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

function SlotCard({ d, j }: { d: DayPlan; j: JjbPlan }) {
  const { update, state, today, toast } = useApp();
  const [validating, setValidating] = useState(false);
  const log = state.jjbStatus[j.key] ?? {};
  const cancelled = j.decision === 'cancelled';
  const tone = cancelled ? 'border-line/60 opacity-70' : j.status === 'conflict' && !j.active ? 'border-accent/50' : j.status === 'partial' ? 'border-warn/40' : 'border-line/70';
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border bg-surface p-4 ${tone} ${d.date === today ? 'ring-1 ring-accent/50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="eyebrow">{cap(fmtDate(d.date, 'medium'))}</div>
          <div className="num mt-1 text-3xl">{fmtTime(j.effStart)} – {fmtTime(j.effEnd)}</div>
          {(j.effStart !== j.start || j.effEnd !== j.end) && <div className="tabular text-sm text-muted">Créneau complet : {fmtTime(j.start)} – {fmtTime(j.end)}</div>}
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <ShiftBadge shift={d.shift} small />
          {cancelled ? <Flag tone="muted">Annulé par toi</Flag>
            : j.done ? <Flag tone="ok">Fait{log.intensity ? ` · ${log.intensity}/5` : ''}</Flag>
            : j.status === 'conflict' ? <Flag tone="bad">{j.decision === 'forced' ? 'Maintenu malgré le conflit' : 'Conflit'}</Flag>
            : j.status === 'partial' ? <Flag tone="warn">{j.decision === 'forced' ? 'Complet malgré la marge' : 'Raccourci'}</Flag>
            : <Flag tone="ok">Compatible</Flag>}
        </div>
      </div>
      {!cancelled && j.reasons.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {j.reasons.map((r, i) => <li key={i} className={`flex gap-2 ${j.status === 'conflict' ? 'text-accent' : 'text-warn'}`}><ShieldAlert size={15} className="mt-0.5 shrink-0" />{r}</li>)}
        </ul>
      )}
      {!cancelled && j.status !== 'conflict' && j.caution && <p className="text-sm text-muted">{j.caution}</p>}
      {log.note && <p className="text-sm text-muted">« {log.note} »</p>}
      <div className="flex flex-wrap gap-2">
        {cancelled ? (
          <button className="btn btn-ghost btn-sm" onClick={() => update(patchJjb(j.key, { decision: undefined }))}><RotateCcw size={15} />Rétablir le créneau</button>
        ) : (
          <>
            {j.active && <button className={`btn btn-sm ${j.done ? 'btn-ghost' : 'btn-primary'}`} onClick={() => setValidating(true)}><Check size={15} />{j.done ? 'Modifier' : 'Valider'}</button>}
            {j.done && <button className="btn btn-quiet btn-sm" onClick={() => update(patchJjb(j.key, { done: false }))}>Annuler la validation</button>}
            {j.status !== 'ok' && j.decision !== 'forced' && <button className="btn btn-ghost btn-sm" onClick={() => { update(patchJjb(j.key, { decision: 'forced' })); toast('Créneau maintenu en entier. Le conflit reste affiché.', 'warn'); }}>{j.status === 'conflict' ? 'Maintenir quand même' : 'Faire le créneau complet'}</button>}
            {j.decision === 'forced' && <button className="btn btn-ghost btn-sm" onClick={() => update(patchJjb(j.key, { decision: undefined }))}>Revenir à la recommandation</button>}
            {!j.done && <button className="btn btn-quiet btn-sm" onClick={() => { update(patchJjb(j.key, { decision: 'cancelled' })); toast('Créneau annulé. Tu peux le rétablir à tout moment.', 'info'); }}><Ban size={15} />Annuler ce créneau</button>}
          </>
        )}
      </div>
      {validating && <ValidateModal j={j} date={d.date} onClose={() => setValidating(false)} />}
    </div>
  );
}

export default function Jjb() {
  const { plan, state, ref, selDate, setSelDate, go } = useApp();
  const date = plan.byDate[selDate] ? selDate : ref;
  const w0 = mondayOf(date);
  const week = Array.from({ length: 7 }, (_, k) => plan.byDate[addDays(w0, k)]).filter(Boolean);
  const entries = week.flatMap((d) => d.jjb.map((j) => ({ d, j })));
  const all = plan.days.flatMap((d) => d.jjb);
  const count = { ok: all.filter((j) => j.status === 'ok').length, partial: all.filter((j) => j.status === 'partial').length, conflict: all.filter((j) => j.status === 'conflict').length };
  const done = all.filter((j) => j.done);
  const hours = done.reduce((n, j) => n + (j.effEnd - j.effStart), 0);
  const clamp = (d: string) => (d < plan.start ? plan.start : d > plan.end ? plan.end : d);

  return (
    <>
      <PageHead title="JJB" sub="Chaque créneau est vérifié contre ton poste, tes trajets et ton sommeil. Rien n’est supprimé sans ton accord." />
      <div className="panel grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-4">
        <div><div className="eyebrow">Validés</div><div className="num mt-1 text-3xl">{done.length}</div><div className="text-sm text-muted">{fmtDur(hours)} de tapis</div></div>
        <div><div className="eyebrow">Compatibles</div><div className="num mt-1 text-3xl text-ok">{count.ok}</div><div className="text-sm text-muted">sur tout le programme</div></div>
        <div><div className="eyebrow">Raccourcis</div><div className="num mt-1 text-3xl text-warn">{count.partial}</div><div className="text-sm text-muted">créneau partiel possible</div></div>
        <div><div className="eyebrow">En conflit</div><div className="num mt-1 text-3xl text-accent">{count.conflict}</div><div className="text-sm text-muted">travail ou sommeil</div></div>
      </div>

      <Section title="Créneaux de la semaine">
        <div className="flex items-center justify-between gap-2">
          <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, -7)))} aria-label="Semaine précédente" disabled={w0 <= plan.start}><ChevronLeft size={18} /></button>
          <div className="display text-xl">Semaine du {fmtDate(w0, 'medium').replace(/^\S+ /, '')}</div>
          <button className="btn btn-ghost btn-sm w-11 px-0" onClick={() => setSelDate(clamp(addDays(date, 7)))} aria-label="Semaine suivante" disabled={addDays(w0, 7) > plan.end}><ChevronRight size={18} /></button>
        </div>
        {entries.length === 0 && <Empty title="Aucun créneau cette semaine" text="Active ou ajoute des créneaux dans Paramètres." />}
        <div className="grid gap-3 md:grid-cols-2">{entries.map(({ d, j }) => <SlotCard key={j.key} d={d} j={j} />)}</div>
      </Section>

      <Section title="Mes créneaux hebdomadaires" action={<button className="text-sm font-semibold text-accent" onClick={() => go('parametres')}>Modifier</button>}>
        <div className="panel divide-y divide-line/60">
          {state.settings.jjbSlots.filter((s) => s.enabled).sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7)).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3"><span className="font-semibold">{cap(JOURS[s.weekday])}</span><span className="tabular text-muted">{fmtTime(s.start)} – {fmtTime(s.end)} · {fmtDur(s.end - s.start)}</span></div>
          ))}
        </div>
        <p className="text-sm text-muted">Règles appliquées : jamais pendant le travail ; {fmtDur(state.settings.travel.beforeWork)} de marge avant une prise de poste, {fmtDur(state.settings.travel.afterWork)} après une fin de poste ; jamais pendant le sommeil qui suit une nuit de travail.</p>
      </Section>
    </>
  );
}
