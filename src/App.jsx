import { useState, useEffect } from 'react'
import { useProgress } from '@react-three/drei'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import CanvasViewer from './components/CanvasViewer'
import Sidebar from './components/Sidebar'
import ViewSelector from './components/ViewSelector'
import DesignOverlay from './components/DesignOverlay'

function LoadingScreen() {
  const { progress, active } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!active) {
      const t = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(t)
    }
  }, [active])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#3a3835]"
      style={{ opacity: active ? 1 : 0, transition: 'opacity 0.4s ease' }}
    >
      <img src="/favicon.png" alt="" className="h-12 w-12 object-contain mb-6 opacity-80" />
      <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-white/40 text-xs mt-2 tabular-nums">{Math.round(progress)}%</p>
    </div>
  )
}

export default function App() {
  return (
    <ConfiguratorProvider>
      <div className="h-screen w-screen overflow-hidden relative">
        <div className="absolute inset-0">
          <CanvasViewer />
          <DesignOverlay />
          <ViewSelector />
        </div>
        <Sidebar />
        <LoadingScreen />
      </div>
    </ConfiguratorProvider>
  )
}
