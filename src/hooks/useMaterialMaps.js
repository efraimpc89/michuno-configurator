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
