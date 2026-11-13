// Data layer. One interface, two backends:
//  - Supabase (Postgres + Realtime) when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set
//  - Same-device demo (localStorage + BroadcastChannel) otherwise
import { createClient } from '@supabase/supabase-js'
import { sampleClasses } from './content.js'

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const LIVE = !!(URL_ && KEY)
export const uid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 31]).join('')

function localStore() {
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem('reef:' + k)) ?? d } catch { return d } }
  const set = (k, v) => localStorage.setItem('reef:' + k, JSON.stringify(v))
  const bc = new BroadcastChannel('colab-reef')
  const subs = new Set()
  bc.onmessage = e => subs.forEach(f => f(e.data))
  const emit = m => { bc.postMessage(m); subs.forEach(f => f(m)) }
  if (!get('classes')) set('classes', sampleClasses())
  return {
    auth: {
      user: async () => ({ id: 'local' }), isSet: async () => true, enter: async () => true, signOut: async () => {},
    },
    listClasses: async () => get('classes', []),
    saveClass: async c => { const all = get('classes', []); const i = all.findIndex(x => x.id === c.id); if (i >= 0) all[i] = c; else all.push(c); set('classes', all); return c },
    deleteClass: async id => set('classes', get('classes', []).filter(c => c.id !== id)),
    listSessions: async () => get('sessions', []),
    saveSession: async s => { const all = get('sessions', []); const i = all.findIndex(x => x.id === s.id); if (i >= 0) all[i] = s; else all.push(s); set('sessions', all); emit({ t: 's', sid: s.id, row: s }); return s },
    deleteSession: async id => { set('sessions', get('sessions', []).filter(s => s.id !== id)); localStorage.removeItem('reef:e:' + id) },
    lookup: async code => {
      const s = get('sessions', []).find(x => x.code === code.toUpperCase()); if (!s) return null
      return { session: s, cls: get('classes', []).find(c => c.id === s.class_id) }
    },
    listEntries: async sid => Object.values(get('e:' + sid, {})),
    putEntry: async e => { const m = get('e:' + e.session_id, {}); m[e.id] = e; set('e:' + e.session_id, m); emit({ t: 'e', sid: e.session_id, row: e }) },
    classPraise: async cid => get('sessions', []).filter(s => s.class_id === cid).flatMap(s => Object.values(get('e:' + s.id, {})).filter(e => e.kind === 'praise')),
    subscribe: (sid, onS, onE) => { const f = m => { if (m.sid !== sid) return; m.t === 's' ? onS(m.row) : onE(m.row) }; subs.add(f); return () => subs.delete(f) },
  }
}

function supaStore() {
  const sb = createClient(URL_, KEY, { auth: { persistSession: false } })
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data }
  // One teacher, one passcode. It is kept on this device and checked by the database on every teacher action.
  const key = () => localStorage.getItem('reef:tkey') || ''
  const T = async (action, data = {}) => ok(await sb.rpc('teacher_do', { p_key: key(), p_action: action, p_data: data }))
  return {
    auth: {
      user: async () => key() && ok(await sb.rpc('teacher_ok', { p_key: key() })) ? { id: 'teacher' } : null,
      isSet: async () => ok(await sb.rpc('teacher_status')),
      enter: async (k, create) => { const good = ok(await sb.rpc(create ? 'teacher_setup' : 'teacher_ok', { p_key: k })); if (good) localStorage.setItem('reef:tkey', k); return good },
      signOut: async () => localStorage.removeItem('reef:tkey'),
    },
    listClasses: async () => {
      let rows = await T('list_classes')
      if (!rows.length) { for (const c of sampleClasses()) await T('save_class', c); rows = await T('list_classes') } // first run: clearly marked sample classes
      return rows
    },
    saveClass: c => T('save_class', { id: c.id, name: c.name, is_sample: c.is_sample, students: c.students, settings: c.settings }),
    deleteClass: id => T('delete_class', { id }),
    listSessions: () => T('list_sessions'),
    saveSession: s => T('save_session', { id: s.id, class_id: s.class_id, code: s.code, title: s.title, mode: s.mode, playlist: s.playlist, state: s.state, status: s.status }),
    deleteSession: id => T('delete_session', { id }),
    lookup: async code => { const d = ok(await sb.rpc('join_lookup', { p_code: code })); return d ? { session: d.session, cls: d.class } : null },
    listEntries: async sid => ok(await sb.from('entries').select('*').eq('session_id', sid)),
    putEntry: async e => ok(await sb.from('entries').upsert(e)),
    classPraise: async cid => ok(await sb.from('entries').select('*').eq('class_id', cid).eq('kind', 'praise')),
    subscribe: (sid, onS, onE) => {
      const ch = sb.channel('s-' + sid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: 'id=eq.' + sid }, p => p.new && p.new.id ? onS(p.new) : onS(null))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: 'session_id=eq.' + sid }, p => p.new && p.new.id && onE(p.new))
        .subscribe()
      return () => sb.removeChannel(ch)
    },
  }
}

export const store = LIVE ? supaStore() : localStore()
