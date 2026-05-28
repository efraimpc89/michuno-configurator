import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import CanvasViewer from './components/CanvasViewer'
import DesignOverlay from './components/DesignOverlay'
import SceneOverlay from './components/SceneOverlay'
import Sidebar from './components/Sidebar'

export default function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <ConfiguratorProvider>
      <div className="h-screen w-screen overflow-hidden relative">

        {/* Full-viewport 3D canvas + 2D overlay */}
        <div className="absolute inset-0">
          <CanvasViewer />
          <DesignOverlay />
          <SceneOverlay isPanelOpen={isPanelOpen} />
        </div>

        {/* Desktop/tablet panel toggle — 44×44 px touch target */}
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
      </div>
    </ConfiguratorProvider>
  )
}
