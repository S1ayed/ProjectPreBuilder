import { useEffect, useRef, useState } from 'react'
import WorkbenchSidebar from '../components/WorkbenchSidebar'
import CanvasTopBar from '../components/CanvasTopBar'
import DraggableGridCanvas from '../components/DraggableGridCanvas'
import './HomePage.css'

const toolItems = [
  { id: 'select', name: '选择', shortcut: 'V' },
  { id: 'pen', name: '画笔', shortcut: 'P' },
  { id: 'text', name: '文字', shortcut: 'T' },
]

const layerItems = [
  { id: 'layer-1', name: 'Background Grid', type: 'Guide' },
  { id: 'layer-2', name: 'Wireframe Group', type: 'Group' },
  { id: 'layer-3', name: 'Notes', type: 'Text' },
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const RESIZE_BREAKPOINT = 980
const DEFAULT_SIDEBAR_WIDTH = 430

const getSidebarBounds = (viewportWidth) => {
  const min = viewportWidth > 1200 ? 360 : 300
  const max = Math.min(620, Math.max(360, Math.round(viewportWidth * 0.56)))
  return { min, max }
}

const getDefaultShapeSize = (shapeType) => {
  if (shapeType === 'oval') {
    return { width: 128, height: 88 }
  }

  if (shapeType === 'diamond') {
    return { width: 108, height: 108 }
  }

  return { width: 120, height: 86 }
}

const getDefaultShapeStyle = (shapeType) => {
  if (shapeType === 'diamond') {
    return {
      fillColor: '#ffe59a',
      strokeColor: '#8a6b1f',
      strokeWidth: 2,
      opacity: 1,
    }
  }

  if (shapeType === 'oval') {
    return {
      fillColor: '#cde8ff',
      strokeColor: '#2f5b8a',
      strokeWidth: 2,
      opacity: 1,
    }
  }

  return {
    fillColor: '#dbe6ff',
    strokeColor: '#51618f',
    strokeWidth: 2,
    opacity: 1,
  }
}

function HomePage() {
  const [activeTool, setActiveTool] = useState('select')
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const [canvasShapes, setCanvasShapes] = useState([])
  const [workspaceAssist, setWorkspaceAssist] = useState({
    showRuler: false,
    showAlignmentGuides: false,
  })
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [sidebarBounds, setSidebarBounds] = useState({ min: 300, max: 620 })
  const [isCompactLayout, setIsCompactLayout] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH })
  const resizeAnimationFrameRef = useRef(0)
  const pendingSidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH)
  const shapeIdRef = useRef(0)

  useEffect(() => () => {
    if (resizeAnimationFrameRef.current) {
      cancelAnimationFrame(resizeAnimationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const syncLayout = () => {
      const viewportWidth = window.innerWidth
      const compact = viewportWidth <= RESIZE_BREAKPOINT
      const bounds = getSidebarBounds(viewportWidth)

      setIsCompactLayout(compact)
      setSidebarBounds(bounds)
      setSidebarWidth((previousWidth) => clamp(previousWidth, bounds.min, bounds.max))
    }

    syncLayout()
    window.addEventListener('resize', syncLayout)

    return () => {
      window.removeEventListener('resize', syncLayout)
    }
  }, [])

  const updateViewport = (nextViewport) => {
    setViewport({
      x: nextViewport.x,
      y: nextViewport.y,
      zoom: clamp(nextViewport.zoom, 0.45, 2.2),
    })
  }

  const zoomStep = 0.12

  const handleZoomIn = () => {
    updateViewport({ ...viewport, zoom: viewport.zoom + zoomStep })
  }

  const handleZoomOut = () => {
    updateViewport({ ...viewport, zoom: viewport.zoom - zoomStep })
  }

  const handleResetView = () => {
    updateViewport({ x: 0, y: 0, zoom: 1 })
  }

  const handleAddShape = (shapeType, position) => {
    if (!shapeType || !position) {
      return
    }

    const shapeSize = getDefaultShapeSize(shapeType)
    const shapeStyle = getDefaultShapeStyle(shapeType)

    const nextShape = {
      id: `shape-${shapeIdRef.current}`,
      type: shapeType,
      x: position.x,
      y: position.y,
      width: shapeSize.width,
      height: shapeSize.height,
      fillColor: shapeStyle.fillColor,
      strokeColor: shapeStyle.strokeColor,
      strokeWidth: shapeStyle.strokeWidth,
      opacity: shapeStyle.opacity,
    }

    shapeIdRef.current += 1
    setCanvasShapes((previous) => [...previous, nextShape])
  }

  const handleToggleWorkspaceAssist = (assistKey) => {
    if (!assistKey) {
      return
    }

    setWorkspaceAssist((previous) => ({
      ...previous,
      [assistKey]: !previous[assistKey],
    }))
  }

  const handleResizeStart = (event) => {
    if (isCompactLayout || event.button !== 0) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    resizeRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidth,
    }
    pendingSidebarWidthRef.current = sidebarWidth
    setIsResizing(true)
  }

  const handleResizeMove = (event) => {
    if (!isResizing || isCompactLayout) {
      return
    }

    const delta = event.clientX - resizeRef.current.startX
    const nextWidth = resizeRef.current.startWidth + delta
    pendingSidebarWidthRef.current = clamp(nextWidth, sidebarBounds.min, sidebarBounds.max)

    if (resizeAnimationFrameRef.current) {
      return
    }

    resizeAnimationFrameRef.current = requestAnimationFrame(() => {
      setSidebarWidth(pendingSidebarWidthRef.current)
      resizeAnimationFrameRef.current = 0
    })
  }

  const handleResizeEnd = (event) => {
    if (resizeAnimationFrameRef.current) {
      cancelAnimationFrame(resizeAnimationFrameRef.current)
      resizeAnimationFrameRef.current = 0
    }

    setSidebarWidth(pendingSidebarWidthRef.current)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsResizing(false)
  }

  const handleResizerKeyDown = (event) => {
    if (isCompactLayout) {
      return
    }

    const step = event.shiftKey ? 28 : 14
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setSidebarWidth((value) => clamp(value - step, sidebarBounds.min, sidebarBounds.max))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setSidebarWidth((value) => clamp(value + step, sidebarBounds.min, sidebarBounds.max))
    }
  }

  const shellClassName = `home-page__shell ${isCompactLayout ? 'home-page__shell--compact' : ''}`
  const shellStyle = isCompactLayout ? undefined : { '--sidebar-width': `${sidebarWidth}px` }
  const homeClassName = `home-page ${isResizing ? 'is-resizing' : ''}`

  return (
    <div className={homeClassName}>
      <div className="home-page__gradient" aria-hidden="true" />
      <div className={shellClassName} style={shellStyle}>
        <WorkbenchSidebar
          tools={toolItems}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          layers={layerItems}
          workspaceAssist={workspaceAssist}
          onToggleWorkspaceAssist={handleToggleWorkspaceAssist}
        />

        {!isCompactLayout && (
          <div
            className={`home-page__resizer ${isResizing ? 'is-active' : ''}`}
            role="separator"
            aria-label="调整侧边栏宽度"
            aria-orientation="vertical"
            aria-valuemin={sidebarBounds.min}
            aria-valuemax={sidebarBounds.max}
            aria-valuenow={Math.round(sidebarWidth)}
            tabIndex={0}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onKeyDown={handleResizerKeyDown}
          />
        )}

        <main className="home-page__main">
          <CanvasTopBar
            zoom={viewport.zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
          />
          <DraggableGridCanvas
            viewport={viewport}
            onViewportChange={updateViewport}
            shapes={canvasShapes}
            onAddShape={handleAddShape}
            onShapesChange={setCanvasShapes}
            activeTool={activeTool}
            showRuler={workspaceAssist.showRuler}
            showAlignmentGuides={workspaceAssist.showAlignmentGuides}
          />
        </main>
      </div>
    </div>
  )
}

export default HomePage
