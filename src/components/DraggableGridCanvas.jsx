import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShapeStyleToolbar from './ShapeStyleToolbar'
import { resolvedConnectionPanelRegistry } from './resolvedKindPanel'
import { useCanvasMouseActions } from '../movements/canvasMouseActions'
import { usePenStrokes } from '../hooks/usePenStrokes'
import { useCanvasDropTarget } from '../hooks/useCanvasDropTarget'
import { useShapeConnections } from '../hooks/useShapeConnections'
import { useToolbarPosition } from '../hooks/useToolbarPosition'
import { useViewportSize } from '../hooks/useViewportSize'
import {
  DEFAULT_FILE_NAME,
  getKindByShapeType,
} from '../constants/nodeKinds'
import { isShapeResizable } from '../constants/shapeConfigs'
import { getShapeStylePresetPatch } from '../constants/shapeStylePresets'
import { ZOOM_STEP } from '../movements/zooming'
import {
  buildStrokePathData,
  clamp,
  CONNECTOR_STROKE_COLOR,
  CONNECTOR_STROKE_WIDTH,
  defaultShapeStyles,
  getAlignmentGuideLines,
  getRulerMarks,
  getSelectedBoundsWorld,
  getShapeBoundsWorld,
  getShapeScreenPosition,
  getShapeSize,
  getShapeVisualStyle,
  getWorldPoint,
  PEN_MOVE_THRESHOLD_PX,
  PEN_STROKE_COLOR,
  PEN_STROKE_WIDTH,
  worldToScreenPoint,
} from './canvas/canvasUtils'

const DIRECTIONAL_CONNECTION_MARKER_ID = 'grid-workspace-connection-arrow'
const DEFAULT_TEXT_PLACEHOLDER = '点击编辑文字'

function DraggableGridCanvas({
  viewport,
  onViewportChange,
  shapes,
  connections,
  onAddShape,
  onShapesChange,
  activeTool,
  penSettings,
  showRuler,
  showAlignmentGuides,
  onConnectionsChange,
  onEditSelectedNode,
  connectionToolMode,
  onConnectionToolModeComplete,
  onSelectionChange,
}) {
  const viewportRef = useRef(null)
  const [editingConnectionId, setEditingConnectionId] = useState(null)
  const [hoveredDirectionalConnectionId, setHoveredDirectionalConnectionId] = useState(null)
  const [editingTextId, setEditingTextId] = useState(null)
  const [editingTextValue, setEditingTextValue] = useState('')

  const isPenTool = activeTool === 'pen'
  const viewportSize = useViewportSize(viewportRef)

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
    showSelectionToolbar,
    clearSelection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleResizePointerDown,
    selectShapeById,
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

  useEffect(() => {
    if (typeof onSelectionChange === 'function') {
      onSelectionChange(selectedShapeIds)
    }
  }, [selectedShapeIds, onSelectionChange])
  const {
    penStrokes,
    eraserPreview,
    isEraserMode,
    startPenStroke,
    appendPenStrokePoint,
    finishPenStroke,
    handlePenPointerLeave,
  } = usePenStrokes({
    viewport,
    viewportRef,
    getWorldPoint,
    moveThresholdPx: PEN_MOVE_THRESHOLD_PX,
    penSettings,
  })
  const {
    isConnecting,
    tryHandleConnectionPointerDown,
    removeConnectionsByShapeIds,
    updateConnectionById,
    validShapeConnections,
    connectorSegments,
    isDirectionalConnectionToolActive,
  } = useShapeConnections({
    shapes,
    connections,
    onConnectionsChange,
    isPenTool,
    viewport,
    connectionToolMode,
    onDirectionalConnectionComplete: onConnectionToolModeComplete,
  })

  const {
    isDropTarget,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCanvasDropTarget({
    viewport,
    onAddShape,
  })

  const handleViewportPointerDown = (event) => {
    if (editingTextId) {
      setEditingTextId(null)
      setEditingTextValue('')
    }

    if (isPenTool && event.button === 0) {
      startPenStroke(event)
      return
    }

    if (tryHandleConnectionPointerDown(event)) {
      return
    }

    handlePointerDown(event)
  }

  const handleViewportPointerMove = (event) => {
    if (appendPenStrokePoint(event)) {
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

  const updateShapeText = (shapeId, text) => {
    onShapesChange((previousShapes) => previousShapes.map((shape) => {
      if (shape.id !== shapeId) {
        return shape
      }

      return {
        ...shape,
        payload: {
          ...(shape.payload || {}),
          text,
        },
      }
    }))
  }

  const startTextEditing = (shapeId, text) => {
    if (!shapeId) {
      return
    }

    setEditingTextId(shapeId)
    setEditingTextValue(text === DEFAULT_TEXT_PLACEHOLDER ? '' : text)
  }

  const stopTextEditing = () => {
    setEditingTextId(null)
    setEditingTextValue('')
  }

  const handleWheel = (event) => {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()
    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP

    updateViewport({
      x: viewport.x,
      y: viewport.y,
      zoom: viewport.zoom + delta,
    })
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

  const canEditSelected = selectedShapeIds.length === 1
  const editingConnection = useMemo(() => (
    validShapeConnections.find((connection) => connection.id === editingConnectionId) || null
  ), [validShapeConnections, editingConnectionId])
  const ResolvedConnectionPanel = editingConnection
    ? resolvedConnectionPanelRegistry[editingConnection.relationKind]
    : null

  const handleEditSelected = () => {
    if (!canEditSelected || typeof onEditSelectedNode !== 'function') {
      return
    }

    onEditSelectedNode(selectedShapeIds[0])
  }

  const deleteSelectedShapes = useCallback(() => {
    if (selectedShapeIds.length === 0) {
      return
    }

    removeConnectionsByShapeIds(selectedShapeIds)
    const selectedIds = new Set(selectedShapeIds)
    onShapesChange((previousShapes) => previousShapes.filter((shape) => !selectedIds.has(shape.id)))
    clearSelection()
  }, [selectedShapeIds, onShapesChange, clearSelection, removeConnectionsByShapeIds])

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
  const horizontalRulerMarks = showRuler
    ? getRulerMarks({ trackLength: viewportSize.width, offsetPx: viewport.x, zoom: viewport.zoom })
    : []
  const verticalRulerMarks = showRuler
    ? getRulerMarks({ trackLength: viewportSize.height, offsetPx: viewport.y, zoom: viewport.zoom })
    : []
  const alignmentGuideLines = showAlignmentGuides ? getAlignmentGuideLines(selectedBoundsWorld, viewport) : []
  const { toolbarPosition, onToolbarOffsetDelta } = useToolbarPosition({
    showSelectionToolbar,
    selectedShapeIds,
    selectedBoundsWorld,
    viewport,
    viewportSize,
  })

  return (
    <section className="grid-workspace" aria-label="绘图工作区">
      <div
        ref={viewportRef}
        className={`grid-workspace__viewport ${isPanning ? 'is-panning' : ''} ${isDropTarget ? 'is-drop-target' : ''} ${isPenTool ? 'is-pen' : ''} ${isEraserMode ? 'is-eraser' : ''} ${isConnecting ? 'is-connecting' : ''}`}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerCancel}
        onPointerLeave={handlePenPointerLeave}
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
            onToolbarOffsetDelta={onToolbarOffsetDelta}
            onApplyPreset={(preset) => {
              const presetPatch = getShapeStylePresetPatch(preset)
              applyStylePatchToSelection(presetPatch || defaultShapeStyles)
            }}
            onEditSelected={handleEditSelected}
            canEditSelected={canEditSelected}
            onDeleteSelected={deleteSelectedShapes}
          />
        )}

        <div className="grid-workspace__grid" style={gridStyle} />

        {isEraserMode && eraserPreview.visible && (
          <div
            className={`grid-workspace__eraser-overlay grid-workspace__eraser-overlay--${penSettings?.eraserShape || 'circle'}`}
            style={{
              left: `${eraserPreview.x}px`,
              top: `${eraserPreview.y}px`,
              '--eraser-preview-size': `${Math.min(80, Math.max(8, penSettings?.eraserSize || 20))}px`,
            }}
            aria-hidden="true"
          />
        )}

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
                const strokeWidth = typeof stroke.strokeWidth === 'number' ? stroke.strokeWidth : PEN_STROKE_WIDTH
                const strokeColor = stroke.strokeColor || PEN_STROKE_COLOR
                return (
                  <circle
                    key={stroke.id}
                    cx={point.x}
                    cy={point.y}
                    r={strokeWidth / 2}
                    fill={strokeColor}
                  />
                )
              }

              const strokeWidth = typeof stroke.strokeWidth === 'number' ? stroke.strokeWidth : PEN_STROKE_WIDTH
              const strokeColor = stroke.strokeColor || PEN_STROKE_COLOR

              return (
                <path
                  key={stroke.id}
                  d={buildStrokePathData(stroke.points, viewport)}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
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
            <defs>
              <marker
                id={DIRECTIONAL_CONNECTION_MARKER_ID}
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={CONNECTOR_STROKE_COLOR} />
              </marker>
            </defs>
            {connectorSegments.map((segment) => (
              <g key={segment.id}>
                <line
                  className={`grid-workspace__connection-line ${segment.relationKind === 'depends_on' ? 'grid-workspace__connection-line--directional' : ''}`}
                  data-from-shape-id={segment.fromShapeId}
                  data-to-shape-id={segment.toShapeId}
                  data-relation-kind={segment.relationKind}
                  data-dependency-type={segment.dependencyType || ''}
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  stroke={CONNECTOR_STROKE_COLOR}
                  strokeWidth={CONNECTOR_STROKE_WIDTH}
                  markerEnd={segment.relationKind === 'depends_on' ? `url(#${DIRECTIONAL_CONNECTION_MARKER_ID})` : undefined}
                />
                {segment.relationKind === 'depends_on' && (
                  <g
                    className="grid-workspace__directional-connection-interaction"
                    onPointerEnter={() => setHoveredDirectionalConnectionId(segment.id)}
                    onPointerLeave={() => setHoveredDirectionalConnectionId((previous) => (
                      previous === segment.id ? null : previous
                    ))}
                  >
                    <line
                      className="grid-workspace__connection-hitline"
                      x1={segment.start.x}
                      y1={segment.start.y}
                      x2={segment.end.x}
                      y2={segment.end.y}
                      stroke="transparent"
                      strokeWidth={14}
                      onPointerDown={(event) => event.stopPropagation()}
                    />

                    {hoveredDirectionalConnectionId === segment.id && (
                      <g
                        className="grid-workspace__connection-entry"
                        transform={`translate(${(segment.start.x + segment.end.x) / 2} ${(segment.start.y + segment.end.y) / 2})`}
                        role="button"
                        aria-label="打开依赖链接详情"
                        tabIndex={0}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingConnectionId(segment.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') {
                            return
                          }

                          event.preventDefault()
                          event.stopPropagation()
                          setEditingConnectionId(segment.id)
                        }}
                      >
                        <circle r="9" />
                        <line x1="-3.5" y1="0" x2="3.5" y2="0" />
                        <line x1="0" y1="-3.5" x2="0" y2="3.5" />
                      </g>
                    )}
                  </g>
                )}
              </g>
            ))}
          </svg>
        )}

        <div className="grid-workspace__shapes" aria-label="画布图形">
          {shapes.map((shape) => {
            const shapeSize = getShapeSize(shape)
            const screenPosition = getShapeScreenPosition(shape, viewport)
            const isSelected = selectedShapeIdSet.has(shape.id)
            const visualStyle = getShapeVisualStyle(shape)
            const shapeKind = getKindByShapeType(shape.type)
            const isTextShape = shape.type === 'text'
            const shapeFileName = typeof shape?.payload?.FileName === 'string' ? shape.payload.FileName.trim() : ''
            const rawTextValue = typeof shape?.payload?.text === 'string' ? shape.payload.text : ''
            const textValue = rawTextValue.trim() ? rawTextValue : DEFAULT_TEXT_PLACEHOLDER
            const textFontSize = Number.isFinite(shape?.payload?.fontSize) ? shape.payload.fontSize : 14
            const showFileNameLabel = !isTextShape && shapeKind === 'file' && shapeFileName && shapeFileName !== DEFAULT_FILE_NAME
            const canResizeShape = isShapeResizable(shape.type)
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
                    backgroundColor: isTextShape && !isSelected ? 'transparent' : visualStyle.fillColor,
                    borderColor: isTextShape && !isSelected ? 'transparent' : visualStyle.strokeColor,
                    borderWidth: `${Math.max(1, visualStyle.strokeWidth)}px`,
                    opacity: clamp(visualStyle.opacity, 0.2, 1),
                  }}
                />

                {isTextShape && editingTextId !== shape.id && (
                  <div
                    className="canvas-shape__text"
                    style={{
                      fontSize: `${Math.max(10, textFontSize * viewport.zoom)}px`,
                      color: visualStyle.strokeColor,
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return
                      }

                      event.preventDefault()
                      event.stopPropagation()
                      selectShapeById(shape.id)
                      startTextEditing(shape.id, textValue)
                    }}
                  >
                    {textValue}
                  </div>
                )}

                {isTextShape && editingTextId === shape.id && (
                  <textarea
                    className="canvas-shape__text-editor"
                    value={editingTextValue}
                    autoFocus
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const nextText = event.target.value
                      setEditingTextValue(nextText)
                      updateShapeText(shape.id, nextText)
                    }}
                    onBlur={stopTextEditing}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        stopTextEditing()
                      }
                    }}
                  />
                )}

                {showFileNameLabel && <span className="canvas-shape__name">{shapeFileName}</span>}

                {isSelected && canResizeShape && (
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
        <span>ArrowLine: {isDirectionalConnectionToolActive ? 'On' : 'Off'}</span>
        <span>Connect Mode: {isConnecting ? 'On' : 'Off'}</span>
        <span>Selected: {selectedShapeIds.length}</span>
        <span>Offset X: {Math.round(viewport.x)}</span>
        <span>Offset Y: {Math.round(viewport.y)}</span>
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
      </div>

      {editingConnection && ResolvedConnectionPanel && (
        <ResolvedConnectionPanel
          key={editingConnection.id}
          connection={editingConnection}
          shapes={shapes}
          onClose={() => setEditingConnectionId(null)}
          onSave={({ id, dependencyType }) => {
            updateConnectionById(id, { dependencyType })
            setEditingConnectionId(null)
          }}
        />
      )}
    </section>
  )
}

export default DraggableGridCanvas
