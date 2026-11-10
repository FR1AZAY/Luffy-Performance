import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check as CheckIcon, X } from 'lucide-react';
import type { Shift } from '../lib/types';
import { hhmmToMin, minToHHMM } from '../lib/dates';

export const SHIFT_UI: Record<Shift, { label: string; text: string; bg: string; solid: string; ring: string }> = {
  M: { label: 'Matin', text: 'text-matin', bg: 'bg-matin/15', solid: 'bg-matin', ring: 'ring-matin/50' },
  A: { label: 'Après-midi', text: 'text-aprem', bg: 'bg-aprem/15', solid: 'bg-aprem', ring: 'ring-aprem/50' },
  N: { label: 'Nuit', text: 'text-nuit', bg: 'bg-nuit/15', solid: 'bg-nuit', ring: 'ring-nuit/50' },
  R: { label: 'Repos', text: 'text-repos', bg: 'bg-repos/15', solid: 'bg-repos', ring: 'ring-repos/50' },
};

export function ShiftBadge({ shift, small }: { shift: Shift; small?: boolean }) {
  const u = SHIFT_UI[shift];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${u.bg} ${u.text} font-semibold ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${u.solid}`} />
      {u.label}
    </span>
  );
}

export function Flag({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted' | 'accent'; children: ReactNode }) {
  const cls = {
    ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', bad: 'bg-accent/15 text-accent ring-1 ring-accent/40', muted: 'bg-raised text-muted', accent: 'bg-accent text-white',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function Section({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      {(title || action) && (
        <div className="flex min-h-[28px] items-end justify-between gap-3">
          {title && <h2 className="eyebrow">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', on); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={`sheet-in relative flex max-h-[90%] w-full flex-col rounded-t-3xl border border-line bg-surface sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
          <h3 className="display text-xl">{title}</h3>
          <button className="btn btn-quiet -mr-2" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 px-5 py-3" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>{footer}</div>}
        {!footer && <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-raised p-1 no-scrollbar" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`min-h-[36px] whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${value === o.value ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Rating({ value, onChange, low, high, label }: { value?: number; onChange: (v: number) => void; low: string; high: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={value === n} onClick={() => onChange(n)}
            className={`num h-11 flex-1 rounded-lg border text-lg transition-colors ${value === n ? 'border-accent bg-accent text-white' : 'border-line bg-bg text-muted hover:text-fg'}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-faint"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
      <span className="relative shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-7 w-12 rounded-full bg-raised ring-1 ring-line transition-colors peer-checked:bg-accent peer-checked:ring-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-fg transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function CheckRow({ checked, onChange, children, sub }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; sub?: ReactNode }) {
  return (
    <button onClick={() => onChange(!checked)} aria-pressed={checked} className="flex min-h-[48px] w-full items-center gap-3 py-1.5 text-left">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked ? 'border-ok bg-ok text-bg' : 'border-faint'}`}>
        {checked && <CheckIcon size={15} strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${checked ? 'text-muted line-through decoration-faint' : ''}`}>{children}</span>
        {sub && <span className="block text-sm text-muted">{sub}</span>}
      </span>
    </button>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-center">
      <div className="font-semibold">{title}</div>
      <div className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</div>
    </div>
  );
}

export function TimeField({ value, onChange, id, label }: { value: number; onChange: (min: number) => void; id: string; label: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <input id={id} type="time" className="field" value={minToHHMM(value)}
        onChange={(e) => { const m = hhmmToMin(e.target.value); if (m !== null) onChange(m); }} />
    </label>
  );
}

export function NumField({ value, onChange, id, label, step = 1, min = 0, suffix }: { value: number; onChange: (v: number) => void; id: string; label: string; step?: number; min?: number; suffix?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}{suffix ? ` (${suffix})` : ''}</span>
      <input id={id} type="number" inputMode="decimal" className="field" value={Number.isFinite(value) ? value : ''} step={step} min={min}
        onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); if (Number.isFinite(v)) onChange(v); }} />
    </label>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={`num mt-1 text-3xl ${tone ?? ''}`}>{value}</div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="display text-[34px] italic sm:text-[40px]">{title}</h1>
        {sub && <div className="mt-1 text-muted">{sub}</div>}
      </div>
      {right}
    </div>
  );
}
