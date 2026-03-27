export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const supportedShapeTypes = new Set(['rect', 'oval', 'diamond', 'parallelogram', 'text'])
export const PEN_STROKE_COLOR = '#1a73e8'
export const PEN_STROKE_WIDTH = 2.6
export const PEN_MOVE_THRESHOLD_PX = 2
export const CONNECTOR_STROKE_COLOR = '#2f5b8a'
export const CONNECTOR_STROKE_WIDTH = 2

export const defaultShapeSizes = {
  rect: { width: 120, height: 86 },
  oval: { width: 128, height: 88 },
  parallelogram: { width: 140, height: 86 },
  diamond: { width: 108, height: 108 },
  text: { width: 200, height: 64 },
}

export const defaultShapeStyles = {
  fillColor: '#6f9ee0',
  strokeColor: '#51618f',
  strokeWidth: 2,
  opacity: 1,
}

export const hasShapePayload = (dataTransfer) => {
  const types = Array.from(dataTransfer.types || [])
  return (
    types.includes('application/x-workbench-shape')
    || types.includes('application/json')
    || types.includes('text/plain')
  )
}

export const extractShapeType = (dataTransfer) => {
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

export const getWorldPoint = (event, viewportElement, viewport) => {
  const rect = viewportElement.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top

  return {
    x: (localX - viewport.x) / viewport.zoom,
    y: (localY - viewport.y) / viewport.zoom,
  }
}

export const getShapeScreenPosition = (shape, viewport) => ({
  left: shape.x * viewport.zoom + viewport.x,
  top: shape.y * viewport.zoom + viewport.y,
})

export const getShapeSize = (shape) => {
  if (typeof shape.width === 'number' && typeof shape.height === 'number' && shape.width > 0 && shape.height > 0) {
    return { width: shape.width, height: shape.height }
  }

  return defaultShapeSizes[shape.type] || defaultShapeSizes.rect
}

export const getShapeBoundsWorld = (shape) => {
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

export const findTopShapeAtPoint = (point, shapeList) => {
  for (let index = shapeList.length - 1; index >= 0; index -= 1) {
    const shape = shapeList[index]
    if (isPointInsideRect(point, getShapeBoundsWorld(shape))) {
      return shape
    }
  }

  return null
}

export const getConnectionPairKey = (fromShapeId, toShapeId) => {
  return `${fromShapeId}->${toShapeId}`
}

export const getConnectorAnchorWorld = (shape, targetPoint) => {
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

export const worldToScreenPoint = (worldPoint, viewport) => ({
  x: worldPoint.x * viewport.zoom + viewport.x,
  y: worldPoint.y * viewport.zoom + viewport.y,
})

export const buildStrokePathData = (points, viewport) => {
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

export const getRulerMarks = ({ trackLength, offsetPx, zoom }) => {
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

export const getAlignmentGuideLines = (boundsWorld, viewport) => {
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

export const getShapeVisualStyle = (shape) => ({
  fillColor: shape.fillColor || defaultShapeStyles.fillColor,
  strokeColor: shape.strokeColor || defaultShapeStyles.strokeColor,
  strokeWidth: typeof shape.strokeWidth === 'number' ? shape.strokeWidth : defaultShapeStyles.strokeWidth,
  opacity: typeof shape.opacity === 'number' ? shape.opacity : defaultShapeStyles.opacity,
})

export const getSelectedBoundsWorld = (shapeList, selectedIdSet) => {
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
