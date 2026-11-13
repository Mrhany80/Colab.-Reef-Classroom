import React, { useState } from 'react'
import { Card, Note, Tag, By, AnswerBox, ChoiceBox, Room, useTurn, TurnGate, Bars, Wait, Icon, pct, Stems, DataTable, parseTable } from '../components/ui.jsx'
import { Progress } from './a.jsx'
import { uid } from '../lib/store.js'

const L = i => String.fromCharCode(65 + i)
const avg = a => a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0
const gOf = (ctx, sid) => ctx.groups.findIndex(g => g.includes(sid))

/* ---------- 2. Jigsaw ---------- */
const topicOf = (ctx, sid) => { const g = ctx.groups[gOf(ctx, sid)]; return g ? g.indexOf(sid) % ctx.cfg.topics.length : -1 }
const experts = (ctx, t) => ctx.groups.flat().filter(i => topicOf(ctx, i) === t)
const jigsaw = {
  name: 'Jigsaw', family: 'Pair and small group', blurb: 'Expert groups, home-group teaching, then an individual quiz on every topic.',
  phases: [{ id: 'expert', name: 'Expert groups', secs: 420, proj: 'Meet your expert group. Read your topic and complete your notes.' }, { id: 'home', name: 'Home groups', secs: 480, proj: 'Return to your home group. Teach your topic. Everyone fills one row.' },
    { id: 'quiz', name: 'Individual quiz', secs: 240, proj: 'Quiz on all topics. Work alone.' }, { id: 'res', name: 'Results', secs: 0, proj: 'How well did we teach each other?' }],
  group: { size: cfg => cfg.topics.length, phase: 'expert' },
  projGroups: ctx => ctx.phase.id === 'expert' ? ctx.cfg.topics.map((t, i) => ({ label: 'Experts: ' + t.title, ids: experts(ctx, i) })) : ctx.phase.id === 'home' ? ctx.groups.map((g, i) => ({ label: 'Home group ' + (i + 1), ids: g })) : [],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'topics', label: 'Expert topics', type: 'list', item: [{ k: 'title', label: 'Title' }, { k: 'text', label: 'Reading', type: 'area' }, { k: 'prompts', label: 'Notes template prompts (one per line)', type: 'lines' }, { k: 'q', label: 'Quiz question' }, { k: 'options', label: 'Quiz options (one per line)', type: 'lines' }, { k: 'answer', label: 'Correct option number', type: 'num' }] }],
  Student({ ctx }) {
    const T = ctx.cfg.topics, ti = topicOf(ctx, ctx.me.id), my = T[ti], notes = ctx.one('notes'), sum = ctx.one('summary')
    const [a, setA] = useState(notes?.data.answers || []), [s, setS] = useState(sum?.data.text || ''), [qz, setQz] = useState({})
    if (!my) return <Note icon="users">You will get a topic as soon as your teacher adds you to a group.</Note>
    if (ctx.phase.id === 'expert') return <><Card tone="coral" title={'Your expert topic: ' + my.title}><p>{my.text}</p></Card>
      <form className="field" onSubmit={e => { e.preventDefault(); ctx.save('notes', { answers: a, topic: ti, text: a.filter(Boolean).join(' / ') }) }}><h3>Expert notes</h3>
        {my.prompts.map((p, i) => <div key={i}><label htmlFor={'n' + i}>{p}</label><textarea id={'n' + i} rows={2} value={a[i] || ''} onChange={e => setA(v => { const n = [...v]; n[i] = e.target.value; return n })} /></div>)}
        <button className="btn primary">{notes ? 'Update my notes' : 'Save my notes'}</button>{notes && <span className="hint"> Saved</span>}</form>
      <Room ctx={ctx} roomId={'x' + ti} members={experts(ctx, ti)} what="expert group" stems={['The key idea is ...', 'A good way to teach this is ...', 'I am not sure about ...']} /></>
    const home = ctx.groups[ctx.gi]
    if (ctx.phase.id === 'home') return <><Card title="Home-group summary grid">
      <table className="data"><thead><tr><th>Topic</th><th>Expert</th><th>Summary</th></tr></thead><tbody>{T.map((t, i) => { const ex = home.filter(m => topicOf(ctx, m) === i); const rows = ex.map(m => ctx.one('summary', m)).filter(Boolean)
        return <tr key={i}><th>{t.title}</th><td>{ex.length ? ctx.names(ex) : 'No expert'}</td><td>{rows.length ? rows.map(r => <p key={r.id}>{r.data.text}</p>) : ex.length ? <span className="hint">Waiting for the expert</span> : <span>{t.text}</span>}</td></tr> })}</tbody></table></Card>
      <form className="field" onSubmit={e => { e.preventDefault(); s.trim() && ctx.save('summary', { topic: ti, text: s.trim() }) }}><label htmlFor="js">Your row: teach "{my.title}" in two or three sentences</label>
        {notes && <p className="hint">Your notes: {notes.data.text}</p>}<textarea id="js" rows={3} value={s} onChange={e => setS(e.target.value)} /><button className="btn primary" disabled={!s.trim()}>{sum ? 'Update my row' : 'Add my row'}</button></form>
      <Room ctx={ctx} roomId={'hm' + ctx.gi} members={home} stems={['Can you explain ... again?', 'So you are saying that ...', 'How does that link to my topic?']} /></>
    const quiz = ctx.one('quiz')
    if (ctx.phase.id === 'quiz' && !quiz) return <form className="field" onSubmit={e => { e.preventDefault(); const answers = T.map((_, i) => qz[i]); ctx.save('quiz', { answers, score: answers.filter((v, i) => v === T[i].answer - 1).length, text: 'Quiz handed in', onTime: ctx.onTime() }) }}>
      <h3>Quiz on all topics</h3>{T.map((t, i) => <fieldset key={i}><legend>{i + 1}. {t.q}</legend><div className="choices">{t.options.map((o, j) => <label key={j} className={'choice' + (qz[i] === j ? ' on' : '')}><input type="radio" name={'q' + i} checked={qz[i] === j} onChange={() => setQz(v => ({ ...v, [i]: j }))} /><span className="letter">{L(j)}</span><span>{o}</span></label>)}</div></fieldset>)}
      <button className="btn primary" disabled={T.some((_, i) => qz[i] == null)}><Icon n="lock" /> Hand in my quiz</button></form>
    if (!quiz) return <Wait>The quiz has closed.</Wait>
    return ctx.phase.id === 'quiz' ? <Note icon="lock">Quiz handed in. Results appear in the next step.</Note> : <Card title={`Your score: ${quiz.data.score} of ${T.length}`}><ul className="list">{T.map((t, i) => <li key={i}><div><b>{t.title}</b>: {t.q}<p>{quiz.data.answers[i] === t.answer - 1 ? <Tag tone="ok">Correct</Tag> : <Tag>Review this</Tag>} Answer: {t.options[t.answer - 1]}</p></div></li>)}</ul></Card>
  },
  Teacher({ ctx }) { const T = ctx.cfg.topics, q = ctx.all('quiz')
    return <Card title="Quiz accuracy by topic" right={<Tag>{q.length} quizzes in</Tag>}><Bars unit="%" max={100} rows={T.map((t, i) => ({ label: t.title, v: pct(q.filter(e => e.data.answers[i] === t.answer - 1).length, q.length) }))} />
      <p className="hint">A low score on one topic points to the experts who taught it, not to the listeners.</p>
      <ul className="list">{q.map(e => <li key={e.id}><div><b>{ctx.name(e.student_id)}</b> {e.data.score} of {T.length} <span className="hint">expert in {T[topicOf(ctx, e.student_id)]?.title}</span></div></li>)}</ul></Card> },
  Projector({ ctx }) { const T = ctx.cfg.topics, q = ctx.all('quiz')
    return ctx.phase.id === 'quiz' ? <Progress ctx={ctx} kind="quiz" label="quizzes handed in" /> : ctx.phase.id === 'res' ? <Card title="Class accuracy by topic"><Bars unit="%" max={100} rows={T.map((t, i) => ({ label: t.title, v: pct(q.filter(e => e.data.answers[i] === t.answer - 1).length, q.length) }))} /></Card> : null },
}

/* ---------- 4. Claim-Evidence-Reasoning ---------- */
const RUB = [['c', 'Claim', ['Does not answer the question', 'Answers the question but is vague', 'Answers the question clearly and precisely']], ['e', 'Evidence', ['No data used', 'Some data, not linked to the claim', 'Specific data rows that support the claim']], ['r', 'Reasoning', ['No science idea', 'Science idea named but not connected', 'Science idea explains why the evidence supports the claim']]]
const LEVELS = ['Beginning', 'Developing', 'Secure']
const CerView = ({ ctx, gi }) => { const d = ctx.one('cer', 'g' + gi)?.data
  if (!d) return <p className="hint">Nothing written yet.</p>
  return <div className="cer"><p><Tag>Claim</Tag> {d.claim || <span className="hint">not written</span>} {d.claimBy && <By ctx={ctx} id={d.claimBy} />}</p>
    <div><Tag>Evidence</Tag><ul>{(d.evidence || []).map(ev => <li key={ev.id}>{ev.text} <Tag tone="ok">Row {ev.row + 1}</Tag> <By ctx={ctx} id={ev.by} /></li>)}</ul></div>
    <p><Tag>Reasoning</Tag> {d.reasoning || <span className="hint">not written</span>} {d.reasonBy && <By ctx={ctx} id={d.reasonBy} />}</p></div> }
const rated = (ctx, gi) => { const r = ctx.all('rating').filter(e => e.data.target === gi); return { n: r.length, c: avg(r.map(e => e.data.c)), e: avg(r.map(e => e.data.e)), r: avg(r.map(e => e.data.r)), notes: r.map(e => e.data.text).filter(Boolean) } }
const CerData = ({ cfg, pick, picked }) => <Card title="Data">{cfg.image && <img className="figure" src={cfg.image} alt="Data graph supplied by your teacher" />}<DataTable text={cfg.table} pick={pick} picked={picked} /></Card>
const cer = {
  name: 'Claim-Evidence-Reasoning', family: 'Discussion and argument', blurb: 'Groups argue from a data table: claim, linked evidence, reasoning, peer rating.',
  phases: [{ id: 'claim', name: 'Own claim', secs: 150, proj: 'Study the data alone. Write and lock your own claim.' }, { id: 'build', name: 'Group argument', secs: 540, proj: 'Build one argument. Take turns: claim, evidence linked to data rows, reasoning.' },
    { id: 'rate', name: 'Peer rating', secs: 240, proj: "Rate another group's argument with the rubric." }, { id: 'res', name: 'Results', secs: 0, proj: 'How strong were our arguments?' }],
  group: { size: 3, phase: 'build' },
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'question', label: 'Question', type: 'area' }, { k: 'table', label: 'Data table (first line is the header; separate columns with commas or tabs)', type: 'area' }, { k: 'image', label: 'Graph image (optional)', type: 'image' }, { k: 'starters', label: 'Reasoning sentence starters (one per line)', type: 'lines' }],
  Student({ ctx }) {
    const { cfg, gi } = ctx, first = ctx.one('first'), turn = useTurn(ctx, gi, 'cer')
    const [part, setPart] = useState('evidence'), [t, setT] = useState(''), [row, setRow] = useState(null), [rt, setRt] = useState({})
    const Q = <Card title="Question"><p className="q">{cfg.question}</p></Card>
    if (ctx.phase.id === 'claim' || !first) return <>{Q}<CerData cfg={cfg} /><AnswerBox ctx={ctx} kind="first" label="Your own claim" hint="One sentence that answers the question." />{first && <Note>Locked. Wait for the group step.</Note>}</>
    if (gi < 0) return <Note icon="users">Your teacher will add you to a group.</Note>
    const doc = ctx.one('cer', 'g' + gi)?.data || { evidence: [] }
    const saveDoc = () => { const v = t.trim(); if (!v) return
      const next = part === 'claim' ? { ...doc, claim: v, claimBy: ctx.me.id } : part === 'reasoning' ? { ...doc, reasoning: v, reasonBy: ctx.me.id } : { ...doc, evidence: [...doc.evidence, { id: uid(5), text: v, row, by: ctx.me.id }] }
      ctx.save('cer', { ...next, gi, text: next.claim || '' }, 'g' + gi); setT(''); setRow(null); turn.pass() }
    if (ctx.phase.id === 'build') return <>{Q}<CerData cfg={cfg} pick={turn.mine && part === 'evidence' ? setRow : null} picked={row} />
      <Card title="Your group's own claims">{[ctx.me.id, ...ctx.mates].map(i => <p key={i}><By ctx={ctx} id={i} /> {ctx.one('first', i)?.data.text || <span className="hint">not locked yet</span>}</p>)}</Card>
      <Card title="Our argument"><CerView ctx={ctx} gi={gi} />
        <TurnGate ctx={ctx} turn={turn} what="add to the argument">
          <fieldset><legend>What will you add?</legend><div className="row wrap">{['claim', 'evidence', 'reasoning'].map(p => <label key={p} className={'chip' + (part === p ? ' on' : '')}><input type="radio" className="sr" name="part" checked={part === p} onChange={() => { setPart(p); setT(p === 'claim' ? doc.claim || '' : p === 'reasoning' ? doc.reasoning || '' : '') }} />{p === 'claim' ? 'Group claim' : p === 'evidence' ? 'A piece of evidence' : 'Reasoning'}</label>)}</div></fieldset>
          {part === 'reasoning' && <Stems stems={cfg.starters} onPick={s => setT(v => (v ? v + ' ' : '') + s.replace(/\.\.\./g, '').trim() + ' ')} />}
          {part === 'evidence' && <p className="hint">{row == null ? 'Tap a row in the data table to link your evidence to it.' : `Linked to row ${row + 1}: ${parseTable(cfg.table)[row + 1].join(', ')}`}</p>}
          <label className="sr" htmlFor="cer-t">Your text</label><textarea id="cer-t" rows={3} value={t} onChange={e => setT(e.target.value)} />
          <button type="button" className="btn primary" disabled={!t.trim() || (part === 'evidence' && row == null)} onClick={saveDoc}>Save and pass the turn</button>
        </TurnGate></Card>
      <Room ctx={ctx} roomId={'cer' + gi} members={ctx.groups[gi]} stems={['Which row supports that?', 'I would word the claim as ...', 'The science idea here is ...']} /></>
    const n = ctx.groups.length, target = n > 1 ? (gi + 1) % n : gi, mine = ctx.one('rating')
    if (ctx.phase.id === 'rate') return <>{Q}<CerData cfg={cfg} /><Card title={`Argument from Group ${target + 1}`}><CerView ctx={ctx} gi={target} /></Card>
      {mine ? <Note icon="lock">Your rating is locked. Thank you for the feedback.</Note> : <form className="field" onSubmit={e => { e.preventDefault(); ctx.save('rating', { target, ...rt, text: (rt.text || '').trim(), onTime: ctx.onTime() }) }}>
        {RUB.map(([k, l, d]) => <fieldset key={k}><legend>{l}</legend><div className="choices">{d.map((x, i) => <label key={i} className={'choice' + (rt[k] === i + 1 ? ' on' : '')}><input type="radio" name={k} checked={rt[k] === i + 1} onChange={() => setRt(v => ({ ...v, [k]: i + 1 }))} /><span className="letter">{i + 1}</span><span><b>{LEVELS[i]}.</b> {x}</span></label>)}</div></fieldset>)}
        <label htmlFor="rt-t">One suggestion to make it stronger</label><textarea id="rt-t" rows={2} value={rt.text || ''} onChange={e => setRt(v => ({ ...v, text: e.target.value }))} />
        <button className="btn primary" disabled={!(rt.c && rt.e && rt.r)}><Icon n="lock" /> Lock my rating</button></form>}</>
    const r = rated(ctx, gi)
    return <>{Q}<Card title="Our argument"><CerView ctx={ctx} gi={gi} /></Card><Card title={`Peer ratings (${r.n})`}><Bars max={3} rows={[{ label: 'Claim', v: r.c }, { label: 'Evidence', v: r.e }, { label: 'Reasoning', v: r.r }]} /><ul>{r.notes.map((x, i) => <li key={i}>{x}</li>)}</ul></Card></>
  },
  Teacher({ ctx }) { return <Card title="Group arguments">{ctx.groups.map((g, i) => { const r = rated(ctx, i); return <div key={i} className="col"><h4>Group {i + 1}: {ctx.names(g)} {r.n > 0 && <Tag>Claim {r.c} · Evidence {r.e} · Reasoning {r.r}</Tag>}</h4><CerView ctx={ctx} gi={i} /></div> })}{!ctx.groups.length && <p className="hint">Groups are made when the group step starts.</p>}</Card> },
  Projector({ ctx }) { const id = ctx.phase.id, all = ctx.all('rating')
    return <><p className="q big">{ctx.cfg.question}</p>{id !== 'res' && <DataTable text={ctx.cfg.table} />}{id === 'claim' && <Progress ctx={ctx} kind="first" label="claims locked" />}
      {id === 'res' && <Card title="Class average on the rubric (out of 3)"><Bars max={3} rows={RUB.map(([k, l]) => ({ label: l, v: avg(all.map(e => e.data[k])) }))} /></Card>}</> },
}

/* ---------- 5. Gallery Walk ---------- */
const TAGS = ['Praise', 'Question', 'Suggestion']
const Board = ({ ctx, gi, comments, act }) => { const cards = ctx.all('card').filter(e => e.data.gi === gi).sort((a, b) => a.at - b.at), cm = ctx.all('comment').filter(e => e.data.target === gi)
  return <div><p className="hint">Prompt: {ctx.cfg.prompts[gi % ctx.cfg.prompts.length]}</p><div className="stickies">{cards.map(c => <div key={c.id} className="sticky">{c.data.text}<By ctx={ctx} id={c.student_id} /></div>)}{!cards.length && <p className="hint">No cards yet.</p>}</div>
    {comments && <ul className="list">{cm.map(c => { const h = ctx.one('helpful', c.id.split('|').pop()); return <li key={c.id}><div><Tag tone={c.data.tag === 'Question' ? 'q' : c.data.tag === 'Praise' ? 'ok' : ''}>{c.data.tag}</Tag> {c.data.text} <By ctx={ctx} id={c.student_id} /> {h?.data.on && <Tag tone="ok">Marked helpful</Tag>}
      {ctx.all('reply').filter(r => r.data.cid === c.id).map(r => <p key={r.id} className="reply">Reply: {r.data.text} <By ctx={ctx} id={r.student_id} /></p>)}{act && act(c, h)}</div></li> })}{!cm.length && <li><div className="hint">No comments yet.</div></li>}</ul>}</div> }
const visit = (ctx, gi) => { const n = ctx.groups.length; return n > 1 ? (gi + 1 + ((ctx.x.round || 0) % (n - 1))) % n : gi }
const Rotate = ({ ctx, max }) => { const r = ctx.x.round || 0; return <div className="row wrap"><Tag>Rotation {r + 1} of {max}</Tag><button className="btn primary" disabled={r + 1 >= max} onClick={() => ctx.go(ctx.pi, { round: r + 1 })}><Icon n="skip" /> Next rotation</button></div> }
const gallery = {
  name: 'Gallery Walk', family: 'Movement and rotation', blurb: 'Groups build boards, rotate on a timer, comment, then respond.',
  phases: [{ id: 'build', name: 'Build boards', secs: 420, proj: 'Build your board. Take turns adding one card each.' }, { id: 'walk', name: 'Gallery walk', secs: 180, proj: 'Visit the next board. Leave a Praise, a Question or a Suggestion.' },
    { id: 'respond', name: 'Respond', secs: 240, proj: 'Back to your own board. Reply to comments and mark the helpful ones.' }, { id: 'debrief', name: 'Debrief', secs: 0, proj: 'What feedback helped most?' }],
  group: { size: 4, phase: 'build' },
  projGroups: ctx => ctx.phase.id === 'walk' ? ctx.groups.map((g, i) => ({ label: `Group ${i + 1} visits board ${visit(ctx, i) + 1}`, ids: g })) : ctx.phase.id === 'debrief' ? [] : ctx.groups.map((g, i) => ({ label: `Group ${i + 1} · board ${i + 1}`, ids: g })),
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'prompts', label: 'Board prompts, one per group (one per line)', type: 'lines' }],
  Student({ ctx }) {
    const { gi } = ctx, turn = useTurn(ctx, gi, 'card'), [t, setT] = useState(''), [tag, setTag] = useState('Question'), [rep, setRep] = useState({})
    if (gi < 0) return <Note icon="users">Your teacher will add you to a group.</Note>
    if (ctx.phase.id === 'build') return <><Card title={`Board ${gi + 1}: your group's board`}><Board ctx={ctx} gi={gi} />
      <TurnGate ctx={ctx} turn={turn} what="add a card"><label htmlFor="gc">Your card</label><textarea id="gc" rows={2} value={t} onChange={e => setT(e.target.value)} />
        <button type="button" className="btn primary" disabled={!t.trim()} onClick={() => { ctx.save('card', { gi, text: t.trim() }, uid()); setT(''); turn.pass() }}>Add card and pass the turn</button></TurnGate></Card>
      <Room ctx={ctx} roomId={'gw' + gi} members={ctx.groups[gi]} stems={['We should add ...', 'An example of this is ...']} /></>
    if (ctx.phase.id === 'walk') { const v = visit(ctx, gi), mine = ctx.all('comment').filter(c => c.student_id === ctx.me.id && c.data.target === v).length
      return <Card tone="coral" title={`You are visiting board ${v + 1}`}><Board ctx={ctx} gi={v} />
        <form className="field" onSubmit={e => { e.preventDefault(); if (!t.trim()) return; ctx.save('comment', { target: v, tag, text: t.trim(), from: gi }, uid()); setT('') }}>
          <fieldset><legend>Your comment is a ...</legend><div className="row wrap">{TAGS.map(x => <label key={x} className={'chip' + (tag === x ? ' on' : '')}><input className="sr" type="radio" name="tag" checked={tag === x} onChange={() => setTag(x)} />{x}</label>)}</div></fieldset>
          <label htmlFor="gcm">{tag === 'Praise' ? 'Say exactly what they did well' : tag === 'Question' ? 'Ask something that makes them think' : 'Suggest one specific improvement'}</label><textarea id="gcm" rows={2} value={t} onChange={e => setT(e.target.value)} />
          <button className="btn primary" disabled={!t.trim()}>Leave comment</button><span className="hint"> You have left {mine} on this board.</span></form></Card> }
    return <Card title={`Board ${gi + 1}: comments for your group`}><Board ctx={ctx} gi={gi} comments act={ctx.phase.id === 'respond' ? (c, h) => { const key = c.id.split('|').pop(); return <div className="row wrap">
      <button type="button" className={'btn sm' + (h?.data.on ? ' primary' : '')} aria-pressed={!!h?.data.on} onClick={() => ctx.save('helpful', { on: !h?.data.on, author: !h?.data.on ? c.student_id : null, tag: c.data.tag }, key)}><Icon n="check" /> Helpful</button>
      <label className="sr" htmlFor={'rp' + key}>Reply</label><input id={'rp' + key} placeholder="Reply to this comment" value={rep[key] || ''} onChange={e => setRep(v => ({ ...v, [key]: e.target.value }))} />
      <button type="button" className="btn sm" disabled={!(rep[key] || '').trim()} onClick={() => { ctx.save('reply', { cid: c.id, text: rep[key].trim(), buildsOn: c.student_id }, uid()); setRep(v => ({ ...v, [key]: '' })) }}>Reply</button></div> } : null} /></Card>
  },
  Teacher({ ctx }) { return <Card title="Boards" right={ctx.phase.id === 'walk' ? <Rotate ctx={ctx} max={Math.max(1, ctx.groups.length - 1)} /> : null}>{ctx.groups.map((g, i) => <div key={i} className="col"><h4>Board {i + 1}: {ctx.names(g)}</h4><Board ctx={ctx} gi={i} comments /></div>)}{!ctx.groups.length && <p className="hint">Groups are made when the session step starts.</p>}</Card> },
  Projector({ ctx }) { const c = ctx.all('comment'); return ctx.phase.id === 'build' ? <Bars rows={ctx.groups.map((g, i) => ({ label: 'Board ' + (i + 1), v: ctx.all('card').filter(e => e.data.gi === i).length }))} unit=" cards" />
    : <><Bars rows={TAGS.map(t => ({ label: t, v: c.filter(e => e.data.tag === t).length }))} /><div className="stat"><b>{ctx.all('helpful').filter(e => e.data.on).length}</b> comments marked helpful</div></> },
}

/* ---------- 6. Station Rotation ---------- */
const stationOf = (ctx, gi) => (gi + (ctx.x.round || 0)) % ctx.cfg.stations.length
const done = (ctx, gi, si) => ctx.all('tick').filter(e => e.data.gi === gi && e.data.si === si && e.data.done).length
const Tracker = ({ ctx, only }) => <div className="scroll"><table className="data"><thead><tr><th>Group</th>{ctx.cfg.stations.map((s, i) => <th key={i}>{i + 1}. {s.name}</th>)}</tr></thead><tbody>{ctx.groups.map((g, gi) => (only == null || only === gi) && <tr key={gi}><th>Group {gi + 1}</th>
  {ctx.cfg.stations.map((s, si) => { const d = done(ctx, gi, si), n = s.checklist.length; return <td key={si} className={stationOf(ctx, gi) === si && ctx.phase.id === 'rot' ? 'here' : ''}>{d === n ? <Tag tone="ok"><Icon n="check" s={12} /> Done</Tag> : `${d} of ${n}`}{stationOf(ctx, gi) === si && ctx.phase.id === 'rot' && <span className="hint"> (here now)</span>}</td> })}</tr>)}</tbody></table></div>
const stations = {
  name: 'Station Rotation', family: 'Movement and rotation', blurb: 'Groups rotate through 3 to 5 stations with a task and checklist at each.',
  phases: [{ id: 'rot', name: 'Stations', secs: 420, proj: 'Work at your station. Tick each checklist item as your group completes it.' }, { id: 'debrief', name: 'Debrief', secs: 0, proj: 'What did each station show us?' }],
  group: { count: cfg => cfg.stations.length, phase: 'rot' },
  projGroups: ctx => ctx.phase.id === 'rot' ? ctx.groups.map((g, i) => ({ label: `Group ${i + 1} at station ${stationOf(ctx, i) + 1}: ${ctx.cfg.stations[stationOf(ctx, i)].name}`, ids: g })) : [],
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'stations', label: 'Stations (3 to 5)', type: 'list', min: 3, max: 5, item: [{ k: 'name', label: 'Station name' }, { k: 'task', label: 'Task', type: 'area' }, { k: 'checklist', label: 'Checklist (one item per line)', type: 'lines' }] }],
  Student({ ctx }) {
    const { gi } = ctx, [t, setT] = useState('')
    if (gi < 0) return <Note icon="users">Your teacher will add you to a group.</Note>
    if (ctx.phase.id !== 'rot') return <Card title="Your group's progress"><Tracker ctx={ctx} only={gi} /></Card>
    const si = stationOf(ctx, gi), s = ctx.cfg.stations[si], notes = ctx.all('stn').filter(e => e.data.gi === gi && e.data.si === si)
    return <><Card tone="coral" title={`Station ${si + 1}: ${s.name}`}><p>{s.task}</p><p className="hint">With {ctx.names(ctx.mates) || 'your group'}</p></Card>
      <Card title="Checklist"><ul className="list">{s.checklist.map((c, ii) => { const k = `g${gi}s${si}i${ii}`, e = ctx.one('tick', k); return <li key={ii}><label className="inline"><input type="checkbox" checked={!!e?.data.done} onChange={() => ctx.save('tick', { gi, si, ii, done: !e?.data.done }, k)} /> {c}</label>{e?.data.done && <By ctx={ctx} id={e.student_id} />}</li> })}</ul></Card>
      <Card title="Station record"><ul className="list">{notes.map(n => <li key={n.id}><div>{n.data.text} <By ctx={ctx} id={n.student_id} /></div></li>)}</ul>
        <form className="row" onSubmit={e => { e.preventDefault(); if (!t.trim()) return; ctx.save('stn', { gi, si, text: t.trim() }, uid()); setT('') }}><label className="sr" htmlFor="stn">Result or observation</label><input id="stn" value={t} onChange={e => setT(e.target.value)} placeholder="Add a result or observation" /><button className="btn" disabled={!t.trim()}>Add</button></form></Card>
      <Card title="Your group's progress"><Tracker ctx={ctx} only={gi} /></Card></>
  },
  Teacher({ ctx }) { return <Card title="Progress tracker" right={ctx.phase.id === 'rot' ? <Rotate ctx={ctx} max={ctx.cfg.stations.length} /> : null}><Tracker ctx={ctx} />
    <ul className="list">{ctx.all('stn').map(n => <li key={n.id}><div><Tag>Group {n.data.gi + 1} · Station {n.data.si + 1}</Tag> {n.data.text} <By ctx={ctx} id={n.student_id} /></div></li>)}</ul></Card> },
  Projector({ ctx }) { return <Card title="Progress tracker"><Tracker ctx={ctx} /></Card> },
}

/* ---------- 11. Numbered Heads Together ---------- */
const calledId = (ctx, gi) => { const g = ctx.groups[gi]; return g && ctx.x.called ? g[(ctx.x.called - 1) % g.length] : null }
const nhtAcc = ctx => { const a = k => { const e = ctx.all(k); return { n: e.length, p: pct(e.filter(x => x.data.correct).length, e.length) } }; return { ind: a('n1'), team: a('team'), called: a('called') } }
const NhtBars = ({ ctx }) => { const a = nhtAcc(ctx); return <Bars unit="%" max={100} rows={[{ label: `Individual, before talking (${a.ind.n} answers)`, v: a.ind.p }, { label: `Team answer (${a.team.n} answers)`, v: a.team.p }, { label: `Called student, answering alone (${a.called.n} answers)`, v: a.called.p }]} /> }
const nht = {
  name: 'Numbered Heads Together', family: 'Review', blurb: 'Teams of four agree an answer, a spinner picks who answers alone.',
  phases: [{ id: 'priv', name: 'Private answer', secs: 60, proj: 'Answer on your own first.' }, { id: 'team', name: 'Heads together', secs: 150, proj: 'Heads together. Agree one answer and make sure everyone can explain it.' },
    { id: 'spin', name: 'Spin', secs: 0, proj: 'Which number will answer?' }, { id: 'called', name: 'Called student answers', secs: 45, proj: 'Called students answer alone. Teams stay silent.' }, { id: 'rev', name: 'Reveal', secs: 0, proj: 'Individual and team accuracy' }],
  group: { size: 4, phase: 'priv' }, projGroups: ctx => ctx.groups.map((g, i) => ({ label: 'Team ' + (i + 1), ids: g, numbered: true })),
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'questions', label: 'Questions', type: 'list', item: [{ k: 'q', label: 'Question', type: 'area' }, { k: 'options', label: 'Options (one per line)', type: 'lines' }, { k: 'answer', label: 'Correct option number', type: 'num' }] }],
  Student({ ctx }) {
    const { gi, me } = ctx, q = ctx.x.q || 0, Q = ctx.cfg.questions[q], sfx = '~' + q, ok = c => ({ q, correct: c === Q.answer - 1 })
    if (gi < 0) return <Note icon="users">Your teacher will add you to a team.</Note>
    const num = ctx.groups[gi].indexOf(me.id) + 1, n1 = ctx.one('n1', me.id + sfx), team = ctx.one('team', 'g' + gi + sfx), cid = calledId(ctx, gi)
    const Head = <><div className="number" aria-label={'Your number is ' + num}><span>Your number</span><b>{num}</b><span>Team {gi + 1}</span></div><Card title={`Question ${q + 1} of ${ctx.cfg.questions.length}`}><p className="q">{Q.q}</p></Card></>
    if (ctx.phase.id === 'priv' || !n1) return <>{Head}<ChoiceBox key={q} ctx={ctx} kind="n1" k={me.id + sfx} label="Your own answer" options={Q.options} extra={ok} /></>
    if (ctx.phase.id === 'team') { const ag = team?.data.agreed || []
      return <>{Head}<Card title="Your team's private answers">{ctx.groups[gi].map(i => { const e = ctx.one('n1', i + sfx); return <p key={i}><By ctx={ctx} id={i} /> {e ? `${L(e.data.choice)}. ${Q.options[e.data.choice]}` : 'not locked yet'}</p> })}</Card>
        <Card title="Team answer" tone="coral"><p className="hint">Anyone can propose. The answer counts when every teammate agrees.</p><div className="choices">{Q.options.map((o, i) => <button key={i} type="button" className={'choice' + (team?.data.choice === i ? ' on' : '')} aria-pressed={team?.data.choice === i}
          onClick={() => ctx.save('team', team?.data.choice === i ? { ...team.data, agreed: [...new Set([...ag, me.id])] } : { choice: i, agreed: [me.id], gi, ...ok(i) }, 'g' + gi + sfx)}><span className="letter">{L(i)}</span><span>{o}</span></button>)}</div>
          {team ? <p>Proposed: <b>{L(team.data.choice)}</b>. Agreed by {ctx.names(ag)} ({ag.length} of {ctx.groups[gi].length}). {!ag.includes(me.id) && 'Tap the same option to agree.'}</p> : <p className="hint">No proposal yet.</p>}</Card>
        <Room ctx={ctx} roomId={'t' + gi + sfx} members={ctx.groups[gi]} what="team" stems={['I chose ... because ...', 'Can everyone explain why?', 'Let me check: if number 3 is called, you would say ...']} /></> }
    if (ctx.phase.id === 'spin') return <>{Head}<Wait>{ctx.x.called ? `Number ${ctx.x.called} was called.` : 'Watch the spinner. Any number can be called.'}</Wait></>
    if (ctx.phase.id === 'called') return cid === me.id ? <>{Head}<Card tone="coral" title="Your number was called"><p>Answer alone for your team. Your team's answer is hidden.</p></Card><ChoiceBox key={'c' + q} ctx={ctx} kind="called" k={me.id + sfx} label="Your answer for the team" options={Q.options} extra={ok} /></>
      : <>{Head}<Wait>{ctx.name(cid)} is answering for your team. Stay silent and trust your preparation.</Wait></>
    const c = ctx.one('called', cid + sfx)
    return <>{Head}<Card title="Reveal"><p>Accepted answer: <b>{L(Q.answer - 1)}. {Q.options[Q.answer - 1]}</b></p>
      <p>Your team agreed on: {team ? L(team.data.choice) : 'no answer'}. {ctx.name(cid)} answered: {c ? L(c.data.choice) : 'no answer'} {c?.data.correct && <Tag tone="ok">Correct</Tag>}</p></Card></>
  },
  Teacher({ ctx }) { const q = ctx.x.q || 0, more = q + 1 < ctx.cfg.questions.length
    return <Card title={`Question ${q + 1}: individual versus team accuracy`} right={<div className="row wrap">
      {ctx.phase.id === 'spin' && <button className="btn primary" onClick={() => ctx.setX({ called: 1 + Math.floor(Math.random() * 4), spinAt: Date.now() })}>{ctx.x.called ? `Called: ${ctx.x.called}. Spin again` : 'Spin the spinner'}</button>}
      {ctx.phase.id === 'rev' && <button className="btn primary" disabled={!more} onClick={() => ctx.go(0, { q: q + 1, called: null })}>{more ? 'Next question' : 'No more questions'}</button>}</div>}>
      <NhtBars ctx={ctx} /><p className="hint">Totals cover all questions so far. A gap between team and called accuracy means some teammates were carried.</p>
      <ul className="list">{ctx.groups.map((g, i) => { const cid = calledId(ctx, i), c = cid && ctx.one('called', cid + '~' + q), t = ctx.one('team', 'g' + i + '~' + q); return <li key={i}><div><b>Team {i + 1}</b> team answer {t ? L(t.data.choice) : 'none'} {t?.data.correct && <Tag tone="ok">Correct</Tag>}{cid && <> · called: {ctx.name(cid)} {c ? L(c.data.choice) : 'waiting'} {c?.data.correct && <Tag tone="ok">Correct</Tag>}</>}</div></li> })}</ul></Card> },
  Projector({ ctx }) { const q = ctx.x.q || 0, Q = ctx.cfg.questions[q], id = ctx.phase.id
    return <><p className="q big">{Q.q}</p><ol className="opts" type="A">{Q.options.map((o, i) => <li key={i} className={id === 'rev' && i === Q.answer - 1 ? 'right' : ''}>{o}{id === 'rev' && i === Q.answer - 1 && <Tag tone="ok">Accepted answer</Tag>}</li>)}</ol>
      {id === 'priv' && <Progress ctx={ctx} kind="n1" label="private answers locked (all questions)" />}
      {(id === 'spin' || id === 'called') && <div className="spinner" key={ctx.x.spinAt}><div className={'wheel' + (ctx.x.called ? ' spun' : '')}>{ctx.x.called || '?'}</div><p>{ctx.x.called ? `Number ${ctx.x.called} answers for each team` : 'Waiting for the spin'}</p></div>}
      {id === 'rev' && <Card title="Accuracy"><NhtBars ctx={ctx} /></Card>}</> },
}

/* ---------- 12. Collaborative Concept Map ---------- */
export function MapSvg({ nodes, links, title }) {
  const W = 430, H = 440, R = 180, pos = Object.fromEntries(nodes.map((n, i) => { const a = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2; return [n, [W / 2 + Math.cos(a) * R * 0.78, H / 2 + Math.sin(a) * R]] }))
  return <svg viewBox={`0 0 ${W} ${H}`} className="map" role="img" aria-label={`${title}. ${nodes.length} concepts and ${links.length} links: ${links.map(l => `${l.from} ${l.phrase} ${l.to}`).join('; ')}`}>
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1b2a41" /></marker></defs>
    {links.filter(l => pos[l.from] && pos[l.to]).map((l, i) => { const [x1, y1] = pos[l.from], [x2, y2] = pos[l.to], d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d, uy = (y2 - y1) / d, mx = x1 + (x2 - x1) * (0.42 + (i % 3) * 0.08), my = y1 + (y2 - y1) * (0.42 + (i % 3) * 0.08)
      return <g key={i}><line x1={x1 + ux * 30} y1={y1 + uy * 16} x2={x2 - ux * 46} y2={y2 - uy * 20} stroke="#1b2a41" strokeWidth="1.5" markerEnd="url(#ah)" />
        <rect x={mx - l.phrase.length * 3.1 - 4} y={my - 9} width={l.phrase.length * 6.2 + 8} height="17" rx="4" fill="#fffaf0" /><text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#1b2a41">{l.phrase}</text></g> })}
    {nodes.map(n => <g key={n}><rect x={pos[n][0] - n.length * 3.9 - 10} y={pos[n][1] - 15} width={n.length * 7.8 + 20} height="30" rx="15" fill="#12304f" /><text x={pos[n][0]} y={pos[n][1] + 5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff">{n}</text></g>)}
  </svg>
}
const mapOf = (ctx, gi) => ({ nodes: ctx.all('node').filter(e => e.data.gi === gi).sort((a, b) => a.at - b.at), links: ctx.all('link').filter(e => e.data.gi === gi).sort((a, b) => a.at - b.at) })
const GroupMap = ({ ctx, gi, tags }) => { const m = mapOf(ctx, gi); return <div><MapSvg title={`Group ${gi + 1} map`} nodes={m.nodes.map(n => n.data.c)} links={m.links.map(l => l.data)} />
  {tags && <details open={tags === 'open'}><summary>Who added what (concepts: {m.nodes.length}, links: {m.links.length})</summary><ul className="list">{m.nodes.map(n => <li key={n.id}><div>Concept: {n.data.c} <By ctx={ctx} id={n.student_id} /></div></li>)}{m.links.map(l => <li key={l.id}><div>Link: {l.data.from} <i>{l.data.phrase}</i> {l.data.to} <By ctx={ctx} id={l.student_id} /></div></li>)}</ul></details>}</div> }
const Expert = ({ cfg }) => <MapSvg title="Expert map" nodes={cfg.concepts} links={cfg.expert} />
const cmap = {
  name: 'Collaborative Concept Map', family: 'Shared product', blurb: 'Groups build one map from supplied concepts; every link needs a linking phrase.',
  phases: [{ id: 'build', name: 'Build the map', secs: 720, proj: 'Build one map. Take turns: add a concept or a labelled link.' }, { id: 'compare', name: 'Compare', secs: 0, proj: 'Compare your map with the expert map. What would you add or change?' }],
  group: { size: 3, phase: 'build' },
  fields: [{ k: 'topic', label: 'Topic' }, { k: 'focus', label: 'Focus question', type: 'area' }, { k: 'concepts', label: 'Concepts (one per line)', type: 'lines' }, { k: 'phrases', label: 'Suggested linking phrases (one per line)', type: 'lines' },
    { k: 'expert', label: 'Expert map links', type: 'list', item: [{ k: 'from', label: 'From concept' }, { k: 'phrase', label: 'Linking phrase' }, { k: 'to', label: 'To concept' }] }],
  Student({ ctx }) {
    const { gi, cfg } = ctx, turn = useTurn(ctx, gi, 'map'), [c, setC] = useState(''), [f, setF] = useState({ from: '', phrase: '', to: '' })
    if (gi < 0) return <Note icon="users">Your teacher will add you to a group.</Note>
    const m = mapOf(ctx, gi), placed = m.nodes.map(n => n.data.c), left = cfg.concepts.filter(x => !placed.includes(x))
    const valid = l => cfg.expert.some(e => (e.from === l.from && e.to === l.to) || (e.from === l.to && e.to === l.from))
    const okL = f.from && f.to && f.from !== f.to && f.phrase.trim().length > 1
    return <><Card title={cfg.topic}><p className="q">{cfg.focus}</p></Card>
      {ctx.phase.id === 'compare' && ctx.x.reveal ? <div className="cols2"><Card title="Your group's map"><GroupMap ctx={ctx} gi={gi} tags /></Card><Card title="Expert map"><Expert cfg={cfg} /></Card></div> : <Card title="Your group's map"><GroupMap ctx={ctx} gi={gi} tags="open" /></Card>}
      {ctx.phase.id === 'build' && <TurnGate ctx={ctx} turn={turn} what="add one concept or one link">
        <form className="row wrap" onSubmit={e => { e.preventDefault(); if (!c) return; ctx.save('node', { gi, c, text: 'Concept: ' + c }, `g${gi}c${cfg.concepts.indexOf(c)}`); setC(''); turn.pass() }}>
          <label htmlFor="cm-c">Add a concept</label><select id="cm-c" value={c} onChange={e => setC(e.target.value)}><option value="">Choose a concept</option>{left.map(x => <option key={x}>{x}</option>)}</select><button className="btn primary" disabled={!c}>Add concept</button></form>
        <form className="field" onSubmit={e => { e.preventDefault(); if (!okL) return; const l = { ...f, phrase: f.phrase.trim() }; ctx.save('link', { gi, ...l, valid: valid(l), text: `${l.from} ${l.phrase} ${l.to}` }, uid()); setF({ from: '', phrase: '', to: '' }); turn.pass() }}>
          <fieldset><legend>Or add a link (a linking phrase is required)</legend><div className="row wrap">
            <select aria-label="From concept" value={f.from} onChange={e => setF({ ...f, from: e.target.value })}><option value="">From</option>{placed.map(x => <option key={x}>{x}</option>)}</select>
            <input aria-label="Linking phrase" list="phr" placeholder="linking phrase, e.g. produces" value={f.phrase} onChange={e => setF({ ...f, phrase: e.target.value })} /><datalist id="phr">{cfg.phrases.map(p => <option key={p} value={p} />)}</datalist>
            <select aria-label="To concept" value={f.to} onChange={e => setF({ ...f, to: e.target.value })}><option value="">To</option>{placed.map(x => <option key={x}>{x}</option>)}</select>
            <button className="btn primary" disabled={!okL}>Add link</button></div></fieldset>{placed.length < 2 && <p className="hint">Add at least two concepts before linking them.</p>}</form>
      </TurnGate>}
      {ctx.phase.id === 'build' && <Room ctx={ctx} roomId={'cm' + gi} members={ctx.groups[gi]} stems={['These two connect because ...', 'A better linking phrase is ...']} />}
      {ctx.phase.id === 'compare' && !ctx.x.reveal && <Wait>Your teacher will reveal the expert map for comparison.</Wait>}</>
  },
  Teacher({ ctx }) { return <Card title="Group maps" right={<button className={'btn' + (ctx.x.reveal ? ' primary' : '')} aria-pressed={!!ctx.x.reveal} onClick={() => ctx.setX({ reveal: !ctx.x.reveal })}><Icon n="eye" /> {ctx.x.reveal ? 'Expert map revealed' : 'Reveal expert map'}</button>}>
    <div className="cols2">{ctx.groups.map((g, i) => <div key={i} className="col"><h4>Group {i + 1}: {ctx.names(g)} <Tag>{mapOf(ctx, i).links.filter(l => l.data.valid).length} links match the expert map</Tag></h4><GroupMap ctx={ctx} gi={i} tags /></div>)}<div className="col"><h4>Expert map</h4><Expert cfg={ctx.cfg} /></div></div></Card> },
  Projector({ ctx }) { return <><p className="q big">{ctx.cfg.focus}</p>{ctx.x.reveal ? <Card title="Expert map"><Expert cfg={ctx.cfg} /></Card> : <Bars legend={['Concepts placed', 'Labelled links']} rows={ctx.groups.map((g, i) => ({ label: 'Group ' + (i + 1), v0: mapOf(ctx, i).nodes.length, v: mapOf(ctx, i).links.length }))} />}</> },
}

export default { jigsaw, cer, gallery, stations, nht, cmap }
