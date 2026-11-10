import { useRef, useState } from 'react';
import { Cloud, CloudOff, Copy, Download, HardDrive, Plus, Trash2, Upload } from 'lucide-react';
import { useApp } from '../store';
import { CYCLE, SHIFT_NAME } from '../lib/engine';
import { addDays, cap, fmtDate, JOURS } from '../lib/dates';
import { exportJSON, importJSON } from '../lib/storage';
import { defaultState } from '../lib/defaults';
import { copyText, inViewer, saveFile } from '../lib/platform';
import { buildIcs } from '../lib/ics';
import { NumField, PageHead, Section, TimeField, Toggle } from '../components/ui';
import type { Settings as S, Shift } from '../lib/types';

export default function SettingsPage() {
  const { state, update, replace, plan, ref, today, toast, sync, savedLocally } = useApp();
  const st = state.settings;
  const set = (patch: Partial<S>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const setProfile = (patch: Partial<S['profile']>) => set({ profile: { ...st.profile, ...patch } });
  const setSleep = (patch: Partial<S['sleep']>) => set({ sleep: { ...st.sleep, ...patch } });
  const setRem = (patch: Partial<S['reminders']>) => set({ reminders: { ...st.reminders, ...patch } });
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [ics, setIcs] = useState({ work: true, jjb: true, muscu: true, sleep: false, meals: false });
  const file = useRef<HTMLInputElement>(null);
  const viewer = inViewer();

  const setShift = (k: 'M' | 'A' | 'N', i: 0 | 1, v: number) => {
    const cur: [number, number] = [...st.shiftTimes[k]] as [number, number];
    cur[i] = v;
    if (i === 1 && k === 'N' && v < cur[0]) cur[1] = v + 1440;
    if (k === 'N' && cur[1] <= cur[0]) cur[1] = (cur[1] % 1440) + 1440;
    set({ shiftTimes: { ...st.shiftTimes, [k]: cur } });
  };
  const setSlot = (id: string, patch: Partial<S['jjbSlots'][number]>) => set({ jjbSlots: st.jjbSlots.map((x) => (x.id === id ? { ...x, ...patch } : x)) });

  const doImport = (text: string) => {
    try {
      replace(importJSON(text));
      setPaste(''); setShowPaste(false);
      toast('Données importées');
    } catch (e: any) {
      toast(e?.message ?? 'Import impossible.', 'warn');
    }
  };
  const doExport = async () => {
    try {
      const r = await saveFile(`luffy-performance-${today}.json`, exportJSON(state));
      if (r === 'saved') toast('Sauvegarde exportée');
    } catch (e: any) { toast(e?.message ?? 'Export impossible.', 'warn'); }
  };
  const toggleReminders = async (v: boolean) => {
    setRem({ enabled: v });
    if (!v) return;
    let granted = false;
    try {
      if (typeof Notification !== 'undefined') granted = (Notification.permission === 'granted') || (await Notification.requestPermission()) === 'granted';
    } catch { /* non disponible dans ce navigateur */ }
    toast(granted ? 'Rappels activés avec notifications' : 'Rappels activés : ils s’affichent dans l’application quand elle est ouverte', 'info');
  };
  const exceptions = Object.entries(state.shiftOverrides).sort();
  const anchors = state.anchors.filter((a) => !(a.date === st.programStart && a.pos === 0));

  return (
    <>
      <PageHead title="Paramètres" />

      <Section title="Profil sportif">
        <div className="panel grid gap-3 p-4 sm:grid-cols-2">
          <label htmlFor="p-name" className="flex flex-col gap-1"><span className="text-sm text-muted">Prénom ou surnom</span><input id="p-name" className="field" value={st.profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="Facultatif" /></label>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="p-h" label="Taille" suffix="cm" value={st.profile.heightCm} onChange={(v) => setProfile({ heightCm: v })} />
            <NumField id="p-w" label="Poids déclaré" suffix="kg" value={st.profile.weightKg} step={0.5} onChange={(v) => setProfile({ weightKg: v })} />
          </div>
          <label htmlFor="p-sports" className="flex flex-col gap-1"><span className="text-sm text-muted">Sports pratiqués</span><input id="p-sports" className="field" value={st.profile.sports} onChange={(e) => setProfile({ sports: e.target.value })} /></label>
          <label htmlFor="p-level" className="flex flex-col gap-1"><span className="text-sm text-muted">Niveau</span><input id="p-level" className="field" value={st.profile.level} onChange={(e) => setProfile({ level: e.target.value })} /></label>
          <label htmlFor="p-goal" className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm text-muted">Objectif personnel</span><textarea id="p-goal" className="field" value={st.profile.goal} onChange={(e) => setProfile({ goal: e.target.value })} /></label>
          <label htmlFor="p-eq" className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm text-muted">Matériel disponible (un par ligne)</span><textarea id="p-eq" className="field min-h-[132px]" value={st.profile.equipment.join('\n')} onChange={(e) => setProfile({ equipment: e.target.value.split('\n') })} /></label>
          <p className="text-sm text-faint sm:col-span-2">Aucun poids cible ni objectif esthétique : le poids sert seulement de repère personnel.</p>
        </div>
      </Section>

      <Section title="Charges disponibles">
        <div className="panel grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <NumField id="e-bar" label="Barre : charge max" suffix="kg" value={st.equip.barMaxKg} step={2.5} onChange={(v) => set({ equip: { ...st.equip, barMaxKg: v } })} />
          <NumField id="e-bars" label="Barre : palier" suffix="kg" value={st.equip.barStepKg} step={0.5} min={0.5} onChange={(v) => set({ equip: { ...st.equip, barStepKg: v } })} />
          <NumField id="e-db" label="Haltère : charge max" suffix="kg" value={st.equip.dbMaxKg} step={1} onChange={(v) => set({ equip: { ...st.equip, dbMaxKg: v } })} />
          <NumField id="e-dbs" label="Haltère : palier" suffix="kg" value={st.equip.dbStepKg} step={0.5} min={0.5} onChange={(v) => set({ equip: { ...st.equip, dbStepKg: v } })} />
          <p className="col-span-full text-sm text-faint">Les propositions de charge ne dépassent jamais ces limites. Mets les vraies valeurs de ton matériel.</p>
        </div>
      </Section>

      <Section title="Travail en 5x8">
        <div className="panel flex flex-col gap-4 p-4">
          {(['M', 'A', 'N'] as const).map((k) => (
            <div key={k} className="grid grid-cols-[1fr_1fr] items-end gap-3 sm:grid-cols-[140px_1fr_1fr]">
              <div className="col-span-2 font-semibold sm:col-span-1 sm:pb-2.5">{SHIFT_NAME[k]}</div>
              <TimeField id={`sh-${k}-0`} label="Début" value={st.shiftTimes[k][0]} onChange={(v) => setShift(k, 0, v)} />
              <TimeField id={`sh-${k}-1`} label="Fin" value={st.shiftTimes[k][1]} onChange={(v) => setShift(k, 1, v)} />
            </div>
          ))}
          <p className="text-sm text-muted">Cycle : {CYCLE.map((s: Shift) => SHIFT_NAME[s]).join(' · ')}. Le {fmtDate(st.programStart)} est le jour 1.</p>
          {(exceptions.length > 0 || anchors.length > 0) && (
            <div className="flex flex-col gap-2">
              <div className="eyebrow">Modifications du cycle</div>
              <ul className="divide-y divide-line/60 rounded-xl border border-line/70">
                {anchors.map((a) => (
                  <li key={'a' + a.date} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>{cap(fmtDate(a.date, 'medium'))} : cycle recalé sur le jour {a.pos + 1} ({SHIFT_NAME[CYCLE[a.pos]]})</span>
                    <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" aria-label="Supprimer ce recalage" onClick={() => update((s) => { let an = s.anchors.filter((x) => x.date !== a.date); if (!an.length || a.date === st.programStart) an = [{ date: st.programStart, pos: 0 }, ...an]; return { ...s, anchors: an }; })}><Trash2 size={15} /></button>
                  </li>
                ))}
                {exceptions.map(([d, sh]) => (
                  <li key={d} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>{cap(fmtDate(d, 'medium'))} : {SHIFT_NAME[sh]} (exception)</span>
                    <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" aria-label="Supprimer cette exception" onClick={() => update((s) => { const o = { ...s.shiftOverrides }; delete o[d]; return { ...s, shiftOverrides: o }; })}><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-faint">Pour modifier un poste ou recaler le cycle : Calendrier, ouvre le jour, puis « Modifier le poste ».</p>
        </div>
      </Section>

      <Section title="Créneaux de JJB">
        <div className="panel flex flex-col gap-3 p-4">
          {st.jjbSlots.map((x) => (
            <div key={x.id} className={`grid grid-cols-2 items-end gap-3 rounded-xl border border-line/70 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] ${x.enabled ? '' : 'opacity-60'}`}>
              <label htmlFor={`j-d-${x.id}`} className="col-span-2 flex flex-col gap-1 sm:col-span-1"><span className="text-sm text-muted">Jour</span>
                <select id={`j-d-${x.id}`} className="field" value={x.weekday} onChange={(e) => setSlot(x.id, { weekday: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{cap(JOURS[d])}</option>)}</select>
              </label>
              <TimeField id={`j-s-${x.id}`} label="Début" value={x.start} onChange={(v) => setSlot(x.id, { start: v })} />
              <TimeField id={`j-e-${x.id}`} label="Fin" value={x.end} onChange={(v) => setSlot(x.id, { end: Math.max(v, x.start + 30) })} />
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                <button className="btn btn-ghost btn-sm" onClick={() => setSlot(x.id, { enabled: !x.enabled })}>{x.enabled ? 'Désactiver' : 'Activer'}</button>
                <button className="btn btn-quiet h-9 min-h-0 w-9 p-0" aria-label="Supprimer ce créneau" onClick={() => set({ jjbSlots: st.jjbSlots.filter((y) => y.id !== x.id) })}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost self-start" onClick={() => set({ jjbSlots: [...st.jjbSlots, { id: 'c' + Date.now().toString(36), weekday: 3, start: 1080, end: 1170, enabled: true }] })}><Plus size={16} />Ajouter un créneau</button>
          <div className="grid grid-cols-1 gap-3 border-t border-line/60 pt-3 sm:grid-cols-3">
            <NumField id="t-home" label="Retour du JJB à la maison" suffix="min" value={st.travel.jjbHome} step={5} onChange={(v) => set({ travel: { ...st.travel, jjbHome: v } })} />
            <NumField id="t-before" label="Marge avant une prise de poste" suffix="min" value={st.travel.beforeWork} step={5} onChange={(v) => set({ travel: { ...st.travel, beforeWork: v } })} />
            <NumField id="t-after" label="Marge après une fin de poste" suffix="min" value={st.travel.afterWork} step={5} onChange={(v) => set({ travel: { ...st.travel, afterWork: v } })} />
          </div>
        </div>
      </Section>

      <Section title="Sommeil">
        <div className="panel grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          <NumField id="s-min" label="Minimum par 24 h" suffix="heures" value={st.sleep.minHours} step={0.5} min={6} onChange={(v) => setSleep({ minHours: Math.min(10, v) })} />
          <TimeField id="s-wm" label="Réveil, poste du matin" value={st.sleep.wakeM} onChange={(v) => setSleep({ wakeM: v })} />
          <TimeField id="s-bm" label="Coucher avant un matin" value={st.sleep.bedBeforeM} onChange={(v) => setSleep({ bedBeforeM: v })} />
          <TimeField id="s-wd" label="Réveil, après-midi et repos" value={st.sleep.wakeDefault} onChange={(v) => setSleep({ wakeDefault: v })} />
          <TimeField id="s-ba" label="Coucher, poste d’après-midi" value={st.sleep.bedA} onChange={(v) => setSleep({ bedA: v < 720 ? v + 1440 : v })} />
          <TimeField id="s-br" label="Coucher, repos" value={st.sleep.bedR} onChange={(v) => setSleep({ bedR: v < 720 ? v + 1440 : v })} />
          <TimeField id="s-ns" label="Après une nuit : endormissement" value={st.sleep.nightSleepStart} onChange={(v) => setSleep({ nightSleepStart: v })} />
          <TimeField id="s-ne" label="Entre deux nuits : réveil" value={st.sleep.nightSleepEnd} onChange={(v) => setSleep({ nightSleepEnd: v })} />
          <TimeField id="s-pn" label="Après la dernière nuit : réveil" value={st.sleep.postNightWake} onChange={(v) => setSleep({ postNightWake: v })} />
        </div>
      </Section>

      <Section title="Rappels">
        <div className="panel flex flex-col p-4">
          <Toggle id="r-on" label="Activer les rappels" sub="Affichés quand l’application est ouverte" checked={st.reminders.enabled} onChange={toggleReminders} />
          <div className={`divide-y divide-line/60 border-t border-line/60 ${st.reminders.enabled ? '' : 'pointer-events-none opacity-45'}`}>
            <Toggle id="r-wake" label="Réveil" checked={st.reminders.wake} onChange={(v) => setRem({ wake: v })} />
            <Toggle id="r-meals" label="Repas" checked={st.reminders.meals} onChange={(v) => setRem({ meals: v })} />
            <Toggle id="r-snacks" label="Collations" checked={st.reminders.snacks} onChange={(v) => setRem({ snacks: v })} />
            <Toggle id="r-train" label="Entraînements" checked={st.reminders.training} onChange={(v) => setRem({ training: v })} />
            <Toggle id="r-water" label="Hydratation" checked={st.reminders.hydration} onChange={(v) => setRem({ hydration: v })} />
            <Toggle id="r-bag" label="Préparation du sac de sport" sub="2 heures avant le JJB" checked={st.reminders.bag} onChange={(v) => setRem({ bag: v })} />
            <Toggle id="r-bed" label="Coucher" sub="30 minutes avant" checked={st.reminders.bed} onChange={(v) => setRem({ bed: v })} />
          </div>
          <div className="mt-3 max-w-[220px]"><NumField id="r-lead" label="Prévenir avant un repas" suffix="min" value={st.reminders.leadMin} step={5} onChange={(v) => setRem({ leadMin: Math.min(60, v) })} /></div>
          <p className="mt-3 text-sm text-muted">Sans serveur, un rappel ne peut pas sonner quand l’application est fermée. Pour des alertes fiables, téléphone verrouillé compris, exporte ton planning vers ton application Calendrier.</p>
          {viewer ? (
            <p className="mt-2 text-sm text-faint">L’export Calendrier (.ics) est proposé dans la version installée sur ton ordinateur ou hébergée chez toi.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-raised p-3">
              <div className="font-semibold">Exporter vers mon Calendrier</div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {([['work', 'Postes'], ['jjb', 'JJB'], ['muscu', 'Musculation'], ['sleep', 'Réveil et coucher'], ['meals', 'Repas']] as const).map(([k, l]) => (
                  <label key={k} htmlFor={`ics-${k}`} className="flex min-h-[40px] items-center gap-2"><input id={`ics-${k}`} type="checkbox" className="h-4 w-4 accent-[rgb(232,30,43)]" checked={ics[k]} onChange={(e) => setIcs({ ...ics, [k]: e.target.checked })} />{l}</label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => saveFile('luffy-performance-30-jours.ics', buildIcs(plan, ref, addDays(ref, 29), { ...ics, alarmMin: st.reminders.leadMin }), 'text/calendar').then(() => toast('Fichier .ics créé : ouvre-le pour l’ajouter à ton Calendrier'))}><Download size={15} />30 prochains jours</button>
                <button className="btn btn-ghost btn-sm" onClick={() => saveFile('luffy-performance-programme.ics', buildIcs(plan, plan.start, plan.end, { ...ics, alarmMin: st.reminders.leadMin }), 'text/calendar').then(() => toast('Fichier .ics créé : ouvre-le pour l’ajouter à ton Calendrier'))}><Download size={15} />Tout le programme</button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Mes données">
        <div className="panel flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            {sync === 'synced' ? <Cloud size={20} className="mt-0.5 shrink-0 text-ok" /> : sync === 'error' ? <CloudOff size={20} className="mt-0.5 shrink-0 text-warn" /> : <HardDrive size={20} className="mt-0.5 shrink-0 text-muted" />}
            <div className="min-w-0 text-sm">
              <div className="font-semibold">{sync === 'synced' ? 'Synchronisé avec ton compte Claude' : sync === 'connecting' ? 'Connexion à ton espace de sauvegarde…' : sync === 'error' ? 'Synchronisation indisponible pour l’instant' : 'Enregistré sur cet appareil'}</div>
              <div className="text-muted">{sync === 'synced' ? 'Chaque modification est sauvegardée automatiquement dans ton espace privé et te suit sur tes autres appareils.' : savedLocally ? 'Chaque modification est sauvegardée automatiquement dans ce navigateur. Exporte une sauvegarde de temps en temps.' : 'Le stockage de ce navigateur est bloqué : exporte tes données avant de fermer la page.'}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={doExport}><Download size={16} />Exporter (JSON)</button>
            <button className="btn btn-ghost" onClick={async () => toast((await copyText(exportJSON(state))) ? 'Sauvegarde copiée dans le presse-papiers' : 'Copie impossible ici : utilise « Exporter »', 'info')}><Copy size={16} />Copier</button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}><Upload size={16} />Importer un fichier</button>
            <button className="btn btn-quiet" onClick={() => setShowPaste((v) => !v)}>Coller une sauvegarde</button>
            <input ref={file} id="import-file" type="file" accept="application/json,.json" className="sr-only" aria-label="Fichier de sauvegarde à importer"
              onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => doImport(String(rd.result)); rd.onerror = () => toast('Lecture du fichier impossible.', 'warn'); rd.readAsText(f); e.target.value = ''; }} />
          </div>
          {showPaste && (
            <div className="flex flex-col gap-2">
              <textarea id="import-paste" className="field min-h-[110px] font-mono text-xs" placeholder="Colle ici le contenu d’une sauvegarde" value={paste} onChange={(e) => setPaste(e.target.value)} aria-label="Sauvegarde à coller" />
              <button className="btn btn-primary self-start" disabled={!paste.trim()} onClick={() => doImport(paste)}>Importer ce texte</button>
            </div>
          )}
          <p className="text-sm text-faint">L’import remplace toutes les données actuelles par celles du fichier.</p>
          <div className="border-t border-line/60 pt-3">
            {confirmReset ? (
              <div className="flex flex-col gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3">
                <div className="font-semibold">Effacer toutes les données ?</div>
                <div className="text-sm text-muted">Séances, charges, sommeil, repas validés et réglages seront supprimés. Exporte d’abord une sauvegarde si tu veux pouvoir revenir en arrière.</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary btn-sm" onClick={() => { const d = defaultState(); const now = Date.now(); d.stamps = { core: now, workouts: now, journal: now }; replace(d); setConfirmReset(false); toast('Application réinitialisée', 'info'); }}>Tout effacer</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>Conserver mes données</button>
                </div>
              </div>
            ) : <button className="btn btn-quiet -ml-2 text-accent" onClick={() => setConfirmReset(true)}><Trash2 size={16} />Réinitialiser l’application</button>}
          </div>
        </div>
      </Section>
    </>
  );
}
