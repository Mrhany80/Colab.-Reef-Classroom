// Praise Engine. Operant conditioning: reinforce the behaviour, immediately and specifically.
// Every sentence = [Name] + [exact behaviour] + [its effect]. Ability is never praised.
import { MODULES } from '../modules/index.js'
import { hash } from './live.js'

export const BEHAVIOURS = {
  think_time: { label: 'Answered within think time', make: v => `${v.n}, you locked in your own answer during think time. That gives your partner a real idea to work with.` },
  revised: { label: 'Revised after peer talk', make: v => `${v.n}, you changed your answer after hearing ${v.peer ? v.peer + "'s" : "your classmates'"} reasoning. That is how scientists think.` },
  cited_data: { label: 'Cited data as evidence', make: v => `${v.n}, you linked your evidence to a specific row of the data. That lets anyone check your group's claim.` },
  built_on: { label: "Built on a peer's idea", make: v => `${v.n}, you built on ${v.peer}'s idea instead of starting a new one. That moved your group's thinking further.` },
  helpful: { label: 'Gave a helpful Question or Suggestion', make: v => `${v.n}, your ${v.tag.toLowerCase()} was marked helpful by the group that received it. It gave them a clear next step.` },
  called_correct: { label: 'Answered correctly for the team when called', make: v => `${v.n}, you answered correctly for your team when your number was called. Your team could rely on you because you joined the discussion.` },
  valid_link: { label: 'Added a valid labelled link', make: v => `${v.n}, you added the link "${v.link}" to your group map. That shows everyone how two ideas connect.` },
  first: { label: 'First contribution of the session', make: v => `${v.n}, you shared your first idea of this session. Your class now has one more view to think with.` },
  custom: { label: 'Teacher praise', make: v => v.text },
}
export const ABILITY_WORDS = /\b(smart|clever|genius|gifted|talented|brilliant|bright|intelligent|natural)\b/i
export const customSentence = (n, behaviour, effect) => `${n}, you ${behaviour.trim().replace(/^you\s+/i, '').replace(/[.!]+$/, '')}. ${effect.trim().replace(/[.!]*$/, '.')}`

const val = e => e ? (e.data.choice ?? (e.data.ink || e.data.photo || e.data.audio || (e.data.text || '').trim().toLowerCase())) : undefined

// Scan the session's entries for target behaviours. Returns one trigger per behaviour event.
export function detect(session, cls, entries) {
  const nm = id => cls.students.find(s => s.id === id)?.name
  const out = [], seen = new Set()
  const add = (key, sid, behaviour, step, v = {}) => { if (!sid || !nm(sid) || seen.has(key)) return; seen.add(key); out.push({ key, sid, behaviour, step, text: BEHAVIOURS[behaviour].make({ n: nm(sid), ...v }) }) }
  const sorted = [...entries].sort((a, b) => a.at - b.at)
  const firstDone = new Set()
  const byId = Object.fromEntries(entries.map(e => [e.id, e]))
  for (const e of sorted) {
    if (e.kind === 'praise' || e.kind === 'join' || e.kind === 'turn') continue
    const s = e.student_id, d = e.data || {}
    if (e.kind === 'part' && !d.on) continue
    const mate = () => { const g = (session.state.groups?.[e.step] || []).find(g => g.includes(s)); const m = g?.find(i => i !== s); return m ? nm(m) : null }
    if (s && !firstDone.has(s)) { firstDone.add(s); add('first|' + s, s, 'first', e.step) }
    if (d.onTime) add(`tt|${e.step}|${s}`, s, 'think_time', e.step)
    if (e.kind === 'msg' && d.reply && d.reply.by !== s) add('bo|' + e.id, s, 'built_on', e.step, { peer: nm(d.reply.by) })
    if (d.buildsOn && d.buildsOn !== s) add('bo|' + e.id, s, 'built_on', e.step, { peer: nm(d.buildsOn) })
    if (e.kind === 'helpful' && d.author && d.tag !== 'Praise') add('hp|' + e.id, d.author, 'helpful', e.step, { tag: d.tag })
    if (e.kind === 'called' && d.correct) add('cc|' + e.id, s, 'called_correct', e.step)
    if (e.kind === 'link' && d.valid) add('vl|' + e.id, s, 'valid_link', e.step, { link: `${d.from} ${d.phrase} ${d.to}` })
    if (e.kind === 'cer') (d.evidence || []).forEach(ev => ev.row != null && add(`cd|${e.step}|${ev.by}`, ev.by, 'cited_data', e.step))
    const pairs = MODULES[session.playlist[e.step]?.type]?.revised || []
    for (const [a, b] of pairs) if (e.kind === b) {
      const before = byId[e.id.replace('|' + b + '|', '|' + a + '|')]
      if (before && val(before) !== val(e)) add(`rv|${e.step}|${s}`, s, 'revised', e.step, { peer: mate() })
    }
  }
  return out
}

// Schedule: continuous for the class's first N sessions, then variable ratio averaging 1 in R.
export function autoDeliver(session, cls, key) {
  const { continuous = 3, ratio = 3 } = cls.settings || {}
  if ((session.state.classIndex ?? 0) < continuous) return true
  return ratio <= 1 || hash(session.id + key) % ratio === 0
}
export const praiseEntry = (session, t, by) => ({ id: `${session.id}|praise|${t.key}`, session_id: session.id, class_id: session.class_id, student_id: t.sid, step: t.step ?? session.state.step, kind: 'praise', data: { behaviour: t.behaviour, text: t.text, by }, at: Date.now() })
