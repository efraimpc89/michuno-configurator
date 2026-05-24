import { ConfiguratorProvider } from './context/ConfiguratorContext'
import CanvasViewer from './components/CanvasViewer'
import Sidebar from './components/Sidebar'

export default function App() {
  return (
    <ConfiguratorProvider>
      <div className="h-screen w-screen overflow-hidden bg-gray-100 relative">
        <CanvasViewer />
        <Sidebar />
      </div>
    </ConfiguratorProvider>
  )
}
