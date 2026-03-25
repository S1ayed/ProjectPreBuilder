export const SNAPSHOT_STORAGE_KEY = 'projectprebuilder:workspace:snapshot:v1'
export const SNAPSHOT_SCHEMA_VERSION = '1.0.0'

const isObject = (value) => value !== null && typeof value === 'object'

const isQuotaExceededError = (error) => {
  if (!isObject(error)) {
    return false
  }

  const code = Number(error.code)
  const name = typeof error.name === 'string' ? error.name : ''
  return code === 22 || code === 1014 || name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export const buildSnapshotFromState = ({ viewport, assist, shapes, connections }) => ({
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  savedAt: new Date().toISOString(),
  workspace: {
    viewport,
    assist,
  },
  canvas: {
    shapes,
    connections,
  },
})

export const saveSnapshotToLocalStorage = (snapshot) => {
  const serializedSnapshot = JSON.stringify(snapshot)

  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, serializedSnapshot)
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error('SNAPSHOT_QUOTA_EXCEEDED')
    }

    throw new Error('SNAPSHOT_SAVE_FAILED')
  }
}

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

export const migrateSnapshot = (version, snapshot) => {
  if (!version || version === SNAPSHOT_SCHEMA_VERSION) {
    return snapshot
  }

  return snapshot
}

export const loadSnapshotFromLocalStorage = () => {
  const rawSnapshot = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
  if (!rawSnapshot) {
    throw new Error('SNAPSHOT_NOT_FOUND')
  }

  let parsedSnapshot
  try {
    parsedSnapshot = JSON.parse(rawSnapshot)
  } catch (error) {
    throw new Error('SNAPSHOT_PARSE_FAILED')
  }

  const migratedSnapshot = migrateSnapshot(parsedSnapshot.schemaVersion, parsedSnapshot)
  if (!validateSnapshotShape(migratedSnapshot)) {
    throw new Error('SNAPSHOT_INVALID')
  }

  return migratedSnapshot
}
