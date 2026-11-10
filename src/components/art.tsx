import { ING, type Recipe } from '../data/recipes';
import type { Gear, Pose } from '../data/programs';

const FG = 'rgb(var(--fg))';
const GEAR = 'rgb(var(--faint))';
const ACC = 'rgb(var(--accent))';

function GearShape({ g }: { g: Gear }) {
  switch (g[0]) {
    case 'bar': return <line x1={g[1]} y1={g[2]} x2={g[3]} y2={g[4]} stroke={GEAR} strokeWidth={2.6} strokeLinecap="round" />;
    case 'bench': return <line x1={g[1]} y1={g[2]} x2={g[3]} y2={g[4]} stroke={GEAR} strokeWidth={5} strokeLinecap="round" />;
    case 'post': return <line x1={g[1]} y1={g[2]} x2={g[1]} y2={g[3]} stroke={GEAR} strokeWidth={2.2} strokeLinecap="round" />;
    case 'plate': return (<g><circle cx={g[1]} cy={g[2]} r={g[3]} fill="none" stroke={GEAR} strokeWidth={3.2} /><circle cx={g[1]} cy={g[2]} r={2.2} fill={GEAR} /></g>);
    case 'step': return <rect x={g[1]} y={g[2]} width={g[3]} height={g[4]} rx={1.5} fill={GEAR} />;
    case 'db': return (
      <g transform={`translate(${g[1]} ${g[2]}) rotate(${g[3]})`}>
        <line x1={-5} y1={0} x2={5} y2={0} stroke={GEAR} strokeWidth={2} />
        <rect x={-8} y={-4} width={3.4} height={8} rx={1} fill={GEAR} />
        <rect x={4.6} y={-4} width={3.4} height={8} rx={1} fill={GEAR} />
      </g>
    );
  }
}

/** Schéma de l'exercice : position clé, matériel en gris, sens de l'effort en rouge. */
export function ExerciseArt({ pose, label, className = '' }: { pose: Pose; label: string; className?: string }) {
  const pts = (a: [number, number][]) => a.map((p) => p.join(',')).join(' ');
  let arrow = null;
  if (pose.arrow) {
    const [x1, y1, x2, y2] = pose.arrow;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const bx = x2 - ux * 6, by = y2 - uy * 6;
    arrow = (
      <g>
        <line x1={x1} y1={y1} x2={bx} y2={by} stroke={ACC} strokeWidth={2.4} strokeLinecap="round" />
        <polygon points={`${x2},${y2} ${bx - uy * 4},${by + ux * 4} ${bx + uy * 4},${by - ux * 4}`} fill={ACC} />
      </g>
    );
  }
  return (
    <svg viewBox="0 0 120 90" className={className} role="img" aria-label={`Schéma : ${label}`}>
      <rect width={120} height={90} rx={12} fill="rgb(var(--raised))" />
      {pose.floor && <line x1={10} y1={85.5} x2={110} y2={85.5} stroke="rgb(var(--line))" strokeWidth={1.5} strokeLinecap="round" />}
      {pose.gear.filter((g) => g[0] !== 'db').map((g, i) => <GearShape key={i} g={g} />)}
      <g fill="none" stroke={FG} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round">
        {pose.legs.map((l, i) => <polyline key={'l' + i} points={pts([pose.hip, ...l])} />)}
        <line x1={pose.sh[0]} y1={pose.sh[1]} x2={pose.hip[0]} y2={pose.hip[1]} />
        {pose.arms.map((a, i) => <polyline key={'a' + i} points={pts([pose.sh, ...a])} />)}
      </g>
      <circle cx={pose.head[0]} cy={pose.head[1]} r={6.2} fill={FG} />
      {pose.gear.filter((g) => g[0] === 'db').map((g, i) => <GearShape key={'d' + i} g={g} />)}
      {arrow}
    </svg>
  );
}

const MINOR = new Set(['huile', 'miel', 'epices', 'citron', 'oignon', 'lait']);

/** Illustration du plat composée à partir de ses ingrédients principaux. */
export function MealArt({ recipe, className = '' }: { recipe: Recipe; className?: string }) {
  let main = recipe.ing.map(([id]) => id).filter((id) => !MINOR.has(id)).slice(0, 4);
  if (!main.length) main = recipe.ing.map(([id]) => id).slice(0, 2);
  const n = main.length;
  const cx = 60, cy = 45;
  const wedge = (i: number, r: number) => {
    if (n === 1) return <circle key={i} cx={cx} cy={cy} r={r} fill={ING[main[0]].c} />;
    const a0 = (-90 + (360 / n) * i) * (Math.PI / 180), a1 = (-90 + (360 / n) * (i + 1)) * (Math.PI / 180);
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    return <path key={i} d={`M${cx},${cy} L${p(a0)} A${r},${r} 0 ${360 / n > 180 ? 1 : 0} 1 ${p(a1)} Z`} fill={ING[main[i]].c} stroke="#F7F4EF" strokeWidth={1.6} />;
  };
  const emojiAt = (i: number, r: number) => {
    const a = n === 1 ? 0 : (-90 + (360 / n) * (i + 0.5)) * (Math.PI / 180);
    const d = n === 1 ? 0 : r * 0.56;
    return <text key={'e' + i} x={cx + d * Math.cos(a)} y={cy + d * Math.sin(a) + 5} textAnchor="middle" fontSize={n > 3 ? 12 : 14}>{ING[main[i]].e}</text>;
  };
  let body;
  if (recipe.dish === 'boite') {
    const w = 80 / n;
    body = (
      <g>
        <rect x={16} y={12} width={88} height={66} rx={10} fill="#3A3536" />
        <rect x={20} y={16} width={80} height={58} rx={7} fill="#F7F4EF" />
        {main.map((id, i) => <rect key={i} x={21 + w * i} y={17} width={w - 2} height={56} rx={5} fill={ING[id].c} />)}
        {main.map((id, i) => <text key={'e' + i} x={20 + w * i + w / 2} y={50} textAnchor="middle" fontSize={14}>{ING[id].e}</text>)}
      </g>
    );
  } else if (recipe.dish === 'verre') {
    body = (
      <g>
        <path d="M42,12 L78,12 L72,78 L48,78 Z" fill="#F7F4EF" opacity={0.25} />
        <path d="M44,24 L76,24 L71.5,76 L48.5,76 Z" fill={ING[main[0]].c} />
        <text x={60} y={56} textAnchor="middle" fontSize={18}>{ING[main[0]].e}</text>
      </g>
    );
  } else {
    const bowl = recipe.dish === 'bol';
    body = (
      <g>
        <circle cx={cx} cy={cy} r={37} fill={bowl ? '#3A3536' : '#E4DFD8'} />
        <circle cx={cx} cy={cy} r={bowl ? 31 : 33} fill="#F7F4EF" />
        {main.map((_, i) => wedge(i, bowl ? 29 : 26))}
        {main.map((_, i) => emojiAt(i, bowl ? 29 : 26))}
      </g>
    );
  }
  return (
    <svg viewBox="0 0 120 90" className={className} role="img" aria-label={`Illustration : ${recipe.name}`}>
      <rect width={120} height={90} rx={12} fill="rgb(var(--raised))" />
      {body}
    </svg>
  );
}
