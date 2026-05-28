import { useState, useEffect } from 'react'
import { useProgress } from '@react-three/drei'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import CanvasViewer from './components/CanvasViewer'
import Sidebar from './components/Sidebar'
import ViewSelector from './components/ViewSelector'
import DesignOverlay from './components/DesignOverlay'
import SceneOverlay from './components/SceneOverlay'

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
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <ConfiguratorProvider>
      <div className="h-screen w-screen overflow-hidden relative">

        {/* Full-viewport canvas layer */}
        <div className="absolute inset-0">
          <CanvasViewer />
          <DesignOverlay />
          <ViewSelector />
          <SceneOverlay isPanelOpen={isPanelOpen} />
        </div>

        {/*
          Desktop/tablet panel toggle.
          Hidden on mobile — the drag handle in Sidebar handles mobile collapse.
          Tracks the sidebar left-edge: right=320px when open, right=0 when closed.
          44×44 px touch target meets Apple HIG minimum.
        */}
        <button
          onClick={() => setIsPanelOpen(v => !v)}
          style={{
            right: isPanelOpen ? '320px' : '0',
            transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="hidden md:flex fixed z-20 top-1/2 -translate-y-1/2
                     w-11 h-11 items-center justify-center
                     bg-white/90 backdrop-blur-sm
                     rounded-l-2xl shadow-lg
                     border border-r-0 border-gray-200/80
                     text-gray-500 hover:text-gray-800 hover:bg-gray-50
                     active:scale-95"
          aria-label={isPanelOpen ? 'Ocultar configuración' : 'Mostrar configuración'}
        >
          {isPanelOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        <Sidebar isPanelOpen={isPanelOpen} />
        <LoadingScreen />
      </div>
    </ConfiguratorProvider>
  )
}
