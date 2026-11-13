import React, { useState } from 'react'
import { Card, Note, Tag, By, AnswerBox, ChoiceBox, Room, useTurn, TurnGate, Bars, Wait, Icon, pct, Stems } from '../components/ui.jsx'
import { uid } from '../lib/store.js'
import { HandAnswer, Ans } from '../components/Ink.jsx'

const L = i => String.fromCharCode(65 + i)
export const Progress = ({ ctx, kind, label = 'answers locked' }) => { const n = new Set(ctx.all(kind).map(e => e.student_id)).size; const t = ctx.present().length
  return <div className="progress"><div className="progress-n">{n}<small> of {t}</small></div><div>{label}</div><div className="meter"><div style={{ width: pct(n, t) + '%' }} /></div></div> }

// Shared text written under the turn lock, tagged with its author.
export function GroupText({ ctx, kind, label, gi = ctx.gi, stems, k }) {
  const key = k || 'g' + gi, doc = ctx.one(kind, key), turn = useTurn(ctx, gi, kind + (k || ''))
  const [t, setT] = useState(doc?.data.ink ? '' : doc?.data.text || ''), [hand, setHand] = useState(false)
  return <Card title={label}>
    {doc ? <div className="locked"><p><Ans d={doc.data} /></p><div className="hint">Last written by <By ctx={ctx} id={doc.data.by} /></div></div> : <p className="hint">Nothing written yet.</p>}
    <TurnGate ctx={ctx} turn={turn} what="write for the group">
      <Stems stems={stems} onPick={s => setT(v => (v ? v + ' ' : '') + s.replace(/\.\.\./g, '').trim() + ' ')} />
      {hand ? <HandAnswer keepLabel="Save our handwriting and pass the turn" onCancel={() => setHand(false)} onText={x => { setT(v => (v ? v + ' ' : '') + x); setHand(false) }} onInk={png => { ctx.save(kind, { text: 'Handwritten answer', ink: png, by: ctx.me.id, gi }, key); setHand(false); turn.pass() }} />
        : <button type="button" className="btn sm" onClick={() => setHand(true)}><Icon n="edit" /> Write by hand</button>}
      <label className="sr" htmlFor={'gt-' + kind + key}>{label}</label>
      <textarea id={'gt-' + kind + key} rows={3} value={t} onChange={e => setT(e.target.value)} />
      <button type="button" className="btn primary" disabled={!t.trim()} onClick={() => { ctx.save(kind, { text: t.trim(), by: ctx.me.id, gi }, key); turn.pass() }}>Save and pass the turn</button>
    </TurnGate></Card>
}

/* ---------- 1. Think-Pair-Share ---------- */
const tpsRevised = ctx => { const f = ctx.all('final'); return { n: f.filter(e => (ctx.one('first', e.student_id)?.data.ink || ctx.one('first', e.student_id)?.data.text || '') !== (e.data.ink || e.data.text)).length, t: f.length } }
const tps = {
  name: 'Think-Pair-Share', family: 'Pair and small group', blurb: 'Private answer, pair talk, pair answer, teacher spotlight.',
  phases: [{ id: 'think', name: 'Think', secs: 120, proj: 'Think alone. Write and lock your own answer. No talking yet.' }, { id: 'pair', name: 'Pair', secs: 180, proj: 'Share your answer with your partner. Listen first, then compare.' },
    { id: 'agree', name: 'Pair answer', secs: 150, proj: 'Agree one pair answer. Then update your own answer if your thinking changed.' }, { id: 'share', name: 'Share', secs: 0, proj: 'Listen to the pairs in the spotlight.' }],
  group: { size: 2, phase: 'pair' }, revised: [['first', 'final']],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'question', label: 'Question', type: 'area' }, { k: 'stems', label: 'Sentence starters (one per line)', type: 'lines' }],
  Student({ ctx }) {
    const { cfg, phase } = ctx, first = ctx.one('first')
    const Q = <Card title="Question"><p className="q">{cfg.question}</p></Card>
    if (phase.id === 'think' || !first) return <>{Q}<AnswerBox ctx={ctx} kind="first" label="Your own answer" />{phase.id !== 'think' && <Note icon="lock">Lock your own answer first. Then you will see your partner's.</Note>}
      {phase.id === 'think' && first && <Note>Locked. Wait for the pair step.</Note>}</>
    const peers = ctx.mates.map(i => <div key={i} className="peer"><By ctx={ctx} id={i} />{ctx.one('first', i) ? <p><Ans d={ctx.one('first', i).data} /></p> : <p className="hint">Still thinking. Their answer appears when they lock it.</p>}</div>)
    if (phase.id === 'pair') return <>{Q}<AnswerBox ctx={ctx} kind="first" label="Your answer" /><Card title="Your partner's answer">{peers.length ? peers : <p className="hint">No partner yet.</p>}</Card>
      <Room ctx={ctx} roomId={'p' + ctx.gi} members={ctx.groups[ctx.gi] || []} stems={cfg.stems} /></>
    if (phase.id === 'agree') return <>{Q}<GroupText ctx={ctx} kind="pair" label="Our pair answer" stems={cfg.stems} />
      <AnswerBox ctx={ctx} kind="final" label="Your answer now" hint="Keep it or improve it after talking with your partner." prefill={first.data.ink ? '' : first.data.text} button="Lock my final answer" /></>
    const spot = ctx.x.spot === ctx.gi
    return <>{spot ? <Card tone="coral" title="Your pair is in the spotlight"><p>Be ready to explain your pair answer to the class.</p></Card> : <Wait>Look at the projector and listen to the pair in the spotlight.</Wait>}
      <Card title="Our pair answer"><p>{ctx.one('pair', 'g' + ctx.gi) ? <Ans d={ctx.one('pair', 'g' + ctx.gi).data} /> : 'No pair answer was saved.'}</p></Card></>
  },
  Teacher({ ctx }) {
    const r = tpsRevised(ctx)
    return <Card title="Pairs" right={<Tag>{pct(r.n, r.t)}% revised their answer ({r.n} of {r.t})</Tag>}>
      {!ctx.groups.length && <p className="hint">Pairs are made when the Pair step starts.</p>}
      <ul className="list">{ctx.groups.map((g, i) => { const d = ctx.one('pair', 'g' + i); return <li key={i}><div><b>{ctx.names(g)}</b><p>{d ? <Ans d={d.data} /> : <span className="hint">No pair answer yet</span>}</p></div>
        <button className={'btn sm' + (ctx.x.spot === i ? ' primary' : '')} onClick={() => ctx.setX({ spot: ctx.x.spot === i ? null : i })}><Icon n="star" /> {ctx.x.spot === i ? 'In spotlight' : 'Spotlight'}</button></li> })}</ul></Card>
  },
  Projector({ ctx }) {
    const r = tpsRevised(ctx), sp = ctx.x.spot
    return <><p className="q big">{ctx.cfg.question}</p>
      {ctx.phase.id === 'think' && <Progress ctx={ctx} kind="first" />}
      {ctx.phase.id === 'agree' && <Progress ctx={ctx} kind="final" label="final answers locked" />}
      {ctx.phase.id === 'share' && <><div className="stat"><b>{pct(r.n, r.t)}%</b> of students revised their answer after pair talk</div>
        {sp != null && ctx.groups[sp] && <Card tone="coral" title={'Spotlight: ' + ctx.names(ctx.groups[sp])}><p className="q">{ctx.one('pair', 'g' + sp) ? <Ans big d={ctx.one('pair', 'g' + sp).data} /> : 'This pair will explain their answer aloud.'}</p></Card>}</>}</>
  },
}

/* ---------- 9. Hinge Question with re-vote ---------- */
export function MindShift({ ctx, names }) {
  const o = ctx.cfg.options, v1 = ctx.all('v1'), v2 = ctx.all('v2')
  const c2 = sid => v2.find(e => e.student_id === sid)?.data.choice
  const changed = v1.filter(e => c2(e.student_id) != null && c2(e.student_id) !== e.data.choice)
  const toRight = changed.filter(e => o[c2(e.student_id)]?.correct).length, away = changed.filter(e => o[e.data.choice]?.correct).length
  return <div><Bars legend={v2.length ? ['Vote 1', 'Vote 2'] : null} rows={o.map((x, i) => ({ label: `${L(i)}. ${x.text}`, mark: x.correct ? 'Correct' : null, v: v2.length ? v2.filter(e => e.data.choice === i).length : v1.filter(e => e.data.choice === i).length, v0: v2.length ? v1.filter(e => e.data.choice === i).length : undefined }))} />
    {v2.length > 0 && <p className="stat"><b>{changed.length}</b> changed their answer: <b>{toRight}</b> moved to the correct answer, <b>{away}</b> moved away from it.</p>}
    {names && <table className="data"><thead><tr><th>Option</th><th>Misconception</th><th>Vote 1</th><th>Vote 2</th></tr></thead><tbody>{o.map((x, i) => <tr key={i}><th>{L(i)}{x.correct && ' (correct)'}</th><td>{x.correct ? 'Secure understanding' : x.misconception}</td>
      <td>{ctx.names(v1.filter(e => e.data.choice === i).map(e => e.student_id))}</td><td>{ctx.names(v2.filter(e => e.data.choice === i).map(e => e.student_id))}</td></tr>)}</tbody></table>}</div>
}
const hinge = {
  name: 'Hinge Question with re-vote', family: 'Formative checks', blurb: 'One diagnostic question, hidden vote, teacher decision, re-vote, Mind-Shift Replay.',
  phases: [{ id: 'v1', name: 'Vote 1', secs: 90, proj: 'Vote on your own. Your vote is hidden.' }, { id: 'decide', name: 'Teacher decision', secs: 0, proj: 'Votes are in. Your teacher is choosing the next step.' },
    { id: 'talk', name: 'Talk or reteach', secs: 150, proj: 'Convince your partner with evidence, or follow the explanation.' }, { id: 'v2', name: 'Vote 2', secs: 60, proj: 'Vote again. It is fine to keep or change your answer.' }, { id: 'replay', name: 'Mind-Shift Replay', secs: 0, proj: 'How did our thinking move?' }],
  group: { size: 2, phase: 'talk', by: 'v1' }, revised: [['v1', 'v2']],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'question', label: 'Question', type: 'area' },
    { k: 'options', label: 'Answer options', type: 'list', item: [{ k: 'text', label: 'Option' }, { k: 'correct', label: 'This is the correct answer', type: 'check' }, { k: 'misconception', label: 'Misconception this wrong option reveals', type: 'area' }] },
    { k: 'reteach', label: 'Reteach note (teacher only)', type: 'area' }],
  Student({ ctx }) {
    const { cfg, phase, x } = ctx, opts = cfg.options.map(o => o.text), v1 = ctx.one('v1')
    const Q = <Card title="Question"><p className="q">{cfg.question}</p></Card>
    if (phase.id === 'v1' || !v1) return <>{Q}<ChoiceBox ctx={ctx} kind="v1" label="Your answer" options={opts} /></>
    if (phase.id === 'decide') return <>{Q}<Wait>Your vote is locked. Your teacher is looking at the class's answers.</Wait></>
    if (phase.id === 'talk') return x.decision === 'pair' ? <>{Q}<ChoiceBox ctx={ctx} kind="v1" label="Your first vote" options={opts} />
      <Card title="Your partner voted">{ctx.mates.map(i => <p key={i}><By ctx={ctx} id={i} /> {ctx.one('v1', i) ? `${L(ctx.one('v1', i).data.choice)}. ${opts[ctx.one('v1', i).data.choice]}` : 'has not voted'}</p>)}<p className="hint">Explain your reasoning. Try to convince each other with evidence, not volume.</p></Card>
      <Room ctx={ctx} roomId={'h' + ctx.gi} members={ctx.groups[ctx.gi] || []} stems={['I chose ... because ...', 'What makes you sure about ...?', 'I am changing my mind because ...']} /></>
      : <>{Q}<Wait>Watch your teacher's explanation. You will vote again next.</Wait></>
    if (phase.id === 'v2') return <>{Q}<ChoiceBox ctx={ctx} kind="v2" label="Your second vote" options={opts} /></>
    const v2 = ctx.one('v2'), right = cfg.options.findIndex(o => o.correct), last = (v2 || v1).data.choice
    return <>{Q}<Card title="Your thinking"><p>Vote 1: <b>{L(v1.data.choice)}</b>{v2 && <> <Icon n="arrow" /> Vote 2: <b>{L(v2.data.choice)}</b></>}</p>
      <p>The accepted answer is <b>{L(right)}. {opts[right]}</b></p>{last !== right && <p className="hint">Idea to rethink: {cfg.options[last].misconception}</p>}</Card></>
  },
  Teacher({ ctx }) {
    const o = ctx.cfg.options, v1 = ctx.all('v1'), ok = pct(v1.filter(e => o[e.data.choice]?.correct).length, v1.length)
    const talk = ctx.mod.phases.findIndex(p => p.id === 'talk'), rep = ctx.mod.phases.length - 1
    const rec = ok >= 80 ? 'move' : ok >= 50 ? 'pair' : 'reteach'
    const B = (id, label, to) => <button className={'btn' + (rec === id ? ' primary' : '')} onClick={() => ctx.go(to, { decision: id })}>{label}{rec === id && ' (suggested)'}</button>
    return <Card title="Votes and misconceptions" right={<Tag>{ok}% correct on vote 1</Tag>}><MindShift ctx={ctx} names />
      {ctx.phase.id === 'decide' && <div className="decide"><p><b>Choose the next step.</b> 80% or more correct: move on. 50 to 80%: pair students who disagree and re-vote. Under 50%: reteach.</p>
        <div className="row wrap">{B('move', 'Move on', rep)}{B('pair', 'Pair and re-vote', talk)}{B('reteach', 'Reteach', talk)}</div></div>}
      {ctx.x.decision === 'reteach' && <Note>Reteach note: {ctx.cfg.reteach}</Note>}</Card>
  },
  Projector({ ctx }) {
    const id = ctx.phase.id
    return <><p className="q big">{ctx.cfg.question}</p><ol className="opts" type="A">{ctx.cfg.options.map((o, i) => <li key={i}>{o.text}</li>)}</ol>
      {id === 'v1' && <Progress ctx={ctx} kind="v1" label="votes locked" />}{id === 'v2' && <Progress ctx={ctx} kind="v2" label="second votes locked" />}
      {id === 'replay' && <Card title="Mind-Shift Replay"><MindShift ctx={ctx} /></Card>}</>
  },
}

/* ---------- 3. Four Corners ---------- */
export const CORNERS = ['Strongly agree', 'Agree', 'Disagree', 'Strongly disagree']
const moved = ctx => ctx.all('p2').filter(e => ctx.one('p1', e.student_id) && ctx.one('p1', e.student_id).data.choice !== e.data.choice)
const corners = {
  name: 'Four Corners', family: 'Discussion and argument', blurb: 'Take a position with a reason, discuss, place again, see who moved.',
  phases: [{ id: 'p1', name: 'First placement', secs: 120, proj: 'Choose your corner on your own and give a reason.' }, { id: 'talk', name: 'Discuss', secs: 300, proj: 'Meet your corner. Agree your strongest reason, then listen to another corner.' },
    { id: 'p2', name: 'Second placement', secs: 90, proj: 'Place yourself again. Moving is a sign of strong thinking.' }, { id: 'res', name: 'Who moved', secs: 0, proj: 'How did the class move?' }],
  revised: [['p1', 'p2']],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'statement', label: 'Statement to take a position on', type: 'area' }, { k: 'stems', label: 'Sentence starters (one per line)', type: 'lines' }],
  Student({ ctx }) {
    const { cfg, phase } = ctx, p1 = ctx.one('p1')
    const S = <Card title="Statement"><p className="q">{cfg.statement}</p></Card>
    if (phase.id === 'p1' || !p1) return <>{S}<ChoiceBox ctx={ctx} kind="p1" label="Where do you stand?" options={CORNERS} reason="Your reason" /></>
    if (phase.id === 'talk') { const same = ctx.all('p1').filter(e => e.data.choice === p1.data.choice)
      return <>{S}<Card tone="coral" title={(ctx.mode === 'online' ? 'Your corner: ' : 'Go to the corner: ') + CORNERS[p1.data.choice]}>
        <ul className="list">{same.map(e => <li key={e.id}><div><By ctx={ctx} id={e.student_id} /><p>{e.data.text}</p></div></li>)}</ul></Card>
        <Room ctx={ctx} roomId={'c' + p1.data.choice} members={same.map(e => e.student_id)} stems={cfg.stems} what="corner group" /></> }
    if (phase.id === 'p2') return <>{S}<p className="hint">Your first placement: {CORNERS[p1.data.choice]}</p><ChoiceBox ctx={ctx} kind="p2" label="Where do you stand now?" options={CORNERS} reason="What kept you there or moved you?" /></>
    const p2 = ctx.one('p2')
    return <>{S}<Card title="Your position"><p>{CORNERS[p1.data.choice]}{p2 && <> <Icon n="arrow" /> <b>{CORNERS[p2.data.choice]}</b></>}</p>{p2 && <p>{p2.data.text}</p>}</Card></>
  },
  Teacher({ ctx }) { const m = moved(ctx)
    return <Card title="Who moved" right={<Tag>{m.length} moved</Tag>}>{!m.length && <p className="hint">Movement appears after the second placement.</p>}
      <ul className="list">{m.map(e => <li key={e.id}><div><b>{ctx.name(e.student_id)}</b>: {CORNERS[ctx.one('p1', e.student_id).data.choice]} <Icon n="arrow" /> {CORNERS[e.data.choice]}<p>{e.data.text}</p></div></li>)}</ul></Card> },
  Projector({ ctx }) { const a = ctx.all('p1'), b = ctx.all('p2'), id = ctx.phase.id
    return <><p className="q big">{ctx.cfg.statement}</p>
      {id === 'p1' && <Progress ctx={ctx} kind="p1" label="placements locked" />}{id === 'p2' && <Progress ctx={ctx} kind="p2" label="second placements locked" />}
      {(id === 'talk' || id === 'res') && <Bars legend={b.length ? ['First', 'Second'] : null} rows={CORNERS.map((c, i) => ({ label: c, v: (b.length ? b : a).filter(e => e.data.choice === i).length, v0: b.length ? a.filter(e => e.data.choice === i).length : undefined }))} />}
      {id === 'res' && <div className="stat"><b>{moved(ctx).length}</b> students moved after discussion</div>}</> },
}

/* ---------- 7. See-Think-Wonder ---------- */
export const OnionCells = () => <svg viewBox="0 0 640 300" className="figure" role="img" aria-label="Diagram of red onion cells. Left panel: cells in distilled water, purple contents fill each cell. Right panel: cells in salt solution, purple contents have shrunk away from the cell walls.">
  <rect width="640" height="300" fill="#f7f1e3" />
  {[0, 1].map(p => <g key={p} transform={`translate(${p * 320 + 14},14)`}>
    {[0, 1, 2].map(r => [0, 1, 2].map(c => { const x = c * 98 + (r % 2) * 20 - 10, y = r * 88; return <g key={r + '' + c}>
      <rect x={x} y={y} width="94" height="84" rx="6" fill="#fffaf0" stroke="#5b4a3a" strokeWidth="3" />
      {p === 0 ? <rect x={x + 5} y={y + 5} width="84" height="74" rx="5" fill="#a03a78" opacity=".85" /> : <path d={`M${x + 22} ${y + 26} q26 -14 50 2 q12 20 -4 34 q-26 12 -48 -4 q-10 -18 2 -32z`} fill="#7a2459" />}
      <circle cx={x + (p ? 44 : 30)} cy={y + (p ? 42 : 30)} r="6" fill="#3a1030" /></g> }))}
    <rect x="-6" y="262" width="300" height="24" fill="#f7f1e3" /><text x="0" y="280" fontSize="15" fontFamily="Manrope, sans-serif" fill="#1b2a41">{p ? 'After 5 minutes in 10% salt solution' : 'In distilled water'}</text></g>)}
</svg>
export const Figure = ({ cfg }) => <figure>{cfg.image ? <img className="figure" src={cfg.image} alt={cfg.caption || 'Image for this activity'} /> : <OnionCells />}{cfg.caption && <figcaption>{cfg.caption}</figcaption>}</figure>
const wonders = ctx => ctx.all('wonder').flatMap(e => e.data.ink ? [{ id: e.student_id + ':0', text: '', ink: e.data.ink, by: e.student_id, at: e.at }] : e.data.text.split('\n').map(t => t.trim()).filter(Boolean).map((t, i) => ({ id: e.student_id + ':' + i, text: t, by: e.student_id, at: e.at })))
const sortW = (ctx, list) => { const pins = ctx.x.pins || []; const s = ctx.x.sort || 'new'
  return [...list].sort((a, b) => (pins.includes(b.id) - pins.includes(a.id)) || (s === 'az' ? a.text.localeCompare(b.text) : s === 'name' ? ctx.name(a.by).localeCompare(ctx.name(b.by)) : b.at - a.at)) }
const STW = [['see', 'I see ...', 'Write only what you can observe. No explanations yet.'], ['think', 'I think ...', 'What do you think is going on? What makes you say that?'], ['wonder', 'I wonder ...', 'Write your questions, one per line. They go to the class Question Board.']]
const stw = {
  name: 'See-Think-Wonder', family: 'Visible thinking', blurb: 'Observe, interpret, question. Wonders collect into a class Question Board.',
  phases: [{ id: 'see', name: 'See', secs: 90, proj: 'Look closely. Write only what you can see.' }, { id: 'think', name: 'Think', secs: 120, proj: 'What do you think is happening? What makes you say that?' },
    { id: 'wonder', name: 'Wonder', secs: 120, proj: 'What questions does this raise for you?' }, { id: 'board', name: 'Question Board', secs: 0, proj: 'Our questions' }],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'image', label: 'Image (leave empty to use the onion cell diagram)', type: 'image' }, { k: 'caption', label: 'Caption', type: 'area' }],
  Student({ ctx }) {
    const todo = STW.slice(0, Math.min(ctx.pi, 2) + 1).find(([k]) => !ctx.one(k)), done = STW.filter(([k]) => ctx.one(k))
    return <><Figure cfg={ctx.cfg} />
      {todo && <AnswerBox key={todo[0]} ctx={ctx} kind={todo[0]} label={todo[1]} hint={todo[2]} />}
      {done.length > 0 && <div className="cols3">{done.map(([k, l]) => <div key={k} className="locked"><div className="lbl"><Icon n="lock" /> {l}</div><p style={{ whiteSpace: 'pre-line' }}><Ans d={ctx.one(k).data} /></p></div>)}</div>}
      {!todo && ctx.phase.id !== 'board' && <Note>Locked. Wait for the next step.</Note>}
      {ctx.phase.id === 'board' && (ctx.one('wonder') ? <Card title="Class Question Board"><ul className="list">{sortW(ctx, wonders(ctx)).map(w => <li key={w.id}><div>{(ctx.x.pins || []).includes(w.id) && <Tag tone="ok">Pinned</Tag>} <Ans d={w} /> <By ctx={ctx} id={w.by} /></div></li>)}</ul></Card>
        : <Note icon="lock">Lock your own wonder to see the class Question Board.</Note>)}</>
  },
  Teacher({ ctx }) { const pins = ctx.x.pins || []
    return <Card title="Question Board" right={<label className="inline">Sort <select value={ctx.x.sort || 'new'} onChange={e => ctx.setX({ sort: e.target.value })}><option value="new">Newest first</option><option value="az">A to Z</option><option value="name">By student</option></select></label>}>
      {!wonders(ctx).length && <p className="hint">Wonder questions appear here as students lock them.</p>}
      <ul className="list">{sortW(ctx, wonders(ctx)).map(w => <li key={w.id}><div><Ans d={w} /> <By ctx={ctx} id={w.by} /></div>
        <button className={'btn sm' + (pins.includes(w.id) ? ' primary' : '')} aria-pressed={pins.includes(w.id)} onClick={() => ctx.setX({ pins: pins.includes(w.id) ? pins.filter(p => p !== w.id) : [...pins, w.id] })}><Icon n="pin" /> {pins.includes(w.id) ? 'Pinned' : 'Pin'}</button></li>)}</ul></Card> },
  Projector({ ctx }) { const id = ctx.phase.id
    return id === 'board' ? <Card title="Question Board"><ul className="list big">{sortW(ctx, wonders(ctx)).map(w => <li key={w.id}><div>{(ctx.x.pins || []).includes(w.id) && <Tag tone="ok">Pinned</Tag>} <Ans d={w} /></div></li>)}</ul></Card>
      : <><Figure cfg={ctx.cfg} /><Progress ctx={ctx} kind={id} label={`"${id}" notes locked`} /></> },
}

/* ---------- 8. KWL ---------- */
const KW = [['k', 'Know', 'What do you already know?'], ['w', 'Want to know', 'What do you want to find out? Write it as a question.'], ['l', 'Learned', 'What have you learned?']]
const ticked = ctx => new Set([...(ctx.x.ticks || []), ...ctx.all('l').map(e => e.data.answers).filter(Boolean)])
const ClassChart = ({ ctx, upto, names, tick }) => { const tk = ticked(ctx)
  return <div className="cols3">{KW.slice(0, upto).map(([k, l]) => <div key={k} className="col"><h4>{l}</h4><ul className="list">{ctx.all(k).sort((a, b) => a.at - b.at).map(e => <li key={e.id}><div>
    {k === 'w' && (tick ? <label className="inline"><input type="checkbox" checked={tk.has(e.id)} onChange={() => tick(e.id)} /> <span className="sr">Answered</span></label> : tk.has(e.id) && <Tag tone="ok"><Icon n="check" s={12} /> Answered</Tag>)} {e.data.text}
    {k === 'l' && e.data.answers && <span className="hint"> (answers: {ctx.here.find(w => w.id === e.data.answers)?.data.text})</span>} {names && <By ctx={ctx} id={e.student_id} />}</div></li>)}</ul></div>)}</div> }
const kwl = {
  name: 'KWL Chart', family: 'Visible thinking', blurb: 'Know, Want to know, Learned. Questions are ticked off when answered.',
  phases: [{ id: 'k', name: 'Know', secs: 150, proj: 'What do you already know? Add your own ideas first.' }, { id: 'w', name: 'Want to know', secs: 150, proj: 'What do you want to find out? Write questions.' },
    { id: 'l', name: 'Learned', secs: 240, proj: 'What have you learned? Link it to a question it answers.' }, { id: 'rev', name: 'Class chart', secs: 0, proj: 'Our class chart' }],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'prompt', label: 'Focus question', type: 'area' }],
  Student({ ctx }) {
    const [t, setT] = useState(''), [ans, setAns] = useState('')
    const cur = KW[Math.min(ctx.pi, 2)], mine = k => ctx.all(k).filter(e => e.student_id === ctx.me.id), ws = ctx.all('w')
    return <><Card title={ctx.cfg.topic}><p className="q">{ctx.cfg.prompt}</p></Card>
      {ctx.phase.id !== 'rev' && <form className="field" onSubmit={e => { e.preventDefault(); if (!t.trim()) return; const w = ws.find(x => x.id === ans)
        ctx.save(cur[0], { text: t.trim(), onTime: ctx.onTime(), ...(w ? { answers: w.id, buildsOn: w.student_id } : {}) }, uid()); setT(''); setAns('') }}>
        <label htmlFor="kwl-t">{cur[1]}: {cur[2]}</label><div className="row"><input id="kwl-t" value={t} onChange={e => setT(e.target.value)} autoComplete="off" /><button className="btn primary" disabled={!t.trim()}><Icon n="plus" /> Add</button></div>
        {cur[0] === 'l' && <><label htmlFor="kwl-a">Does this answer a class question?</label><select id="kwl-a" value={ans} onChange={e => setAns(e.target.value)}><option value="">No, it is a new point</option>{ws.map(w => <option key={w.id} value={w.id}>{w.data.text}</option>)}</select></>}
      </form>}
      <Card title="My chart"><div className="cols3">{KW.map(([k, l]) => <div key={k} className="col"><h4>{l}</h4><ul className="list">{mine(k).map(e => <li key={e.id}><div>{e.data.text}</div></li>)}</ul>{!mine(k).length && <p className="hint">Nothing yet</p>}</div>)}</div></Card>
      {ctx.pi > 0 && <Card title="Class chart"><ClassChart ctx={ctx} upto={ctx.phase.id === 'rev' ? 3 : ctx.pi} names /><p className="hint">A column joins the class chart when its step ends.</p></Card>}</>
  },
  Teacher({ ctx }) { const tk = ctx.x.ticks || []
    return <Card title="Class chart" right={<Tag>{ticked(ctx).size} of {ctx.all('w').length} questions answered</Tag>}><ClassChart ctx={ctx} upto={3} names tick={id => ctx.setX({ ticks: tk.includes(id) ? tk.filter(x => x !== id) : [...tk, id] })} /></Card> },
  Projector({ ctx }) { return <><p className="q big">{ctx.cfg.prompt}</p>{ctx.pi === 0 ? <Progress ctx={ctx} kind="k" label="students have added what they know" /> : <ClassChart ctx={ctx} upto={ctx.phase.id === 'rev' ? 3 : ctx.pi} />}</> },
}

/* ---------- 10. 3-2-1 Exit Ticket ---------- */
const exitItems = ctx => ctx.all('exit').flatMap(e => [...e.data.learned.map(x => ({ ...x, type: 'Learned', by: e.student_id })), { ...e.data.question, type: 'Question', by: e.student_id }])
const exit = {
  name: '3-2-1 Exit Ticket', family: 'Formative checks', blurb: '3 things learned, 2 interesting, 1 question, grouped by subtopic.',
  phases: [{ id: 'write', name: 'Write', secs: 300, proj: 'Write 3 things you learned, 2 things you found interesting and 1 question.' }, { id: 'rev', name: 'Review', secs: 0, proj: 'What we learned, and what we still ask' }],
  fields: [{ k: 'topic', label: 'Lesson topic' }, { k: 'subtopics', label: 'Lesson subtopics (one per line)', type: 'lines' }],
  Student({ ctx }) {
    const mine = ctx.one('exit'), subs = ctx.cfg.subtopics
    const [f, setF] = useState({ l: ['', '', ''], lt: [subs[0], subs[0], subs[0]], i: ['', ''], q: '', qt: subs[0] })
    if (mine) return <Card title="Your exit ticket is locked"><p className="hint">3 things I learned</p><ul>{mine.data.learned.map((x, i) => <li key={i}>{x.text} <Tag>{x.topic}</Tag></li>)}</ul>
      <p className="hint">2 things I found interesting</p><ul>{mine.data.interesting.map((x, i) => <li key={i}>{x}</li>)}</ul><p className="hint">1 question I still have</p><p>{mine.data.question.text} <Tag>{mine.data.question.topic}</Tag></p></Card>
    const up = (k, i, v) => setF(p => ({ ...p, [k]: i == null ? v : p[k].map((x, j) => j === i ? v : x) }))
    const ok = f.l.every(x => x.trim()) && f.i.every(x => x.trim()) && f.q.trim()
    const Sel = ({ k, i, id }) => <select aria-label="Subtopic" id={id} value={i == null ? f[k] : f[k][i]} onChange={e => up(k, i, e.target.value)}>{subs.map(s => <option key={s}>{s}</option>)}</select>
    return <form className="field" onSubmit={e => { e.preventDefault(); ok && ctx.save('exit', { learned: f.l.map((t, i) => ({ text: t.trim(), topic: f.lt[i] })), interesting: f.i.map(x => x.trim()), question: { text: f.q.trim(), topic: f.qt }, onTime: ctx.onTime() }) }}>
      <fieldset><legend>3 things I learned</legend>{f.l.map((v, i) => <div className="row" key={i}><input aria-label={'Learned ' + (i + 1)} value={v} onChange={e => up('l', i, e.target.value)} />{Sel({ k: 'lt', i })}</div>)}</fieldset>
      <fieldset><legend>2 things I found interesting</legend>{f.i.map((v, i) => <input key={i} aria-label={'Interesting ' + (i + 1)} value={v} onChange={e => up('i', i, e.target.value)} />)}</fieldset>
      <fieldset><legend>1 question I still have</legend><div className="row"><input aria-label="My question" value={f.q} onChange={e => up('q', null, e.target.value)} />{Sel({ k: 'qt' })}</div></fieldset>
      <button className="btn primary" disabled={!ok}><Icon n="lock" /> Hand in my ticket</button>{!ok && <p className="hint">Fill in all six boxes to hand in.</p>}</form>
  },
  Teacher({ ctx }) { const items = exitItems(ctx)
    return <Card title="Responses by subtopic">{ctx.cfg.subtopics.map(s => { const it = items.filter(x => x.topic === s); return <div key={s} className="col"><h4>{s} <Tag>{it.filter(x => x.type === 'Question').length} questions</Tag></h4>
      <ul className="list">{it.map((x, i) => <li key={i}><div><Tag tone={x.type === 'Question' ? 'q' : ''}>{x.type}</Tag> {x.text} <By ctx={ctx} id={x.by} /></div></li>)}</ul>{!it.length && <p className="hint">No responses yet</p>}</div> })}</Card> },
  Projector({ ctx }) { const items = exitItems(ctx)
    return ctx.phase.id === 'write' ? <Progress ctx={ctx} kind="exit" label="tickets handed in" /> : <><Bars legend={['Things learned', 'Questions']} rows={ctx.cfg.subtopics.map(s => ({ label: s, v0: items.filter(x => x.topic === s && x.type === 'Learned').length, v: items.filter(x => x.topic === s && x.type === 'Question').length }))} />
      <Card title="Questions we still have"><ul className="list big">{items.filter(x => x.type === 'Question').map((x, i) => <li key={i}><div><Tag>{x.topic}</Tag> {x.text}</div></li>)}</ul></Card></> },
}

export default { tps, hinge, corners, stw, kwl, exit }
