import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

// Z distance in front of the centered+normalized shirt (~1.4 units tall)
const FRONT_Z = 0.22

function DraggableDecal({ isDraggingRef }) {
  const { decalImageUrl, decalScale, decalX, setDecalX, decalY, setDecalY } = useConfigurator()
  const [texture, setTexture] = useState(null)
  const [aspect, setAspect] = useState(1)
  const { camera, gl } = useThree()
  const hitPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), -FRONT_Z))
  const hitPoint = useRef(new THREE.Vector3())

  useEffect(() => {
    if (!decalImageUrl) { setTexture(null); return }
    const loader = new THREE.TextureLoader()
    let live = true
    loader.load(decalImageUrl, (tex) => {
      if (!live) return
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      const w = tex.image?.naturalWidth || tex.image?.width || 1
      const h = tex.image?.naturalHeight || tex.image?.height || 1
      setAspect(w / h)
      setTexture(tex)
    })
    return () => { live = false }
  }, [decalImageUrl])

  const startDrag = (e) => {
    e.stopPropagation()
    isDraggingRef.current = true
    document.body.style.cursor = 'grabbing'

    const canvas = gl.domElement
    const rect = canvas.getBoundingClientRect()

    const handleMove = (evt) => {
      const ndcX = ((evt.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((evt.clientY - rect.top) / rect.height) * 2 + 1
      const ray = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      if (ray.ray.intersectPlane(hitPlane.current, hitPoint.current)) {
        setDecalX(parseFloat(Math.max(-0.45, Math.min(0.45, hitPoint.current.x)).toFixed(3)))
        setDecalY(parseFloat(Math.max(-0.70, Math.min(0.70, hitPoint.current.y)).toFixed(3)))
      }
    }

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
      isDraggingRef.current = false
      document.body.style.cursor = ''
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }

  if (!texture) return null

  return (
    <mesh
      position={[decalX, decalY, FRONT_Z]}
      renderOrder={2}
      onPointerDown={startDrag}
      onPointerEnter={() => { if (!isDraggingRef.current) document.body.style.cursor = 'grab' }}
      onPointerLeave={() => { if (!isDraggingRef.current) document.body.style.cursor = '' }}
    >
      <planeGeometry args={[decalScale * aspect, decalScale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        depthWrite={false}
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
      enableZoom
      enablePan={false}
      minDistance={1.5}
      maxDistance={4}
      maxPolarAngle={Math.PI / 2}
    />
  )
}

function ShirtScene() {
  const { color, currentScale, currentModel } = useConfigurator()
  const { scene: rawScene } = useGLTF(currentModel.path)
  const [clonedScene, setClonedScene] = useState(null)
  const [normalizedScale, setNormalizedScale] = useState(1)

  useEffect(() => {
    const clone = rawScene.clone(true)
    clone.traverse(child => {
      if (child.isMesh && child.material) child.material = child.material.clone()
    })
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    setNormalizedScale(1.4 / (size.y || 1))
    setClonedScene(clone)
  }, [rawScene])

  useEffect(() => {
    if (!clonedScene) return
    clonedScene.traverse(child => {
      if (!child.isMesh) return
      child.material.color.set(color)
      child.material.roughness = 0.75
      child.material.metalness = 0.0
      child.material.needsUpdate = true
    })
  }, [color, clonedScene])

  if (!clonedScene) return null

  const scale = currentScale.map(s => s * normalizedScale)

  return (
    <Center>
      <group scale={scale}>
        <primitive object={clonedScene} />
      </group>
    </Center>
  )
}

export default function CanvasViewer() {
  const { decalImageUrl } = useConfigurator()
  const isDraggingRef = useRef(false)

  return (
    <Canvas
      camera={{ position: [0, 0.1, 2.5], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#4a4745']} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-2, 1, 2]} intensity={0.4} />
      <directionalLight position={[0, -1, 1]} intensity={0.15} />

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ShirtScene />
        {decalImageUrl && <DraggableDecal isDraggingRef={isDraggingRef} />}
        <ContactShadows position={[0, -0.85, 0]} opacity={0.45} scale={4} blur={2.5} />
      </Suspense>

      <ControlledOrbitControls isDraggingRef={isDraggingRef} />
    </Canvas>
  )
}
