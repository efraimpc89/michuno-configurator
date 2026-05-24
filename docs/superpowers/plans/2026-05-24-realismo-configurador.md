# Realismo y Control — Configurador Michuno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actualizar el configurador 3D de playeras Michuno con decals fotorrealistas que heredan mapas PBR de la playera, pills de vista Frente/Espalda con animación lerp, sistema de fondo dinámico con 9 swatches + RGB picker, e iluminación de 3 puntos con rim light.

**Architecture:** Nuevo `SceneOverlay.jsx` para el HUD del canvas, hook `useMaterialMaps` que extrae normalMap/roughnessMap/aoMap del mesh GLB, `bgColor` y `snapCameraToSide` añadidos al context, iluminación reemplazada por sistema 3 puntos. SingleDecal migra de `meshBasicMaterial` a `meshStandardMaterial` heredando los mapas de la playera.

**Tech Stack:** React 19, React Three Fiber v9, @react-three/drei v10, Three.js 0.184, Tailwind CSS 4, Vite 8.

**Spec:** `docs/superpowers/specs/2026-05-24-realismo-configurador-design.md`

---

## File Map

| Acción | Archivo | Responsabilidad del cambio |
|--------|---------|---------------------------|
| Crear  | `src/hooks/useMaterialMaps.js` | Extrae mapas PBR del mesh GLB |
| Crear  | `src/components/SceneOverlay.jsx` | Pills Frente/Espalda sobre el canvas |
| Modificar | `src/context/ConfiguratorContext.jsx` | Añade `bgColor`/`setBgColor` y `snapCameraToSide` |
| Modificar | `src/components/CanvasViewer.jsx` | Integra hook, fondo dinámico, luces 3 puntos |
| Modificar | `src/components/Sidebar.jsx` | Sección Fondo de Estudio |
| Modificar | `src/App.jsx` | Monta `<SceneOverlay />` |

---

## Task 0: Checkpoint de Seguridad

**Files:**
- (ninguno — solo git)

- [ ] **Crear rama de respaldo**

```bash
cd C:\repo\michuno-configurator
git branch backup-pre-realismo
git branch
```

Esperado: la rama `backup-pre-realismo` aparece en la lista. `main` sigue siendo la rama activa.

- [ ] **Verificar que el dev server arranca limpio antes de tocar nada**

```bash
npm run dev
```

Abrir `http://localhost:5173`. Verificar que carga la playera 3D y los logos funcionan. Cerrar con Ctrl+C.

---

## Task 1: Context — bgColor y snapCameraToSide

**Files:**
- Modify: `src/context/ConfiguratorContext.jsx`

- [ ] **Añadir estado bgColor**

En `ConfiguratorContext.jsx`, dentro de `ConfiguratorProvider`, después de la línea `const [showHandles, setShowHandles] = useState(false)`, añadir:

```js
const [bgColor, setBgColor] = useState('#3a3835')
```

- [ ] **Añadir función snapCameraToSide**

Después de la función `setActiveSide`, añadir:

```js
const snapCameraToSide = useCallback((side) => {
  setView2DSide(side)
  cameraAnimRef.current = { z: side === 'espalda' ? -2.5 : 2.5, framesLeft: 50 }
}, [])
```

- [ ] **Exportar los nuevos valores en el provider**

En el objeto `value` del `ConfiguratorContext.Provider`, añadir junto a los existentes:

```js
bgColor, setBgColor,
snapCameraToSide,
```

El bloque `value` completo debe quedar así (añadir las 3 líneas marcadas con `// ← nuevo`):

```js
<ConfiguratorContext.Provider value={{
  color, setColor,
  size, setSize,
  modelId, setModelId,
  currentModel, currentScale,
  roughness, setRoughness,
  designs,
  activeDesignId, setActiveDesignId,
  activeDesign,
  addDesign, removeDesign, updateDesign,
  setActiveX, setActiveY, setActiveScale, setActiveSide,
  activeView, setActiveView,
  view2DSide,
  showHandles, setShowHandles,
  frontZRef, cameraAnimRef,
  bgColor, setBgColor,          // ← nuevo
  snapCameraToSide,             // ← nuevo
  COLORS, SIZES, MODELS,
}}>
```

- [ ] **Commitear**

```bash
git add src/context/ConfiguratorContext.jsx
git commit -m "feat: add bgColor state and snapCameraToSide to context"
```

---

## Task 2: Hook useMaterialMaps

**Files:**
- Create: `src/hooks/useMaterialMaps.js`

- [ ] **Crear el directorio si no existe y escribir el hook**

Crear `src/hooks/useMaterialMaps.js` con este contenido exacto:

```js
import { useMemo } from 'react'

export function useMaterialMaps(mesh) {
  return useMemo(() => {
    const empty = { normalMap: null, roughnessMap: null, aoMap: null }
    if (!mesh) return empty
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
    if (!mat) return empty
    return {
      normalMap:    mat.normalMap    ?? null,
      roughnessMap: mat.roughnessMap ?? null,
      aoMap:        mat.aoMap        ?? null,
    }
  }, [mesh])
}
```

**Qué hace:** recibe el mesh principal de la playera (el `bestMesh` que ya calcula `ShirtModel`). Extrae los tres mapas PBR del material clonado. Si el GLB no los tiene, devuelve `null` en cada campo — fallback silencioso, nunca lanza error.

- [ ] **Verificar que el archivo existe y no tiene errores de sintaxis**

```bash
node -e "require('./src/hooks/useMaterialMaps.js')" 2>&1
```

Esperado: sin output de error (o un error de `require` de módulo ES — aceptable, el archivo existe y Vite lo compilará).

- [ ] **Commitear**

```bash
git add src/hooks/useMaterialMaps.js
git commit -m "feat: add useMaterialMaps hook for PBR map extraction"
```

---

## Task 3: CanvasViewer — Integrar useMaterialMaps en CanvasViewer

**Files:**
- Modify: `src/components/CanvasViewer.jsx`

- [ ] **Importar el hook**

En la línea 1 del bloque de imports de `CanvasViewer.jsx`, añadir después del import de ConfiguratorContext:

```js
import { useMaterialMaps } from '../hooks/useMaterialMaps'
```

- [ ] **Llamar al hook en CanvasViewer y pasar materialMaps a SingleDecal**

En la función `CanvasViewer` (el export default), después de la línea `const [frontZ, setFrontZ] = useState(0.22)`, añadir:

```js
const { normalMap, roughnessMap, aoMap } = useMaterialMaps(mainMesh)
```

Luego, en el `designs.map(...)` que renderiza cada `<SingleDecal>`, añadir la prop `materialMaps`:

```jsx
{designs.map(design => (
  <SingleDecal
    key={`${currentModel.id}-${design.id}`}
    design={design}
    isDraggingRef={isDraggingRef}
    frontZ={frontZ}
    materialMaps={{ normalMap, roughnessMap, aoMap }}
  />
))}
```

- [ ] **Commitear**

```bash
git add src/components/CanvasViewer.jsx
git commit -m "feat: wire useMaterialMaps into CanvasViewer, pass to SingleDecal"
```

---

## Task 4: SingleDecal — meshStandardMaterial con mapas PBR

**Files:**
- Modify: `src/components/CanvasViewer.jsx` (función `SingleDecal`)

- [ ] **Actualizar la firma de SingleDecal para aceptar materialMaps**

Cambiar la firma de la función `SingleDecal` de:

```js
function SingleDecal({ design, isDraggingRef, frontZ }) {
```

a:

```js
function SingleDecal({ design, isDraggingRef, frontZ, materialMaps = {} }) {
```

Inmediatamente después de la línea, destructurar los mapas:

```js
const { normalMap = null, roughnessMap = null, aoMap = null } = materialMaps
```

- [ ] **Reemplazar el material del mesh**

Encontrar el bloque `<mesh>` que contiene `<meshBasicMaterial ...>` dentro de `SingleDecal` y reemplazar **solo** el elemento `<meshBasicMaterial .../>` por:

```jsx
<meshStandardMaterial
  map={texture}
  normalMap={normalMap}
  roughnessMap={roughnessMap}
  aoMap={aoMap}
  roughness={0.85}
  metalness={0.0}
  envMapIntensity={0.4}
  transparent
  alphaTest={0.05}
  depthWrite={false}
  polygonOffset
  polygonOffsetFactor={-4}
  polygonOffsetUnits={-4}
/>
```

El `<mesh>` y `<planeGeometry>` no cambian. El resultado final del return de SingleDecal:

```jsx
return (
  <mesh
    position={[design.x, design.y + MODEL_Y, pz]}
    rotation={[0, isFront ? 0 : Math.PI, 0]}
    renderOrder={10}
    onPointerDown={startDrag}
    onPointerEnter={() => { if (!isDraggingRef.current) document.body.style.cursor = 'grab' }}
    onPointerLeave={() => { if (!isDraggingRef.current) document.body.style.cursor = '' }}
  >
    <planeGeometry args={[design.scale, design.scale / (design.aspectRatio || 1)]} />
    <meshStandardMaterial
      map={texture}
      normalMap={normalMap}
      roughnessMap={roughnessMap}
      aoMap={aoMap}
      roughness={0.85}
      metalness={0.0}
      envMapIntensity={0.4}
      transparent
      alphaTest={0.05}
      depthWrite={false}
      polygonOffset
      polygonOffsetFactor={-4}
      polygonOffsetUnits={-4}
    />
  </mesh>
)
```

- [ ] **Verificar en dev server**

```bash
npm run dev
```

Abrir `http://localhost:5173`. Subir un PNG como logo. El logo debe:
- Seguir siendo visible
- Verse ligeramente más integrado con la iluminación de la escena (ya no es un parche plano neutro)
- No tener bordes raros ni artefactos

Si el GLB tiene normalMap: los pliegues de la tela se proyectarán levemente sobre el logo.
Si el GLB no tiene normalMap: el logo se ve idéntico al anterior pero reacciona a la iluminación — eso es correcto.

- [ ] **Commitear**

```bash
git add src/components/CanvasViewer.jsx
git commit -m "feat: upgrade SingleDecal to meshStandardMaterial with PBR maps"
```

---

## Task 5: CanvasViewer — Fondo Dinámico y ContactShadows Adaptativo

**Files:**
- Modify: `src/components/CanvasViewer.jsx`

- [ ] **Añadir función hexLuminance**

Justo antes de la función `SingleDecal` (al inicio del archivo, después de los imports), añadir esta función pura:

```js
function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
```

- [ ] **Conectar bgColor al Canvas**

En `CanvasViewer`, añadir `bgColor` al destructuring de `useConfigurator`:

```js
const { designs, activeDesign, currentModel, activeView, showHandles, frontZRef, bgColor } = useConfigurator()
```

Calcular la opacidad adaptativa justo después:

```js
const shadowOpacity = hexLuminance(bgColor) >= 0.4 ? 0.22 : 0.45
```

- [ ] **Reemplazar color de fondo fijo y ContactShadows**

Encontrar dentro del `<Canvas>`:

```jsx
<color attach="background" args={['#3a3835']} />
```

Reemplazar por:

```jsx
<color attach="background" args={[bgColor]} />
```

Encontrar:

```jsx
<ContactShadows position={[0, -0.55, 0]} opacity={0.45} scale={4} blur={2.5} />
```

Reemplazar por:

```jsx
<ContactShadows position={[0, -0.55, 0]} opacity={shadowOpacity} scale={4} blur={2.5} />
```

- [ ] **Verificar en dev server**

```bash
npm run dev
```

El fondo debe ser el mismo `#3a3835` (sin cambio visual todavía — el control de Sidebar viene en Task 9). Confirmar que no hay errores de consola.

- [ ] **Commitear**

```bash
git add src/components/CanvasViewer.jsx
git commit -m "feat: dynamic canvas background and adaptive ContactShadows opacity"
```

---

## Task 6: CanvasViewer — Iluminación de 3 Puntos

**Files:**
- Modify: `src/components/CanvasViewer.jsx`

- [ ] **Reemplazar el bloque de luces**

Dentro del `<Canvas>`, encontrar el bloque actual de 5 luces:

```jsx
<ambientLight intensity={0.35} />
<directionalLight position={[2, 4, 3]} intensity={0.55} castShadow shadow-mapSize={[1024, 1024]} />
<directionalLight position={[-2, 1, 2]} intensity={0.25} />
<directionalLight position={[0, 1, -3]} intensity={0.15} />
<directionalLight position={[0, -1, 1]} intensity={0.08} />
```

Reemplazar **exactamente** ese bloque por:

```jsx
<ambientLight intensity={0.30} />
<directionalLight
  position={[3, 5, 3]}
  intensity={0.70}
  castShadow
  shadow-mapSize={[2048, 2048]}
  shadow-bias={-0.0003}
/>
<directionalLight position={[-3, 2, 2]} intensity={0.30} />
<directionalLight position={[0, 3, -4]} intensity={0.20} />
```

**Qué cambia y por qué:**
- Key light `[3,5,3] 0.70`: más lateral y alta que antes, sombras más largas que revelan costuras
- Shadow mapSize `2048`: más detalle en las sombras proyectadas
- Fill `[-3,2,2] 0.30`: compensa sombras sin aplanar el micro-relieve
- Rim `[0,3,-4] 0.20`: nuevo — contraluz que separa la prenda del fondo
- Luces trasera baja y inferior eliminadas: cubiertas por ambient + rim

- [ ] **Verificar en dev server**

```bash
npm run dev
```

La playera debe verse con más contraste en los pliegues y un halo sutil en el contorno superior. Comparar mentalmente con la referencia VirtualThreads. Si alguna zona se sobreexpone en blanco, bajar `intensity` de la key light a `0.60`.

- [ ] **Commitear**

```bash
git add src/components/CanvasViewer.jsx
git commit -m "feat: replace lights with 3-point system + rim light for fabric micro-relief"
```

---

## Task 7: SceneOverlay — Pills Frente/Espalda

**Files:**
- Create: `src/components/SceneOverlay.jsx`

- [ ] **Crear el componente**

Crear `src/components/SceneOverlay.jsx` con este contenido:

```jsx
import { useConfigurator } from '../context/ConfiguratorContext'

export default function SceneOverlay() {
  const { activeView, view2DSide, snapCameraToSide } = useConfigurator()

  if (activeView !== '3d') return null

  return (
    <div className="absolute top-4 right-4 md:right-[336px] z-20 pointer-events-none">
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
```

**Notas de posicionamiento:**
- `right-4`: margen al borde derecho en mobile (el sidebar está abajo, no interfiere)
- `md:right-[336px]`: en desktop, el sidebar ocupa 320px (`w-80`) + 16px de margen
- `pointer-events-none` en el contenedor, `pointer-events-auto` en el pill — el canvas recibe clicks normalmente fuera de los botones

- [ ] **Commitear**

```bash
git add src/components/SceneOverlay.jsx
git commit -m "feat: add SceneOverlay with Frente/Espalda camera snap pills"
```

---

## Task 8: App.jsx — Montar SceneOverlay

**Files:**
- Modify: `src/App.jsx`

- [ ] **Importar SceneOverlay**

En `src/App.jsx`, añadir el import después de los imports existentes de componentes:

```js
import SceneOverlay from './components/SceneOverlay'
```

- [ ] **Montar SceneOverlay en el árbol**

En la función `App`, dentro del `<div className="absolute inset-0">`, añadir `<SceneOverlay />` junto a los otros componentes:

```jsx
<div className="absolute inset-0">
  <CanvasViewer />
  <DesignOverlay />
  <ViewSelector />
  <SceneOverlay />
</div>
```

- [ ] **Verificar en dev server**

```bash
npm run dev
```

1. Asegurarse de estar en **Vista 3D** (usar el ViewSelector arriba).
2. Verificar que aparece el pill "Frente / Espalda" en la esquina superior derecha.
3. Hacer clic en "Espalda" — la cámara debe animar suavemente hacia la vista trasera (~50 frames).
4. Hacer clic en "Frente" — regresa suavemente al frente.
5. Cambiar a Vista 2D — el pill debe desaparecer.
6. En mobile (o DevTools mobile): el pill debe estar en `top-4 right-4`, no tapado por el sidebar.

- [ ] **Commitear**

```bash
git add src/App.jsx
git commit -m "feat: mount SceneOverlay in App"
```

---

## Task 9: Sidebar — Sección Fondo de Estudio

**Files:**
- Modify: `src/components/Sidebar.jsx`

- [ ] **Añadir bgColor y setBgColor al destructuring del hook**

En `Sidebar.jsx`, en el bloque `const { ... } = useConfigurator()`, añadir:

```js
bgColor, setBgColor,
```

El destructuring completo debe quedar:

```js
const {
  color, setColor,
  size,  setSize,
  modelId, setModelId,
  roughness, setRoughness,
  designs, activeDesignId, setActiveDesignId, activeDesign,
  addDesign, removeDesign,
  setActiveX, setActiveY, setActiveScale, setActiveSide,
  activeView, showHandles, setShowHandles,
  bgColor, setBgColor,
  COLORS, SIZES, MODELS,
} = useConfigurator()
```

- [ ] **Añadir la sección "Fondo de Estudio"**

Dentro del `<div className="flex-1 px-4 py-4 ...">` de Sidebar, añadir la nueva sección **después** de la sección `Material` (el `<section>` que contiene `SliderRow` de Rugosidad):

```jsx
{/* ── Fondo de Estudio ──────────────────────────────────── */}
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
```

- [ ] **Verificar en dev server**

```bash
npm run dev
```

En el sidebar:
1. Desplazar hasta abajo — debe aparecer la sección "Fondo de Estudio" debajo de "Material".
2. Hacer clic en cada swatch — el fondo del canvas 3D debe cambiar en tiempo real.
3. Usar el input de color libre — el fondo cambia mientras arrastras el picker.
4. El hex se muestra junto al picker.
5. En fondo claro (p.ej. Gris Jaspe `#9DA1A2`): las sombras de ContactShadows deben verse más suaves.
6. En fondo oscuro (Negro Reactivo `#181818`): sombras más pronunciadas.
7. Verificar en mobile que la sección es accesible dentro del bottom sheet.

- [ ] **Commitear**

```bash
git add src/components/Sidebar.jsx
git commit -m "feat: add Fondo de Estudio section to Sidebar with swatches and RGB picker"
```

---

## Task 10: Verificación Integral y Build

**Files:**
- (ninguno — solo verificación y build)

- [ ] **Prueba completa en dev server**

```bash
npm run dev
```

Checklist de regresión — verificar que todo funciona:

**Objetivo 1 — Decals fotorrealistas:**
- [ ] Subir un PNG como logo en Vista 3D
- [ ] El logo se ve integrado con la iluminación (no es un parche plano neutro)
- [ ] Drag del logo funciona (arrastrarlo con el mouse/touch)
- [ ] Resize por esquinas funciona (activar checkbox "Mostrar esquinas")
- [ ] El logo cambia de lado Frente/Espalda correctamente

**Objetivo 2 — Pills de vista:**
- [ ] En Vista 3D: pills "Frente / Espalda" visibles en esquina superior derecha
- [ ] Clic "Espalda": cámara anima suavemente a vista trasera
- [ ] Clic "Frente": cámara regresa suavemente
- [ ] El pill activo se resalta en blanco
- [ ] En Vista 2D: pills NO visibles
- [ ] En mobile: pills no tapan el modelo

**Objetivo 3 — Fondo de Estudio:**
- [ ] 9 swatches visibles en Sidebar, sección "Fondo de Estudio"
- [ ] Cada swatch cambia el fondo del canvas en tiempo real
- [ ] Color picker libre funciona y muestra el hex
- [ ] En fondo claro: sombras más suaves; en fondo oscuro: más pronunciadas
- [ ] El swatch activo tiene borde destacado

**Objetivo 4 — Iluminación:**
- [ ] La playera se ve con contraste más pronunciado en pliegues
- [ ] Sin sobreexposición (no hay zonas quemadas en blanco)
- [ ] Las sombras proyectadas son más detalladas que antes

**Regresión — nada debe haberse roto:**
- [ ] Vista 2D funciona (coordenadas, drag, resize)
- [ ] Cambio de modelo (Clásica / Oversize / Polo) funciona
- [ ] Cambio de color de playera funciona
- [ ] Cambio de talla funciona
- [ ] Loading screen aparece y desaparece
- [ ] Funciona en mobile (touch events, bottom sheet del Sidebar)

- [ ] **Build de producción**

```bash
npm run build
```

Esperado:
```
✓ built in Xs
dist/index.html         X kB
dist/assets/...
```

Sin errores de TypeScript ni warnings críticos. Si aparece algún error, corregirlo antes de continuar.

- [ ] **Confirmar con Efraim que todo se ve bien localmente**

Mostrarle la app en `http://localhost:5173`. Solo hacer push a GitHub (→ Cloudflare) cuando Efraim confirme explícitamente.

- [ ] **Cuando Efraim confirme: push a producción**

```bash
git push origin main
```

Cloudflare desplegará automáticamente. Verificar en `https://mockup.michuno.com.mx` en ~1-2 minutos.

---

## Referencia Rápida de Comandos

```bash
# Dev server
npm run dev

# Build
npm run build

# Regresar al estado original (si algo sale mal)
git checkout backup-pre-realismo -- src/

# Ver la rama de respaldo
git log backup-pre-realismo --oneline -5
```
