import { useConfigurator } from '../context/ConfiguratorContext'

function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <span className="text-xs text-gray-400 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer accent-gray-800"
      />
    </div>
  )
}

export default function Sidebar() {
  const {
    color, setColor,
    size, setSize,
    modelId, setModelId,
    decalImageUrl, handleFileUpload,
    decalScale, setDecalScale,
    decalX, setDecalX,
    decalY, setDecalY,
    COLORS, SIZES, MODELS,
  } = useConfigurator()

  const selectedColorName = COLORS.find(c => c.hex === color)?.name ?? ''

  return (
    <aside className="fixed right-0 top-0 h-full w-72 bg-white shadow-2xl overflow-y-auto flex flex-col z-10">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Michuno</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configurador 3D</p>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-6">

        {/* Model selector */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Modelo
          </h2>
          <div className="flex flex-col gap-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModelId(m.id)}
                className={[
                  'py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 text-left',
                  modelId === m.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {m.name}
              </button>
            ))}
          </div>
        </section>

        {/* Upload section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Diseño / Logo
          </h2>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 rounded-xl px-4 py-3 transition-colors text-sm text-gray-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Subir PNG transparente
            <input
              type="file"
              accept="image/png,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          {decalImageUrl && (
            <div className="mt-3 flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <img
                src={decalImageUrl}
                alt="preview"
                className="h-12 w-12 object-contain rounded-lg border border-gray-200 bg-white"
              />
              <span className="text-xs text-gray-500">Vista previa</span>
            </div>
          )}
        </section>

        {/* Color picker */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Color
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => setColor(c.hex)}
                className={[
                  'h-10 w-10 rounded-full transition-all duration-150 mx-auto block border-2',
                  color === c.hex
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-gray-200 hover:scale-105 hover:border-gray-400',
                  c.hex === '#FFFFFF' ? 'shadow-sm' : '',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          {selectedColorName && (
            <p className="text-xs text-gray-400 mt-2 text-center">{selectedColorName}</p>
          )}
        </section>

        {/* Size selector */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Talla
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setSize(s.label)}
                className={[
                  'py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                  size === s.label
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Decal adjustment — visible only when image is loaded */}
        {decalImageUrl && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Ajustar diseño
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Arrastra el logo en 3D para moverlo
            </p>
            <SliderRow
              label="Tamaño"
              value={decalScale}
              min={0.05}
              max={0.80}
              step={0.01}
              onChange={setDecalScale}
            />
            <SliderRow
              label="Posición X  ←  →"
              value={decalX}
              min={-0.45}
              max={0.45}
              step={0.005}
              onChange={setDecalX}
            />
            <SliderRow
              label="Posición Y  ↓  ↑"
              value={decalY}
              min={-0.70}
              max={0.70}
              step={0.005}
              onChange={setDecalY}
            />
          </section>
        )}

      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-300 text-center">michuno.mx · 2026</p>
      </div>
    </aside>
  )
}
