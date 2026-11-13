import React from 'react'
import { Icon } from './ui.jsx'
// Schema-driven editor for a module's content.
function Field({ f, v, on, id }) {
  if (f.type === 'area') return <textarea id={id} rows={3} value={v || ''} onChange={e => on(e.target.value)} />
  if (f.type === 'lines') return <textarea id={id} rows={4} value={(v || []).join('\n')} onChange={e => on(e.target.value.split('\n'))} onBlur={e => on(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
  if (f.type === 'num') return <input id={id} type="number" min="1" value={v ?? ''} onChange={e => on(Number(e.target.value))} />
  if (f.type === 'check') return <input id={id} type="checkbox" checked={!!v} onChange={e => on(e.target.checked)} />
  if (f.type === 'image') return <div className="row wrap">{v && <img src={v} alt="Uploaded preview" style={{ maxHeight: 80 }} />}
    <input id={id} type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (!file) return; const img = new Image(); img.onload = () => { const k = Math.min(1, 1100 / img.width), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); on(c.toDataURL('image/jpeg', 0.8)) }; img.src = URL.createObjectURL(file) }} />
    {v && <button type="button" className="btn sm" onClick={() => on('')}>Remove image</button>}</div>
  return <input id={id} value={v || ''} onChange={e => on(e.target.value)} />
}
export function ConfigForm({ fields, value, onChange, pre = 'f' }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return <div className="form">{fields.map(f => { const id = pre + '-' + f.k
    if (f.type === 'list') { const arr = value[f.k] || []
      return <fieldset key={f.k}><legend>{f.label}</legend>{arr.map((it, i) => <div key={i} className="subcard"><div className="card-h"><b>{i + 1}</b>
        <button type="button" className="btn sm" disabled={arr.length <= (f.min || 1)} onClick={() => set(f.k, arr.filter((_, j) => j !== i))}><Icon n="trash" /> Remove</button></div>
        <ConfigForm fields={f.item} value={it} pre={id + i} onChange={nv => set(f.k, arr.map((x, j) => j === i ? nv : x))} /></div>)}
        <button type="button" className="btn sm" disabled={f.max && arr.length >= f.max} onClick={() => set(f.k, [...arr, Object.fromEntries(f.item.map(x => [x.k, x.type === 'lines' ? [] : x.type === 'num' ? 1 : x.type === 'check' ? false : '']))])}><Icon n="plus" /> Add</button></fieldset> }
    return <div key={f.k} className={f.type === 'check' ? 'inline' : ''}><label htmlFor={id}>{f.label}</label><Field f={f} v={value[f.k]} on={v => set(f.k, v)} id={id} /></div> })}</div>
}
