import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'

// Students write their first name by hand on the smartboard. The ink is read into text, the student or
// teacher checks it, and only the typed first name is kept. The handwriting itself is never stored.
let trocr = null
export async function nativeRead(strokes) {
  if (!navigator.createHandwritingRecognizer) return null
  try {
    if (!(await navigator.queryHandwritingRecognizer({ languages: ['en'] }))) return null
    const rec = await navigator.createHandwritingRecognizer({ languages: ['en'] }), dr = rec.startDrawing({ recognitionType: 'text' })
    strokes.forEach(pts => { const st = new HandwritingStroke(); pts.forEach(p => st.addPoint({ x: p[0], y: p[1], t: p[2] })); dr.addStroke(st) })
    const pr = await dr.getPrediction(); dr.clear(); rec.finish(); return pr && pr[0] ? pr[0].text : ''
  } catch { return null }
}
export function inkImage(strokes) {
  const xs = strokes.flat().map(p => p[0]), ys = strokes.flat().map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(20, Math.max(...xs) - x0), h = Math.max(20, Math.max(...ys) - y0)
  const pad = 20, H = 160, s = (H - pad * 2) / h, c = document.createElement('canvas'); c.width = Math.max(64, Math.round(w * s + pad * 2)); c.height = H
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, H); g.strokeStyle = '#000'; g.lineWidth = 5; g.lineCap = g.lineJoin = 'round'
  strokes.forEach(pts => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](pad + (p[0] - x0) * s, pad + (p[1] - y0) * s)); g.stroke() }); return c.toDataURL('image/png')
}
export async function modelRead(strokes, onProgress) {
  if (!trocr) { const T = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm'); const files = {}
    trocr = await T.pipeline('image-to-text', 'Xenova/trocr-small-handwritten', { dtype: 'q8', progress_callback: p => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; const v = Object.values(files); onProgress(v.reduce((a, f) => a + f[0], 0) / v.reduce((a, f) => a + f[1], 0)) } } })
    try { localStorage.setItem('reef:trocr', '1') } catch {} }
  const r = await trocr(inkImage(strokes)); return (r && r[0] && r[0].generated_text || '').trim()
}
export const tidyName = t => { const [a, b] = t.replace(/[^\p{L}\s.'-]/gu, ' ').trim().split(/\s+/); if (!a) return ''
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); return cap(a) + (b && b.replace('.', '').length === 1 ? ' ' + b.replace('.', '').toUpperCase() : '') }

export const COLORS = ['#14263d', '#b3261e', '#0b7fab', '#1b7a43']
const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] }
// Whiteboard: split everything written on the board into separate names (strokes that sit close together).
export function groupInk(strokes) {
  const b = strokes.map(s => box(s.pts)), par = strokes.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]))
  const hs = b.map(x => x[3] - x[1]).sort((x, y) => x - y), H = Math.max(30, hs[Math.floor(hs.length / 2)] || 30), gx = H * 0.6, gy = H * 0.15
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) if (b[i][0] - gx < b[j][2] && b[j][0] - gx < b[i][2] && b[i][1] - gy < b[j][3] && b[j][1] - gy < b[i][3]) par[find(i)] = find(j)
  const g = {}; strokes.forEach((s, i) => (g[find(i)] = g[find(i)] || []).push(s.pts))
  return Object.values(g).map(pts => ({ pts, b: box(pts.flat()) })).sort((x, y) => Math.abs(x.b[1] - y.b[1]) > H ? x.b[1] - y.b[1] : x.b[0] - y.b[0])
}
export async function readInk(pts, onProgress, allowDownload) {
  const n = await nativeRead(pts); if (n) return n
  if (!allowDownload && !trocr && !localStorage.getItem('reef:trocr')) return null // caller asks before the one-time download
  return modelRead(pts, onProgress)
}

export function NamePad({ names, onAdd, onRemove, onClose, className }) {
  const dlg = useRef(), cv = useRef(), strokes = useRef([]), cur = useRef(new Map()), input = useRef(), draft = 'reef:board:' + (className || 'new')
  const [mode, setMode] = useState('one'), [pen, setPen] = useState({ c: COLORS[0], w: 6, erase: false })
  const [has, setHas] = useState(false), [text, setText] = useState(null), [busy, setBusy] = useState(''), [msg, setMsg] = useState(''), [ask, setAsk] = useState(false), [prog, setProg] = useState(0), [found, setFound] = useState(null)
  const redraw = () => { const c = cv.current; if (!c) return; const g = c.getContext('2d'), d = window.devicePixelRatio || 1; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, c.width, c.height); g.lineCap = g.lineJoin = 'round'
    strokes.current.forEach(s => { g.strokeStyle = s.c; g.lineWidth = s.w; g.beginPath(); s.pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]); g.stroke() }) }
  useEffect(() => { dlg.current.showModal() }, [])
  useEffect(() => { const fit = () => { const c = cv.current; if (!c) return; const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; c.width = r.width * d; c.height = r.height * d; redraw() }; fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit) }, [mode, found])
  const pt = e => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, Math.round(e.timeStamp)] }
  const eraseAt = p => { const n = strokes.current.filter(s => !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 18)); if (n.length !== strokes.current.length) { strokes.current = n; setHas(n.length > 0); redraw() } }
  // Every finger or pen has its own stroke, so many students can write on the board at the same time.
  const keep = () => { if (mode === 'board') try { strokes.current.length ? localStorage.setItem(draft, JSON.stringify(strokes.current)) : localStorage.removeItem(draft) } catch {} }
  const down = e => { e.preventDefault(); try { cv.current.setPointerCapture(e.pointerId) } catch {} setMsg('')
    if (mode === 'board' && pen.erase) { cur.current.set(e.pointerId, 'erase'); return eraseAt(pt(e)) }
    const st = { pts: [pt(e)], c: mode === 'board' ? pen.c : COLORS[0], w: mode === 'board' ? pen.w : 6 }; cur.current.set(e.pointerId, st); strokes.current.push(st); setHas(true); if (mode === 'one') setText(null); redraw() }
  const move = e => { const st = cur.current.get(e.pointerId); if (!st) return; if (st === 'erase') return eraseAt(pt(e)); (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(x => st.pts.push(pt(x))); redraw() }
  const up = e => { cur.current.delete(e.pointerId); keep() }
  const clear = () => { strokes.current = []; cur.current.clear(); if (mode === 'board') try { localStorage.removeItem(draft) } catch {} setHas(false); setText(null); setMsg(''); setAsk(false); setFound(null); redraw() }
  const undo = () => { strokes.current.pop(); setHas(strokes.current.length > 0); redraw(); keep() }
  // Save options: a picture of the board (PNG) or a printable page (PDF through the print dialog).
  const picture = () => { const c = cv.current, o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0); return o.toDataURL('image/png') }
  const fileName = () => 'CoLab-Reef-' + (className || 'class').replace(/\W+/g, '-') + '-names'
  const savePng = () => { const a = document.createElement('a'); a.href = picture(); a.download = fileName() + '.png'; a.click() }
  const savePdf = () => import('./Ink.jsx').then(m => m.printPicture(fileName(), (className || 'Class') + ': names written on the board', '', picture()))
  const openMode = k => { let d = []; try { d = JSON.parse(localStorage.getItem(draft) || '[]') } catch {} clear(); setMode(k); if (d.length) { try { localStorage.setItem(draft, JSON.stringify(d)) } catch {} if (k === 'board') { strokes.current = d; setHas(true) } } }
  const focus = () => setTimeout(() => input.current?.focus(), 50)
  const fail = () => 'The handwriting reader could not load (it needs internet the first time).'
  // One at a time
  const show = t => { setBusy(''); setText(tidyName(t || '')); setMsg(t ? '' : 'The name could not be read. Type it below, or clear and write again in large, separate letters.'); focus() }
  const read = async allow => { setAsk(false); setBusy('Reading the handwriting'); setMsg('')
    try { const t = await readInk(strokes.current.map(s => s.pts), setProg, allow); if (t === null) { setBusy(''); return setAsk(true) } show(t) } catch { setBusy(''); setText(''); setMsg(fail() + ' Type the name below.'); focus() } }
  const add = e => { e.preventDefault(); const n = tidyName(text || ''); if (!n) return; if (names.includes(n)) return setMsg(`${n} is already on the list. Add an initial, for example "${n} K".`); onAdd(n); clear() }
  // Whiteboard
  const readBoard = async allow => { setAsk(false); setMsg(''); const gs = groupInk(strokes.current); setBusy(`Reading ${gs.length} name${gs.length === 1 ? '' : 's'}`); const out = []
    try { for (const g of gs) { const t = await readInk(g.pts, setProg, allow); if (t === null) { setBusy(''); return setAsk(true) } out.push({ img: inkImage(g.pts), name: tidyName(t) }) } }
    catch { gs.slice(out.length).forEach(g => out.push({ img: inkImage(g.pts), name: '' })); setMsg(fail() + ' Type each name beside its handwriting.') }
    setBusy(''); setFound(out) }
  const typeBoard = () => { setAsk(false); setFound(groupInk(strokes.current).map(g => ({ img: inkImage(g.pts), name: '' }))) }
  const addFound = () => { const seen = new Set(names); found.forEach(f => { const n = tidyName(f.name); if (n && !seen.has(n)) { seen.add(n); onAdd(n) } }); clear() }
  const Tab = (k, l) => <button role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} disabled={!!busy} onClick={() => openMode(k)}>{l}</button>
  const Ask = ({ go, type }) => <div className="subcard"><p>This board's browser has no built-in handwriting reader. CoLab Reef can download a free one once (about 64 MB). After that it works on this board without downloading again.</p>
    <div className="row wrap"><button className="btn primary" onClick={go}><Icon n="down" /> Download and read</button><button className="btn" onClick={type}>Type the name{mode === 'board' ? 's' : ''} instead</button></div></div>
  return <dialog ref={dlg} className={'dlg pad' + (mode === 'board' ? ' board' : '')} onClose={onClose} aria-label="Write names by hand">
    <div className="card-h"><h3>{className || 'New class'}: write your first name</h3><button className="btn sm primary" onClick={onClose}><Icon n="check" /> Finish ({names.length} student{names.length === 1 ? '' : 's'})</button></div>
    <div className="tabs always light" role="tablist">{Tab('one', 'One at a time, with the reader')}{Tab('board', 'Whiteboard: everyone writes')}</div>
    {found ? <div><p className="hint">Check each name against its handwriting and correct it if needed. Empty boxes are skipped.</p>
      <ul className="found">{found.map((f, i) => <li key={i}><img src={f.img} alt={'Handwriting ' + (i + 1)} /><input aria-label={'First name for handwriting ' + (i + 1)} value={f.name} autoCapitalize="words" autoComplete="off" onChange={e => setFound(found.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></li>)}</ul>
      {msg && <p className="error" role="alert">{msg}</p>}
      <div className="row wrap"><button className="btn primary" disabled={!found.some(f => tidyName(f.name))} onClick={addFound}><Icon n="plus" /> Add {found.filter(f => tidyName(f.name)).length} to the class</button><button className="btn" onClick={() => setFound(null)}>Back to the board</button></div></div>
    : <>
      <p className="hint">{mode === 'one' ? 'One student at a time. Write your first name in large, separate letters with a finger or the board pen, then tap "Read my name".' : 'Several students can write at the same time. Write your first name anywhere on the board, with space around it. When the class has finished, tap "Read all names".'}</p>
      {mode === 'board' && <div className="row wrap tools" role="toolbar" aria-label="Pens">
        {COLORS.map((c, i) => <button key={c} className={'pen' + (!pen.erase && pen.c === c ? ' on' : '')} aria-pressed={!pen.erase && pen.c === c} aria-label={['Dark blue', 'Red', 'Blue', 'Green'][i] + ' pen'} style={{ background: c }} onClick={() => setPen({ ...pen, c, erase: false })} />)}
        {[[4, 'Thin'], [6, 'Medium'], [10, 'Thick']].map(([w, l]) => <button key={w} className={'btn sm' + (pen.w === w && !pen.erase ? ' primary' : '')} aria-pressed={pen.w === w} onClick={() => setPen({ ...pen, w, erase: false })}>{l}</button>)}
        <button className={'btn sm' + (pen.erase ? ' primary' : '')} aria-pressed={pen.erase} onClick={() => setPen({ ...pen, erase: !pen.erase })}>Eraser</button>
        <button className="btn sm" disabled={!has} onClick={undo}>Undo</button><button className="btn sm" disabled={!has} onClick={clear}>Clear board</button></div>}
      <canvas ref={cv} className="ink" role="img" aria-label="Writing area. If you cannot write here, use the type option." onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {mode === 'one' ? <div className="row wrap">
        <button className="btn primary" disabled={!has || !!busy} onClick={() => read(false)}><Icon n="eye" /> Read my name</button>
        <button className="btn" disabled={!has || !!busy} onClick={clear}><Icon n="x" /> Clear</button>
        <button className="btn" disabled={!!busy} onClick={() => { setText(''); setAsk(false); focus() }}><Icon n="edit" /> Type instead</button></div>
      : <div className="row wrap"><button className="btn primary" disabled={!has || !!busy} onClick={() => readBoard(false)}><Icon n="eye" /> Read all names</button>
        <button className="btn" disabled={!has || !!busy} onClick={typeBoard}><Icon n="edit" /> Type the names myself</button>
        <button className="btn" disabled={!has} onClick={savePng}><Icon n="down" /> Save as picture</button><button className="btn" disabled={!has} onClick={savePdf}><Icon n="down" /> Save as PDF</button></div>}
      {busy && <p role="status">{busy}{prog > 0 && prog < 1 ? ` (downloading the reader: ${Math.round(prog * 100)}%)` : ''}</p>}
      {ask && <Ask go={() => mode === 'one' ? read(true) : readBoard(true)} type={() => mode === 'one' ? (setAsk(false), setText(''), focus()) : typeBoard()} />}
      {msg && <p className="error" role="alert">{msg}</p>}
      {mode === 'one' && text !== null && <form className="row wrap confirm" onSubmit={add}><label htmlFor="np-n">Is this your first name? Correct it if needed.</label>
        <input id="np-n" ref={input} value={text} onChange={e => setText(e.target.value)} autoComplete="off" autoCapitalize="words" /><button className="btn primary" disabled={!tidyName(text)}><Icon n="plus" /> Add me to the class</button></form>}
    </>}
    <div className="row wrap" aria-label="Students added">{names.map(n => <span key={n} className="chip">{n}<button type="button" className="x" aria-label={`Remove ${n}`} onClick={() => onRemove(n)}><Icon n="x" s={12} /></button></span>)}</div>
    <p className="hint">Only first names are saved to the class. The handwriting is never uploaded: an unfinished whiteboard is kept on this device until you clear it or add its names, and you can save it yourself as a picture or PDF.</p>
  </dialog>
}
