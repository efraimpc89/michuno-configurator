import { useState } from 'react'
import { useConfigurator, SIZE_PRINT_CM, SIZE_SHIRT_CM } from '../context/ConfiguratorContext'

function SliderRow({ label, value, min, max, step, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <span className="text-xs text-gray-400 tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer accent-gray-800"
      />
    </div>
  )
}

export default function Sidebar({ isPanelOpen = true }) {
  const {
    color, setColor,
    size,  setSize,
    modelId, setModelId,
    roughness, setRoughness,
    designs, activeDesignId, setActiveDesignId, activeDesign,
    addDesign, removeDesign,
    setActiveX, setActiveY, setActiveScale, setActiveSide,
    showHandles, setShowHandles,
    bgColor, setBgColor,
    downloadFnRef,
    COLORS, SIZES, MODELS,
  } = useConfigurator()

  const [collapsed, setCollapsed] = useState(false)

  const selectedColorName = COLORS.find(c => c.hex === color)?.name ?? ''

  // Real-world cm readout for active design (matches DesignOverlay formula)
  const shirtCM = SIZE_SHIRT_CM[size] ?? 50.8
  const wCm = activeDesign ? ((activeDesign.scale / 0.90) * shirtCM).toFixed(1) : null
  const hCm = wCm ? (parseFloat(wCm) / (activeDesign.aspectRatio || 1)).toFixed(1) : null

  const handleFiles = (e) => {
    Array.from(e.target.files || []).forEach(addDesign)
    e.target.value = ''
  }

  const onHandlePointerDown = (e) => {
    e.stopPropagation()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const startY = e.clientY
    let moved = false
    const handleMove = (evt) => {
      const delta = evt.clientY - startY
      if (Math.abs(delta) > 5) moved = true
      if (delta > 30)  setCollapsed(true)
      if (delta < -30) setCollapsed(false)
    }
    const handleUp = () => {
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerup',   handleUp)
      if (!moved) setCollapsed(c => !c)
    }
    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerup',   handleUp)
  }

  return (
    <aside
      onPointerDown={(e) => e.stopPropagation()}
      className={[
        'fixed bottom-0 left-0 w-full',
        'md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-80 md:h-full',
        'bg-white shadow-2xl z-10 flex flex-col',
        'rounded-t-2xl md:rounded-none',
        'overflow-hidden md:overflow-y-auto',
        'transition-[transform,max-height] duration-300 ease-in-out',
        collapsed ? 'max-h-[56px]' : 'max-h-[72vh]',
        'md:max-h-full',
        isPanelOpen ? 'md:translate-x-0' : 'md:translate-x-full',
      ].join(' ')}
    >
      {/* Mobile drag handle */}
      <div
        className="relative z-10 flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0 cursor-grab active:cursor-grabbing"
        onPointerDown={onHandlePointerDown}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="px-4 pt-3 pb-3 md:pt-6 md:pb-4 border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
        <img src="/logo1.png" alt="Michuno" className="h-9 w-9 object-contain flex-shrink-0" />
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">Michuno&#174;</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mock-up Playeras</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-5 overflow-y-auto">

        {/* ── Modelo ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Modelo</h2>
          <div className="flex gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModelId(m.id)}
                className={[
                  'flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150',
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

        {/* ── Diseños / Logos ─────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Diseños / Logos</h2>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 hover:border-gray-400 rounded-xl px-4 py-2.5 transition-colors text-sm text-gray-600 mb-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Subir PNG (múltiples)
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          </label>

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
                  <img src={d.url} alt="" className="h-9 w-9 object-contain rounded-lg bg-white border border-gray-200 flex-shrink-0" />
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

        {/* ── Ajustar diseño activo ────────────────────────────── */}
        {activeDesign && (
          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ajustar diseño</h2>
              {wCm && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full tabular-nums">
                  {wCm} × {hCm} cm
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">Arrastra el logo en el visor para moverlo</p>

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

            <SliderRow label="Tamaño"     value={activeDesign.scale} min={0.05} max={0.80} step={0.01} onChange={setActiveScale} />
            <SliderRow label="Pos. X ← →" value={activeDesign.x}     min={-0.45} max={0.45} step={0.005} onChange={setActiveX} />
            <SliderRow label="Pos. Y ↓ ↑" value={activeDesign.y}     min={-0.70} max={0.70} step={0.005} onChange={setActiveY} />

            <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={showHandles}
                onChange={(e) => setShowHandles(e.target.checked)}
                className="w-3.5 h-3.5 accent-gray-800 cursor-pointer"
              />
              <span className="text-xs text-gray-600">Mostrar esquinas y medidas</span>
            </label>
          </section>
        )}

        {/* ── Color ───────────────────────────────────────────── */}
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
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <span className="text-xs text-gray-600 font-medium flex-shrink-0">Color libre</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
            />
            <span className="text-xs text-gray-400 tabular-nums font-mono">
              {selectedColorName || color}
            </span>
          </label>
        </section>

        {/* ── Talla ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Talla</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setSize(s.label)}
                className={[
                  'py-2 rounded-xl text-sm font-semibold transition-all duration-150',
                  size === s.label
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
          {wCm && (
            <p className="text-xs text-gray-400 mt-1.5">
              Área imprimible talla {size}: ~{SIZE_PRINT_CM[size]} cm ancho
            </p>
          )}
        </section>

        {/* ── Material ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Material</h2>
          <SliderRow
            label="Rugosidad de la Tela"
            value={roughness}
            min={0.5} max={1.0} step={0.01}
            onChange={setRoughness}
          />
        </section>

        {/* ── Fondo de Estudio ────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Fondo de Estudio</h2>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => setBgColor(c.hex)}
                className={[
                  'h-8 w-8 rounded-full transition-all duration-150 mx-auto block border-2',
                  bgColor === c.hex
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-gray-200 hover:scale-105 hover:border-gray-400',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-600 font-medium flex-shrink-0">Color libre</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white flex-shrink-0"
            />
            <span className="text-xs text-gray-400 tabular-nums font-mono">{bgColor}</span>
          </label>
        </section>

        {/* ── Descargar Imagen ────────────────────────────── */}
        <section>
          <button
            onClick={() => downloadFnRef.current?.()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 hover:bg-gray-700 active:scale-95 text-white text-sm font-semibold rounded-2xl transition-all duration-150 shadow-md"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Imagen
          </button>
        </section>

      </div>

      <div className="hidden md:block px-5 py-4 border-t border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-300 text-center">Michuno.com.mx · 2026</p>
      </div>
    </aside>
  )
}
