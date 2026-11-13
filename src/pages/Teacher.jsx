import React, { useEffect, useState } from 'react'
import { store, LIVE, newCode } from '../lib/store.js'
import { MODULES, ORDER, newItem } from '../modules/index.js'
import { DEFAULT_SETTINGS } from '../lib/content.js'
import { Card, Icon, Tag, Note } from '../components/ui.jsx'
import { ConfigForm } from '../components/ConfigForm.jsx'
import { MODE } from './Projector.jsx'
import { Brand, Maker } from './Landing.jsx'
import { NamePad } from '../components/NamePad.jsx'

const sid = () => Math.random().toString(36).slice(2, 10)
// Roster import: pasted list or CSV. Keeps first names only (plus an optional initial to tell two students apart).
export const parseRoster = text => [...new Set(text.split(/[\n,;\t]+/).map(t => t.trim().replace(/^["']|["']$/g, '')).filter(t => t && !/^(first ?name|name|student|students)$/i.test(t))
  .map(t => { const [a, b] = t.split(/\s+/); return a + (b && b.replace('.', '').length === 1 ? ' ' + b.replace('.', '').toUpperCase() : '') }))]

// Teacher passcode: one teacher, no email. First visit creates the passcode; later visits on a new device enter it.
function Passcode({ onIn }) {
  const [set, setSet] = useState(null), [k, setK] = useState(''), [k2, setK2] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const dbMsg = e => /Could not find the (table|function)/.test(e.message) ? 'The database needs one more update before the passcode can work. Run supabase/update-1.1.sql in the Supabase SQL editor, then reload this page.' : 'Could not connect. ' + e.message
  useEffect(() => { store.auth.isSet().then(setSet).catch(e => { setSet(false); setMsg(dbMsg(e)) }) }, [])
  if (set === null) return <main className="center"><p className="on-dark">Loading</p></main>
  const create = !set, ok = k.length >= 8 && (!create || k === k2)
  const run = async e => { e.preventDefault(); if (!ok) return; setBusy(true); setMsg('')
    try { if (await store.auth.enter(k, create)) onIn(); else setMsg(create ? 'A passcode was already created on another device. Reload the page and enter it.' : 'That passcode is not correct. Try again.') } catch (er) { setMsg(dbMsg(er)) } setBusy(false) }
  return <main id="main" className="center"><h1><Brand /></h1><form className="card narrow form" onSubmit={run}><h2>{create ? 'Create your teacher passcode' : 'Enter your teacher passcode'}</h2>
    <p className="hint">{create ? 'You are the only teacher. Choose a passcode of at least 8 characters. You will need it on each new device, so keep it somewhere safe.' : 'This device will remember it until you lock the dashboard.'}</p>
    <div><label htmlFor="pk">Passcode</label><input id="pk" type="password" autoComplete={create ? 'new-password' : 'current-password'} value={k} onChange={e => setK(e.target.value)} /></div>
    {create && <div><label htmlFor="pk2">Type it again</label><input id="pk2" type="password" autoComplete="new-password" value={k2} onChange={e => setK2(e.target.value)} />{k2 && k !== k2 && <p className="error">The two passcodes do not match.</p>}</div>}
    {msg && <p className="error" role="alert">{msg}</p>}
    <button className="btn primary" disabled={!ok || busy}>{create ? 'Create passcode and open dashboard' : 'Open dashboard'}</button>
    <p className="hint">Students never need this. They join with the session code and their first name.</p></form></main>
}
// Wraps every teacher screen: dashboard, control view and report.
export function TeacherGate({ children }) {
  const [user, setUser] = useState(undefined)
  const check = () => store.auth.user().then(setUser).catch(() => setUser(null))
  useEffect(() => { check() }, [])
  if (user === undefined) return <main className="center"><p className="on-dark">Loading</p></main>
  return user ? children : <Passcode onIn={check} />
}

function ClassEditor({ cls, onSave, onDelete, praise }) {
  const [c, setC] = useState(cls), [paste, setPaste] = useState(''), [one, setOne] = useState(''), [pad, setPad] = useState(false)
  const set = (k, v) => setC(p => ({ ...p, settings: { ...p.settings, [k]: v } })), S = c.settings
  const add = names => setC(p => ({ ...p, students: [...p.students, ...names.filter(n => !p.students.some(s => s.name === n)).map(n => ({ id: sid(), name: n }))] }))
  const week = Date.now() - 7 * 864e5, recent = new Set(praise.filter(p => p.at > week).map(p => p.student_id)), none = c.students.filter(s => !recent.has(s.id))
  return <Card title={c.name || 'New class'} right={c.is_sample ? <Tag>Sample</Tag> : null}><div className="form">
    <div><label htmlFor={'cn' + c.id}>Class name</label><input id={'cn' + c.id} value={c.name} onChange={e => setC({ ...c, name: e.target.value })} /></div>
    <fieldset><legend>Roster ({c.students.length} students)</legend><div className="row wrap">{c.students.map(s => <span key={s.id} className="chip">{s.name}<button type="button" className="x" aria-label={`Remove ${s.name}`} onClick={() => setC({ ...c, students: c.students.filter(x => x.id !== s.id) })}><Icon n="x" s={12} /></button></span>)}</div>
      <div className="row"><label className="sr" htmlFor={'add' + c.id}>Add one student</label><input id={'add' + c.id} value={one} placeholder="First name" onChange={e => setOne(e.target.value)} /><button type="button" className="btn" disabled={!one.trim()} onClick={() => { add(parseRoster(one)); setOne('') }}>Add student</button></div>
      <button type="button" className="btn" onClick={() => setPad(true)}><Icon n="edit" /> Students write their names on the smartboard</button>
      {pad && <NamePad className={c.name} names={c.students.map(x => x.name)} onAdd={n => add([n])} onRemove={n => setC(p => ({ ...p, students: p.students.filter(x => x.name !== n) }))} onClose={() => setPad(false)} />}
      <label htmlFor={'ps' + c.id}>Import a list</label><p className="hint">Paste first names separated by commas or new lines, or choose a CSV file. Only first names are kept; family names are dropped.</p>
      <textarea id={'ps' + c.id} rows={3} value={paste} onChange={e => setPaste(e.target.value)} placeholder="Omar, Yousef, Faisal" />
      <div className="row wrap"><button type="button" className="btn" disabled={!paste.trim()} onClick={() => { add(parseRoster(paste)); setPaste('') }}>Import {parseRoster(paste).length || ''} names</button>
        <label className="btn">Choose CSV file<input type="file" accept=".csv,.txt" className="sr" onChange={async e => { const f = e.target.files[0]; if (f) setPaste((await f.text()).split('\n').map(l => l.split(',')[0]).join('\n')) }} /></label></div></fieldset>
    <fieldset><legend>Praise schedule</legend><div className="row wrap"><div><label htmlFor={'pc' + c.id}>Praise every target behaviour for the first ... sessions</label><input id={'pc' + c.id} type="number" min="0" value={S.continuous} onChange={e => set('continuous', Number(e.target.value))} /></div>
      <div><label htmlFor={'pr' + c.id}>Then praise automatically about 1 in ...</label><input id={'pr' + c.id} type="number" min="1" value={S.ratio} onChange={e => set('ratio', Math.max(1, Number(e.target.value)))} /></div></div>
      <p className="hint">New behaviours are learned fastest when praised every time. Once established, unpredictable praise keeps them going.</p></fieldset>
    <fieldset><legend>Living Reef milestones</legend><ConfigForm pre={'ms' + c.id} fields={[{ k: 'milestones', label: 'Milestones (points are never removed)', type: 'list', item: [{ k: 'label', label: 'What happens on the reef' }, { k: 'points', label: 'Reef points needed', type: 'num' }] }]} value={S} onChange={v => setC({ ...c, settings: v })} /></fieldset>
    <div className="subcard"><b>Praise report: last 7 days</b><p>{praise.filter(p => p.at > week).length} praises sent. All-time reef points: {praise.length}.</p>
      <p>{none.length ? <>No praise this week: <b>{none.map(s => s.name).join(', ')}</b></> : 'Every student has been praised this week.'}</p></div>
    <div className="row wrap"><button className="btn primary" disabled={!c.name.trim()} onClick={() => onSave({ ...c, is_sample: c.is_sample && c.name === cls.name })}>Save class</button>
      <button className="btn" onClick={() => confirm(`Delete ${c.name} and its sessions? This cannot be undone.`) && onDelete(c.id)}><Icon n="trash" /> Delete class</button></div></div></Card>
}

function Builder({ classes, sessions, onCreate }) {
  const [f, setF] = useState({ title: '', class_id: classes[0]?.id || 'new', mode: 'devices', playlist: [] }), [open, setOpen] = useState(null), [nc, setNc] = useState({ name: '', names: '' }), [busy, setBusy] = useState(false), [pad, setPad] = useState(false)
  const isNew = f.class_id === 'new', roster = parseRoster(nc.names), dup = isNew && classes.some(c => c.name.trim().toLowerCase() === nc.name.trim().toLowerCase())
  const setPl = pl => setF(p => ({ ...p, playlist: pl })), mv = (i, d) => { const pl = [...f.playlist];[pl[i], pl[i + d]] = [pl[i + d], pl[i]]; setPl(pl); setOpen(null) }
  const ok = f.title.trim() && f.playlist.length && (isNew ? nc.name.trim() && roster.length >= 2 && !dup : f.class_id)
  return <Card title="New session"><div className="form">
    <div><label htmlFor="st">Session title</label><input id="st" value={f.title} placeholder="e.g. Osmosis, lesson 2" onChange={e => setF({ ...f, title: e.target.value })} /></div>
    <div><label htmlFor="sc">Class</label><select id="sc" value={f.class_id} onChange={e => setF({ ...f, class_id: e.target.value })}>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="new">Add a new class</option></select></div>
    {isNew && <fieldset className="subcard"><legend>New class</legend>
      <div><label htmlFor="nc-n">Class name</label><input id="nc-n" value={nc.name} placeholder="e.g. Grade 10 B" onChange={e => setNc({ ...nc, name: e.target.value })} aria-describedby={dup ? 'nc-dup' : undefined} />{dup && <p id="nc-dup" className="error" role="alert">You already have a class with this name. Choose it from the list above or use a different name.</p>}</div>
      <div><button type="button" className="btn primary" onClick={() => setPad(true)}><Icon n="edit" /> Students write their names on the smartboard</button>
        {pad && <NamePad className={nc.name} names={roster} onAdd={n => setNc(v => ({ ...v, names: (v.names.trim() ? v.names.trim() + '\n' : '') + n }))} onRemove={n => setNc(v => ({ ...v, names: parseRoster(v.names).filter(x => x !== n).join('\n') }))} onClose={() => setPad(false)} />}</div>
      <div><label htmlFor="nc-s">Or type or paste the first names</label><p className="hint">Paste or type first names separated by commas or new lines, or choose a CSV file. Only first names are kept; family names are dropped.</p>
        <textarea id="nc-s" rows={4} value={nc.names} placeholder="Omar, Yousef, Faisal" onChange={e => setNc({ ...nc, names: e.target.value })} /></div>
      <div className="row wrap"><label className="btn sm">Choose CSV file<input type="file" accept=".csv,.txt" className="sr" onChange={async e => { const file = e.target.files[0]; if (file) { const t = (await file.text()).split('\n').map(l => l.split(',')[0]).join('\n'); setNc(v => ({ ...v, names: t })) } }} /></label>
        <span className="hint" role="status">{roster.length} student{roster.length === 1 ? '' : 's'}{roster.length ? ': ' + roster.join(', ') : ''}</span></div>
      <p className="hint">The class is saved with the session. You can edit it later in the Classes tab.</p></fieldset>}
    <fieldset><legend>Room mode</legend><div className="choices">{[['online', 'Every student on their own device. Pairs and groups get private text rooms.'], ['devices', 'Students talk face to face. Devices are for private answers, votes and group products.'], ['one', 'Only you have a device. The projector shows prompts, timers and groups; you tap names to record participation.']].map(([k, d]) =>
      <label key={k} className={'choice' + (f.mode === k ? ' on' : '')}><input type="radio" name="mode" checked={f.mode === k} onChange={() => setF({ ...f, mode: k })} /><span><b>{MODE[k]}.</b> {d}</span></label>)}</div></fieldset>
    <fieldset><legend>Lesson playlist ({f.playlist.length} {f.playlist.length === 1 ? 'activity' : 'activities'})</legend>
      {!f.playlist.length && <p className="hint">Add one or more activities below. They run in this order.</p>}
      <ol className="pl-edit">{f.playlist.map((it, i) => { const m = MODULES[it.type]; return <li key={i} className="subcard"><div className="card-h"><b>{i + 1}. {m.name}</b><span className="hint">{it.config.topic}</span><div className="row">
        <button type="button" className="btn sm" disabled={i === 0} onClick={() => mv(i, -1)} aria-label="Move up"><Icon n="up" /></button><button type="button" className="btn sm" disabled={i === f.playlist.length - 1} onClick={() => mv(i, 1)} aria-label="Move down"><span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon n="up" /></span></button>
        <button type="button" className="btn sm" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}><Icon n="edit" /> {open === i ? 'Close' : 'Edit content'}</button><button type="button" className="btn sm" onClick={() => { setPl(f.playlist.filter((_, j) => j !== i)); setOpen(null) }} aria-label="Remove"><Icon n="trash" /></button></div></div>
        {open === i && <><ConfigForm pre={'c' + i} fields={m.fields} value={it.config} onChange={cfg => setPl(f.playlist.map((x, j) => j === i ? { ...x, config: cfg } : x))} />
          <fieldset><legend>Phase timers (seconds)</legend><div className="row wrap">{m.phases.filter(p => p.secs).map(p => <div key={p.id}><label htmlFor={`t${i}${p.id}`}>{p.name}</label><input id={`t${i}${p.id}`} type="number" min="10" step="10" value={it.config.secs[p.id]} onChange={e => setPl(f.playlist.map((x, j) => j === i ? { ...x, config: { ...x.config, secs: { ...x.config.secs, [p.id]: Number(e.target.value) } } } : x))} /></div>)}</div></fieldset></>}</li> })}</ol>
      <div className="mods">{ORDER.map(t => <button type="button" key={t} className="mod" onClick={() => setPl([...f.playlist, newItem(t)])}><span className="eyebrow">{MODULES[t].family}</span><b><Icon n="plus" s={14} /> {MODULES[t].name}</b><span>{MODULES[t].blurb}</span></button>)}</div>
      <button type="button" className="btn" onClick={() => setPl(ORDER.map(newItem))}>Load all 12 sample activities</button></fieldset>
    <button className="btn primary" disabled={!ok || busy} onClick={async () => { setBusy(true)
      const cls = isNew ? { id: crypto.randomUUID(), name: nc.name.trim(), is_sample: false, settings: structuredClone(DEFAULT_SETTINGS), students: roster.map(n => ({ id: sid(), name: n })) } : null
      await onCreate({ id: crypto.randomUUID(), code: newCode(), title: f.title.trim(), class_id: cls ? cls.id : f.class_id, mode: f.mode, playlist: f.playlist, status: 'live', created_at: new Date().toISOString(),
        state: { step: 0, phase: 0, lobby: true, endsAt: null, pausedLeft: null, groups: {}, x: {}, classIndex: cls ? 0 : sessions.filter(x => x.class_id === f.class_id).length } }, cls); setBusy(false) }}>Create session and open the lobby</button>
    {!ok && <p className="hint">A session needs a title, a class{isNew ? ' with a name and at least 2 students' : ''} and at least one activity.</p>}</div></Card>
}

export function TeacherHome() {
  const [classes, setClasses] = useState([]), [sessions, setSessions] = useState([]), [praise, setPraise] = useState({}), [tab, setTab] = useState('sessions'), [err, setErr] = useState('')
  const load = async () => { try { const c = await store.listClasses(); setClasses(c); setSessions(await store.listSessions()); const p = {}; for (const x of c) p[x.id] = await store.classPraise(x.id); setPraise(p) } catch (e) { setErr(e.message) } }
  useEffect(() => { load() }, [])
  const name = id => classes.find(c => c.id === id)?.name
  return <div className="teacher"><header className="top"><a href="#/"><Brand small /></a><div className="top-m"><b>Teacher dashboard</b><span>{LIVE ? 'Live: synced across devices' : 'Demo mode: data stays in this browser'}</span></div>{LIVE && <button className="btn sm" onClick={() => store.auth.signOut().then(() => { location.hash = '/' })}>Lock dashboard</button>}</header>
    <div className="tabs always" role="tablist">{[['sessions', 'Sessions'], ['new', 'New session'], ['classes', 'Classes']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
    <main id="main" className="stack">{err && <p className="error" role="alert">{/Could not find the (table|function)/.test(err) ? 'The database is not set up yet. Run supabase/schema.sql once in the Supabase SQL editor, then reload this page.' : 'Could not load your data. ' + err}</p>}
      {tab === 'sessions' && <Card title="Your sessions">{!sessions.length && <><p>No sessions yet. A session is one lesson: a class, a room mode and a playlist of activities.</p><button className="btn primary" onClick={() => setTab('new')}>Build your first session</button></>}
        <ul className="list">{[...sessions].reverse().map(s => <li key={s.id}><div><b>{s.title}</b> <Tag tone={s.status === 'ended' ? '' : 'ok'}>{s.status === 'ended' ? 'Finished' : 'Live'}</Tag><p className="hint">{name(s.class_id)} · {MODE[s.mode]} · code {s.code} · {s.playlist.map(p => MODULES[p.type].name).join(', ')}</p></div>
          <div className="row wrap"><a className="btn sm primary" href={'#/control/' + s.code}>Open</a><a className="btn sm" href={'#/report/' + s.code}>Report</a><button className="btn sm" aria-label={`Delete ${s.title}`} onClick={() => confirm(`Delete "${s.title}" and all its responses? This cannot be undone.`) && store.deleteSession(s.id).then(load)}><Icon n="trash" /></button></div></li>)}</ul></Card>}
      {tab === 'new' && <Builder classes={classes} sessions={sessions} onCreate={async (ses, cls) => { try { setErr(''); if (cls) await store.saveClass(cls); await store.saveSession(ses); location.hash = '/control/' + ses.code } catch (e) { setErr(e.message); load() } }} />}
      {tab === 'classes' && <><button className="btn primary" onClick={() => setClasses([...classes, { id: crypto.randomUUID(), name: '', is_sample: false, students: [], settings: structuredClone(DEFAULT_SETTINGS), isNew: true }])}><Icon n="plus" /> New class</button>
        {classes.map(c => <ClassEditor key={c.id} cls={c} praise={praise[c.id] || []} onSave={async ({ isNew, ...x }) => { await store.saveClass(x); load() }} onDelete={async id => { for (const s of sessions.filter(s => s.class_id === id)) await store.deleteSession(s.id); await store.deleteClass(id); load() }} />)}</>}
      <Maker dark />
    </main></div>
}
