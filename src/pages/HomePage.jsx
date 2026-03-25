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
import { toolItems } from '../constants/toolItems'
import {
  getNormalizedViewport,
  getResetViewport,
  getZoomInViewport,
  getZoomOutViewport,
} from '../movements/zooming'
import {
  buildSnapshotFromState,
  loadSnapshotFromLocalStorage,
  saveSnapshotToLocalStorage,
} from '../utils/localSnapshot'
import './HomePage.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const RESIZE_BREAKPOINT = 980
const DEFAULT_SIDEBAR_WIDTH = 430

const getSidebarBounds = (viewportWidth) => {
  const min = viewportWidth > 1200 ? 360 : 300
  const max = Math.min(620, Math.max(360, Math.round(viewportWidth * 0.56)))
  return { min, max }
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
    const payload = getDefaultNodePayload(kind)

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

  const handleExportModel = () => {
    const nodes = canvasShapes.map((shape) => {
      const kind = getKindByShapeType(shape.type)
      return {
        id: shape.id,
        kind,
        type: shape.type,
        payload: normalizeNodePayload(kind, shape.payload),
        geometry: {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
        },
        style: {
          fillColor: shape.fillColor,
          strokeColor: shape.strokeColor,
          strokeWidth: shape.strokeWidth,
          opacity: shape.opacity,
        },
      }
    })

    const relations = canvasConnections.map((connection) => {
      const relationKind = connection.relationKind === 'depends_on' ? 'depends_on' : 'contains'
      const dependencyType = relationKind === 'depends_on'
        ? (typeof connection.dependencyType === 'string' && connection.dependencyType.trim()
          ? connection.dependencyType.trim()
          : 'depends_on')
        : null

      return {
        id: connection.id,
        relationKind,
        from: connection.fromShapeId,
        to: connection.toShapeId,
        dependencyType,
      }
    })

    const structureRelations = relations.filter((relation) => relation.relationKind === 'contains')
    const dependencies = relations
      .filter((relation) => relation.relationKind === 'depends_on')
      .map((relation) => ({
        id: relation.id,
        from: relation.from,
        to: relation.to,
        type: relation.dependencyType || 'depends_on',
      }))

    const model = {
      nodes,
      structureRelations,
      dependencies,
      relations,
      meta: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        source: 'ProjectPreBuilder',
      },
    }

    const fileContent = `${JSON.stringify(model, null, 2)}\n`
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = 'prebuilder-model.json'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(objectUrl)
  }

  const handleImportModel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    input.onchange = async (event) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      try {
        const content = await file.text()
        const parsed = JSON.parse(content)

        const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : []
        const relationsSource = Array.isArray(parsed?.relations)
          ? parsed.relations
          : [
            ...(Array.isArray(parsed?.structureRelations) ? parsed.structureRelations : []),
            ...(Array.isArray(parsed?.dependencies) ? parsed.dependencies.map((item) => ({
              ...item,
              relationKind: 'depends_on',
              dependencyType: item?.type,
            })) : []),
          ]

        const importedShapes = nodes
          .filter((node) => node && typeof node === 'object' && typeof node.id === 'string' && node.id)
          .map((node) => {
            const kind = typeof node.kind === 'string' ? node.kind : getKindByShapeType(node.type)
            const geometry = node.geometry && typeof node.geometry === 'object' ? node.geometry : {}
            const style = node.style && typeof node.style === 'object' ? node.style : {}
            const shapeType = getShapeTypeByKind(kind)
            const defaultSize = getShapeDefaultSize(shapeType)
            const defaultStyle = getShapeDefaultStyle(shapeType)

            return {
              id: node.id,
              type: shapeType,
              kind,
              payload: normalizeNodePayload(kind, node.payload),
              x: Number.isFinite(geometry.x) ? geometry.x : 0,
              y: Number.isFinite(geometry.y) ? geometry.y : 0,
              width: Number.isFinite(geometry.width) ? geometry.width : defaultSize.width,
              height: Number.isFinite(geometry.height) ? geometry.height : defaultSize.height,
              fillColor: typeof style.fillColor === 'string' && style.fillColor ? style.fillColor : defaultStyle.fillColor,
              strokeColor: typeof style.strokeColor === 'string' && style.strokeColor ? style.strokeColor : defaultStyle.strokeColor,
              strokeWidth: Number.isFinite(style.strokeWidth) ? style.strokeWidth : defaultStyle.strokeWidth,
              opacity: Number.isFinite(style.opacity) ? style.opacity : defaultStyle.opacity,
            }
          })

        const validShapeIdSet = new Set(importedShapes.map((shape) => shape.id))
        const importedConnections = relationsSource
          .filter((relation) => relation && typeof relation === 'object')
          .map((relation, index) => {
            const relationKind = relation.relationKind === 'depends_on' ? 'depends_on' : 'contains'
            const fromShapeId = typeof relation.fromShapeId === 'string' ? relation.fromShapeId : relation.from
            const toShapeId = typeof relation.toShapeId === 'string' ? relation.toShapeId : relation.to

            return {
              id: typeof relation.id === 'string' && relation.id ? relation.id : `connection-${index}`,
              fromShapeId,
              toShapeId,
              relationKind,
              dependencyType: relationKind === 'depends_on'
                ? (typeof relation.dependencyType === 'string' && relation.dependencyType.trim()
                  ? relation.dependencyType.trim()
                  : 'depends_on')
                : null,
            }
          })
          .filter((relation) => (
            typeof relation.fromShapeId === 'string'
            && relation.fromShapeId
            && typeof relation.toShapeId === 'string'
            && relation.toShapeId
            && relation.fromShapeId !== relation.toShapeId
            && validShapeIdSet.has(relation.fromShapeId)
            && validShapeIdSet.has(relation.toShapeId)
          ))

        if (importedShapes.length === 0) {
          alert('导入失败：JSON 中未找到可用节点数据')
          return
        }

        setCanvasShapes(importedShapes)
        setCanvasConnections(importedConnections)
        setEditingNodeId(null)
        setConnectionToolMode(null)
        setActiveTool('select')
        shapeIdRef.current = getNextShapeIdCounter(importedShapes)
        alert(`导入成功：${importedShapes.length} 个节点，${importedConnections.length} 条连线`)
      } catch {
        alert('导入失败：JSON 格式无效或数据不兼容')
      }
    }

    input.click()
  }

  const handleSaveWorkspaceSnapshot = () => {
    const snapshot = buildSnapshotFromState({
      viewport,
      assist: workspaceAssist,
      shapes: canvasShapes,
      connections: canvasConnections,
    })

    try {
      saveSnapshotToLocalStorage(snapshot)
      alert('本地暂存已保存')
    } catch (error) {
      if (error.message === 'SNAPSHOT_QUOTA_EXCEEDED') {
        alert('本地存储空间不足，建议导出 JSON 备份')
        return
      }

      alert('保存失败，请稍后重试或导出 JSON 备份')
    }
  }

  const handleLoadWorkspaceSnapshot = () => {
    const shouldContinue = window.confirm('读取会覆盖当前画布内容，是否继续？')
    if (!shouldContinue) {
      return
    }

    try {
      const snapshot = loadSnapshotFromLocalStorage()
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
    } catch (error) {
      if (error.message === 'SNAPSHOT_NOT_FOUND') {
        alert('未找到本地暂存数据')
        return
      }

      if (error.message === 'SNAPSHOT_PARSE_FAILED') {
        alert('本地暂存数据已损坏，无法读取')
        return
      }

      if (error.message === 'SNAPSHOT_INVALID') {
        alert('本地暂存数据不完整或版本不兼容')
        return
      }

      alert('读取失败，请稍后重试')
    }
  }

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
          activeConnectionTool={connectionToolMode}
          onSelectConnectionTool={handleSelectConnectionTool}
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
            showRuler={workspaceAssist.showRuler}
            showAlignmentGuides={workspaceAssist.showAlignmentGuides}
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
