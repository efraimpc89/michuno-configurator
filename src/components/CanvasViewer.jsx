import { useRef, useEffect, useLayoutEffect, useState, useCallback, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, ContactShadows, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { DecalGeometry } from 'three-stdlib'
import { useConfigurator, MODELS } from '../context/ConfiguratorContext'

MODELS.forEach(m => useGLTF.preload(m.path))

const MODEL_Y = 0.20  // lift so shirt bottom clears the shadow plane

function SingleDecal({ design, mainMesh, isDraggingRef, frontZ }) {
  const { updateDesign, setActiveDesignId } = useConfigurator()
  const [texture, setTexture] = useState(null)
  const { camera, gl } = useThree()
  const ref = useRef()

  const isFront  = design.side !== 'espalda'
  const planeZ   = isFront ? frontZ : -frontZ
  const hitPlane = useRef(new THREE.Plane())
  const hitPoint = useRef(new THREE.Vector3())

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

  // Rebuild DecalGeometry every time projection params change.
  // useLayoutEffect fires AFTER drei <Center>'s useLayoutEffect has already
  // applied its centering offset, so calling updateWorldMatrix here gets the
  // correct shirt world-matrix even before R3F's first renderer.render().
  useLayoutEffect(() => {
    if (!ref.current || !mainMesh || !texture) return

    // Walk the full parent chain so matrixWorld is valid for DecalGeometry
    mainMesh.updateWorldMatrix(true, false)

    const position    = new THREE.Vector3(design.x, design.y + MODEL_Y, planeZ)
    const orientation = new THREE.Euler(0, isFront ? 0 : Math.PI, 0)
    // Z depth: enough to wrap front-facing geometry without breaching the back panel
    const depthZ = Math.min(frontZ * 1.4, 0.28)
    const size   = new THREE.Vector3(design.scale, design.scale, depthZ)

    const prev = ref.current.geometry
    ref.current.geometry = new DecalGeometry(mainMesh, position, orientation, size)
    if (prev?.isBufferGeometry) prev.dispose()
  }, [mainMesh, texture, design.x, design.y, design.scale, design.side, frontZ, planeZ, isFront])

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

  if (!texture || !mainMesh) return null

  return (
    <mesh
      ref={ref}
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

      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 3]} intensity={0.55} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-2, 1, 2]} intensity={0.25} />
      <directionalLight position={[0, 1, -3]} intensity={0.15} />
      <directionalLight position={[0, -1, 1]} intensity={0.08} />

      <Suspense fallback={null}>
        <Environment preset="studio" />
        <ShirtModel onMeshFound={onMeshFound} onFrontZ={onFrontZ} />

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
