import { AlarmClock, BedDouble, Briefcase, Dumbbell, Moon, Swords, Utensils, Coffee } from 'lucide-react';
import { fmtTime } from '../lib/dates';
import type { DayPlan, TimelineEvent } from '../lib/types';

const ICON: Record<TimelineEvent['kind'], typeof Moon> = { wake: AlarmClock, meal: Utensils, work: Briefcase, jjb: Swords, muscu: Dumbbell, nap: Moon, bed: BedDouble, sleep: Moon, info: Coffee };
const TONE: Record<TimelineEvent['kind'], string> = { wake: 'text-muted', meal: 'text-fg', work: 'text-fg', jjb: 'text-accent', muscu: 'text-accent', nap: 'text-nuit', bed: 'text-nuit', sleep: 'text-nuit', info: 'text-muted' };

/** Frise de la journée : tout ce qui est prévu, dans l'ordre de l'horloge. */
export function Timeline({ day, nowMin, done, onOpen }: { day: DayPlan; nowMin?: number; done?: (e: TimelineEvent) => boolean; onOpen?: (e: TimelineEvent) => void }) {
  let nowPlaced = nowMin === undefined;
  return (
    <ol className="flex flex-col">
      {day.events.map((e, i) => {
        const Icon = ICON[e.kind];
        const showNow = !nowPlaced && nowMin !== undefined && e.t > nowMin;
        if (showNow) nowPlaced = true;
        const clickable = onOpen && (e.kind === 'meal' || e.kind === 'muscu' || e.kind === 'jjb');
        const isDone = done?.(e);
        const strong = e.kind === 'work' || e.kind === 'jjb' || e.kind === 'muscu';
        const inner = (
          <>
            <span className="tabular w-[52px] shrink-0 pt-0.5 text-sm text-muted">{fmtTime(e.t)}</span>
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${strong ? 'bg-raised' : ''} ${TONE[e.kind]}`}><Icon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className={`block ${strong ? 'font-semibold' : ''} ${isDone ? 'text-muted line-through decoration-faint' : ''}`}>
                {e.title}{e.end !== undefined && <span className="tabular font-normal text-muted"> · jusqu’à {fmtTime(e.end)}</span>}
              </span>
              {e.sub && e.kind !== 'work' && <span className={`block text-sm ${e.flag === 'conflict' ? 'text-accent' : e.flag === 'partial' ? 'text-warn' : 'text-muted'}`}>{e.sub}</span>}
            </span>
          </>
        );
        return (
          <li key={i}>
            {showNow && <div className="my-1 flex items-center gap-2 text-xs font-semibold text-accent"><span className="tabular w-[52px]">{fmtTime(nowMin as number)}</span><span className="h-px flex-1 bg-accent/60" /><span>maintenant</span></div>}
            {clickable
              ? <button className="flex w-full items-start gap-2.5 rounded-lg py-2 text-left hover:bg-raised/60" onClick={() => onOpen?.(e)}>{inner}</button>
              : <div className="flex items-start gap-2.5 py-2">{inner}</div>}
          </li>
        );
      })}
    </ol>
  );
}
