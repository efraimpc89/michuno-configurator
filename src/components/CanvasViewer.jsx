import { useState, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

const MODEL_Y = 0.20

function hexLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// Mirrors all light Z-positions for the back view so both sides
// receive identical exposure and contrast — fixes the overexposure bug.
function Lights() {
  const { view2DSide } = useConfigurator()
  const z = view2DSide === 'espalda' ? -1 : 1
  return (
    <>
      <ambientLight intensity={0.30} />
      <directionalLight
        position={[3, 5, 3 * z]}
        intensity={0.70}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-3, 2, 2 * z]} intensity={0.30} />
      <directionalLight position={[0,  3, -4 * z]} intensity={0.20} />
    </>
  )
}

// Instantly snaps camera to front or back — no orbit, no spin, no zoom.
function CameraController() {
  const { view2DSide } = useConfigurator()
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, MODEL_Y, view2DSide === 'espalda' ? -2.5 : 2.5)
    camera.lookAt(0, MODEL_Y, 0)
  }, [view2DSide, camera])
  return null
}

function ShirtModel({ onMeshFound, onFrontZ }) {
  const { color, roughness, currentScale, currentModel } = useConfigurator()
  const { scene: rawScene } = useGLTF(currentModel.path)
  const [clonedScene,      setClonedScene]      = useState(null)
  const [normalizedScale,  setNormalizedScale]  = useState(1)

  useEffect(() => {
    onMeshFound(null)
    const clone = rawScene.clone(true)

    let bestMesh  = null
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
  const { bgColor, frontZRef } = useConfigurator()
  const shadowOpacity = hexLuminance(bgColor) >= 0.4 ? 0.22 : 0.45
  const [mainMesh, setMainMesh] = useState(null)

  const onMeshFound = useCallback((mesh) => setMainMesh(mesh), [])
  const onFrontZ    = useCallback((z) => { frontZRef.current = z }, [frontZRef])

  return (
    <Canvas
      camera={{ position: [0, MODEL_Y, 2.5], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ touchAction: 'none' }}
    >
      <color attach="background" args={[bgColor]} />
      <Lights />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <CameraController />
        <ShirtModel onMeshFound={onMeshFound} onFrontZ={onFrontZ} />
        <ContactShadows
          position={[0, -0.55, 0]}
          opacity={shadowOpacity}
          scale={4}
          blur={2.5}
        />
      </Suspense>
    </Canvas>
  )
}
