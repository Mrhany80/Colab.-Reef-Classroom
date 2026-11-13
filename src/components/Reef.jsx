import React from 'react'
import { hash } from '../lib/live.js'
// Living Reef: grows with every praise. Points only go up; no individual is ranked.
const COL = ['#ff7a59', '#ffb39c', '#f2c14e', '#e0607e', '#7bdcb5', '#c59bff']
export function Reef({ points, milestones = [], compact, decorative }) {
  const ms = [...milestones].sort((a, b) => a.points - b.points), next = ms.find(m => m.points > points), got = ms.filter(m => m.points <= points)
  const n = Math.min(points, 70)
  const corals = Array.from({ length: n }, (_, i) => { const h = hash('c' + i); return { x: 20 + (h % 960), s: 0.5 + ((h >> 8) % 60) / 60 + Math.min(0.6, points / 150), c: COL[h % COL.length], t: (h >> 4) % 3, d: (h % 30) / 10 } }).sort((a, b) => a.s - b.s)
  return <div className={'reef' + (compact ? ' compact' : '')}>
    <svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMax slice" role="img" aria-hidden={decorative || undefined} aria-label={`Class reef with ${points} reef points. ${got.length ? 'Milestones reached: ' + got.map(m => m.label).join(', ') + '.' : ''}`}>
      <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f2f55" /><stop offset="1" stopColor="#0b1d33" /></linearGradient></defs>
      <rect width="1000" height="260" fill="url(#sea)" />
      {got.length >= 4 && <ellipse cx="500" cy="250" rx="520" ry="120" fill="#ff7a59" opacity=".13" />}
      <path d="M0 232 Q250 212 500 228 T1000 222 V260 H0z" fill="#e9dcc0" />
      {corals.map((c, i) => <g key={i} transform={`translate(${c.x},232) scale(${c.s})`}><g className="sway" style={{ animationDelay: `-${c.d}s` }}>
        {c.t === 0 ? <path d="M0 0V-46M0 -20Q-16 -26 -16 -44M0 -28Q14 -34 14 -54M-16 -34Q-26 -38 -26 -50M14 -42Q24 -46 24 -58" stroke={c.c} strokeWidth="7" strokeLinecap="round" fill="none" />
          : c.t === 1 ? <path d="M-18 0Q-22 -36 -6 -40Q0 -56 8 -40Q24 -36 18 0z" fill={c.c} />
          : <path d="M0 0Q-6 -30 -12 -50M0 0Q2 -34 0 -60M0 0Q8 -28 14 -46" stroke={c.c} strokeWidth="5" strokeLinecap="round" fill="none" />}</g></g>)}
      {got.length >= 1 && [120, 610, 860].map(x => <path key={x} transform={`translate(${x},240)`} d="M0 -11L3 -3 11 -3 5 2 7 10 0 5 -7 10 -5 2 -11 -3 -3 -3z" fill="#f2c14e" />)}
      {got.length >= 2 && <g className="swim">{[0, 1, 2, 3, 4].map(i => <path key={i} transform={`translate(${300 + i * 34},${70 + (i % 2) * 22})`} d="M0 0Q10 -8 20 0Q10 8 0 0zM0 0L-8 -6V6z" fill="#7bdcb5" />)}</g>}
      {got.length >= 3 && <g className="swim slow" transform="translate(700,110)"><ellipse rx="30" ry="19" fill="#5fae7a" /><ellipse rx="20" ry="12" fill="#3d8a5c" /><circle cx="38" cy="-4" r="9" fill="#5fae7a" /><path d="M-14 14l-10 14 16-6zM14 14l10 14-16-6zM-30 0l-14 -6 4 10z" fill="#5fae7a" /></g>}
    </svg>
    {!decorative && <div className="reef-t"><b>{points}</b> reef point{points === 1 ? '' : 's'}{next ? <> · {next.points - points} more until “{next.label}”</> : ms.length ? <> · every milestone reached</> : null}</div>}
  </div>
}
