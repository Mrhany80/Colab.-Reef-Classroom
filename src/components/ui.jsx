import React, { useEffect, useState, useRef } from 'react'
import { timeLeft } from '../lib/live.js'
import { uid } from '../lib/store.js'
import { HandAnswer, Ans, useRecorder } from './Ink.jsx'

const P = {
  lock: 'M6 10V8a6 6 0 1112 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h8V8a4 4 0 00-8 0v2z',
  clock: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5.4l3.5 2.1-1 1.7L11 13.5V7h2z',
  users: 'M8 11a4 4 0 110-8 4 4 0 010 8zm8 0a3 3 0 110-6 3 3 0 010 6zM1 20a7 7 0 0114 0v1H1v-1zm15 1v-1a8.9 8.9 0 00-1.7-5.2A6 6 0 0123 20v1h-7z',
  check: 'M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z',
  star: 'M12 2l3 6.6 7.2.8-5.3 4.9 1.5 7.1L12 17.8 5.6 21.4l1.5-7.1L1.8 9.4 9 8.6z',
  pin: 'M14 3l7 7-3 1-3 3 1 5-2 2-4-5-6 6-1-1 6-6-5-4 2-2 5 1 3-3z',
  play: 'M7 4l13 8-13 8z', pause: 'M6 4h4v16H6zM14 4h4v16h-4z', skip: 'M5 4l10 8-10 8zM17 4h3v16h-3z',
  plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z', x: 'M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z',
  chat: 'M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H9l-5 4V5a1 1 0 011-1z',
  eye: 'M12 5c5 0 9 4 10.5 7-1.5 3-5.500 7-10.500 7S3 15 1.500 12C3 9 7 5 12 5zm0 3a4 4 0 100 8 4 4 0 000-8z',
  down: 'M11 3h2v10l4-4 1.400 1.400L12 16.800 5.600 10.400 7 9l4 4zM4 19h16v2H4z',
  screen: 'M3 4h18a1 1 0 011 1v11a1 1 0 01-1 1h-7v2h3v2H7v-2h3v-2H3a1 1 0 01-1-1V5a1 1 0 011-1z',
  arrow: 'M13 5l7 7-7 7-1.400-1.400L16.200 13H4v-2h12.200l-4.600-4.600z',
  coral: 'M11 22v-6c-3 0-5-2-5-5V7h2v4c0 1.700 1.300 3 3 3V4h2v7c1.700 0 3-1.300 3-3V5h2v3c0 2.800-2.200 5-5 5v9z',
  edit: 'M4 17.200V20h2.800l9-9-2.800-2.800zM18.700 8.300a1 1 0 000-1.400l-1.600-1.600a1 1 0 00-1.400 0L14.300 6.700l2.800 2.800z',
  trash: 'M8 3h8l1 2h4v2H3V5h4zm-2 6h12l-1 12H7z', up: 'M12 5l7 7-1.400 1.400L13 8.800V20h-2V8.800l-4.600 4.600L5 12z',
}
export const Icon = ({ n, s = 18 }) => <svg className="ic" width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={P[n]} /></svg>

export const fmt = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
export function useNow(ms = 500) { const [, f] = useState(0); useEffect(() => { const i = setInterval(() => f(x => x + 1), ms); return () => clearInterval(i) }, [ms]) }
export function Timer({ st, big }) {
  useNow()
  const l = timeLeft(st)
  if (l == null) return big ? null : <span className="timer"><Icon n="clock" /> No timer</span>
  return <span className={'timer' + (big ? ' big' : '') + (l === 0 ? ' done' : '')} role="timer" aria-label="Time left">
    <Icon n="clock" s={big ? 34 : 18} /> {l === 0 ? "Time's up" : fmt(l)}{st.pausedLeft != null && ' (paused)'}</span>
}

export const Card = ({ title, children, tone, right }) => <section className={'card' + (tone ? ' ' + tone : '')}>
  {(title || right) && <div className="card-h">{title && <h3>{title}</h3>}{right}</div>}{children}</section>
export const Note = ({ children, icon = 'eye' }) => <p className="note"><Icon n={icon} /> <span>{children}</span></p>
export const Tag = ({ children, tone }) => <span className={'tag ' + (tone || '')}>{children}</span>
export const By = ({ ctx, id }) => <span className="by">{ctx.name(id)}</span>
export const Stems = ({ stems, onPick }) => stems?.length ? <div className="stems" aria-label="Sentence starters">
  {stems.map(s => onPick ? <button key={s} type="button" className="chip" onClick={() => onPick(s)}>{s}</button> : <span key={s} className="chip">{s}</span>)}</div> : null

// Private answer that locks. Peer content elsewhere is gated on this entry existing.
export function AnswerBox({ ctx, kind, label, hint, prefill = '', k, button = 'Lock my answer', stems, rows = 4 }) {
  const mine = ctx.one(kind, k)
  const [t, setT] = useState(prefill), [hand, setHand] = useState(false), [photo, setPhoto] = useState(''), mic = useRecorder(60)
  const pick = f => { if (!f) return; const im = new Image(); im.onload = () => { const q = Math.min(1, 800 / im.width), c = document.createElement('canvas'); c.width = im.width * q; c.height = im.height * q; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); setPhoto(c.toDataURL('image/jpeg', 0.75)) }; im.src = URL.createObjectURL(f) }
  const extra = photo || mic.audio
  const id = 'a-' + kind
  if (mine) return <div className="locked"><div className="lbl"><Icon n="lock" /> {label} <Tag>Locked</Tag></div><p><Ans d={mine.data} /></p></div>
  return <form className="field" onSubmit={e => { e.preventDefault(); if (t.trim() || extra) ctx.save(kind, { text: t.trim() || (photo ? 'Photo answer' : 'Audio answer'), ...(photo ? { photo } : {}), ...(mic.audio ? { audio: mic.audio } : {}), onTime: ctx.onTime() }, k) }}>
    <label htmlFor={id}>{label}</label>{hint && <p className="hint">{hint}</p>}
    <Stems stems={stems} onPick={s => setT(v => (v ? v + ' ' : '') + s.replace(/\.\.\./g, '').trim() + ' ')} />
    {hand ? <HandAnswer keepLabel="Lock my handwriting as my answer" onCancel={() => setHand(false)} onText={x => { setT(v => (v ? v + ' ' : '') + x); setHand(false) }} onInk={png => ctx.save(kind, { text: 'Handwritten answer', ink: png, onTime: ctx.onTime() }, k)} />
      : <button type="button" className="btn sm" onClick={() => setHand(true)}><Icon n="edit" /> Write by hand</button>}
    <textarea id={id} rows={rows} value={t} onChange={e => setT(e.target.value)} />
    <div className="row wrap"><label className="btn sm"><Icon n="plus" s={14} /> {photo ? 'Change photo' : 'Add a photo'}<input type="file" accept="image/*" className="sr" onChange={e => pick(e.target.files[0])} /></label>{photo && <button type="button" className="btn sm" onClick={() => setPhoto('')}>Remove photo</button>}{mic.ui}</div>
    {photo && <img className="inkans" src={photo} alt="Photo you added" />}
    <button className="btn primary" disabled={(!t.trim() && !extra) || mic.recording}><Icon n="lock" /> {button}</button>
    <p className="hint">Nobody sees this until you lock it. You cannot change it after locking.</p>
  </form>
}

export function ChoiceBox({ ctx, kind, label, options, reason, k, extra }) {
  const mine = ctx.one(kind, k)
  const [c, setC] = useState(null), [r, setR] = useState('')
  if (mine) return <div className="locked"><div className="lbl"><Icon n="lock" /> {label} <Tag>Locked</Tag></div>
    <p><b>{options[mine.data.choice]}</b></p>{mine.data.text && <p>{mine.data.text}</p>}</div>
  const ok = c != null && (!reason || r.trim().length > 2)
  return <form className="field" onSubmit={e => { e.preventDefault(); ok && ctx.save(kind, { choice: c, text: r.trim(), onTime: ctx.onTime(), ...(extra ? extra(c) : {}) }, k) }}>
    <fieldset><legend>{label}</legend>
      <div className="choices">{options.map((o, i) => <label key={i} className={'choice' + (c === i ? ' on' : '')}>
        <input type="radio" name={kind} checked={c === i} onChange={() => setC(i)} /><span className="letter">{String.fromCharCode(65 + i)}</span><span>{o}</span></label>)}</div>
    </fieldset>
    {reason && <><label htmlFor={'r-' + kind}>{reason} (required)</label><textarea id={'r-' + kind} rows={3} value={r} onChange={e => setR(e.target.value)} /></>}
    <button className="btn primary" disabled={!ok}><Icon n="lock" /> Lock my answer</button>
    <p className="hint">Your vote is hidden from classmates.</p>
  </form>
}

// Pair / group space. Online: private text room. Onsite: tells students who to find.
export function Room({ ctx, roomId, members, stems, what = 'partner' }) {
  const [t, setT] = useState(''), [reply, setReply] = useState(null)
  const others = members.filter(i => i !== ctx.me.id)
  const end = useRef()
  const msgs = ctx.all('msg').filter(m => m.data.room === roomId).sort((a, b) => a.at - b.at)
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }) }, [msgs.length])
  const label = others.length > 1 ? 'group' : what
  if (!others.length) return <Note icon="users">You are on your own for this step. Your teacher can add you to a {label}.</Note>
  if (ctx.mode !== 'online') return <div className="find"><Icon n="users" s={28} /><div><div className="find-l">Find your {label}:</div><div className="find-n">{ctx.names(others)}</div>
    <p>Talk face to face. Put your device down while you listen.</p><Stems stems={stems} /></div></div>
  return <div className="room">
    <div className="room-h"><Icon n="chat" /> Private room with {ctx.names(others)}</div>
    <div className="msgs" role="log" aria-live="polite">
      {!msgs.length && <p className="hint">No messages yet. Start with a sentence starter below.</p>}
      {msgs.map(m => <div key={m.id} className={'msg' + (m.student_id === ctx.me.id ? ' me' : '')}>
        <By ctx={ctx} id={m.student_id} />
        {m.data.reply && <span className="reply">building on {ctx.name(m.data.reply.by)}: “{m.data.reply.text.slice(0, 60)}”</span>}
        <span>{m.data.text}</span>
        {m.student_id !== ctx.me.id && <button type="button" className="link" onClick={() => setReply({ by: m.student_id, text: m.data.text })}>Build on this</button>}
      </div>)}<div ref={end} /></div>
    <Stems stems={stems} onPick={s => setT(s.replace(/\.\.\./g, '').trim() + ' ')} />
    {reply && <p className="hint">Building on {ctx.name(reply.by)}'s idea. <button type="button" className="link" onClick={() => setReply(null)}>Cancel</button></p>}
    <form className="row" onSubmit={e => { e.preventDefault(); if (!t.trim()) return; ctx.save('msg', { room: roomId, text: t.trim(), reply }, uid()); setT(''); setReply(null) }}>
      <label className="sr" htmlFor={'m-' + roomId}>Message</label>
      <input id={'m-' + roomId} value={t} onChange={e => setT(e.target.value)} placeholder="Write a message" autoComplete="off" />
      <button className="btn" disabled={!t.trim()}>Send</button></form>
  </div>
}

// Turn lock: one member contributes at a time, then the turn passes on, so turns stay equal.
export function useTurn(ctx, gi, kind) {
  const g = ctx.groups[gi] || []
  const e = ctx.one('turn', `${kind}-g${gi}`)
  const holder = e && g.includes(e.data.holder) ? e.data.holder : g[0]
  const pass = () => ctx.save('turn', { holder: g[(g.indexOf(holder) + 1) % g.length] }, `${kind}-g${gi}`, holder)
  const take = () => ctx.save('turn', { holder: ctx.me.id }, `${kind}-g${gi}`)
  return { holder, mine: holder === ctx.me?.id, pass, take, at: e?.at || 0 }
}
export function TurnGate({ ctx, turn, children, what = 'add to the group product' }) {
  useNow(2000)
  if (turn.mine) return <div className="turn mine"><div className="turn-h"><Icon n="edit" /> Your turn to {what}. <button type="button" className="link" onClick={turn.pass}>Pass my turn</button></div>{children}</div>
  const idle = ctx.mode === 'one' || Date.now() - turn.at > 45000
  return <div className="turn"><Icon n="lock" /> It is <b>{ctx.name(turn.holder)}</b>'s turn to {what}. Help them by saying your idea.
    {idle && <> <button type="button" className="link" onClick={turn.take}>Take the turn</button></>}</div>
}

// Horizontal bars with direct value labels. One hue; an optional second (muted) series for "before".
export function Bars({ rows, max, unit = '', legend }) {
  const m = max || Math.max(1, ...rows.flatMap(r => [r.v, r.v0 ?? 0]))
  return <div className="bars" role="table">
    {legend && <div className="legend"><span><i className="sw b0" /> {legend[0]}</span><span><i className="sw b1" /> {legend[1]}</span></div>}
    {rows.map((r, i) => <div className="bar-row" role="row" key={i}>
      <div className="bar-l" role="rowheader">{r.label}{r.mark && <Tag tone="ok">{r.mark}</Tag>}</div>
      <div className="bar-t" role="cell">
        {r.v0 != null && <div className="bar-line"><div className="bar b0" style={{ width: (r.v0 / m) * 100 + '%' }} /><span>{r.v0}{unit}</span></div>}
        <div className="bar-line"><div className="bar b1" style={{ width: (r.v / m) * 100 + '%' }} /><span>{r.v}{unit}</span></div>
      </div></div>)}
  </div>
}

export const Wait = ({ children }) => <div className="wait"><Icon n="screen" s={30} /><p>{children}</p></div>
export const pct = (a, b) => b ? Math.round((a / b) * 100) : 0
export const parseTable = t => (t || '').trim().split('\n').map(l => l.split(/\s*[,\t]\s*/))
export const DataTable = ({ text, pick, picked }) => { const [h, ...rows] = parseTable(text); return <div className="scroll"><table className="data"><thead><tr><th>Row</th>{h.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
  <tbody>{rows.map((r, i) => <tr key={i} className={picked === i ? 'on' : ''}><th>{pick ? <button type="button" className="link" onClick={() => pick(i)}>Row {i + 1}</button> : 'Row ' + (i + 1)}</th>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div> }
