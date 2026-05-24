import { useRef, useEffect, useMemo, Suspense } from 'react'
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

  // Find the main mesh synchronously on scene load
  useMemo(() => {
    meshRef.current = null
    scene.traverse((child) => {
      if (child.isMesh && !meshRef.current) {
        meshRef.current = child
      }
    })
  }, [scene])

  // Apply shirt color reactively — clone material to avoid shared state mutation
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
      {/* Ambient fill */}
      <ambientLight intensity={0.7} />
      {/* Key light — front-top-right */}
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Fill light — front-left */}
      <directionalLight position={[-2, 1, 2]} intensity={0.5} />
      {/* Rim light — subtle bottom fill to lift shadows on folds */}
      <directionalLight position={[0, -1, 1]} intensity={0.2} />

      <Suspense fallback={null}>
        <ShirtModel />
      </Suspense>

      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={1.5}
        maxDistance={4}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}
