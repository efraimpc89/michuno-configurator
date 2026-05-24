import { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

function DecalPlane({ url, size, frontZ }) {
  const { decalScale, decalX, decalY } = useConfigurator()
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    if (!url) { setTexture(null); return }
    const loader = new THREE.TextureLoader()
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      setTexture(tex)
    })
  }, [url])

  if (!texture) return null

  const w = size.x * decalScale
  const h = size.y * decalScale

  return (
    <mesh position={[decalX, decalY, frontZ]} renderOrder={1}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        depthWrite={false}
      />
    </mesh>
  )
}

function ShirtScene() {
  const { color, currentScale, currentModel, decalImageUrl } = useConfigurator()
  const { scene: rawScene } = useGLTF(currentModel.path)
  const [clonedScene, setClonedScene] = useState(null)
  const [modelSize, setModelSize] = useState(new THREE.Vector3(1, 1, 1))
  const [normalizedScale, setNormalizedScale] = useState(1)
  const groupRef = useRef()

  // Clone scene and compute bounding box whenever the model changes
  useEffect(() => {
    const clone = rawScene.clone(true)
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone()
      }
    })

    // Compute bounding box of the raw (unscaled) scene to normalise height
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const height = size.y || 1
    const nScale = 1.4 / height

    setClonedScene(clone)
    setModelSize(size)
    setNormalizedScale(nScale)
  }, [rawScene])

  // Apply shirt color reactively
  useEffect(() => {
    if (!clonedScene) return
    clonedScene.traverse((child) => {
      if (!child.isMesh) return
      child.material.color.set(color)
      child.material.roughness = 0.75
      child.material.metalness = 0.0
      child.material.needsUpdate = true
    })
  }, [color, clonedScene])

  if (!clonedScene) return null

  const combinedScale = [
    currentScale[0] * normalizedScale,
    currentScale[1] * normalizedScale,
    currentScale[2] * normalizedScale,
  ]
  const scaledSize = modelSize.clone().multiply(new THREE.Vector3(...combinedScale))
  const frontZ = (scaledSize.z / 2) + 0.015

  return (
    <Center ref={groupRef}>
      <group scale={combinedScale}>
        <primitive object={clonedScene} />
      </group>
      {decalImageUrl && (
        <DecalPlane
          url={decalImageUrl}
          size={scaledSize}
          frontZ={frontZ}
        />
      )}
    </Center>
  )
}

export default function CanvasViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0.1, 2.5], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      shadows
    >
      <color attach="background" args={['#ddd8d0']} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-2, 1, 2]} intensity={0.4} />
      <directionalLight position={[0, -1, 1]} intensity={0.15} />

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ShirtScene />
        <ContactShadows
          position={[0, -0.85, 0]}
          opacity={0.35}
          scale={4}
          blur={2.5}
        />
      </Suspense>

      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
      />
    </Canvas>
  )
}
