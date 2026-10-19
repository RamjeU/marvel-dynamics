import { useState } from 'react'
import { api } from '../api'

export default function PathFinder({ characters, continuity, onResult, onSelect }) {
  const [a, setA] = useState('destiny')
  const [b, setB] = useState('havok')
  const [res, setRes] = useState(null)

  async function run() {
    const r = await api.path(a, b, continuity)
    setRes(r)
    onResult(r.found ? r.links : null)
  }

  return (
    <div>
      <div className="section-title">Degrees of separation</div>
      <div className="path-row">
        <select value={a} onChange={e => setA(e.target.value)}>
          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="arrow">→</span>
        <select value={b} onChange={e => setB(e.target.value)}>
          {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn" onClick={run}>Find</button>
        {res && <button className="btn ghost" onClick={() => { setRes(null); onResult(null) }}>Clear</button>}
      </div>
      {res && (
        <div className="path-result">
          {!res.found ? <span className="empty">No chain of relationships connects them in this continuity.</span> : (
            <>
              <b>{res.degrees}</b> step{res.degrees === 1 ? '' : 's'}
              <div className="chain">
                {res.nodes.map((n, i) => (
                  <span key={n.id}>
                    <span className="chip" onClick={() => onSelect(n.id)}>{n.name}</span>
                    {i < res.links.length && <span className="arrow"> —{res.links[i].type}→ </span>}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
