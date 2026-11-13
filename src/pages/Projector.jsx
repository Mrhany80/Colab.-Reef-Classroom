import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useLive, buildCtx } from '../lib/live.js'
import { Timer, Card, Icon, Tag } from '../components/ui.jsx'
import { Reef } from '../components/Reef.jsx'
import { Brand, Maker } from './Landing.jsx'
import { useReefPoints } from './Student.jsx'
import { ClassBoard } from '../components/Ink.jsx'
import { uid } from '../lib/store.js'

export const joinUrl = code => location.href.split('#')[0] + '#/join/' + code
export function Qr({ code, size = 180 }) { const [src, setSrc] = useState(''); useEffect(() => { QRCode.toDataURL(joinUrl(code), { margin: 1, width: size * 2 }).then(setSrc) }, [code]); return src ? <img className="qr" width={size} height={size} src={src} alt={'QR code to join session ' + code} /> : null }
export const MODE = { online: 'Online', devices: 'Onsite with devices', one: 'Onsite, one device' }
export const defaultGroups = ctx => { const gp = ctx.mod.group; if (!gp || !ctx.groups.length) return []
  const from = ctx.mod.phases.findIndex(p => p.id === gp.phase); if (ctx.pi < from || ctx.pi === ctx.mod.phases.length - 1) return []
  return ctx.groups.map((g, i) => ({ label: (gp.size === 2 ? 'Pair ' : 'Group ') + (i + 1), ids: g })) }

// Projector view: large type, prompts, timers, groupings. Never shows a name beside an answer that could be wrong.
export function Projector({ code }) {
  const live = useLive(code), points = useReefPoints(live.session, live.entries), [board, setBoard] = useState(false)
  if (!live.ready) return <main className="center"><p className="on-dark">Loading</p></main>
  if (!live.session) return <main className="center"><p className="on-dark">No session has the code {code}.</p></main>
  const ctx = buildCtx(live, null, 'projector'), { st, mod, phase, session, cls } = ctx
  const joined = new Set(live.entries.filter(e => e.kind === 'join').map(e => e.student_id)).size
  const groups = st.lobby ? [] : (mod.projGroups ? mod.projGroups(ctx) : mod === undefined ? [] : (session.playlist[st.step].type === 'hinge' && ctx.x.decision !== 'pair') ? [] : defaultGroups(ctx))
  const pr = st.projPraise && live.entries.find(e => e.id === st.projPraise)
  return <div className="proj"><header className="proj-h"><Brand small /><span>{cls.name} · {session.title}</span><Maker dark /><span className="join-s">Join: <b>{session.code}</b></span></header>
    <main id="main">
      {session.status === 'ended' ? <div className="center"><h1>Session finished</h1><p className="lead">Thank you, {cls.name}.</p></div>
      : st.lobby ? <div className="lobby"><div><h1>Join the session</h1>{session.mode === 'one' ? <p className="lead">No devices needed today. Watch this screen for prompts, timers and groups.</p> : <><p className="lead">Open <b>{joinUrl('').replace(/^https?:\/\//, '').replace('#/join/', '')}</b> and enter the code, or scan.</p><div className="bigcode" aria-label={'Join code ' + session.code.split('').join(' ')}>{session.code}</div></>}
          <p className="lead">{session.mode === 'one' ? cls.students.length + ' students on the roster' : `${joined} of ${cls.students.length} joined`}</p></div>{session.mode !== 'one' && <Qr code={session.code} size={260} />}</div>
      : <><div className="phase-h"><div><div className="eyebrow">{mod.name} · {ctx.cfg.topic} · step {st.phase + 1} of {mod.phases.length}</div><h1>{phase.name}</h1></div><Timer st={st} big /></div>
        <p className="instr big">{phase.proj}</p>
        <div className="row wrap"><button className="btn primary" onClick={() => setBoard(true)}><Icon n="edit" /> Open class whiteboard</button>{ctx.all('board').length > 0 && <Tag>{ctx.all('board').length} board{ctx.all('board').length > 1 ? 's' : ''} saved in this activity</Tag>}</div>
        {board && <ClassBoard title={`${mod.name}, ${phase.name}`} prompt={ctx.cfg.question || ctx.cfg.statement || ctx.cfg.prompt || ctx.cfg.focus || ctx.cfg.topic} draftKey={`reef:cb:${session.id}:${st.step}`} groups={(groups.length ? groups : ctx.groups.map((g, i) => ({ label: 'Group ' + (i + 1), ids: g }))).map(g => g.label.split(':')[0].replace(/ (visits|at) .*/, '') + ': ' + ctx.names(g.ids))} onClose={() => setBoard(false)} onSave={d => ctx.save('board', { ...d, phase: phase.name }, uid())} />}
        <mod.Projector ctx={ctx} />
        {groups.length > 0 && <Card title={session.mode === 'online' ? 'Groups (private rooms are open)' : 'Find your group'}><div className="groups">{groups.map((g, i) => <div key={i} className="group"><b>{g.label}</b><span>{g.numbered ? g.ids.map((id, k) => `${k + 1} ${ctx.name(id)}`).join(' · ') : ctx.names(g.ids)}</span></div>)}</div></Card>}</>}
      {pr && <div className="proj-praise" role="status"><Icon n="star" s={34} /><p>{pr.data.text}</p></div>}
    </main>
    <Reef points={points} milestones={cls.settings?.milestones} /></div>
}
