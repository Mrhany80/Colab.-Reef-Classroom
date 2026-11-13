import React, { useEffect, useState } from 'react'
import { useLive, buildCtx } from '../lib/live.js'
import { store } from '../lib/store.js'
import { Timer, Card, Icon, Wait, Tag } from '../components/ui.jsx'
import { Reef } from '../components/Reef.jsx'
import { Brand } from './Landing.jsx'

export function useReefPoints(session, entries) {
  const [base, setBase] = useState(0)
  useEffect(() => { if (session) store.classPraise(session.class_id).then(p => setBase(p.filter(e => e.session_id !== session.id).length)).catch(() => {}) }, [session?.id])
  return base + entries.filter(e => e.kind === 'praise').length
}
// What one student sees for the current phase. Also used by the teacher to enter a response for a student.
export function StudentBody({ live, me }) {
  const ctx = buildCtx(live, me), { mod, phase, st } = ctx
  if (st.lobby) return <Wait>You are in. Wait for your teacher to start the session.</Wait>
  return <><div className="phase-h"><div><div className="eyebrow">{mod.name} · step {st.phase + 1} of {mod.phases.length}</div><h2>{phase.name}</h2></div><Timer st={st} /></div>
    <p className="instr">{phase.proj}</p><mod.Student key={st.step} ctx={ctx} /></>
}
export function StudentApp({ code }) {
  const live = useLive(code), sid = localStorage.getItem('reef:me:' + code)
  const [seen, setSeen] = useState(() => JSON.parse(localStorage.getItem('reef:seen:' + code) || '[]'))
  const points = useReefPoints(live.session, live.entries)
  if (!live.ready) return <main className="center"><p className="on-dark">Loading your session</p></main>
  const me = live.cls?.students.find(s => s.id === sid)
  if (live.missing || !me) { location.hash = '/join/' + code; return null }
  const praise = live.entries.filter(e => e.kind === 'praise' && e.student_id === me.id).sort((a, b) => b.at - a.at), fresh = praise.filter(p => !seen.includes(p.id))
  const dismiss = () => { const s = [...seen, ...fresh.map(p => p.id)]; setSeen(s); localStorage.setItem('reef:seen:' + code, JSON.stringify(s)) }
  return <div className="student">
    <header className="who"><Brand small /><div className="who-r"><span>{live.cls.name}</span><b>{me.name}</b></div></header>
    <main id="main">
      {fresh.length > 0 && <div className="praise-toast" role="status"><Icon n="star" s={22} /><div>{fresh.slice(0, 2).map(p => <p key={p.id}>{p.data.text}</p>)}{fresh.length > 2 && <p>and {fresh.length - 2} more in My praise below.</p>}<span className="hint">Only you can see this. It added {fresh.length} point{fresh.length > 1 ? 's' : ''} to the class reef.</span></div>
        <button className="btn sm" onClick={dismiss}>Got it</button></div>}
      {live.session.status === 'ended' ? <Card title="This session has finished"><p>Thank you for taking part, {me.name}.</p></Card> : <StudentBody live={live} me={me} />}
      <details className="mypraise"><summary><Icon n="star" /> My praise ({praise.length})</summary>{praise.length ? <ul>{praise.map(p => <li key={p.id}>{p.data.text}</li>)}</ul> : <p className="hint">Praise for what you do in this session appears here. Only you can see it.</p>}</details>
      <Reef compact points={points} milestones={live.cls.settings?.milestones} />
    </main></div>
}
