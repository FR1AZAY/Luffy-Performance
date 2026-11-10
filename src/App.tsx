import { Component, useState, type ReactNode } from 'react';
import { CalendarDays, Dumbbell, House, Menu, Moon, Settings, Swords, TrendingUp, Utensils, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { AppProvider, useApp, type Page } from './store';
import { Modal } from './components/ui';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import Muscu from './pages/Muscu';
import Jjb from './pages/Jjb';
import Nutrition from './pages/Nutrition';
import Sleep from './pages/Sleep';
import Progress from './pages/Progress';
import SettingsPage from './pages/Settings';

const NAV: { page: Page; label: string; icon: typeof House }[] = [
  { page: 'accueil', label: 'Accueil', icon: House },
  { page: 'calendrier', label: 'Calendrier', icon: CalendarDays },
  { page: 'musculation', label: 'Musculation', icon: Dumbbell },
  { page: 'jjb', label: 'JJB', icon: Swords },
  { page: 'nutrition', label: 'Nutrition', icon: Utensils },
  { page: 'sommeil', label: 'Sommeil', icon: Moon },
  { page: 'progression', label: 'Progression', icon: TrendingUp },
  { page: 'parametres', label: 'Paramètres', icon: Settings },
];
const PRIMARY: Page[] = ['accueil', 'calendrier', 'musculation', 'nutrition'];

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="gutter mx-auto flex max-w-md flex-col gap-4 py-16">
        <h1 className="display text-3xl">Un écran a planté</h1>
        <p className="text-muted">Tes données sont intactes : elles sont enregistrées à chaque modification. Recharge la page pour reprendre. Si le problème revient, exporte tes données depuis Paramètres avant toute autre action.</p>
        <p className="rounded-xl bg-surface p-3 text-sm text-faint">{String(this.state.error.message)}</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Recharger l’application</button>
      </div>
    );
  }
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className={compact ? 'h-7 w-7' : 'h-8 w-8'} aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="rgb(var(--accent))" />
        <path d="M9 7h5v13h9v5H9z" fill="#fff" />
        <path d="M17 7h7l-5 9h-4z" fill="#fff" opacity="0.55" />
      </svg>
      <div className="display italic leading-none">
        <span className={compact ? 'text-lg' : 'text-xl'}>Luffy</span>
        <span className={`${compact ? 'text-lg' : 'text-xl'} text-accent`}> Performance</span>
      </div>
    </div>
  );
}

function Shell() {
  const { page, go, toasts, sessionId } = useApp();
  const [more, setMore] = useState(false);
  const moreActive = !PRIMARY.includes(page);
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1320px]">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-6 border-r border-line/60 px-4 py-6 lg:flex">
        <Brand />
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {NAV.map(({ page: p, label, icon: Icon }) => (
            <button key={p} onClick={() => go(p)} aria-current={page === p ? 'page' : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-left font-semibold transition-colors ${page === p ? 'bg-raised text-fg' : 'text-muted hover:text-fg'}`}>
              <Icon size={19} className={page === p ? 'text-accent' : ''} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="gutter sticky z-30 flex h-14 items-center justify-between border-b border-line/60 bg-bg/95 backdrop-blur lg:hidden" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <Brand compact />
          <button className="btn btn-quiet -mr-2" onClick={() => go('parametres')} aria-label="Paramètres"><Settings size={20} /></button>
        </header>
        <main className="gutter flex-1 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-8">
          <div key={page + (sessionId ?? '')} className="fade-in mx-auto flex w-full max-w-[1040px] flex-col gap-7">
            {page === 'accueil' && <Home />}
            {page === 'calendrier' && <CalendarPage />}
            {page === 'musculation' && <Muscu />}
            {page === 'jjb' && <Jjb />}
            {page === 'nutrition' && <Nutrition />}
            {page === 'sommeil' && <Sleep />}
            {page === 'progression' && <Progress />}
            {page === 'parametres' && <SettingsPage />}
          </div>
        </main>
      </div>

      {/* Barre d'onglets (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-surface/95 backdrop-blur lg:hidden" aria-label="Navigation principale"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.filter((n) => PRIMARY.includes(n.page)).map(({ page: p, label, icon: Icon }) => (
            <button key={p} onClick={() => go(p)} aria-current={page === p ? 'page' : undefined}
              className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${page === p ? 'text-fg' : 'text-faint'}`}>
              <Icon size={21} className={page === p ? 'text-accent' : ''} />
              {label === 'Musculation' ? 'Muscu' : label}
            </button>
          ))}
          <button onClick={() => setMore(true)} aria-haspopup="dialog" className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${moreActive ? 'text-fg' : 'text-faint'}`}>
            <Menu size={21} className={moreActive ? 'text-accent' : ''} />
            Menu
          </button>
        </div>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="Menu">
        <div className="grid grid-cols-2 gap-2">
          {NAV.map(({ page: p, label, icon: Icon }) => (
            <button key={p} onClick={() => { setMore(false); go(p); }}
              className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3 text-left font-semibold ${page === p ? 'border-accent bg-accent/10' : 'border-line bg-raised'}`}>
              <Icon size={20} className="text-accent" />
              {label}
            </button>
          ))}
        </div>
      </Modal>

      <div className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="sheet-in pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-line bg-raised px-4 py-3 text-sm font-medium shadow-lg shadow-black/40">
            {t.tone === 'ok' ? <CircleCheck size={18} className="shrink-0 text-ok" /> : t.tone === 'warn' ? <TriangleAlert size={18} className="shrink-0 text-warn" /> : <Info size={18} className="shrink-0 text-accent" />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  );
}
