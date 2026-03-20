const clampValue = (value, min, max) => Math.min(max, Math.max(min, value))

export const ZOOM_MIN = 0.45
export const ZOOM_MAX = 2.2
export const ZOOM_STEP = 0.1

export const getNormalizedViewport = (nextViewport) => ({
  x: nextViewport.x,
  y: nextViewport.y,
  zoom: clampValue(nextViewport.zoom, ZOOM_MIN, ZOOM_MAX),
})

export const getZoomInViewport = (viewport, step = ZOOM_STEP) => getNormalizedViewport({
  ...viewport,
  zoom: viewport.zoom + step,
})

export const getZoomOutViewport = (viewport, step = ZOOM_STEP) => getNormalizedViewport({
  ...viewport,
  zoom: viewport.zoom - step,
})

export const getResetViewport = () => ({ x: 0, y: 0, zoom: 1 })
