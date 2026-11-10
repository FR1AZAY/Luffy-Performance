import { useMemo, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../store';
import { liftSeries, mealSeries, sleepSeries, weeklyCounts } from '../lib/stats';

const ACC = 'rgb(232 30 43)';
const FG = 'rgb(247 244 243)';
const NUIT = 'rgb(132 146 255)';
const OK = 'rgb(78 203 135)';
const tip = {
  contentStyle: { background: 'rgb(34 30 31)', border: '1px solid rgb(52 46 47)', borderRadius: 10, fontSize: 13, padding: '6px 10px' },
  labelStyle: { color: 'rgb(172 163 163)', marginBottom: 2 },
  itemStyle: { color: FG, padding: 0 },
  cursor: { stroke: 'rgb(118 109 110)', strokeWidth: 1, fill: 'rgb(52 46 47 / 0.4)' },
};
const axis = { tickLine: false, axisLine: false, tick: { fontSize: 11 } } as const;
const nf = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

function ChartCard({ title, value, unit, empty, children }: { title: string; value?: string; unit?: string; empty?: string; children: ReactNode }) {
  return (
    <div className="panel flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {value && <div className="shrink-0"><span className="num text-2xl">{value}</span>{unit && <span className="ml-1 text-sm text-muted">{unit}</span>}</div>}
      </div>
      {empty
        ? <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-muted">{empty}</div>
        : <div className="h-[150px] w-full">{children}</div>}
    </div>
  );
}

export function Charts() {
  const { state, plan, today } = useApp();
  const bench = useMemo(() => liftSeries(state, ['bench'], 'weight'), [state.workouts, state.perfLogs]);
  const pulls = useMemo(() => liftSeries(state, ['tractions', 'tractionsSup'], 'reps'), [state.workouts, state.perfLogs]);
  const weeks = useMemo(() => weeklyCounts(state, plan, today), [state.workouts, state.jjbStatus, plan, today]);
  const sleep = useMemo(() => sleepSeries(state, plan, today), [state.sleepLogs, plan, today]);
  const meals = useMemo(() => mealSeries(state, plan, today), [state.mealsDone, plan, today]);

  const anySession = weeks.some((w) => w.muscu + w.jjb > 0);
  const anyJjb = weeks.some((w) => w.jjb > 0);
  const sleepVals = sleep.filter((s) => s.reel !== null).map((s) => s.reel as number);
  const mealVals = meals.filter((m) => m.pct !== null).map((m) => m.pct as number);
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <ChartCard title="Développé couché" value={bench.length ? nf(bench[bench.length - 1].v) : undefined} unit="kg" empty={bench.length ? undefined : 'Valide une série de développé couché pour démarrer la courbe.'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bench} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} domain={['dataMin - 5', 'dataMax + 5']} allowDecimals={false} />
            <Tooltip {...tip} formatter={(v: number) => [`${nf(v)} kg`, 'Charge max']} />
            <Line type="monotone" dataKey="v" stroke={ACC} strokeWidth={2.5} dot={{ r: 3, fill: ACC, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Tractions" value={pulls.length ? String(pulls[pulls.length - 1].v) : undefined} unit="rép. max" empty={pulls.length ? undefined : 'Tes meilleures séries de tractions apparaîtront ici.'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pulls} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} domain={[0, 'dataMax + 2']} allowDecimals={false} />
            <Tooltip {...tip} formatter={(v: number) => [`${v} répétitions`, 'Meilleure série']} />
            <Line type="monotone" dataKey="v" stroke={FG} strokeWidth={2.5} dot={{ r: 3, fill: FG, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Séances par semaine" value={anySession ? String(weeks[weeks.length - 1].muscu + weeks[weeks.length - 1].jjb) : undefined} unit="cette semaine" empty={anySession ? undefined : 'Musculation et JJB validés seront comptés semaine par semaine.'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} allowDecimals={false} />
            <Tooltip {...tip} labelFormatter={(l) => `Semaine du ${l}`} />
            <Bar dataKey="muscu" name="Musculation" stackId="a" fill={ACC} maxBarSize={28} isAnimationActive={false} />
            <Bar dataKey="jjb" name="JJB" stackId="a" fill={FG} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Fréquence du JJB" value={anyJjb ? nf(weeks[weeks.length - 1].jjbH) : undefined} unit="h cette semaine" empty={anyJjb ? undefined : 'Valide tes entraînements de JJB pour suivre ton volume hebdomadaire.'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} allowDecimals={false} />
            <Tooltip {...tip} labelFormatter={(l) => `Semaine du ${l}`} formatter={(v: number, _n, p: any) => [`${v} séance(s), ${nf(p.payload.jjbH)} h`, 'JJB']} />
            <Bar dataKey="jjb" name="JJB" fill={FG} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Régularité du sommeil" value={sleepVals.length ? nf(avg(sleepVals)) : undefined} unit="h en moyenne" empty={sleepVals.length ? undefined : 'Renseigne tes nuits dans Sommeil : réel et prévu seront comparés.'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sleep} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} minTickGap={14} />
            <YAxis {...axis} domain={[0, 11]} ticks={[0, 4, 8]} />
            <Tooltip {...tip} formatter={(v: number, n: string) => [`${nf(v)} h`, n]} />
            <ReferenceLine y={8} stroke={OK} strokeDasharray="4 4" />
            <Bar dataKey="reel" name="Dormi" fill={NUIT} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="prevu" name="Prévu" stroke="rgb(172 163 163)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Régularité des repas" value={mealVals.length ? String(Math.round(avg(mealVals))) : undefined} unit="% validés" empty={mealVals.length ? undefined : 'Coche tes repas dans Nutrition pour voir ta régularité.'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={meals} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axis} minTickGap={14} />
            <YAxis {...axis} domain={[0, 100]} ticks={[0, 50, 100]} />
            <Tooltip {...tip} formatter={(v: number) => [`${v} %`, 'Repas validés']} />
            <Area type="monotone" dataKey="pct" stroke={OK} strokeWidth={2} fill={OK} fillOpacity={0.18} connectNulls dot={{ r: 2.5, fill: OK, strokeWidth: 0 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
