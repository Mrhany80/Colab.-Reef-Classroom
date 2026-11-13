import a from './a.jsx'
import b from './b.jsx'
import { CONTENT } from '../lib/content.js'
export const ORDER = ['tps', 'jigsaw', 'corners', 'cer', 'gallery', 'stations', 'stw', 'kwl', 'hinge', 'exit', 'nht', 'cmap']
export const MODULES = { ...a, ...b }
export const newItem = type => ({ type, config: { ...structuredClone(CONTENT[type]), secs: Object.fromEntries(MODULES[type].phases.filter(p => p.secs).map(p => [p.id, p.secs])) } })
