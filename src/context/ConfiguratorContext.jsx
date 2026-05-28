import { createContext, useContext, useState, useCallback, useRef } from 'react'

export const COLORS = [
  { name: 'Negro Reactivo', hex: '#181818' },
  { name: 'Gris Jaspe',     hex: '#9DA1A2' },
  { name: 'Gris Carbón',    hex: '#4A4D4E' },
  { name: 'Azul Marino',    hex: '#192231' },
  { name: 'Azul Rey',       hex: '#10417A' },
  { name: 'Rojo Oxford',    hex: '#80121A' },
  { name: 'Verde Militar',  hex: '#3E4437' },
  { name: 'Chocolate',      hex: '#3D2F2A' },
  { name: 'Beige Arena',    hex: '#CEBDA5' },
]

// Real Euro Cotton proportions (width × height in cm):
//   CH 45.7×70.5 | M 50.8×73.0 | G 55.9×75.6 | XG 61.0×78.1
// Scale factors derived from M baseline (width/50.8, height/73.0).
export const SIZES = [
  { label: 'CH', scale: [0.90, 0.97, 0.90] },
  { label: 'M',  scale: [1.00, 1.00, 1.00] },
  { label: 'G',  scale: [1.10, 1.04, 1.10] },
  { label: 'XG', scale: [1.20, 1.07, 1.20] },
]

export const MODELS = [
  { id: 'playera1', name: 'Playera Clásica', path: '/playera.glb'  },
  { id: 'playera2', name: 'Oversize',        path: '/playera2.glb' },
  { id: 'polo',     name: 'Polo',            path: '/polo.glb'     },
]

// Full seam-to-seam shirt width per size (cm) — drives cm readouts so that
// a logo at scale ≈ 0.45 on an M shirt correctly reads ~25 cm (half of 50.8).
export const SIZE_SHIRT_CM  = { CH: 45.7, M: 50.8, G: 55.9, XG: 61.0 }

// Printable safe area per size (cm) — used only for the sidebar hint text.
export const SIZE_PRINT_CM  = { CH: 34,   M: 38,   G: 42,   XG: 46   }

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [color,       setColor]       = useState('#181818')
  const [size,        setSize]        = useState('M')
  const [modelId,     setModelId]     = useState('playera1')
  const [roughness,   setRoughness]   = useState(1.00)
  const [view2DSide,  setView2DSide]  = useState('frente')
  const [showHandles, setShowHandles] = useState(false)
  const [bgColor,     setBgColor]     = useState('#3a3835')

  // Written by CanvasViewer when model loads, read by DesignOverlay for projection math
  const frontZRef = useRef(0.22)

  // Set by CanvasViewer's DownloadCapture (inside R3F Canvas); called by Sidebar button
  const downloadFnRef = useRef(null)

  const [designs,        setDesigns]        = useState([])
  const [activeDesignId, setActiveDesignId] = useState(null)

  const currentScale = (SIZES.find(s => s.label === size)    ?? SIZES[1]).scale
  const currentModel = (MODELS.find(m => m.id   === modelId) ?? MODELS[0])
  const activeDesign = designs.find(d => d.id === activeDesignId) ?? null

  const addDesign = useCallback((file) => {
    const url = URL.createObjectURL(file)
    const id  = `d-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    const img = new Image()
    img.onload = () => {
      const aspectRatio = (img.naturalWidth / img.naturalHeight) || 1
      setDesigns(prev => [...prev, { id, url, x: 0, y: 0.25, scale: 0.30, aspectRatio, side: 'frente' }])
      setActiveDesignId(id)
    }
    img.src = url
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

  const setActiveX     = useCallback((x)     => updateDesign(activeDesignId, { x }),     [activeDesignId, updateDesign])
  const setActiveY     = useCallback((y)     => updateDesign(activeDesignId, { y }),     [activeDesignId, updateDesign])
  const setActiveScale = useCallback((scale) => updateDesign(activeDesignId, { scale }), [activeDesignId, updateDesign])
  const setActiveSide  = useCallback((side)  => {
    updateDesign(activeDesignId, { side })
    setView2DSide(side)
  }, [activeDesignId, updateDesign])

  return (
    <ConfiguratorContext.Provider value={{
      color, setColor,
      size,  setSize,
      modelId, setModelId,
      currentModel, currentScale,
      roughness, setRoughness,
      designs,
      activeDesignId, setActiveDesignId,
      activeDesign,
      addDesign, removeDesign, updateDesign,
      setActiveX, setActiveY, setActiveScale, setActiveSide,
      view2DSide, setView2DSide,
      showHandles, setShowHandles,
      bgColor, setBgColor,
      frontZRef,
      downloadFnRef,
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
