import { useState } from 'react'
import { registerCustomShapeType } from '../../constants/shapeConfigs'

const shapeItems = [
  { id: 'rect', previewClass: 'shape-preview shape-preview--rect', label: '矩形' },
  { id: 'oval', previewClass: 'shape-preview shape-preview--oval', label: '椭圆' },
  { id: 'parallelogram', previewClass: 'shape-preview shape-preview--parallelogram', label: '平行四边形' },
  { id: 'diamond', previewClass: 'shape-preview shape-preview--diamond', label: '菱形' },
  {
    id: 'line',
    previewClass: 'shape-preview shape-preview--line',
    label: '无向连接',
    connectionMode: 'contains',
  },
  {
    id: 'arrow-line',
    previewClass: 'shape-preview shape-preview--arrow-line',
    label: '依赖连接',
    connectionMode: 'depends_on',
  },
]

const nodeShapeItems = shapeItems.filter((shape) => typeof shape.connectionMode !== 'string')
const connectionItems = shapeItems.filter((shape) => typeof shape.connectionMode === 'string')

function LibrarySection({ activeConnectionTool, onSelectConnectionTool }) {
  const [customShapeLabel, setCustomShapeLabel] = useState('')
  const [customShapeColor, setCustomShapeColor] = useState('#8b5cf6')
  const [customShapeItems, setCustomShapeItems] = useState([])

  const handleShapeDragStart = (event, shapeType) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-workbench-shape', shapeType)
    event.dataTransfer.setData('application/json', JSON.stringify({ shapeType }))
    event.dataTransfer.setData('text/plain', shapeType)
  }

  const handleCreateCustomShape = () => {
    const trimmedLabel = customShapeLabel.trim()
    if (!trimmedLabel) {
      return
    }

    const registeredId = registerCustomShapeType(trimmedLabel, {
      defaultStyle: {
        fillColor: customShapeColor,
        strokeColor: '#1f2937',
      },
    })

    if (!registeredId) {
      return
    }

    setCustomShapeItems((previous) => [
      ...previous,
      {
        id: registeredId,
        label: trimmedLabel,
        previewClass: 'shape-preview shape-preview--custom',
        previewStyle: {
          '--custom-fill-color': customShapeColor,
          '--custom-stroke-color': '#1f2937',
        },
      },
    ])
    setCustomShapeLabel('')
  }

  const renderShapeCard = (shape) => {
    const isConnectionTool = typeof shape.connectionMode === 'string'
    const isToolActive = isConnectionTool && activeConnectionTool === shape.connectionMode

    return (
      <button
        key={shape.id}
        type="button"
        className={`workbench-sidebar__shape-card ${isConnectionTool ? 'is-connection-tool' : ''} ${isToolActive ? 'is-active-tool' : ''}`}
        draggable={!isConnectionTool}
        onDragStart={!isConnectionTool ? (event) => handleShapeDragStart(event, shape.id) : undefined}
        style={shape.previewStyle}
        onClick={isConnectionTool ? () => onSelectConnectionTool?.(shape.connectionMode) : undefined}
        aria-pressed={isConnectionTool ? isToolActive : undefined}
        title={isConnectionTool ? `${isToolActive ? '退出' : '启用'}${shape.label}模式` : `添加${shape.label}`}
      >
        <span className={shape.previewClass} aria-hidden="true" />
      </button>
    )
  }

  return (
    <>
      <div className="workbench-sidebar__group-head">
        <p>开始构建</p>
      </div>

      <div className="workbench-sidebar__library-group">
        <h4 className="workbench-sidebar__library-group-title">图形节点</h4>
        <div className="workbench-sidebar__favorites">
          {nodeShapeItems.map(renderShapeCard)}
        </div>
      </div>

      <div className="workbench-sidebar__library-group">
        <h4 className="workbench-sidebar__library-group-title">自定义节点</h4>
        <div className="workbench-sidebar__custom-node-panel">
          <input
            className="workbench-sidebar__custom-node-input"
            type="text"
            value={customShapeLabel}
            onChange={(event) => setCustomShapeLabel(event.target.value)}
            placeholder="输入节点名称"
          />
          <div className="workbench-sidebar__custom-color-row">
            {['#8b5cf6', '#0ea5e9', '#f59e0b', '#ec4899', '#10b981'].map((color) => (
              <button
                key={color}
                type="button"
                className={`workbench-sidebar__custom-color-swatch ${customShapeColor === color ? 'is-active' : ''}`}
                style={{ '--custom-color': color }}
                aria-label={`选择节点颜色 ${color}`}
                onClick={() => setCustomShapeColor(color)}
              />
            ))}
          </div>
          <button
            type="button"
            className="workbench-sidebar__custom-node-btn"
            onClick={handleCreateCustomShape}
          >
            新建节点类型
          </button>
        </div>
        <div className="workbench-sidebar__favorites">
          {customShapeItems.map(renderShapeCard)}
        </div>
      </div>

      <div className="workbench-sidebar__library-group">
        <h4 className="workbench-sidebar__library-group-title">连接</h4>
        <div className="workbench-sidebar__favorites workbench-sidebar__favorites--relations">
          {connectionItems.map(renderShapeCard)}
        </div>
      </div>
    </>
  )
}

export default LibrarySection
