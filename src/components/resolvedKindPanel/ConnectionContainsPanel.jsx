import { useEffect } from 'react'

function ConnectionContainsPanel({ connection, onClose }) {
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

  return (
    <div className="node-property-panel__overlay" role="dialog" aria-modal="true" aria-label="连接属性编辑面板">
      <section className="node-property-panel">
        <header className="node-property-panel__header">
          <div>
            <h3 className="node-property-panel__title">连接属性</h3>
            <p className="node-property-panel__meta">contains · {connection.id}</p>
          </div>
          <button type="button" className="node-property-panel__close" onClick={onClose} aria-label="关闭面板">x</button>
        </header>

        <div className="node-property-panel__form">
          <p className="node-property-panel__meta">暂未实现，预留注册位以便后续扩展。</p>
          <footer className="node-property-panel__actions">
            <button type="button" className="node-property-panel__btn node-property-panel__btn--primary" onClick={onClose}>关闭</button>
          </footer>
        </div>
      </section>
    </div>
  )
}

export default ConnectionContainsPanel
