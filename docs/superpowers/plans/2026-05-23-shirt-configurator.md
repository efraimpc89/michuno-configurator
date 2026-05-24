# Michuno Shirt Configurator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive 3D shirt configurator with color picker, size selector, and PNG decal upload using React Three Fiber.

**Architecture:** Vite+React SPA with a ConfiguratorContext managing global state (color, size, decal URL/scale/position). CanvasViewer renders the 3D scene (GLTF model + Decal overlay) and Sidebar provides the UI controls. State flows unidirectionally via context.

**Tech Stack:** Vite 5, React 18, Tailwind CSS 3, Three.js, @react-three/fiber, @react-three/drei

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `public/playera.glb` | Copy from Downloads | 3D shirt model |
| `public/_redirects` | Create | Netlify SPA routing |
| `src/context/ConfiguratorContext.jsx` | Create | Global state: color, size, decal |
| `src/components/CanvasViewer.jsx` | Create | R3F Canvas, GLTF model, Decal |
| `src/components/Sidebar.jsx` | Create | UI panel: colors, sizes, sliders |
| `src/App.jsx` | Overwrite | Mount provider + layout |
| `src/index.css` | Overwrite | Tailwind directives + full-height |
| `tailwind.config.js` | Create | Content paths for Tailwind |
| `postcss.config.js` | Create | Required by Tailwind |

---

## Task 1 — Scaffold Vite React Project

**Files:**
- Create: `C:\repo\michuno-configurator\` (Vite scaffold)

- [ ] **Step 1: Create Vite project**

```powershell
cd C:\repo
npm create vite@latest michuno-configurator -- --template react
cd michuno-configurator
```

Expected output: `Scaffolding project in michuno-configurator...  Done.`

- [ ] **Step 2: Copy GLB model to public/**

```powershell
Copy-Item "C:\Users\Efraim_Pena\Downloads\playera1.glb" "C:\repo\michuno-configurator\public\playera.glb"
```

Expected: File `public/playera.glb` exists (~20 MB).

- [ ] **Step 3: Verify scaffold**

```powershell
Get-ChildItem C:\repo\michuno-configurator
```

Expected: `node_modules` absent, `src/`, `public/`, `package.json`, `index.html` present.

---

## Task 2 — Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install R3F + Three.js**

```powershell
cd C:\repo\michuno-configurator
npm install three @react-three/fiber @react-three/drei
```

Expected: packages added to `node_modules/`.

- [ ] **Step 2: Install Tailwind**

```powershell
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 3: Configure tailwind.config.js**

Replace the full file content:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Verify install**

```powershell
node -e "require('three'); console.log('three OK')"
```

Expected: `three OK`

---

## Task 3 — ConfiguratorContext.jsx

**Files:**
- Create: `src/context/ConfiguratorContext.jsx`

- [ ] **Step 1: Create context directory and file**

Create `src/context/ConfiguratorContext.jsx` with full content:

```jsx
import { createContext, useContext, useState, useCallback } from 'react'

export const COLORS = [
  { name: 'Blanco',        hex: '#FFFFFF' },
  { name: 'Negro',         hex: '#1A1A1A' },
  { name: 'Gris Jaspe',    hex: '#B2B4B3' },
  { name: 'Azul Marino',   hex: '#1D2A44' },
  { name: 'Rojo',          hex: '#B31B1B' },
  { name: 'Verde Militar', hex: '#3B4436' },
  { name: 'Azul Rey',      hex: '#004B93' },
  { name: 'Arena / Beige', hex: '#D2C4B1' },
]

export const SIZES = [
  { label: 'CH', scale: [0.92, 0.94, 0.92] },
  { label: 'M',  scale: [1.0,  1.0,  1.0]  },
  { label: 'G',  scale: [1.08, 1.05, 1.08] },
  { label: 'XG', scale: [1.16, 1.10, 1.16] },
]

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [color, setColor]           = useState('#FFFFFF')
  const [size, setSize]             = useState('M')
  const [decalImageUrl, setDecalImageUrl] = useState(null)
  const [decalScale, setDecalScale] = useState(0.15)
  const [decalX, setDecalX]         = useState(0)
  const [decalY, setDecalY]         = useState(0.05)

  const currentScale = (SIZES.find(s => s.label === size) ?? SIZES[1]).scale

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (decalImageUrl) URL.revokeObjectURL(decalImageUrl)
    setDecalImageUrl(URL.createObjectURL(file))
  }, [decalImageUrl])

  return (
    <ConfiguratorContext.Provider value={{
      color, setColor,
      size, setSize,
      decalImageUrl,
      handleFileUpload,
      decalScale, setDecalScale,
      decalX, setDecalX,
      decalY, setDecalY,
      currentScale,
      COLORS,
      SIZES,
    }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}

export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext)
  if (!ctx) throw new Error('useConfigurator must be inside ConfiguratorProvider')
  return ctx
}
```

- [ ] **Step 2: Commit**

```powershell
cd C:\repo\michuno-configurator
git add src/context/ConfiguratorContext.jsx
git commit -m "feat: add ConfiguratorContext with colors, sizes and decal state"
```

---

## Task 4 — CanvasViewer.jsx

**Files:**
- Create: `src/components/CanvasViewer.jsx`

- [ ] **Step 1: Create CanvasViewer with full implementation**

Create `src/components/CanvasViewer.jsx`:

```jsx
import { useRef, useEffect, useMemo, Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Decal, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'

useGLTF.preload('/playera.glb')

function DecalLayer({ url, meshRef }) {
  const { decalScale, decalX, decalY } = useConfigurator()
  const texture = useTexture(url)

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    }
  }, [texture])

  return (
    <Decal
      mesh={meshRef}
      position={[decalX, decalY, 0.15]}
      rotation={[0, 0, 0]}
      scale={[decalScale, decalScale, decalScale]}
    >
      <meshStandardMaterial
        map={texture}
        transparent={true}
        alphaTest={0.05}
        depthTest={false}
        depthWrite={true}
        polygonOffset={true}
        polygonOffsetFactor={-4}
      />
    </Decal>
  )
}

function ShirtModel() {
  const { color, currentScale, decalImageUrl } = useConfigurator()
  const { scene } = useGLTF('/playera.glb')
  const meshRef = useRef(null)

  // Find main mesh synchronously on first load
  useMemo(() => {
    meshRef.current = null
    scene.traverse((child) => {
      if (child.isMesh && !meshRef.current) meshRef.current = child
    })
  }, [scene])

  // Apply material color reactively
  useEffect(() => {
    scene.traverse((child) => {
      if (!child.isMesh) return
      const mat = child.material.clone()
      mat.color.set(color)
      mat.roughness = 0.75
      mat.metalness = 0.0
      mat.needsUpdate = true
      child.material = mat
    })
  }, [color, scene])

  return (
    <group scale={currentScale}>
      <primitive object={scene} />
      <Suspense fallback={null}>
        {decalImageUrl && meshRef.current && (
          <DecalLayer url={decalImageUrl} meshRef={meshRef} />
        )}
      </Suspense>
    </group>
  )
}

export default function CanvasViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      shadows
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2, 1, 2]} intensity={0.5} />
      <directionalLight position={[0, -1, 2]} intensity={0.2} />
      <Suspense fallback={null}>
        <ShirtModel />
      </Suspense>
      <OrbitControls
        enableZoom
        minDistance={1.5}
        maxDistance={4}
        maxPolarAngle={Math.PI / 2}
        enablePan={false}
      />
    </Canvas>
  )
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/CanvasViewer.jsx
git commit -m "feat: add CanvasViewer with GLTF model, Decal and OrbitControls"
```

---

## Task 5 — Sidebar.jsx

**Files:**
- Create: `src/components/Sidebar.jsx`

- [ ] **Step 1: Create Sidebar with full UI**

Create `src/components/Sidebar.jsx`:

```jsx
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
        className="w-full accent-gray-800 h-1.5 rounded-full cursor-pointer"
      />
    </div>
  )
}

export default function Sidebar() {
  const {
    color, setColor,
    size, setSize,
    decalImageUrl, handleFileUpload,
    decalScale, setDecalScale,
    decalX, setDecalX,
    decalY, setDecalY,
    COLORS, SIZES,
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

        {/* Upload section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Diseño / Logo
          </h2>
          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 hover:bg-gray-100 border border-dashed border-gray-300 rounded-xl px-4 py-3 transition-colors text-sm text-gray-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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
                className={`
                  h-10 w-10 rounded-full transition-all duration-150 mx-auto block
                  border-2
                  ${color === c.hex
                    ? 'border-gray-800 scale-110 shadow-md'
                    : 'border-gray-200 hover:scale-105 hover:border-gray-400'
                  }
                  ${c.hex === '#FFFFFF' ? 'shadow-sm' : ''}
                `}
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
                className={`
                  py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                  ${size === s.label
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* Decal sliders — only shown when image is uploaded */}
        {decalImageUrl && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Ajustar diseño
            </h2>
            <SliderRow
              label="Tamaño"
              value={decalScale}
              min={0.05}
              max={0.50}
              step={0.01}
              onChange={setDecalScale}
            />
            <SliderRow
              label="Posición X (izq / der)"
              value={decalX}
              min={-0.20}
              max={0.20}
              step={0.01}
              onChange={setDecalX}
            />
            <SliderRow
              label="Posición Y (abajo / arriba)"
              value={decalY}
              min={-0.05}
              max={0.25}
              step={0.01}
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
```

- [ ] **Step 2: Commit**

```powershell
git add src/components/Sidebar.jsx
git commit -m "feat: add Sidebar with color picker, size selector and decal sliders"
```

---

## Task 6 — App.jsx + index.css + main.jsx

**Files:**
- Overwrite: `src/App.jsx`
- Overwrite: `src/index.css`
- Verify: `src/main.jsx`

- [ ] **Step 1: Overwrite App.jsx**

```jsx
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
```

- [ ] **Step 2: Overwrite index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

- [ ] **Step 3: Verify main.jsx imports index.css**

Ensure `src/main.jsx` contains:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: Commit**

```powershell
git add src/App.jsx src/index.css src/main.jsx
git commit -m "feat: wire up App layout and Tailwind CSS"
```

---

## Task 7 — Netlify _redirects

**Files:**
- Create: `public/_redirects`

- [ ] **Step 1: Create file**

```
/* /index.html 200
```

(Single line, no trailing newline issues.)

- [ ] **Step 2: Commit**

```powershell
git add public/_redirects
git commit -m "chore: add Netlify _redirects for SPA routing"
```

---

## Task 8 — Delete boilerplate, verify build

**Files:**
- Delete: `src/App.css`
- Delete: `src/assets/react.svg`
- Verify: `public/vite.svg` (keep for favicon)

- [ ] **Step 1: Remove boilerplate CSS and assets**

```powershell
Remove-Item "C:\repo\michuno-configurator\src\App.css" -ErrorAction SilentlyContinue
Remove-Item "C:\repo\michuno-configurator\src\assets\react.svg" -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Run dev server to verify no compile errors**

```powershell
cd C:\repo\michuno-configurator
npm run dev
```

Expected: `Local: http://localhost:5173/` — no errors in terminal.

- [ ] **Step 3: Run build to verify production bundle**

```powershell
npm run build
```

Expected: `dist/` created, no errors. Warnings about bundle size are acceptable.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: remove Vite boilerplate, verify build passes"
```

---

## Task 9 — Create GitHub Repo and Push

**Files:** none (git/GitHub operations)

- [ ] **Step 1: Create repo on GitHub via MCP**

Use GitHub MCP tool `create_repository` with:
- name: `michuno-configurator`
- description: `Configurador 3D interactivo de playeras — Michuno`
- private: false (or true if preferred)
- auto_init: false (we already have commits)

- [ ] **Step 2: Add remote and push**

```powershell
cd C:\repo\michuno-configurator
git remote add origin https://github.com/efraimpc89/michuno-configurator.git
git branch -M main
git push -u origin main
```

Expected: `Branch 'main' set up to track remote branch 'main' from 'origin'.`

- [ ] **Step 3: Verify on GitHub**

Confirm repo visible at `https://github.com/efraimpc89/michuno-configurator`

---

## Self-Review Checklist

- [x] Paleta 8 colores Eurocotton con nombres ✓
- [x] 4 tallas con scale proporcional exacto ✓
- [x] GLTF cargado con ruta absoluta `/playera.glb` ✓
- [x] roughness=0.75, metalness=0.0 ✓
- [x] OrbitControls con maxPolarAngle=PI/2, min/maxDistance ✓
- [x] Decal con sliders X/Y/scale acotados ✓
- [x] Input type=file con accept=image/* ✓
- [x] URL.createObjectURL + revokeObjectURL ✓
- [x] public/_redirects para Netlify ✓
- [x] Suspense boundary alrededor del Decal ✓
- [x] Ruta GLB absoluta `/playera.glb` (no relativa) ✓
- [x] Sin placeholders, código completo en cada task ✓
