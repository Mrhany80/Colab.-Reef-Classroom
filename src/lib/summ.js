export const KIND = { first: 'First answer', final: 'Final answer', pair: 'Pair answer', v1: 'Vote 1', v2: 'Vote 2', p1: 'First placement', p2: 'Second placement', see: 'See', think: 'Think', wonder: 'Wonder', k: 'Know', w: 'Want to know', l: 'Learned', exit: 'Exit ticket',
  notes: 'Expert notes', summary: 'Home-group row', quiz: 'Quiz', rating: 'Peer rating', card: 'Board card', comment: 'Comment', reply: 'Reply', stn: 'Station note', tick: 'Checklist tick', n1: 'Private answer', team: 'Team answer', called: 'Called answer', node: 'Map concept', link: 'Map link', cer: 'Group argument', part: 'Took part', msg: 'Message' }
const HIDE = new Set(['turn', 'helpful', 'join', 'praise'])
const L = i => String.fromCharCode(65 + i)
export const counts = e => !HIDE.has(e.kind) && !(e.kind === 'part' && !e.data.on) && !(e.kind === 'tick' && !e.data.done)
export function summ(e) { const d = e.data
  if (d.choice != null) return L(d.choice) + (d.text ? ': ' + d.text : '')
  if (e.kind === 'quiz') return d.score + ' correct'
  if (e.kind === 'exit') return [...d.learned.map(x => x.text), ...d.interesting, 'Q: ' + d.question.text].join(' | ')
  if (e.kind === 'rating') return `Claim ${d.c}, Evidence ${d.e}, Reasoning ${d.r}` + (d.text ? ': ' + d.text : '')
  if (e.kind === 'comment') return d.tag + ': ' + d.text
  if (e.kind === 'tick') return 'Item ' + (d.ii + 1) + ' at station ' + (d.si + 1)
  if (e.kind === 'part') return 'Recorded by teacher'
  return d.text || '' }
