import React, { useEffect, useMemo, useState } from 'react'
import { useLive } from '../lib/live.js'
import { store } from '../lib/store.js'
import { MODULES } from '../modules/index.js'
import { BEHAVIOURS } from '../lib/praise.js'
import { counts, summ, KIND } from '../lib/summ.js'
import { Card, Icon, Tag } from '../components/ui.jsx'
import { MODE } from './Projector.jsx'
import { Ans } from '../components/Ink.jsx'
import { Brand, Maker } from './Landing.jsx'

export function buildReport(session, cls, entries) {
  const steps = session.playlist.map((it, i) => ({ i, name: MODULES[it.type].name, pairs: MODULES[it.type].revised || [] }))
  const joined = new Set(entries.filter(e => e.kind === 'join').map(e => e.student_id)), bk = Object.keys(BEHAVIOURS)
  const rows = cls.students.map(s => { const mine = entries.filter(e => e.student_id === s.id)
    const per = steps.map(st => mine.filter(e => e.step === st.i && counts(e)).length)
    const ba = steps.flatMap(st => st.pairs.map(([a, b]) => { const x = mine.find(e => e.step === st.i && e.kind === a), y = mine.find(e => e.step === st.i && e.kind === b); return { step: st, before: x ? summ(x) : '', after: y ? summ(y) : '', changed: !!(x && y && (x.data.choice ?? x.data.ink ?? x.data.text) !== (y.data.choice ?? y.data.ink ?? y.data.text)) } }))
    const pr = mine.filter(e => e.kind === 'praise')
    return { s, joined: session.mode === 'one' ? per.some(Boolean) : joined.has(s.id), per, total: per.reduce((a, b) => a + b, 0), ba, pr, praise: Object.fromEntries(bk.map(k => [k, pr.filter(p => p.data.behaviour === k).length])), praiseN: pr.length } })
  return { steps, rows, bk }
}
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
export function toCsv(session, cls, r) {
  const ba = r.rows[0]?.ba || []
  const head = ['Student', 'Class', 'Took part', 'Contributions (total)', ...r.steps.map(s => `Contributions: ${s.i + 1}. ${s.name}`), ...ba.flatMap(b => [`${b.step.i + 1}. ${b.step.name}: before peer talk`, 'after peer talk', 'changed']), 'Praise (total)', ...r.bk.map(k => 'Praise: ' + BEHAVIOURS[k].label)]
  return [head, ...r.rows.map(x => [x.s.name, cls.name, x.joined ? 'yes' : 'no', x.total, ...x.per, ...x.ba.flatMap(b => [b.before, b.after, b.changed ? 'yes' : 'no']), x.praiseN, ...r.bk.map(k => x.praise[k])])].map(l => l.map(esc).join(',')).join('\n')
}

// Dashboard building blocks. One hue for magnitude; every mark is a button that filters the page.
const Kpi = ({ label, value, sub }) => <div className="kpi"><div className="kpi-v">{value}</div><div className="kpi-l">{label}</div>{sub && <div className="kpi-s">{sub}</div>}</div>
const Viz = ({ title, hint, children, wide }) => <section className={'viz' + (wide ? ' wide' : '')}><h3>{title}</h3>{hint && <p className="hint">{hint}</p>}{children}</section>
function HBars({ rows, onPick, picked, unit = '' }) { const m = Math.max(1, ...rows.map(r => r.v))
  return <div className="hbars">{rows.map(r => <button key={r.key} type="button" className={'hbar' + (picked === r.key ? ' on' : '') + (picked != null && picked !== r.key ? ' dim' : '')} aria-pressed={picked === r.key} onClick={() => onPick && onPick(picked === r.key ? null : r.key)} disabled={!onPick} title={`${r.label}: ${r.v}${unit}`}>
    <span className="hbar-l">{r.label}</span><span className="hbar-t"><span className="hbar-f" style={{ width: (r.v / m) * 100 + '%' }} /></span><span className="hbar-v">{r.v}{unit}</span></button>)}</div> }
function Donut({ parts, center, label }) { const total = parts.reduce((a, p) => a + p.v, 0) || 1, R = 54, C = 2 * Math.PI * R; let off = 0
  return <div className="donut"><svg viewBox="0 0 140 140" role="img" aria-label={label + ': ' + parts.map(p => `${p.label} ${p.v}`).join(', ')}>
    <circle cx="70" cy="70" r={R} fill="none" stroke="#e6dcc4" strokeWidth="18" />
    {parts.map(p => { const len = (p.v / total) * C, el = <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.c} strokeWidth="18" strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"><title>{p.label}: {p.v}</title></circle>; off += len; return el })}
    <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill="#14263d" fontFamily="Fraunces, serif">{center}</text><text x="70" y="86" textAnchor="middle" fontSize="10" fill="#4a5a70">{label}</text></svg>
    <ul className="legend-v">{parts.map(p => <li key={p.label}><i className="sw" style={{ background: p.c }} /> {p.label}: <b>{p.v}</b></li>)}</ul></div> }
const heat = (v, m) => v === 0 ? '#f3ecd9' : `rgba(11,127,171,${0.18 + 0.82 * (v / m)})`

export function Report({ code }) {
  const live = useLive(code), [week, setWeek] = useState(null), [fStep, setFStep] = useState(null), [fStu, setFStu] = useState(null), [fBeh, setFBeh] = useState(null)
  useEffect(() => { if (live.session) store.classPraise(live.session.class_id).then(setWeek).catch(() => setWeek([])) }, [live.session?.id])
  const r = useMemo(() => live.session && live.cls ? buildReport(live.session, live.cls, live.entries) : null, [live.entries.length, live.session, live.cls])
  if (!live.ready) return <main className="center"><p className="on-dark">Loading</p></main>
  if (!r) return <main className="center"><p className="on-dark">No session has the code {code}.</p></main>
  const { session, cls, entries } = live, since = Date.now() - 7 * 864e5
  const recent = new Set((week || []).filter(p => p.at > since).map(p => p.student_id)), none = cls.students.filter(s => !recent.has(s.id))
  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + toCsv(session, cls, r)], { type: 'text/csv' })); a.download = `colab-reef-${session.title.replace(/\W+/g, '-')}.csv`; a.click() }
  // Filters (slicers): activity, student, praise behaviour. Every tile and chart below respects them.
  const rows = r.rows.filter(x => fStu == null || x.s.id === fStu)
  const val = x => fStep == null ? x.total : x.per[fStep]
  const praises = rows.flatMap(x => x.pr).filter(p => (fStep == null || p.step === fStep) && (fBeh == null || p.data.behaviour === fBeh))
  const took = rows.filter(x => fStep == null ? x.joined : x.per[fStep] > 0).length, contrib = rows.reduce((a, x) => a + val(x), 0)
  const ba = rows.flatMap(x => x.ba.filter(b => (fStep == null || b.step.i === fStep) && b.before && b.after)), changed = ba.filter(b => b.changed).length
  const boards = entries.filter(e => e.kind === 'board' && (fStep == null || e.step === fStep))
  const media = entries.filter(e => (e.data?.ink || e.data?.photo || e.data?.audio) && e.kind !== 'praise' && e.kind !== 'board' && (fStep == null || e.step === fStep) && (fStu == null || e.student_id === fStu))
  const maxCell = Math.max(1, ...r.rows.flatMap(x => x.per)), any = fStep != null || fStu != null || fBeh != null
  const detail = entries.filter(e => counts(e) && e.kind !== 'msg' && (fStep == null || e.step === fStep) && (fStu == null || e.student_id === fStu)).sort((a, b) => a.step - b.step || a.at - b.at)
  return <div className="teacher report"><header className="top no-print"><a href="#/teacher"><Brand small /></a><div className="top-m"><b>Session dashboard</b><span>{session.title}</span></div>
    <div className="row wrap"><a className="btn sm" href={'#/control/' + code}>Back to session</a><button className="btn sm primary" onClick={csv}><Icon n="down" /> Download CSV</button><button className="btn sm primary" onClick={() => window.print()}><Icon n="down" /> Save as PDF</button></div></header>
    <main id="main" className="dash">
      <div className="dash-h"><div><h1>{session.title}</h1><p>{cls.name} · {MODE[session.mode]} · {new Date(session.created_at || Date.now()).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p></div>
        <div className="slicers no-print" role="group" aria-label="Filters">
          <label>Activity<select value={fStep ?? ''} onChange={e => setFStep(e.target.value === '' ? null : Number(e.target.value))}><option value="">All activities</option>{r.steps.map(s => <option key={s.i} value={s.i}>{s.i + 1}. {s.name}</option>)}</select></label>
          <label>Student<select value={fStu ?? ''} onChange={e => setFStu(e.target.value || null)}><option value="">All students</option>{cls.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Praise for<select value={fBeh ?? ''} onChange={e => setFBeh(e.target.value || null)}><option value="">All behaviours</option>{r.bk.map(k => <option key={k} value={k}>{BEHAVIOURS[k].label}</option>)}</select></label>
          <button className="btn sm" disabled={!any} onClick={() => { setFStep(null); setFStu(null); setFBeh(null) }}>Clear filters</button></div></div>
      {any && <p className="filter-note" role="status">Showing: {fStep != null ? r.steps[fStep].name : 'all activities'} · {fStu ? cls.students.find(s => s.id === fStu)?.name : 'all students'}{fBeh ? ' · praise for: ' + BEHAVIOURS[fBeh].label : ''}</p>}
      <div className="kpis">
        <Kpi label="Students who took part" value={`${took} of ${rows.length}`} sub={rows.length ? Math.round((took / rows.length) * 100) + '%' : ''} />
        <Kpi label="Contributions" value={contrib} sub={rows.length ? (contrib / rows.length).toFixed(1) + ' per student' : ''} />
        <Kpi label="Revised after peer talk" value={ba.length ? Math.round((changed / ba.length) * 100) + '%' : 'n/a'} sub={ba.length ? `${changed} of ${ba.length} answers` : 'no before and after answers'} />
        <Kpi label="Praises given" value={praises.length} sub={`${new Set(praises.map(p => p.student_id)).size} students praised`} />
        <Kpi label="Class whiteboards saved" value={boards.length} sub={media.length + ' handwritten, photo or audio answers'} />
      </div>
      <div className="vgrid">
        <Viz title="Contributions by activity" hint="Select a bar to filter the page."><HBars rows={r.steps.map(s => ({ key: s.i, label: `${s.i + 1}. ${s.name}`, v: rows.reduce((a, x) => a + x.per[s.i], 0) }))} picked={fStep} onPick={setFStep} /></Viz>
        <Viz title="Praise by behaviour" hint="Select a bar to see who was praised for it."><HBars rows={r.bk.map(k => ({ key: k, label: BEHAVIOURS[k].label, v: rows.flatMap(x => x.pr).filter(p => (fStep == null || p.step === fStep) && p.data.behaviour === k).length }))} picked={fBeh} onPick={setFBeh} /></Viz>
        <Viz title="Answers after peer talk"><Donut label="revised" center={ba.length ? Math.round((changed / ba.length) * 100) + '%' : '0%'} parts={[{ label: 'Revised', v: changed, c: '#0b7fab' }, { label: 'Kept the same', v: ba.length - changed, c: '#c77d1f' }]} /></Viz>
        <Viz title="Participation"><Donut label="took part" center={rows.length ? Math.round((took / rows.length) * 100) + '%' : '0%'} parts={[{ label: 'Took part', v: took, c: '#0b7fab' }, { label: 'Did not take part', v: rows.length - took, c: '#c77d1f' }]} /></Viz>
        <Viz wide title="Participation matrix" hint="Contributions per student and activity. Darker means more. Select a name or a column heading to filter. Roster order, never ranked.">
          <div className="scroll"><table className="matrix"><thead><tr><th>Student</th>{r.steps.map(s => <th key={s.i}><button type="button" className={'link' + (fStep === s.i ? ' on' : '')} onClick={() => setFStep(fStep === s.i ? null : s.i)} title={s.name}>{s.i + 1}. {s.name}</button></th>)}<th>Total</th><th>Praise</th></tr></thead>
            <tbody>{r.rows.map(x => <tr key={x.s.id} className={fStu && fStu !== x.s.id ? 'dim' : ''}><th><button type="button" className={'link' + (fStu === x.s.id ? ' on' : '')} onClick={() => setFStu(fStu === x.s.id ? null : x.s.id)}>{x.s.name}</button></th>
              {x.per.map((n, i) => <td key={i} className={fStep != null && fStep !== i ? 'dim' : ''} style={{ background: heat(n, maxCell), color: n / maxCell > 0.55 ? '#fff' : '#14263d' }}>{n}</td>)}<td><b>{x.total}</b></td><td>{x.praiseN}</td></tr>)}</tbody></table></div></Viz>
        <Viz wide title="Students to notice next lesson" hint="No praise in the last 7 days. Look for one small step from each and praise it straight away.">{week == null ? <p>Loading</p> : none.length ? <div className="row wrap">{none.map(s => <button key={s.id} type="button" className={'chip' + (fStu === s.id ? ' on' : '')} onClick={() => setFStu(fStu === s.id ? null : s.id)}>{s.name}</button>)}</div> : <p>Every student in {cls.name} has been praised this week.</p>}</Viz>
      </div>
      {ba.length > 0 && <Card title="Answers before and after peer talk"><div className="scroll"><table className="data"><thead><tr><th>Student</th><th>Activity</th><th>Before</th><th>After</th><th>Changed</th></tr></thead>
        <tbody>{rows.flatMap(x => x.ba.filter(b => (fStep == null || b.step.i === fStep) && (b.before || b.after)).map((b, i) => <tr key={x.s.id + i}><th>{x.s.name}</th><td>{b.step.i + 1}. {b.step.name}</td><td>{b.before}</td><td>{b.after}</td><td>{b.changed ? <Tag tone="ok">Revised</Tag> : 'Same'}</td></tr>))}</tbody></table></div></Card>}
      {praises.length > 0 && <Card title={`Praise sent (${praises.length})`}><details open={praises.length <= 12}><summary>Show every praise sentence</summary><ul className="list">{praises.sort((a, b) => a.at - b.at).map(p => <li key={p.id}><div><Tag>{BEHAVIOURS[p.data.behaviour]?.label}</Tag> {p.data.text}</div></li>)}</ul></details></Card>}
      {(fStep != null || fStu != null) && <Card title={`Responses (${detail.length})`}><div className="scroll"><table className="data"><thead><tr><th>Student</th><th>Activity</th><th>Type</th><th>Response</th></tr></thead>
        <tbody>{detail.map(e => <tr key={e.id}><th>{cls.students.find(s => s.id === e.student_id)?.name || 'Class'}</th><td>{e.step + 1}. {r.steps[e.step]?.name}</td><td>{KIND[e.kind] || e.kind}</td><td>{e.data.ink || e.data.photo || e.data.audio ? <Ans d={e.data} /> : summ(e)}</td></tr>)}</tbody></table></div></Card>}
      {boards.length > 0 && <Card title="Class whiteboards"><div className="cols2">{boards.sort((a, b) => a.at - b.at).map(b => <figure key={b.id}><img className="figure" src={b.data.png} alt={'Class whiteboard from ' + (r.steps[b.step]?.name || 'the session')} /><figcaption>{b.step + 1}. {r.steps[b.step]?.name}, {b.data.phase}{b.data.texts?.length ? ': ' + b.data.texts.join(' | ') : ''}{b.data.audio && <audio controls src={b.data.audio} aria-label="Recording saved with this board" />}</figcaption></figure>)}</div></Card>}
      {media.length > 0 && <Card title="Handwritten, photo and audio answers"><ul className="list">{media.sort((a, b) => a.step - b.step || a.at - b.at).map(e => <li key={e.id}><div><b>{cls.students.find(s => s.id === e.student_id)?.name || 'Group'}</b> <span className="hint">{e.step + 1}. {r.steps[e.step]?.name}</span><br /><Ans d={e.data} /></div></li>)}</ul></Card>}
      <Maker dark />
    </main></div>
}
