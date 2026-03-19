import { useRef, useState } from 'react'

export function usePenStrokes({
  viewport,
  viewportRef,
  getWorldPoint,
  moveThresholdPx,
}) {
  const drawInteractionRef = useRef({ mode: 'idle' })
  const strokeIdRef = useRef(0)
  const [penStrokes, setPenStrokes] = useState([])

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
    if (interaction.mode !== 'drawing' || interaction.pointerId !== event.pointerId) {
      return false
    }

    if (viewportRef.current && viewportRef.current.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId)
    }

    drawInteractionRef.current = { mode: 'idle' }
    return true
  }

  return {
    penStrokes,
    startPenStroke,
    appendPenStrokePoint,
    finishPenStroke,
  }
}
