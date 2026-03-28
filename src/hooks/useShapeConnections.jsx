import { useCallback, useMemo, useState } from 'react'
import {
  findTopShapeAtPoint,
  getConnectionPairKey,
  getConnectorAnchorWorld,
  getWorldPoint,
  worldToScreenPoint,
} from '../components/canvas/canvasUtils'
import {
  normalizeConnection,
  isConnectionValid,
} from '../interpreter/normalizers/connectionNormalizer'

export function useShapeConnections({
  shapes,
  connections,
  onConnectionsChange,
  isPenTool,
  viewport,
  connectionToolMode,
  onDirectionalConnectionComplete,
}) {
  const [toolConnectionSourceShapeId, setToolConnectionSourceShapeId] = useState(null)

  const normalizedConnections = useMemo(() => {
    if (!Array.isArray(connections)) {
      return []
    }

    return connections
      .map(normalizeConnection)
      .filter(Boolean)
      .filter(isConnectionValid)
  }, [connections])

  const activeConnectionToolMode = (
    !isPenTool && (connectionToolMode === 'contains' || connectionToolMode === 'depends_on')
  )
    ? connectionToolMode
    : null
  const isDirectionalConnectionToolActive = activeConnectionToolMode === 'depends_on'

  const availableShapeIdSet = new Set(shapes.map((shape) => shape.id))
  const effectiveToolConnectionSourceShapeId = (
    activeConnectionToolMode
    && toolConnectionSourceShapeId
    && availableShapeIdSet.has(toolConnectionSourceShapeId)
  )
    ? toolConnectionSourceShapeId
    : null
  const isConnecting = Boolean(activeConnectionToolMode)

  const getConnectionUniqueKey = (connection) => {
    const relationKind = connection.relationKind === 'depends_on' ? 'depends_on' : 'contains'
    const dependencyType = relationKind === 'depends_on'
      ? (typeof connection.dependencyType === 'string' && connection.dependencyType.trim()
        ? connection.dependencyType.trim()
        : 'depends_on')
      : ''

    return `${relationKind}|${getConnectionPairKey(connection.fromShapeId, connection.toShapeId)}|${dependencyType}`
  }

  const createConnectionBetweenShapes = useCallback((fromShapeId, toShapeId, options = {}) => {
    if (!fromShapeId || !toShapeId || fromShapeId === toShapeId) {
      return false
    }

    const relationKind = options.relationKind === 'depends_on' ? 'depends_on' : 'contains'
    const dependencyType = relationKind === 'depends_on'
      ? (typeof options.dependencyType === 'string' && options.dependencyType.trim()
        ? options.dependencyType.trim()
        : 'depends_on')
      : null

    const nextConnectionKey = getConnectionUniqueKey({
      fromShapeId,
      toShapeId,
      relationKind,
      dependencyType,
    })
    const currentShapeIdSet = new Set(shapes.map((shape) => shape.id))
    const validConnections = normalizedConnections.filter((connection) => (
      currentShapeIdSet.has(connection.fromShapeId) && currentShapeIdSet.has(connection.toShapeId)
    ))
    const hasConnection = validConnections.some((connection) => (
      getConnectionUniqueKey(connection) === nextConnectionKey
    ))

    if (hasConnection) {
      if (validConnections.length !== normalizedConnections.length && typeof onConnectionsChange === 'function') {
        onConnectionsChange(validConnections)
      }
      return false
    }

    const nextConnection = {
      id: `connection-${normalizedConnections.reduce((maxValue, connection) => {
        const match = /^connection-(\d+)$/.exec(connection.id)
        if (!match) {
          return maxValue
        }

        const value = Number(match[1])
        if (!Number.isFinite(value)) {
          return maxValue
        }

        return Math.max(maxValue, value + 1)
      }, 0)}`,
      fromShapeId,
      toShapeId,
      relationKind,
      dependencyType,
    }

    if (typeof onConnectionsChange === 'function') {
      onConnectionsChange([...validConnections, nextConnection])
    }
    return true
  }, [shapes, normalizedConnections, onConnectionsChange])

  const tryHandleConnectionPointerDown = useCallback((event) => {
    if (event.button !== 0) {
      return false
    }

    if (activeConnectionToolMode) {
      const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
      const hitShape = findTopShapeAtPoint(worldPoint, shapes)

      event.preventDefault()
      if (!hitShape) {
        setToolConnectionSourceShapeId(null)
        return true
      }

      if (!effectiveToolConnectionSourceShapeId) {
        setToolConnectionSourceShapeId(hitShape.id)
        return true
      }

      if (hitShape.id === effectiveToolConnectionSourceShapeId) {
        setToolConnectionSourceShapeId(null)
        return true
      }

      createConnectionBetweenShapes(effectiveToolConnectionSourceShapeId, hitShape.id, {
        relationKind: activeConnectionToolMode,
        dependencyType: activeConnectionToolMode === 'depends_on' ? 'depends_on' : null,
      })
      setToolConnectionSourceShapeId(null)
      if (typeof onDirectionalConnectionComplete === 'function') {
        onDirectionalConnectionComplete()
      }
      return true
    }

    return false
  }, [
    activeConnectionToolMode,
    viewport,
    shapes,
    effectiveToolConnectionSourceShapeId,
    createConnectionBetweenShapes,
    onDirectionalConnectionComplete,
  ])

  const removeConnectionsByShapeIds = useCallback((shapeIds) => {
    if (!shapeIds || shapeIds.length === 0) {
      return
    }

    const removedIdSet = new Set(shapeIds)
    if (typeof onConnectionsChange !== 'function') {
      return
    }

    onConnectionsChange(normalizedConnections.filter((connection) => (
      !removedIdSet.has(connection.fromShapeId) && !removedIdSet.has(connection.toShapeId)
    )))
  }, [normalizedConnections, onConnectionsChange])

  const updateConnectionById = useCallback((connectionId, patch) => {
    if (!connectionId || !patch || typeof patch !== 'object') {
      return
    }

    if (typeof onConnectionsChange !== 'function') {
      return
    }

    onConnectionsChange(normalizedConnections.map((connection) => {
      if (connection.id !== connectionId) {
        return connection
      }

      const relationKind = connection.relationKind === 'depends_on' ? 'depends_on' : 'contains'
      const nextDependencyType = relationKind === 'depends_on'
        ? (typeof patch.dependencyType === 'string' && patch.dependencyType.trim()
          ? patch.dependencyType.trim()
          : (typeof connection.dependencyType === 'string' && connection.dependencyType.trim()
            ? connection.dependencyType.trim()
            : 'depends_on'))
        : null

      return {
        ...connection,
        dependencyType: nextDependencyType,
      }
    }))
  }, [normalizedConnections, onConnectionsChange])

  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const validShapeConnections = normalizedConnections.filter((connection) => (
    shapeById.has(connection.fromShapeId) && shapeById.has(connection.toShapeId)
  )).map((connection) => {
    const relationKind = connection.relationKind === 'depends_on' ? 'depends_on' : 'contains'
    return {
      ...connection,
      relationKind,
      dependencyType: relationKind === 'depends_on'
        ? (typeof connection.dependencyType === 'string' && connection.dependencyType.trim()
          ? connection.dependencyType.trim()
          : 'depends_on')
        : null,
    }
  })

  const connectorSegments = validShapeConnections.map((connection) => {
    const fromShape = shapeById.get(connection.fromShapeId)
    const toShape = shapeById.get(connection.toShapeId)

    if (!fromShape || !toShape) {
      return null
    }

    const fromCenter = { x: fromShape.x, y: fromShape.y }
    const toCenter = { x: toShape.x, y: toShape.y }
    const startWorld = getConnectorAnchorWorld(fromShape, toCenter)
    const endWorld = getConnectorAnchorWorld(toShape, fromCenter)

    return {
      id: connection.id,
      fromShapeId: connection.fromShapeId,
      toShapeId: connection.toShapeId,
      relationKind: connection.relationKind,
      dependencyType: connection.dependencyType,
      start: worldToScreenPoint(startWorld, viewport),
      end: worldToScreenPoint(endWorld, viewport),
    }
  }).filter(Boolean)

  return {
    isConnecting,
    isDirectionalConnectionToolActive,
    tryHandleConnectionPointerDown,
    removeConnectionsByShapeIds,
    updateConnectionById,
    validShapeConnections,
    connectorSegments,
  }
}
