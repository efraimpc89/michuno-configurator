import { createContext, useContext, useState, useCallback } from 'react'

export const COLORS = [
  { name: 'Blanco',        hex: '#F3F3F3' },
  { name: 'Negro',         hex: '#1C1C1C' },
  { name: 'Gris Jaspe',    hex: '#B2B4B3' },
  { name: 'Azul Marino',   hex: '#1D2A44' },
  { name: 'Rojo',          hex: '#B31B1B' },
  { name: 'Verde Militar', hex: '#3B4436' },
  { name: 'Azul Rey',      hex: '#004B93' },
  { name: 'Arena / Beige', hex: '#D2C4B1' },
]

export const SIZES = [
  { label: 'CH', scale: [0.92, 0.94, 0.92] },
  { label: 'M',  scale: [1.0,  1.0,  1.0]  },
  { label: 'G',  scale: [1.08, 1.05, 1.08] },
  { label: 'XG', scale: [1.16, 1.10, 1.16] },
]

export const MODELS = [
  { id: 'playera1', name: 'Playera Clásica', path: '/playera.glb'  },
  { id: 'playera2', name: 'Oversize',        path: '/playera2.glb' },
  { id: 'polo',     name: 'Polo',            path: '/polo.glb'     },
]

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [color, setColor]           = useState('#F3F3F3')
  const [size, setSize]             = useState('M')
  const [modelId, setModelId]       = useState('playera1')
  const [roughness, setRoughness]   = useState(0.85)

  // Multi-design system
  const [designs, setDesigns]                   = useState([])
  const [activeDesignId, setActiveDesignId]     = useState(null)

  const currentScale = (SIZES.find(s => s.label === size)    ?? SIZES[1]).scale
  const currentModel = (MODELS.find(m => m.id   === modelId) ?? MODELS[0])
  const activeDesign = designs.find(d => d.id === activeDesignId) ?? null

  const addDesign = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const id  = `d-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    const design = { id, url, x: 0, y: 0.25, scale: 0.30, side: 'frente' }
    setDesigns(prev => [...prev, design])
    setActiveDesignId(id)
  }, [])

  const removeDesign = useCallback((id) => {
    setDesigns(prev => {
      const t = prev.find(d => d.id === id)
      if (t) URL.revokeObjectURL(t.url)
      return prev.filter(d => d.id !== id)
    })
    setActiveDesignId(prev => (prev === id ? null : prev))
  }, [])

  const updateDesign = useCallback((id, patch) => {
    setDesigns(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }, [])

  // Convenience setters for sliders (always target active design)
  const setActiveX     = useCallback((x)     => updateDesign(activeDesignId, { x }),     [activeDesignId, updateDesign])
  const setActiveY     = useCallback((y)     => updateDesign(activeDesignId, { y }),     [activeDesignId, updateDesign])
  const setActiveScale = useCallback((scale) => updateDesign(activeDesignId, { scale }), [activeDesignId, updateDesign])
  const setActiveSide  = useCallback((side)  => updateDesign(activeDesignId, { side }),  [activeDesignId, updateDesign])

  return (
    <ConfiguratorContext.Provider value={{
      color, setColor,
      size, setSize,
      modelId, setModelId,
      currentModel, currentScale,
      roughness, setRoughness,
      designs,
      activeDesignId, setActiveDesignId,
      activeDesign,
      addDesign, removeDesign, updateDesign,
      setActiveX, setActiveY, setActiveScale, setActiveSide,
      COLORS, SIZES, MODELS,
    }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}

export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext)
  if (!ctx) throw new Error('useConfigurator must be inside ConfiguratorProvider')
  return ctx
}
