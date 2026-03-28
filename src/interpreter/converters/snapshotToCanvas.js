import { SNAPSHOT_SCHEMA_VERSION } from '../schema/snapshotSchema'
import { validateSnapshotShape } from '../validators/snapshotValidator'

export const migrateSnapshot = (version, snapshot) => {
  if (!version || version === SNAPSHOT_SCHEMA_VERSION) {
    return snapshot
  }

  return snapshot
}

export const convertSnapshotToCanvas = (snapshot) => {
  const migratedSnapshot = migrateSnapshot(snapshot?.schemaVersion, snapshot)

  if (!validateSnapshotShape(migratedSnapshot)) {
    throw new Error('SNAPSHOT_INVALID')
  }

  return migratedSnapshot
}
