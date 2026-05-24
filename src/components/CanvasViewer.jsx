import { useRef, useEffect, useState, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

const MODEL_Y = 0.20  // lift so shirt bottom clears the shadow plane

function SingleDecal({ design, isDraggingRef, frontZ }) {
  const { updateDesign, setActiveDesignId } = useConfigurator()
  const [texture, setTexture] = useState(null)
  const { camera, gl } = useThree()

  const isFront  = design.side !== 'espalda'
  // Plane sits 2 mm in front of the shirt surface — always visible, no DecalGeometry timing issues
  const planeZ   = isFront ? frontZ + 0.002 : -(frontZ + 0.002)
  const hitPlane = useRef(new THREE.Plane())
  const hitPoint = useRef(new THREE.Vector3())

  // Keep the drag plane in sync whenever frontZ or side changes
  useEffect(() => {
    hitPlane.current.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, isFront ? 1 : -1),
      new THREE.Vector3(0, 0, planeZ)
    )
  }, [planeZ, isFront])

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

  if (!texture) return null

  return (
    <mesh
      position={[design.x, design.y + MODEL_Y, planeZ]}
      rotation={[0, isFront ? 0 : Math.PI, 0]}
      scale={[design.scale, design.scale, 1]}
      renderOrder={100}
      onPointerDown={startDrag}
      onPointerEnter={() => { if (!isDraggingRef.current) document.body.style.cursor = 'grab' }}
      onPointerLeave={() => { if (!isDraggingRef.current) document.body.style.cursor = '' }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
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

function ShirtModel({ onFrontZ }) {
  const { color, roughness, currentScale, currentModel } = useConfigurator()
  const { scene: rawScene } = useGLTF(currentModel.path)
  const [clonedScene, setClonedScene]         = useState(null)
  const [normalizedScale, setNormalizedScale] = useState(1)

  useEffect(() => {
    const clone = rawScene.clone(true)
    clone.traverse(child => {
      if (!child.isMesh) return
      // Clone geometry so we never mutate the shared GLTF cache
      child.geometry = child.geometry.clone()
      // Recompute smooth normals — fixes dark folds on polo hem
      child.geometry.computeVertexNormals()
      child.material = child.material.clone()
    })

    const box  = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const nScale = 1.4 / (size.y || 1)
    setNormalizedScale(nScale)
    setClonedScene(clone)
    onFrontZ?.(Math.max(0.15, (size.z * nScale) / 2 + 0.01))
  }, [rawScene, onFrontZ])

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
  const { designs, currentModel } = useConfigurator()
  const isDraggingRef = useRef(false)
  const [frontZ, setFrontZ] = useState(0.22)
  const onFrontZ = useCallback((z) => setFrontZ(z), [])

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
        <ShirtModel onFrontZ={onFrontZ} />

        {designs.map(design => (
          <SingleDecal
            key={`${currentModel.id}-${design.id}`}
            design={design}
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
