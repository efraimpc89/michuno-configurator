import { useRef, useEffect, useState, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'
import { useMaterialMaps } from '../hooks/useMaterialMaps'

MODELS.forEach(m => useGLTF.preload(m.path))

function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

const MODEL_Y = 0.20

function SingleDecal({ design, isDraggingRef, frontZ, materialMaps = {} }) {
  const { normalMap = null, roughnessMap = null, aoMap = null } = materialMaps
  const { updateDesign, setActiveDesignId, activeView } = useConfigurator()
  const [texture, setTexture] = useState(null)
  const { camera, gl } = useThree()

  const isFront = design.side !== 'espalda'
  const pz      = isFront ? frontZ + 0.005 : -(frontZ + 0.005)

  const hitPlane = useRef(new THREE.Plane())
  const hitPoint = useRef(new THREE.Vector3())

  useEffect(() => {
    hitPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, isFront ? 1 : -1),
      new THREE.Vector3(0, 0, pz)
    )
  }, [pz, isFront])

  useEffect(() => {
    if (!design.url) { setTexture(null); return }
    const loader = new THREE.TextureLoader()
    let live = true
    loader.load(design.url, (tex) => {
      if (!live) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      setTexture(tex)
    })
    return () => { live = false }
  }, [design.url])

  const startDrag = (e) => {
    e.stopPropagation()
    setActiveDesignId(design.id)
    isDraggingRef.current = true
    document.body.style.cursor = 'grabbing'

    const canvas = gl.domElement
    const rect   = canvas.getBoundingClientRect()

    const handleMove = (evt) => {
      const ndcX = ((evt.clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((evt.clientY - rect.top)  / rect.height) * 2 + 1
      const ray  = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      if (ray.ray.intersectPlane(hitPlane.current, hitPoint.current)) {
        updateDesign(design.id, {
          x: parseFloat(Math.max(-0.45, Math.min(0.45, hitPoint.current.x)).toFixed(3)),
          y: parseFloat(Math.max(-0.70, Math.min(0.70, hitPoint.current.y - MODEL_Y)).toFixed(3)),
        })
      }
    }

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup',   handleUp)
      isDraggingRef.current = false
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup',   handleUp)
  }

  // Hidden in 2D mode — DesignOverlay takes over
  if (!texture || activeView === '2d') return null

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
}

function ActiveDesignHandles({ design, isDraggingRef, frontZ }) {
  const { updateDesign } = useConfigurator()
  const { camera, gl }   = useThree()
  const isFront = design.side !== 'espalda'
  const pz      = isFront ? frontZ + 0.012 : -(frontZ + 0.012)

  const ar    = design.aspectRatio || 1
  const halfX = design.scale / 2
  const halfY = (design.scale / ar) / 2
  const cx    = design.x
  const cy    = design.y + MODEL_Y

  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]]

  const hitPlane = useRef(new THREE.Plane())
  useEffect(() => {
    hitPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, isFront ? 1 : -1),
      new THREE.Vector3(0, 0, pz)
    )
  }, [pz, isFront])

  const startCornerDrag = (e) => {
    e.stopPropagation()
    isDraggingRef.current = true
    document.body.style.cursor = 'nwse-resize'

    const canvas   = gl.domElement
    const rect     = canvas.getBoundingClientRect()
    const hitPoint = new THREE.Vector3()

    const handleMove = (evt) => {
      const ndcX = ((evt.clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((evt.clientY - rect.top)  / rect.height) * 2 + 1
      const ray  = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      if (ray.ray.intersectPlane(hitPlane.current, hitPoint)) {
        const dx  = Math.abs(hitPoint.x - cx)
        const dy  = Math.abs(hitPoint.y - cy)
        const s   = parseFloat(Math.max(0.05, Math.min(0.80, Math.max(dx * 2, dy * 2 * ar))).toFixed(3))
        updateDesign(design.id, { scale: s })
      }
    }

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup',   handleUp)
      isDraggingRef.current = false
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup',   handleUp)
  }

  return (
    <>
      {corners.map(([sx, sy], i) => (
        <mesh
          key={i}
          position={[cx + sx * halfX, cy + sy * halfY, pz]}
          renderOrder={21}
          onPointerDown={startCornerDrag}
          onPointerEnter={() => { document.body.style.cursor = 'nwse-resize' }}
          onPointerLeave={() => { if (!isDraggingRef.current) document.body.style.cursor = '' }}
        >
          <sphereGeometry args={[0.018, 10, 10]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>
      ))}
    </>
  )
}

// Snaps camera to front/back on 2D view entry or side change; animates in 3D on side toggle
function CameraController() {
  const { activeView, view2DSide, cameraAnimRef } = useConfigurator()
  const frontTarget = useRef(new THREE.Vector3(0, MODEL_Y,  2.5))
  const backTarget  = useRef(new THREE.Vector3(0, MODEL_Y, -2.5))
  const animPos     = useRef(new THREE.Vector3())
  const snapFrames  = useRef(40)

  useEffect(() => { snapFrames.current = 40 }, [activeView, view2DSide])

  useFrame(({ camera }) => {
    if (activeView === '2d' && snapFrames.current > 0) {
      const tgt = view2DSide === 'espalda' ? backTarget.current : frontTarget.current
      camera.position.lerp(tgt, 0.12)
      camera.lookAt(0, MODEL_Y, 0)
      snapFrames.current--
      return
    }
    const anim = cameraAnimRef.current
    if (anim && anim.framesLeft > 0 && activeView === '3d') {
      animPos.current.set(0, MODEL_Y, anim.z)
      camera.position.lerp(animPos.current, 0.10)
      camera.lookAt(0, MODEL_Y, 0)
      anim.framesLeft--
    }
  })
  return null
}

function ControlledOrbitControls({ isDraggingRef }) {
  const { activeView } = useConfigurator()
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.enabled      = !isDraggingRef.current
      ref.current.enableRotate = activeView === '3d' && !isDraggingRef.current
    }
  })
  return (
    <OrbitControls
      ref={ref}
      target={[0, MODEL_Y, 0]}
      enableZoom
      enablePan={false}
      minDistance={1.5}
      maxDistance={4}
      maxPolarAngle={Math.PI / 2}
    />
  )
}

function ShirtModel({ onMeshFound, onFrontZ }) {
  const { color, roughness, currentScale, currentModel } = useConfigurator()
  const { scene: rawScene } = useGLTF(currentModel.path)
  const [clonedScene, setClonedScene]         = useState(null)
  const [normalizedScale, setNormalizedScale] = useState(1)

  useEffect(() => {
    onMeshFound(null)
    const clone = rawScene.clone(true)

    let bestMesh = null
    let maxHeight = 0
    clone.traverse(child => {
      if (!child.isMesh) return
      child.geometry = child.geometry.clone()
      child.geometry.computeVertexNormals()
      child.material = child.material.clone()
      const mb = new THREE.Box3().setFromObject(child)
      const h  = mb.max.y - mb.min.y
      if (h > maxHeight) { maxHeight = h; bestMesh = child }
    })

    const box  = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const nScale = 1.4 / (size.y || 1)
    setNormalizedScale(nScale)
    setClonedScene(clone)
    onMeshFound(bestMesh)
    onFrontZ?.(Math.max(0.15, (size.z * nScale) / 2 + 0.01))
  }, [rawScene, onMeshFound, onFrontZ])

  useEffect(() => {
    if (!clonedScene) return
    clonedScene.traverse(child => {
      if (!child.isMesh) return
      child.material.color.set(color)
      child.material.roughness  = roughness
      child.material.metalness  = 0.0
      child.material.needsUpdate = true
    })
  }, [color, roughness, clonedScene])

  if (!clonedScene) return null

  const scale = currentScale.map(s => s * normalizedScale)

  return (
    <group position={[0, MODEL_Y, 0]}>
      <Center>
        <group scale={scale}>
          <primitive object={clonedScene} />
        </group>
      </Center>
    </group>
  )
}

export default function CanvasViewer() {
  const { designs, activeDesign, currentModel, activeView, showHandles, frontZRef, bgColor } = useConfigurator()
  const shadowOpacity = hexLuminance(bgColor) >= 0.4 ? 0.22 : 0.45
  const isDraggingRef = useRef(false)
  const [mainMesh, setMainMesh] = useState(null)
  const [frontZ, setFrontZ]     = useState(0.22)
  const { normalMap, roughnessMap, aoMap } = useMaterialMaps(mainMesh)
  const onMeshFound = useCallback((mesh) => setMainMesh(mesh), [])
  const onFrontZ    = useCallback((z) => {
    setFrontZ(z)
    frontZRef.current = z
  }, [frontZRef])

  return (
    <Canvas
      camera={{ position: [0, MODEL_Y, 2.5], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[bgColor]} />

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

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <CameraController />
        <ShirtModel onMeshFound={onMeshFound} onFrontZ={onFrontZ} />

        {designs.map(design => (
          <SingleDecal
            key={`${currentModel.id}-${design.id}`}
            design={design}
            isDraggingRef={isDraggingRef}
            frontZ={frontZ}
            materialMaps={{ normalMap, roughnessMap, aoMap }}
          />
        ))}

        {mainMesh && activeDesign && activeView === '3d' && showHandles && (
          <ActiveDesignHandles
            key={`handles-${activeDesign.id}`}
            design={activeDesign}
            isDraggingRef={isDraggingRef}
            frontZ={frontZ}
          />
        )}

        <ContactShadows position={[0, -0.55, 0]} opacity={shadowOpacity} scale={4} blur={2.5} />
      </Suspense>

      <ControlledOrbitControls isDraggingRef={isDraggingRef} />
    </Canvas>
  )
}
