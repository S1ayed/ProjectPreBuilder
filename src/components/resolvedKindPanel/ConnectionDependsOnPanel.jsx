import { useEffect, useMemo, useState } from 'react'

const getShapeLabel = (shape) => {
  if (!shape) {
    return ''
  }

  const payload = shape.payload || {}
  const fileName = typeof payload.FileName === 'string' ? payload.FileName.trim() : ''
  const directoryName = typeof payload.DirectoryName === 'string' ? payload.DirectoryName.trim() : ''
  const projectName = typeof payload.ProjectName === 'string' ? payload.ProjectName.trim() : ''
  const configName = typeof payload.ConfigName === 'string' ? payload.ConfigName.trim() : ''

  return fileName || directoryName || projectName || configName || shape.id
}

function ConnectionDependsOnPanel({ connection, shapes, onClose, onSave }) {
  const [dependencyType, setDependencyType] = useState(connection?.dependencyType || 'depends_on')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const shapeById = useMemo(() => new Map((shapes || []).map((shape) => [shape.id, shape])), [shapes])
  const fromShape = shapeById.get(connection?.fromShapeId)
  const toShape = shapeById.get(connection?.toShapeId)

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextType = dependencyType.trim()
    if (!nextType) {
      setFormError('type 不能为空。')
      return
    }

    onSave({
      id: connection.id,
      dependencyType: nextType,
    })
  }

  return (
    <div className="node-property-panel__overlay" role="dialog" aria-modal="true" aria-label="依赖连接属性编辑面板">
      <section className="node-property-panel">
        <header className="node-property-panel__header">
          <div>
            <h3 className="node-property-panel__title">依赖连接属性</h3>
            <p className="node-property-panel__meta">DependencyConnecting · {connection.id}</p>
          </div>
          <button type="button" className="node-property-panel__close" onClick={onClose} aria-label="关闭面板">x</button>
        </header>

        <form className="node-property-panel__form" onSubmit={handleSubmit}>
          <label className="node-property-panel__label" htmlFor="connection-id">
            id
            <input
              id="connection-id"
              className="node-property-panel__input"
              value={connection.id}
              readOnly
            />
          </label>

          <label className="node-property-panel__label" htmlFor="connection-from">
            from
            <input
              id="connection-from"
              className="node-property-panel__input"
              value={`${connection.fromShapeId} (${getShapeLabel(fromShape)})`}
              readOnly
            />
          </label>

          <label className="node-property-panel__label" htmlFor="connection-to">
            to
            <input
              id="connection-to"
              className="node-property-panel__input"
              value={`${connection.toShapeId} (${getShapeLabel(toShape)})`}
              readOnly
            />
          </label>

          <label className="node-property-panel__label" htmlFor="connection-type">
            type
            <input
              id="connection-type"
              className="node-property-panel__input"
              value={dependencyType}
              onChange={(event) => setDependencyType(event.target.value)}
            />
          </label>

          {formError && <p className="node-property-panel__error">{formError}</p>}

          <footer className="node-property-panel__actions">
            <button type="button" className="node-property-panel__btn" onClick={onClose}>取消</button>
            <button type="submit" className="node-property-panel__btn node-property-panel__btn--primary">保存</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default ConnectionDependsOnPanel
