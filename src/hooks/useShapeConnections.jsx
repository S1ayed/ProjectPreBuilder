import { useCallback, useEffect, useRef, useState } from 'react'
import {
  findTopShapeAtPoint,
  getConnectionPairKey,
  getConnectorAnchorWorld,
  getWorldPoint,
  worldToScreenPoint,
} from '../components/canvas/canvasUtils'

export function useShapeConnections({
  shapes,
  selectedShapeIds,
  isPenTool,
  viewport,
  connectionToolMode,
  onDirectionalConnectionComplete,
}) {
  const connectionIdRef = useRef(0)
  const [shapeConnections, setShapeConnections] = useState([])
  const [connectionSourceShapeId, setConnectionSourceShapeId] = useState(null)
  const [toolConnectionSourceShapeId, setToolConnectionSourceShapeId] = useState(null)

  const isDirectionalConnectionToolActive = connectionToolMode === 'depends_on' && !isPenTool

  const availableShapeIdSet = new Set(shapes.map((shape) => shape.id))
  const activeConnectionSourceShapeId = (
    connectionSourceShapeId
    && !isPenTool
    && !isDirectionalConnectionToolActive
    && selectedShapeIds.length === 1
    && selectedShapeIds[0] === connectionSourceShapeId
    && availableShapeIdSet.has(connectionSourceShapeId)
  )
    ? connectionSourceShapeId
    : null

  const isConnecting = Boolean(activeConnectionSourceShapeId) || isDirectionalConnectionToolActive
  const canToggleConnectionMode = !isDirectionalConnectionToolActive && (
    Boolean(activeConnectionSourceShapeId) || selectedShapeIds.length === 1
  )

  useEffect(() => {
    if (!isDirectionalConnectionToolActive && toolConnectionSourceShapeId !== null) {
      setToolConnectionSourceShapeId(null)
    }
  }, [isDirectionalConnectionToolActive, toolConnectionSourceShapeId])

  useEffect(() => {
    if (isDirectionalConnectionToolActive && connectionSourceShapeId !== null) {
      setConnectionSourceShapeId(null)
    }
  }, [isDirectionalConnectionToolActive, connectionSourceShapeId])

  useEffect(() => {
    if (toolConnectionSourceShapeId && !availableShapeIdSet.has(toolConnectionSourceShapeId)) {
      setToolConnectionSourceShapeId(null)
    }
  }, [toolConnectionSourceShapeId, availableShapeIdSet])

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
    const validConnections = shapeConnections.filter((connection) => (
      currentShapeIdSet.has(connection.fromShapeId) && currentShapeIdSet.has(connection.toShapeId)
    ))
    const hasConnection = validConnections.some((connection) => (
      getConnectionUniqueKey(connection) === nextConnectionKey
    ))

    if (hasConnection) {
      if (validConnections.length !== shapeConnections.length) {
        setShapeConnections(validConnections)
      }
      return false
    }

    const nextConnection = {
      id: `connection-${connectionIdRef.current}`,
      fromShapeId,
      toShapeId,
      relationKind,
      dependencyType,
    }
    connectionIdRef.current += 1
    setShapeConnections([...validConnections, nextConnection])
    return true
  }, [shapes, shapeConnections])

  const tryHandleConnectionPointerDown = useCallback((event) => {
    if (event.button !== 0) {
      return false
    }

    if (isDirectionalConnectionToolActive) {
      const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
      const hitShape = findTopShapeAtPoint(worldPoint, shapes)

      event.preventDefault()
      if (!hitShape) {
        setToolConnectionSourceShapeId(null)
        return true
      }

      if (!toolConnectionSourceShapeId) {
        setToolConnectionSourceShapeId(hitShape.id)
        return true
      }

      if (hitShape.id === toolConnectionSourceShapeId) {
        setToolConnectionSourceShapeId(null)
        return true
      }

      createConnectionBetweenShapes(toolConnectionSourceShapeId, hitShape.id, {
        relationKind: 'depends_on',
        dependencyType: 'depends_on',
      })
      setToolConnectionSourceShapeId(null)
      if (typeof onDirectionalConnectionComplete === 'function') {
        onDirectionalConnectionComplete()
      }
      return true
    }

    if (!activeConnectionSourceShapeId) {
      return false
    }

    const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
    const hitShape = findTopShapeAtPoint(worldPoint, shapes)

    event.preventDefault()
    if (!hitShape) {
      return true
    }

    if (hitShape.id === activeConnectionSourceShapeId) {
      setConnectionSourceShapeId(null)
      return true
    }

    const didConnect = createConnectionBetweenShapes(activeConnectionSourceShapeId, hitShape.id)
    if (didConnect) {
      setConnectionSourceShapeId(null)
    }

    return true
  }, [
    isDirectionalConnectionToolActive,
    viewport,
    shapes,
    toolConnectionSourceShapeId,
    createConnectionBetweenShapes,
    onDirectionalConnectionComplete,
    activeConnectionSourceShapeId,
  ])

  const toggleConnectionMode = useCallback(() => {
    if (isDirectionalConnectionToolActive) {
      return
    }

    if (selectedShapeIds.length !== 1) {
      return
    }

    const [nextSourceShapeId] = selectedShapeIds
    setConnectionSourceShapeId((previousSourceShapeId) => (
      previousSourceShapeId === nextSourceShapeId ? null : nextSourceShapeId
    ))
  }, [selectedShapeIds, isDirectionalConnectionToolActive])

  const removeConnectionsByShapeIds = useCallback((shapeIds) => {
    if (!shapeIds || shapeIds.length === 0) {
      return
    }

    const removedIdSet = new Set(shapeIds)
    setShapeConnections((previousConnections) => previousConnections.filter((connection) => (
      !removedIdSet.has(connection.fromShapeId) && !removedIdSet.has(connection.toShapeId)
    )))
  }, [])

  const updateConnectionById = useCallback((connectionId, patch) => {
    if (!connectionId || !patch || typeof patch !== 'object') {
      return
    }

    setShapeConnections((previousConnections) => previousConnections.map((connection) => {
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
  }, [])

  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const validShapeConnections = shapeConnections.filter((connection) => (
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
    canToggleConnectionMode,
    toggleConnectionMode,
    tryHandleConnectionPointerDown,
    removeConnectionsByShapeIds,
    updateConnectionById,
    validShapeConnections,
    connectorSegments,
  }
}
