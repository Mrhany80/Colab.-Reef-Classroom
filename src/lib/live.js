import { useEffect, useRef, useState, useCallback } from 'react'
import { store } from './store.js'
import { MODULES } from '../modules/index.js'

// Live session: loads by join code, subscribes to changes, refetches on reconnect.
export function useLive(code) {
  const [s, setS] = useState({ ready: false, session: null, cls: null, entries: {} })
  const ref = useRef(s); ref.current = s
  const load = useCallback(async () => {
    try {
      const r = await store.lookup(code)
      if (!r) return setS(p => ({ ...p, ready: true, missing: true }))
      const list = await store.listEntries(r.session.id)
      setS(p => ({ ready: true, session: r.session, cls: r.cls, entries: { ...p.entries, ...Object.fromEntries(list.map(e => [e.id, e])) } }))
    } catch (e) { setS(p => ({ ...p, ready: true, error: e.message })) }
  }, [code])
  useEffect(() => { load() }, [load])
  const sid = s.session?.id
  useEffect(() => {
    if (!sid) return
    const un = store.subscribe(sid,
      row => setS(p => ({ ...p, session: row })),
      row => setS(p => ({ ...p, entries: { ...p.entries, [row.id]: row } })))
    const again = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', again); window.addEventListener('online', again)
    const iv = setInterval(load, 20000) // safety net if a realtime message is missed
    return () => { un(); document.removeEventListener('visibilitychange', again); window.removeEventListener('online', again); clearInterval(iv) }
  }, [sid, load])
  const put = useCallback(e => {
    setS(p => ({ ...p, entries: { ...p.entries, [e.id]: e } }))
    return store.putEntry(e).catch(err => alert('Could not save. Check your connection and try again.\n' + err.message))
  }, [])
  const patch = useCallback(o => {
    const cur = ref.current.session; const next = { ...cur, state: { ...cur.state, ...o } }
    ref.current = { ...ref.current, session: next }
    setS(p => ({ ...p, session: next }))
    return store.saveSession(next)
  }, [])
  return { ...s, entries: Object.values(s.entries), put, patch }
}

export const timeLeft = st => st.pausedLeft != null ? st.pausedLeft : st.endsAt ? Math.max(0, st.endsAt - Date.now()) : null
export const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
export const shuffle = (a, seed = Math.random() * 1e9) => a.map((v, i) => [hash(seed + ':' + i), v]).sort((x, y) => x[0] - y[0]).map(x => x[1])

// Grouping: random, or "by different answers" (deal answer buckets across groups so each group mixes views).
export function makeGroups(ids, spec, answerOf) {
  let order = shuffle(ids)
  if (answerOf) {
    const b = {}; order.forEach(i => { const a = answerOf(i) ?? '~'; (b[a] = b[a] || []).push(i) })
    const buckets = Object.values(b).sort((x, y) => y.length - x.length)
    const flat = buckets.flat()
    const n = Math.max(1, spec.count || Math.floor(flat.length / spec.size) || 1)
    const g = Array.from({ length: n }, () => []); flat.forEach((i, k) => g[k % n].push(i)); return g
  }
  const n = Math.max(1, spec.count ? Math.min(spec.count, order.length) : Math.floor(order.length / spec.size) || 1)
  const g = Array.from({ length: n }, () => [])
  if (spec.count) order.forEach((i, k) => g[k % n].push(i))
  else { order.forEach((i, k) => { if (k < n * spec.size) g[Math.floor(k / spec.size)].push(i); else g[(k - n * spec.size) % n].push(i) }) }
  return g
}

// Everything a module view needs, for one person (or the teacher / projector when me is null).
export function buildCtx(live, me, role = 'student') {
  const { session, cls, entries, put, patch } = live
  const st = session.state, step = st.step, item = session.playlist[step], mod = MODULES[item.type]
  const here = entries.filter(e => e.step === step && e.kind !== 'praise')
  const groups = st.groups?.[step] || []
  const gi = me ? groups.findIndex(g => g.includes(me.id)) : -1
  const x = st.x?.[step] || {}
  const base = `${session.id}|${step}|`
  const ctx = {
    live, session, cls, entries, st, step, item, mod, cfg: item.config, phase: mod.phases[st.phase], pi: st.phase,
    mode: session.mode, me, role, here, groups, gi, mates: gi >= 0 ? groups[gi].filter(i => i !== me.id) : [], x,
    name: id => cls.students.find(s => s.id === id)?.name || 'Someone',
    names: ids => ids.map(i => cls.students.find(s => s.id === i)?.name || 'Someone').join(', '),
    setX: o => patch({ x: { ...st.x, [step]: { ...(live.session.state.x?.[step] || {}), ...o } } }),
    onTime: () => st.pausedLeft != null || !st.endsAt || Date.now() <= st.endsAt,
    one: (kind, key) => here.find(e => e.id === base + kind + '|' + (key ?? me?.id)),
    all: kind => here.filter(e => e.kind === kind),
    save: (kind, data, key, sidOverride) => put({ id: base + kind + '|' + (key ?? me.id), session_id: session.id, class_id: session.class_id, student_id: sidOverride ?? me?.id ?? null, step, kind, data, at: Date.now() }),
    present: () => { const j = new Set(entries.filter(e => e.kind === 'join').map(e => e.student_id)); return session.mode === 'one' || !j.size ? cls.students.map(s => s.id) : cls.students.map(s => s.id).filter(i => j.has(i)) },
  }
  return ctx
}
