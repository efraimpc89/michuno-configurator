# Realismo y Control — Configurador Michuno

**Fecha:** 2026-05-24  
**Estado:** Aprobado  
**Repo:** C:\repo\michuno-configurator

---

## Contexto

El configurador de playeras Michuno permite cargar logos PNG y posicionarlos sobre modelos 3D. Actualmente los decals usan `meshBasicMaterial` (sin iluminación), el fondo es un gris fijo, no hay botones rápidos de vista Frente/Espalda en el canvas 3D, y la iluminación no acentúa el micro-relieve textil.

Referencia visual objetivo: [VirtualThreads Configurator](https://www.virtualthreads.io/configurator)

---

## Decisiones de Diseño

| # | Decisión | Elección |
|---|----------|----------|
| 1 | Decal approach | Flat plane + meshStandardMaterial (Opción B) — seguro, sin riesgo de world matrix |
| 2 | Posición pills Frente/Espalda | Flotantes esquina superior derecha del canvas (Opción A) |
| 3 | Paleta Fondo de Estudio | Los 9 colores existentes de COLORS + RGB picker libre |
| 4 | Arquitectura | Enfoque 2 — separación limpia con SceneOverlay + useMaterialMaps |

---

## Arquitectura

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/context/ConfiguratorContext.jsx` | Añade `bgColor`/`setBgColor` (default `#3a3835`) |
| `src/components/CanvasViewer.jsx` | Luces calibradas, `<color>` dinámico, `useMaterialMaps` → decal |
| `src/components/Sidebar.jsx` | Sección "Fondo de Estudio" con swatches + color picker |
| `src/App.jsx` | Monta `<SceneOverlay />` |

### Archivos nuevos

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/components/SceneOverlay.jsx` | Pills Frente/Espalda HTML sobre el canvas, solo en vista 3D |
| `src/hooks/useMaterialMaps.js` | Extrae `normalMap`, `roughnessMap`, `aoMap` del mesh GLB |

### Flujo de datos

```
ConfiguratorContext
  ├── bgColor/setBgColor ──→ CanvasViewer (<color>, ContactShadows opacity)
  │                     ──→ Sidebar (Fondo de Estudio swatches/picker)
  ├── cameraAnimRef     ──→ SceneOverlay (dispara lerp al hacer clic)
  └── view2DSide        ──→ SceneOverlay (pill activa)

ShirtModel
  └── onMeshFound(mesh) ──→ useMaterialMaps(mesh)
                              └── { normalMap, roughnessMap, aoMap }
                                   ──→ SingleDecal (meshStandardMaterial)
```

---

## Objetivo 1 — Fusión de Textura Ultra-Realista en Decals

### Hook `src/hooks/useMaterialMaps.js`

```js
// Recibe el mesh principal de la playera (bestMesh de ShirtModel)
// Traversa su material y extrae los mapas PBR si existen
// Retorna { normalMap, roughnessMap, aoMap } — cualquiera puede ser null
```

- Se ejecuta como `useMemo` dependiendo de `mesh`
- Fallback graceful: si el GLB no tiene mapas, retorna `null` en cada campo
- No lanza errores — el material del decal funciona con o sin mapas

### Cambio en `SingleDecal`

**Antes:** `meshBasicMaterial` — sin iluminación, sin reacción a sombras  
**Después:** `meshStandardMaterial` con:

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| `normalMap` | del hook (o null) | Proyecta relieve de tela sobre el logo |
| `roughnessMap` | del hook (o null) | Variación de rugosidad del tejido |
| `aoMap` | del hook (o null) | Sombras de contacto del tejido |
| `roughness` | `0.85` | Matte como algodón, nunca brilloso |
| `metalness` | `0.0` | Sin componente metálico |
| `envMapIntensity` | `0.4` | Absorbe IBL del Environment studio |
| `transparent` | `true` | Mantener canal alpha del PNG |
| `alphaTest` | `0.05` | Sin bordes fantasma |
| `depthWrite` | `false` | Evitar z-fighting con la playera |
| `polygonOffset` | `-4 / -4` | Mantener offset actual que funciona |

`toneMapped` se elimina — `meshStandardMaterial` se beneficia del tone mapping ACES.

### Propagación del mesh

`CanvasViewer` ya tiene `mainMesh` en estado local vía `onMeshFound`. Se pasa al hook:

```jsx
const { normalMap, roughnessMap, aoMap } = useMaterialMaps(mainMesh)
// Se pasa a cada <SingleDecal materialMaps={{ normalMap, roughnessMap, aoMap }} />
```

---

## Objetivo 2 — Pills de Vista Frente/Espalda

### `src/components/SceneOverlay.jsx`

Componente HTML puro (no R3F), montado en `App.jsx` al mismo nivel que `CanvasViewer`.

**Visibilidad:** solo cuando `activeView === '3d'`

**Posición:**
- Desktop: `absolute top-4 right-[336px]` (justo a la izquierda del sidebar de 320px + margen)
- Mobile: `absolute top-14 right-3` (debajo del ViewSelector que ocupa top-4)

**Estilo:** pill translúcida con glassmorphism consistente con el ViewSelector existente

```jsx
<div className="bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/15 flex gap-1">
  {['frente', 'espalda'].map(side => (
    <button
      key={side}
      onClick={() => handleSnap(side)}
      className={activeSide === side
        ? 'bg-white text-gray-900 rounded-full px-4 py-1.5 text-xs font-semibold'
        : 'text-white/60 hover:text-white/90 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors'}
    >
      {side === 'frente' ? 'Frente' : 'Espalda'}
    </button>
  ))}
</div>
```

**Animación de cámara:** Se añade `snapCameraToSide(side)` al context:
```js
const snapCameraToSide = useCallback((side) => {
  setView2DSide(side)
  cameraAnimRef.current = { z: side === 'espalda' ? -2.5 : 2.5, framesLeft: 50 }
}, [])
```
Exportado en el provider. `SceneOverlay` llama a `snapCameraToSide` — NO llama a `setActiveSide` (que mueve el diseño activo al lado, comportamiento no deseado aquí).  
Reutiliza el `CameraController` existente — sin cambios en el canvas.

**Estado activo:** `view2DSide` ya existente — indica la última vista snapeada. Pill resaltada = `view2DSide === side`.

---

## Objetivo 3 — Fondo de Estudio

### Context

```js
const [bgColor, setBgColor] = useState('#3a3835')
```

Exportado en el value del provider.

### CanvasViewer

```jsx
// Fondo dinámico
<color attach="background" args={[bgColor]} />

// ContactShadows — opacidad adaptativa según luminosidad del fondo
// Fórmula luminosidad relativa (sRGB): L = (0.299·R + 0.587·G + 0.114·B) / 255
// L < 0.4  → opacity 0.45  (fondo oscuro, sombra más visible)
// L >= 0.4 → opacity 0.22  (fondo claro, sombra más suave)
// Se calcula en useMemo dependiendo de bgColor
```

### Sidebar — Sección "Fondo de Estudio"

Nueva sección insertada entre "Material" y el footer. Orden final del sidebar:

1. Modelo
2. Diseños / Logos
3. Ajustar diseño activo (condicional)
4. Color
5. Talla
6. Material
7. **Fondo de Estudio** ← nueva
8. Footer

**UI del módulo:**

```
[ Fondo de Estudio ]
 ○ ○ ○ ○ ○ ○ ○ ○ ○    ← 9 swatches circulares, mismos de COLORS array
                         borde destacado cuando bgColor === swatch.hex
 [████ #3a3835] ←→      ← <input type="color"> nativo
                         label muestra el hex actual
```

Los swatches reutilizan exactamente `COLORS` — sin datos nuevos ni mantenimiento extra.

---

## Objetivo 4 — Calibración Lumínica

Reemplaza las 4 luces actuales por sistema de 3 puntos:

```jsx
{/* Key light — diagonal alta, sombras de alta resolución */}
<directionalLight
  position={[3, 5, 3]}
  intensity={0.70}
  castShadow
  shadow-mapSize={[2048, 2048]}
  shadow-bias={-0.0003}
/>

{/* Fill light — compensa sombras duras, tono frío */}
<directionalLight position={[-3, 2, 2]} intensity={0.30} />

{/* Rim light — contraluz, separa prenda del fondo */}
<directionalLight position={[0, 3, -4]} intensity={0.20} />

{/* Ambient — piso mínimo para pliegues no negros puros */}
<ambientLight intensity={0.30} />

{/* IBL mantiene realismo en cualquier color de fondo */}
<Environment preset="studio" />
```

**Cambios respecto al actual:**
- Key: `[2,4,3] 0.55` → `[3,5,3] 0.70` (más lateral, más alto, más intenso)
- Shadow mapSize: `1024` → `2048` (más detalle en costuras)
- Fill: `[-2,1,2] 0.25` → `[-3,2,2] 0.30` (más lateral)
- Rim: nuevo `[0,3,-4] 0.20`
- Luz trasera baja `[0,1,-3] 0.15` → eliminada (reemplazada por rim)
- Luz inferior `[0,-1,1] 0.08` → eliminada (ambient la cubre)
- Ambient: `0.35` → `0.30`

---

## Checkpoint de Seguridad

Antes de cualquier modificación:

```bash
git branch backup-pre-realismo
# La rama main permanece intacta como respaldo
```

Desarrollo y pruebas 100% en `npm run dev` (localhost).  
Push a GitHub (→ Cloudflare) solo en confirmación explícita de Efraim.

---

## Criterios de Aceptación

- [ ] Checkpoint `backup-pre-realismo` creado antes de primer cambio
- [ ] Los logos responden a la iluminación de la escena (ya no son planos neutros)
- [ ] Pills Frente/Espalda visibles en vista 3D, esquina superior derecha
- [ ] Clic en pill anima cámara suavemente (lerp, ~50 frames)
- [ ] Color de fondo cambia en tiempo real al seleccionar swatch o picker
- [ ] 9 swatches son los colores COLORS exactos de playera
- [ ] ContactShadows se adapta (más suaves en fondos claros)
- [ ] Sin regresiones en vista 2D, drag de logos, resize por esquinas
- [ ] Funciona en iPhone/iPad (touch events)
- [ ] `npm run build` sin errores antes del push

---

## Fuera de Scope

- Reintroducir DecalGeometry (riesgo de world matrix, descartado)
- Cambiar el sistema de coordenadas 2D
- Añadir nuevos modelos GLB
- Sistema de exportación/descarga
