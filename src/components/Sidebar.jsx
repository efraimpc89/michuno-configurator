import { useConfigurator } from '../context/ConfiguratorContext'

function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div className="mb-3">
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
    size,  setSize,
    modelId, setModelId,
    roughness, setRoughness,
    designs, activeDesignId, setActiveDesignId, activeDesign,
    addDesign, removeDesign,
    setActiveX, setActiveY, setActiveScale, setActiveSide,
    COLORS, SIZES, MODELS,
  } = useConfigurator()

  const selectedColorName = COLORS.find(c => c.hex === color)?.name ?? ''

  const handleFiles = (e) => {
    Array.from(e.target.files || []).forEach(addDesign)
    e.target.value = ''
  }

  return (
    /*
     * Mobile: fixed bottom sheet (max 45vh, rounded top)
     * Desktop (md+): fixed right panel, full height
     */
    <aside className="
      fixed bottom-0 left-0 w-full
      md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-80 md:h-full
      bg-white shadow-2xl z-10 flex flex-col
      rounded-t-2xl md:rounded-none
      max-h-[48vh] md:max-h-full
      overflow-y-auto
    ">

      {/* Drag handle — only on mobile */}
      <div className="flex justify-center pt-2.5 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 md:pt-6 md:pb-4 border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
        <img src="/favicon.png" alt="Michuno" className="h-9 w-9 object-contain flex-shrink-0" />
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">Michuno</h1>
          <p className="text-xs text-gray-400 mt-0.5">Configurador 3D</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-5 overflow-y-auto">

        {/* ── Model selector ─────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Modelo</h2>
          <div className="flex gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModelId(m.id)}
                className={[
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
                  modelId === m.id ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {m.name}
              </button>
            ))}
          </div>
        </section>

        {/* ── Diseños / Logos ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Diseños / Logos</h2>

          {/* Upload button */}
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 rounded-xl px-4 py-2.5 transition-colors text-sm text-gray-600 mb-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Subir PNG (múltiples)
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>

          {/* Design thumbnail list */}
          {designs.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {designs.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setActiveDesignId(d.id)}
                  className={[
                    'flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer border-2 transition-all select-none',
                    activeDesignId === d.id
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100',
                  ].join(' ')}
                >
                  <img
                    src={d.url}
                    alt=""
                    className="h-9 w-9 object-contain rounded-lg bg-white border border-gray-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={[
                      'inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      d.side === 'frente' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700',
                    ].join(' ')}>
                      {d.side === 'frente' ? 'F' : 'E'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDesign(d.id) }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none flex-shrink-0 px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Ajustar diseño activo ──────────────────────────────── */}
        {activeDesign && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Ajustar diseño</h2>
            <p className="text-xs text-gray-400 mb-2">Arrastra el logo en 3D para moverlo</p>

            {/* Side toggle */}
            <div className="mb-3">
              <span className="text-xs text-gray-600 font-medium block mb-1.5">Lado</span>
              <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-gray-200">
                {['frente', 'espalda'].map(side => (
                  <button
                    key={side}
                    onClick={() => setActiveSide(side)}
                    className={[
                      'py-1.5 text-xs font-semibold capitalize transition-all',
                      activeDesign.side === side
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>

            <SliderRow label="Tamaño"       value={activeDesign.scale} min={0.05} max={0.80} step={0.01}  onChange={setActiveScale} />
            <SliderRow label="Pos. X  ←  →" value={activeDesign.x}     min={-0.45} max={0.45} step={0.005} onChange={setActiveX} />
            <SliderRow label="Pos. Y  ↓  ↑" value={activeDesign.y}     min={-0.70} max={0.70} step={0.005} onChange={setActiveY} />
          </section>
        )}

        {/* ── Color ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Color</h2>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => setColor(c.hex)}
                className={[
                  'h-8 w-8 rounded-full transition-all duration-150 mx-auto block border-2',
                  color === c.hex
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-gray-200 hover:scale-105 hover:border-gray-400',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          {selectedColorName && (
            <p className="text-xs text-gray-400 mt-1.5 text-center">{selectedColorName}</p>
          )}
        </section>

        {/* ── Talla ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Talla</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setSize(s.label)}
                className={[
                  'py-2 rounded-xl text-sm font-semibold transition-all duration-150',
                  size === s.label ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Material ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Material</h2>
          <SliderRow
            label="Rugosidad de la Tela"
            value={roughness}
            min={0.5}
            max={1.0}
            step={0.01}
            onChange={setRoughness}
          />
        </section>

      </div>

      {/* Footer — hidden on mobile to save space */}
      <div className="hidden md:block px-5 py-4 border-t border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-300 text-center">michuno.mx · 2026</p>
      </div>
    </aside>
  )
}
