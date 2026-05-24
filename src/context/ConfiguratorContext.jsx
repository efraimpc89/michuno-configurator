import { createContext, useContext, useState, useCallback } from 'react'

export const COLORS = [
  { name: 'Blanco',        hex: '#FFFFFF' },
  { name: 'Negro',         hex: '#1A1A1A' },
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

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [color, setColor]                 = useState('#FFFFFF')
  const [size, setSize]                   = useState('M')
  const [decalImageUrl, setDecalImageUrl] = useState(null)
  const [decalScale, setDecalScale]       = useState(0.15)
  const [decalX, setDecalX]               = useState(0)
  const [decalY, setDecalY]               = useState(0.05)

  const currentScale = (SIZES.find(s => s.label === size) ?? SIZES[1]).scale

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDecalImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }, [])

  return (
    <ConfiguratorContext.Provider value={{
      color, setColor,
      size, setSize,
      decalImageUrl,
      handleFileUpload,
      decalScale, setDecalScale,
      decalX, setDecalX,
      decalY, setDecalY,
      currentScale,
      COLORS,
      SIZES,
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
