import React, { useEffect, useState } from 'react'
import { useLive } from '../lib/live.js'
import { store } from '../lib/store.js'
import { MODULES } from '../modules/index.js'
import { BEHAVIOURS } from '../lib/praise.js'
import { counts, summ } from '../lib/summ.js'
import { Card, Icon, Tag, Bars } from '../components/ui.jsx'
import { MODE } from './Projector.jsx'
import { Brand } from './Landing.jsx'

export function buildReport(session, cls, entries) {
  const steps = session.playlist.map((it, i) => ({ i, name: MODULES[it.type].name, pairs: MODULES[it.type].revised || [] }))
  const joined = new Set(entries.filter(e => e.kind === 'join').map(e => e.student_id)), bk = Object.keys(BEHAVIOURS)
  const rows = cls.students.map(s => { const mine = entries.filter(e => e.student_id === s.id)
    const per = steps.map(st => mine.filter(e => e.step === st.i && counts(e)).length)
    const ba = steps.flatMap(st => st.pairs.map(([a, b]) => { const x = mine.find(e => e.step === st.i && e.kind === a), y = mine.find(e => e.step === st.i && e.kind === b); return { step: st, before: x ? summ(x) : '', after: y ? summ(y) : '', changed: !!(x && y && (x.data.choice ?? x.data.text) !== (y.data.choice ?? y.data.text)) } }))
    const pr = mine.filter(e => e.kind === 'praise')
    return { s, joined: session.mode === 'one' ? per.some(Boolean) : joined.has(s.id), per, total: per.reduce((a, b) => a + b, 0), ba, praise: Object.fromEntries(bk.map(k => [k, pr.filter(p => p.data.behaviour === k).length])), praiseN: pr.length } })
  return { steps, rows, bk }
}
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
export function toCsv(session, cls, r) {
  const ba = r.rows[0]?.ba || []
  const head = ['Student', 'Class', 'Took part', 'Contributions (total)', ...r.steps.map(s => `Contributions: ${s.i + 1}. ${s.name}`), ...ba.flatMap(b => [`${b.step.i + 1}. ${b.step.name}: before peer talk`, 'after peer talk', 'changed']), 'Praise (total)', ...r.bk.map(k => 'Praise: ' + BEHAVIOURS[k].label)]
  return [head, ...r.rows.map(x => [x.s.name, cls.name, x.joined ? 'yes' : 'no', x.total, ...x.per, ...x.ba.flatMap(b => [b.before, b.after, b.changed ? 'yes' : 'no']), x.praiseN, ...r.bk.map(k => x.praise[k])])].map(l => l.map(esc).join(',')).join('\n')
}
export function Report({ code }) {
  const live = useLive(code), [week, setWeek] = useState(null)
  useEffect(() => { if (live.session) store.classPraise(live.session.class_id).then(setWeek).catch(() => setWeek([])) }, [live.session?.id])
  if (!live.ready) return <main className="center"><p className="on-dark">Loading</p></main>
  if (!live.session || !live.cls) return <main className="center"><p className="on-dark">No session has the code {code}.</p></main>
  const { session, cls, entries } = live, r = buildReport(session, cls, entries), since = Date.now() - 7 * 864e5
  const recent = new Set((week || []).filter(p => p.at > since).map(p => p.student_id)), none = cls.students.filter(s => !recent.has(s.id))
  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + toCsv(session, cls, r)], { type: 'text/csv' })); a.download = `colab-reef-${session.title.replace(/\W+/g, '-')}.csv`; a.click() }
  const used = r.bk.filter(k => r.rows.some(x => x.praise[k]))
  return <div className="teacher report"><header className="top no-print"><a href="#/teacher"><Brand small /></a><div className="top-m"><b>Session report</b><span>{session.title}</span></div>
    <div className="row wrap"><a className="btn sm" href={'#/control/' + code}>Back to session</a><button className="btn sm primary" onClick={csv}><Icon n="down" /> Download CSV</button><button className="btn sm primary" onClick={() => window.print()}><Icon n="down" /> Save as PDF</button></div></header>
    <main id="main" className="stack">
      <Card title={session.title}><p>{cls.name} · {MODE[session.mode]} · {new Date(session.created_at || Date.now()).toLocaleDateString('en-GB', { dateStyle: 'long' })} · {r.rows.filter(x => x.joined).length} of {cls.students.length} students took part · {entries.filter(e => e.kind === 'praise').length} praises</p></Card>
      <Card title="Participation per student"><div className="scroll"><table className="data"><thead><tr><th>Student</th><th>Took part</th>{r.steps.map(s => <th key={s.i}>{s.i + 1}. {s.name}</th>)}<th>Total</th></tr></thead>
        <tbody>{r.rows.map(x => <tr key={x.s.id}><th>{x.s.name}</th><td>{x.joined ? 'Yes' : 'No'}</td>{x.per.map((n, i) => <td key={i}>{n}</td>)}<td><b>{x.total}</b></td></tr>)}</tbody></table></div><p className="hint">A contribution is any locked answer, vote, card, comment, link, note or teacher-recorded participation.</p></Card>
      {r.steps.some(s => s.pairs.length) && <Card title="Answers before and after peer talk"><div className="scroll"><table className="data"><thead><tr><th>Student</th><th>Activity</th><th>Before</th><th>After</th><th>Changed</th></tr></thead>
        <tbody>{r.rows.flatMap(x => x.ba.filter(b => b.before || b.after).map((b, i) => <tr key={x.s.id + i}><th>{x.s.name}</th><td>{b.step.i + 1}. {b.step.name}</td><td>{b.before}</td><td>{b.after}</td><td>{b.changed ? <Tag tone="ok">Revised</Tag> : 'Same'}</td></tr>))}</tbody></table></div></Card>}
      <Card title="Praise given, by behaviour"><Bars rows={r.bk.map(k => ({ label: BEHAVIOURS[k].label, v: r.rows.reduce((a, x) => a + x.praise[k], 0) }))} />
        <div className="scroll"><table className="data"><thead><tr><th>Student</th>{used.map(k => <th key={k}>{BEHAVIOURS[k].label}</th>)}<th>Total</th></tr></thead><tbody>{r.rows.map(x => <tr key={x.s.id}><th>{x.s.name}</th>{used.map(k => <td key={k}>{x.praise[k] || ''}</td>)}<td><b>{x.praiseN}</b></td></tr>)}</tbody></table></div>
        <p className="hint">Listed in roster order, never ranked.</p></Card>
      <Card title="Students with no praise in the last 7 days">{week == null ? <p>Loading</p> : none.length ? <p><b>{none.map(s => s.name).join(', ')}</b></p> : <p>Every student in {cls.name} has been praised this week.</p>}
        <p className="hint">Look for a small step from each of these students next lesson and praise it straight away.</p></Card>
    </main></div>
}
