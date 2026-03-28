import { getShapeDefaultSize, getShapeDefaultStyle } from '../../constants/shapeConfigs'
import { getKindByShapeType, getShapeTypeByKind } from '../mappers/kindShapeMapper'
import { normalizeNodePayload } from '../normalizers/nodePayloadNormalizer'
import { normalizeConnections } from '../normalizers/connectionNormalizer'

const toRelationSource = (parsed) => {
  if (Array.isArray(parsed?.relations)) {
    return parsed.relations
  }

  const structureRelations = Array.isArray(parsed?.structureRelations) ? parsed.structureRelations : []
  const dependencies = Array.isArray(parsed?.dependencies)
    ? parsed.dependencies.map((item) => ({
      ...item,
      relationKind: 'depends_on',
      dependencyType: item?.type,
    }))
    : []

  return [...structureRelations, ...dependencies]
}

export const convertModelToCanvas = (parsed) => {
  const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : []
  const relationsSource = toRelationSource(parsed)

  const shapes = nodes
    .filter((node) => node && typeof node === 'object' && typeof node.id === 'string' && node.id)
    .map((node) => {
      const kind = typeof node.kind === 'string' ? node.kind : getKindByShapeType(node.type)
      const shapeType = getShapeTypeByKind(kind)
      const geometry = node.geometry && typeof node.geometry === 'object' ? node.geometry : {}
      const style = node.style && typeof node.style === 'object' ? node.style : {}
      const defaultSize = getShapeDefaultSize(shapeType)
      const defaultStyle = getShapeDefaultStyle(shapeType)

      return {
        id: node.id,
        type: shapeType,
        kind,
        payload: normalizeNodePayload(kind, node.payload),
        x: Number.isFinite(geometry.x) ? geometry.x : 0,
        y: Number.isFinite(geometry.y) ? geometry.y : 0,
        width: Number.isFinite(geometry.width) ? geometry.width : defaultSize.width,
        height: Number.isFinite(geometry.height) ? geometry.height : defaultSize.height,
        fillColor: typeof style.fillColor === 'string' && style.fillColor ? style.fillColor : defaultStyle.fillColor,
        strokeColor: typeof style.strokeColor === 'string' && style.strokeColor ? style.strokeColor : defaultStyle.strokeColor,
        strokeWidth: Number.isFinite(style.strokeWidth) ? style.strokeWidth : defaultStyle.strokeWidth,
        opacity: Number.isFinite(style.opacity) ? style.opacity : defaultStyle.opacity,
      }
    })

  const validShapeIdSet = new Set(shapes.map((shape) => shape.id))
  const connections = normalizeConnections(relationsSource)
    .map((connection, index) => ({
      ...connection,
      id: connection.id || `connection-${index}`,
    }))
    .filter((connection) => (
      validShapeIdSet.has(connection.fromShapeId)
      && validShapeIdSet.has(connection.toShapeId)
    ))

  return {
    shapes,
    connections,
  }
}
