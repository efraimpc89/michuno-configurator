import { useConfigurator } from '../context/ConfiguratorContext'

export default function ViewSelector() {
  const { activeView, setActiveView } = useConfigurator()

  const tabs = [
    { id: '3d', labelFull: 'Vista 3D Interactiva', labelShort: '3D' },
    { id: '2d', labelFull: 'Vista 2D',             labelShort: '2D' },
  ]

  return (
    <div className="absolute top-4 md:top-auto md:bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="flex gap-1 bg-white/70 backdrop-blur-sm rounded-full shadow-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={[
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200',
              activeView === tab.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/80',
            ].join(' ')}
          >
            <span className="hidden sm:inline">{tab.labelFull}</span>
            <span className="sm:hidden">{tab.labelShort}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
