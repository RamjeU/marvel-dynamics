import { useEffect, useMemo, useState } from 'react'
import { api, REL_COLORS } from './api'
import Graph from './components/Graph'
import CharacterPanel from './components/CharacterPanel'
import PathFinder from './components/PathFinder'

export default function App() {
  const [meta, setMeta] = useState({ continuities: [], eras: [] })
  const [characters, setCharacters] = useState([])
  const [filters, setFilters] = useState({ continuity: 'earth-616', era: '', type: '' })
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

  useEffect(() => {
    api.graph(filters).then(g => {
      // curve parallel edges so the 616 and Earth-295 Magneto/Rogue links are both visible
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
    if (!selectedId) { setCharacter(null); return }
    api.character(selectedId).then(setCharacter).catch(e => setError(String(e)))
  }, [selectedId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? characters.filter(c => c.name.toLowerCase().includes(q) || (c.real_name || '').toLowerCase().includes(q)) : characters
  }, [characters, query])

  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

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
          <label>Type</label>
          <select value={filters.type} onChange={set('type')}>
            <option value="">All types</option>
            {Object.keys(REL_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="search" placeholder="Search characters…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
      </header>

      <div className="main">
        <Graph data={graph} selectedId={selectedId} highlightLinks={highlight} onSelect={setSelectedId} />
        <aside className="panel">
          {error && <div className="empty">Error: {error}</div>}
          {character ? (
            <>
              <button className="btn ghost" onClick={() => setSelectedId(null)}>← All characters</button>
              <div style={{ height: 12 }} />
              <CharacterPanel character={character} continuity={filters.continuity} onSelect={setSelectedId} />
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
