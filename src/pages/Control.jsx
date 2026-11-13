import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLive, buildCtx, makeGroups, timeLeft } from '../lib/live.js'
import { MODULES } from '../modules/index.js'
import { detect, autoDeliver, praiseEntry, BEHAVIOURS, ABILITY_WORDS, customSentence } from '../lib/praise.js'
import { KIND, summ, counts } from '../lib/summ.js'
import { uid, store } from '../lib/store.js'
import { Timer, Card, Icon, Tag, Note, useNow } from '../components/ui.jsx'
import { StudentBody, useReefPoints } from './Student.jsx'
import { MODE } from './Projector.jsx'
import { Brand } from './Landing.jsx'

const SMALL = ['joined the session on time', 'listened to your partner without interrupting', 'asked a question when you were unsure', 'wrote your first idea down', 'stayed with a hard question until the timer ended', 'helped a teammate find the right row in the data']
const EFFECTS = ['That helps your group get started.', 'That made it easier for your partner to explain.', 'That is how scientists test their ideas.', 'Your group has one more idea to work with.']

function Dialog({ title, onClose, children }) { const r = useRef(); useEffect(() => { r.current.showModal(); return () => r.current?.close() }, [])
  return <dialog ref={r} className="dlg" onClose={onClose} aria-label={title}><div className="card-h"><h3>{title}</h3><button className="btn sm" onClick={onClose}><Icon n="x" /> Close</button></div>{children}</dialog> }

function PraisePanel({ live, ctx, triggers }) {
  useNow(15000)
  const { session, cls, entries } = live, st = session.state
  const praise = entries.filter(e => e.kind === 'praise').sort((a, b) => b.at - a.at), has = new Set(praise.map(p => p.id))
  const prompts = triggers.filter(t => !has.has(`${session.id}|praise|${t.key}`)).reverse().slice(0, 6)
  const [f, setF] = useState({ sid: '', b: '', e: '' })
  const send = (t, show) => { const e = praiseEntry(session, t, 'teacher'); live.put(e); if (show) live.patch({ projPraise: e.id }) }
  const who = cls.students.find(s => s.id === f.sid), bad = (f.b + ' ' + f.e).match(ABILITY_WORDS)
  const text = who && f.b.trim() && f.e.trim() ? customSentence(who.name, f.b, f.e) : ''
  const custom = show => { send({ key: 'custom-' + uid(6), sid: f.sid, behaviour: 'custom', text }, show); setF({ sid: '', b: '', e: '' }) }
  const last = id => praise.find(p => p.student_id === id)?.at, n = id => entries.filter(e => e.student_id === id && counts(e)).length
  const radar = [...cls.students].sort((a, b) => (last(a.id) || 0) - (last(b.id) || 0))
  const { continuous = 3, ratio = 3 } = cls.settings || {}, idx = st.classIndex ?? 0
  return <>
    <Card title="Praise prompts" right={<Tag>{idx < continuous ? `Session ${idx + 1} of ${continuous}: praising every time` : `Unpredictable: about 1 in ${ratio} sent automatically`}</Tag>}>
      {!prompts.length && <p className="hint">Ready sentences appear here when a student shows a target behaviour that has not been praised yet.</p>}
      <ul className="list">{prompts.map(t => <li key={t.key}><div><Tag>{BEHAVIOURS[t.behaviour].label}</Tag><p>{t.text}</p></div><div className="col-btn">
        <button className="btn sm primary" onClick={() => send(t)}>Send privately</button><button className="btn sm" onClick={() => send(t, true)}><Icon n="screen" /> Send and show</button></div></li>)}</ul>
      <p className="hint">Say the sentence aloud, or send it to the student's device in one tap.</p></Card>
    <Card title="Add your own praise">
      <form className="form" onSubmit={e => { e.preventDefault(); text && !bad && custom(false) }}>
        <div><label htmlFor="pr-s">Student</label><select id="pr-s" value={f.sid} onChange={e => setF({ ...f, sid: e.target.value })}><option value="">Choose a student</option>{cls.students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label htmlFor="pr-b">What exactly did they do? "{who?.name || 'Name'}, you ..."</label><input id="pr-b" list="pr-bl" value={f.b} onChange={e => setF({ ...f, b: e.target.value })} /><datalist id="pr-bl">{SMALL.map(s => <option key={s} value={s} />)}</datalist></div>
        <div><label htmlFor="pr-e">What effect did it have?</label><input id="pr-e" list="pr-el" value={f.e} onChange={e => setF({ ...f, e: e.target.value })} /><datalist id="pr-el">{EFFECTS.map(s => <option key={s} value={s} />)}</datalist></div>
        {bad && <p className="error" role="alert">Praise what the student did, not what they are. Remove "{bad[0]}".</p>}
        {text && !bad && <p className="preview">{text}</p>}
        <div className="row wrap"><button className="btn primary" disabled={!text || !!bad}>Send privately</button><button type="button" className="btn" disabled={!text || !!bad} onClick={() => custom(true)}><Icon n="screen" /> Send and show</button></div></form></Card>
    <Card title="Praise Radar" right={<Tag>Longest wait first</Tag>}>
      <ul className="radar">{radar.map(s => { const l = last(s.id), m = l ? Math.floor((Date.now() - l) / 60000) : null; return <li key={s.id}><button className={'btn sm name' + (l ? '' : ' warn')} onClick={() => { setF({ ...f, sid: s.id }); document.getElementById('pr-b')?.focus() }} aria-label={`Praise ${s.name}`}>{s.name}</button>
        <span>{l ? (m < 1 ? 'praised just now' : `${m} min since last praise`) : 'no praise yet this session'}</span><span className="hint">{n(s.id)} contribution{n(s.id) === 1 ? '' : 's'}</span></li> })}</ul>
      <p className="hint">Tap a name to praise a small step, such as a first answer from a student who rarely takes part.</p></Card>
    <Card title="Praise sent" right={<Tag>{praise.length}</Tag>}><ul className="list">{praise.slice(0, 8).map(p => <li key={p.id}><div><Tag>{p.data.by === 'auto' ? 'Automatic' : 'Teacher'}</Tag><p>{p.data.text}</p></div>
      <button className={'btn sm' + (st.projPraise === p.id ? ' primary' : '')} aria-pressed={st.projPraise === p.id} onClick={() => live.patch({ projPraise: st.projPraise === p.id ? null : p.id })}><Icon n="screen" /> {st.projPraise === p.id ? 'On projector' : 'Show'}</button></li>)}</ul>
      {!praise.length && <p className="hint">Praise is private on the student's device unless you choose to show it.</p>}</Card></>
}

export function Control({ code }) {
  const live = useLive(code), sent = useRef(new Set()), [sel, setSel] = useState(null), [as, setAs] = useState(null), [tab, setTab] = useState('run')
  const points = useReefPoints(live.session, live.entries)
  const triggers = useMemo(() => live.session && live.cls ? detect(live.session, live.cls, live.entries) : [], [live.entries.length, live.session, live.cls])
  const ready = live.ready && live.session && live.cls
  const ctx = ready ? buildCtx(live, null, 'teacher') : null
  // Praise schedule: deliver automatically according to the class's reinforcement schedule.
  useEffect(() => { if (!ready || live.session.status === 'ended') return; const has = new Set(live.entries.filter(e => e.kind === 'praise').map(e => e.id))
    triggers.forEach(t => { const id = `${live.session.id}|praise|${t.key}`; if (!has.has(id) && !sent.current.has(id) && autoDeliver(live.session, live.cls, t.key)) { sent.current.add(id); live.put(praiseEntry(live.session, t, 'auto')) } }) }, [triggers, ready])
  // Late joiners are added to the smallest group of the current activity.
  const presentKey = ready ? ctx.present().join() : ''
  useEffect(() => { if (!ready) return; const g = ctx.groups; if (!g.length) return; const inG = new Set(g.flat()), miss = ctx.present().filter(i => !inG.has(i)); if (!miss.length) return
    const ng = g.map(x => [...x]); miss.forEach(i => ng.sort((a, b) => a.length - b.length)[0].push(i)); const order = g.map(x => x[0]); ng.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    live.patch({ groups: { ...ctx.st.groups, [ctx.step]: ng } }) }, [presentKey, ready && ctx.groups.length, ready && ctx.step])
  if (!live.ready) return <main className="center"><p className="on-dark">Loading</p></main>
  if (!ready) return <main className="center"><p className="on-dark">No session has the code {code}. <a href="#/teacher">Back to dashboard</a></p></main>
  const { session, cls, st, mod, phase } = ctx
  const answerOf = stepN => id => { const e = live.entries.find(e => e.step === stepN && e.student_id === id && ['v1', 'first', 'p1', 'n1'].includes(e.kind)); return e ? (e.data.choice ?? e.data.text) : undefined }
  const spec = (m, cfg) => { const r = v => typeof v === 'function' ? v(cfg) : v; return { size: r(m.group.size), count: r(m.group.count) } }
  const group = (stepN, method) => { const it = session.playlist[stepN]; return makeGroups(ctx.present(), spec(MODULES[it.type], it.config), method === 'different' ? answerOf(stepN) : null) }
  const go = (i, xPatch, stepN = st.step) => { const item = session.playlist[stepN], m = MODULES[item.type], ph = m.phases[i], secs = item.config.secs?.[ph.id] ?? ph.secs
    const p = { step: stepN, phase: i, lobby: false, endsAt: secs ? Date.now() + secs * 1000 : null, pausedLeft: null }
    if (xPatch) p.x = { ...st.x, [stepN]: { ...(st.x?.[stepN] || {}), ...xPatch } }
    if (m.group && ph.id === m.group.phase && (!st.groups?.[stepN] || m.group.by)) p.groups = { ...st.groups, [stepN]: group(stepN, m.group.by ? 'different' : 'random') }
    live.patch(p) }
  ctx.go = go
  const left = timeLeft(st), lastPhase = st.phase === mod.phases.length - 1, lastStep = st.step === session.playlist.length - 1
  const move = to => { if (!sel) return; const ng = ctx.groups.map(g => g.filter(i => i !== sel)); ng[to].push(sel); live.patch({ groups: { ...st.groups, [st.step]: ng.filter(g => g.length) } }); setSel(null) }
  const joined = new Set(live.entries.filter(e => e.kind === 'join').map(e => e.student_id))
  const part = id => ctx.one('part', `${st.phase}-${id}`)
  const ended = session.status === 'ended'
  return <div className="teacher">
    <header className="top"><a href="#/teacher" aria-label="Back to dashboard"><Brand small /></a><div className="top-m"><b>{session.title}</b><span>{cls.name} · {MODE[session.mode]} · {points} reef points</span></div>
      <div className="row wrap"><span className="join-s">Code <b>{session.code}</b></span><a className="btn sm" href={'#/projector/' + session.code} target="_blank" rel="noreferrer"><Icon n="screen" /> Open projector view</a><a className="btn sm" href={'#/report/' + session.code}><Icon n="down" /> Report</a></div></header>
    <nav className="playlist" aria-label="Lesson playlist">{session.playlist.map((it, i) => <button key={i} className={'pl' + (i === st.step && !st.lobby ? ' on' : '')} aria-current={i === st.step && !st.lobby ? 'step' : undefined} onClick={() => go(0, null, i)} disabled={ended}><span>{i + 1}</span> {MODULES[it.type].name}<small>{it.config.topic}</small></button>)}</nav>
    <div className="tabs" role="tablist">{[['run', 'Run'], ['praise', `Praise (${triggers.length})`], ['roster', 'Roster']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    <main id="main" className={'grid tab-' + tab}>
      <div className="g-run">
        {ended ? <Card title="This session has finished"><p>Open the report to see participation, answers and praise.</p><a className="btn primary" href={'#/report/' + session.code}>Open report</a></Card>
        : st.lobby ? <Card title="Lobby" tone="coral"><p>{session.mode === 'one' ? 'One-device mode: students do not join. Open the projector view, then start.' : `${joined.size} of ${cls.students.length} students have joined with code ${session.code}.`}</p>
          <button className="btn primary" onClick={() => go(0)}><Icon n="play" /> Start session</button></Card>
        : <><Card title={`${mod.name}: ${phase.name}`} right={<Timer st={st} />}>
            <ol className="phases">{mod.phases.map((p, i) => <li key={p.id}><button className={'ph' + (i === st.phase ? ' on' : '')} aria-current={i === st.phase ? 'step' : undefined} onClick={() => go(i)}>{i + 1}. {p.name}</button></li>)}</ol>
            <p className="instr">{phase.proj}</p>
            <div className="row wrap" role="group" aria-label="Phase controls">
              {left != null && (st.pausedLeft != null ? <button className="btn" onClick={() => live.patch({ endsAt: Date.now() + st.pausedLeft, pausedLeft: null })}><Icon n="play" /> Resume</button> : <button className="btn" onClick={() => live.patch({ pausedLeft: left, endsAt: null })}><Icon n="pause" /> Pause</button>)}
              {left != null && [30, 60].map(s => <button key={s} className="btn" onClick={() => live.patch(st.pausedLeft != null ? { pausedLeft: st.pausedLeft + s * 1000 } : { endsAt: Math.max(Date.now(), st.endsAt) + s * 1000 })}><Icon n="plus" /> {s === 30 ? '30 seconds' : '1 minute'}</button>)}
              <button className="btn" onClick={() => go(st.phase)}>Restart phase</button>
              {!lastPhase ? <button className="btn primary" onClick={() => go(st.phase + 1)}><Icon n="skip" /> Next phase</button> : !lastStep ? <button className="btn primary" onClick={() => go(0, null, st.step + 1)}><Icon n="skip" /> Next activity</button>
                : <button className="btn primary" onClick={() => confirm('End the session for everyone? Students keep their praise; the report stays available.') && store.saveSession({ ...live.session, status: 'ended' })}>End session</button>}
            </div></Card>
          <mod.Teacher ctx={ctx} />
          {mod.group && <Card title="Groups" right={<div className="row wrap"><button className="btn sm" onClick={() => live.patch({ groups: { ...st.groups, [st.step]: group(st.step, 'random') } })}>Regroup at random</button><button className="btn sm" onClick={() => live.patch({ groups: { ...st.groups, [st.step]: group(st.step, 'different') } })}>Regroup by different answers</button></div>}>
            {!ctx.groups.length && <p className="hint">Groups are made automatically when the "{mod.phases.find(p => p.id === mod.group.phase).name}" phase starts. You can also make them now.</p>}
            <div className="groups">{ctx.groups.map((g, i) => <div key={i} className="group"><b>{i + 1}</b><div className="row wrap">{g.map(id => <button key={id} className={'chip' + (sel === id ? ' on' : '')} aria-pressed={sel === id} onClick={() => setSel(sel === id ? null : id)}>{ctx.name(id)}</button>)}</div>
              {sel && !g.includes(sel) && <button className="btn sm primary" onClick={() => move(i)}>Move {ctx.name(sel)} here</button>}</div>)}</div>
            {ctx.groups.length > 0 && <p className="hint">To set groups yourself, tap a name, then choose its new group.</p>}</Card>}
          <Card title="Responses in this activity" right={<Tag>Teacher only</Tag>}><div className="scroll"><table className="data"><thead><tr><th>Student</th><th>Responses</th></tr></thead><tbody>
            {cls.students.map(s => { const es = ctx.here.filter(e => e.student_id === s.id && counts(e) && e.kind !== 'msg').sort((a, b) => a.at - b.at), msgs = ctx.here.filter(e => e.student_id === s.id && e.kind === 'msg').length
              return <tr key={s.id}><th>{s.name}{session.mode !== 'one' && !joined.has(s.id) && <span className="hint"> (not joined)</span>}</th><td>{es.map(e => <div key={e.id}><span className="hint">{KIND[e.kind] || e.kind}:</span> {summ(e)}</div>)}{msgs > 0 && <div className="hint">{msgs} room message{msgs > 1 ? 's' : ''}</div>}{!es.length && !msgs && <span className="hint">Nothing yet</span>}</td></tr> })}</tbody></table></div></Card></>}
      </div>
      <div className="g-praise"><PraisePanel live={live} ctx={ctx} triggers={triggers} /></div>
      <div className="g-roster"><Card title="Roster" right={<Tag>{session.mode === 'one' ? 'Tap to record participation' : `${joined.size} joined`}</Tag>}>
        <ul className="roster">{cls.students.map(s => <li key={s.id}>
          <button className={'btn sm name' + (part(s.id)?.data.on ? ' primary' : '')} aria-pressed={!!part(s.id)?.data.on} disabled={st.lobby || ended} onClick={() => ctx.save('part', { on: !part(s.id)?.data.on, text: 'Took part in ' + phase.name }, `${st.phase}-${s.id}`, s.id)}>{part(s.id)?.data.on && <Icon n="check" s={14} />} {s.name}</button>
          <button className="btn sm" disabled={st.lobby || ended} onClick={() => setAs(s)} aria-label={`Enter a response for ${s.name}`}><Icon n="edit" s={14} /> Enter</button>
          {session.mode !== 'one' && <span className={'dot' + (joined.has(s.id) ? ' on' : '')}>{joined.has(s.id) ? 'joined' : 'not joined'}</span>}</li>)}</ul>
        <p className="hint">Tap a name to record that the student took part in this phase. "Enter" lets you type a response for a student who has no device.</p></Card></div>
    </main>
    {as && <Dialog title={`Entering for ${as.name} · ${cls.name}`} onClose={() => setAs(null)}><div className="student in-dlg"><StudentBody live={live} me={as} /></div></Dialog>}
  </div>
}
