import { useEffect, useRef, useState } from 'react'

function ShapeStyleToolbar({
  position,
  styleValues,
  selectedCount,
  onFillColorChange,
  onStrokeColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onConnectSelected,
  canConnectSelected,
  isConnectMode,
  onToolbarOffsetDelta,
  onApplyPreset,
  onEditSelected,
  canEditSelected,
  onDeleteSelected,
}) {
  const dragRef = useRef({ isDragging: false, lastClientX: 0, lastClientY: 0 })
  const [isHoveringBlankArea, setIsHoveringBlankArea] = useState(false)
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false)

  const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) {
      return false
    }

    return Boolean(target.closest('button, input, select, textarea, label'))
  }

  const handleToolbarPointerDownCapture = (event) => {
    event.stopPropagation()

    if (event.button !== 0 || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()

    dragRef.current = {
      isDragging: true,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    }
    setIsDraggingToolbar(true)
    setIsHoveringBlankArea(true)
  }

  const handleToolbarPointerMove = (event) => {
    if (isDraggingToolbar) {
      return
    }

    setIsHoveringBlankArea(!isInteractiveTarget(event.target))
  }

  const handleToolbarPointerLeave = () => {
    if (!dragRef.current.isDragging) {
      setIsHoveringBlankArea(false)
    }
  }

  // 拖动过程计算增量
  useEffect(() => {
    if (!isDraggingToolbar) {
      return undefined
    }

    const handleWindowPointerMove = (event) => {
      const dragState = dragRef.current
      if (!dragState.isDragging) {
        return
      }

      const deltaX = event.clientX - dragState.lastClientX
      const deltaY = event.clientY - dragState.lastClientY

      if ((deltaX !== 0 || deltaY !== 0) && typeof onToolbarOffsetDelta === 'function') {
        onToolbarOffsetDelta({ deltaX, deltaY })
      }

      dragRef.current = {
        ...dragState,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
      }
    }

    const stopDragging = () => {
      if (!dragRef.current.isDragging) {
        return
      }

      dragRef.current = { isDragging: false, lastClientX: 0, lastClientY: 0 }
      setIsDraggingToolbar(false)
      setIsHoveringBlankArea(false)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [isDraggingToolbar, onToolbarOffsetDelta])

  const handleToolbarPointerEnd = () => {
    if (!dragRef.current.isDragging) {
      return
    }

    dragRef.current = { isDragging: false, lastClientX: 0, lastClientY: 0 }
    setIsDraggingToolbar(false)
    setIsHoveringBlankArea(false)
  }

  if (!position) {
    return null
  }

  return (
    <div
      className={`shape-style-toolbar ${isHoveringBlankArea ? 'is-blank-hover' : ''} ${isDraggingToolbar ? 'is-dragging' : ''}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        maxWidth: `${position.maxWidth}px`,
      }}
      onPointerDownCapture={handleToolbarPointerDownCapture}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onPointerMove={handleToolbarPointerMove}
      onPointerLeave={handleToolbarPointerLeave}
      onPointerUp={handleToolbarPointerEnd}
      onPointerCancel={handleToolbarPointerEnd}
      onDragStart={(event) => event.preventDefault()}
    >
      <select
        className="shape-style-toolbar__select"
        defaultValue="custom"
        onChange={(event) => {
          if (event.target.value !== 'custom') {
            onApplyPreset(event.target.value)
            event.target.value = 'custom'
          }
        }}
        aria-label="样式预设"
      >
        <option value="custom">样式预设</option>
        <option value="default">默认</option>
        <option value="outline">线框</option>
        <option value="highlight">强调</option>
      </select>

      <div className="shape-style-toolbar__group" aria-label="填充颜色">
        <span className="shape-style-toolbar__label">填充</span>
        <input
          type="color"
          className="shape-style-toolbar__color"
          value={styleValues.fillColor}
          onChange={(event) => onFillColorChange(event.target.value)}
        />
      </div>

      <div className="shape-style-toolbar__group" aria-label="线条颜色">
        <span className="shape-style-toolbar__label">线条</span>
        <input
          type="color"
          className="shape-style-toolbar__color"
          value={styleValues.strokeColor}
          onChange={(event) => onStrokeColorChange(event.target.value)}
        />
      </div>

      <div className="shape-style-toolbar__group" aria-label="线条粗细">
        <span className="shape-style-toolbar__label">粗细</span>
        <select
          className="shape-style-toolbar__small-select"
          value={String(styleValues.strokeWidth)}
          onChange={(event) => onStrokeWidthChange(Number(event.target.value))}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="6">6</option>
          <option value="8">8</option>
        </select>
      </div>

      <div className="shape-style-toolbar__group shape-style-toolbar__group--stretch" aria-label="不透明度">
        <span className="shape-style-toolbar__label">透明度</span>
        <input
          type="range"
          className="shape-style-toolbar__range"
          min="20"
          max="100"
          step="5"
          value={Math.round(styleValues.opacity * 100)}
          onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
        />
      </div>

      <button
        type="button"
        className={`shape-style-toolbar__connect ${isConnectMode ? 'is-active' : ''}`}
        onClick={onConnectSelected}
        disabled={!canConnectSelected}
        aria-label="连接选中图形"
      >
        连接
      </button>

      <button
        type="button"
        className="shape-style-toolbar__edit"
        onClick={onEditSelected}
        disabled={!canEditSelected}
        aria-label="编辑当前节点"
      >
        编辑
      </button>

      <button
        type="button"
        className="shape-style-toolbar__delete"
        onClick={onDeleteSelected}
        disabled={selectedCount === 0}
        aria-label="删除选中图形"
      >
        删除
      </button>
    </div>
  )
}

export default ShapeStyleToolbar
