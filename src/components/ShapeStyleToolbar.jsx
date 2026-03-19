import { useRef, useState } from 'react'

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
  onDeleteSelected,
}) {
  const dragRef = useRef({ isDragging: false, pointerId: null, lastClientX: 0, lastClientY: 0 })
  const [isHoveringBlankArea, setIsHoveringBlankArea] = useState(false)
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false)

  const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) {
      return false
    }

    return Boolean(target.closest('button, input, select, textarea, label'))
  }

  if (!position) {
    return null
  }

  const handleToolbarPointerDown = (event) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)

    dragRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
    }
    setIsDraggingToolbar(true)
    setIsHoveringBlankArea(true)
  }

  const handleToolbarPointerMove = (event) => {
    const dragState = dragRef.current
    if (dragState.isDragging && dragState.pointerId === event.pointerId) {
      event.preventDefault()
      event.stopPropagation()
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
      return
    }

    setIsHoveringBlankArea(!isInteractiveTarget(event.target))
  }

  const handleToolbarPointerLeave = () => {
    if (!dragRef.current.isDragging) {
      setIsHoveringBlankArea(false)
    }
  }

  const handleToolbarPointerEnd = (event) => {
    const dragState = dragRef.current
    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = { isDragging: false, pointerId: null, lastClientX: 0, lastClientY: 0 }
    setIsDraggingToolbar(false)
    setIsHoveringBlankArea(false)
  }

  return (
    <div
      className={`shape-style-toolbar ${isHoveringBlankArea ? 'is-blank-hover' : ''} ${isDraggingToolbar ? 'is-dragging' : ''}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        maxWidth: `${position.maxWidth}px`,
      }}
      onPointerDownCapture={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onPointerDown={handleToolbarPointerDown}
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
