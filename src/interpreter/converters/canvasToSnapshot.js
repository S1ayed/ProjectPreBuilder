import { SNAPSHOT_SCHEMA_VERSION } from '../schema/snapshotSchema'

export const convertCanvasToSnapshot = ({ viewport, assist, shapes, connections }) => ({
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
