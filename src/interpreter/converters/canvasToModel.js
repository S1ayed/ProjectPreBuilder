import { getKindByShapeType } from '../mappers/kindShapeMapper'
import { normalizeNodePayload } from '../normalizers/nodePayloadNormalizer'
import { toModelRelation } from '../normalizers/connectionNormalizer'

export const convertCanvasToExportModel = ({ shapes, connections }) => {
  const nodes = Array.isArray(shapes)
    ? shapes.map((shape) => {
      const kind = getKindByShapeType(shape.type)
      return {
        id: shape.id,
        kind,
        type: shape.type,
        payload: normalizeNodePayload(kind, shape.payload),
        geometry: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        },
        style: {
          fillColor: shape.fillColor,
          strokeColor: shape.strokeColor,
          strokeWidth: shape.strokeWidth,
          opacity: shape.opacity,
        },
      }
    })
    : []

  const relations = Array.isArray(connections)
    ? connections
      .map(toModelRelation)
      .filter(Boolean)
    : []

  const structureRelations = relations.filter((relation) => relation.relationKind === 'contains')
  const dependencies = relations
    .filter((relation) => relation.relationKind === 'depends_on')
    .map((relation) => ({
      id: relation.id,
      from: relation.from,
      to: relation.to,
      type: relation.dependencyType || 'depends_on',
    }))

  return {
    nodes,
    structureRelations,
    dependencies,
    relations,
    meta: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      source: 'ProjectPreBuilder',
    },
  }
}
