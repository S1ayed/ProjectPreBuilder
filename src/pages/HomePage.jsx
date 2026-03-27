import { useEffect, useRef, useState } from 'react'
import WorkbenchSidebar from '../components/WorkbenchSidebar'
import CanvasTopBar from '../components/CanvasTopBar'
import DraggableGridCanvas from '../components/DraggableGridCanvas'
import PropertyPanel from '../components/PropertyPanel'
import { layerItems } from '../constants/layerItems'
import {
  getDefaultNodePayload,
  getKindByShapeType,
  getShapeTypeByKind,
  normalizeNodePayload,
} from '../constants/nodeKinds'
import { getShapeDefaultSize, getShapeDefaultStyle } from '../constants/shapeConfigs'
import { useExportModel } from '../hooks/useExportModel'
import { useImportModel } from '../hooks/useImportModel'
import { toolItems } from '../constants/toolItems'
import {
  getNormalizedViewport,
  getResetViewport,
  getZoomInViewport,
  getZoomOutViewport,
} from '../movements/zooming'
import { useLoadWorkspaceSnapshot } from '../hooks/useLoadWorkspaceSnapshot'
import { useSaveWorkspaceSnapshot } from '../hooks/useSaveWorkspaceSnapshot'
import './HomePage.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const RESIZE_BREAKPOINT = 980
const DEFAULT_SIDEBAR_WIDTH = 430

const getSidebarBounds = (viewportWidth) => {
  const min = viewportWidth > 1200 ? 360 : 300
  const max = Math.min(620, Math.max(360, Math.round(viewportWidth * 0.56)))
  return { min, max }
}

const defaultPenSettings = {
  color: '#1a73e8',
  width: 3,
  mode: 'draw',
  eraserSize: 20,
  eraserShape: 'circle',
}

const getNextShapeIdCounter = (shapes) => {
  if (!Array.isArray(shapes) || shapes.length === 0) {
    return 0
  }

  return shapes.reduce((maxValue, shape) => {
    if (!shape || typeof shape.id !== 'string') {
      return maxValue
    }

    const match = /^shape-(\d+)$/.exec(shape.id)
    if (!match) {
      return maxValue
    }

    const value = Number(match[1])
    if (!Number.isFinite(value)) {
      return maxValue
    }

    return Math.max(maxValue, value + 1)
  }, 0)
}

function HomePage() {
  const [activeTool, setActiveTool] = useState('select')
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })
  const [canvasShapes, setCanvasShapes] = useState([])
  const [canvasConnections, setCanvasConnections] = useState([])
  const [connectionToolMode, setConnectionToolMode] = useState(null)
  const [editingNodeId, setEditingNodeId] = useState(null)
  const [selectedShapeIds, setSelectedShapeIds] = useState([])
  const [workspaceAssist, setWorkspaceAssist] = useState({
    showRuler: false,
    showAlignmentGuides: false,
  })
  const [penSettings, setPenSettings] = useState(defaultPenSettings)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [sidebarBounds, setSidebarBounds] = useState({ min: 300, max: 620 })
  const [isCompactLayout, setIsCompactLayout] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef({ startX: 0, startWidth: DEFAULT_SIDEBAR_WIDTH })
  const resizeAnimationFrameRef = useRef(0)
  const pendingSidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH)
  const shapeIdRef = useRef(0)
  const handleSaveWorkspaceSnapshot = useSaveWorkspaceSnapshot({
    viewport,
    assist: workspaceAssist,
    shapes: canvasShapes,
    connections: canvasConnections,
  })
  const loadWorkspaceSnapshot = useLoadWorkspaceSnapshot()
  const handleExportModel = useExportModel({
    shapes: canvasShapes,
    connections: canvasConnections,
  })
  const handleImportModel = useImportModel({
    onImported: ({ shapes, connections }) => {
      setCanvasShapes(shapes)
      setCanvasConnections(connections)
      setEditingNodeId(null)
      setConnectionToolMode(null)
      setActiveTool('select')
      shapeIdRef.current = getNextShapeIdCounter(shapes)
    },
  })

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
    setViewport(getNormalizedViewport(nextViewport))
  }

  const handleZoomIn = () => {
    setViewport((previous) => getZoomInViewport(previous))
  }

  const handleZoomOut = () => {
    setViewport((previous) => getZoomOutViewport(previous))
  }

  const handleResetView = () => {
    setViewport(getResetViewport())
  }

  const handleAddShape = (shapeType, position) => {
    if (!shapeType || !position) {
      return
    }

    const shapeSize = getShapeDefaultSize(shapeType)
    const shapeStyle = getShapeDefaultStyle(shapeType)
    const kind = getKindByShapeType(shapeType)
    const payload = shapeType === 'text'
      ? { text: '点击编辑文字', fontSize: 14 }
      : getDefaultNodePayload(kind)

    const nextShape = {
      id: `shape-${shapeIdRef.current}`,
      type: shapeType,
      kind,
      payload,
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
    return nextShape.id
  }

  const selectedTextShape = canvasShapes.find((shape) => shape.id === selectedShapeIds[0] && shape.type === 'text') || null

  const handleSelectedTextChange = (nextText) => {
    if (!selectedTextShape) {
      return
    }

    setCanvasShapes((previousShapes) => previousShapes.map((shape) => {
      if (shape.id !== selectedTextShape.id) {
        return shape
      }

      return {
        ...shape,
        payload: {
          ...(shape.payload || {}),
          text: nextText,
        },
      }
    }))
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

  const handlePenSettingsChange = (penPatch) => {
    if (!penPatch || typeof penPatch !== 'object') {
      return
    }

    setPenSettings((previous) => ({
      ...previous,
      ...penPatch,
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
  const editingNode = canvasShapes.find((shape) => shape.id === editingNodeId) || null

  const handleEditSelectedNode = (shapeId) => {
    if (!shapeId) {
      return
    }

    setEditingNodeId(shapeId)
  }

  const handleSaveNodeProperties = ({ id, kind, payload }) => {
    setCanvasShapes((previousShapes) => previousShapes.map((shape) => {
      if (shape.id !== id) {
        return shape
      }

      return {
        ...shape,
        type: getShapeTypeByKind(kind),
        kind,
        payload: normalizeNodePayload(kind, payload),
      }
    }))
    setEditingNodeId(null)
  }

  const handleSelectConnectionTool = (nextMode) => {
    if (!nextMode) {
      return
    }

    setConnectionToolMode((previousMode) => (previousMode === nextMode ? null : nextMode))
    setActiveTool('select')
  }

  const handleConnectionToolModeComplete = () => {
    setConnectionToolMode(null)
  }

  const handleLoadWorkspaceSnapshot = () => {
    const snapshot = loadWorkspaceSnapshot()
    if (!snapshot) {
      return
    }

    const nextViewport = getNormalizedViewport(snapshot.workspace.viewport)
    const nextAssist = {
      showRuler: Boolean(snapshot.workspace.assist?.showRuler),
      showAlignmentGuides: Boolean(snapshot.workspace.assist?.showAlignmentGuides),
    }
    const nextShapes = snapshot.canvas.shapes
    const nextConnections = snapshot.canvas.connections

    setViewport(nextViewport)
    setWorkspaceAssist(nextAssist)
    setCanvasShapes(nextShapes)
    setCanvasConnections(nextConnections)
    setEditingNodeId(null)
    setConnectionToolMode(null)
    setActiveTool('select')
    shapeIdRef.current = getNextShapeIdCounter(nextShapes)

    const savedAtText = typeof snapshot.savedAt === 'string' ? `（保存时间：${snapshot.savedAt}）` : ''
    alert(`本地暂存读取成功${savedAtText}`)
  }

  return (
    <div className={homeClassName}>
      <div className="home-page__gradient" aria-hidden="true" />
      <div className={shellClassName} style={shellStyle}>
        <WorkbenchSidebar
          tools={toolItems}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          penSettings={penSettings}
          onPenSettingsChange={handlePenSettingsChange}
          layers={layerItems}
          workspaceAssist={workspaceAssist}
          onToggleWorkspaceAssist={handleToggleWorkspaceAssist}
          activeConnectionTool={connectionToolMode}
          onSelectConnectionTool={handleSelectConnectionTool}
          selectedTextShape={selectedTextShape}
          onSelectedTextChange={handleSelectedTextChange}
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
            onExport={handleExportModel}
            onSave={handleSaveWorkspaceSnapshot}
            onLoad={handleLoadWorkspaceSnapshot}
            onExportJson={handleExportModel}
            onImportJson={handleImportModel}
          />
          <DraggableGridCanvas
            viewport={viewport}
            onViewportChange={updateViewport}
            shapes={canvasShapes}
            connections={canvasConnections}
            onAddShape={handleAddShape}
            onShapesChange={setCanvasShapes}
            onConnectionsChange={setCanvasConnections}
            onEditSelectedNode={handleEditSelectedNode}
            connectionToolMode={connectionToolMode}
            onConnectionToolModeComplete={handleConnectionToolModeComplete}
            activeTool={activeTool}
            penSettings={penSettings}
            showRuler={workspaceAssist.showRuler}
            showAlignmentGuides={workspaceAssist.showAlignmentGuides}
            onSelectionChange={setSelectedShapeIds}
          />
        </main>
      </div>

      {editingNode && (
        <PropertyPanel
          key={editingNode.id}
          node={editingNode}
          onClose={() => setEditingNodeId(null)}
          onSave={handleSaveNodeProperties}
        />
      )}
    </div>
  )
}

export default HomePage
