const shapeItems = [
  { id: 'rect', previewClass: 'shape-preview shape-preview--rect', label: '正方形' },
  { id: 'oval', previewClass: 'shape-preview shape-preview--oval', label: '椭圆' },
  { id: 'diamond', previewClass: 'shape-preview shape-preview--diamond', label: '菱形' },
]

function LibrarySection() {
  const handleShapeDragStart = (event, shapeType) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-workbench-shape', shapeType)
    event.dataTransfer.setData('application/json', JSON.stringify({ shapeType }))
    event.dataTransfer.setData('text/plain', shapeType)
  }

  return (
    <>
      <div className="workbench-sidebar__group-head">
        <p>开始构建</p>
      </div>

      <div className="workbench-sidebar__favorites">
        {shapeItems.map((shape) => (
          <button
            key={shape.id}
            type="button"
            className="workbench-sidebar__shape-card"
            draggable
            onDragStart={(event) => handleShapeDragStart(event, shape.id)}
            title={`添加${shape.label}`}
          >
            <span className={shape.previewClass} aria-hidden="true" />
          </button>
        ))}
        <button type="button" className="workbench-sidebar__shape-card is-add">＋</button>
      </div>
    </>
  )
}

export default LibrarySection
