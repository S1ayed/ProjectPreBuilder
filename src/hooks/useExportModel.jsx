import { useCallback } from 'react'
import { getKindByShapeType, normalizeNodePayload } from '../constants/nodeKinds'

export function useExportModel({ shapes, connections }) {
  return useCallback(() => {
    const nodes = shapes.map((shape) => {
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

    const relations = connections.map((connection) => {
      const relationKind = connection.relationKind === 'depends_on' ? 'depends_on' : 'contains'
      const dependencyType = relationKind === 'depends_on'
        ? (typeof connection.dependencyType === 'string' && connection.dependencyType.trim()
          ? connection.dependencyType.trim()
          : 'depends_on')
        : null

      return {
        id: connection.id,
        relationKind,
        from: connection.fromShapeId,
        to: connection.toShapeId,
        dependencyType,
      }
    })

    const structureRelations = relations.filter((relation) => relation.relationKind === 'contains')
    const dependencies = relations
      .filter((relation) => relation.relationKind === 'depends_on')
      .map((relation) => ({
        id: relation.id,
        from: relation.from,
        to: relation.to,
        type: relation.dependencyType || 'depends_on',
      }))

    const model = {
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

    const fileContent = `${JSON.stringify(model, null, 2)}\n`
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = 'prebuilder-model.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  }, [shapes, connections])
}
