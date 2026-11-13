import React, { useState } from 'react'
import { store, LIVE } from '../lib/store.js'
import { Icon } from '../components/ui.jsx'

export const Brand = ({ small }) => <span className={'brand' + (small ? ' small' : '')}><Icon n="coral" s={small ? 22 : 34} /> CoLab Reef</span>
export function Landing() {
  return <main id="main" className="center">
    <h1><Brand /></h1><p className="lead">Live collaborative learning for science classrooms. Think first, share second, take equal turns.</p>
    <div className="cols2 narrow">
      <a className="tile" href="#/join"><Icon n="users" s={30} /><b>I am a student</b><span>Join with a 6-character code</span></a>
      <a className="tile" href="#/teacher"><Icon n="screen" s={30} /><b>I am a teacher</b><span>Classes, sessions and reports</span></a>
    </div>
    {!LIVE && <p className="hint on-dark">Demo mode: data stays in this browser and syncs between tabs on this device. Connect Supabase to run a real class.</p>}
    <p className="hint on-dark">Version {__VERSION__}</p>
  </main>
}

export function Join({ code: preset }) {
  const [code, setCode] = useState(preset || ''), [found, setFound] = useState(null), [err, setErr] = useState(''), [okClass, setOkClass] = useState(false), [busy, setBusy] = useState(false)
  const find = async c => { setBusy(true); setErr('')
    try { const r = await store.lookup(c.trim()); if (!r) setErr('No session has that code. Check the code on the projector and try again.'); else if (r.session.status === 'ended') setErr('That session has finished. Ask your teacher for the new code.'); else setFound(r) }
    catch (e) { setErr('Could not connect. Check your internet and try again.') } setBusy(false) }
  React.useEffect(() => { if (preset) find(preset) }, [])
  const pick = async st => { const s = found.session
    localStorage.setItem('reef:me:' + s.code, st.id)
    await store.putEntry({ id: `${s.id}|-1|join|${st.id}`, session_id: s.id, class_id: s.class_id, student_id: st.id, step: -1, kind: 'join', data: {}, at: Date.now() })
    location.hash = '/s/' + s.code }
  return <main id="main" className="center"><h1><Brand /></h1>
    {!found ? <form className="card narrow" onSubmit={e => { e.preventDefault(); find(code) }}>
      <label htmlFor="code">Session code</label><p className="hint">The 6 characters shown on the projector.</p>
      <input id="code" className="code-in" value={code} maxLength={6} autoCapitalize="characters" autoComplete="off" onChange={e => setCode(e.target.value.toUpperCase())} aria-describedby={err ? 'code-err' : undefined} />
      {err && <p id="code-err" className="error" role="alert">{err}</p>}
      <button className="btn primary" disabled={code.trim().length !== 6 || busy}>{busy ? 'Looking for your session' : 'Find my session'}</button></form>
    : !okClass ? <div className="card narrow"><h2>Pick your class</h2><button className="btn primary wide" onClick={() => setOkClass(true)}>{found.cls.name}</button>
      <p className="hint">Not your class? <button className="link" onClick={() => { setFound(null); setCode('') }}>Enter a different code</button></p></div>
    : <div className="card"><h2>{found.cls.name}: tap your name</h2><p className="hint">We only use your first name and class. No email, password or photo.</p>
      <div className="names">{[...found.cls.students].sort((a, b) => a.name.localeCompare(b.name)).map(st => <button key={st.id} className="btn name" onClick={() => pick(st)}>{st.name}</button>)}</div></div>}
  </main>
}
