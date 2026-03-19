import { useCallback, useRef, useState } from 'react'
import { getResizedShapePatch } from './shapeResize'

const SHAPE_DRAG_THRESHOLD_PX = 3

const normalizeRect = (rect) => ({
  x1: Math.min(rect.x1, rect.x2),
  y1: Math.min(rect.y1, rect.y2),
  x2: Math.max(rect.x1, rect.x2),
  y2: Math.max(rect.y1, rect.y2),
})

const isRectIntersected = (a, b) => a.x1 <= b.x2 && a.x2 >= b.x1 && a.y1 <= b.y2 && a.y2 >= b.y1

const isPointInsideRect = (point, rect) => (
  point.x >= rect.x1 && point.x <= rect.x2 && point.y >= rect.y1 && point.y <= rect.y2
)

const mergeUniqueIds = (baseIds, incomingIds) => Array.from(new Set([...baseIds, ...incomingIds]))

const findTopShapeAtPoint = (point, shapeList, getShapeBoundsWorld) => {
  for (let index = shapeList.length - 1; index >= 0; index -= 1) {
    const shape = shapeList[index]
    if (isPointInsideRect(point, getShapeBoundsWorld(shape))) {
      return shape
    }
  }

  return null
}

export function useCanvasMouseActions({
  viewport,
  viewportRef,
  shapes,
  onViewportChange,
  onShapesChange,
  getWorldPoint,
  getShapeBoundsWorld,
  getShapeSize,
}) {
  const interactionRef = useRef({ mode: 'idle' })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedShapeIds, setSelectedShapeIds] = useState([])
  const [selectionRectWorld, setSelectionRectWorld] = useState(null)
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false)

  const clearSelection = useCallback(() => {
    setSelectedShapeIds([])
    setSelectionRectWorld(null)
    setShowSelectionToolbar(false)
  }, [])

  const startCapturedInteraction = (event, interactionState) => {
    if (!viewportRef.current) {
      return
    }

    viewportRef.current.setPointerCapture(event.pointerId)
    interactionRef.current = {
      pointerId: event.pointerId,
      ...interactionState,
    }
  }

  const clearInteraction = (pointerId) => {
    if (viewportRef.current && viewportRef.current.hasPointerCapture(pointerId)) {
      viewportRef.current.releasePointerCapture(pointerId)
    }

    interactionRef.current = { mode: 'idle' }
    setSelectionRectWorld(null)
    setIsPanning(false)
  }

  const handlePointerDown = (event) => {
    if (event.button === 2) {
      startCapturedInteraction(event, {
        mode: 'pan',
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: viewport.x,
        originY: viewport.y,
      })
      setIsPanning(true)
      return
    }

    if (event.button !== 0) {
      return
    }

    const appendSelection = event.shiftKey
    const selectedShapeIdSet = new Set(selectedShapeIds)
    const startWorld = getWorldPoint(event, event.currentTarget, viewport)

    const hitShape = findTopShapeAtPoint(startWorld, shapes, getShapeBoundsWorld)
    if (hitShape) {
      event.preventDefault()

      if (appendSelection) {
        setSelectedShapeIds((previousIds) => (
          previousIds.includes(hitShape.id) ? previousIds : [...previousIds, hitShape.id]
        ))
        setShowSelectionToolbar(true)
        return
      }

      const shouldDragAllSelected = selectedShapeIdSet.has(hitShape.id) && selectedShapeIds.length > 0
      const movingShapeIds = shouldDragAllSelected ? selectedShapeIds : [hitShape.id]
      const initialPositions = {}

      shapes.forEach((shape) => {
        if (movingShapeIds.includes(shape.id)) {
          initialPositions[shape.id] = { x: shape.x, y: shape.y }
        }
      })

      setSelectedShapeIds(movingShapeIds)
      setShowSelectionToolbar(false)
      startCapturedInteraction(event, {
        mode: 'move-shapes',
        startClientX: event.clientX,
        startClientY: event.clientY,
        zoomAtStart: viewport.zoom,
        initialPositions,
        hasMoved: false,
      })
      return
    }

    startCapturedInteraction(event, {
      mode: 'marquee',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorld,
      appendSelection,
      baseSelectedIds: appendSelection ? selectedShapeIds : [],
    })

    if (!appendSelection) {
      setSelectedShapeIds([])
      setShowSelectionToolbar(false)
    }

    setSelectionRectWorld({ x1: startWorld.x, y1: startWorld.y, x2: startWorld.x, y2: startWorld.y })
  }

  const handlePointerMove = (event) => {
    const interaction = interactionRef.current

    if (interaction.mode === 'idle') {
      return
    }

    if (interaction.mode === 'pan') {
      const deltaX = event.clientX - interaction.startClientX
      const deltaY = event.clientY - interaction.startClientY

      onViewportChange({
        x: interaction.originX + deltaX,
        y: interaction.originY + deltaY,
        zoom: viewport.zoom,
      })
      return
    }

    if (interaction.mode === 'marquee') {
      const currentWorld = getWorldPoint(event, event.currentTarget, viewport)
      const selection = normalizeRect({
        x1: interaction.startWorld.x,
        y1: interaction.startWorld.y,
        x2: currentWorld.x,
        y2: currentWorld.y,
      })

      setSelectionRectWorld({
        x1: interaction.startWorld.x,
        y1: interaction.startWorld.y,
        x2: currentWorld.x,
        y2: currentWorld.y,
      })

      const nextSelectedIds = shapes
        .filter((shape) => isRectIntersected(getShapeBoundsWorld(shape), selection))
        .map((shape) => shape.id)

      if (interaction.appendSelection) {
        setSelectedShapeIds(mergeUniqueIds(interaction.baseSelectedIds, nextSelectedIds))
      } else {
        setSelectedShapeIds(nextSelectedIds)
      }
      return
    }

    if (interaction.mode === 'move-shapes') {
      const movedX = Math.abs(event.clientX - interaction.startClientX)
      const movedY = Math.abs(event.clientY - interaction.startClientY)
      const didReachMoveThreshold = movedX >= SHAPE_DRAG_THRESHOLD_PX || movedY >= SHAPE_DRAG_THRESHOLD_PX

      if (!interaction.hasMoved && !didReachMoveThreshold) {
        return
      }

      if (!interaction.hasMoved && didReachMoveThreshold) {
        interactionRef.current = {
          ...interaction,
          hasMoved: true,
        }
      }

      const deltaWorldX = (event.clientX - interaction.startClientX) / interaction.zoomAtStart
      const deltaWorldY = (event.clientY - interaction.startClientY) / interaction.zoomAtStart

      onShapesChange((previousShapes) => previousShapes.map((shape) => {
        const basePosition = interaction.initialPositions[shape.id]
        if (!basePosition) {
          return shape
        }

        const nextX = basePosition.x + deltaWorldX
        const nextY = basePosition.y + deltaWorldY

        return {
          ...shape,
          x: nextX,
          y: nextY,
        }
      }))
      return
    }

    if (interaction.mode === 'resize-shape') {
      const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
      const shapePatch = getResizedShapePatch({ interaction, worldPoint })

      onShapesChange((previousShapes) => previousShapes.map((shape) => {
        if (shape.id !== interaction.shapeId) {
          return shape
        }

        return {
          ...shape,
          ...shapePatch,
        }
      }))
    }
  }

  const handlePointerUp = (event) => {
    if (interactionRef.current.mode === 'move-shapes') {
      const movedX = Math.abs(event.clientX - interactionRef.current.startClientX)
      const movedY = Math.abs(event.clientY - interactionRef.current.startClientY)
      const didMoveShape = interactionRef.current.hasMoved
        || movedX >= SHAPE_DRAG_THRESHOLD_PX
        || movedY >= SHAPE_DRAG_THRESHOLD_PX

      setShowSelectionToolbar(!didMoveShape)
    }

    if (interactionRef.current.mode === 'marquee') {
      const movedX = Math.abs(event.clientX - interactionRef.current.startClientX)
      const movedY = Math.abs(event.clientY - interactionRef.current.startClientY)
      if (movedX < 3 && movedY < 3 && !interactionRef.current.appendSelection) {
        setSelectedShapeIds([])
        setShowSelectionToolbar(false)
      }
    }

    clearInteraction(event.pointerId)
  }

  const handlePointerCancel = (event) => {
    clearInteraction(event.pointerId)
  }

  const handleResizePointerDown = (event, shape) => {
    if (event.button !== 0 || !viewportRef.current) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    const shapeSize = getShapeSize(shape)
    setSelectedShapeIds([shape.id])
    startCapturedInteraction(event, {
      mode: 'resize-shape',
      shapeId: shape.id,
      startWorld: getWorldPoint(event, viewportRef.current, viewport),
      baseShape: {
        x: shape.x,
        y: shape.y,
        width: shapeSize.width,
        height: shapeSize.height,
      },
    })
  }

  return {
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
  }
}
