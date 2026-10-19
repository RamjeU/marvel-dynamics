import { useEffect, useMemo, useState } from 'react'
import { api, REL_COLORS } from './api'
import Graph from './components/Graph'
import CharacterPanel from './components/CharacterPanel'
import PathFinder from './components/PathFinder'

const MIN_YEAR = 1939, MAX_YEAR = 2026

export default function App() {
  const [meta, setMeta] = useState({ continuities: [], eras: [], teams: [] })
  const [characters, setCharacters] = useState([])
  const [filters, setFilters] = useState({ continuity: 'earth-616', era: '', type: '', team: '', year: null })
  const [yearOn, setYearOn] = useState(false)
  const [yearDraft, setYearDraft] = useState(1985)
  const [graph, setGraph] = useState({ nodes: [], links: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [character, setCharacter] = useState(null)
  const [highlight, setHighlight] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.meta(), api.characters()])
      .then(([m, c]) => { setMeta(m); setCharacters(c) })
      .catch(e => setError(String(e)))
  }, [])

  // debounce the year slider
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, year: yearOn ? yearDraft : null })), 120)
    return () => clearTimeout(t)
  }, [yearOn, yearDraft])

  useEffect(() => {
    api.graph(filters).then(g => {
      const seen = {}
      for (const l of g.links) {
        const k = [l.source, l.target].sort().join('|')
        seen[k] = (seen[k] || 0) + 1
        l.curve = seen[k] > 1 ? 0.25 * (seen[k] - 1) : 0
      }
      setGraph(g)
    }).catch(e => setError(String(e)))
  }, [filters])

  useEffect(() => {
    document.querySelector('.panel')?.scrollTo({ top: 0 })
    if (!selectedId) { setCharacter(null); return }
    api.character(selectedId).then(setCharacter).catch(e => setError(String(e)))
  }, [selectedId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = characters
    if (filters.team) list = list.filter(c => (c.affiliations || []).includes(filters.team))
    return q ? list.filter(c => c.name.toLowerCase().includes(q) || (c.real_name || '').toLowerCase().includes(q) || (c.aliases || []).some(a => a.toLowerCase().includes(q))) : list
  }, [characters, query, filters.team])

  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))
  const typeCounts = useMemo(() => {
    const c = {}
    for (const l of graph.links) c[l.type] = (c[l.type] || 0) + 1
    return c
  }, [graph])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">MARVEL DYNAMICS<small>character relationships · open database</small></div>
        <div className="filters">
          <label>Continuity</label>
          <select value={filters.continuity} onChange={set('continuity')}>
            <option value="all">All continuities</option>
            {meta.continuities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>Era</label>
          <select value={filters.era} onChange={set('era')}>
            <option value="">All eras</option>
            {meta.eras.map(e => <option key={e.id} value={e.id}>{e.name} ({e.start_year}–{e.end_year ?? ''})</option>)}
          </select>
          <label>Team</label>
          <select value={filters.team} onChange={set('team')}>
            <option value="">All teams</option>
            {meta.teams.map(t => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
          </select>
          <label>Type</label>
          <select value={filters.type} onChange={set('type')}>
            <option value="">All types</option>
            {Object.keys(REL_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="search" placeholder="Search characters…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="yearbar">
          <label className="toggle">
            <input type="checkbox" checked={yearOn} onChange={e => setYearOn(e.target.checked)} />
            <span>As of year</span>
          </label>
          <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={yearDraft} disabled={!yearOn}
            onChange={e => setYearDraft(Number(e.target.value))} />
          <span className={`year ${yearOn ? '' : 'off'}`}>{yearOn ? yearDraft : 'now'}</span>
        </div>
      </header>

      <div className="main">
        <div className="graph-col">
          <Graph data={graph} selectedId={selectedId} highlightLinks={highlight} onSelect={setSelectedId} />
          <div className="stats">
            <span><b>{graph.nodes.length}</b> characters</span>
            <span><b>{graph.links.length}</b> relationships</span>
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <span key={t} style={{ color: REL_COLORS[t] }}><b>{n}</b> {t}</span>
            ))}
          </div>
        </div>
        <aside className="panel">
          {error && <div className="empty">Error: {error}</div>}
          {character ? (
            <>
              <button className="btn ghost" onClick={() => setSelectedId(null)}>← All characters</button>
              <div style={{ height: 12 }} />
              <CharacterPanel character={character} continuity={filters.continuity} onSelect={setSelectedId} onTeam={t => setFilters(f => ({ ...f, team: t }))} />
            </>
          ) : (
            <>
              <PathFinder characters={characters} continuity={filters.continuity} onResult={setHighlight} onSelect={setSelectedId} />
              <div className="section-title">Characters ({filtered.length})</div>
              <div className="list">
                {filtered.map(c => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}>
                    <span className="dot" style={{ background: c.color }} />
                    {c.name}
                    <small>{c.real_name}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
