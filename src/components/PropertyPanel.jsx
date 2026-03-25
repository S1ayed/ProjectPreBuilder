import { useEffect, useMemo, useState } from 'react'
import {
  NODE_KIND_OPTIONS,
  getKindByShapeType,
  normalizeNodePayload,
} from '../constants/nodeKinds'
import {
  buildNodePropertyDraft,
} from '../constants/nodePropertyTransforms'
import {
  buildNodeSubmitPayload,
  NodePropertySubmitterError,
} from '../constants/nodePropertySubmitters'
import { useConstraintEntries } from '../hooks/useConstraintEntries'
import { resolvedKindPanelRegistry } from './resolvedKindPanel'

function PropertyPanel({ node, onClose, onSave }) {
  const [draft, setDraft] = useState(() => buildNodePropertyDraft(node))
  const [formError, setFormError] = useState('')
  const resolvedKind = getKindByShapeType(node?.type)
  const {
    updateConstraintEntry,
    appendConstraintEntry,
  } = useConstraintEntries(setDraft)

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

  const headerTitle = useMemo(() => {
    const selectedKind = NODE_KIND_OPTIONS.find((item) => item.value === resolvedKind)
    return selectedKind ? selectedKind.label : resolvedKind
  }, [resolvedKind])
  const ResolvedKindPanel = resolvedKindPanelRegistry[resolvedKind]

  const handleSubmit = (event) => {
    event.preventDefault()

    let payload

    try {
      payload = buildNodeSubmitPayload({
        kind: resolvedKind,
        draft,
      })
    } catch (error) {
      if (error instanceof NodePropertySubmitterError) {
        setFormError(error.message)
        return
      }

      setFormError('保存失败，请检查输入内容。')
      return
    }

    onSave({
      id: node.id,
      kind: resolvedKind,
      payload: normalizeNodePayload(resolvedKind, payload),
    })
  }

  return (
    <div className="node-property-panel__overlay" role="dialog" aria-modal="true" aria-label="节点属性编辑面板">
      <section className="node-property-panel">
        <header className="node-property-panel__header">
          <div>
            <h3 className="node-property-panel__title">节点属性</h3>
            <p className="node-property-panel__meta">{headerTitle} · {node.id}</p>
          </div>
          <button type="button" className="node-property-panel__close" onClick={onClose} aria-label="关闭面板">×</button>
        </header>

        <form className="node-property-panel__form" onSubmit={handleSubmit}>
          <label className="node-property-panel__label" htmlFor="node-kind-readonly">
            节点类型
            <input
              id="node-kind-readonly"
              className="node-property-panel__input"
              value={headerTitle}
              readOnly
            />
          </label>

          {ResolvedKindPanel && (
            <ResolvedKindPanel
              draft={draft}
              setDraft={setDraft}
              updateConstraintEntry={updateConstraintEntry}
              appendConstraintEntry={appendConstraintEntry}
            />
          )}

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

export default PropertyPanel