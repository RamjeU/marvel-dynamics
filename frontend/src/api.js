// Data layer. If VITE_API_URL is set, talk to the FastAPI backend.
// Otherwise read the static JSON exported by backend/export_static.py,
// which lets the whole site run on GitHub Pages with no server.

const API = import.meta.env.VITE_API_URL
const BASE = import.meta.env.BASE_URL

async function getJSON(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

let staticCache = null
async function loadStatic() {
  if (!staticCache) {
    const [characters, continuities, eras, teams, relationships] = await Promise.all([
      getJSON(`${BASE}data/characters.json`),
      getJSON(`${BASE}data/continuities.json`),
      getJSON(`${BASE}data/eras.json`),
      getJSON(`${BASE}data/teams.json`),
      getJSON(`${BASE}data/relationships.json`),
    ])
    staticCache = { characters, continuities, eras, teams, relationships }
  }
  return staticCache
}

function filterRels(rels, { continuity, era, type, year, team }) {
  return rels.filter(r =>
    (!continuity || continuity === 'all' || r.continuity.id === continuity) &&
    (!era || r.era?.id === era) &&
    (!type || r.type === type) &&
    (year == null || (r.start_year != null && r.start_year <= year && (r.end_year == null || r.end_year >= year))) &&
    (!team || (r.source.affiliations || []).includes(team) || (r.target.affiliations || []).includes(team)))
}

function buildGraph(rels) {
  const nodes = new Map()
  for (const r of rels) {
    for (const c of [r.source, r.target]) {
      if (!nodes.has(c.id)) nodes.set(c.id, { id: c.id, name: c.name, color: c.color, emblem: c.emblem, affiliations: c.affiliations, degree: 0 })
      nodes.get(c.id).degree++
    }
  }
  return {
    nodes: [...nodes.values()],
    links: rels.map(r => ({ id: r.id, source: r.source.id, target: r.target.id, type: r.type, label: r.label, continuity: r.continuity.id, era: r.era?.id, start_year: r.start_year, end_year: r.end_year })),
  }
}

function bfsPath(rels, start, goal) {
  const adj = new Map(), chars = new Map()
  for (const r of rels) {
    for (const [a, b] of [[r.source, r.target], [r.target, r.source]]) {
      if (!adj.has(a.id)) adj.set(a.id, [])
      adj.get(a.id).push({ rel: r, next: b.id })
      chars.set(a.id, a)
    }
  }
  if (!chars.has(start) || !chars.has(goal)) return { found: false }
  const prev = new Map([[start, null]])
  const q = [start]
  while (q.length) {
    const cur = q.shift()
    if (cur === goal) break
    for (const { rel, next } of adj.get(cur) || []) {
      if (!prev.has(next)) { prev.set(next, { from: cur, rel }); q.push(next) }
    }
  }
  if (!prev.has(goal)) return { found: false }
  const ids = [goal], links = []
  let cur = goal
  while (prev.get(cur)) {
    const { from, rel } = prev.get(cur)
    links.push({ id: rel.id, source: rel.source.id, target: rel.target.id, type: rel.type, label: rel.label, continuity: rel.continuity.id })
    ids.push(from); cur = from
  }
  ids.reverse(); links.reverse()
  return { found: true, degrees: links.length, nodes: ids.map(i => chars.get(i)), links }
}

export const api = {
  async meta() {
    if (API) {
      const [continuities, eras, teams] = await Promise.all([
        getJSON(`${API}/api/continuities`), getJSON(`${API}/api/eras`), getJSON(`${API}/api/teams`)])
      return { continuities, eras, teams }
    }
    const s = await loadStatic()
    return { continuities: s.continuities, eras: s.eras, teams: s.teams }
  },
  async characters() {
    if (API) return getJSON(`${API}/api/characters`)
    return (await loadStatic()).characters
  },
  async character(id) {
    if (API) return getJSON(`${API}/api/characters/${id}`)
    return getJSON(`${BASE}data/characters/${id}.json`)
  },
  async graph(filters) {
    if (API) {
      const p = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v != null && v !== '') p.set(k, v)
      return getJSON(`${API}/api/graph?${p}`)
    }
    return buildGraph(filterRels((await loadStatic()).relationships, filters))
  },
  async path(source, target, continuity) {
    if (API) return getJSON(`${API}/api/path?source=${source}&target=${target}&continuity=${continuity || 'earth-616'}`)
    return bfsPath(filterRels((await loadStatic()).relationships, { continuity }), source, target)
  },
}

export const REL_COLORS = {
  romance: '#E8457A',
  friendship: '#3FB8AF',
  rivalry: '#F2A541',
  family: '#8E7CF5',
  mentorship: '#5FC56B',
  alliance: '#9AB1C9',
  enmity: '#D94E4E',
}
