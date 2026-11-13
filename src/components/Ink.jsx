import React, { useEffect, useRef, useState } from 'react'
import { Icon } from './ui.jsx'
import { COLORS, readInk, groupInk, inkImage } from './NamePad.jsx'
import { uid } from '../lib/store.js'

// Shared handwriting surface: every finger or pen gets its own stroke, so several people can write at once.
export const GRIDS = { 1: [1, 1], 2: [2, 1], 3: [3, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2] }
// Divider lines and a label for each writing area, drawn under the ink (and included in saved pictures).
function drawGrid(g, w, h, n, labels, k = 1) { if (n < 2) return; const [c, r] = GRIDS[n]; g.save(); g.strokeStyle = '#5b6b80'; g.lineWidth = 3 * k; g.setLineDash([10 * k, 8 * k]); g.beginPath()
  for (let i = 1; i < c; i++) { g.moveTo(w * i / c, 0); g.lineTo(w * i / c, h) } for (let j = 1; j < r; j++) { g.moveTo(0, h * j / r); g.lineTo(w, h * j / r) } g.stroke(); g.setLineDash([])
  g.font = `700 ${Math.round(15 * k)}px Manrope, sans-serif`; g.textBaseline = 'top'
  for (let i = 0; i < n; i++) { const x = (i % c) * w / c + 8 * k, y = Math.floor(i / c) * h / r + 6 * k, t = labels[i] || String(i + 1), tw = Math.min(g.measureText(t).width, w / c - 24 * k); g.fillStyle = '#12304f'; g.fillRect(x, y, tw + 14 * k, 24 * k); g.fillStyle = '#fff'; g.fillText(t, x + 7 * k, y + 5 * k, w / c - 24 * k) } g.restore() }
export const areaOf = (pt, w, h, n) => { const [c, r] = GRIDS[n]; return Math.min(r - 1, Math.floor(pt[1] / (h / r))) * c + Math.min(c - 1, Math.floor(pt[0] / (w / c))) }

const imgs = new Map()
const wrap = (t, n) => { const out = []; let l = ''; t.split(/\s+/).forEach(w => { if ((l + ' ' + w).trim().length > n && l) { out.push(l); l = w } else l = (l + ' ' + w).trim() }); if (l) out.push(l); return out }
// Typed text wraps inside its area (or the board), breaking very long words, so it never runs into the next area.
const meas = document.createElement('canvas').getContext('2d')
export function wrapW(t, size, mw) { meas.font = `600 ${size}px Manrope, sans-serif`; const W = x => meas.measureText(x).width, out = []; let l = ''
  const push = w => { if (!l) l = w; else if (W(l + ' ' + w) <= mw) l += ' ' + w; else { out.push(l); l = w } }
  t.split(/\s+/).filter(Boolean).forEach(w => { while (W(w) > mw && w.length > 1) { let n = w.length; while (n > 1 && W(w.slice(0, n)) > mw) n--; if (l) { out.push(l); l = '' } out.push(w.slice(0, n)); w = w.slice(n) } push(w) }); if (l) out.push(l); return out.length ? out : [''] }
const linesOf = it => wrapW(it.s, it.size, it.mw || 4000)
const boxOf = it => it.t === 'img' ? [it.x, it.y, it.w, it.h] : it.note ? [it.x, it.y, 200, 40 + wrap(it.s, 18).length * 24] : [it.x, it.y - 4, Math.min(it.mw || 4000, Math.max(40, it.s.length * it.size * 0.58)), linesOf(it).length * it.size * 1.3 + 6]
const inBox = (it, p) => { const [x, y, w, h] = boxOf(it); return p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h }
// Draws every item: photos, typed text, sticky notes, pen and highlighter strokes, lines and arrows.
function paint(g, items, k, x0, y0, again) {
  const X = v => (v - x0) * k, Y = v => (v - y0) * k; g.lineCap = g.lineJoin = 'round'
  items.filter(it => it.t === 'img').forEach(it => { let im = imgs.get(it.src); if (!im) { im = new Image(); im.onload = again; im.src = it.src; imgs.set(it.src, im) } if (im.complete && im.naturalWidth) g.drawImage(im, X(it.x), Y(it.y), it.w * k, it.h * k) })
  items.filter(it => it.t !== 'img').forEach(it => {
    if (it.t === 'text') { g.textBaseline = 'top'
      if (it.note) { const ls = wrap(it.s, 18); g.fillStyle = '#fff3a6'; g.fillRect(X(it.x), Y(it.y), 200 * k, (40 + ls.length * 24) * k); g.fillStyle = '#e6d36b'; g.fillRect(X(it.x), Y(it.y), 200 * k, 8 * k); g.fillStyle = '#14263d'; g.font = `600 ${18 * k}px Manrope, sans-serif`; ls.forEach((l, i) => g.fillText(l, X(it.x + 12), Y(it.y + 22 + i * 24))) }
      else { g.save(); if (it.bottom) { g.beginPath(); g.rect(X(it.x) - 2, Y(it.top) - 2, it.mw * k + 4, (it.bottom - it.top) * k + 4); g.clip() } g.fillStyle = it.c; g.font = `600 ${it.size * k}px Manrope, sans-serif`; linesOf(it).forEach((l, i) => g.fillText(l, X(it.x), Y(it.y + i * it.size * 1.3))); g.restore() } return }
    g.globalAlpha = it.a || 1; g.strokeStyle = it.c; g.lineWidth = it.w * k; g.beginPath(); it.pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](X(p[0]), Y(p[1]))); if (it.pts.length === 1) g.lineTo(X(it.pts[0][0]) + 0.1, Y(it.pts[0][1])); g.stroke()
    if (it.kind === 'arrow' && it.pts.length > 1) { const [p, q] = [it.pts[0], it.pts[it.pts.length - 1]], an = Math.atan2(q[1] - p[1], q[0] - p[0]), L = (10 + it.w * 2) * k; g.beginPath(); [-0.45, 0.45].forEach(d => { g.moveTo(X(q[0]), Y(q[1])); g.lineTo(X(q[0]) - L * Math.cos(an + d), Y(q[1]) - L * Math.sin(an + d)) }); g.stroke() }
    g.globalAlpha = 1 })
}
function drawBg(g, w, h, kind, k = 1) { if (!kind || kind === 'plain') return; g.save(); g.strokeStyle = '#d6e0ea'; g.lineWidth = 1 * k; g.beginPath(); const step = (kind === 'grid' ? 40 : 56) * k
  for (let y = step; y < h; y += step) { g.moveTo(0, y); g.lineTo(w, y) } if (kind === 'grid') for (let x = step; x < w; x += step) { g.moveTo(x, 0); g.lineTo(x, h) } g.stroke(); g.restore() }
export const strokesOf = items => items.filter(it => it.pts && !it.kind && !it.a)

export function useInk({ draftKey, tools, split = 1, labels = [] } = {}) {
  const cv = useRef(), strokes = useRef([]), cur = useRef(new Map()), grid = useRef({ split, labels }); grid.current = { split, labels }
  const [has, setHas] = useState(false), [pen, setPen] = useState({ c: COLORS[0], w: tools ? 6 : 4, tool: 'pen' }), [bg, setBg] = useState('plain'), [edit, setEdit] = useState(null), [sel, setSel] = useState(null)
  const bgRef = useRef(bg); bgRef.current = bg
  const redraw = () => { const c = cv.current; if (!c) return; const g = c.getContext('2d'), d = window.devicePixelRatio || 1; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, c.width, c.height); drawBg(g, c.width / d, c.height / d, bgRef.current); drawGrid(g, c.width / d, c.height / d, grid.current.split, grid.current.labels); paint(g, strokes.current, 1, 0, 0, redraw) }
  useEffect(() => { redraw() }, [split, labels.join('|'), bg])
  const keep = () => { if (draftKey) try { strokes.current.length ? localStorage.setItem(draftKey, JSON.stringify(strokes.current)) : localStorage.removeItem(draftKey) } catch {} }
  const touch = () => { setHas(strokes.current.length > 0); redraw(); keep() }
  useEffect(() => { if (draftKey) try { const ok = i => i && (Array.isArray(i.pts) ? i.pts.length > 0 && i.pts.every(p => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1])) : i.t === 'text' ? typeof i.s === 'string' && isFinite(i.x) && isFinite(i.y) && i.size > 0 : i.t === 'img' ? typeof i.src === 'string' && i.w > 0 && i.h > 0 : false)
      const d = JSON.parse(localStorage.getItem(draftKey) || '[]').filter(ok); if (d.length) { strokes.current = d; setHas(true) } } catch { try { localStorage.removeItem(draftKey) } catch {} }
    const fit = () => { const c = cv.current; if (!c) return; const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1; c.width = r.width * d; c.height = r.height * d; redraw() }; fit(); const ro = new ResizeObserver(fit); ro.observe(cv.current); return () => ro.disconnect() }, [])
  const pt = e => { const r = cv.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, Math.round(e.timeStamp)] }
  const eraseAt = p => { const n = strokes.current.filter(s => s.pts ? !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 18) : !inBox(s, p)); if (n.length !== strokes.current.length) { strokes.current = n; setHas(n.length > 0); redraw() } }
  const bind = {
    onPointerDown: e => { e.preventDefault(); const p = pt(e), T = pen.tool
      if (T === 'text' || T === 'note') return setEdit({ x: p[0], y: p[1], note: T === 'note', s: '' })
      try { cv.current.setPointerCapture(e.pointerId) } catch {}
      if (T === 'erase') { cur.current.set(e.pointerId, 'erase'); return eraseAt(p) }
      if (T === 'move') { const it = [...strokes.current].reverse().find(i => !i.pts && inBox(i, p)); setSel(it || null); if (it) cur.current.set(e.pointerId, { move: it, dx: p[0] - it.x, dy: p[1] - it.y }); return }
      const st = { pts: [p], c: pen.c, w: T === 'hl' ? 22 : pen.w, ...(T === 'hl' ? { a: 0.35 } : {}), ...(T === 'line' || T === 'arrow' ? { kind: T } : {}) }; cur.current.set(e.pointerId, st); strokes.current.push(st); setHas(true); redraw() },
    onPointerMove: e => { const st = cur.current.get(e.pointerId); if (!st) return; if (st === 'erase') return eraseAt(pt(e))
      if (st.move) { const p = pt(e); st.move.x = p[0] - st.dx; st.move.y = p[1] - st.dy; return redraw() }
      if (st.kind) st.pts[1] = pt(e); else (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(x => st.pts.push(pt(x))); redraw() },
    onPointerUp: e => { const st = cur.current.get(e.pointerId); if (st && st.move && st.move.t === 'text') { Object.assign(st.move, fitText(st.move.x, st.move.y, st.move.note)); settle(st.move); redraw() } cur.current.delete(e.pointerId); keep() }, onPointerCancel: e => { cur.current.delete(e.pointerId); keep() },
  }
  const clear = () => { strokes.current = []; cur.current.clear(); setSel(null); touch() }
  const undo = () => { strokes.current.pop(); setSel(null); touch() }
  // Where a typed text may go: the area it was tapped in. It starts at least 200px from that area's right edge.
  const fitText = (x, y, note) => { const r = cv.current.getBoundingClientRect(), [c, rw] = GRIDS[grid.current.split], aw = r.width / c, ah = r.height / rw, ax = Math.min(c - 1, Math.floor(x / aw)) * aw, ay = Math.min(rw - 1, Math.floor(y / ah)) * ah
    const need = Math.min(note ? 204 : 200, aw - 16), nx = Math.max(ax + 8, Math.min(x, ax + aw - 8 - need)), top = ay + (grid.current.split > 1 ? 34 : 4); return { x: nx, y: Math.max(top, Math.min(y, ay + ah - 40)), mw: ax + aw - 8 - nx, top, bottom: ay + ah - 6, left: ax + 8, full: aw - 16 } }
  // Keep a text clear of other texts in its area and, where it fits, above the area's bottom edge.
  const settle = it => { const hit = o => { const a = boxOf(it), b = boxOf(o); return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3] }, others = strokes.current.filter(o => o !== it && o.t === 'text')
    for (let n = 0; n < 12; n++) { const o = others.find(hit); if (!o) break; const b = boxOf(o); it.y = b[1] + b[3] + 10 }
    const over = () => it.y + boxOf(it)[3] > it.bottom
    if (!it.note && over()) { const size = it.size; while (over() && it.size > 16) it.size -= 2 // shrink long text until it fits its area
      if (over()) { it.size = size; it.x = it.left; it.mw = it.full; for (let n = 0; n < 12; n++) { const o = others.find(hit); if (!o) break; const b = boxOf(o); it.y = b[1] + b[3] + 10 } while (over() && it.size > 14) it.size -= 2 } } // still too long: use the full width of the area
    const h = boxOf(it)[3]; if (it.y + h > it.bottom) { const up = Math.max(it.top, it.bottom - h); if (!others.some(o => { const y0 = it.y; it.y = up; const r = hit(o); it.y = y0; return r })) it.y = up } return it }
  const commit = () => { if (edit && edit.s.trim()) { const f = fitText(edit.x, edit.y, edit.note), it = { t: 'text', ...f, s: edit.s.trim(), c: pen.c, size: pen.w >= 10 ? 34 : pen.w >= 6 ? 26 : 20, note: edit.note }; strokes.current.push(settle(it)) } setEdit(null); touch() }
  const addPhoto = file => { if (!file) return; const im = new Image(); im.onload = () => { const k = Math.min(1, 1000 / im.width), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
    const r = cv.current.getBoundingClientRect(), w = Math.min(r.width * 0.45, c.width), it = { t: 'img', src: c.toDataURL('image/jpeg', 0.8), x: 30 + (strokes.current.filter(i => i.t === 'img').length % 4) * 40, y: 40, w, h: w * c.height / c.width }; strokes.current.push(it); setSel(it); setPen(p => ({ ...p, tool: 'move' })); touch() }; im.src = URL.createObjectURL(file) }
  const scale = f => { if (!sel) return; if (sel.t === 'img') { sel.w *= f; sel.h *= f } else if (!sel.note) sel.size = Math.max(14, Math.min(90, sel.size * f)); touch() }
  // Picture of the board on white. crop: trim to the writing; maxW: scale down so it stays small to store.
  const picture = ({ crop, maxW = 1400 } = {}) => { if (!strokes.current.length) return ''
    const r = cv.current.getBoundingClientRect(); let x0 = 0, y0 = 0, w = r.width, h = r.height
    if (crop) { const all = strokes.current.flatMap(s => s.pts || (b => [[b[0], b[1]], [b[0] + b[2], b[1] + b[3]]])(boxOf(s))), xs = all.map(p => p[0]), ys = all.map(p => p[1]); x0 = Math.max(0, Math.min(...xs) - 14); y0 = Math.max(0, Math.min(...ys) - 14); w = Math.min(r.width, Math.max(...xs) + 14) - x0; h = Math.min(r.height, Math.max(...ys) + 14) - y0 }
    const k = Math.min(1.5, maxW / w), o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); if (!crop) { drawBg(g, o.width, o.height, bgRef.current, k); drawGrid(g, o.width, o.height, grid.current.split, grid.current.labels, k) }
    paint(g, strokes.current, k, x0, y0, () => {}); return o.toDataURL(strokes.current.some(i => i.t === 'img') ? 'image/jpeg' : 'image/png', 0.85) }
  const tool = (k, l, ic) => <button type="button" key={k} className={'btn sm' + (pen.tool === k ? ' primary' : '')} aria-pressed={pen.tool === k} onClick={() => setPen({ ...pen, tool: k })}>{ic && <Icon n={ic} s={14} />} {l}</button>
  const Tools = () => <div className="row wrap tools" role="toolbar" aria-label="Board tools">
    {COLORS.map((c, i) => <button type="button" key={c} className={'pen' + (pen.c === c ? ' on' : '')} aria-pressed={pen.c === c} aria-label={['Dark blue', 'Red', 'Blue', 'Green'][i] + ' colour'} style={{ background: c }} onClick={() => setPen({ ...pen, c, tool: ['erase', 'move'].includes(pen.tool) ? 'pen' : pen.tool })} />)}
    {tools && [[4, 'Thin'], [6, 'Medium'], [10, 'Thick']].map(([w, l]) => <button type="button" key={w} className={'btn sm' + (pen.w === w ? ' primary' : '')} aria-pressed={pen.w === w} onClick={() => setPen({ ...pen, w })}>{l}</button>)}
    {tool('pen', 'Pen', 'edit')}{tools && <>{tool('hl', 'Highlighter')}{tool('text', 'Text')}{tool('note', 'Sticky note')}{tool('line', 'Line')}{tool('arrow', 'Arrow', 'arrow')}{tool('move', 'Move')}</>}{tool('erase', 'Eraser')}
    {tools && <><label className="btn sm"><Icon n="plus" s={14} /> Photo<input type="file" accept="image/*" className="sr" onChange={e => { addPhoto(e.target.files[0]); e.target.value = '' }} /></label>
      <label className="inline">Background <select value={bg} onChange={e => setBg(e.target.value)}><option value="plain">Plain</option><option value="grid">Grid</option><option value="lines">Lines</option></select></label>
      {sel && !sel.note && <><button type="button" className="btn sm" onClick={() => scale(1.2)}>Bigger</button><button type="button" className="btn sm" onClick={() => scale(1 / 1.2)}>Smaller</button></>}</>}
    <button type="button" className="btn sm" disabled={!has} onClick={undo}>Undo</button><button type="button" className="btn sm" disabled={!has} onClick={clear}>Clear</button></div>
  // Typing box that appears where the board was tapped with the Text or Sticky note tool.
  const editor = edit && <form className="ink-edit" style={{ left: Math.max(0, Math.min(edit.x, (cv.current?.getBoundingClientRect().width || 600) - 420)), top: Math.max(0, edit.y) }} onSubmit={e => { e.preventDefault(); commit() }}>
    <label className="sr" htmlFor="ink-t">{edit.note ? 'Sticky note text' : 'Text'}</label><input id="ink-t" autoFocus value={edit.s} placeholder={edit.note ? 'Sticky note' : 'Type here'} onChange={e => setEdit({ ...edit, s: e.target.value })} onKeyDown={e => e.key === 'Escape' && setEdit(null)} />
    <button className="btn sm primary">Add</button><button type="button" className="btn sm" onClick={() => setEdit(null)}>Cancel</button></form>
  const size = () => { const r = cv.current.getBoundingClientRect(); return [r.width, r.height] }
  return { cv, bind, strokes, has, clear, undo, picture, Tools, size, editor }
}
// Voice recording, up to 90 seconds, kept as a small audio clip.
export function useRecorder(max = 90) {
  const [state, setState] = useState('idle'), [secs, setSecs] = useState(0), [audio, setAudio] = useState(''), [err, setErr] = useState(''), rec = useRef(), tick = useRef()
  const stop = () => { clearInterval(tick.current); try { rec.current?.state !== 'inactive' && rec.current.stop() } catch {} }
  const start = async () => { setErr(''); try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), chunks = [], r = new MediaRecorder(stream, { audioBitsPerSecond: 24000 }); rec.current = r
    r.ondataavailable = e => e.data.size && chunks.push(e.data); r.onstop = () => { stream.getTracks().forEach(t => t.stop()); const fr = new FileReader(); fr.onload = () => { setAudio(fr.result); setState('idle') }; fr.readAsDataURL(new Blob(chunks, { type: r.mimeType })) }
    r.start(); setSecs(0); setState('rec'); tick.current = setInterval(() => setSecs(v => { if (v + 1 >= max) stop(); return v + 1 }), 1000) } catch { setErr('The microphone could not be used. Allow microphone access for this site and try again.') } }
  useEffect(() => stop, [])
  const ui = <span className="rec">{state === 'rec' ? <button type="button" className="btn sm primary" onClick={stop}><span className="rec-dot" /> Stop recording ({secs}s of {max}s)</button> : <button type="button" className="btn sm" onClick={start}><Icon n="play" s={14} /> {audio ? 'Record again' : 'Record audio'}</button>}
    {audio && state !== 'rec' && <><audio controls src={audio} aria-label="Recorded audio" /><button type="button" className="btn sm" onClick={() => setAudio('')}>Remove audio</button></>}{err && <span className="error" role="alert">{err}</span>}</span>
  return { audio, ui, reset: () => setAudio(''), recording: state === 'rec' }
}
// Save as PDF without leaving the page: a hidden frame is printed (choose "Save as PDF" in the print window).
export function printPicture(name, title, prompt, src) { const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(f)
  const safe = t => String(t || '').replace(/[<>&]/g, ''), d = f.contentDocument; d.open(); d.write(`<title>${safe(name)}</title><style>body{margin:24px;font-family:sans-serif}img{max-width:100%;border:1px solid #999}</style><h2>${safe(title)}</h2><p>${safe(prompt)}</p><img src="${src}">`); d.close()
  const im = d.querySelector('img'), go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000) }; im.complete ? go() : (im.onload = go) }
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
export const Ans = ({ d, big }) => <>{d?.ink ? <img className={'inkans' + (big ? ' big' : '')} src={d.ink} alt="Handwritten answer" /> : d?.text}{d?.photo && <img className={'inkans' + (big ? ' big' : '')} src={d.photo} alt="Photo added to the answer" />}{d?.audio && <audio controls src={d.audio} aria-label="Recorded answer" />}</>

// Individual answer written by hand: turn it into text with the reader, or keep the handwriting as it is.
export function HandAnswer({ onText, onInk, onCancel, keepLabel = 'Use my handwriting as it is' }) {
  const ink = useInk(), rd = useReader()
  return <div className="hand"><p className="hint">Write with a finger or pen. Then turn it into typed text, or keep your handwriting.</p>
    <ink.Tools /><canvas ref={ink.cv} className="ink small" role="img" aria-label="Writing area. Use Back to typing if you cannot write here." {...ink.bind} />
    <div className="row wrap">
      <button type="button" className="btn primary" disabled={!ink.has || rd.busy} onClick={async () => { const t = await rd.run(strokesOf(ink.strokes.current).map(s => s.pts)); if (t) onText(t) }}><Icon n="eye" /> Turn into text</button>
      <button type="button" className="btn primary" disabled={!ink.has || rd.busy} onClick={() => onInk(ink.picture({ crop: true, maxW: 700 }))}><Icon n="lock" /> {keepLabel}</button>
      <button type="button" className="btn" onClick={onCancel}>Back to typing</button></div>{rd.ui}</div>
}

// Class whiteboard for the smartboard: many students write at once; save to the activity, as a picture or as a PDF.
export function ClassBoard({ title, prompt, draftKey, groups = [], onSave, onClose }) {
  const [split, setSplit] = useState(() => { const n = Number(localStorage.getItem(draftKey + ':split')); return GRIDS[n] ? n : 1 }), [named, setNamed] = useState(groups.length > 0)
  const labels = Array.from({ length: split }, (_, i) => named && groups[i] ? groups[i] : `Area ${i + 1}`)
  const dlg = useRef(), ink = useInk({ draftKey, tools: true, split, labels }), rd = useReader(), mic = useRecorder(), [found, setFound] = useState(null), [msg, setMsg] = useState(''), snap = useRef('')
  const divide = n => { setSplit(n); try { localStorage.setItem(draftKey + ':split', n) } catch {} }
  useEffect(() => { dlg.current.showModal() }, [])
  const name = 'CoLab-Reef-' + title.replace(/\W+/g, '-')
  const png = () => { const a = document.createElement('a'); a.href = ink.picture(); a.download = name + '.png'; a.click() }
  const pdf = () => printPicture(name, title, prompt, ink.picture())
  // Divided board: each area is read as one answer and keeps its label. Undivided: each separate piece of writing is read.
  const read = async () => { const [w, h] = ink.size(), out = []
    const hand = strokesOf(ink.strokes.current), typed = ink.strokes.current.filter(i => i.t === 'text'), at = i => it => areaOf(it.pts ? it.pts[0] : [it.x, it.y], w, h, split) === i
    if (!hand.length && !typed.length) return setMsg('There is no handwriting or text on the board to read.')
    const gs = split > 1 ? labels.map((l, i) => ({ l, pts: hand.filter(at(i)).map(s => s.pts), typed: typed.filter(at(i)).map(x => x.s) })).filter(g => g.pts.length || g.typed.length) : [...groupInk(hand).map(g => ({ l: '', pts: g.pts, typed: [] })), ...typed.map(x => ({ l: '', pts: [], typed: [x.s] }))]
    for (const g of gs) { const t = g.pts.length ? await rd.run(g.pts) : ''; if (t === null) return; out.push({ img: g.pts.length ? inkImage(g.pts) : '', text: [...g.typed, t].filter(Boolean).join(' '), l: g.l }) } snap.current = ink.picture(); setFound(out) }
  const save = texts => { onSave({ png: found ? snap.current : ink.picture(), audio: mic.audio || undefined, texts: texts || [], text: 'Class whiteboard' + (texts?.length ? ': ' + texts.join(' | ') : '') }); ink.clear(); mic.reset(); setFound(null); setMsg('Saved to this activity. The board is clear for the next question.') }
  return <dialog ref={dlg} className="dlg pad board" onClose={onClose} aria-label="Class whiteboard">
    <div className="card-h"><h3>Class whiteboard: {title}</h3><button className="btn sm" onClick={onClose}><Icon n="x" /> Close</button></div>
    {prompt && <p className="q">{prompt}</p>}
    {found ? <div><p className="hint">Check the text against the handwriting and correct it if needed. Empty boxes are skipped.</p>
      <ul className="found">{found.map((f, i) => <li key={i}>{f.l && <b>{f.l}</b>}{f.img && <img src={f.img} alt={'Handwriting ' + (f.l || i + 1)} />}<input aria-label={'Text for ' + (f.l || 'handwriting ' + (i + 1))} value={f.text} onChange={e => setFound(found.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} /></li>)}</ul>
      <div className="row wrap"><button className="btn primary" onClick={() => save(found.filter(f => f.text.trim()).map(f => (f.l ? f.l + ': ' : '') + f.text.trim()))}><Icon n="check" /> Save board and text to this activity</button><button className="btn" onClick={() => setFound(null)}>Back to the board</button></div></div>
    : <><p className="hint">Several students can write at the same time with fingers or board pens, or tap with the Text tool to type. Add photos, sticky notes and a voice recording. Divide the board to give each student or group their own area.</p>
      <div className="row wrap tools" role="group" aria-label="Divide the board"><b>Divide into</b>{[1, 2, 3, 4, 6, 8].map(n => <button type="button" key={n} className={'btn sm' + (split === n ? ' primary' : '')} aria-pressed={split === n} onClick={() => divide(n)}>{n === 1 ? 'One board' : n + ' areas'}</button>)}
        {groups.length > 0 && split > 1 && <label className="inline"><input type="checkbox" checked={named} onChange={e => setNamed(e.target.checked)} /> Label areas with the groups</label>}</div>
      <ink.Tools />
      <div className="inkwrap"><canvas ref={ink.cv} className="ink" role="img" aria-label="Class whiteboard writing area" {...ink.bind} />{ink.editor}</div>
      <div className="row wrap"><button className="btn primary" disabled={!ink.has} onClick={() => save()}><Icon n="check" /> Save to this activity</button>
        <button className="btn" disabled={!ink.has || rd.busy} onClick={read}><Icon n="eye" /> Read handwriting into text</button>{mic.ui}
        <button className="btn" disabled={!ink.has} onClick={png}><Icon n="down" /> Save as picture</button><button className="btn" disabled={!ink.has} onClick={pdf}><Icon n="down" /> Save as PDF</button></div></>}
    {rd.ui}{msg && <p role="status" className="preview">{msg}</p>}
    <p className="hint">An unfinished board stays on this device until you clear or save it.</p></dialog>
}
