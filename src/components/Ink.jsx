import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import { COLORS, readInk, groupInk, inkImage } from './NamePad.jsx'
import { uid } from '../lib/store.js'

// Shared handwriting surface: every finger or pen gets its own stroke, so several people can write at once.
export function useInk({ draftKey, tools } = {}) {
  const cv = useRef(), strokes = useRef([]), cur = useRef(new Map())
  const [has, setHas] = useState(false), [pen, setPen] = useState({ c: COLORS[0], w: tools ? 6 : 4, erase: false })
  const redraw = () => { const c = cv.current; if (!c) return; const g = c.getContext('2d'), d = window.devicePixelRatio || 1; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, c.width, c.height); g.lineCap = g.lineJoin = 'round'
    strokes.current.forEach(s => { g.strokeStyle = s.c; g.lineWidth = s.w; g.beginPath(); s.pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); if (s.pts.length === 1) g.lineTo(s.pts[0][0] + 0.1, s.pts[0][1]); g.stroke() }) }
  const keep = () => { if (draftKey) try { strokes.current.length ? localStorage.setItem(draftKey, JSON.stringify(strokes.current)) : localStorage.removeItem(draftKey) } catch {} }
  useEffect(() => { if (draftKey) try { const d = JSON.parse(localStorage.getItem(draftKey) || '[]'); if (d.length) { strokes.current = d; setHas(true) } } catch {}
    const fit = () => { const c = cv.current; if (!c) return; const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; c.width = r.width * d; c.height = r.height * d; redraw() }; fit(); const ro = new ResizeObserver(fit); ro.observe(cv.current); return () => ro.disconnect() }, [])
  const pt = e => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, Math.round(e.timeStamp)] }
  const eraseAt = p => { const n = strokes.current.filter(s => !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 18)); if (n.length !== strokes.current.length) { strokes.current = n; setHas(n.length > 0); redraw() } }
  const bind = {
    onPointerDown: e => { e.preventDefault(); try { cv.current.setPointerCapture(e.pointerId) } catch {} if (pen.erase) { cur.current.set(e.pointerId, 'erase'); return eraseAt(pt(e)) }
      const st = { pts: [pt(e)], c: pen.c, w: pen.w }; cur.current.set(e.pointerId, st); strokes.current.push(st); setHas(true); redraw() },
    onPointerMove: e => { const st = cur.current.get(e.pointerId); if (!st) return; if (st === 'erase') return eraseAt(pt(e)); (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(x => st.pts.push(pt(x))); redraw() },
    onPointerUp: e => { cur.current.delete(e.pointerId); keep() }, onPointerCancel: e => { cur.current.delete(e.pointerId); keep() },
  }
  const clear = () => { strokes.current = []; cur.current.clear(); setHas(false); redraw(); keep() }
  const undo = () => { strokes.current.pop(); setHas(strokes.current.length > 0); redraw(); keep() }
  // Picture of the ink on white. crop: trim to the writing; maxW: scale down so it stays small to store.
  const picture = ({ crop, maxW = 1400 } = {}) => { const all = strokes.current.flatMap(s => s.pts); if (!all.length) return ''
    const r = cv.current.getBoundingClientRect(); let x0 = 0, y0 = 0, w = r.width, h = r.height
    if (crop) { const xs = all.map(p => p[0]), ys = all.map(p => p[1]); x0 = Math.max(0, Math.min(...xs) - 14); y0 = Math.max(0, Math.min(...ys) - 14); w = Math.min(r.width, Math.max(...xs) + 14) - x0; h = Math.min(r.height, Math.max(...ys) + 14) - y0 }
    const k = Math.min(1.5, maxW / w), o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.lineCap = g.lineJoin = 'round'
    strokes.current.forEach(s => { g.strokeStyle = s.c; g.lineWidth = s.w * k; g.beginPath(); s.pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo']((p[0] - x0) * k, (p[1] - y0) * k)); if (s.pts.length === 1) g.lineTo((s.pts[0][0] - x0) * k + 0.1, (s.pts[0][1] - y0) * k); g.stroke() }); return o.toDataURL('image/png') }
  const Tools = () => <div className="row wrap tools" role="toolbar" aria-label="Pens">
    {COLORS.map((c, i) => <button type="button" key={c} className={'pen' + (!pen.erase && pen.c === c ? ' on' : '')} aria-pressed={!pen.erase && pen.c === c} aria-label={['Dark blue', 'Red', 'Blue', 'Green'][i] + ' pen'} style={{ background: c }} onClick={() => setPen({ ...pen, c, erase: false })} />)}
    {tools && [[4, 'Thin'], [6, 'Medium'], [10, 'Thick']].map(([w, l]) => <button type="button" key={w} className={'btn sm' + (pen.w === w && !pen.erase ? ' primary' : '')} aria-pressed={pen.w === w} onClick={() => setPen({ ...pen, w, erase: false })}>{l}</button>)}
    <button type="button" className={'btn sm' + (pen.erase ? ' primary' : '')} aria-pressed={pen.erase} onClick={() => setPen({ ...pen, erase: !pen.erase })}>Eraser</button>
    <button type="button" className="btn sm" disabled={!has} onClick={undo}>Undo</button><button type="button" className="btn sm" disabled={!has} onClick={clear}>Clear</button></div>
  return { cv, bind, strokes, has, clear, undo, picture, Tools }
}
// Reader with the one-time download question. Returns { run, ui } where run(pointsOfEachStroke) resolves to text or null.
export function useReader() {
  const [busy, setBusy] = useState(''), [prog, setProg] = useState(0), [ask, setAsk] = useState(null), [err, setErr] = useState('')
  const run = async (pts, allow) => { setErr(''); setAsk(null); setBusy('Reading the handwriting')
    try { const t = await readInk(pts, setProg, allow); setBusy(''); if (t === null) { return new Promise(res => setAsk(() => ok => { setAsk(null); ok ? run(pts, true).then(res) : res(null) })) } return t }
    catch { setBusy(''); setErr('The handwriting reader could not load (it needs internet the first time). Type instead, or keep the handwriting as it is.'); return null } }
  const ui = <>{busy && <p role="status">{busy}{prog > 0 && prog < 1 ? ` (downloading the reader: ${Math.round(prog * 100)}%)` : ''}</p>}
    {ask && <div className="subcard"><p>This device's browser has no built-in handwriting reader. CoLab Reef can download a free one once (about 64 MB). After that it works on this device without downloading again.</p>
      <div className="row wrap"><button type="button" className="btn primary" onClick={() => ask(true)}><Icon n="down" /> Download and read</button><button type="button" className="btn" onClick={() => ask(false)}>Not now</button></div></div>}
    {err && <p className="error" role="alert">{err}</p>}</>
  return { run, ui, busy: !!busy }
}
export const Ans = ({ d, big }) => d?.ink ? <img className={'inkans' + (big ? ' big' : '')} src={d.ink} alt="Handwritten answer" /> : <>{d?.text}</>

// Individual answer written by hand: turn it into text with the reader, or keep the handwriting as it is.
export function HandAnswer({ onText, onInk, onCancel, keepLabel = 'Use my handwriting as it is' }) {
  const ink = useInk(), rd = useReader()
  return <div className="hand"><p className="hint">Write with a finger or pen. Then turn it into typed text, or keep your handwriting.</p>
    <ink.Tools /><canvas ref={ink.cv} className="ink small" role="img" aria-label="Writing area. Use Back to typing if you cannot write here." {...ink.bind} />
    <div className="row wrap">
      <button type="button" className="btn primary" disabled={!ink.has || rd.busy} onClick={async () => { const t = await rd.run(ink.strokes.current.map(s => s.pts)); if (t) onText(t) }}><Icon n="eye" /> Turn into text</button>
      <button type="button" className="btn primary" disabled={!ink.has || rd.busy} onClick={() => onInk(ink.picture({ crop: true, maxW: 700 }))}><Icon n="lock" /> {keepLabel}</button>
      <button type="button" className="btn" onClick={onCancel}>Back to typing</button></div>{rd.ui}</div>
}

// Class whiteboard for the smartboard: many students write at once; save to the activity, as a picture or as a PDF.
export function ClassBoard({ title, prompt, draftKey, onSave, onClose }) {
  const dlg = useRef(), ink = useInk({ draftKey, tools: true }), rd = useReader(), [found, setFound] = useState(null), [msg, setMsg] = useState('')
  useEffect(() => { dlg.current.showModal() }, [])
  const name = 'CoLab-Reef-' + title.replace(/\W+/g, '-')
  const png = () => { const a = document.createElement('a'); a.href = ink.picture(); a.download = name + '.png'; a.click() }
  const pdf = () => { const w = window.open('', '_blank'); if (!w) return setMsg('Allow pop-ups for this site to save as PDF, or use "Save as picture".'); w.document.write(`<title>${name}</title><style>body{margin:24px;font-family:sans-serif}img{max-width:100%;border:1px solid #999}</style><h2>${title.replace(/[<>&]/g, '')}</h2><p>${(prompt || '').replace(/[<>&]/g, '')}</p><img src="${ink.picture()}" onload="print()">`); w.document.close() }
  const read = async () => { const gs = groupInk(ink.strokes.current), out = []; for (const g of gs) { const t = await rd.run(g.pts); if (t === null) return; out.push({ img: inkImage(g.pts), text: t }) } setFound(out) }
  const save = texts => { onSave({ png: ink.picture(), texts: texts || [], text: 'Class whiteboard' + (texts?.length ? ': ' + texts.join(' | ') : '') }); ink.clear(); setFound(null); setMsg('Saved to this activity. The board is clear for the next question.') }
  return <dialog ref={dlg} className="dlg pad board" onClose={onClose} aria-label="Class whiteboard">
    <div className="card-h"><h3>Class whiteboard: {title}</h3><button className="btn sm" onClick={onClose}><Icon n="x" /> Close</button></div>
    {prompt && <p className="q">{prompt}</p>}
    {found ? <div><p className="hint">Check the text against the handwriting and correct it if needed. Empty boxes are skipped.</p>
      <ul className="found">{found.map((f, i) => <li key={i}><img src={f.img} alt={'Handwriting ' + (i + 1)} /><input aria-label={'Text for handwriting ' + (i + 1)} value={f.text} onChange={e => setFound(found.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} /></li>)}</ul>
      <div className="row wrap"><button className="btn primary" onClick={() => save(found.map(f => f.text.trim()).filter(Boolean))}><Icon n="check" /> Save board and text to this activity</button><button className="btn" onClick={() => setFound(null)}>Back to the board</button></div></div>
    : <><p className="hint">Several students can write at the same time with fingers or board pens.</p><ink.Tools />
      <canvas ref={ink.cv} className="ink" role="img" aria-label="Class whiteboard writing area" {...ink.bind} />
      <div className="row wrap"><button className="btn primary" disabled={!ink.has} onClick={() => save()}><Icon n="check" /> Save to this activity</button>
        <button className="btn" disabled={!ink.has || rd.busy} onClick={read}><Icon n="eye" /> Read handwriting into text</button>
        <button className="btn" disabled={!ink.has} onClick={png}><Icon n="down" /> Save as picture</button><button className="btn" disabled={!ink.has} onClick={pdf}><Icon n="down" /> Save as PDF</button></div></>}
    {rd.ui}{msg && <p role="status" className="preview">{msg}</p>}
    <p className="hint">An unfinished board stays on this device until you clear or save it.</p></dialog>
}
