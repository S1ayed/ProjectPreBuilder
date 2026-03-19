import { useCallback, useEffect, useRef, useState } from 'react'
import ShapeStyleToolbar from './ShapeStyleToolbar'
import { useCanvasMouseActions } from '../movements/canvasMouseActions'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const supportedShapeTypes = new Set(['rect', 'oval', 'diamond'])
const PEN_STROKE_COLOR = '#1a73e8'
const PEN_STROKE_WIDTH = 2.6
const PEN_MOVE_THRESHOLD_PX = 2
const CONNECTOR_STROKE_COLOR = '#2f5b8a'
const CONNECTOR_STROKE_WIDTH = 2

const defaultShapeSizes = {
  rect: { width: 120, height: 86 },
  oval: { width: 128, height: 88 },
  diamond: { width: 108, height: 108 },
}

const defaultShapeStyles = {
  fillColor: '#6f9ee0',
  strokeColor: '#51618f',
  strokeWidth: 2,
  opacity: 1,
}

const hasShapePayload = (dataTransfer) => {
  const types = Array.from(dataTransfer.types || [])
  return (
    types.includes('application/x-workbench-shape')
    || types.includes('application/json')
    || types.includes('text/plain')
  )
}

const extractShapeType = (dataTransfer) => {
  const directType = dataTransfer.getData('application/x-workbench-shape')
  if (supportedShapeTypes.has(directType)) {
    return directType
  }

  const jsonPayload = dataTransfer.getData('application/json')
  if (jsonPayload) {
    try {
      const parsed = JSON.parse(jsonPayload)
      if (supportedShapeTypes.has(parsed.shapeType)) {
        return parsed.shapeType
      }
    } catch {
      // Ignore invalid JSON payload from non-workbench drags.
    }
  }

  const plainText = dataTransfer.getData('text/plain')
  if (supportedShapeTypes.has(plainText)) {
    return plainText
  }

  return ''
}

const getWorldPoint = (event, viewportElement, viewport) => {
  const rect = viewportElement.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top

  return {
    x: (localX - viewport.x) / viewport.zoom,
    y: (localY - viewport.y) / viewport.zoom,
  }
}

const getShapeScreenPosition = (shape, viewport) => ({
  left: shape.x * viewport.zoom + viewport.x,
  top: shape.y * viewport.zoom + viewport.y,
})

const getShapeSize = (shape) => {
  if (typeof shape.width === 'number' && typeof shape.height === 'number' && shape.width > 0 && shape.height > 0) {
    return { width: shape.width, height: shape.height }
  }

  return defaultShapeSizes[shape.type] || defaultShapeSizes.rect
}

const getShapeBoundsWorld = (shape) => {
  const size = getShapeSize(shape)
  return {
    x1: shape.x - size.width / 2,
    y1: shape.y - size.height / 2,
    x2: shape.x + size.width / 2,
    y2: shape.y + size.height / 2,
  }
}

const isPointInsideRect = (point, rect) => (
  point.x >= rect.x1 && point.x <= rect.x2 && point.y >= rect.y1 && point.y <= rect.y2
)

const findTopShapeAtPoint = (point, shapeList) => {
  for (let index = shapeList.length - 1; index >= 0; index -= 1) {
    const shape = shapeList[index]
    if (isPointInsideRect(point, getShapeBoundsWorld(shape))) {
      return shape
    }
  }

  return null
}

const getConnectionPairKey = (fromShapeId, toShapeId) => {
  const orderedIds = [fromShapeId, toShapeId].sort()
  return `${orderedIds[0]}::${orderedIds[1]}`
}

const getConnectorAnchorWorld = (shape, targetPoint) => {
  const size = getShapeSize(shape)
  const halfWidth = Math.max(1, size.width / 2)
  const halfHeight = Math.max(1, size.height / 2)
  const deltaX = targetPoint.x - shape.x
  const deltaY = targetPoint.y - shape.y

  if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
    return { x: shape.x, y: shape.y }
  }

  if (shape.type === 'oval') {
    const denominator = Math.sqrt((deltaX * deltaX) / (halfWidth * halfWidth) + (deltaY * deltaY) / (halfHeight * halfHeight)) || 1
    const ratio = 1 / denominator
    return {
      x: shape.x + deltaX * ratio,
      y: shape.y + deltaY * ratio,
    }
  }

  if (shape.type === 'diamond') {
    const denominator = Math.abs(deltaX) / halfWidth + Math.abs(deltaY) / halfHeight || 1
    const ratio = 1 / denominator
    return {
      x: shape.x + deltaX * ratio,
      y: shape.y + deltaY * ratio,
    }
  }

  const denominator = Math.max(Math.abs(deltaX) / halfWidth, Math.abs(deltaY) / halfHeight) || 1
  const ratio = 1 / denominator

  return {
    x: shape.x + deltaX * ratio,
    y: shape.y + deltaY * ratio,
  }
}

const worldToScreenPoint = (worldPoint, viewport) => ({
  x: worldPoint.x * viewport.zoom + viewport.x,
  y: worldPoint.y * viewport.zoom + viewport.y,
})

const buildStrokePathData = (points, viewport) => {
  if (!points || points.length === 0) {
    return ''
  }

  const first = worldToScreenPoint(points[0], viewport)
  const commands = [`M ${first.x} ${first.y}`]

  for (let index = 1; index < points.length; index += 1) {
    const point = worldToScreenPoint(points[index], viewport)
    commands.push(`L ${point.x} ${point.y}`)
  }

  return commands.join(' ')
}

const getRulerMarks = ({ trackLength, offsetPx, zoom }) => {
  if (trackLength <= 0 || zoom <= 0) {
    return []
  }

  const targetStepPx = 72
  const roughWorldStep = targetStepPx / zoom
  const worldStep = Math.max(20, Math.round(roughWorldStep / 10) * 10)
  const worldStart = (-offsetPx) / zoom
  const worldEnd = (trackLength - offsetPx) / zoom
  const firstMark = Math.floor(worldStart / worldStep) * worldStep
  const marks = []

  for (let worldValue = firstMark; worldValue <= worldEnd; worldValue += worldStep) {
    const screenValue = worldValue * zoom + offsetPx
    marks.push({
      worldValue: Math.round(worldValue),
      screenValue,
    })
  }

  return marks
}

const getAlignmentGuideLines = (boundsWorld, viewport) => {
  if (!boundsWorld) {
    return []
  }

  const centerX = (boundsWorld.x1 + boundsWorld.x2) / 2
  const centerY = (boundsWorld.y1 + boundsWorld.y2) / 2

  return [
    { id: 'x-start', orientation: 'vertical', position: worldToScreenPoint({ x: boundsWorld.x1, y: 0 }, viewport).x, emphasis: 'edge' },
    { id: 'x-center', orientation: 'vertical', position: worldToScreenPoint({ x: centerX, y: 0 }, viewport).x, emphasis: 'center' },
    { id: 'x-end', orientation: 'vertical', position: worldToScreenPoint({ x: boundsWorld.x2, y: 0 }, viewport).x, emphasis: 'edge' },
    { id: 'y-start', orientation: 'horizontal', position: worldToScreenPoint({ x: 0, y: boundsWorld.y1 }, viewport).y, emphasis: 'edge' },
    { id: 'y-center', orientation: 'horizontal', position: worldToScreenPoint({ x: 0, y: centerY }, viewport).y, emphasis: 'center' },
    { id: 'y-end', orientation: 'horizontal', position: worldToScreenPoint({ x: 0, y: boundsWorld.y2 }, viewport).y, emphasis: 'edge' },
  ]
}

const getShapeVisualStyle = (shape) => ({
  fillColor: shape.fillColor || defaultShapeStyles.fillColor,
  strokeColor: shape.strokeColor || defaultShapeStyles.strokeColor,
  strokeWidth: typeof shape.strokeWidth === 'number' ? shape.strokeWidth : defaultShapeStyles.strokeWidth,
  opacity: typeof shape.opacity === 'number' ? shape.opacity : defaultShapeStyles.opacity,
})

const getSelectedBoundsWorld = (shapeList, selectedIdSet) => {
  const selectedShapes = shapeList.filter((shape) => selectedIdSet.has(shape.id))
  if (selectedShapes.length === 0) {
    return null
  }

  return selectedShapes.reduce((accumulator, shape) => {
    const bounds = getShapeBoundsWorld(shape)
    return {
      x1: Math.min(accumulator.x1, bounds.x1),
      y1: Math.min(accumulator.y1, bounds.y1),
      x2: Math.max(accumulator.x2, bounds.x2),
      y2: Math.max(accumulator.y2, bounds.y2),
    }
  }, {
    x1: Number.POSITIVE_INFINITY,
    y1: Number.POSITIVE_INFINITY,
    x2: Number.NEGATIVE_INFINITY,
    y2: Number.NEGATIVE_INFINITY,
  })
}

function DraggableGridCanvas({
  viewport,
  onViewportChange,
  shapes,
  onAddShape,
  onShapesChange,
  activeTool,
  showRuler,
  showAlignmentGuides,
}) {
  const viewportRef = useRef(null)
  const drawInteractionRef = useRef({ mode: 'idle' })
  const strokeIdRef = useRef(0)
  const connectionIdRef = useRef(0)
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [penStrokes, setPenStrokes] = useState([])
  const [shapeConnections, setShapeConnections] = useState([])
  const [connectionSourceShapeId, setConnectionSourceShapeId] = useState(null)

  const isPenTool = activeTool === 'pen'

  const minorGrid = 24 * viewport.zoom
  const majorGrid = minorGrid * 5

  const gridStyle = {
    '--minor-grid-size': `${minorGrid}px`,
    '--major-grid-size': `${majorGrid}px`,
    '--offset-x': `${viewport.x}px`,
    '--offset-y': `${viewport.y}px`,
  }

  const updateViewport = (next) => {
    onViewportChange({
      x: next.x,
      y: next.y,
      zoom: clamp(next.zoom, 0.45, 2.2),
    })
  }

  const {
    isPanning,
    selectedShapeIds,
    selectionRectWorld,
    clearSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleResizePointerDown,
  } = useCanvasMouseActions({
    viewport,
    viewportRef,
    shapes,
    onViewportChange: updateViewport,
    onShapesChange,
    getWorldPoint,
    getShapeBoundsWorld,
    getShapeSize,
  })

  const selectedShapeIdSet = new Set(selectedShapeIds)
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

  const startPenStroke = (event) => {
    if (event.button !== 0 || !viewportRef.current) {
      return false
    }

    event.preventDefault()
    const startPoint = getWorldPoint(event, event.currentTarget, viewport)
    const strokeId = `stroke-${strokeIdRef.current}`
    strokeIdRef.current += 1

    setPenStrokes((previous) => [...previous, {
      id: strokeId,
      points: [startPoint],
    }])

    viewportRef.current.setPointerCapture(event.pointerId)
    drawInteractionRef.current = {
      mode: 'drawing',
      pointerId: event.pointerId,
      strokeId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    }

    return true
  }

  const appendPenStrokePoint = (event) => {
    const interaction = drawInteractionRef.current
    if (interaction.mode !== 'drawing' || interaction.pointerId !== event.pointerId) {
      return false
    }

    const deltaX = event.clientX - interaction.lastClientX
    const deltaY = event.clientY - interaction.lastClientY
    if (Math.hypot(deltaX, deltaY) < PEN_MOVE_THRESHOLD_PX) {
      return true
    }

    const nextPoint = getWorldPoint(event, event.currentTarget, viewport)
    setPenStrokes((previous) => previous.map((stroke) => {
      if (stroke.id !== interaction.strokeId) {
        return stroke
      }

      return {
        ...stroke,
        points: [...stroke.points, nextPoint],
      }
    }))

    drawInteractionRef.current = {
      ...interaction,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    }
    return true
  }

  const finishPenStroke = (event) => {
    const interaction = drawInteractionRef.current
    if (interaction.mode !== 'drawing' || interaction.pointerId !== event.pointerId) {
      return false
    }

    if (viewportRef.current && viewportRef.current.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId)
    }

    drawInteractionRef.current = { mode: 'idle' }
    return true
  }

  const createConnectionBetweenShapes = useCallback((fromShapeId, toShapeId) => {
    if (!fromShapeId || !toShapeId || fromShapeId === toShapeId) {
      return
    }

    const nextPairKey = getConnectionPairKey(fromShapeId, toShapeId)
    const currentShapeIdSet = new Set(shapes.map((shape) => shape.id))
    setShapeConnections((previousConnections) => {
      const validConnections = previousConnections.filter((connection) => (
        currentShapeIdSet.has(connection.fromShapeId) && currentShapeIdSet.has(connection.toShapeId)
      ))
      const hasConnection = validConnections.some((connection) => (
        getConnectionPairKey(connection.fromShapeId, connection.toShapeId) === nextPairKey
      ))

      if (hasConnection) {
        return validConnections
      }

      const nextConnection = {
        id: `connection-${connectionIdRef.current}`,
        fromShapeId,
        toShapeId,
      }
      connectionIdRef.current += 1

      return [...validConnections, nextConnection]
    })
  }, [shapes])

  const handleViewportPointerDown = (event) => {
    if (isPenTool && event.button === 0) {
      startPenStroke(event)
      return
    }

    if (isConnecting && event.button === 0) {
      const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
      const hitShape = findTopShapeAtPoint(worldPoint, shapes)

      event.preventDefault()
      if (!hitShape) {
        return
      }

      if (hitShape.id === activeConnectionSourceShapeId) {
        setConnectionSourceShapeId(null)
        return
      }

      createConnectionBetweenShapes(activeConnectionSourceShapeId, hitShape.id)
      return
    }

    handlePointerDown(event)
  }

  const handleViewportPointerMove = (event) => {
    if (drawInteractionRef.current.mode === 'drawing') {
      appendPenStrokePoint(event)
      return
    }

    handlePointerMove(event)
  }

  const handleViewportPointerUp = (event) => {
    if (finishPenStroke(event)) {
      return
    }

    handlePointerUp(event)
  }

  const handleViewportPointerCancel = (event) => {
    if (finishPenStroke(event)) {
      return
    }

    handlePointerCancel(event)
  }

  useEffect(() => {
    if (!viewportRef.current) {
      return undefined
    }

    const syncViewportSize = () => {
      if (!viewportRef.current) {
        return
      }

      const rect = viewportRef.current.getBoundingClientRect()
      setViewportSize({ width: rect.width, height: rect.height })
    }

    syncViewportSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncViewportSize)
      return () => {
        window.removeEventListener('resize', syncViewportSize)
      }
    }

    const resizeObserver = new ResizeObserver(syncViewportSize)
    resizeObserver.observe(viewportRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleWheel = (event) => {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()
    const delta = event.deltaY < 0 ? 0.1 : -0.1

    updateViewport({
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom + delta,
    })
  }

  const handleDragOver = (event) => {
    if (!hasShapePayload(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropTarget(true)
  }

  const handleDragLeave = () => {
    setIsDropTarget(false)
  }

  const handleDrop = (event) => {
    const shapeType = extractShapeType(event.dataTransfer)

    if (!supportedShapeTypes.has(shapeType)) {
      setIsDropTarget(false)
      return
    }

    event.preventDefault()
    setIsDropTarget(false)
    const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
    onAddShape(shapeType, worldPoint)
  }

  const getMarqueeStyle = () => {
    if (!selectionRectWorld) {
      return null
    }

    const normalizedRect = {
      x1: Math.min(selectionRectWorld.x1, selectionRectWorld.x2),
      y1: Math.min(selectionRectWorld.y1, selectionRectWorld.y2),
      x2: Math.max(selectionRectWorld.x1, selectionRectWorld.x2),
      y2: Math.max(selectionRectWorld.y1, selectionRectWorld.y2),
    }
    const topLeft = worldToScreenPoint({ x: normalizedRect.x1, y: normalizedRect.y1 }, viewport)
    const bottomRight = worldToScreenPoint({ x: normalizedRect.x2, y: normalizedRect.y2 }, viewport)

    return {
      left: `${topLeft.x}px`,
      top: `${topLeft.y}px`,
      width: `${bottomRight.x - topLeft.x}px`,
      height: `${bottomRight.y - topLeft.y}px`,
    }
  }

  const marqueeStyle = getMarqueeStyle()

  const toggleConnectionMode = useCallback(() => {
    if (selectedShapeIds.length !== 1) {
      return
    }

    const [nextSourceShapeId] = selectedShapeIds
    setConnectionSourceShapeId((previousSourceShapeId) => (
      previousSourceShapeId === nextSourceShapeId ? null : nextSourceShapeId
    ))
  }, [selectedShapeIds])

  const applyStylePatchToSelection = (stylePatch) => {
    if (selectedShapeIds.length === 0) {
      return
    }

    onShapesChange((previousShapes) => previousShapes.map((shape) => {
      if (!selectedShapeIdSet.has(shape.id)) {
        return shape
      }

      return {
        ...shape,
        ...stylePatch,
      }
    }))
  }

  const deleteSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) {
      return
    }

    const selectedIds = new Set(selectedShapeIds)
    setShapeConnections((previousConnections) => previousConnections.filter((connection) => (
      !selectedIds.has(connection.fromShapeId) && !selectedIds.has(connection.toShapeId)
    )))
    onShapesChange((previousShapes) => previousShapes.filter((shape) => !selectedIds.has(shape.id)))
    clearSelection()
  }, [selectedShapeIds, onShapesChange, clearSelection])

  useEffect(() => {
    const handleDeleteKey = (event) => {
      if (event.key !== 'Delete' || selectedShapeIds.length === 0) {
        return
      }

      const activeElement = document.activeElement
      const tagName = activeElement?.tagName
      const isInputContext = activeElement && (
        activeElement.isContentEditable
        || tagName === 'INPUT'
        || tagName === 'TEXTAREA'
        || tagName === 'SELECT'
      )

      if (isInputContext) {
        return
      }

      event.preventDefault()
      deleteSelectedShapes()
    }

    window.addEventListener('keydown', handleDeleteKey)
    return () => {
      window.removeEventListener('keydown', handleDeleteKey)
    }
  }, [selectedShapeIds, deleteSelectedShapes])

  const selectedBoundsWorld = getSelectedBoundsWorld(shapes, selectedShapeIdSet)
  const selectedShapes = shapes.filter((shape) => selectedShapeIdSet.has(shape.id))
  const activeStyleSample = selectedShapes.length > 0 ? getShapeVisualStyle(selectedShapes[0]) : defaultShapeStyles
  const canToggleConnectionMode = isConnecting || selectedShapeIds.length === 1
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
  const horizontalRulerMarks = showRuler
    ? getRulerMarks({ trackLength: viewportSize.width, offsetPx: viewport.x, zoom: viewport.zoom })
    : []
  const verticalRulerMarks = showRuler
    ? getRulerMarks({ trackLength: viewportSize.height, offsetPx: viewport.y, zoom: viewport.zoom })
    : []
  const alignmentGuideLines = showAlignmentGuides ? getAlignmentGuideLines(selectedBoundsWorld, viewport) : []

  const getToolbarPosition = () => {
    if (!selectedBoundsWorld) {
      return null
    }

    const selectedCenterX = (selectedBoundsWorld.x1 + selectedBoundsWorld.x2) / 2
    const selectedTop = selectedBoundsWorld.y1

    const centerScreen = worldToScreenPoint({ x: selectedCenterX, y: selectedTop }, viewport)

    return {
      left: centerScreen.x,
      top: Math.max(66, centerScreen.y - 12),
      maxWidth: 640,
    }
  }

  const toolbarPosition = getToolbarPosition()

  return (
    <section className="grid-workspace" aria-label="绘图工作区">
      <div
        ref={viewportRef}
        className={`grid-workspace__viewport ${isPanning ? 'is-panning' : ''} ${isDropTarget ? 'is-drop-target' : ''} ${isPenTool ? 'is-pen' : ''} ${isConnecting ? 'is-connecting' : ''}`}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerCancel}
        onWheel={handleWheel}
        onContextMenu={(event) => event.preventDefault()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!isPenTool && (
          <ShapeStyleToolbar
            position={toolbarPosition}
            styleValues={activeStyleSample}
            selectedCount={selectedShapeIds.length}
            onFillColorChange={(fillColor) => applyStylePatchToSelection({ fillColor })}
            onStrokeColorChange={(strokeColor) => applyStylePatchToSelection({ strokeColor })}
            onStrokeWidthChange={(strokeWidth) => applyStylePatchToSelection({ strokeWidth })}
            onOpacityChange={(opacity) => applyStylePatchToSelection({ opacity })}
            onConnectSelected={toggleConnectionMode}
            canConnectSelected={canToggleConnectionMode}
            isConnectMode={isConnecting}
            onApplyPreset={(preset) => {
              if (preset === 'outline') {
                applyStylePatchToSelection({
                  fillColor: '#ffffff',
                  strokeColor: '#1a73e8',
                  strokeWidth: 2,
                  opacity: 1,
                })
                return
              }

              if (preset === 'highlight') {
                applyStylePatchToSelection({
                  fillColor: '#ffd86b',
                  strokeColor: '#a56b00',
                  strokeWidth: 3,
                  opacity: 1,
                })
                return
              }

              applyStylePatchToSelection(defaultShapeStyles)
            }}
            onDeleteSelected={deleteSelectedShapes}
          />
        )}

        <div className="grid-workspace__grid" style={gridStyle} />

        {alignmentGuideLines.length > 0 && (
          <div className="grid-workspace__guides" aria-hidden="true">
            {alignmentGuideLines.map((line) => (
              <div
                key={line.id}
                className={`grid-workspace__guide-line grid-workspace__guide-line--${line.orientation} grid-workspace__guide-line--${line.emphasis}`}
                style={line.orientation === 'vertical' ? { left: `${line.position}px` } : { top: `${line.position}px` }}
              />
            ))}
          </div>
        )}

        {penStrokes.length > 0 && (
          <svg className="grid-workspace__ink-layer" aria-hidden="true">
            {penStrokes.map((stroke) => {
              if (!stroke.points || stroke.points.length === 0) {
                return null
              }

              if (stroke.points.length === 1) {
                const point = worldToScreenPoint(stroke.points[0], viewport)
                return (
                  <circle
                    key={stroke.id}
                    cx={point.x}
                    cy={point.y}
                    r={PEN_STROKE_WIDTH / 2}
                    fill={PEN_STROKE_COLOR}
                  />
                )
              }

              return (
                <path
                  key={stroke.id}
                  d={buildStrokePathData(stroke.points, viewport)}
                  stroke={PEN_STROKE_COLOR}
                  strokeWidth={PEN_STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )
            })}
          </svg>
        )}

        {connectorSegments.length > 0 && (
          <svg className="grid-workspace__connection-layer" aria-hidden="true">
            {connectorSegments.map((segment) => (
              <line
                key={segment.id}
                className="grid-workspace__connection-line"
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
                stroke={CONNECTOR_STROKE_COLOR}
                strokeWidth={CONNECTOR_STROKE_WIDTH}
              />
            ))}
          </svg>
        )}

        <div className="grid-workspace__shapes" aria-label="画布图形">
          {shapes.map((shape) => {
            const shapeSize = getShapeSize(shape)
            const screenPosition = getShapeScreenPosition(shape, viewport)
            const isSelected = selectedShapeIdSet.has(shape.id)
            const visualStyle = getShapeVisualStyle(shape)
            return (
              <div
                key={`shape-body-${shape.id}`}
                className={`canvas-shape-wrapper ${isSelected ? 'is-selected' : ''}`}
                style={{
                  left: `${screenPosition.left}px`,
                  top: `${screenPosition.top}px`,
                  width: `${shapeSize.width * viewport.zoom}px`,
                  height: `${shapeSize.height * viewport.zoom}px`,
                }}
              >
                <div
                  className={`canvas-shape__body canvas-shape__body--${shape.type}`}
                  style={{
                    backgroundColor: visualStyle.fillColor,
                    borderColor: visualStyle.strokeColor,
                    borderWidth: `${Math.max(1, visualStyle.strokeWidth)}px`,
                    opacity: clamp(visualStyle.opacity, 0.2, 1),
                  }}
                />

                {isSelected && (
                  <button
                    type="button"
                    className="canvas-shape__resize-handle"
                    aria-label="调整图形大小"
                    onPointerDown={(event) => handleResizePointerDown(event, shape)}
                  />
                )}
              </div>
            )
          })}
        </div>

        {marqueeStyle && <div className="grid-workspace__marquee" style={marqueeStyle} aria-hidden="true" />}

        {showRuler && (
          <>
            <div className="grid-workspace__ruler-corner" aria-hidden="true" />
            <div className="grid-workspace__ruler grid-workspace__ruler--horizontal" aria-hidden="true">
              {horizontalRulerMarks.map((mark, index) => (
                <div
                  key={`ruler-h-${index}-${mark.worldValue}`}
                  className="grid-workspace__ruler-mark"
                  style={{ left: `${mark.screenValue}px` }}
                >
                  <span className="grid-workspace__ruler-label">{mark.worldValue}</span>
                </div>
              ))}
            </div>
            <div className="grid-workspace__ruler grid-workspace__ruler--vertical" aria-hidden="true">
              {verticalRulerMarks.map((mark, index) => (
                <div
                  key={`ruler-v-${index}-${mark.worldValue}`}
                  className="grid-workspace__ruler-mark"
                  style={{ top: `${mark.screenValue}px` }}
                >
                  <span className="grid-workspace__ruler-label">{mark.worldValue}</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      <div className="grid-workspace__status">
        <span>Shapes: {shapes.length}</span>
        <span>Connections: {validShapeConnections.length}</span>
        <span>Connect Mode: {isConnecting ? 'On' : 'Off'}</span>
        <span>Selected: {selectedShapeIds.length}</span>
        <span>Offset X: {Math.round(viewport.x)}</span>
        <span>Offset Y: {Math.round(viewport.y)}</span>
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
      </div>
    </section>
  )
}

export default DraggableGridCanvas
