import { useState } from 'react'
import { REL_COLORS } from '../api'

function RelationshipCard({ rel, selfId, onSelect }) {
  const [open, setOpen] = useState(false)
  const other = rel.source.id === selfId ? rel.target : rel.source
  const color = REL_COLORS[rel.type] || '#777'
  return (
    <div className="rel" style={{ borderLeftColor: color }}>
      <div className="rel-head" onClick={() => setOpen(o => !o)}>
        <div className="who">
          <button onClick={e => { e.stopPropagation(); onSelect(other.id) }}>{other.name}</button>
        </div>
        <span className="type" style={{ color }}>{rel.type}</span>
      </div>
      <div className="label">{rel.label}</div>
      <div className="cont">{rel.continuity.name}{rel.era ? ` · ${rel.era.name}` : ''} · {rel.start_issue}{rel.end_issue ? ` → ${rel.end_issue}` : ' → ongoing'}</div>
      {open && (
        <>
          <p className="summary">{rel.summary}</p>
          {rel.events?.length > 0 && (
            <ul className="timeline">
              {rel.events.map(e => (
                <li key={e.id}><div className="issue">{e.issue}</div>{e.note}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default function CharacterPanel({ character, continuity, onSelect, onTeam }) {
  if (!character) return null
  const rels = character.relationships.filter(r => !continuity || continuity === 'all' || r.continuity.id === continuity)
  return (
    <div>
      <div className="panel-head">
        <div className="emblem" style={{ background: character.color }}>{character.emblem}</div>
        <div>
          <h1>{character.name}</h1>
          <div className="real">{character.real_name}</div>
        </div>
      </div>
      <div className="meta">
        <div><b>First appearance</b> · {character.first_appearance}</div>
        {character.creators?.length > 0 && <div><b>Created by</b> · {character.creators.join(', ')}</div>}
        {character.aliases?.length > 0 && <div><b>Also</b> · {character.aliases.join(' · ')}</div>}
      </div>
      {character.affiliations?.length > 0 && (
        <div className="teams">
          {character.affiliations.map(t => <button key={t} className="chip" onClick={() => onTeam?.(t)}>{t}</button>)}
        </div>
      )}
      <p className="bio">{character.bio}</p>
      <div className="section-title">Relationships ({rels.length})</div>
      {rels.length > 0 && (
        <div className="type-row">
          {Object.entries(rels.reduce((a, r) => (a[r.type] = (a[r.type] || 0) + 1, a), {})).map(([t, n]) => (
            <span key={t} style={{ color: REL_COLORS[t] }}>{n} {t}</span>
          ))}
        </div>
      )}
      {rels.length === 0 && <div className="empty">No relationships recorded in this continuity yet.</div>}
      {rels.map(r => <RelationshipCard key={r.id} rel={r} selfId={character.id} onSelect={onSelect} />)}
    </div>
  )
}
