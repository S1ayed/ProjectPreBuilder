const isObject = (value) => value !== null && typeof value === 'object'

export const validateSnapshotShape = (snapshot) => {
  if (!isObject(snapshot)) {
    return false
  }

  const workspace = snapshot.workspace
  const canvas = snapshot.canvas
  if (!isObject(workspace) || !isObject(canvas)) {
    return false
  }

  const viewport = workspace.viewport
  if (!isObject(viewport)) {
    return false
  }

  const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
  if (!isFiniteNumber(viewport.x) || !isFiniteNumber(viewport.y) || !isFiniteNumber(viewport.zoom)) {
    return false
  }

  if (!Array.isArray(canvas.shapes) || !Array.isArray(canvas.connections)) {
    return false
  }

  return true
}
