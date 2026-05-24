import { useRef, useEffect, useState, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment, Decal } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

const FRONT_Z  = 0.22   // Z of shirt front surface in normalized world space
const MODEL_Y  = 0.20   // lift so shirt bottom clears the shadow plane

function SingleDecal({ design, mainMesh, isDraggingRef, frontZ }) {
  const { updateDesign, setActiveDesignId } = useConfigurator()
  const [texture, setTexture] = useState(null)
  // Stable ref captured once at mount so Decal's internal useState gets the right mesh
  const [meshRef] = useState(() => ({ current: mainMesh }))
  const { camera, gl } = useThree()

  const isFront  = design.side !== 'espalda'
  const planeZ   = isFront ? frontZ : -frontZ
  const hitPlane = useRef(
    isFront
      ? new THREE.Plane(new THREE.Vector3(0, 0,  1), -frontZ)
      : new THREE.Plane(new THREE.Vector3(0, 0, -1), -frontZ)
  )
  const hitPoint = useRef(new THREE.Vector3())

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
          // subtract MODEL_Y so stored y is shirt-relative (0 = shirt center)
          y: parseFloat(Math.max(-0.70, Math.min(0.70, hitPoint.current.y - MODEL_Y)).toFixed(3)),
        })
      }
    }

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup',   handleUp)
      isDraggingRef.current     = false
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup',   handleUp)
  }

  if (!texture) return null

  return (
    <Decal
      mesh={meshRef}
      position={[design.x, design.y + MODEL_Y, planeZ]}
      debug={false}
      rotation={[0, isFront ? 0 : Math.PI, 0]}
      scale={[design.scale, design.scale, 0.35]}
      renderOrder={10}
      onPointerDown={startDrag}
      onPointerEnter={() => { if (!isDraggingRef.current) document.body.style.cursor = 'grab' }}
      onPointerLeave={() => { if (!isDraggingRef.current) document.body.style.cursor = '' }}
    >
      <meshStandardMaterial
        map={texture}
        roughness={1.0}
        metalness={0.0}
        transparent
        alphaTest={0.05}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-10}
        polygonOffsetUnits={-10}
      />
    </Decal>
  )
}

function ControlledOrbitControls({ isDraggingRef }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.enabled = !isDraggingRef.current
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
  const [clonedScene, setClonedScene]       = useState(null)
  const [normalizedScale, setNormalizedScale] = useState(1)

  useEffect(() => {
    onMeshFound(null)
    const clone = rawScene.clone(true)

    // Pick the mesh with the tallest Y-span — reliably selects shirt body over collar/buttons
    let bestMesh = null
    let maxHeight = 0
    clone.traverse(child => {
      if (!child.isMesh) return
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
    // Lift the whole model so its bottom clears the shadow plane
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
  const { designs, currentModel } = useConfigurator()
  const isDraggingRef = useRef(false)
  const [mainMesh, setMainMesh] = useState(null)
  const [frontZ, setFrontZ]     = useState(0.22)
  const onMeshFound = useCallback((mesh) => setMainMesh(mesh), [])
  const onFrontZ    = useCallback((z)    => setFrontZ(z),    [])

  return (
    <Canvas
      camera={{ position: [0, MODEL_Y, 2.5], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={['#4a4745']} />

      {/* Soft ambient — keeps darks dark without washing out colors */}
      <ambientLight intensity={0.35} />
      {/* Key light — reduced to not blow out the fabric */}
      <directionalLight position={[2, 4, 3]} intensity={0.55} castShadow shadow-mapSize={[1024, 1024]} />
      {/* Left fill */}
      <directionalLight position={[-2, 1, 2]} intensity={0.25} />
      {/* Back/counter fill — preserves 3D volume without front glare */}
      <directionalLight position={[0, 1, -3]} intensity={0.15} />
      {/* Subtle bottom rim */}
      <directionalLight position={[0, -1, 1]} intensity={0.08} />

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ShirtModel onMeshFound={onMeshFound} onFrontZ={onFrontZ} />

        {/* One Decal per design — they persist across model changes via key */}
        {mainMesh && designs.map(design => (
          <SingleDecal
            key={`${currentModel.id}-${design.id}`}
            design={design}
            mainMesh={mainMesh}
            isDraggingRef={isDraggingRef}
            frontZ={frontZ}
          />
        ))}

        <ContactShadows position={[0, -0.55, 0]} opacity={0.45} scale={4} blur={2.5} />
      </Suspense>

      <ControlledOrbitControls isDraggingRef={isDraggingRef} />
    </Canvas>
  )
}
