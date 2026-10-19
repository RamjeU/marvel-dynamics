import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { REL_COLORS } from '../api'

export default function Graph({ data, selectedId, highlightLinks, onSelect }) {
  const wrap = useRef(null)
  const fg = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!fg.current) return
    fg.current.d3Force('charge').strength(-260)
    fg.current.d3Force('link').distance(l => 90 + 6 * Math.min(l.source.degree || 1, l.target.degree || 1))
  }, [data])

  const highlighted = highlightLinks ? new Set(highlightLinks.map(l => l.id)) : null

  const drawNode = useCallback((node, ctx, scale) => {
    const r = 9 + Math.sqrt(node.degree || 1) * 3
    const isSel = node.id === selectedId
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = node.color || '#888'
    ctx.fill()
    if (isSel) { ctx.lineWidth = 3 / scale; ctx.strokeStyle = '#F2C14E'; ctx.stroke() }
    ctx.fillStyle = '#111'
    ctx.font = `${Math.max(r * 1.1, 8)}px Bebas Neue, Impact, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(node.emblem || node.name[0], node.x, node.y + 1)
    if (scale > 0.8 || isSel) {
      ctx.font = `${11 / scale}px IBM Plex Sans, sans-serif`
      ctx.fillStyle = '#EDEEF2'
      ctx.fillText(node.name, node.x, node.y + r + 9 / scale)
    }
  }, [selectedId])

  return (
    <div className="graph-wrap" ref={wrap}>
      <ForceGraph2D
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="#0B0D12"
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.beginPath(); ctx.arc(node.x, node.y, 9 + Math.sqrt(node.degree || 1) * 3, 0, 2 * Math.PI)
          ctx.fillStyle = color; ctx.fill()
        }}
        linkColor={l => highlighted ? (highlighted.has(l.id) ? '#F2C14E' : 'rgba(80,85,100,0.25)') : (REL_COLORS[l.type] || '#777')}
        linkWidth={l => highlighted && highlighted.has(l.id) ? 3.5 : 1.6}
        linkCurvature={l => (l.curve || 0)}
        linkLabel={l => `${l.label || l.type} · ${l.continuity}`}
        onNodeClick={n => onSelect(n.id)}
        onBackgroundClick={() => onSelect(null)}
        cooldownTicks={120}
      />
      <div className="legend">
        {Object.entries(REL_COLORS).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}
      </div>
      <div className="graph-hint">click a character · drag to rearrange · scroll to zoom</div>
    </div>
  )
}
