import { useCallback, useRef, useState } from 'react'
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
}) {
  const connectionIdRef = useRef(0)
  const [shapeConnections, setShapeConnections] = useState([])
  const [connectionSourceShapeId, setConnectionSourceShapeId] = useState(null)

  const availableShapeIdSet = new Set(shapes.map((shape) => shape.id))
  const activeConnectionSourceShapeId = (
    connectionSourceShapeId
    && !isPenTool
    && selectedShapeIds.length === 1
    && selectedShapeIds[0] === connectionSourceShapeId
    && availableShapeIdSet.has(connectionSourceShapeId)
  )
    ? connectionSourceShapeId
    : null

  const isConnecting = Boolean(activeConnectionSourceShapeId)
  const canToggleConnectionMode = isConnecting || selectedShapeIds.length === 1

  const createConnectionBetweenShapes = useCallback((fromShapeId, toShapeId) => {
    if (!fromShapeId || !toShapeId || fromShapeId === toShapeId) {
      return false
    }

    const nextPairKey = getConnectionPairKey(fromShapeId, toShapeId)
    const currentShapeIdSet = new Set(shapes.map((shape) => shape.id))
    const validConnections = shapeConnections.filter((connection) => (
      currentShapeIdSet.has(connection.fromShapeId) && currentShapeIdSet.has(connection.toShapeId)
    ))
    const hasConnection = validConnections.some((connection) => (
      getConnectionPairKey(connection.fromShapeId, connection.toShapeId) === nextPairKey
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
    }
    connectionIdRef.current += 1
    setShapeConnections([...validConnections, nextConnection])
    return true
  }, [shapes, shapeConnections])

  const tryHandleConnectionPointerDown = useCallback((event) => {
    if (!isConnecting || event.button !== 0) {
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
  }, [isConnecting, viewport, shapes, activeConnectionSourceShapeId, createConnectionBetweenShapes])

  const toggleConnectionMode = useCallback(() => {
    if (selectedShapeIds.length !== 1) {
      return
    }

    const [nextSourceShapeId] = selectedShapeIds
    setConnectionSourceShapeId((previousSourceShapeId) => (
      previousSourceShapeId === nextSourceShapeId ? null : nextSourceShapeId
    ))
  }, [selectedShapeIds])

  const removeConnectionsByShapeIds = useCallback((shapeIds) => {
    if (!shapeIds || shapeIds.length === 0) {
      return
    }

    const removedIdSet = new Set(shapeIds)
    setShapeConnections((previousConnections) => previousConnections.filter((connection) => (
      !removedIdSet.has(connection.fromShapeId) && !removedIdSet.has(connection.toShapeId)
    )))
  }, [])

  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const validShapeConnections = shapeConnections.filter((connection) => (
    shapeById.has(connection.fromShapeId) && shapeById.has(connection.toShapeId)
  ))

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
      start: worldToScreenPoint(startWorld, viewport),
      end: worldToScreenPoint(endWorld, viewport),
    }
  }).filter(Boolean)

  return {
    isConnecting,
    canToggleConnectionMode,
    toggleConnectionMode,
    tryHandleConnectionPointerDown,
    removeConnectionsByShapeIds,
    validShapeConnections,
    connectorSegments,
  }
}
