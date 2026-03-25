import { useCallback } from 'react'
import {
  getKindByShapeType,
  getShapeTypeByKind,
  normalizeNodePayload,
} from '../constants/nodeKinds'
import { getShapeDefaultSize, getShapeDefaultStyle } from '../constants/shapeConfigs'

export function useImportModel({ onImported }) {
  return useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      try {
        const content = await file.text()
        const parsed = JSON.parse(content)

        const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : []
        const relationsSource = Array.isArray(parsed?.relations)
          ? parsed.relations
          : [
            ...(Array.isArray(parsed?.structureRelations) ? parsed.structureRelations : []),
            ...(Array.isArray(parsed?.dependencies) ? parsed.dependencies.map((item) => ({
              ...item,
              relationKind: 'depends_on',
              dependencyType: item?.type,
            })) : []),
          ]

        const importedShapes = nodes
          .filter((node) => node && typeof node === 'object' && typeof node.id === 'string' && node.id)
          .map((node) => {
            const kind = typeof node.kind === 'string' ? node.kind : getKindByShapeType(node.type)
            const geometry = node.geometry && typeof node.geometry === 'object' ? node.geometry : {}
            const style = node.style && typeof node.style === 'object' ? node.style : {}
            const shapeType = getShapeTypeByKind(kind)
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

        const validShapeIdSet = new Set(importedShapes.map((shape) => shape.id))
        const importedConnections = relationsSource
          .filter((relation) => relation && typeof relation === 'object')
          .map((relation, index) => {
            const relationKind = relation.relationKind === 'depends_on' ? 'depends_on' : 'contains'
            const fromShapeId = typeof relation.fromShapeId === 'string' ? relation.fromShapeId : relation.from
            const toShapeId = typeof relation.toShapeId === 'string' ? relation.toShapeId : relation.to

            return {
              id: typeof relation.id === 'string' && relation.id ? relation.id : `connection-${index}`,
              fromShapeId,
              toShapeId,
              relationKind,
              dependencyType: relationKind === 'depends_on'
                ? (typeof relation.dependencyType === 'string' && relation.dependencyType.trim()
                  ? relation.dependencyType.trim()
                  : 'depends_on')
                : null,
            }
          })
          .filter((relation) => (
            typeof relation.fromShapeId === 'string'
            && relation.fromShapeId
            && typeof relation.toShapeId === 'string'
            && relation.toShapeId
            && relation.fromShapeId !== relation.toShapeId
            && validShapeIdSet.has(relation.fromShapeId)
            && validShapeIdSet.has(relation.toShapeId)
          ))

        if (importedShapes.length === 0) {
          alert('导入失败：JSON 中未找到可用节点数据')
          return
        }

        onImported({
          shapes: importedShapes,
          connections: importedConnections,
        })

        alert(`导入成功：${importedShapes.length} 个节点，${importedConnections.length} 条连线`)
      } catch {
        alert('导入失败：JSON 格式无效或数据不兼容')
      }
    }

    input.click()
  }, [onImported])
}
