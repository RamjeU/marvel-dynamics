import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { REL_COLORS } from '../api'

export default function Graph({ data, selectedId, highlightLinks, onSelect }) {
  const wrap = useRef(null)
  const fg = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [hover, setHover] = useState(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!fg.current) return
    const n = data.nodes.length
    fg.current.d3Force('charge').strength(n > 40 ? -180 : -260)
    fg.current.d3Force('link').distance(l => 70 + 5 * Math.min(l.source.degree || 1, l.target.degree || 1))
    fg.current.d3ReheatSimulation()
  }, [data])

  // zoom to fit once the layout settles
  const fitted = useRef(false)
  useEffect(() => { fitted.current = false }, [data])

  const pathSet = highlightLinks ? new Set(highlightLinks.map(l => l.id)) : null
  // neighbourhood of hovered/selected node
  const focusId = hover || selectedId
  const neighbourLinks = new Set(), neighbourNodes = new Set()
  if (focusId) {
    neighbourNodes.add(focusId)
    for (const l of data.links) {
      const s = l.source.id ?? l.source, t = l.target.id ?? l.target
      if (s === focusId || t === focusId) { neighbourLinks.add(l.id); neighbourNodes.add(s); neighbourNodes.add(t) }
    }
  }
  const dim = !!(pathSet || focusId)

  const drawNode = useCallback((node, ctx, scale) => {
    const r = 8 + Math.sqrt(node.degree || 1) * 3
    const isSel = node.id === selectedId
    const faded = dim && !(pathSet ? pathSet.size && highlightLinks.some(l => l.source === node.id || l.target === node.id) : neighbourNodes.has(node.id))
    ctx.globalAlpha = faded ? 0.18 : 1
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = node.color || '#888'
    ctx.fill()
    if (isSel || node.id === hover) { ctx.lineWidth = 3 / scale; ctx.strokeStyle = '#F2C14E'; ctx.stroke() }
    ctx.fillStyle = (node.color || '#888').toLowerCase() === '#000000' ? '#EDEEF2' : '#111'
    ctx.font = `${Math.max(r * 1.05, 8)}px Bebas Neue, Impact, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(node.emblem || node.name[0], node.x, node.y + 1)
    if (scale > 0.9 || isSel || !faded && focusId) {
      ctx.font = `${11 / scale}px IBM Plex Sans, sans-serif`
      ctx.fillStyle = '#EDEEF2'
      ctx.fillText(node.name, node.x, node.y + r + 9 / scale)
    }
    ctx.globalAlpha = 1
  }, [selectedId, hover, dim, pathSet, highlightLinks, neighbourNodes, focusId])

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
          ctx.beginPath(); ctx.arc(node.x, node.y, 8 + Math.sqrt(node.degree || 1) * 3, 0, 2 * Math.PI)
          ctx.fillStyle = color; ctx.fill()
        }}
        linkColor={l => {
          const c = REL_COLORS[l.type] || '#777'
          if (pathSet) return pathSet.has(l.id) ? '#F2C14E' : 'rgba(80,85,100,0.15)'
          if (focusId) return neighbourLinks.has(l.id) ? c : 'rgba(80,85,100,0.12)'
          return c
        }}
        linkWidth={l => (pathSet && pathSet.has(l.id)) || neighbourLinks.has(l.id) ? 3 : 1.4}
        linkCurvature={l => (l.curve || 0)}
        linkLabel={l => `${l.label || l.type} · ${l.continuity}${l.start_year ? ` · ${l.start_year}${l.end_year ? '–' + l.end_year : '–'}` : ''}`}
        onNodeClick={n => onSelect(n.id)}
        onNodeHover={n => setHover(n ? n.id : null)}
        onBackgroundClick={() => onSelect(null)}
        cooldownTicks={150}
        onEngineStop={() => { if (!fitted.current && fg.current) { fg.current.zoomToFit(400, 40); fitted.current = true } }}
      />
      <div className="legend">
        {Object.entries(REL_COLORS).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}
      </div>
      <div className="graph-hint">click a character · hover to isolate · drag · scroll to zoom</div>
    </div>
  )
}
