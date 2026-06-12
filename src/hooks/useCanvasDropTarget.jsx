import { useState } from 'react'
import {
  extractShapeType,
  getWorldPoint,
  hasShapePayload,
} from '../components/canvas/canvasUtils'
import { getRegisteredShapeTypes } from '../constants/shapeConfigs'

export function useCanvasDropTarget({ viewport, onAddShape }) {
  const [isDropTarget, setIsDropTarget] = useState(false)

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

    if (!getRegisteredShapeTypes().has(shapeType)) {
      setIsDropTarget(false)
      return
    }

    event.preventDefault()
    setIsDropTarget(false)
    const worldPoint = getWorldPoint(event, event.currentTarget, viewport)
    onAddShape(shapeType, worldPoint)
  }

  return {
    isDropTarget,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
