import { useRef, useState, useEffect } from 'react'
import { useConfigurator } from '../context/ConfiguratorContext'

const MODEL_Y  = 0.20
const CAM_Z    = 2.5
const TAN_HALF = Math.tan((45 * Math.PI / 180) / 2)   // tan(22.5°) ≈ 0.4142

function pxPerUnit(frontZ, H) {
  return H / (2 * (CAM_Z - frontZ) * TAN_HALF)
}

function worldToPixel(wx, wy, W, H, frontZ, flip = false) {
  const s = pxPerUnit(frontZ, H)
  return {
    x: flip ? W / 2 - wx * s : W / 2 + wx * s,
    y: H / 2 - (wy - MODEL_Y) * s,
  }
}

function pixelToWorld(px, py, W, H, frontZ, flip = false) {
  const s = pxPerUnit(frontZ, H)
  return {
    x: flip ? -(px - W / 2) / s : (px - W / 2) / s,
    y: MODEL_Y - (py - H / 2) / s,
  }
}

export default function DesignOverlay() {
  const {
    activeView, view2DSide,
    designs, activeDesignId, setActiveDesignId,
    updateDesign, frontZRef, showHandles,
  } = useConfigurator()

  const containerRef = useRef()
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const startDrag = (e, design) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveDesignId(design.id)

    const flip = view2DSide === 'espalda'
    const rect = containerRef.current.getBoundingClientRect()
    const W    = rect.width
    const H    = rect.height
    const fz   = frontZRef.current

    const onMove = (ev) => {
      const px = ev.clientX - rect.left
      const py = ev.clientY - rect.top
      const { x, y } = pixelToWorld(px, py, W, H, fz, flip)
      updateDesign(design.id, {
        x: parseFloat(Math.max(-0.45, Math.min(0.45, x)).toFixed(3)),
        y: parseFloat(Math.max(-0.70, Math.min(0.70, y - MODEL_Y)).toFixed(3)),
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }

  const startResize = (e, design) => {
    e.preventDefault()
    e.stopPropagation()

    const flip = view2DSide === 'espalda'
    const rect = containerRef.current.getBoundingClientRect()
    const W    = rect.width
    const H    = rect.height
    const fz   = frontZRef.current

    const ar = design.aspectRatio || 1
    const onMove = (ev) => {
      const px = ev.clientX - rect.left
      const py = ev.clientY - rect.top
      const { x, y } = pixelToWorld(px, py, W, H, fz, flip)
      const dx = Math.abs(x - design.x)
      const dy = Math.abs(y - MODEL_Y - design.y)
      const s  = parseFloat(Math.max(0.05, Math.min(0.80, Math.max(dx * 2, dy * 2 * ar))).toFixed(3))
      updateDesign(design.id, { scale: s })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }

  // Always render the container so ResizeObserver can measure it
  // but only show content in 2D mode
  if (activeView !== '2d') {
    return <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
  }

  const { w: W, h: H } = size

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {designs
        .filter(d => d.side === view2DSide)
        .map(design => {
          const fz     = frontZRef.current
          const flip   = view2DSide === 'espalda'
          const { x: cx, y: cy } = worldToPixel(design.x, design.y + MODEL_Y, W, H, fz, flip)
          const ar      = design.aspectRatio || 1
          const pxW     = design.scale * pxPerUnit(fz, H)
          const pxH     = (design.scale / ar) * pxPerUnit(fz, H)
          const isActive = design.id === activeDesignId
          const halfW   = pxW / 2
          const halfH   = pxH / 2

          return (
            <div
              key={design.id}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              {/* Design image */}
              <img
                src={design.url}
                draggable={false}
                style={{
                  position:      'absolute',
                  left:          `${cx}px`,
                  top:           `${cy}px`,
                  width:         `${pxW}px`,
                  height:        `${pxH}px`,
                  transform:     'translate(-50%, -50%)',
                  touchAction:   'none',
                  cursor:        'grab',
                  userSelect:    'none',
                  pointerEvents: 'auto',
                }}
                onPointerDown={(e) => startDrag(e, design)}
              />

              {/* Bounding box + corner handles — only when showHandles is enabled */}
              {isActive && showHandles && (
                <>
                  {/* Dashed border */}
                  <div style={{
                    position:      'absolute',
                    left:          `${cx - halfW}px`,
                    top:           `${cy - halfH}px`,
                    width:         `${pxW}px`,
                    height:        `${pxH}px`,
                    border:        '1.5px dashed rgba(255,255,255,0.85)',
                    borderRadius:  '2px',
                    pointerEvents: 'none',
                  }} />

                  {/* 4 corner handles */}
                  {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy], i) => (
                    <div
                      key={i}
                      style={{
                        position:      'absolute',
                        left:          `${cx + sx * halfW - 8}px`,
                        top:           `${cy + sy * halfH - 8}px`,
                        width:         '16px',
                        height:        '16px',
                        borderRadius:  '50%',
                        background:    '#ffffff',
                        boxShadow:     '0 1px 4px rgba(0,0,0,0.5)',
                        cursor:        'nwse-resize',
                        touchAction:   'none',
                        pointerEvents: 'auto',
                      }}
                      onPointerDown={(e) => startResize(e, design)}
                    />
                  ))}
                </>
              )}
            </div>
          )
        })}
    </div>
  )
}
