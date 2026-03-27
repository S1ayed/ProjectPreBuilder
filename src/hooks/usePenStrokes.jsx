import { useRef, useState } from 'react'

const defaultPenSettings = {
  color: '#1a73e8',
  width: 3,
  mode: 'draw',
  eraserSize: 20,
  eraserShape: 'circle',
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const worldToScreenPoint = (worldPoint, viewport) => ({
  x: worldPoint.x * viewport.zoom + viewport.x,
  y: worldPoint.y * viewport.zoom + viewport.y,
})

const getLocalScreenPoint = (event, viewportElement) => {
  const rect = viewportElement.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const isPointInsideEraser = (screenPoint, targetPoint, eraserSize, eraserShape) => {
  const halfSize = eraserSize / 2
  const deltaX = Math.abs(screenPoint.x - targetPoint.x)
  const deltaY = Math.abs(screenPoint.y - targetPoint.y)

  if (eraserShape === 'square') {
    return deltaX <= halfSize && deltaY <= halfSize
  }

  if (eraserShape === 'diamond') {
    return deltaX + deltaY <= halfSize
  }

  return Math.hypot(deltaX, deltaY) <= halfSize
}

export function usePenStrokes({
  viewport,
  viewportRef,
  getWorldPoint,
  moveThresholdPx,
  penSettings,
}) {
  const drawInteractionRef = useRef({ mode: 'idle' })
  const strokeIdRef = useRef(0)
  const [penStrokes, setPenStrokes] = useState([])
  const [eraserPreview, setEraserPreview] = useState({ x: 0, y: 0, visible: false })

  const effectivePenSettings = {
    ...defaultPenSettings,
    ...(penSettings || {}),
  }
  const isEraserMode = effectivePenSettings.mode === 'erase'

  const splitStrokeByEraser = (stroke, pointerScreenPoint) => {
    const points = stroke.points || []
    if (points.length === 0) {
      return { didErase: false, segments: [] }
    }

    const currentEraserSize = clamp(effectivePenSettings.eraserSize, 8, 80)
    const currentEraserShape = effectivePenSettings.eraserShape
    const segments = []
    let currentSegment = []
    let didErase = false

    points.forEach((worldPoint) => {
      const screenPoint = worldToScreenPoint(worldPoint, viewport)
      const isHit = isPointInsideEraser(
        screenPoint,
        pointerScreenPoint,
        currentEraserSize,
        currentEraserShape,
      )

      if (isHit) {
        didErase = true
        if (currentSegment.length > 0) {
          segments.push(currentSegment)
          currentSegment = []
        }
        return
      }

      currentSegment.push(worldPoint)
    })

    if (currentSegment.length > 0) {
      segments.push(currentSegment)
    }

    return { didErase, segments }
  }

  const startPenStroke = (event) => {
    if (event.button !== 0 || !viewportRef.current) {
      return false
    }

    event.preventDefault()

    if (isEraserMode) {
      const localPoint = getLocalScreenPoint(event, event.currentTarget)
      setEraserPreview({
        x: localPoint.x,
        y: localPoint.y,
        visible: true,
      })

      viewportRef.current.setPointerCapture(event.pointerId)
      drawInteractionRef.current = {
        mode: 'erasing',
        pointerId: event.pointerId,
      }

      setPenStrokes((previous) => previous.flatMap((stroke) => {
        const { didErase, segments } = splitStrokeByEraser(stroke, localPoint)
        if (!didErase) {
          return [stroke]
        }

        return segments
          .filter((segment) => segment.length > 0)
          .map((segment) => ({
            ...stroke,
            id: `stroke-${strokeIdRef.current++}`,
            points: segment,
          }))
      }))

      return true
    }

    const startPoint = getWorldPoint(event, event.currentTarget, viewport)
    const strokeId = `stroke-${strokeIdRef.current}`
    strokeIdRef.current += 1

    setPenStrokes((previous) => [...previous, {
      id: strokeId,
      points: [startPoint],
      strokeColor: effectivePenSettings.color,
      strokeWidth: clamp(effectivePenSettings.width, 1, 24),
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
    if (interaction.mode === 'erasing' && interaction.pointerId === event.pointerId) {
      const localPoint = getLocalScreenPoint(event, event.currentTarget)
      setEraserPreview({
        x: localPoint.x,
        y: localPoint.y,
        visible: true,
      })

      setPenStrokes((previous) => previous.flatMap((stroke) => {
        const { didErase, segments } = splitStrokeByEraser(stroke, localPoint)
        if (!didErase) {
          return [stroke]
        }

        return segments
          .filter((segment) => segment.length > 0)
          .map((segment) => ({
            ...stroke,
            id: `stroke-${strokeIdRef.current++}`,
            points: segment,
          }))
      }))

      return true
    }

    if (interaction.mode !== 'drawing' || interaction.pointerId !== event.pointerId) {
      if (isEraserMode && interaction.mode === 'idle') {
        const localPoint = getLocalScreenPoint(event, event.currentTarget)
        setEraserPreview({
          x: localPoint.x,
          y: localPoint.y,
          visible: true,
        })
      }
      return false
    }

    const deltaX = event.clientX - interaction.lastClientX
    const deltaY = event.clientY - interaction.lastClientY
    if (Math.hypot(deltaX, deltaY) < moveThresholdPx) {
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
    const isDrawingInteraction = interaction.mode === 'drawing' && interaction.pointerId === event.pointerId
    const isEraserInteraction = interaction.mode === 'erasing' && interaction.pointerId === event.pointerId

    if (!isDrawingInteraction && !isEraserInteraction) {
      return false
    }

    if (viewportRef.current && viewportRef.current.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId)
    }

    if (isEraserMode) {
      setEraserPreview((previous) => ({ ...previous, visible: false }))
    }

    drawInteractionRef.current = { mode: 'idle' }
    return true
  }

  const handlePenPointerLeave = () => {
    if (!isEraserMode) {
      return
    }

    if (drawInteractionRef.current.mode === 'erasing') {
      return
    }

    setEraserPreview((previous) => ({ ...previous, visible: false }))
  }

  return {
    penStrokes,
    eraserPreview,
    isEraserMode,
    startPenStroke,
    appendPenStrokePoint,
    finishPenStroke,
    handlePenPointerLeave,
  }
}
