import { ConfiguratorProvider } from './context/ConfiguratorContext'
import CanvasViewer from './components/CanvasViewer'
import Sidebar from './components/Sidebar'

export default function App() {
  return (
    <ConfiguratorProvider>
      {/*
        Mobile: canvas fills the whole screen, sidebar slides up from bottom.
        Desktop (md+): canvas fills all remaining space beside the sidebar.
      */}
      <div className="h-screen w-screen overflow-hidden relative" style={{ touchAction: 'none' }}>
        {/* Canvas always behind everything — takes full viewport */}
        <div className="absolute inset-0">
          <CanvasViewer />
        </div>
        <Sidebar />
      </div>
    </ConfiguratorProvider>
  )
}
