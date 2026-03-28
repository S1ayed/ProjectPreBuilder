import {
  SNAPSHOT_SCHEMA_VERSION,
  SNAPSHOT_STORAGE_KEY,
} from '../interpreter/schema/snapshotSchema'
import { convertCanvasToSnapshot } from '../interpreter/converters/canvasToSnapshot'
import {
  convertSnapshotToCanvas,
  migrateSnapshot,
} from '../interpreter/converters/snapshotToCanvas'
import { validateSnapshotShape } from '../interpreter/validators/snapshotValidator'

export { SNAPSHOT_SCHEMA_VERSION, SNAPSHOT_STORAGE_KEY }

const isObject = (value) => value !== null && typeof value === 'object'

const isQuotaExceededError = (error) => {
  if (!isObject(error)) {
    return false
  }

  const code = Number(error.code)
  const name = typeof error.name === 'string' ? error.name : ''
  return code === 22 || code === 1014 || name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export const buildSnapshotFromState = ({ viewport, assist, shapes, connections }) => (
  convertCanvasToSnapshot({ viewport, assist, shapes, connections })
)

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

export { validateSnapshotShape, migrateSnapshot }

export const loadSnapshotFromLocalStorage = () => {
  const rawSnapshot = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
  if (!rawSnapshot) {
    throw new Error('SNAPSHOT_NOT_FOUND')
  }

  let parsedSnapshot
  try {
    parsedSnapshot = JSON.parse(rawSnapshot)
  } catch {
    throw new Error('SNAPSHOT_PARSE_FAILED')
  }

  return convertSnapshotToCanvas(parsedSnapshot)
}
