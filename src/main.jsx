import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { Landing, Join } from './pages/Landing.jsx'
import { TeacherHome, TeacherGate } from './pages/Teacher.jsx'
import { Control } from './pages/Control.jsx'
import { Projector } from './pages/Projector.jsx'
import { StudentApp } from './pages/Student.jsx'
import { Report } from './pages/Report.jsx'


function App() {
  const [h, setH] = useState(location.hash.slice(1) || '/')
  useEffect(() => { const f = () => { setH(location.hash.slice(1) || '/'); window.scrollTo(0, 0) }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  const [, a, b] = h.split('/')
  const page = a === 'teacher' ? <TeacherGate><TeacherHome /></TeacherGate> : a === 'control' ? <TeacherGate><Control key={b} code={b} /></TeacherGate> : a === 'projector' ? <Projector code={b} /> : a === 'report' ? <TeacherGate><Report code={b} /></TeacherGate>
    : a === 'join' ? <Join code={b} /> : a === 's' ? <StudentApp code={b} /> : <Landing />
  return <><a className="skip" href="#main">Skip to content</a>{page}</>
}
createRoot(document.getElementById('root')).render(<App />)
