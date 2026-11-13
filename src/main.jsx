import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { Landing, Join } from './pages/Landing.jsx'
import { TeacherHome, TeacherGate } from './pages/Teacher.jsx'
import { Control } from './pages/Control.jsx'
import { Projector } from './pages/Projector.jsx'
import { StudentApp } from './pages/Student.jsx'
import { Report } from './pages/Report.jsx'


// Never show a blank page: if a screen fails, offer to reload, and to clear unfinished boards saved on this device.
class Safe extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() { if (!this.state.err) return this.props.children
    const clear = () => { Object.keys(localStorage).filter(k => k.startsWith('reef:cb:') || k.startsWith('reef:board:')).forEach(k => localStorage.removeItem(k)); location.reload() }
    return <main className="center"><div className="card narrow"><h2>Something went wrong on this screen</h2><p>Your session and your students' answers are safe. Reload to continue where you were.</p>
      <div className="row wrap"><button className="btn primary" onClick={() => location.reload()}>Reload</button><button className="btn" onClick={clear}>Clear unfinished boards on this device and reload</button><a className="btn" href="#/" onClick={() => setTimeout(() => location.reload(), 50)}>Go to the first screen</a></div>
      <p className="hint">If it happens again, tell Mr. Hany's developer this message: {String(this.state.err?.message || this.state.err).slice(0, 160)}</p></div></main> }
}
function App() {
  const [h, setH] = useState(location.hash.slice(1) || '/')
  useEffect(() => { const f = () => { setH(location.hash.slice(1) || '/'); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const [, a, b] = h.split('/')
  const page = a === 'teacher' ? <TeacherGate><TeacherHome /></TeacherGate> : a === 'control' ? <TeacherGate><Control key={b} code={b} /></TeacherGate> : a === 'projector' ? <Projector code={b} /> : a === 'report' ? <TeacherGate><Report code={b} /></TeacherGate>
    : a === 'join' ? <Join code={b} /> : a === 's' ? <StudentApp code={b} /> : <Landing />
  return <><a className="skip" href="#main">Skip to content</a>{page}</>
}
createRoot(document.getElementById('root')).render(<Safe><App /></Safe>)
