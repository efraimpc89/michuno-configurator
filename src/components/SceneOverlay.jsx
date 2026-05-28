import { useConfigurator } from '../context/ConfiguratorContext'

export default function SceneOverlay({ isPanelOpen = true }) {
  const { activeView, view2DSide, snapCameraToSide } = useConfigurator()

  if (activeView !== '3d') return null

  return (
    <div
      className={[
        'absolute top-4 z-20 pointer-events-none',
        isPanelOpen ? 'right-4 md:right-[336px]' : 'right-4',
      ].join(' ')}
      style={{ transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="flex gap-1 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/15 pointer-events-auto">
        {[
          { id: 'frente',  label: 'Frente'  },
          { id: 'espalda', label: 'Espalda' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => snapCameraToSide(id)}
            className={[
              'rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200',
              view2DSide === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-white/60 hover:text-white/90',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
