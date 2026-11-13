import React, { useState } from 'react'
import { store, LIVE } from '../lib/store.js'
import { Icon } from '../components/ui.jsx'
import { Reef } from '../components/Reef.jsx'

export const Brand = ({ small }) => <span className={'brand' + (small ? ' small' : '')}><Icon n="coral" s={small ? 22 : 34} /> CoLab Reef</span>
export const Maker = ({ dark }) => <p className={'maker' + (dark ? ' on-dark' : '')}>Designed by <b>Mr. Hany Taha</b></p>
const Bubbles = () => <div className="bubbles" aria-hidden="true">{[8, 19, 31, 44, 58, 67, 79, 91].map((x, i) => <i key={x} style={{ left: x + '%', animationDelay: `-${i * 1.7}s`, width: 8 + (i % 4) * 5, height: 8 + (i % 4) * 5, animationDuration: `${9 + (i % 3) * 3}s` }} />)}</div>
export function Landing() {
  return <div className="hero"><Bubbles />
    <main id="main" className="center">
      <span className="pill-tag">Live collaborative learning for science classrooms</span>
      <h1><Brand /></h1><p className="lead">Think first. Share second. Take equal turns. <b>Grow the reef together.</b></p>
      <Maker dark />
      <div className="cols2 narrow">
        <a className="tile" href="#/join"><span className="tile-ic"><Icon n="users" s={30} /></span><b>I am a student</b><span>Join with a 6-character code</span></a>
        <a className="tile" href="#/teacher"><span className="tile-ic"><Icon n="screen" s={30} /></span><b>I am a teacher</b><span>Classes, sessions and reports</span></a>
      </div>
      <ul className="feats"><li><Icon n="lock" /> Private thinking before sharing</li><li><Icon n="users" /> 12 collaborative activities</li><li><Icon n="edit" /> Handwriting on the smartboard</li><li><Icon n="star" /> Praise that grows a class reef</li></ul>
      {!LIVE && <p className="hint on-dark">Demo mode: data stays in this browser and syncs between tabs on this device.</p>}
      <p className="hint on-dark">Version {__VERSION__}</p>
    </main>
    <Reef points={64} milestones={[{ points: 10, label: '' }, { points: 25, label: '' }, { points: 50, label: '' }]} decorative /></div>
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
